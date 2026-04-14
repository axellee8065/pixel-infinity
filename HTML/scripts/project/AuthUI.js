// ============================================
// AUTH UI + CHAT - English-only, C3-safe
// ============================================

let currentUser = null;

export function init() {
    const saved = localStorage.getItem("pi_auth");
    if (saved) {
        try { currentUser = JSON.parse(saved); } catch (e) { currentUser = null; }
    }
}

export function isLoggedIn() { return !!currentUser; }
export function getUsername() { return currentUser?.username || null; }
export function getToken() { return currentUser?.token || null; }

function saveSession(u, t) {
    currentUser = { username: u, token: t };
    localStorage.setItem("pi_auth", JSON.stringify(currentUser));
}

export function logout() {
    currentUser = null;
    localStorage.removeItem("pi_auth");
}

// ============================================
// AUTH PAGE
// ============================================
export function showAuthPage(onComplete) {
    if (isLoggedIn()) { onComplete(currentUser.username); return; }

    // Create full-screen overlay that blocks EVERYTHING
    const overlay = document.createElement("div");
    overlay.id = "auth-overlay";
    // Stop all events from reaching C3 canvas
    overlay.addEventListener("pointerdown", e => e.stopPropagation(), true);
    overlay.addEventListener("pointerup", e => e.stopPropagation(), true);
    overlay.addEventListener("pointermove", e => e.stopPropagation(), true);
    overlay.addEventListener("touchstart", e => e.stopPropagation(), true);
    overlay.addEventListener("touchend", e => e.stopPropagation(), true);
    overlay.addEventListener("mousedown", e => e.stopPropagation(), true);
    overlay.addEventListener("click", e => e.stopPropagation(), true);

    overlay.innerHTML = `
    <style>
        #auth-overlay {
            position:fixed; top:0; left:0; width:100%; height:100%;
            background:linear-gradient(135deg, #0f0c29, #302b63, #24243e);
            z-index:999999; display:flex; align-items:center; justify-content:center;
            font-family: -apple-system, 'Segoe UI', Roboto, sans-serif;
            touch-action:auto !important; pointer-events:all !important;
        }
        #auth-box {
            background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.15);
            border-radius:20px; padding:40px 30px; width:88vw; max-width:360px;
            text-align:center; backdrop-filter:blur(12px);
        }
        #auth-box h1 { color:#f1c40f; margin:0 0 6px; font-size:28px; }
        #auth-box .sub { color:#888; font-size:13px; margin-bottom:22px; }
        #auth-box .err {
            background:rgba(231,76,60,0.15); border:1px solid rgba(231,76,60,0.5);
            color:#e74c3c; padding:8px 12px; border-radius:8px; font-size:13px;
            margin-bottom:12px; display:none;
        }
        #auth-box input {
            display:block; width:100%; box-sizing:border-box; padding:14px 16px;
            margin-bottom:12px; border-radius:12px; border:1px solid rgba(255,255,255,0.2);
            background:rgba(255,255,255,0.08); color:#fff; font-size:16px; outline:none;
            -webkit-appearance:none; touch-action:auto !important;
        }
        #auth-box input:focus { border-color:#3498db; background:rgba(255,255,255,0.12); }
        #auth-box input::placeholder { color:#666; }
        .auth-btns { display:flex; gap:10px; margin:18px 0 14px; }
        .auth-btns button {
            flex:1; padding:14px; border:none; border-radius:12px;
            font-size:16px; font-weight:bold; cursor:pointer;
            touch-action:manipulation; -webkit-tap-highlight-color:transparent;
        }
        .auth-btns button:active { opacity:0.8; transform:scale(0.97); }
        .btn-login { background:#3498db; color:#fff; }
        .btn-register { background:#2ecc71; color:#fff; }
        .btn-guest {
            display:block; width:100%; padding:12px; margin-top:4px;
            border:1px solid rgba(255,255,255,0.2); border-radius:12px;
            background:transparent; color:#aaa; cursor:pointer; font-size:14px;
            touch-action:manipulation;
        }
        .btn-guest:hover { color:#fff; border-color:rgba(255,255,255,0.4); }
        .loading { opacity:0.5; pointer-events:none; }
    </style>
    <div id="auth-box">
        <h1>⚔️ Pixel Infinity</h1>
        <div class="sub">Sign in to play online</div>
        <div class="err" id="auth-err"></div>
        <input id="auth-name" type="text" placeholder="Username (2-16 chars)" maxlength="16" autocomplete="username">
        <input id="auth-pass" type="password" placeholder="Password (4+ chars)" maxlength="32" autocomplete="current-password">
        <div class="auth-btns">
            <button class="btn-login" id="btn-login">Login</button>
            <button class="btn-register" id="btn-reg">Register</button>
        </div>
        <button class="btn-guest" id="btn-guest">Play as Guest</button>
    </div>`;

    document.body.appendChild(overlay);

    const nameEl = overlay.querySelector("#auth-name");
    const passEl = overlay.querySelector("#auth-pass");
    const errEl = overlay.querySelector("#auth-err");
    const loginBtn = overlay.querySelector("#btn-login");
    const regBtn = overlay.querySelector("#btn-reg");
    const guestBtn = overlay.querySelector("#btn-guest");

    function showErr(msg) {
        errEl.textContent = msg;
        errEl.style.display = "block";
    }

    function done(username, token) {
        saveSession(username, token || "guest");
        overlay.remove();
        onComplete(username);
    }

    async function doAuth(endpoint) {
        const name = nameEl.value.trim();
        const pass = passEl.value;
        if (!name || !pass) { showErr("Please fill in all fields"); return; }
        if (name.length < 2) { showErr("Username must be 2+ characters"); return; }
        if (pass.length < 4) { showErr("Password must be 4+ characters"); return; }

        errEl.style.display = "none";
        loginBtn.classList.add("loading");
        regBtn.classList.add("loading");

        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: name, password: pass })
            });
            const data = await res.json();

            if (!res.ok) {
                showErr(data.error || "Request failed");
                loginBtn.classList.remove("loading");
                regBtn.classList.remove("loading");
                return;
            }

            console.log("[Auth] Success:", data.username);
            done(data.username, data.token);
        } catch (e) {
            console.error("[Auth] Fetch error:", e);
            showErr("Connection failed. Try again.");
            loginBtn.classList.remove("loading");
            regBtn.classList.remove("loading");
        }
    }

    loginBtn.addEventListener("click", (e) => { e.stopPropagation(); doAuth("/api/login"); });
    regBtn.addEventListener("click", (e) => { e.stopPropagation(); doAuth("/api/register"); });
    guestBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const guestName = "Guest_" + Math.random().toString(36).substr(2, 5);
        done(guestName, "guest_" + guestName);
    });

    passEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.stopPropagation(); doAuth("/api/login"); }
    });

    // Focus username input after a short delay
    setTimeout(() => nameEl.focus(), 100);
}

