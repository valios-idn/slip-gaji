import { login, checkSession, resetIdleTimer, logout, hashPass } from './login.js';

let files = [];
let jsonData = {};

const el = id => document.getElementById(id);

// ======================
// INIT (AMAN)
// ======================
window.addEventListener("DOMContentLoaded", () => {
    checkSession();

    // LOGIN
    el("loginBtn").onclick = login;

    // LOGOUT
    el("menuLogout").onclick = () => {
        resetApp();
        logout();
    };

    // NAVIGATION
    el("menuDashboard").onclick = ()=>showPage("dashboard");
    el("menuJSON").onclick = ()=>showPage("json");
    el("menuUpload").onclick = ()=>showPage("upload");

    // MENU ACTIVE
    const menus = document.querySelectorAll('.menu');
    menus.forEach(menu => {
        menu.addEventListener('click', () => {
            menus.forEach(m => m.classList.remove('active'));
            menu.classList.add('active');
        });
    });

    // EXCEL
    el("excelDrop").onclick = ()=>el("excelFile").click();
    el("excelFile").onchange = showExcel;

    // PDF
    el("pdfDrop").onclick = ()=>el("pdfFiles").click();
    el("pdfFiles").onchange = e=>{
        files = Array.from(e.target.files);
        renderFiles();
    };

    // BUTTONS
    el("generateJSONBtn").onclick = generateJSON;
    el("uploadJSONBtn").onclick = uploadJSON;
    el("uploadPDFBtn").onclick = uploadPDF;
});

// ======================
// GLOBAL EVENT
// ======================
document.addEventListener("click", resetIdleTimer);
document.addEventListener("keydown", resetIdleTimer);

// ======================
// NAVIGATION
// ======================
const pages = ["dashboard","json","upload"];

function showPage(page){
    pages.forEach(p => el(p+"Page").classList.add("hidden"));
    el(page+"Page").classList.remove("hidden");

    if(page !== "json"){
        el("jsonOutput").value = "";
        el("jsonFileList").innerHTML = "";
    }
}

// ======================
// EXCEL
// ======================
function showExcel(){
    const f = el("excelFile").files[0];
    if(!f) return;

    el("jsonFileList").innerHTML = `
        <div class="file-item">
            ${f.name}
            <span onclick="removeExcel()">✖</span>
        </div>
    `;
}

window.removeExcel = ()=>{
    el("excelFile").value = "";
    el("jsonFileList").innerHTML = "";
    el("jsonOutput").value = "";
    jsonData = {};
};

// ======================
// GENERATE JSON
// ======================
async function generateJSON(){
    const file = el("excelFile").files[0];
    if(!file) return alert("Pilih file!");

    const reader = new FileReader();

    reader.onload = async e=>{
        const wb = XLSX.read(new Uint8Array(e.target.result), {type:"array"});
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet,{defval:""});

        const result = {};

        for(let row of rows){
            const normalized = {};
            for(let key in row){
                normalized[key.toLowerCase().replace(/\s/g,"")] = row[key];
            }

            const email = (normalized.email||"").toLowerCase().trim();
            const nama = (normalized.namafile||"").toUpperCase().trim();
            const pass = (normalized.password||"").toString().trim();

            if(!email || !nama || !pass) continue;

            result[email] = {
                namaFile: nama,
                password: await hashPass(pass)
            };
        }

        jsonData = result;
        el("jsonOutput").value = JSON.stringify(result,null,2);
    };

    reader.readAsArrayBuffer(file);
}

// ======================
// UPLOAD JSON
// ======================
async function uploadJSON(){
    const token = el("tokenJson").value.trim();
    if (!token) return alert("Token kosong!");

    const statusBox = el("uploadStatus");
    const statusText = el("statusText");
    const spinner = el("spinner");

    statusBox.style.display = "flex";
    statusText.innerText = "Uploading...";

    const url = `https://api.github.com/repos/valios-idn/slip-gaji/contents/dataPegawai.json`;
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(jsonData, null, 2))));

    let sha = null;

    try {
        const get = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (get.ok) {
            const data = await get.json();
            sha = data.sha;
        }
    } catch (e) {}

    const uploadWithRetry = async (retry = 3) => {
        try {
            const res = await fetch(url, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: "update dataPegawai",
                    content,
                    sha
                })
            });

            const result = await res.json();
            if (!res.ok) throw result;

            spinner.style.display = "none";
            statusText.innerText = "✅ Selesai upload";

        } catch (err) {
            if (retry > 0) {
                statusText.innerText = `Retrying... (${retry})`;
                await new Promise(r => setTimeout(r, 2000));
                return uploadWithRetry(retry - 1);
            } else {
                spinner.style.display = "none";
                statusText.innerText = "❌ Gagal upload";
            }
        }
    };

    await uploadWithRetry();
}

