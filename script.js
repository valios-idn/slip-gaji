const form = document.getElementById('pdfForm');
const viewer = document.getElementById('pdfViewer');
const viewerContainer = document.getElementById('viewerContainer');
const pesan = document.getElementById('pesan');
const errorDiv = document.getElementById('error');
const downloadBtn = document.getElementById('downloadBtn');

let currentUrl = '';
let currentFileName = '';
let dataPegawai = {};

// Load JSON pegawai
async function loadData() {
  try {
    const res = await fetch('dataPegawai.json'); // ✅ FIX NAMA FILE
    if (!res.ok) throw new Error('Gagal load JSON');

    dataPegawai = await res.json();
    console.log('Data pegawai loaded:', dataPegawai);
  } catch (err) {
    console.error(err);
    errorDiv.textContent = 'Gagal memuat data pegawai!';
  }
}
loadData();

// Setup PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Submit form
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

  // Validasi
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

  // Ambil file
  const namaFile = pegawai.namaFile;
  currentFileName = namaFile + '.pdf';

  const baseUrl = 'https://cdn.jsdelivr.net/gh/madhagaskar182/testing@main/files/';
  const url = `${baseUrl}${tahun}/${bulan}/${namaFile}.pdf`;

  pesan.textContent = 'Memuat PDF...';

  try {
    currentUrl = url;

    const pdf = await pdfjsLib.getDocument(url).promise;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.3 });

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

    viewerContainer.style.display = 'block';
    pesan.textContent = `Slip Gaji ${namaFile} Berhasil Dimuat`;
  } catch (err) {
    console.error(err);
    errorDiv.textContent = 'PDF tidak ditemukan / gagal dimuat!';
  }
});

// Download
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

// Tahun otomatis
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
