// ===== Default Token =====
let GITHUB_TOKEN = 'ghp_exampleToken123456';
document.getElementById('github-token').value = GITHUB_TOKEN;
document.getElementById('github-token').addEventListener('input', e => GITHUB_TOKEN = e.target.value);

// ===== Sidebar switching =====
const menuItems = document.querySelectorAll('.sidebar ul li');
const menus = document.querySelectorAll('.menu-content');
menuItems.forEach(item => {
  item.addEventListener('click', () => {
    menuItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    menus.forEach(m => m.classList.remove('active'));
    document.getElementById(item.dataset.menu).classList.add('active');
  });
});

// ===== Tahun dropdown =====
function fillYears(id){
  const sel = document.getElementById(id);
  const y = new Date().getFullYear();
  for(let i=y;i>=y-10;i--) sel.innerHTML += `<option value="${i}">${i}</option>`;
}
fillYears('tahun-dashboard');
fillYears('tahun-upload');

// ===== GitHub Helper =====
async function ghRequest(path, method='GET', body=null){
  const url = `https://api.github.com/repos/username/repo-gaji/contents/${path}`;
  const opts = { method,
    headers: { Authorization:`token ${GITHUB_TOKEN}`, Accept:'application/vnd.github.v3+json' }
  };
  if(body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  return res.json();
}

// ===== Dashboard: list files =====
document.getElementById('load-files').onclick = async ()=>{
  const year = document.getElementById('tahun-dashboard').value;
  const month = document.getElementById('bulan-dashboard').value;
  const path = `files/${year}/${month}`;
  const data = await ghRequest(path);
  const listEl = document.getElementById('file-list'); listEl.innerHTML = '';
  if(data.message){ listEl.textContent=data.message; return; }
  data.forEach(file=>{
    listEl.innerHTML += `<div class="file-row">
      <a href="${file.download_url}" target="_blank">${file.name}</a>
      <button onclick="deleteGitHubFile('${file.path}','${file.sha}')">🗑️</button>
    </div>`;
  });
}

// ===== Delete file =====
async function deleteGitHubFile(path, sha){
  if(!confirm('Yakin hapus file?')) return;
  await ghRequest(path,'DELETE',{message:`Hapus ${path}`, sha});
  alert('File dihapus!');
  document.getElementById('load-files').click();
}

// ===== Excel & JSON =====
let excelFiles = [], lastJson = [];
document.getElementById('excel-file').onchange = e=>{
  excelFiles = Array.from(e.target.files);
  renderExcels();
}
function renderExcels(){
  const list = document.getElementById('excel-list'); list.innerHTML='';
  excelFiles.forEach((f,i)=>{
    const div = document.createElement('div'); div.className='file-item';
    div.innerHTML = `${f.name} <button onclick="removeExcel(${i})">&times;</button>`;
    list.appendChild(div);
  });
}
window.removeExcel=i=>{ excelFiles.splice(i,1); renderExcels(); }

document.getElementById('generate-json-btn').onclick = () => {
  let arr = [];
  excelFiles.forEach(file=>{
    const reader = new FileReader();
    reader.onload=e=>{
      const wb = XLSX.read(e.target.result,{type:'array'});
      wb.SheetNames.forEach(sn=>arr.push(...XLSX.utils.sheet_to_json(wb.Sheets[sn])));
      document.getElementById('json-preview').textContent=JSON.stringify(arr,null,2);
      lastJson=arr;
    }
    reader.readAsArrayBuffer(file);
  });
}

document.getElementById('upload-json-btn').onclick = async () => {
  if(!lastJson.length){ alert('Generate JSON dulu!'); return; }
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(lastJson))));
  await ghRequest('files/dataPegawai.json','PUT',{message:'Upload JSON', content});
  alert('dataPegawai.json berhasil diupload!');
}

// ===== PDF Upload Pro =====
let pdfFiles = [];
const pdfInput = document.getElementById('pdf-files');
const pdfListDiv = document.getElementById('upload-status');
const progressBar = document.getElementById('pdf-progress');

pdfInput.onchange = e=>{
  pdfFiles = Array.from(e.target.files);
  renderPdfList();
}

function renderPdfList(){
  pdfListDiv.innerHTML='';
  pdfFiles.forEach((f,i)=>{
    const div = document.createElement('div'); div.className='file-item';
    div.innerHTML = `${f.name} <button onclick="removePdf(${i})">&times;</button>`;
    pdfListDiv.appendChild(div);
  });
}

window.removePdf=i=>{
  pdfFiles.splice(i,1);
  renderPdfList();
}

document.getElementById('upload-pdf-btn').onclick=async()=>{
  const year = document.getElementById('tahun-upload').value;
  const month = document.getElementById('bulan-upload').value;
  if(!pdfFiles.length){ alert('Pilih file PDF!'); return; }

  for(let i=0;i<pdfFiles.length;i++){
    const f = pdfFiles[i];
    const content = await new Promise(resolve=>{
      const r = new FileReader();
      r.onload=()=>resolve(btoa(r.result));
      r.readAsBinaryString(f);
    });
    const path = `files/${year}/${month}/${f.name}`;
    await ghRequest(path,'PUT',{message:`Upload PDF ${f.name}`, content});
    progressBar.style.width=`${Math.round(((i+1)/pdfFiles.length)*100)}%`;
  }
  alert('Semua PDF berhasil diupload!');
  pdfFiles=[]; renderPdfList();
  setTimeout(()=>progressBar.style.width='0%',1000);
}
