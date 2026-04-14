// ============================================
// AUTH UI + CHAT - Login/Register + Lobby Chat
// ============================================

let currentUser = null;  // { username, token }
let chatSocket = null;

function lang() { const m = globalThis.i18n; return m ? m.getLanguage() : "en"; }
function isKo() { return lang() === "ko"; }

// ============================================
// AUTH: Check saved session
// ============================================
export function init() {
    const saved = localStorage.getItem("pi_auth");
    if (saved) {
        try {
            currentUser = JSON.parse(saved);
            console.log("[Auth] Restored session:", currentUser.username);
        } catch (e) { currentUser = null; }
    }
}

export function isLoggedIn() { return !!currentUser; }
export function getUsername() { return currentUser?.username || null; }
export function getToken() { return currentUser?.token || null; }

function saveSession(data) {
    currentUser = { username: data.username, token: data.token };
    localStorage.setItem("pi_auth", JSON.stringify(currentUser));
}

export function logout() {
    currentUser = null;
    localStorage.removeItem("pi_auth");
}

// ============================================
// AUTH: Login/Register Page (blocks game until done)
// ============================================
export function showAuthPage(onComplete) {
    if (isLoggedIn()) { onComplete(currentUser.username); return; }

    addAuthStyles();

    const overlay = document.createElement("div");
    overlay.id = "auth-overlay";
    overlay.innerHTML = `
        <div id="auth-box">
            <h1>⚔️ Pixel Infinity</h1>
            <p id="auth-subtitle">${isKo() ? "계정으로 로그인하세요" : "Sign in to play"}</p>
            <div id="auth-error" style="display:none"></div>
            <input id="auth-name" type="text" placeholder="${isKo() ? "닉네임 (2~16자)" : "Username (2-16)"}" maxlength="16" autocomplete="username">
            <input id="auth-pass" type="password" placeholder="${isKo() ? "비밀번호 (4자 이상)" : "Password (4+)"}" maxlength="32" autocomplete="current-password">
            <div id="auth-buttons">
                <button id="auth-login">${isKo() ? "로그인" : "Login"}</button>
                <button id="auth-register">${isKo() ? "회원가입" : "Register"}</button>
            </div>
            <button id="auth-guest">${isKo() ? "게스트로 플레이" : "Play as Guest"}</button>
        </div>
    `;
    document.body.appendChild(overlay);

    const nameInput = document.getElementById("auth-name");
    const passInput = document.getElementById("auth-pass");
    const errorEl = document.getElementById("auth-error");

    function showError(msg) {
        errorEl.textContent = msg;
        errorEl.style.display = "block";
        errorEl.style.animation = "none";
        errorEl.offsetHeight; // reflow
        errorEl.style.animation = "pi-shake 0.3s";
    }

    document.getElementById("auth-login").onclick = async () => {
        const name = nameInput.value.trim();
        const pass = passInput.value;
        if (!name || !pass) { showError(isKo() ? "모든 항목을 입력하세요" : "Fill all fields"); return; }

        try {
            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: name, password: pass })
            });
            const data = await res.json();
            if (!res.ok) { showError(data.error); return; }
            saveSession(data);
            overlay.remove();
            onComplete(data.username);
        } catch (e) { showError(isKo() ? "서버 연결 실패" : "Connection failed"); }
    };

    document.getElementById("auth-register").onclick = async () => {
        const name = nameInput.value.trim();
        const pass = passInput.value;
        if (!name || !pass) { showError(isKo() ? "모든 항목을 입력하세요" : "Fill all fields"); return; }

        try {
            const res = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: name, password: pass })
            });
            const data = await res.json();
            if (!res.ok) { showError(data.error); return; }
            saveSession(data);
            overlay.remove();
            onComplete(data.username);
        } catch (e) { showError(isKo() ? "서버 연결 실패" : "Connection failed"); }
    };

    document.getElementById("auth-guest").onclick = () => {
        const guestName = "Guest_" + Math.random().toString(36).substr(2, 5);
        saveSession({ username: guestName, token: "guest_" + guestName });
        overlay.remove();
        onComplete(guestName);
    };

    // Enter key to login
    passInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") document.getElementById("auth-login").click();
    });

    nameInput.focus();
}

// ============================================
// CHAT: Lobby Chat Panel (left side)
// ============================================
let chatPanel = null;

export function showChat() {
    if (chatPanel) return;
    addAuthStyles();

    chatPanel = document.createElement("div");
    chatPanel.id = "chat-panel";
    chatPanel.innerHTML = `
        <div id="chat-header">${isKo() ? "💬 채팅" : "💬 Chat"}</div>
        <div id="chat-messages"></div>
        <div id="chat-input-row">
            <input id="chat-input" type="text" placeholder="${isKo() ? "메시지 입력..." : "Type message..."}" maxlength="200" autocomplete="off">
            <button id="chat-send">${isKo() ? "전송" : "Send"}</button>
        </div>
    `;
    document.body.appendChild(chatPanel);

    // Send message
    const input = document.getElementById("chat-input");
    const sendBtn = document.getElementById("chat-send");

    const sendMessage = () => {
        const msg = input.value.trim();
        if (!msg) return;
        const socket = getSocket();
        if (socket) {
            socket.emit("chat_message", {
                username: getUsername() || "Guest",
                message: msg
            });
        }
        input.value = "";
    };

    sendBtn.onclick = sendMessage;
    input.onkeydown = (e) => { if (e.key === "Enter") sendMessage(); };

    // Request history
    const socket = getSocket();
    if (socket) {
        socket.emit("chat_history");
    }

    // Setup chat listeners
    setupChatListeners();
}

