let adminData = null;

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('loginPage').classList.remove('hidden');

  loadAdmin();

  document.getElementById('loginForm')
    .addEventListener('submit', (e) => {
      e.preventDefault();
      login();
    });
});

// ================= LOAD ADMIN =================
async function loadAdmin() {
  try {
    const res = await fetch('admin.json');

    if (!res.ok) throw new Error('admin.json tidak ditemukan');

    adminData = await res.json();

    // cek login
    if (localStorage.getItem('login') === 'true') {
      showDashboard();
    }

  } catch (err) {
    console.error(err);
    alert('Gagal load data admin!');
  }
}

// ================= HASH =================
async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

// ================= LOGIN =================
async function login() {
  const user = document.getElementById('username').value.trim();
  const pass = document.getElementById('password').value.trim();
  const errorEl = document.getElementById('loginError');

  errorEl.textContent = '';

  if (!adminData) {
    errorEl.textContent = 'Data admin belum siap!';
    return;
  }

  const hashed = await hashPassword(pass);

  if (user === adminData.username && hashed === adminData.password) {
    localStorage.setItem('login', 'true');
    showDashboard();
  } else {
    errorEl.textContent = 'Username atau password salah!';
  }
}

// ================= SHOW DASHBOARD =================
function showDashboard() {
  document.getElementById('loginPage').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
}

// ================= LOGOUT =================
function logout() {
  localStorage.removeItem('login');
  location.reload();
}

// ================= TABLE =================
function tambahBaris() {
  const tbody = document.querySelector('#table tbody');
  const tr = document.createElement('tr');

  tr.innerHTML = `
    <td><input type="text" placeholder="NIP"></td>
    <td><input type="text" placeholder="Nama File"></td>
    <td><input type="text" placeholder="Password"></td>
    <td><button class="btn-danger" onclick="hapusBaris(this)">❌</button></td>
  `;

  tbody.appendChild(tr);
}

function hapusBaris(btn) {
  btn.closest('tr').remove();
}

// ================= GENERATE JSON =================
async function generateJSON() {
  const rows = document.querySelectorAll('#table tbody tr');
  const data = {};

  for (const row of rows) {
    const inputs = row.querySelectorAll('input');

    const nip = inputs[0].value.trim();
    const namaFile = inputs[1].value.trim();
    const password = inputs[2].value.trim();

    if (!nip || !namaFile || !password) continue;

    if (!/^\d{18}$/.test(nip)) {
      alert("NIP harus 18 digit: " + nip);
      return;
    }

    const hashed = await hashPassword(password);

    data[nip] = {
      namaFile: namaFile,
      password: hashed
    };
  }

  document.getElementById('output').textContent =
    JSON.stringify(data, null, 2);
}

// ================= COPY =================
function copyJSON() {
  const text = document.getElementById('output').textContent;

  if (!text) {
    alert('Belum ada data!');
    return;
  }

  navigator.clipboard.writeText(text);
  alert('JSON berhasil disalin!');
}
