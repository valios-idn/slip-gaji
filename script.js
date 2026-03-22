const form = document.getElementById('pdfForm');
const viewer = document.getElementById('viewerContainer');
const pesan = document.getElementById('pesan');
const errorDiv = document.getElementById('error');
const downloadBtn = document.getElementById('downloadBtn');

let currentUrl = '';
let dataPegawai = {};

// 🔥 Load JSON saat pertama kali
async function loadData() {
  try {
    const res = await fetch('pegawai.json');
    dataPegawai = await res.json();
  } catch (err) {
    console.error('Gagal load JSON:', err);
  }
}

// panggil saat awal
loadData();

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

form.addEventListener('submit', async function(e) {
  e.preventDefault();

  const tahun = document.getElementById('tahun').value;
  const bulan = document.getElementById('bulan').value;
  const nip = document.getElementById('nip').value.trim();

  errorDiv.textContent = '';
  pesan.textContent = '';
  viewer.innerHTML = '';
  viewer.style.display = 'none';

  if (!tahun || !bulan || !nip) {
    errorDiv.textContent = 'Harap isi semua kolom!';
    return;
  }

  // 🔥 CEK NIP
  if (!dataPegawai[nip]) {
    errorDiv.textContent = 'Nomor pegawai tidak terdaftar!';
    return;
  }

  const namaFile = dataPegawai[nip];

  const baseUrl = 'https://raw.githubusercontent.com/madhagaskar182/testing/main/files/';
  const url = `${baseUrl}${tahun}/${bulan}/${namaFile}.pdf`;

  pesan.textContent = 'Memuat slip gaji...';

  try {
    const check = await fetch(url, { method: 'HEAD' });
    if (!check.ok) throw new Error('File tidak ditemukan');

    currentUrl = url;

    const pdf = await pdfjsLib.getDocument(url).promise;

    // SCROLL SEMUA HALAMAN
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);

      const viewport = page.getViewport({ scale: 1.4 });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      viewer.appendChild(canvas);

      await page.render({
        canvasContext: ctx,
        viewport: viewport
      }).promise;
    }

    viewer.style.display = 'block';
    pesan.textContent = 'Slip gaji berhasil ditampilkan';

  } catch (err) {
    errorDiv.textContent = err.message;
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const tahunSekarang = new Date().getFullYear();
  document.getElementById('tahun').value = tahunSekarang;
});

// DOWNLOAD
downloadBtn.onclick = () => {
  if (!currentUrl) return;

  const link = document.createElement('a');
  link.href = currentUrl;
  link.download = '';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
