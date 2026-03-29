// ================= IMPORT MODUL =================
import { login, checkSession, logout, resetIdleTimer } from './login.js';
import { initToken, generateJSON, uploadJSON } from './jsonModule.js';
import { initPDF, uploadAll } from './pdfModule.js';

// ================= INISIALISASI =================
window.addEventListener("load", () => {
    checkSession();       // cek session saat load
    initToken();          // set token default di JSON
    initPDF();            // init PDF drag & drop
});

// ================= EVENT LISTENER =================
// Idle timer reset untuk semua aktivitas
document.addEventListener("mousemove", resetIdleTimer);
document.addEventListener("keydown", resetIdleTimer);
document.addEventListener("click", resetIdleTimer);
document.addEventListener("scroll", resetIdleTimer);

// Tombol login / logout
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
loginBtn.addEventListener("click", login);
logoutBtn.addEventListener("click", () => logout(false));

// Sidebar navigation
document.getElementById("menuDashboard").addEventListener("click", () => showPage("dashboard"));
document.getElementById("menuJSON").addEventListener("click", () => showPage("json"));
document.getElementById("menuUpload").addEventListener("click", () => showPage("upload"));

// Tombol JSON
document.getElementById("generateJSONBtn").addEventListener("click", generateJSON);
document.getElementById("uploadJSONBtn").addEventListener("click", uploadJSON);

// Tombol Upload PDF
document.getElementById("uploadPDFBtn").addEventListener("click", () => uploadAll(document.getElementById("tokenUpload").value));

// ================= NAVIGATION FUNCTION =================
let currentPage = "dashboard";
function showPage(page) {
    const pages = ["dashboardPage", "jsonPage", "uploadPage"];
    pages.forEach(p => document.getElementById(p).classList.add("hidden"));

    if (page === "dashboard") document.getElementById("dashboardPage").classList.remove("hidden");
    if (page === "json") document.getElementById("jsonPage").classList.remove("hidden");
    if (page === "upload") document.getElementById("uploadPage").classList.remove("hidden");

    currentPage = page;
}

// ================= TOAST FUNCTION =================
export function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = "toast show";
    if (type === "error") toast.classList.add("error");
    setTimeout(() => { toast.classList.remove("show"); }, 3000);
}
