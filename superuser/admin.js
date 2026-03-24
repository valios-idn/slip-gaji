// ==================== ADMIN PANEL JS ====================

let adminData = null;

// ==================== INIT ====================
document.addEventListener("DOMContentLoaded", () => {
    // Reset tampilan awal
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('loginPage').classList.remove('hidden');

    // Load data admin & cek status login
    loadAdmin();

    // Event Listener Login Form
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        login();
    });
});

// ==================== LOAD ADMIN DATA ====================
async function loadAdmin() {
    try {
        const res = await fetch('admin.json');
        if (!res.ok) throw new Error('File admin.json tidak ditemukan');

        adminData = await res.json();

        // Cek apakah sudah login sebelumnya
        if (localStorage.getItem('isLoggedIn') === 'true') {
            showDashboard();
        }
    } catch (err) {
        console.error('Error loading admin data:', err);
        alert('Gagal memuat data admin.\nPastikan file "admin.json" ada di folder yang sama.');
    }
}

// ==================== HASH PASSWORD (SHA-256) ====================
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ==================== LOGIN ====================
async function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorEl = document.getElementById('loginError');

    errorEl.textContent = '';

    if (!adminData) {
        errorEl.textContent = 'Data admin belum siap. Silakan refresh halaman.';
        return;
    }

    if (!username || !password) {
        errorEl.textContent = 'Username dan password harus diisi!';
        return;
    }

    const hashedInput = await hashPassword(password);

    if (username === adminData.username && hashedInput === adminData.password) {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('adminUsername', username);
        showDashboard();
    } else {
        errorEl.textContent = '❌ Username atau password salah!';
    }
}

// ==================== SHOW / HIDE ====================
function showDashboard() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
}

// ==================== LOGOUT ====================
function logout() {
    if (confirm('Yakin ingin logout?')) {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('adminUsername');
        location.reload();
    }
}

// ==================== TABLE FUNCTIONS ====================
function tambahBaris() {
    const tbody = document.querySelector('#table tbody');
    const tr = document.createElement('tr');
    
    tr.innerHTML = `
        <td><input type="text" placeholder="NIP" maxlength="18"></td>
        <td><input type="text" placeholder="Nama File"></td>
        <td><input type="text" placeholder="Password"></td>
        <td><button class="btn-danger" onclick="hapusBaris(this)">❌</button></td>
    `;
    
    tbody.appendChild(tr);
}

function hapusBaris(btn) {
    if (confirm('Hapus baris ini?')) {
        btn.closest('tr').remove();
    }
}

// ==================== GENERATE JSON ====================
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
            alert(`NIP harus 18 digit angka!\nSalah: ${nip}`);
            return;
        }

        const hashed = await hashPassword(password);

        data[nip] = {
            namaFile: namaFile,
            password: hashed
        };
    }

    if (Object.keys(data).length === 0) {
        alert('Tambahkan minimal 1 data pegawai sebelum generate!');
        return;
    }

    document.getElementById('output').textContent = JSON.stringify(data, null, 2);
}

// ==================== COPY JSON ====================
function copyJSON() {
    const outputEl = document.getElementById('output');
    const text = outputEl.textContent.trim();

    if (!text || text === '{}') {
        alert('Belum ada data JSON yang di-generate!');
        return;
    }

    navigator.clipboard.writeText(text)
        .then(() => alert('✅ JSON berhasil disalin ke clipboard!'))
        .catch(() => alert('Gagal menyalin. Silakan copy manual dari kotak di bawah.'));
}
