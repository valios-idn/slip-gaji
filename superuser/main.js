import { login, checkSession, resetIdleTimer, logout, hashPass } from './login.js';

let files = [];
let jsonData = {};

// INIT
window.addEventListener("DOMContentLoaded", checkSession);
document.getElementById("loginBtn").onclick = login;
document.getElementById("menuLogout").onclick = () => {
    resetApp();
    logout();
};

document.addEventListener("click", resetIdleTimer);
document.addEventListener("keydown", resetIdleTimer);

// NAVIGATION
const pages = ["dashboardPage","jsonPage","uploadPage"];

function showPage(page){
    pages.forEach(p => document.getElementById(p).classList.add("hidden"));
    document.getElementById(page+"Page").classList.remove("hidden");

    // 🔥 reset saat pindah halaman
    if(page !== "json"){
        jsonOutput.value = "";
        jsonFileList.innerHTML = "";
    }
}

menuDashboard.onclick = ()=>showPage("dashboard");
menuJSON.onclick = ()=>showPage("json");
menuUpload.onclick = ()=>showPage("upload");

// EXCEL
excelDrop.onclick = ()=>excelFile.click();
excelFile.onchange = showExcel;

function showExcel(){
    const f = excelFile.files[0];
    if(!f) return;

    jsonFileList.innerHTML = `
        <div class="file-item">
            ${f.name}
            <span style="cursor:pointer;color:red;" onclick="removeExcel()">✖</span>
        </div>
    `;
}
// GENERATE JSON
generateJSONBtn.onclick = async () => {
    const file = excelFile.files[0];
    if (!file) return alert("Pilih file!");

    const reader = new FileReader();

    reader.onload = async e => {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        const result = {};

        for (let row of rows) {
            // 🔥 NORMALISASI HEADER (ANTI ERROR)
            const normalized = {};
            for (let key in row) {
                normalized[key.toLowerCase().replace(/\s/g, "")] = row[key];
            }

            const email = (normalized.email || "").toLowerCase().trim();
            const nama = (normalized.namafile || "").toUpperCase().trim();
            const pass = (normalized.password || "").toString().trim();

            if (!email || !nama || !pass) continue;

            result[email] = {
                namaFile: nama,
                password: await hashPass(pass) // SHA-256
            };
        }

        jsonData = result;
        jsonOutput.value = JSON.stringify(result, null, 2);

        alert("✅ JSON berhasil dibuat!");
    };

    reader.readAsArrayBuffer(file);
};

// UPLOAD JSON
uploadJSONBtn.onclick = async () => {
    const token = tokenJson.value.trim();
    if (!token) return alert("Token kosong!");

    const url = `https://api.github.com/repos/valios-idn/slip-gaji/contents/dataPegawai.json`;

    const content = btoa(unescape(encodeURIComponent(JSON.stringify(jsonData, null, 2))));

    let sha = null;

    // 🔍 CEK FILE SUDAH ADA / BELUM
    try {
        const get = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (get.ok) {
            const data = await get.json();
            sha = data.sha; // wajib kalau update file
        }
    } catch (e) {
        console.error("GET error:", e);
    }

    // 🚀 UPLOAD
    const res = await fetch(url, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: "update dataPegawai",
            content: content,
            sha: sha // 🔥 penting!
        })
    });

    const result = await res.json();

    // ✅ HANDLE RESPONSE
    if (!res.ok) {
        console.error(result);
        alert("❌ Upload gagal: " + (result.message || ""));
    } else {
        alert("✅ JSON berhasil diupload!");
        console.log(result);
    }
};

// PDF
pdfDrop.onclick = ()=>pdfFiles.click();
pdfFiles.onchange = e=>{
    files = Array.from(e.target.files);
    renderFiles();
};

function renderFiles(){
    fileList.innerHTML="";
    files.forEach((f,i)=>{
        fileList.innerHTML+=`${f.name} <button onclick="removeFile(${i})">X</button><br>`;
    });
}

window.removeFile = i=>{
    files.splice(i,1);
    renderFiles();
};

// UPLOAD PDF
uploadPDFBtn.onclick = async ()=>{
    const token = tokenUpload.value;

    const tahunVal = document.getElementById("tahun").value;
    const bulanVal = document.getElementById("bulan").value;

    for(let f of files){
        const base64 = await toBase64(f);

        await fetch(`https://api.github.com/repos/valios-idn/slip-gaji/contents/files/${tahunVal}/${bulanVal}/${f.name}`,{
            method:"PUT",
            headers:{Authorization:`Bearer ${token}`},
            body: JSON.stringify({message:"upload", content:base64})
        });
    }

    alert("Upload selesai!");
};

function toBase64(file){
    return new Promise(r=>{
        const fr = new FileReader();
        fr.onload = ()=>r(fr.result.split(',')[1]);
        fr.readAsDataURL(file);
    });
}

//RESET
function resetApp(){
    // reset JSON
    jsonData = {};
    jsonOutput.value = "";
    jsonFileList.innerHTML = "";

    // reset excel input
    excelFile.value = "";

    // reset PDF
    files = [];
    fileList.innerHTML = "";

    // reset token (opsional)
    //tokenJson.value = "";
    //tokenUpload.value = "";
}

