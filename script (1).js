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

// ================= HASH PASSWORD =================
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

// ================= LOAD JSON =================
async function loadData() {
  try {
    const res = await fetch('dataPegawai.json');
    if (!res.ok) throw new Error('Gagal load JSON');

    dataPegawai = await res.json();
    dataLoaded = true;
  } catch (err) {
    console.error(err);
    errorDiv.textContent = 'Gagal memuat data pegawai!';
  }
}
loadData();

// ================= PDF.js =================
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ================= RENDER PAGE =================
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

// ================= LAZY LOAD =================
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
    rootMargin: '100px'
  });

  document.querySelectorAll('.pdf-page').forEach(c => observer.observe(c));
}

// ================= SUBMIT =================
form.addEventListener('submit', async function(e) {
  e.preventDefault();

  if (!dataLoaded) {
    errorDiv.textContent = 'Data masih dimuat, coba lagi...';
    return;
  }

  const tahun = document.getElementById('tahun').value;
  const bulan = document.getElementById('bulan').value;
  const email = document.getElementById('email').value.trim().toLowerCase();
  const password = document.getElementById('password').value.trim();

  errorDiv.textContent = '';
  pesan.textContent = 'Loading...';
  viewer.innerHTML = '';
  viewerContainer.style.display = 'none';

  if (!tahun || !bulan || !email || !password) {
    errorDiv.textContent = 'Semua field wajib diisi!';
    return;
  }

  // Validasi email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errorDiv.textContent = 'Format email tidak valid!';
    return;
  }

  const pegawai = dataPegawai[email];

  if (!pegawai) {
    errorDiv.textContent = 'Email tidak ditemukan!';
    return;
  }

  const hashedInput = await hashPassword(password);

  if (pegawai.password !== hashedInput) {
    errorDiv.textContent = 'Password salah!';
    return;
  }

  const namaFile = pegawai.namaFile;
  currentFileName = namaFile + '.pdf';

  const baseUrl = 'https://cdn.jsdelivr.net/gh/madhagaskar182/testing@main/files/';
  const url = `${baseUrl}${tahun}/${bulan}/${namaFile}.pdf`;

  try {
    currentUrl = url;

    pdfDoc = await pdfjsLib.getDocument(url).promise;

    // Buat canvas per halaman
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const canvas = document.createElement('canvas');
      canvas.classList.add('pdf-page');
      canvas.dataset.page = i;
      viewer.appendChild(canvas);
    }

    setupLazyLoading();

    viewerContainer.style.display = 'block';
    pesan.textContent = `SLIP GAJI ${namaFile} BERHASIL DIMUAT`;

  } catch (err) {
    console.error(err);
    errorDiv.textContent = 'PDF tidak ditemukan / gagal dimuat!';
    pesan.textContent = '';
  }
});

// ================= DOWNLOAD =================
downloadBtn.addEventListener('click', async () => {
  if (!currentUrl) return alert('Tidak ada file');

  try {
    const res = await fetch(currentUrl);
    if (!res.ok) throw new Error();

    const blob = await res.blob();

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = currentFileName;
    link.click();
  } catch {
    alert('Gagal download file');
  }
});

// ================= DOM READY =================
document.addEventListener('DOMContentLoaded', () => {

  // AUTO TAHUN
  const tahun = new Date().getFullYear().toString();
  const select = document.getElementById('tahun');

  if (![...select.options].some(o => o.value === tahun)) {
    const opt = document.createElement('option');
    opt.value = tahun;
    opt.textContent = tahun;
    select.appendChild(opt);
  }

  select.value = tahun;

  // ================= PASSWORD TOGGLE =================
  document.querySelectorAll(".toggle-password").forEach(icon => {
    icon.addEventListener("click", function () {
      const target = this.getAttribute("data-toggle");
      const input = document.querySelector(target);

      if (!input) return;

      if (input.type === "password") {
        input.type = "text";
        this.classList.replace("fa-eye", "fa-eye-slash");
      } else {
        input.type = "password";
        this.classList.replace("fa-eye-slash", "fa-eye");
      }
    });
  });

});