// ======================
// PDF VIEW
// ======================
function renderFiles(){
    const container = el("fileList");
    container.innerHTML = "";

    files.forEach((f,i)=>{
        container.innerHTML += `
        <div class="file-card">
            <div style="display:flex; justify-content:space-between;">
                <div>${f.name}</div>
                <div>
                    <span class="retry-btn hidden" id="retry${i}" onclick="retryUpload(${i})">🔄</span>
                    <span onclick="removeFile(${i})">✖</span>
                </div>
            </div>
            <div class="progress"><div id="bar${i}" class="bar"></div></div>
            <div id="status${i}">Menunggu...</div>
        </div>`;
    });
}

window.removeFile = (i)=>{
    files.splice(i,1);
    renderFiles();
};

// ======================
// UPLOAD PDF
// ======================
async function uploadPDF(){
    const token = el("tokenUpload").value.trim();
    if(!token) return alert("Token kosong!");

    const tahun = el("tahun").value;
    const bulan = el("bulan").value;

    for(let i=0;i<files.length;i++){
        await uploadSingle(files[i], i, token, tahun, bulan);
    }
}

async function uploadSingle(file,i,token,tahun,bulan){
    const bar = el("bar"+i);
    const status = el("status"+i);
    const retryBtn = el("retry"+i);

    try{
        retryBtn.classList.add("hidden");

        status.innerText = "Uploading...";
        bar.style.width = "50%";

        const path = `files/${tahun}/${bulan}/${file.name.toUpperCase()}`;
        const url = `https://api.github.com/repos/valios-idn/slip-gaji/contents/${path}`;

        const base64 = await toBase64(file);

        const res = await fetch(url,{
            method:"PUT",
            headers:{
                Authorization:`Bearer ${token}`,
                "Content-Type":"application/json"
            },
            body: JSON.stringify({
                message:"upload slip",
                content:base64
            })
        });

        if(!res.ok) throw new Error();

        bar.style.width = "100%";
        status.innerText = "✅ Selesai";

    }catch{
        status.innerText = "❌ Gagal";
        retryBtn.classList.remove("hidden");
    }
}

window.retryUpload = (i)=>{
    const token = el("tokenUpload").value.trim();
    uploadSingle(files[i], i, token, el("tahun").value, el("bulan").value);
};

// ======================
// BASE64
// ======================
function toBase64(file){
    return new Promise(r=>{
        const fr = new FileReader();
        fr.onload = ()=>r(fr.result.split(',')[1]);
        fr.readAsDataURL(file);
    });
}

// ======================
// RESET (FIX UTAMA)
// ======================
function resetApp(){
    jsonData = {};
    files = [];

    el("jsonOutput").value = "";
    el("jsonFileList").innerHTML = "";
    el("excelFile").value = "";

    el("fileList").innerHTML = "";
}

// ======================
// DASHBOARD FINAL (TOKEN INPUT)
// ======================

async function fetchGitHub(path, token){
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
    
    const res = await fetch(url,{
        headers: token ? {
            Authorization: "Bearer " + token
        } : {}
    });

    return res.json();
}

// LOAD TAHUN (tanpa token)
async function loadTahun(){
    const tahunSelect = el("dashTahun");
    tahunSelect.innerHTML = `<option value="">Pilih Tahun</option>`;

    const years = await fetchGitHub(GITHUB_BASE);

    years
        .filter(y => y.type === "dir")
        .sort((a,b)=>a.name.localeCompare(b.name))
        .forEach(y=>{
            tahunSelect.innerHTML += `<option value="${y.name}">${y.name}</option>`;
        });
}

// LOAD BULAN
async function loadBulan(tahun){
    const bulanSelect = el("dashBulan");
    bulanSelect.innerHTML = `<option value="">Pilih Bulan</option>`;

    if(!tahun) return;

    const months = await fetchGitHub(`${GITHUB_BASE}/${tahun}`);

    months
        .filter(m => m.type === "dir")
        .sort((a,b)=>a.name.localeCompare(b.name))
        .forEach(m=>{
            bulanSelect.innerHTML += `<option value="${m.name}">${m.name}</option>`;
        });
}

// LOAD FILE (pakai token manual)
async function loadFilesWithToken(){
    const tahun = el("dashTahun").value;
    const bulan = el("dashBulan").value;
    const token = el("dashToken").value.trim();

    const container = el("dashboardList");

    if(!tahun || !bulan){
        return alert("Pilih tahun & bulan!");
    }

    if(!token){
        return alert("Token wajib diisi!");
    }

    container.innerHTML = "Loading...";

    try{
        const files = await fetchGitHub(`${GITHUB_BASE}/${tahun}/${bulan}`, token);

        const pdfFiles = files
            .filter(f => f.name.toLowerCase().endsWith(".pdf"))
            .sort((a,b)=>a.name.localeCompare(b.name));

        if(pdfFiles.length === 0){
            container.innerHTML = `<div class="empty">Tidak ada file</div>`;
            return;
        }

        container.innerHTML = pdfFiles.map(f=>`
            <a href="${f.download_url}" target="_blank" class="file">
                📄 ${f.name}
            </a>
        `).join("");

    }catch{
        container.innerHTML = "❌ Gagal load file";
    }
}
