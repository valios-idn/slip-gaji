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

// =======================
// LOAD DATA JSON
// =======================
async function loadData() {
  try {
    const res = await fetch('dataPegawai.json');
    if (!res.ok) throw new Error('Gagal load JSON');
    dataPegawai = await res.json();
  } catch (err) {
    console.error(err);
    errorDiv.textContent = 'Gagal memuat data pegawai!';
  }
}
loadData();

// =======================
// PDF.js setup
// =======================
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// =======================
// RENDER 1 HALAMAN
// =======================
async function renderPage(pageNum, canvas) {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1.3 });

  const context = canvas.getContext('2d');
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise;
}

// =======================
// LAZY LOADING OBSERVER
// =======================
function setupLazyLoading() {
  const observer = new IntersectionObserver(async (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const canvas = entry.target;
        const pageNum = parseInt(canvas.dataset.page);

        if (!canvas.dataset.rendered) {
          await renderPage(pageNum, canvas);
          canvas.dataset.rendered = "true";
        }
      }
    }
  }, {
    root: null,
    rootMargin: '100px',
    threshold: 0.1
  });

  document.querySelectorAll('.pdf-page').forEach(canvas => {
    observer.observe(canvas);
  });
}

// =======================
// SUBMIT FORM
// =======================
form.addEventListener('submit', async function(e) {
  e.preventDefault();

  const tahun = document.getElementById('tahun').value;
  const bulan = document.getElementById('bulan').value;
  const nip = document.getElementById('nip').value.trim();
  const password = document.getElementById('password').value.trim();

  errorDiv.textContent = '';
  pesan.textContent = '';
  viewer.innerHTML = '';
  viewerContainer.style.display = 'none';

  if (!tahun || !bulan || !nip || !password) {
    errorDiv.textContent = 'Semua field wajib diisi!';
    return;
  }

  if (!/^\d{18}$/.test(nip)) {
    errorDiv.textContent = 'NIP harus 18 digit angka!';
    return;
  }

  const pegawai = dataPegawai[nip];

  if (!pegawai) {
    errorDiv.textContent = 'NIP tidak ditemukan!';
    return;
  }

  if (pegawai.password !== password) {
    errorDiv.textContent = 'Password salah!';
    return;
  }

  const namaFile = pegawai.namaFile;
  currentFileName = namaFile + '.pdf';

  const baseUrl = 'https://cdn.jsdelivr.net/gh/madhagaskar182/testing@main/files/';
  const url = `${baseUrl}${tahun}/${bulan}/${namaFile}.pdf`;

  pesan.textContent = 'Memuat dokumen...';

  try {
    currentUrl = url;

    pdfDoc = await pdfjsLib.getDocument(url).promise;

    // Buat placeholder canvas dulu (belum render)
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const canvas = document.createElement('canvas');
      canvas.classList.add('pdf-page');
      canvas.dataset.page = i;

      canvas.style.marginBottom = '10px';
      canvas.style.background = '#f1f5f9';

      viewer.appendChild(canvas);
    }

    setupLazyLoading();

    viewerContainer.style.display = 'block';
    pesan.textContent = `SLIP GAJI ${namaFile} BERHASIL DIMUAT`;

  } catch (err) {
    console.error(err);
    errorDiv.textContent = 'PDF tidak ditemukan / gagal dimuat!';
  }
});

// =======================
// DOWNLOAD
// =======================
downloadBtn.addEventListener('click', async () => {
  if (!currentUrl) {
    alert('Tidak ada file!');
    return;
  }

  try {
    const res = await fetch(currentUrl);
    const blob = await res.blob();

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = currentFileName;

    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (err) {
    alert('Gagal download!');
  }
});

// =======================
// AUTO TAHUN
// =======================
document.addEventListener('DOMContentLoaded', () => {
  const tahunSekarang = new Date().getFullYear().toString();
  const selectTahun = document.getElementById('tahun');

  if (![...selectTahun.options].some(opt => opt.value === tahunSekarang)) {
    const opt = document.createElement('option');
    opt.value = tahunSekarang;
    opt.textContent = tahunSekarang;
    selectTahun.appendChild(opt);
  }

  selectTahun.value = tahunSekarang;
});
