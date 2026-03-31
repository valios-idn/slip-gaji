import { login, checkSession, resetIdleTimer, logout, hashPass } from './login.js';

let files = [];
let jsonData = {};

const el = id => document.getElementById(id);

// ======================
// INIT
// ======================
window.addEventListener("DOMContentLoaded", () => {
    checkSession();

    el("loginBtn").onclick = login;

    el("menuLogout").onclick = () => {
        resetApp();
        logout();
    };

    el("menuDashboard").onclick = ()=>showPage("dashboard");
    el("menuJSON").onclick = ()=>showPage("json");
    el("menuUpload").onclick = ()=>showPage("upload");

    // LOAD DASHBOARD
    const btn = el("btnLoadFile");
    if(btn) btn.addEventListener("click", loadPDFList);

    // SELECT ALL
    const selectAll = el("selectAll");
    if(selectAll){
        selectAll.onchange = function(){
            document.querySelectorAll(".file-check").forEach(cb=>{
                cb.checked = this.checked;
            });
        };
    }

    // MENU ACTIVE
    document.querySelectorAll('.menu').forEach(menu=>{
        menu.addEventListener('click', ()=>{
            document.querySelectorAll('.menu').forEach(m=>m.classList.remove('active'));
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

    el("generateJSONBtn").onclick = generateJSON;
    el("uploadJSONBtn").onclick = uploadJSON;
    el("uploadPDFBtn").onclick = uploadPDF;

    // DELETE MULTI BUTTON
    const btnDelete = el("btnDeleteSelected");
    if(btnDelete) btnDelete.onclick = deleteSelected;
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

    const url = `https://api.github.com/repos/valios-idn/slip-gaji/contents/dataPegawai.json`;
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(jsonData, null, 2))));

    let sha = null;

    try {
        const get = await fetch(url,{ headers:{ Authorization:`Bearer ${token}` }});
        if (get.ok){
            const data = await get.json();
            sha = data.sha;
        }
    } catch {}

    await fetch(url,{
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

    alert("✅ Upload JSON selesai");
}

// ======================
// PDF UPLOAD
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
                    <span onclick="removeFile(${i})">✖</span>
                </div>
            </div>
        </div>`;
    });
}

window.removeFile = (i)=>{
    files.splice(i,1);
    renderFiles();
};

async function uploadPDF(){
    const token = el("tokenUpload").value.trim();
    if(!token) return alert("Token kosong!");

    const tahun = el("tahun").value;
    const bulan = el("bulan").value;

    for(let i=0;i<files.length;i++){
        await uploadSingle(files[i], token, tahun, bulan);
    }

    alert("✅ Upload selesai");
}

async function uploadSingle(file,token,tahun,bulan){
    const path = `files/${tahun}/${bulan}/${file.name.toUpperCase()}`;
    const url = `https://api.github.com/repos/valios-idn/slip-gaji/contents/${path}`;

    const base64 = await toBase64(file);

    await fetch(url,{
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
}

function toBase64(file){
    return new Promise(r=>{
        const fr = new FileReader();
        fr.onload = ()=>r(fr.result.split(',')[1]);
        fr.readAsDataURL(file);
    });
}

// ======================
// DASHBOARD
// ======================
async function loadPDFList(){
    const token = el("dashToken").value.trim();
    const tahun = el("dashTahun").value;
    const bulan = el("dashBulan").value;
    const container = el("dashboardList");

    if(!token) return alert("Token kosong!");
    if(!tahun || !bulan) return alert("Pilih tahun & bulan!");

    container.innerHTML = "Loading...";

    try{
        const url = `https://api.github.com/repos/valios-idn/slip-gaji/contents/files/${tahun}/${bulan}`;

        const res = await fetch(url,{
            headers:{ Authorization:`Bearer ${token}` }
        });

        const data = await res.json();

        const pdfFiles = data.filter(f => f.name.toLowerCase().endsWith(".pdf"));

        window.dashboardFiles = pdfFiles;

        container.innerHTML = pdfFiles.map((f,i)=>`
            <div class="dashboard-item">
                <div class="dashboard-left">
                    <input type="checkbox" class="file-check" data-index="${i}">
                    <span>📄</span>
                    <div class="dashboard-name">${f.name}</div>
                </div>

                <div class="dashboard-actions-btn">
                    <button class="btn-open" onclick="window.open('${f.download_url}')">Buka</button>
                    <button class="btn-delete" onclick="deleteSingle(${i})">Hapus</button>
                </div>
            </div>
        `).join("");

        el("totalFile").innerText = `Total: ${pdfFiles.length}`;

    }catch{
        container.innerHTML = "❌ Gagal load file";
    }
}

// ======================
// DELETE SINGLE
// ======================
window.deleteSingle = async (i) => {
    const token = el("dashToken").value.trim();
    const file = window.dashboardFiles?.[i];

    if(!file) return alert("File tidak ditemukan");

    if(!confirm(`Hapus ${file.name}?`)) return;

    await fetch(
        `https://api.github.com/repos/valios-idn/slip-gaji/contents/${file.path}`,
        {
            method:"DELETE",
            headers:{
                Authorization:`Bearer ${token}`,
                "Content-Type":"application/json"
            },
            body: JSON.stringify({
                message:`delete ${file.name}`,
                sha: file.sha
            })
        }
    );

    loadPDFList();
};

// ======================
// DELETE MULTI
// ======================
async function deleteSelected(){
    const token = el("dashToken").value.trim();

    const checked = document.querySelectorAll(".file-check:checked");
    if(checked.length === 0) return alert("Tidak ada file dipilih");

    if(!confirm(`Hapus ${checked.length} file?`)) return;

    for(const cb of checked){
        const file = window.dashboardFiles[cb.dataset.index];

        await fetch(
            `https://api.github.com/repos/valios-idn/slip-gaji/contents/${file.path}`,
            {
                method:"DELETE",
                headers:{
                    Authorization:`Bearer ${token}`,
                    "Content-Type":"application/json"
                },
                body: JSON.stringify({
                    message:`delete ${file.name}`,
                    sha: file.sha
                })
            }
        );
    }

    alert("✅ Selesai hapus");
    loadPDFList();
}

// ======================
// RESET
// ======================
function resetApp(){
    jsonData = {};
    files = [];

    el("jsonOutput").value = "";
    el("jsonFileList").innerHTML = "";
    el("fileList").innerHTML = "";
}
