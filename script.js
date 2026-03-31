const form = document.getElementById('pdfForm');
const viewer = document.getElementById('pdfViewer');
const viewerContainer = document.getElementById('viewerContainer');
const pesan = document.getElementById('pesan');
const errorDiv = document.getElementById('error');
const downloadBtn = document.getElementById('downloadBtn');

let currentUrl = '';
let currentFileName = '';
let dataPegawai = {};
let pdfDoc = null;
let dataLoaded = false;

// HASH PASSWORD
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

// LOAD DATA
async function loadData() {
  const res = await fetch('dataPegawai.json');
  dataPegawai = await res.json();
  dataLoaded = true;
}
loadData();

// PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc =
'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// RENDER PDF
async function renderPage(pageNum, canvas) {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1.3 });
  const ctx = canvas.getContext('2d');

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({
    canvasContext: ctx,
    viewport: viewport
  }).promise;
}

// SUBMIT
form.addEventListener('submit', async function(e) {
  e.preventDefault();

  const tahun = document.getElementById('tahun').value;
  const bulan = document.getElementById('bulan').value;
  const email = document.getElementById('email').value.trim().toLowerCase();
  const password = document.getElementById('password').value.trim();

  errorDiv.textContent = '';
  pesan.textContent = 'Loading...';
  viewer.innerHTML = '';
  viewerContainer.classList.add('hidden');

  let pegawai = dataPegawai[email];

  if (!pegawai) {
    errorDiv.textContent = 'Email tidak ditemukan';
    return;
  }

  const hashed = await hashPassword(password);

  if (pegawai.password !== hashed) {
    errorDiv.textContent = 'Password salah';
    return;
  }

  const file = pegawai.namaFile.toUpperCase();
  currentFileName = pegawai.namaFile + '.pdf';

  const url = `https://cdn.jsdelivr.net/gh/valios-idn/slip-gaji@main/files/${tahun}/${bulan}/${file}.pdf`;

  try {
    currentUrl = url;
    pdfDoc = await pdfjsLib.getDocument(url).promise;

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const canvas = document.createElement('canvas');
      viewer.appendChild(canvas);
      await renderPage(i, canvas);
    }

    viewerContainer.classList.remove('hidden');
    pesan.textContent = 'Slip berhasil dimuat';

  } catch {
    errorDiv.textContent = 'PDF tidak ditemukan';
    pesan.textContent = '';
  }
});

// DOWNLOAD
downloadBtn.addEventListener('click', async () => {
  const res = await fetch(currentUrl);
  const blob = await res.blob();

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = currentFileName;
  link.click();
});
