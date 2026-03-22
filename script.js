const form = document.getElementById('pdfForm');
const viewer = document.getElementById('pdfViewer');
const viewerContainer = document.getElementById('viewerContainer');
const pesan = document.getElementById('pesan');
const errorDiv = document.getElementById('error');
const downloadBtn = document.getElementById('downloadBtn');

let currentUrl = '';
let currentFileName = '';
let dataPegawai = {};

// load JSON
async function loadData() {
  try {
    const res = await fetch('pegawai.json');
    dataPegawai = await res.json();
    console.log('Data pegawai loaded:', dataPegawai);
  } catch (err) {
    console.error('Gagal load JSON:', err);
  }
}
loadData();

// worker
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// SUBMIT
form.addEventListener('submit', async function(e) {
  e.preventDefault();

  const tahun = document.getElementById('tahun').value;
  const bulan = document.getElementById('bulan').value;
  const nip = document.getElementById('nip').value.trim();

  errorDiv.textContent = '';
  pesan.textContent = '';
  viewerContainer.style.display = 'none';

  // hapus canvas lama
  viewer.innerHTML = '';

  if (!tahun || !bulan || !nip) {
    errorDiv.textContent = 'Harap isi semua kolom!';
    return;
  }

  if (!dataPegawai[nip]) {
    errorDiv.textContent = 'Nomor pegawai tidak terdaftar!';
    return;
  }

  const namaFile = dataPegawai[nip];
  currentFileName = namaFile + '.pdf';

  const baseUrl = 'https://cdn.jsdelivr.net/gh/madhagaskar182/testing@main/files/';
  const url = `${baseUrl}${tahun}/${bulan}/${namaFile}.pdf`;

  console.log('URL PDF:', url);

  pesan.textContent = 'Memuat slip gaji...';

  try {
    // langsung load (tanpa HEAD biar tidak gagal)
    currentUrl = url;

    const pdf = await pdfjsLib.getDocument(url).promise;

    console.log('Jumlah halaman:', pdf.numPages);

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
    pesan.textContent = 'Slip gaji berhasil ditampilkan';

  } catch (err) {
    console.error(err);
    errorDiv.textContent = 'Gagal memuat PDF (cek file / path)';
    pesan.textContent = '';
  }
});

// DOWNLOAD
downloadBtn.onclick = async () => {
  if (!currentUrl) return;

  try {
    const response = await fetch(currentUrl);
    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = currentFileName;

    document.body.appendChild(a);
    a.click();

    a.remove();
    window.URL.revokeObjectURL(url);

  } catch {
    alert('Gagal download file');
  }
};

// default tahun
document.addEventListener('DOMContentLoaded', () => {
  const tahun = new Date().getFullYear().toString();
  const select = document.getElementById('tahun');

  if (![...select.options].some(o => o.value === tahun)) {
    const opt = document.createElement('option');
    opt.value = tahun;
    opt.textContent = tahun;
    select.appendChild(opt);
  }

  select.value = tahun;
});
