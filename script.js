document.getElementById('form').addEventListener('submit', function(e) {
  e.preventDefault();

  const nomor = document.getElementById('nomor').value.trim();
  const bulan = document.getElementById('bulan').value;
  const tahun = document.getElementById('tahun').value;
  const status = document.getElementById('status');

  if (!nomor || !bulan || !tahun) {
    status.innerHTML = '<span class="text-red-400">Lengkapi semua kolom</span>';
    return;
  }

  status.innerHTML = '<span class="text-gray-300">Mencari slip gaji...</span>';

  // Format nomor pegawai (sesuaikan jika perlu leading zero atau tidak)
  const nomorFormatted = nomor;   // misal 1234 → 001234
  // const nomorFormatted = nomor;                    // tanpa padding, pakai ini jika nomor sudah fix

  const namaBulan = {
    '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April',
    '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus',
    '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember'
  };

  const folderBulan = `${bulan}_${namaBulan[bulan]}`;

  // ID folder utama Slip Gaji
  const folderUtamaId = '1J45q2IQ_ZL8mpfTtn0URJXuoNyyH5sK7';

  // Buat URL Google Drive dengan search di dalam folder tahun
  // Pola: buka folder tahun, lalu cari file dengan nama tertentu di subfolder bulan
  const searchQuery = encodeURIComponent(`${nomorFormatted}.pdf`);  // atau .xlsx, sesuaikan ekstensi

  const url = `https://drive.google.com/drive/folders/${folderUtamaId}?usp=sharing#folders/${tahun}/${folderBulan}?search=${searchQuery}`;

  // Alternatif lebih langsung (jika file di-allow direct view):
  // const url = `https://drive.google.com/drive/search?q=${encodeURIComponent(`from:${folderUtamaId} ${tahun} ${folderBulan} ${nomorFormatted}`)}`;

  status.innerHTML = '<span class="text-green-400">Mengarahkan ke file...</span>';

  setTimeout(() => {
    window.location.href = url;
  }, 1200);
});
