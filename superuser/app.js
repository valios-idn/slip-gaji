// ==================== LOGIN & MENU ====================
const loginPanel = document.getElementById('loginPanel');
const adminPanel = document.getElementById('adminPanel');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');

loginBtn.addEventListener('click', () => {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    if(u==='admin' && p==='admin123'){
        loginPanel.style.display='none';
        adminPanel.style.display='flex';
        populateYearsMonths();
        document.getElementById('githubToken').value='GITHUB_TOKEN_DEFAULT'; // <-- ganti token default
        showMenu('dashboard');
    } else loginError.style.display='block';
});

document.getElementById('logoutBtn').addEventListener('click', ()=>{
    adminPanel.style.display='none';
    loginPanel.style.display='flex';
});

// Menu Switch
document.querySelectorAll('.menuBtn').forEach(btn => {
    btn.addEventListener('click', () => showMenu(btn.dataset.menu));
});
function showMenu(id){
    document.querySelectorAll('.menuContent').forEach(m => m.style.display='none');
    document.getElementById(id).style.display='block';
}

// ==================== YEARS & MONTHS ====================
function populateYearsMonths(){
    const yearSelects = [document.getElementById('selectYear'), document.getElementById('pdfYear')];
    const monthSelects = [document.getElementById('selectMonth'), document.getElementById('pdfMonth')];
    const currentYear = new Date().getFullYear();
    yearSelects.forEach(sel => { sel.innerHTML=''; for(let y=currentYear;y>=2000;y--) sel.innerHTML+=`<option value="${y}">${y}</option>`; });
    monthSelects.forEach(sel => { sel.innerHTML=''; for(let m=1;m<=12;m++) sel.innerHTML+=`<option value="${m}">${m}</option>`; });
}

// ==================== TOAST ====================
function showToast(msg){
    const t=document.getElementById('toast');
    t.textContent=msg;
    t.classList.add('show');
    setTimeout(()=>t.classList.remove('show'),3000);
}

// ==================== DASHBOARD ====================
document.getElementById('loadFiles').addEventListener('click', loadGitHubFiles);

async function loadGitHubFiles(){
    const token = document.getElementById('githubToken').value;
    const year = document.getElementById('selectYear').value;
    const month = document.getElementById('selectMonth').value;
    const repo = 'USERNAME/REPO'; // <-- ganti repo kamu
    const path = `${year}/${month}`;
    const fileListEl = document.getElementById('fileList');
    fileListEl.innerHTML = 'Loading...';
    try{
        const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
            headers: { 'Authorization': `token ${token}` }
        });
        const data = await res.json();
        if(data.message) fileListEl.innerHTML='Tidak ada file';
        else{
            fileListEl.innerHTML='';
            data.forEach(f=>{
                const li = document.createElement('li');
                li.textContent=f.name;
                fileListEl.appendChild(li);
            });
        }
    }catch(err){ fileListEl.innerHTML='Error saat load file'; }
}

// ==================== GENERATE JSON ====================
let excelFiles = [];
const dropZoneExcel = document.getElementById('dropZoneExcel');
const excelInput = document.getElementById('excelInput');
const uploadedFilesEl = document.getElementById('uploadedFiles');

dropZoneExcel.addEventListener('click', ()=>excelInput.click());
excelInput.addEventListener('change', handleExcelFiles);
dropZoneExcel.addEventListener('dragover', e=>{ e.preventDefault(); dropZoneExcel.classList.add('drag-over'); });
dropZoneExcel.addEventListener('dragleave', e=>{ dropZoneExcel.classList.remove('drag-over'); });
dropZoneExcel.addEventListener('drop', e=>{ e.preventDefault(); dropZoneExcel.classList.remove('drag-over'); handleDroppedExcel(e); });

function handleExcelFiles(e){
    for(let file of e.target.files){
        excelFiles.push(file);
    }
    renderExcelList();
}
function handleDroppedExcel(e){
    for(let file of e.dataTransfer.files){
        if(file.name.endsWith('.xlsx')) excelFiles.push(file);
    }
    renderExcelList();
}
function renderExcelList(){
    uploadedFilesEl.innerHTML='';
    excelFiles.forEach((file,i)=>{
        const div = document.createElement('div');
        div.textContent=file.name;
        const btn = document.createElement('button');
        btn.textContent='✕';
        btn.classList.add('danger');
        btn.addEventListener('click', ()=>{ excelFiles.splice(i,1); renderExcelList(); });
        div.appendChild(btn);
        uploadedFilesEl.appendChild(div);
    });
}

