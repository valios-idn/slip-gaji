// ================= GLOBAL =================
let adminData = null;

// ================= LOAD ADMIN JSON =================
async function loadAdmin() {
  try {
    const res = await fetch('admin.json');
    adminData = await res.json();
  } catch (err) {
    alert('Gagal load admin.json');
  }
}
loadAdmin();

// ================= HASH =================
async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

// ================= LOGIN =================
async function login() {
  const user = document.getElementById('username').value;
  const pass = document.getElementById('password').value;

  if (!adminData) {
    alert('Data admin belum siap');
    return;
  }

  const hashed = await hashPassword(pass);

  if (user === adminData.username && hashed === adminData.password) {
    localStorage.setItem('login', 'true');
    showDashboard();
  } else {
    document.getElementById('loginError').textContent = 'Login gagal!';
  }
}

// ================= DASHBOARD =================
function showDashboard() {
  document.getElementById('loginPage').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
}

// ================= LOGOUT =================
function logout() {
  localStorage.removeItem('login');
  location.reload();
}

// ================= AUTO LOGIN =================
if (localStorage.getItem('login') === 'true') {
  showDashboard();
}

// ================= TABLE =================
function tambahBaris() {
  const tbody = document.querySelector('#table tbody');
  const tr = document.createElement('tr');

  tr.innerHTML = `
    <td><input type="text"></td>
    <td><input type="text"></td>
    <td><input type="text"></td>
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
  navigator.clipboard.writeText(text);
  alert('JSON disalin!');
}
