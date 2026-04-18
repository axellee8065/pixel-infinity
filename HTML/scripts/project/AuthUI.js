// ============================================
// AUTH UI + CHAT — Bulletproof version
// ============================================

let currentUser = null;
let authCallback = null;

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
// AUTH PAGE
// ============================================
export function showAuthPage(onComplete) {
    if (isLoggedIn()) { onComplete(currentUser.username); return; }
    // Not logged in — redirect to login page
    window.location.href = '/login.html';
    return;

    // Globals for inline onclick
    window._piDoLogin = async function() {
        const n = document.getElementById("pia-n")?.value?.trim();
        const p = document.getElementById("pia-p")?.value;
        if (!n || !p) { document.getElementById("pia-e").textContent = "Fill all fields"; return; }
        document.getElementById("pia-e").textContent = "Connecting...";
        try {
            const r = await fetch("/api/register", { method:"POST",
                headers:{"Content-Type":"application/json"}, cache:"no-store",
                body: JSON.stringify({username:n,password:p}) });
            const d = await r.json();
            if (!r.ok) { document.getElementById("pia-e").textContent = d.error || "Failed"; return; }
            finishAuth(d.username, d.token);
        } catch(e) { document.getElementById("pia-e").textContent = "Server error: " + e.message; }
    };

    window._piDoReg = async function() {
        const n = document.getElementById("pia-n")?.value?.trim();
        const p = document.getElementById("pia-p")?.value;
        if (!n || !p) { document.getElementById("pia-e").textContent = "Fill all fields"; return; }
        if (n.length < 2) { document.getElementById("pia-e").textContent = "Username: 2+ chars"; return; }
        if (p.length < 4) { document.getElementById("pia-e").textContent = "Password: 4+ chars"; return; }
        document.getElementById("pia-e").textContent = "Creating account...";
        try {
            const r = await fetch("/api/register", { method:"POST",
                headers:{"Content-Type":"application/json"}, cache:"no-store",
                body: JSON.stringify({username:n,password:p}) });
            const d = await r.json();
            if (!r.ok) { document.getElementById("pia-e").textContent = d.error || "Failed"; return; }
            finishAuth(d.username, d.token);
        } catch(e) { document.getElementById("pia-e").textContent = "Server error: " + e.message; }
    };

    window._piDoGuest = function() {
        finishAuth("Guest_" + Math.random().toString(36).substr(2,5), "guest");
    };

    const d = document.createElement("div");
    d.id = "pia";
    d.innerHTML = `<style>
#pia{position:fixed;top:0;left:0;width:100%;height:100%;background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:sans-serif}
.pia-b{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);border-radius:20px;padding:36px 28px;width:86vw;max-width:340px;text-align:center}
.pia-b h1{color:#f1c40f;margin:0 0 4px;font-size:26px}
.pia-b .s{color:#888;font-size:13px;margin-bottom:20px}
#pia-e{color:#e74c3c;font-size:13px;min-height:18px;margin-bottom:8px}
.pia-b input{display:block;width:100%;box-sizing:border-box;padding:13px 15px;margin-bottom:10px;border-radius:11px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font-size:15px;outline:none}
.pia-b input:focus{border-color:#3498db}
.pia-b input::placeholder{color:#666}
.pia-r{display:flex;gap:10px;margin:16px 0 12px}
.pia-r button{flex:1;padding:13px;border:none;border-radius:11px;font-size:15px;font-weight:700;cursor:pointer}
.pia-l{background:#3498db;color:#fff}
.pia-g{background:#2ecc71;color:#fff}
.pia-q{display:block;width:100%;padding:11px;border:1px solid rgba(255,255,255,.2);border-radius:11px;background:0 0;color:#aaa;cursor:pointer;font-size:13px}
</style><div class="pia-b"><h1>⚔️ Pixel Infinity</h1><div class="s">Sign in to play online</div><div id="pia-e"></div><input id="pia-n" placeholder="Username (2-16)" maxlength="16"><input id="pia-p" type="password" placeholder="Password (4+)" maxlength="32" onkeydown="if(event.key==='Enter')window._piDoLogin()"><div class="pia-r"><button class="pia-l" onclick="window._piDoLogin()">Login</button><button class="pia-g" onclick="window._piDoReg()">Register</button></div><button class="pia-q" onclick="window._piDoGuest()">Play as Guest</button></div>`;
    document.body.appendChild(d);
    setTimeout(() => document.getElementById("pia-n")?.focus(), 200);
}

