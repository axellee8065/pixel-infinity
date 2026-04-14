// ============================================
// AUTH UI + CHAT — Uses window globals for C3 compatibility
// ============================================

let currentUser = null;

export function init() {
    const saved = localStorage.getItem("pi_auth");
    if (saved) try { currentUser = JSON.parse(saved); } catch (e) { currentUser = null; }
}

export function isLoggedIn() { return !!currentUser; }
export function getUsername() { return currentUser?.username || null; }
export function getToken() { return currentUser?.token || null; }

function saveSession(u, t) {
    currentUser = { username: u, token: t };
    localStorage.setItem("pi_auth", JSON.stringify(currentUser));
}

export function logout() { currentUser = null; localStorage.removeItem("pi_auth"); }

// ============================================
// AUTH PAGE — onclick via window globals (C3-proof)
// ============================================
let authCallback = null;

export function showAuthPage(onComplete) {
    if (isLoggedIn()) { onComplete(currentUser.username); return; }
    authCallback = onComplete;

    // Expose handlers on window (inline onclick always fires)
    window._piAuthLogin = doLogin;
    window._piAuthReg = doRegister;
    window._piAuthGuest = doGuest;

    const div = document.createElement("div");
    div.id = "pi-auth";
    div.innerHTML = `
    <style>
        #pi-auth { position:fixed;top:0;left:0;width:100%;height:100%;
            background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);
            z-index:999999;display:flex;align-items:center;justify-content:center;
            font-family:-apple-system,'Segoe UI',Roboto,sans-serif; }
        .ab { background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);
            border-radius:20px;padding:40px 30px;width:88vw;max-width:340px;text-align:center; }
        .ab h1 { color:#f1c40f;margin:0 0 6px;font-size:28px; }
        .ab .sub { color:#888;font-size:13px;margin-bottom:22px; }
        .ab .err { background:rgba(231,76,60,0.15);border:1px solid rgba(231,76,60,0.5);
            color:#e74c3c;padding:8px 12px;border-radius:8px;font-size:13px;
            margin-bottom:12px;display:none; }
        .ab input { display:block;width:100%;box-sizing:border-box;padding:14px 16px;
            margin-bottom:12px;border-radius:12px;border:1px solid rgba(255,255,255,0.2);
            background:rgba(255,255,255,0.08);color:#fff;font-size:16px;outline:none; }
        .ab input:focus { border-color:#3498db; }
        .ab input::placeholder { color:#666; }
        .abtns { display:flex;gap:10px;margin:18px 0 14px; }
        .abtns button { flex:1;padding:14px;border:none;border-radius:12px;font-size:16px;
            font-weight:bold;cursor:pointer; }
        .bl { background:#3498db;color:#fff; }
        .br { background:#2ecc71;color:#fff; }
        .bg { display:block;width:100%;padding:12px;margin-top:4px;border:1px solid rgba(255,255,255,0.2);
            border-radius:12px;background:transparent;color:#aaa;cursor:pointer;font-size:14px; }
    </style>
    <div class="ab">
        <h1>⚔️ Pixel Infinity</h1>
        <div class="sub">Sign in to play online</div>
        <div class="err" id="pi-auth-err"></div>
        <input id="pi-auth-name" type="text" placeholder="Username (2-16 chars)" maxlength="16">
        <input id="pi-auth-pass" type="password" placeholder="Password (4+ chars)" maxlength="32"
            onkeydown="if(event.key==='Enter')window._piAuthLogin()">
        <div class="abtns">
            <button class="bl" onclick="window._piAuthLogin()">Login</button>
            <button class="br" onclick="window._piAuthReg()">Register</button>
        </div>
        <button class="bg" onclick="window._piAuthGuest()">Play as Guest</button>
    </div>`;
    document.body.appendChild(div);
    setTimeout(() => document.getElementById("pi-auth-name")?.focus(), 200);
}

function showErr(msg) {
    const el = document.getElementById("pi-auth-err");
    if (el) { el.textContent = msg; el.style.display = "block"; }
}

function closeAuth(username, token) {
    saveSession(username, token || "guest");
    const el = document.getElementById("pi-auth");
    if (el) el.remove();
    delete window._piAuthLogin;
    delete window._piAuthReg;
    delete window._piAuthGuest;
    if (authCallback) authCallback(username);
}

async function doLogin() {
    const name = document.getElementById("pi-auth-name")?.value?.trim();
    const pass = document.getElementById("pi-auth-pass")?.value;
    if (!name || !pass) { showErr("Please fill in all fields"); return; }

    try {
        const res = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: name, password: pass })
        });
        const data = await res.json();
        if (!res.ok) { showErr(data.error || "Login failed"); return; }
        closeAuth(data.username, data.token);
    } catch (e) {
        showErr("Connection failed");
        console.error("[Auth]", e);
    }
}