export function hideChat() {
    if (chatPanel) { chatPanel.remove(); chatPanel = null; }
}

function setupChatListeners() {
    const socket = getSocket();
    if (!socket) return;

    // Remove old listeners to prevent duplicates
    socket.off("chat_message");
    socket.off("chat_history");

    socket.on("chat_message", (msg) => {
        appendChatMessage(msg.username, msg.message, msg.timestamp);
    });

    socket.on("chat_history", (history) => {
        const container = document.getElementById("chat-messages");
        if (!container) return;
        container.innerHTML = "";
        for (const msg of history) {
            appendChatMessage(msg.username, msg.message, msg.timestamp);
        }
    });
}

function appendChatMessage(username, message, timestamp) {
    const container = document.getElementById("chat-messages");
    if (!container) return;

    const isMe = username === getUsername();
    const time = new Date(timestamp);
    const timeStr = time.getHours().toString().padStart(2, "0") + ":" +
                    time.getMinutes().toString().padStart(2, "0");

    const div = document.createElement("div");
    div.className = "chat-msg" + (isMe ? " chat-me" : "");
    div.innerHTML = `<span class="chat-time">${timeStr}</span> <b class="chat-name">${escapeHtml(username)}</b>: ${escapeHtml(message)}`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;

    // Max 100 messages in DOM
    while (container.children.length > 100) container.removeChild(container.firstChild);
}

function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function getSocket() {
    return globalThis.NetworkManager?._getSocket?.() || window._piSocket || null;
}

// ============================================
// STYLES
// ============================================
function addAuthStyles() {
    if (document.getElementById("auth-styles")) return;
    const s = document.createElement("style");
    s.id = "auth-styles";
    s.textContent = `
        #auth-overlay { position:fixed; top:0; left:0; width:100%; height:100%;
            background:linear-gradient(135deg, #0a0a1a, #1a1a3e);
            z-index:200000; display:flex; align-items:center; justify-content:center;
            font-family:'Segoe UI',sans-serif; }
        #auth-box { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15);
            border-radius:20px; padding:36px 32px; width:85vw; max-width:340px;
            text-align:center; backdrop-filter:blur(10px); }
        #auth-box h1 { color:#f1c40f; margin:0 0 8px 0; font-size:26px; }
        #auth-subtitle { color:#999; margin:0 0 18px 0; font-size:13px; }
        #auth-error { background:rgba(231,76,60,0.2); border:1px solid #e74c3c; color:#e74c3c;
            padding:8px; border-radius:8px; font-size:12px; margin-bottom:12px; }
        #auth-box input { display:block; width:100%; box-sizing:border-box; padding:12px 14px;
            margin-bottom:10px; border-radius:10px; border:1px solid rgba(255,255,255,0.2);
            background:rgba(255,255,255,0.08); color:#fff; font-size:15px; outline:none; }
        #auth-box input:focus { border-color:#3498db; background:rgba(255,255,255,0.12); }
        #auth-box input::placeholder { color:#666; }
        #auth-buttons { display:flex; gap:10px; margin:16px 0 12px 0; }
        #auth-buttons button { flex:1; padding:12px; border:none; border-radius:10px;
            font-size:15px; font-weight:bold; cursor:pointer; transition:transform 0.1s; }
        #auth-buttons button:active { transform:scale(0.95); }
        #auth-login { background:#3498db; color:#fff; }
        #auth-register { background:#2ecc71; color:#fff; }
        #auth-guest { width:100%; padding:10px; border:1px solid rgba(255,255,255,0.2);
            border-radius:10px; background:transparent; color:#999; cursor:pointer;
            font-size:13px; }
        #auth-guest:hover { color:#fff; border-color:rgba(255,255,255,0.4); }
        @keyframes pi-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)} }

        /* CHAT */
        #chat-panel { position:fixed; top:10px; left:10px; width:220px; height:320px;
            background:rgba(0,0,0,0.75); border:1px solid rgba(255,255,255,0.15);
            border-radius:12px; display:flex; flex-direction:column; z-index:99998;
            font-family:'Segoe UI',sans-serif; overflow:hidden;
            backdrop-filter:blur(4px); }
        #chat-header { color:#f1c40f; font-size:13px; font-weight:bold;
            padding:8px 12px; border-bottom:1px solid rgba(255,255,255,0.1); }
        #chat-messages { flex:1; overflow-y:auto; padding:6px 10px; font-size:12px; color:#ccc; }
        .chat-msg { margin-bottom:4px; word-break:break-word; line-height:1.4; }
        .chat-me .chat-name { color:#3498db; }
        .chat-name { color:#f1c40f; }
        .chat-time { color:#555; font-size:10px; }
        #chat-input-row { display:flex; padding:6px; gap:4px;
            border-top:1px solid rgba(255,255,255,0.1); }
        #chat-input { flex:1; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.15);
            border-radius:6px; padding:6px 8px; color:#fff; font-size:12px; outline:none; }
        #chat-input:focus { border-color:#3498db; }
        #chat-send { background:#3498db; color:#fff; border:none; border-radius:6px;
            padding:6px 10px; font-size:12px; cursor:pointer; font-weight:bold; }
        #chat-send:active { background:#2980b9; }

        /* Chat scroll bar */
        #chat-messages::-webkit-scrollbar { width:4px; }
        #chat-messages::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.2); border-radius:4px; }
    `;
    document.head.appendChild(s);
}

console.log("[AuthUI] Module loaded!");
