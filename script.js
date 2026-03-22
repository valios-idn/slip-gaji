const form = document.getElementById('pdfForm');
const pesan = document.getElementById('pesan');
const errorDiv = document.getElementById('error');
const viewerContainer = document.getElementById('viewerContainer');
const canvas = document.getElementById('pdfCanvas');
const ctx = canvas.getContext('2d');

let pdfUrl = '';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

form.addEventListener('submit', async function(e) {
  e.preventDefault();

  const tahun = document.getElementById('tahun').value;
  const bulan = document.getElementById('bulan').value;
  const nama = document.getElementById('nama').value
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '');

  errorDiv.textContent = '';
  pesan.textContent = '';
  viewerContainer.style.display = 'none';

  if (!tahun || !bulan || !nama) {
    errorDiv.textContent = 'Harap isi semua kolom!';
    return;
  }

  const baseUrl = 'https://cdn.jsdelivr.net/gh/madhagaskar182/testing@main/files/';
  pdfUrl = `${baseUrl}${tahun}/${bulan}/${nama}.pdf`;

  pesan.textContent = 'Memuat PDF...';

  try {
    const response = await fetch(pdfUrl, { method: 'HEAD' });
    if (!response.ok) throw new Error('File tidak ditemukan');

    const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 1.5 });
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: ctx,
      viewport: viewport
    }).promise;

    viewerContainer.style.display = 'block';
    pesan.textContent = 'PDF berhasil ditampilkan';

  } catch (err) {
    errorDiv.textContent = err.message || 'Gagal memuat PDF';
    pesan.textContent = '';
  }
});

// ✅ DOWNLOAD FIX (pakai blob)
document.getElementById('downloadBtn').addEventListener('click', async () => {
  if (!pdfUrl) return;

  try {
    const response = await fetch(pdfUrl);
    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = 'slip-gaji.pdf';
    document.body.appendChild(a);
    a.click();

    a.remove();
    window.URL.revokeObjectURL(url);

  } catch (err) {
    alert('Gagal download file');
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const tahunSekarang = new Date().getFullYear();
  document.getElementById('tahun').value = tahunSekarang;
});
