// login.js
const ADMIN_HASH = "eb8dd3569264665279b7715826fcf2a291b074137704e18d06574f321fd91a58";
const SESSION_DURATION = 60 * 60 * 1000; // 60 menit

let sessionTimeout;

let loginPage, app, adminPass;

function initElements() {
    loginPage = document.getElementById("loginPage");
    app = document.getElementById("app");
    adminPass = document.getElementById("adminPass");
}

// ================= HASH PASSWORD =================
export async function hashPass(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

// ================= LOGIN =================
export async function login() {
    if (!adminPass) initElements();
    if (!adminPass.value) {
        alert("⚠️ Masukkan password!");
        return;
    }

    const hash = await hashPass(adminPass.value);
    if (hash === ADMIN_HASH) {
        const sessionData = {
            loggedIn: true,
            expiresAt: Date.now() + SESSION_DURATION
        };
        localStorage.setItem("adminSession", JSON.stringify(sessionData));

        loginPage.classList.add("hidden");
        app.classList.remove("hidden");
        adminPass.value = "";

        startIdleTimer();
    } else {
        alert("❌ Password salah!");
        adminPass.value = "";
    }
}

// ================= SESSION =================
export function checkSession() {
    if (!loginPage || !app) initElements();

    const session = localStorage.getItem("adminSession");
    if (session) {
        const { expiresAt } = JSON.parse(session);
        if (Date.now() < expiresAt) {
            loginPage.classList.add("hidden");
            app.classList.remove("hidden");
            startIdleTimer();
        } else {
            logout(true);
        }
    }
}

// ================= IDLE TIMER =================
export function startIdleTimer() {
    if (sessionTimeout) clearTimeout(sessionTimeout);
    sessionTimeout = setTimeout(() => {
        logout(true);
    }, SESSION_DURATION);
}

export function resetIdleTimer() {
    if (sessionTimeout) startIdleTimer();
}

// ================= LOGOUT =================
export function logout(isIdle = false) {
    if (!loginPage || !app) initElements();

    localStorage.removeItem("adminSession");
    if (sessionTimeout) clearTimeout(sessionTimeout);

    loginPage.classList.remove("hidden");
    app.classList.add("hidden");
    if (adminPass) adminPass.value = "";

    if (isIdle) {
        alert("⏰ Session telah berakhir karena tidak ada aktivitas selama 1 jam.");
    } else {
        alert("Anda telah keluar.");
    }
}
