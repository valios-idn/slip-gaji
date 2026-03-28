// ================= KONSTANTA & VARIABEL GLOBAL =================
const ADMIN_HASH = "eb8dd3569264665279b7715826fcf2a291b074137704e18d06574f321fd91a58";

let sessionTimeout;
const SESSION_DURATION = 60 * 60 * 1000; // 60 menit

let currentPage = "dashboard";
let jsonData = {};
let files = [];

// Token Global (sama untuk semua halaman)
let GLOBAL_GITHUB_TOKEN = "_pat_11CAL3MIA03YlOdbk6DTFt_K7vkaYfLDFxgt5w5chcvjunGjaWA79oRknfplcB62Df4IBWLSBJw41Bw1j1"; // Token default

// Elemen DOM
let loginPage, app, dashboardPage, jsonPage, uploadPage;
let adminPass, excelFile, jsonFileList, jsonOutput;
let pdfFiles, fileList, statusEl, tahun, bulan;
let tokenDashboard, dashTahun, dashBulan;

// ================= HASH FUNCTION =================
async function hash(t) {
    const e = new TextEncoder().encode(t);
    const b = await crypto.subtle.digest("SHA-256", e);
    return Array.from(new Uint8Array(b))
        .map(x => x.toString(16).padStart(2, '0'))
        .join('');
}

async function hashPass(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

// ================= SESSION MANAGEMENT =================
function checkSession() {
    const session = localStorage.getItem("adminSession");
    if (!session) return;

    try {
        const { expiresAt } = JSON.parse(session);
        if (Date.now() < expiresAt) {
            loginPage.classList.add("hidden");
            app.classList.remove("hidden");
            startIdleTimer();
        } else {
            logout(true);
        }
    } catch (e) {
        localStorage.removeItem("adminSession");
    }
}

async function login() {
    if (await hash(adminPass.value) === ADMIN_HASH) {
        const sessionData = { loggedIn: true, expiresAt: Date.now() + SESSION_DURATION };
        localStorage.setItem("adminSession", JSON.stringify(sessionData));

        loginPage.classList.add("hidden");
        app.classList.remove("hidden");
        adminPass.value = "";
        startIdleTimer();
    } else {
        alert("❌ Password salah!");
    }
}

function logout(isIdle = false) {
    localStorage.removeItem("adminSession");
    if (sessionTimeout) clearTimeout(sessionTimeout);
    
    app.classList.add("hidden");
    loginPage.classList.remove("hidden");
    
    if (isIdle) alert("⏰ Session telah berakhir karena tidak ada aktivitas selama 1 jam.");
    else alert("✅ Anda telah keluar.");
    
    adminPass.value = "";
}

// ================= IDLE TIMER =================
function startIdleTimer() {
    if (sessionTimeout) clearTimeout(sessionTimeout);
    sessionTimeout = setTimeout(() => logout(true), SESSION_DURATION);
}

function resetIdleTimer() {
    if (sessionTimeout) startIdleTimer();
}

// ================= NAVIGATION =================
function showPage(p) {
    if (currentPage === "json") resetJSON();
    if (currentPage === "upload") resetUpload();

    dashboardPage.classList.add("hidden");
    jsonPage.classList.add("hidden");
    uploadPage.classList.add("hidden");

    if (p === "dashboard") dashboardPage.classList.remove("hidden");
    if (p === "json") jsonPage.classList.remove("hidden");
    if (p === "upload") uploadPage.classList.remove("hidden");

    currentPage = p;
}

// ================= RESET =================
function resetJSON() {
    if (excelFile) excelFile.value = "";
    if (jsonOutput) jsonOutput.value = "";
    if (jsonFileList) jsonFileList.innerHTML = "";
    jsonData = {};
}

function resetUpload() {
    if (pdfFiles) pdfFiles.value = "";
    if (fileList) fileList.innerHTML = "";
    files = [];
    if (statusEl) statusEl.innerText = "";
}

// ================= DASHBOARD - DAFTAR FILE PER BULAN =================
let currentFiles = [];

async function loadFilesByMonth() {
    const container = document.getElementById("filesList");
    const searchContainer = document.getElementById("searchContainer");
    const tahun = document.getElementById("dashTahun").value;
    const bulan = document.getElementById("dashBulan").value;
    let token = document.getElementById("tokenDashboard").value.trim();

    if (token) GLOBAL_GITHUB_TOKEN = token;
    token = GLOBAL_GITHUB_TOKEN;

    if (!tahun || !bulan) {
        container.innerHTML = `<p style="color:red; text-align:center; padding:40px;">⚠️ Pilih tahun dan bulan terlebih dahulu.</p>`;
        return;
    }

    if (!token) {
        container.innerHTML = `<p style="color:red; text-align:center; padding:40px;">⚠️ Token GitHub belum diisi.</p>`;
        return;
    }

    container.innerHTML = `<p style="color:#0066cc; text-align:center; padding:50px;">⏳ Memuat daftar file dari GitHub...</p>`;

    const folderPath = `files/${tahun}/${bulan}`;

    try {
        const url = `https://api.github.com/repos/valios-idn/slip-gaji/contents/${folderPath}`;

        const res = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json",
                "User-Agent": "Admin-Dashboard"   // GitHub kadang butuh ini
            }
        });

        const responseText = await res.text();  // ambil dulu teks untuk debug

        if (res.status === 404) {
            // Bisa karena folder kosong / tidak ada, atau token tidak punya akses
            try {
                const errorData = JSON.parse(responseText);
                if (errorData.message && errorData.message.includes("Bad credentials")) {
                    container.innerHTML = `<p style="color:red; text-align:center; padding:40px;">
                        ❌ Token tidak valid atau expired.<br>
                        <small>Periksa apakah token masih aktif dan memiliki izin "Contents: Read".</small>
                    </p>`;
                } else {
                    container.innerHTML = `<p style="color:#888; text-align:center; padding:50px;">
                        ❌ Tidak ada slip gaji untuk bulan ${getMonthName(bulan)} ${tahun}<br>
                        <small>Folder belum ada atau belum ada file yang diupload.</small>
                    </p>`;
                }
            } catch (e) {
                container.innerHTML = `<p style="color:#888; text-align:center; padding:50px;">
                    ❌ Tidak ada file untuk bulan ${getMonthName(bulan)} ${tahun}
                </p>`;
            }
            searchContainer.style.display = "none";
            return;
        }

        if (!res.ok) {
            let msg = "Gagal mengambil data";
            try {
                const err = JSON.parse(responseText);
                msg = err.message || msg;
            } catch (_) {}
            
            container.innerHTML = `<p style="color:red; text-align:center; padding:40px;">
                ❌ Error: ${msg}<br>
                <small>Status: ${res.status} - Periksa token dan izin repository.</small>
            </p>`;
            searchContainer.style.display = "none";
            return;
        }

        const filesData = JSON.parse(responseText);

        currentFiles = filesData.filter(file => 
            file.type === "file" && file.name.toUpperCase().endsWith(".PDF")
        );

        if (currentFiles.length === 0) {
            container.innerHTML = `<p style="color:#888; text-align:center; padding:40px;">
                Tidak ada file PDF di folder ${folderPath}
            </p>`;
            searchContainer.style.display = "none";
            return;
        }

        searchContainer.style.display = "block";
        renderFileList(currentFiles);

    } catch (err) {
        console.error("Error loadFilesByMonth:", err);
        container.innerHTML = `<p style="color:red; text-align:center; padding:40px;">
            ❌ Terjadi kesalahan koneksi ke GitHub.<br>
            Pastikan token valid dan internet stabil.
        </p>`;
        searchContainer.style.display = "none";
    }
}

