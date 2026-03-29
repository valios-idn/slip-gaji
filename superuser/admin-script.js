// ================= VARIABEL GLOBAL =================
const ADMIN_HASH = "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9";
const SESSION_DURATION = 60*60*1000;

let sessionTimeout;
let jsonData = {};
let files = [];
let GLOBAL_GITHUB_TOKEN = "hub_pat_11CAL3MIA0GiKpa7mrdH13_QjxgBpaQsd80czUGfw0frJJU1rWt9KkWXClMgWIbf3B75OZACNDIfYo01LO";

// DOM
let loginPage, app, dashboardPage, jsonPage, uploadPage;
let adminPass, excelFile, jsonFileList, jsonOutput;
let pdfFiles, fileList, tokenDashboard, dashTahun, dashBulan, tahun, bulan, filesList;

// ================= HASH =================
async function hash(text) {
    const enc = new TextEncoder();
    const data = enc.encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2,"0")).join("");
}

// ================= SESSION =================
async function login() {
    if (!adminPass) { alert("Input password tidak ditemukan!"); return; }
    if (await hash(adminPass.value) === ADMIN_HASH) {
        localStorage.setItem("adminSession", JSON.stringify({loggedIn:true, expiresAt: Date.now()+SESSION_DURATION}));
        loginPage.classList.add("hidden"); app.classList.remove("hidden"); adminPass.value="";
        startIdleTimer();
    } else alert("❌ Password salah!");
}

function logout() {
    localStorage.removeItem("adminSession");
    clearTimeout(sessionTimeout);
    app.classList.add("hidden"); loginPage.classList.remove("hidden");
}

// ================= IDLE TIMER =================
function startIdleTimer() { clearTimeout(sessionTimeout); sessionTimeout=setTimeout(logout, SESSION_DURATION); }

// ================= NAVIGATION =================
function showPage(p) {
    dashboardPage.classList.add("hidden"); jsonPage.classList.add("hidden"); uploadPage.classList.add("hidden");
    if (p==="dashboard") dashboardPage.classList.remove("hidden");
    if (p==="json") jsonPage.classList.remove("hidden");
    if (p==="upload") uploadPage.classList.remove("hidden");
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

    tokenDashboard = document.getElementById("tokenDashboard");
    dashTahun = document.getElementById("dashTahun");
    dashBulan = document.getElementById("dashBulan");

    tahun = document.getElementById("tahun");
    bulan = document.getElementById("bulan");

    filesList = document.getElementById("filesList");

    // tampilkan token otomatis & update GLOBAL
    tokenDashboard.value = GLOBAL_GITHUB_TOKEN;
    tokenDashboard.addEventListener("input", e => GLOBAL_GITHUB_TOKEN=e.target.value);
}

// ================= EVENT LISTENER =================
function setupEventListeners() {
    document.getElementById("btnLogin")?.addEventListener("click", login);
    document.getElementById("btnLogout")?.addEventListener("click", logout);

    document.getElementById("excelDrop")?.addEventListener("click", ()=>excelFile.click());
    excelFile?.addEventListener("change", ()=>{ if(excelFile.files[0]) jsonFileList.innerHTML=excelFile.files[0].name; });

    document.getElementById("pdfDrop")?.addEventListener("click", ()=>pdfFiles.click());
    pdfFiles?.addEventListener("change", e => { files=Array.from(e.target.files); renderFiles(); });

    document.getElementById("btnGenerateJSON")?.addEventListener("click", generateJSON);
    document.getElementById("btnUploadJSON")?.addEventListener("click", uploadJSON);
    document.getElementById("btnUploadAll")?.addEventListener("click", uploadAll);
    document.getElementById("btnShowFiles")?.addEventListener("click", loadFilesByMonth);
}

// ================= DUMMY FUNCTIONS =================
function renderFiles() {
    if (!files.length) { fileList.innerHTML="Tidak ada file terpilih"; return; }
    fileList.innerHTML = files.map(f=>`<div>${f.name}</div>`).join("");
}

function generateJSON() {
    if(!excelFile.files[0]) { alert("Pilih file Excel dulu!"); return; }
    jsonOutput.value = JSON.stringify({file: excelFile.files[0].name});
}

function uploadJSON() {
    if(!jsonOutput.value) { alert("Generate JSON dulu!"); return; }
    alert(`JSON berhasil diupload dengan token ${GLOBAL_GITHUB_TOKEN} (simulasi)`);
}

function uploadAll() {
    if(!files.length) { alert("Pilih file PDF dulu!"); return; }
    alert(`${files.length} file diupload dengan token ${GLOBAL_GITHUB_TOKEN} (simulasi)`);
}

function loadFilesByMonth() {
    const t=dashTahun.value, b=dashBulan.value;
    filesList.innerHTML=`Daftar file PDF bulan ${b} tahun ${t} (token: ${GLOBAL_GITHUB_TOKEN})`;
}

// ================= START =================
window.addEventListener("load", ()=>{
    initElements();
    setupEventListeners();

    // check session
    const s = localStorage.getItem("adminSession");
    if(s && Date.now()<JSON.parse(s).expiresAt) { loginPage.classList.add("hidden"); app.classList.remove("hidden"); startIdleTimer(); }
});

// expose fungsi ke global (opsional)
window.showPage=showPage;
window.generateJSON=generateJSON;
window.uploadJSON=uploadJSON;
window.uploadAll=uploadAll;
window.loadFilesByMonth=loadFilesByMonth;
