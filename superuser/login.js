const ADMIN_HASH = "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9"; // admin123
const SESSION_DURATION = 60 * 60 * 1000;

let timeout;

function el(id){ return document.getElementById(id); }

export async function hashPass(password){
    const enc = new TextEncoder().encode(password);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf))
        .map(b=>b.toString(16).padStart(2,"0")).join("");
}

export async function login(){
    const pass = el("adminPass").value;
    if(!pass) return alert("Isi password!");

    const hash = await hashPass(pass);

    if(hash === ADMIN_HASH){
        localStorage.setItem("session", Date.now()+SESSION_DURATION);
        el("loginPage").classList.add("hidden");
        el("app").classList.remove("hidden");
        startTimer();
    } else alert("Password salah!");
}

export function checkSession(){
    const loginPage = document.getElementById("loginPage");
    const app = document.getElementById("app");

    const s = localStorage.getItem("session");

    if(s && Date.now() < s){
        loginPage.classList.add("hidden");
        app.classList.remove("hidden");
        startTimer();
    } else {
        // 🔥 INI YANG KURANG
        loginPage.classList.remove("hidden");
        app.classList.add("hidden");
    }
}

function startTimer(){
    clearTimeout(timeout);
    timeout = setTimeout(logout, SESSION_DURATION);
}

export function resetIdleTimer(){ startTimer(); }

export function logout(){
    localStorage.removeItem("session");
    el("loginPage").classList.remove("hidden");
    el("app").classList.add("hidden");
}
