document.getElementById('form').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const input = document.getElementById('username');
  const username = input.value.trim().toLowerCase();
  const message = document.getElementById('message');

  if (!username) return;

  try {
    const res = await fetch('data.json');
    const data = await res.json();

    const link = data[username];

    if (link) {
      message.innerHTML = `✅ Ditemukan! Mengarahkan ke Google Drive...`;
      message.className = "mt-6 text-center text-green-400";
      
      // Redirect setelah 800ms biar user lihat pesan
      setTimeout(() => {
        window.location.href = link;
      }, 800);
    } else {
      message.innerHTML = `❌ Username "${username}" tidak ditemukan`;
      message.className = "mt-6 text-center text-red-400";
    }
  } catch (err) {
    message.innerHTML = "⚠️ Terjadi kesalahan saat membaca data";
    message.className = "mt-6 text-center text-red-400";
  }
});