document.getElementById('generateJsonBtn').addEventListener('click', generateJson);

async function generateJson(){
    if(excelFiles.length===0){ showToast('Belum ada file Excel'); return; }
    const allData = [];
    for(let file of excelFiles){
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data,{type:'array'});
        wb.SheetNames.forEach(sheet=>{
            const json = XLSX.utils.sheet_to_json(wb.Sheets[sheet]);
            json.forEach(row=>{
                if(row.password) row.password = CryptoJS.SHA256(row.password).toString();
                allData.push(row);
            });
        });
    }
    document.getElementById('jsonPreview').textContent=JSON.stringify(allData,null,2);
    showToast('JSON berhasil dibuat');
}

document.getElementById('uploadJsonBtn').addEventListener('click', async ()=>{
    const token = document.getElementById('githubToken').value;
    const repo = 'USERNAME/REPO'; // <-- ganti repo kamu
    const content = document.getElementById('jsonPreview').textContent;
    if(!content) { showToast('Belum ada JSON'); return; }
    try{
        await githubUploadFile(token, repo, 'dataPegawai.json', content, 'Update dataPegawai.json');
        showToast('JSON berhasil diupload ke GitHub');
    }catch(err){ showToast('Error upload JSON'); }
});

// ==================== UPLOAD PDF ====================
let pdfFiles=[];
const dropZonePdf=document.getElementById('dropZonePdf');
const pdfInput=document.getElementById('pdfInput');
const pdfFilesList=document.getElementById('pdfFilesList');
const pdfLoading=document.getElementById('pdfLoading');
const pdfProgress=document.getElementById('pdfProgress');

dropZonePdf.addEventListener('click', ()=>pdfInput.click());
pdfInput.addEventListener('change', handlePdfFiles);
dropZonePdf.addEventListener('dragover', e=>{ e.preventDefault(); dropZonePdf.classList.add('drag-over'); });
dropZonePdf.addEventListener('dragleave', e=>{ dropZonePdf.classList.remove('drag-over'); });
dropZonePdf.addEventListener('drop', e=>{ e.preventDefault(); dropZonePdf.classList.remove('drag-over'); handleDroppedPdf(e); });

function handlePdfFiles(e){
    for(let file of e.target.files){
        if(file.type==='application/pdf') pdfFiles.push(file);
    }
    renderPdfList();
}
function handleDroppedPdf(e){
    for(let file of e.dataTransfer.files){
        if(file.type==='application/pdf') pdfFiles.push(file);
    }
    renderPdfList();
}
function renderPdfList(){
    pdfFilesList.innerHTML='';
    pdfFiles.forEach((file,i)=>{
        const div=document.createElement('div');
        div.textContent=file.name;
        const btn=document.createElement('button');
        btn.textContent='✕'; btn.classList.add('danger');
        btn.addEventListener('click', ()=>{ pdfFiles.splice(i,1); renderPdfList(); });
        div.appendChild(btn);
        pdfFilesList.appendChild(div);
    });
}

document.getElementById('uploadPdfBtn').addEventListener('click', async ()=>{
    if(pdfFiles.length===0){ showToast('Belum ada PDF'); return; }
    const token=document.getElementById('githubToken').value;
    const repo='USERNAME/REPO'; // <-- ganti repo kamu
    const year=document.getElementById('pdfYear').value;
    const month=document.getElementById('pdfMonth').value;
    pdfLoading.style.display='block';
    for(let i=0;i<pdfFiles.length;i++){
        const file=pdfFiles[i];
        const data=await file.arrayBuffer();
        const content=btoa(String.fromCharCode(...new Uint8Array(data)));
        try{
            await githubUploadFile(token, repo, `${year}/${month}/${file.name}`, data, `Upload ${file.name}`);
        }catch(err){ console.log(err); }
        pdfProgress.style.width = `${Math.round(((i+1)/pdfFiles.length)*100)}%`;
        pdfProgress.textContent = `${Math.round(((i+1)/pdfFiles.length)*100)}%`;
    }
    showToast('Semua PDF berhasil diupload');
    pdfFiles=[]; renderPdfList(); pdfLoading.style.display='none'; pdfProgress.style.width='0%';
});