function finishAuth(username, token) {
    saveSession(username, token);
    const el = document.getElementById("pia");
    if (el) el.remove();
    // Clean up globals
    delete window._piDoLogin;
    delete window._piDoReg;
    delete window._piDoGuest;
    // Reload page to let C3 initialize cleanly with auth
    if (authCallback) {
        authCallback(username);
    }
}

// ============================================
// CHAT
// ============================================
let chatEl = null;

window._piChatSend = function() {
    const input = document.getElementById("pic-i");
    if (!input) return;
    const msg = input.value.trim();
    if (!msg) return;
    const sock = globalThis.NetworkManager?._getSocket?.();
    if (sock) sock.emit("chat_message", { username: getUsername() || "Guest", message: msg });
    input.value = "";
};

export function showChat() {
    if (chatEl) return;
    chatEl = document.createElement("div");
    chatEl.id = "pic";
    chatEl.innerHTML = `<style>
#pic{position:fixed;top:10px;left:10px;width:220px;height:300px;background:rgba(0,0,0,.85);border:1px solid rgba(255,255,255,.15);border-radius:12px;display:flex;flex-direction:column;z-index:99998;font-family:sans-serif;overflow:hidden}
@media(max-width:767px){#pic{width:44vw;max-width:180px;height:45vh;max-height:280px;top:4px;left:4px}}
.ptabs{display:flex;border-bottom:1px solid rgba(255,255,255,.15)}
.ptab{flex:1;padding:7px 0;text-align:center;font-size:11px;font-weight:700;color:#888;cursor:pointer;border:0;background:0 0}
.ptab.active{color:#f1c40f;border-bottom:2px solid #f1c40f}
.ptab:active{opacity:.7}
.ppane{flex:1;display:none;flex-direction:column;overflow:hidden}
.ppane.active{display:flex}
.pic-m{flex:1;overflow-y:auto;padding:5px 8px;font-size:11px;color:#ccc}
.pic-m div{margin-bottom:3px;word-break:break-word;line-height:1.3}
.pic-m b{color:#f1c40f}
.pic-m .me b{color:#3498db}
.pic-t{color:#555;font-size:9px}
.pic-r{display:flex;padding:4px;gap:3px;border-top:1px solid rgba(255,255,255,.1)}
.pic-i{flex:1;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);border-radius:5px;padding:5px 6px;color:#fff;font-size:11px;outline:0}
.pic-i:focus{border-color:#3498db}
.pic-s{background:#3498db;color:#fff;border:0;border-radius:5px;padding:5px 8px;font-size:10px;cursor:pointer;font-weight:700}
.pst-body{padding:6px 8px;font-size:11px;color:#ccc;overflow-y:auto;flex:1}
.pst-row{display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.05)}
.pst-row:last-child{border:0}
.pst-val{color:#fff;font-weight:700}
.pst-rank{text-align:center;padding:5px;font-size:11px;border-top:1px solid rgba(255,255,255,.1)}
.pst-rank b{color:#f1c40f}
.pst-btn{display:block;width:calc(100% - 12px);margin:4px 6px;padding:6px;background:#3498db;color:#fff;border:0;border-radius:5px;font-size:10px;font-weight:700;cursor:pointer;text-align:center}
#pst-rankings{max-height:120px;overflow-y:auto;padding:2px 8px;font-size:10px}
.pst-rk-row{display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid rgba(255,255,255,.05)}
.pst-rk-row .medal{width:22px;font-weight:700}
.pst-rk-row .name{flex:1}
.pst-rk-row .score{color:#f1c40f;font-weight:700;width:45px;text-align:right}
</style>
<div class="ptabs">
    <button class="ptab active" onclick="window._piSwitchTab('chat')">💬 Chat</button>
    <button class="ptab" onclick="window._piSwitchTab('stats')">📊 Stats</button>
</div>
<div class="ppane active" id="pp-chat">
    <div class="pic-m" id="pic-m"></div>
    <div class="pic-r"><input class="pic-i" id="pic-i" placeholder="Type..." maxlength="200" onkeydown="if(event.key==='Enter'){event.stopPropagation();window._piChatSend()}"><button class="pic-s" onclick="window._piChatSend()">Send</button></div>
</div>
<div class="ppane" id="pp-stats">
    <div class="pst-body" id="pst-body">Loading...</div>
    <div class="pst-rank" id="pst-rank"></div>
    <button class="pst-btn" onclick="window._piToggleRank()">🏅 Rankings</button>
    <div id="pst-rankings" style="display:none"></div>
</div>`;
    document.body.appendChild(chatEl);

    // Tab switching
    window._piSwitchTab = function(tab) {
        document.querySelectorAll('.ptab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.ppane').forEach(p => p.classList.remove('active'));
        if (tab === 'chat') {
            document.querySelector('.ptab:first-child').classList.add('active');
            document.getElementById('pp-chat').classList.add('active');
        } else {
            document.querySelector('.ptab:last-child').classList.add('active');
            document.getElementById('pp-stats').classList.add('active');
            loadMyStats();
        }
    };

    window._piToggleRank = function() {
        const el = document.getElementById("pst-rankings");
        if (!el) return;
        el.style.display = el.style.display === "none" ? "block" : "none";
        if (el.style.display === "block") loadRankings();
    };

    setupChatSocket();
}

