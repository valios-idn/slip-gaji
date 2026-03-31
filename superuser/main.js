import { login, checkSession, resetIdleTimer, logout, hashPass } from './login.js';

let files = [];
let jsonData = {};

const el = id => document.getElementById(id);

// INIT
window.addEventListener("DOMContentLoaded", checkSession);

el("loginBtn").onclick = login;
el("menuLogout").onclick = () => {
    resetApp();
    logout();
};

document.addEventListener("click", resetIdleTimer);
document.addEventListener("keydown", resetIdleTimer);

// ======================
// NAVIGATION
// ======================
const pages = ["dashboard","json","upload"];

function showPage(page){
    pages.forEach(p => el(p+"Page").classList.add("hidden"));
    el(page+"Page").classList.remove("hidden");

    // reset ringan
    if(page !== "json"){
        el("jsonOutput").value = "";
        el("jsonFileList").innerHTML = "";
    }
}

el("menuDashboard").onclick = ()=>showPage("dashboard");
el("menuJSON").onclick = ()=>showPage("json");
el("menuUpload").onclick = ()=>showPage("upload");

// ======================
// EXCEL
// ======================
el("excelDrop").onclick = ()=>el("excelFile").click();
el("excelFile").onchange = showExcel;

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
el("generateJSONBtn").onclick = async ()=>{
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


    reader.readAsArrayBuffer(file);
};

// ======================
// UPLOAD JSON
// ======================
el("uploadJSONBtn").onclick = async ()=>{
    const token = el("tokenJson").value.trim();
    if(!token) return alert("Token kosong!");

    const url = `https://api.github.com/repos/valios-idn/slip-gaji/contents/dataPegawai.json`;
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(jsonData,null,2))));

    let sha = null;

    try{
        const get = await fetch(url,{headers:{Authorization:`Bearer ${token}`}});
        if(get.ok){
            const data = await get.json();
            sha = data.sha;
        }
    }catch(e){}

    const res = await fetch(url,{
        method:"PUT",
        headers:{
            Authorization:`Bearer ${token}`,
            "Content-Type":"application/json"
        },
        body: JSON.stringify({
            message:"update dataPegawai",
            content,
            sha
        })
    });

    const result = await res.json();

    if(!res.ok){
        console.error(result);
    }else{
        console.log(result);
    }
};

// ======================
// PDF (GRID VIEW)
// ======================
el("pdfDrop").onclick = ()=>el("pdfFiles").click();

el("pdfFiles").onchange = e=>{
    files = Array.from(e.target.files);
    renderFiles();
};

function renderFiles(){
    const container = el("fileList");
    container.innerHTML = "";

    files.forEach((f,i)=>{
        container.innerHTML += `
        <div class="file-card">
            
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div class="file-name">${f.name}</div>
                <span class="remove-btn" onclick="removeFile(${i})">✖</span>
            </div>

            <div class="progress">
                <div class="bar" id="bar${i}"></div>
            </div>

            <div class="file-status" id="status${i}">Menunggu...</div>

        </div>`;
    });
}

window.removeFile = (i)=>{
    files.splice(i,1);
    renderFiles();
};

// ======================
// UPLOAD PDF (REALTIME)
// ======================
el("uploadPDFBtn").onclick = async ()=>{
    const token = el("tokenUpload").value.trim();
    if(!token) return alert("Token kosong!");

    const tahun = el("tahun").value;
    const bulan = el("bulan").value;

for(let i=0;i<files.length;i++){
    await uploadSingle(files[i], i, token, tahun, bulan);
}

    console.log("Upload selesai");

async function uploadSingle(file,i,token,tahun,bulan){
    const bar = el("bar"+i);
    const status = el("status"+i);

    try{
        status.innerText = "Checking...";
        bar.style.width = "10%";

        const path = `files/${tahun}/${bulan}/${file.name.toUpperCase()}`;
        const url = `https://api.github.com/repos/valios-idn/slip-gaji/contents/${path}`;

        // 🔍 CEK FILE ADA
        let sha = null;
        const check = await fetch(url,{
            headers:{Authorization:`Bearer ${token}`}
        });

        if(check.ok){
            const data = await check.json();
            sha = data.sha;
        }

        status.innerText = "Encoding...";
        bar.style.width = "30%";

        const base64 = await toBase64(file);

        status.innerText = "Uploading...";
        bar.style.width = "70%";

        const res = await fetch(url,{
            method:"PUT",
            headers:{
                Authorization:`Bearer ${token}`,
                "Content-Type":"application/json"
            },
            body: JSON.stringify({
                message:"upload slip",
                content:base64,
                sha // 🔥 penting untuk update
            })
        });

        if(!res.ok){
            const err = await res.json();
            throw new Error(err.message);
        }

        bar.style.width = "100%";
        status.innerText = "✅ Selesai";

    }catch(e){
        console.error(e);
        bar.style.background = "#ef4444";
        status.innerText = "❌ " + e.message;
    }
}

await new Promise(r => setTimeout(r, 300));
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
// RESET
// ======================
function resetApp(){
    jsonData = {};
    el("jsonOutput").value = "";
    el("jsonFileList").innerHTML = "";

    el("excelFile").value = "";

    files = [];
    el("fileList").innerHTML = "";
}

window.resetApp = resetApp;
