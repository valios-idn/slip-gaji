// ================= KONSTANTA & VARIABEL GLOBAL =================
const ADMIN_HASH = "eb8dd3569264665279b7715826fcf2a291b074137704e18d06574f321fd91a58";

let sessionTimeout;
const SESSION_DURATION = 60 * 60 * 1000; // 60 menit

let currentPage = "dashboard";
let jsonData = {};
let files = [];

// Elemen DOM (akan diinisialisasi setelah load)
let loginPage, app, dashboardPage, jsonPage, uploadPage;
let adminPass, excelFile, jsonFileList, jsonOutput, tokenJson;
let pdfFiles, fileList, tokenUpload, status, tahun, bulan;

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
            logout(true); // expired
        }
    } catch (e) {
        console.error("Session error:", e);
        localStorage.removeItem("adminSession");
    }
}

async function login() {
    if (await hash(adminPass.value) === ADMIN_HASH) {
        const sessionData = {
            loggedIn: true,
            expiresAt: Date.now() + SESSION_DURATION
        };
        
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
    
    if (isIdle) {
        alert("⏰ Session telah berakhir karena tidak ada aktivitas selama 1 jam.");
    } else {
        alert("✅ Anda telah keluar.");
    }
    
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

// ================= RESET FUNCTIONS =================
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
    if (status) status.innerText = "";
}

// ================= JSON GENERATOR =================
async function generateJSON() {
    const file = excelFile.files[0];
    if (!file) {
        alert("⚠️ Pilih file Excel terlebih dahulu!");
        return;
    }

    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array", cellDates: true, cellText: false });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });

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

            if (Object.keys(result).length === 0) {
                alert("❌ Tidak ada data valid yang terbaca!");
                return;
            }

            jsonData = result;
            jsonOutput.value = JSON.stringify(result, null, 2);
            alert(`✅ JSON berhasil dibuat! (${Object.keys(result).length} data)`);
        } catch (err) {
            console.error(err);
            alert("❌ Gagal membaca file Excel. Pastikan formatnya benar.");
        }
    };
    reader.readAsArrayBuffer(file);
}

// ================= UPLOAD JSON =================
async function uploadJSON() {
    if (Object.keys(jsonData).length === 0) {
        alert("⚠️ Generate JSON dulu sebelum upload!");
        return;
    }

    const token = tokenJson.value.trim();
    if (!token) {
        alert("⚠️ Masukkan Token GitHub!");
        return;
    }

    status.innerText = "⏳ Mengupload JSON ke GitHub...";

    const repo = "valios-idn/slip-gaji";
    const path = "dataPegawai.json";
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(jsonData, null, 2))));

    const url = `https://api.github.com/repos/${repo}/contents/${path}`;

    let sha = null;
    try {
        const getRes = await fetch(url, {
            headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" }
        });
        if (getRes.ok) {
            const data = await getRes.json();
            sha = data.sha;
        }
    } catch (e) {}

    const res = await fetch(url, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/vnd.github+json"
        },
        body: JSON.stringify({
            message: "Update dataPegawai otomatis",
            content: content,
            sha: sha
        })
    });

    if (res.ok) {
        showToast("✅ JSON berhasil diupload ke GitHub!");
    } else {
        const err = await res.json().catch(() => ({}));
        alert("❌ Upload gagal: " + (err.message || "Unknown error"));
    }
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
    return new Promise(resolve => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result.split(',')[1]);
        fr.readAsDataURL(file);
    });
}

async function uploadSingle(file, i, token) {
    const bar = document.getElementById(`bar${i}`);
    const base64 = await toBase64(file);
    const fileNameUpper = file.name.toUpperCase();
    const path = `files/${tahun.value}/${bulan.value}/${fileNameUpper}`;
    const url = `https://api.github.com/repos/valios-idn/slip-gaji/contents/${path}`;

    bar.style.width = "30%";

    const res = await fetch(url, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: `Upload slip gaji ${fileNameUpper}`,
            content: base64
        })
    });

    bar.style.width = "100%";

    if (!res.ok) {
        throw new Error(`Gagal upload ${file.name}`);
    }
    return fileNameUpper;
}

async function uploadAll() {
    if (files.length === 0) {
        alert("⚠️ Tidak ada file yang dipilih!");
        return;
    }
    const token = tokenUpload.value.trim();
    if (!token) {
        alert("⚠️ Masukkan Token GitHub!");
        return;
    }

    status.innerText = "⏳ Sedang mengupload file...";
    let success = 0;

    for (let i = 0; i < files.length; i++) {
        try {
            await uploadSingle(files[i], i, token);
            success++;
        } catch (e) {
            console.error(e);
        }
    }

    if (success === files.length) {
        status.innerText = "🎉 Semua file berhasil diupload!";
        showToast("🎉 Upload selesai!");
    } else {
        status.innerText = `⚠️ ${success}/${files.length} file berhasil`;
        showToast("⚠️ Beberapa file gagal diupload", "error");
    }
}