function setupChatSocket() {
    const sock = globalThis.NetworkManager?._getSocket?.();
    if (!sock) { setTimeout(setupChatSocket, 1000); return; }
    sock.off("chat_message"); sock.off("chat_history");
    sock.on("chat_message", (m) => addMsg(m.username, m.message, m.timestamp));
    sock.on("chat_history", (h) => { const c=document.getElementById("pic-m"); if(c)c.innerHTML=""; for(const m of h) addMsg(m.username,m.message,m.timestamp); });
    sock.emit("chat_history");
}

function addMsg(user,msg,ts) {
    const c = document.getElementById("pic-m"); if(!c) return;
    const me = user===getUsername();
    const t = new Date(ts);
    const d = document.createElement("div");
    d.className = me?"me":"";
    d.innerHTML = `<span class="pic-t">${t.getHours().toString().padStart(2,"0")}:${t.getMinutes().toString().padStart(2,"0")}</span> <b>${esc(user)}</b>: ${esc(msg)}`;
    c.appendChild(d); c.scrollTop=c.scrollHeight;
    while(c.children.length>100) c.removeChild(c.firstChild);
}

function esc(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}

export function hideChat() { if(chatEl){chatEl.remove();chatEl=null;} hideStats(); }

// ============================================
// STATS + RANK PANEL (below chat)
// ============================================
let statsEl = null;

export function showStats() {
    // Stats now integrated into chat panel tabs — no separate panel
    return;
}

function _showStatsLegacy() {
    if (statsEl) return;
    statsEl = document.createElement("div");
    statsEl.id = "pi-stats";
    statsEl.innerHTML = `<style>
#pi-stats{position:fixed;top:350px;left:10px;width:230px;background:rgba(0,0,0,.8);border:1px solid rgba(255,255,255,.15);border-radius:12px;z-index:99997;font-family:sans-serif;overflow:hidden;color:#ccc;font-size:12px}
@media(max-width:767px){#pi-stats{top:210px;left:4px;width:160px;font-size:10px}
.pis-h{font-size:11px;padding:5px 8px}
.pis-body{padding:4px 8px}
.pis-row{padding:2px 0}
.pis-rank{padding:4px;font-size:10px}
.pis-btn{font-size:10px;padding:5px;margin:4px 6px}
.pst-rk-row{font-size:9px}}
.pis-h{color:#f1c40f;font-size:13px;font-weight:700;padding:8px 12px;border-bottom:1px solid rgba(255,255,255,.1)}
.pis-body{padding:8px 12px}
.pis-row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05)}
.pis-row:last-child{border:0}
.pis-val{color:#fff;font-weight:700}
.pis-rank{text-align:center;padding:8px;border-top:1px solid rgba(255,255,255,.1)}
.pis-rank b{color:#f1c40f;font-size:16px}
.pis-btn{display:block;width:calc(100% - 16px);margin:6px 8px 8px;padding:8px;background:#3498db;color:#fff;border:0;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;text-align:center}
.pis-btn:active{background:#2980b9}
#pis-rankings{max-height:180px;overflow-y:auto;padding:4px 12px}
.pst-rk-row{display:flex;justify-content:space-between;padding:3px 0;font-size:11px;border-bottom:1px solid rgba(255,255,255,.05)}
.pst-rk-row .medal{width:24px;font-weight:700}
.pst-rk-row .name{flex:1}
.pst-rk-row .score{color:#f1c40f;font-weight:700;width:50px;text-align:right}
</style>
<div class="pis-h">📊 My Stats</div>
<div class="pis-body" id="pis-body">Loading...</div>
<div class="pis-rank" id="pis-rank"></div>
<button class="pis-btn" onclick="window._piToggleRank()">🏅 Rankings</button>
<div id="pis-rankings" style="display:none"></div>`;
    document.body.appendChild(statsEl);

    window._piToggleRank = function() {
        const el = document.getElementById("pst-rankings");
        if (!el) return;
        if (el.style.display === "none") {
            el.style.display = "block";
            loadRankings();
        } else {
            el.style.display = "none";
        }
    };

    loadMyStats();
}