// ================= JSON GENERATOR =================
async function generateJSON() {
    const file = excelFile.files[0];
    if (!file) { alert("⚠️ Pilih file Excel terlebih dahulu!"); return; }

    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array", cellDates: true });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

            let result = {};
            for (let row of rows) {
                const normalized = {};
                for (let key in row) {
                    normalized[key.toLowerCase().replace(/\s/g, '')] = row[key];
                }
                const email = (normalized.email || "").toLowerCase().trim();
                const nama = (normalized.namafile || "").toUpperCase().trim();
                const pass = (normalized.password || "").toString().trim();

                if (!email || !nama || !pass) continue;

                result[email] = {
                    namaFile: nama,
                    password: await hashPass(pass)
                };
            }

            jsonData = result;
            jsonOutput.value = JSON.stringify(result, null, 2);
            alert(`✅ JSON berhasil dibuat! (${Object.keys(result).length} data)`);
        } catch (err) {
            alert("❌ Gagal membaca file Excel.");
        }
    };
    reader.readAsArrayBuffer(file);
}

async function uploadJSON() {
    if (Object.keys(jsonData).length === 0) {
        alert("⚠️ Generate JSON dulu sebelum upload!");
        return;
    }

    const token = GLOBAL_GITHUB_TOKEN;
    if (!token) {
        alert("⚠️ Token GitHub belum diisi di Dashboard!");
        return;
    }

    // ... (kode upload JSON seperti sebelumnya)
    const repo = "valios-idn/slip-gaji";
    const path = "dataPegawai.json";
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(jsonData, null, 2))));

    const url = `https://api.github.com/repos/${repo}/contents/${path}`;

    let sha = null;
    try {
        const get = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (get.ok) sha = (await get.json()).sha;
    } catch (e) {}

    const res = await fetch(url, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: "Update dataPegawai", content, sha })
    });

    if (res.ok) showToast("✅ JSON berhasil diupload!");
    else alert("❌ Upload JSON gagal.");
}