async function doRegister() {
    const name = document.getElementById("pi-auth-name")?.value?.trim();
    const pass = document.getElementById("pi-auth-pass")?.value;
    if (!name || !pass) { showErr("Please fill in all fields"); return; }
    if (name.length < 2) { showErr("Username: 2+ characters"); return; }
    if (pass.length < 4) { showErr("Password: 4+ characters"); return; }

    try {
        const res = await fetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: name, password: pass })
        });
        const data = await res.json();
        if (!res.ok) { showErr(data.error || "Registration failed"); return; }
        closeAuth(data.username, data.token);
    } catch (e) {
        showErr("Connection failed");
        console.error("[Auth]", e);
    }
}

function doGuest() {
    const name = "Guest_" + Math.random().toString(36).substr(2, 5);
    closeAuth(name, "guest_" + name);
}

// ============================================
// CHAT (left side)
// ============================================
let chatEl = null;

export function showChat() {
    if (chatEl) return;

    // Expose send handler
    window._piChatSend = sendChat;

    chatEl = document.createElement("div");
    chatEl.id = "pi-chat";
    chatEl.innerHTML = `
    <style>
        #pi-chat { position:fixed;top:10px;left:10px;width:230px;height:330px;
            background:rgba(0,0,0,0.8);border:1px solid rgba(255,255,255,0.15);
            border-radius:12px;display:flex;flex-direction:column;z-index:99998;
            font-family:sans-serif;overflow:hidden; }
        .chh { color:#f1c40f;font-size:13px;font-weight:bold;padding:8px 12px;
            border-bottom:1px solid rgba(255,255,255,0.1); }
        .chm { flex:1;overflow-y:auto;padding:6px 10px;font-size:12px;color:#ccc; }
        .chm div { margin-bottom:4px;word-break:break-word;line-height:1.4; }
        .chm b { color:#f1c40f; }
        .chm .me b { color:#3498db; }
        .chm .t { color:#555;font-size:10px; }
        .chr { display:flex;padding:6px;gap:4px;border-top:1px solid rgba(255,255,255,0.1); }
        .chi { flex:1;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);
            border-radius:6px;padding:7px 8px;color:#fff;font-size:12px;outline:none; }
        .chi:focus { border-color:#3498db; }
        .chs { background:#3498db;color:#fff;border:none;border-radius:6px;
            padding:7px 12px;font-size:12px;cursor:pointer;font-weight:bold; }
    </style>
    <div class="chh">💬 Chat</div>
    <div class="chm" id="pi-chat-msgs"></div>
    <div class="chr">
        <input class="chi" id="pi-chat-input" type="text" placeholder="Type message..." maxlength="200"
            onkeydown="if(event.key==='Enter'){event.stopPropagation();window._piChatSend()}">
        <button class="chs" onclick="window._piChatSend()">Send</button>
    </div>`;
    document.body.appendChild(chatEl);

    // Listen for chat events
    setupChatSocket();
}

function sendChat() {
    const input = document.getElementById("pi-chat-input");
    if (!input) return;
    const msg = input.value.trim();
    if (!msg) return;
    const sock = globalThis.NetworkManager?._getSocket?.();
    if (sock) sock.emit("chat_message", { username: getUsername() || "Guest", message: msg });
    input.value = "";
}

function setupChatSocket() {
    const sock = globalThis.NetworkManager?._getSocket?.();
    if (!sock) { setTimeout(setupChatSocket, 1000); return; }

    sock.off("chat_message");
    sock.off("chat_history");
    sock.on("chat_message", (m) => addChatMsg(m.username, m.message, m.timestamp));
    sock.on("chat_history", (h) => {
        const c = document.getElementById("pi-chat-msgs");
        if (c) c.innerHTML = "";
        for (const m of h) addChatMsg(m.username, m.message, m.timestamp);
    });
    sock.emit("chat_history");
}

function addChatMsg(user, msg, ts) {
    const c = document.getElementById("pi-chat-msgs");
    if (!c) return;
    const isMe = user === getUsername();
    const d = new Date(ts);
    const time = d.getHours().toString().padStart(2,"0") + ":" + d.getMinutes().toString().padStart(2,"0");
    const div = document.createElement("div");
    div.className = isMe ? "me" : "";
    div.innerHTML = `<span class="t">${time}</span> <b>${esc(user)}</b>: ${esc(msg)}`;
    c.appendChild(div);
    c.scrollTop = c.scrollHeight;
    while (c.children.length > 100) c.removeChild(c.firstChild);
}

function esc(s) { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

export function hideChat() {
    if (chatEl) { chatEl.remove(); chatEl = null; }
    delete window._piChatSend;
}

console.log("[AuthUI] Module loaded!");
