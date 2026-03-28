// ================= LOGIN =================
const ADMIN_HASH="eb8dd3569264665279b7715826fcf2a291b074137704e18d06574f321fd91a58";

async function hash(t){
  const e=new TextEncoder().encode(t);
  const b=await crypto.subtle.digest("SHA-256",e);
  return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('');
}

async function login(){
  if(await hash(adminPass.value)===ADMIN_HASH){
    loginPage.classList.add("hidden");
    app.classList.remove("hidden");
  } else alert("Salah!");
}

// ================= NAVIGATION =================
let currentPage = "dashboard";

function showPage(p){
  if(currentPage === "json") resetJSON();
  if(currentPage === "upload") resetUpload();

  dashboardPage.classList.add("hidden");
  jsonPage.classList.add("hidden");
  uploadPage.classList.add("hidden");

  if(p==="dashboard") dashboardPage.classList.remove("hidden");
  if(p==="json") jsonPage.classList.remove("hidden");
  if(p==="upload") uploadPage.classList.remove("hidden");

  currentPage = p;
}

// ================= RESET =================
function resetJSON(){
  excelFile.value = "";
  jsonOutput.value = "";
  jsonFileList.innerHTML = "";
  jsonData = {};
}

function resetUpload(){
  pdfFiles.value = "";
  fileList.innerHTML = "";
  files = [];
  status.innerText = "";
}

// ================= TOKEN DEFAULT =================
const TOKEN="_pat_11CAL3MIA03YlOdbk6DTFt_K7vkaYfLDFxgt5w5chcvjunGjaWA79oRknfplcB62Df4IBWLSBJw41Bw1j1";
tokenJson.value=TOKEN;
tokenUpload.value=TOKEN;

// ================= DRAG & DROP JSON =================
excelDrop.onclick=()=>excelFile.click();
excelDrop.ondrop=e=>{
  e.preventDefault();
  excelFile.files=e.dataTransfer.files;
  showExcel();
};
excelDrop.ondragover=e=>e.preventDefault();
excelFile.onchange=showExcel;

function showExcel(){
  const f=excelFile.files[0];
  if(!f) return;
  jsonFileList.innerHTML=`<div class="file-item">${f.name} <span class="remove" onclick="excelFile.value='';jsonFileList.innerHTML=''">✖</span></div>`;
}

// ================= HASH =================
async function hashPass(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);

  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// ================= JSON GENERATOR =================
let jsonData={};

async function generateJSON(){
  const file = excelFile.files[0];
  if(!file){ alert("⚠️ Pilih file Excel dulu!"); return; }

  const reader = new FileReader();

  reader.onload = async function(e){
    try{
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, {type: "array", cellDates: true, cellText: false});
      const sheetName = workbook.SheetNames[0];
      if(!sheetName){ alert("❌ Sheet tidak ditemukan!"); return; }

      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, {defval:"", raw:false});

      let result={};
      for(let row of rows){
        const normalized={};
        for(let key in row) normalized[key.toLowerCase().replace(/\s/g,'')]=row[key];

        const email=(normalized.email||"").toLowerCase().trim();
        const nama=(normalized.namafile||"").toUpperCase().trim();
        const pass=(normalized.password||"").toString().trim();

        if(!email || !nama || !pass) continue;
        result[email]={namaFile:nama, password: await hashPass(pass)};
      }

      if(Object.keys(result).length===0){
        alert("❌ Data tidak terbaca! Cek kolom dan isinya.");
        return;
      }

      jsonData=result;
      jsonOutput.value=JSON.stringify(result,null,2);
      alert("✅ JSON berhasil dibuat!");
    }catch(err){
      console.error("ERROR DETAIL:", err);
      alert("❌ Gagal membaca Excel! Periksa file.");
    }
  };

  reader.readAsArrayBuffer(file);
}

// ================= UPLOAD JSON =================
async function uploadJSON(){
  if(Object.keys(jsonData).length===0){ alert("⚠️ Generate JSON dulu!"); return; }
  const token = tokenJson.value;
  if(!token){ alert("⚠️ Token kosong!"); return; }

  const status = document.getElementById("status") || {};
  if(status) status.innerText = "⏳ Upload ke GitHub...";

  const repo="valios-idn/slip-gaji";
  const path="dataPegawai.json";
  const content=btoa(unescape(encodeURIComponent(JSON.stringify(jsonData,null,2))));
  const url=`https://api.github.com/repos/${repo}/contents/${path}`;

  let sha=null;

  const get = await fetch(url,{headers:{Authorization:`Bearer ${token}`, Accept: "application/vnd.github+json"}});
  if(get.ok){ const data=await get.json(); sha=data.sha; }

  const res=await fetch(url,{
    method:"PUT",
    headers:{Authorization:`Bearer ${token}`, "Content-Type":"application/json", Accept:"application/vnd.github+json"},
    body: JSON.stringify({message:"update dataPegawai otomatis", content:content, sha:sha})
  });

  const result=await res.json();
  if(!res.ok) alert("❌ Upload gagal: "+(result.message||""));
  else showToast("✅ JSON berhasil diupload!");
}

// ================= UPLOAD PDF =================
let files=[];

pdfDrop.onclick=()=>pdfFiles.click();
pdfFiles.onchange=e=>{files=Array.from(e.target.files);renderFiles();};

function renderFiles(){
  fileList.innerHTML="";
  files.forEach((f,i)=>{
    fileList.innerHTML+=`
    <div class="file-item">
      <div class="file-top">${f.name}<span class="remove" onclick="removeFile(${i})">✖</span></div>
      <div class="progress"><div class="bar" id="bar${i}"></div></div>
    </div>`;
  });
}

function removeFile(i){files.splice(i,1);renderFiles();}

async function uploadSingle(file,i,token){
  const bar=document.getElementById("bar"+i);
  const base64=await toBase64(file);
  bar.style.width="30%";

  const fileName = file.name.toUpperCase();
  const path=`files/${tahun.value}/${bulan.value}/${file.name}`;
  const url=`https://api.github.com/repos/valios-idn/slip-gaji/contents/${path}`;
  bar.style.width="60%";

  const res=await fetch(url,{
    method:"PUT",
    headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
    body: JSON.stringify({message:"upload slip", content:base64})
  });

  if(!res.ok) throw new Error();
  bar.style.width="100%";
}

function toBase64(file){
  return new Promise(r=>{
    const fr=new FileReader();
    fr.onload=()=>r(fr.result.split(',')[1]);
    fr.readAsDataURL(file);
  });
}

async function uploadAll(){
  if(files.length===0){ alert("⚠️ Tidak ada file!"); return; }

  const token = tokenUpload.value;
  if(!token){ alert("⚠️ Token kosong!"); return; }

  status.innerText="⏳ Upload sedang berjalan...";
  let success=0;

  for(let i=0;i<files.length;i++){
    try{ await uploadSingle(files[i], i, token); success++; }catch(e){ console.error(e); }
  }

  if(success===files.length){ status.innerText="🎉 Semua file berhasil diupload!"; showToast("🎉 Upload selesai semua!"); }
  else{ status.innerText=`⚠️ ${success}/${files.length} file berhasil`; showToast("⚠️ Ada file yang gagal upload","error"); }
}

// ================= TOAST =================
function showToast(message,type="success"){
  const toast=document.getElementById("toast");
  toast.textContent=message;
  toast.className="toast show";
  if(type==="error") toast.classList.add("error");
  setTimeout(()=>{ toast.classList.remove("show"); },3000);
}
