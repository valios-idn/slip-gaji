// ================== KONSTANTA & VARIABEL ==================
const ADMIN_HASH = "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9"; // SHA-256 password admin
const SESSION_DURATION = 60*60*1000; // 1 jam
let sessionTimeout;

let currentPage = "dashboard";
let jsonData = {};
let files = [];

// GLOBAL TOKEN GITHUB
let GLOBAL_GITHUB_TOKEN = "hub_pat_11CAL3MIA0OVpJ8v3BwuTr_l3tuWIpFz40fpsIRaI3wH81mgT74rwVPtJGdF696urcBPRRM3YY59GlbnmO";

// ================== ELEMEN DOM ==================
let loginPage, app, dashboardPage, jsonPage, uploadPage;
let adminPass, excelFile, jsonFileList, jsonOutput;
let pdfFiles, fileList, statusEl, tahun, bulan;
let tokenDashboard, dashTahun, dashBulan;

// ================== UTILITY HASH ==================
async function hash(t){
    const e = new TextEncoder().encode(t);
    const b = await crypto.subtle.digest("SHA-256", e);
    return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('');
}

// ================== SESSION MANAGEMENT ==================
function checkSession(){
    const session = localStorage.getItem("adminSession");
    if(!session) return;
    try{
        const {expiresAt} = JSON.parse(session);
        if(Date.now() < expiresAt){
            loginPage?.classList.add("hidden");
            app?.classList.remove("hidden");
            startIdleTimer();
        }else logout(true);
    }catch(e){ localStorage.removeItem("adminSession"); }
}

async function login(){
    if(!adminPass) return alert("⚠️ Input password admin tidak ditemukan!");
    if(await hash(adminPass.value)===ADMIN_HASH){
        const sessionData = { loggedIn:true, expiresAt: Date.now()+SESSION_DURATION };
        localStorage.setItem("adminSession", JSON.stringify(sessionData));
        loginPage?.classList.add("hidden");
        app?.classList.remove("hidden");
        adminPass.value="";
        startIdleTimer();
    }else alert("❌ Password salah!");
}

function logout(isIdle=false){
    localStorage.removeItem("adminSession");
    if(sessionTimeout) clearTimeout(sessionTimeout);
    app?.classList.add("hidden");
    loginPage?.classList.remove("hidden");
    if(adminPass) adminPass.value="";
    if(isIdle) alert("⏰ Session telah berakhir karena tidak ada aktivitas selama 1 jam.");
    else alert("✅ Anda telah keluar.");
}

// ================== IDLE TIMER ==================
function startIdleTimer(){
    if(sessionTimeout) clearTimeout(sessionTimeout);
    sessionTimeout = setTimeout(()=>logout(true), SESSION_DURATION);
}
function resetIdleTimer(){ if(sessionTimeout) startIdleTimer(); }

// ================== NAVIGATION ==================
function showPage(p){
    if(currentPage==="json") resetJSON();
    if(currentPage==="upload") resetUpload();
    dashboardPage?.classList.add("hidden");
    jsonPage?.classList.add("hidden");
    uploadPage?.classList.add("hidden");
    if(p==="dashboard") dashboardPage?.classList.remove("hidden");
    if(p==="json") jsonPage?.classList.remove("hidden");
    if(p==="upload") uploadPage?.classList.remove("hidden");
    currentPage=p;
}

// ================== RESET ==================
function resetJSON(){
    if(excelFile) excelFile.value="";
    if(jsonOutput) jsonOutput.value="";
    if(jsonFileList) jsonFileList.innerHTML="";
    jsonData={};
}

function resetUpload(){
    if(pdfFiles) pdfFiles.value="";
    if(fileList) fileList.innerHTML="";
    files=[];
    if(statusEl) statusEl.innerText="";
}

