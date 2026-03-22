const form = document.getElementById('pdfForm');
const pesan = document.getElementById('pesan');
const errorDiv = document.getElementById('error');
const canvas = document.getElementById('pdfCanvas');
const ctx = canvas.getContext('2d');
const viewer = document.getElementById('viewerContainer');

const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const downloadBtn = document.getElementById('downloadBtn');
const pageInfo = document.getElementById('pageInfo');

let pdfDoc = null;
let currentPage = 1;
let currentUrl = '';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

async function renderPage(num) {
  const page = await pdfDoc.getPage(num);
  const viewport = page.getViewport({ scale: 1.5 });

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({
    canvasContext: ctx,
    viewport: viewport
  }).promise;

  pageInfo.textContent = `Halaman ${num} dari ${pdfDoc.numPages}`;
}

form.addEventListener('submit', async function(e) {
  e.preventDefault();

  const tahun = document.getElementById('tahun').value;
  const bulan = document.getElementById('bulan').value;
  const nama = document.getElementById('nama').value
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '');

  errorDiv.textContent = '';
  pesan.textContent = '';
  viewer.style.display = 'none';

  if (!tahun || !bulan || !nama) {
    errorDiv.textContent = 'Harap isi semua kolom!';
    return;
  }

  const baseUrl = 'https://raw.githubusercontent.com/madhagaskar182/testing/main/files/';
  const url = `${baseUrl}${tahun}/${bulan}/${nama}.pdf`;

  pesan.textContent = 'Memuat PDF...';

  try {
    const check = await fetch(url, { method: 'HEAD' });
    if (!check.ok) throw new Error('File tidak ditemukan');

    currentUrl = url;

    pdfDoc = await pdfjsLib.getDocument(url).promise;
    currentPage = 1;

    await renderPage(currentPage);

    viewer.style.display = 'block';
    pesan.textContent = '';

  } catch (err) {
    errorDiv.textContent = err.message;
  }
});

prevBtn.onclick = () => {
  if (currentPage <= 1) return;
  currentPage--;
  renderPage(currentPage);
};

nextBtn.onclick = () => {
  if (currentPage >= pdfDoc.numPages) return;
  currentPage++;
  renderPage(currentPage);
};

downloadBtn.onclick = () => {
  if (!currentUrl) return;

  const link = document.createElement('a');
  link.href = currentUrl;
  link.download = '';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