function loadMyStats() {
    const username = getUsername();
    if (!username) return;

    // All stats from localStorage (survives server restarts)
    const SM = globalThis.SaveManager;
    const saveData = SM ? SM.getSaveData() : {};

    const totalKills = saveData.totalKills || 0;
    const totalGames = saveData.totalGames || 0;
    const pvpKills = saveData.pvpKills || 0;
    const totalTime = saveData.totalPlayTime || 0;
    const mins = Math.floor(totalTime / 60);
    const hrs = Math.floor(mins / 60);
    const highScore = saveData.highScore || 0;

    const body = document.getElementById("pst-body");
    if (!body) return;

    body.innerHTML = `
        <div class="pst-row"><span>🎮 Games</span><span class="pst-val">${totalGames}</span></div>
        <div class="pst-row"><span>⏱ Time</span><span class="pst-val">${hrs > 0 ? hrs+"h "+mins%60+"m" : mins+"m"}</span></div>
        <div class="pst-row"><span>💀 Kills</span><span class="pst-val">${totalKills.toLocaleString()}</span></div>
        <div class="pst-row"><span>⚔️ PvP</span><span class="pst-val">${pvpKills}</span></div>
        <div class="pst-row"><span>🏆 Best</span><span class="pst-val">${highScore}</span></div>
    `;

    // Register my score to server for rankings (so rankings survive restarts via re-registration)
    registerToServer(username, totalKills, totalGames, pvpKills, highScore, totalTime);

    // Show rank
    loadMyRank(username);
}

function registerToServer(username, kills, games, pvpKills, bestKills, time) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/leaderboard", true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify({
        name: username,
        kills: kills,
        level: 0,
        time: time,
        heroId: "archer"
    }));
}

function loadMyRank(username) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/api/rankings", true);
    xhr.onload = function() {
        try {
            var d = JSON.parse(xhr.responseText);
            var rankings = d.rankings || [];
            var myRank = -1;
            for (var i = 0; i < rankings.length; i++) {
                if (rankings[i].username.toLowerCase() === username.toLowerCase()) {
                    myRank = i + 1; break;
                }
            }
            var el = document.getElementById("pst-rank");
            if (el) {
                if (myRank > 0) {
                    var medal = myRank === 1 ? "🥇" : myRank === 2 ? "🥈" : myRank === 3 ? "🥉" : "#" + myRank;
                    el.innerHTML = "My Rank: <b>" + medal + "</b> / " + rankings.length + " players";
                } else {
                    el.innerHTML = "Play a game to get ranked!";
                }
            }
        } catch(e) {}
    };
    xhr.send();
}

function loadRankings() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/api/rankings", true);
    xhr.onload = function() {
        try {
            var d = JSON.parse(xhr.responseText);
            var rankings = d.rankings || [];
            var el = document.getElementById("pst-rankings");
            if (!el) return;
            if (!rankings.length) { el.innerHTML = "<div style='text-align:center;color:#666;padding:12px'>No players yet</div>"; return; }
            var html = "";
            for (var i = 0; i < Math.min(rankings.length, 20); i++) {
                var r = rankings[i];
                var medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "#"+(i+1);
                var isMe = r.username.toLowerCase() === (getUsername()||"").toLowerCase();
                html += '<div class="pst-rk-row" style="' + (isMe?"background:rgba(52,152,219,.15);border-radius:4px":"") + '">';
                html += '<span class="medal">' + medal + '</span>';
                html += '<span class="name">' + esc(r.username) + '</span>';
                html += '<span class="score">' + (r.totalKills||0) + 'K</span>';
                html += '</div>';
            }
            el.innerHTML = html;
        } catch(e) {}
    };
    xhr.send();
}

function hideStats() { if(statsEl){statsEl.remove();statsEl=null;} delete window._piToggleRank; }

console.log("[AuthUI] Module loaded!");