// ================= UPLOAD PDF =================
function renderFiles() {
    fileList.innerHTML = "";
    files.forEach((f, i) => {
        fileList.innerHTML += `
            <div class="file-item">
                <div class="file-top">${f.name}<span class="remove" onclick="removeFile(${i})">✖</span></div>
                <div class="progress"><div class="bar" id="bar${i}"></div></div>
            </div>`;
    });
}

function removeFile(i) {
    files.splice(i, 1);
    renderFiles();
}

async function toBase64(file) {
    return new Promise(r => {
        const fr = new FileReader();
        fr.onload = () => r(fr.result.split(',')[1]);
        fr.readAsDataURL(file);
    });
}

async function uploadSingle(file, i, token) {
    const bar = document.getElementById("bar" + i);
    const base64 = await toBase64(file);
    const fileNameUpper = file.name.toUpperCase();
    const path = `files/${tahun.value}/${bulan.value}/${fileNameUpper}`;

    bar.style.width = "30%";

    const res = await fetch(`https://api.github.com/repos/valios-idn/slip-gaji/contents/${path}`, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: "Upload slip gaji",
            content: base64
        })
    });

    bar.style.width = "100%";
    if (!res.ok) throw new Error("Upload gagal");
}

async function uploadAll() {
    if (files.length === 0) { alert("⚠️ Tidak ada file!"); return; }

    const token = GLOBAL_GITHUB_TOKEN;
    if (!token) { alert("⚠️ Token GitHub belum diisi di Dashboard!"); return; }

    statusEl.innerText = "⏳ Sedang mengupload...";
    let success = 0;

    for (let i = 0; i < files.length; i++) {
        try {
            await uploadSingle(files[i], i, token);
            success++;
        } catch (e) { console.error(e); }
    }

    statusEl.innerText = success === files.length ? "🎉 Semua file berhasil diupload!" : `⚠️ ${success}/${files.length} berhasil`;
}

// ================= TOAST =================
function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => toast.classList.remove("show"), 3000);
}

// ================= INIT =================
function initElements() {
    loginPage = document.getElementById("loginPage");
    app = document.getElementById("app");
    dashboardPage = document.getElementById("dashboardPage");
    jsonPage = document.getElementById("jsonPage");
    uploadPage = document.getElementById("uploadPage");

    adminPass = document.getElementById("adminPass");
    excelFile = document.getElementById("excelFile");
    jsonFileList = document.getElementById("jsonFileList");
    jsonOutput = document.getElementById("jsonOutput");

    pdfFiles = document.getElementById("pdfFiles");
    fileList = document.getElementById("fileList");
    statusEl = document.getElementById("status");
    tahun = document.getElementById("tahun");
    bulan = document.getElementById("bulan");

    tokenDashboard = document.getElementById("tokenDashboard");
    dashTahun = document.getElementById("dashTahun");
    dashBulan = document.getElementById("dashBulan");
}

function setupEventListeners() {
    // Excel Drop
    document.getElementById("excelDrop").onclick = () => excelFile.click();
    excelFile.onchange = () => {
        const f = excelFile.files[0];
        if (f) jsonFileList.innerHTML = `<div class="file-item">${f.name}</div>`;
    };

    // PDF Drop
    document.getElementById("pdfDrop").onclick = () => pdfFiles.click();
    pdfFiles.onchange = e => {
        files = Array.from(e.target.files);
        renderFiles();
    };

    document.getElementById("btnLogout").addEventListener("click", logout);

    document.addEventListener("mousemove", resetIdleTimer);
    document.addEventListener("keydown", resetIdleTimer);
    document.addEventListener("click", resetIdleTimer);
}

// ================= GLOBAL FUNCTIONS =================
window.login = login;
window.logout = logout;
window.showPage = showPage;
window.generateJSON = generateJSON;
window.uploadJSON = uploadJSON;
window.uploadAll = uploadAll;
window.removeFile = removeFile;
window.loadFilesByMonth = loadFilesByMonth;
window.searchFiles = searchFiles;

// ================= START =================
window.addEventListener("load", () => {
    initElements();
    setupEventListeners();

    // Set default token ke input dashboard
    if (tokenDashboard) tokenDashboard.value = GLOBAL_GITHUB_TOKEN;

    checkSession();
});