// ================= TOAST =================
function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => toast.classList.remove("show"), 3000);
}

// ================= RECENT SEARCHES (EMAIL) DASHBOARD =================
async function loadRecentSearches() {
    const container = document.getElementById("recentSearchesList");
    if (!container) return;

    container.innerHTML = `<p style="color:#888; text-align:center;">⏳ Memuat daftar email terbaru...</p>`;

    const token = tokenUpload.value.trim() || tokenJson.value.trim();
    if (!token) {
        container.innerHTML = `<p style="color:red;">⚠️ Token GitHub belum diisi.</p>`;
        return;
    }

    try {
        const repo = "valios-idn/slip-gaji";
        const path = "recentSearches.json";
        const url = `https://api.github.com/repos/${repo}/contents/${path}`;

        // Ambil file recentSearches.json
        const res = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json"
            }
        });

        if (!res.ok) {
            if (res.status === 404) {
                container.innerHTML = `<p style="color:#888;">Belum ada data pencarian. Data akan muncul setelah ada user yang mencari slip gaji.</p>`;
            } else {
                throw new Error("Gagal mengambil data");
            }
            return;
        }

        const data = await res.json();
        const content = JSON.parse(atob(data.content));

        // content diasumsikan berupa array: [{email, timestamp}, ...] dengan index 0 = paling baru
        let searches = Array.isArray(content) ? content : [];

        if (searches.length === 0) {
            container.innerHTML = `<p style="color:#888;">Belum ada data pencarian.</p>`;
            return;
        }

        // Ambil maksimal 20 terbaru
        searches = searches.slice(0, 20);

        let html = `<div style="max-height:500px; overflow-y:auto;">`;
        searches.forEach(item => {
            const date = new Date(item.timestamp).toLocaleString('id-ID', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            html += `
                <div style="padding:12px 10px; border-bottom:1px solid #ddd; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong>${item.email}</strong>
                    </div>
                    <div style="text-align:right; font-size:0.9em; color:#666;">
                        ${date}
                    </div>
                </div>`;
        });
        html += `</div>`;

        container.innerHTML = html;

    } catch (err) {
        console.error(err);
        container.innerHTML = `<p style="color:red;">❌ Gagal memuat data. Pastikan token GitHub valid.</p>`;
    }
}

// ================= INIT & EVENT LISTENERS =================
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
    tokenJson = document.getElementById("tokenJson");

    pdfFiles = document.getElementById("pdfFiles");
    fileList = document.getElementById("fileList");
    tokenUpload = document.getElementById("tokenUpload");
    status = document.getElementById("status");
    tahun = document.getElementById("tahun");
    bulan = document.getElementById("bulan");
}

function setupEventListeners() {
    // Drag & Drop Excel
    const excelDrop = document.getElementById("excelDrop");
    excelDrop.onclick = () => excelFile.click();
    excelDrop.ondrop = e => {
        e.preventDefault();
        excelFile.files = e.dataTransfer.files;
        showExcel();
    };
    excelDrop.ondragover = e => e.preventDefault();
    excelFile.onchange = showExcel;

    // Drag & Drop PDF
    const pdfDrop = document.getElementById("pdfDrop");
    pdfDrop.onclick = () => pdfFiles.click();
    pdfFiles.onchange = e => {
        files = Array.from(e.target.files);
        renderFiles();
    };

    // Logout button
    document.getElementById("btnLogout").addEventListener("click", () => logout());

    // Reset idle timer
    document.addEventListener("mousemove", resetIdleTimer);
    document.addEventListener("keydown", resetIdleTimer);
    document.addEventListener("click", resetIdleTimer);
    document.addEventListener("scroll", resetIdleTimer);
}

function showExcel() {
    const f = excelFile.files[0];
    if (!f) return;
    jsonFileList.innerHTML = `<div class="file-item">${f.name} <span class="remove" onclick="excelFile.value='';jsonFileList.innerHTML=''">✖</span></div>`;
}

// ================= MAKE FUNCTIONS GLOBAL =================
window.login = login;
window.logout = logout;
window.showPage = showPage;
window.generateJSON = generateJSON;
window.uploadJSON = uploadJSON;
window.uploadAll = uploadAll;
window.removeFile = removeFile;
window.loadRecentFiles = loadRecentFiles;

// ================= START APP =================
window.addEventListener("load", () => {
    initElements();
    setupEventListeners();
    
    // Set default token
    const defaultToken = "_pat_11CAL3MIA03YlOdbk6DTFt_K7vkaYfLDFxgt5w5chcvjunGjaWA79oRknfplcB62Df4IBWLSBJw41Bw1j1";
    if (tokenJson) tokenJson.value = defaultToken;
    if (tokenUpload) tokenUpload.value = defaultToken;

    checkSession();
});