// ============================================
// CHAT PANEL (left side of lobby)
// ============================================
let chatEl = null;

export function showChat() {
    if (chatEl) return;

    chatEl = document.createElement("div");
    chatEl.id = "chat-panel";
    // Block C3 events on chat
    chatEl.addEventListener("pointerdown", e => e.stopPropagation(), true);
    chatEl.addEventListener("touchstart", e => e.stopPropagation(), true);
    chatEl.addEventListener("click", e => e.stopPropagation(), true);

    chatEl.innerHTML = `
    <style>
        #chat-panel {
            position:fixed; top:10px; left:10px; width:230px; height:330px;
            background:rgba(0,0,0,0.8); border:1px solid rgba(255,255,255,0.15);
            border-radius:12px; display:flex; flex-direction:column; z-index:99998;
            font-family:sans-serif; overflow:hidden; backdrop-filter:blur(4px);
            touch-action:auto !important; pointer-events:all !important;
        }
        .ch-header { color:#f1c40f; font-size:13px; font-weight:bold; padding:8px 12px;
            border-bottom:1px solid rgba(255,255,255,0.1); }
        .ch-msgs { flex:1; overflow-y:auto; padding:6px 10px; font-size:12px; color:#ccc; }
        .ch-msg { margin-bottom:4px; word-break:break-word; line-height:1.4; }
        .ch-me b { color:#3498db; }
        .ch-msg b { color:#f1c40f; }
        .ch-time { color:#555; font-size:10px; }
        .ch-row { display:flex; padding:6px; gap:4px; border-top:1px solid rgba(255,255,255,0.1); }
        .ch-input { flex:1; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.15);
            border-radius:6px; padding:7px 8px; color:#fff; font-size:12px; outline:none;
            touch-action:auto !important; }
        .ch-input:focus { border-color:#3498db; }
        .ch-send { background:#3498db; color:#fff; border:none; border-radius:6px;
            padding:7px 12px; font-size:12px; cursor:pointer; font-weight:bold; }
        .ch-msgs::-webkit-scrollbar { width:4px; }
        .ch-msgs::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.2); border-radius:4px; }
    </style>
    <div class="ch-header">💬 Chat</div>
    <div class="ch-msgs" id="ch-msgs"></div>
    <div class="ch-row">
        <input class="ch-input" id="ch-input" type="text" placeholder="Type message..." maxlength="200" autocomplete="off">
        <button class="ch-send" id="ch-send">Send</button>
    </div>`;

    document.body.appendChild(chatEl);

    const input = chatEl.querySelector("#ch-input");
    const sendBtn = chatEl.querySelector("#ch-send");

    const send = () => {
        const msg = input.value.trim();
        if (!msg) return;
        const sock = globalThis.NetworkManager?._getSocket?.();
        if (sock) {
            sock.emit("chat_message", { username: getUsername() || "Guest", message: msg });
        }
        input.value = "";
    };

    sendBtn.addEventListener("click", (e) => { e.stopPropagation(); send(); });
    input.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Enter") send();
    });

    // Setup socket listeners
    const sock = globalThis.NetworkManager?._getSocket?.();
    if (sock) {
        sock.off("chat_message");
        sock.off("chat_history");

        sock.on("chat_message", (m) => addMsg(m.username, m.message, m.timestamp));
        sock.on("chat_history", (hist) => {
            const c = document.getElementById("ch-msgs");
            if (c) c.innerHTML = "";
            for (const m of hist) addMsg(m.username, m.message, m.timestamp);
        });
        sock.emit("chat_history");
    }
}

function addMsg(user, msg, ts) {
    const c = document.getElementById("ch-msgs");
    if (!c) return;
    const isMe = user === getUsername();
    const t = new Date(ts);
    const time = t.getHours().toString().padStart(2, "0") + ":" + t.getMinutes().toString().padStart(2, "0");
    const d = document.createElement("div");
    d.className = "ch-msg" + (isMe ? " ch-me" : "");
    d.innerHTML = `<span class="ch-time">${time}</span> <b>${esc(user)}</b>: ${esc(msg)}`;
    c.appendChild(d);
    c.scrollTop = c.scrollHeight;
    while (c.children.length > 100) c.removeChild(c.firstChild);
}

function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

export function hideChat() {
    if (chatEl) { chatEl.remove(); chatEl = null; }
}

console.log("[AuthUI] Module loaded!");