// ================== INIT ELEMENTS ==================
function initElements(){
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

// ================== EVENT LISTENERS ==================
function setupEventListeners(){
    document.getElementById("btnLogin")?.addEventListener("click", login);
    document.getElementById("btnLogout")?.addEventListener("click", logout);

    document.getElementById("excelDrop")?.addEventListener("click",()=>excelFile.click());
    excelFile?.addEventListener("change", ()=>{
        const f = excelFile.files[0];
        if(f) jsonFileList.innerHTML=`<div class="file-item">${f.name}</div>`;
    });

    document.getElementById("pdfDrop")?.addEventListener("click",()=>pdfFiles.click());
    pdfFiles?.addEventListener("change", e=>{
        files = Array.from(e.target.files);
        renderFiles();
    });

    document.addEventListener("mousemove", resetIdleTimer);
    document.addEventListener("keydown", resetIdleTimer);
    document.addEventListener("click", resetIdleTimer);

    tokenDashboard?.addEventListener("input", e=>{
        GLOBAL_GITHUB_TOKEN = e.target.value;
    });
}

// ================== RENDER PDF FILES ==================
function renderFiles(){
    if(!fileList) return;
    fileList.innerHTML = files.map(f=>`<div>${f.name} <button onclick="removeFile('${f.name}')">❌</button></div>`).join("");
}

function removeFile(name){
    files = files.filter(f=>f.name!==name);
    renderFiles();
}

// ================== JSON GENERATOR ==================
function generateJSON(){
    if(!excelFile.files.length) return alert("Pilih file Excel dulu!");
    const f = excelFile.files[0];
    const reader = new FileReader();
    reader.onload = e=>{
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data,{type:"array"});
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        jsonData = XLSX.utils.sheet_to_json(sheet);
        if(jsonOutput) jsonOutput.value = JSON.stringify(jsonData,null,2);
        alert("✅ JSON berhasil digenerate!");
    };
    reader.readAsArrayBuffer(f);
}

// ================== UPLOAD JSON ==================
async function uploadJSON(){
    if(!jsonData) return alert("Generate JSON dulu!");
    if(!GLOBAL_GITHUB_TOKEN) return alert("Token GitHub belum diisi!");

    const repo = "valios-idn/slip-gaji"; // ganti repo
    const branch = "main";
    const path = `json/slip_${Date.now()}.json`;
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(jsonData,null,2))));

    try{
        const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`,{
            method:"PUT",
            headers:{
                "Authorization":"token "+GLOBAL_GITHUB_TOKEN,
                "Content-Type":"application/json"
            },
            body: JSON.stringify({
                message:`Upload JSON slip ${new Date().toLocaleString()}`,
                content:content,
                branch:branch
            })
        });
        const data = await res.json();
        if(data.content) alert("✅ JSON berhasil diupload!");
        else console.error(data);
    }catch(e){console.error(e); alert("❌ Upload gagal");}
}

// ================== UPLOAD PDF ==================
function fileToBase64(file){
    return new Promise((resolve,reject)=>{
        const reader = new FileReader();
        reader.onload=()=>resolve(btoa(reader.result.split(",")[1]));
        reader.onerror=err=>reject(err);
        reader.readAsDataURL(file);
    });
}

async function uploadPDFToGitHub(file){
    const repo = "uvalios-idn/slip-gaji"; // ganti repo
    const branch = "main";
    const path = `files/${dashTahun.value || tahun.value}_${dashBulan.value || bulan.value}_${file.name}`;
    const content = await fileToBase64(file);

    try{
        const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`,{
            method:"PUT",
            headers:{
                "Authorization":"token "+GLOBAL_GITHUB_TOKEN,
                "Content-Type":"application/json"
            },
            body: JSON.stringify({
                message:`Upload file PDF ${file.name}`,
                content:content,
                branch:branch
            })
        });
        const data = await res.json();
        if(data.content) return true;
        else {console.error(data); return false;}
    }catch(e){console.error(e); return false;}
}

async function uploadAll(){
    if(!files.length) return alert("Pilih file PDF dulu");
    if(!GLOBAL_GITHUB_TOKEN) return alert("Token GitHub belum diisi");

    statusEl.innerText=`Uploading ${files.length} file...`;
    for(let f of files){
        statusEl.innerText=`Uploading ${f.name}...`;
        const success = await uploadPDFToGitHub(f);
        if(!success) alert(`❌ Gagal upload ${f.name}`);
    }
    statusEl.innerText="✅ Semua file berhasil diupload!";
}

// ================== GLOBAL ==================
window.login=login;
window.logout=logout;
window.showPage=showPage;
window.generateJSON=generateJSON;
window.uploadJSON=uploadJSON;
window.uploadAll=uploadAll;
window.removeFile=removeFile;

// ================== START ==================
window.addEventListener("load", ()=>{
    initElements();
    setupEventListeners();
    if(tokenDashboard) GLOBAL_GITHUB_TOKEN=tokenDashboard.value;
    checkSession();
});
