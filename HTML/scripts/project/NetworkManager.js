// ============================================
// NETWORK MANAGER - Multiplayer client
// Socket.IO based real-time sync
// ============================================

let socket = null;
let myId = null;
let roomId = null;
let remotePlayers = new Map();  // id -> { x, y, health, maxHealth, heroId, level, isAlive, direction, sprite }
let connected = false;
let updateInterval = null;

// ============================================
// CONNECT
// ============================================
export function connect() {
    if (socket) return;

    // Socket.IO auto-detects the server URL
    const serverUrl = window.location.origin;

    // Dynamically load Socket.IO client
    return new Promise((resolve, reject) => {
        if (window.io) {
            initSocket(serverUrl);
            resolve();
            return;
        }
        const script = document.createElement("script");
        script.src = "/socket.io/socket.io.js";
        script.onload = () => {
            initSocket(serverUrl);
            resolve();
        };
        script.onerror = () => {
            console.warn("[Network] Socket.IO client failed to load - offline mode");
            reject();
        };
        document.head.appendChild(script);
    });
}

function initSocket(url) {
    socket = window.io(url, { transports: ["websocket", "polling"] });

    socket.on("connect", () => {
        myId = socket.id;
        connected = true;
        console.log("[Network] Connected:", myId);
        updateOnlineCount();
    });

    socket.on("disconnect", () => {
        connected = false;
        console.log("[Network] Disconnected");
        clearRemotePlayers();
        updateOnlineCount();
    });

    socket.on("joined_room", (data) => {
        roomId = data.roomId;
        myId = data.playerId;
        console.log("[Network] Joined room:", roomId, "Players:", data.players.length);
        // Add existing players
        for (const p of data.players) {
            if (p.id !== myId) addRemotePlayer(p);
        }
    });

    socket.on("player_joined", (data) => {
        console.log("[Network] Player joined:", data.name);
        addRemotePlayer(data);
        showNetworkToast(lang() === "ko" ? `${data.name} 입장!` : `${data.name} joined!`);
    });

    socket.on("player_update", (data) => {
        updateRemotePlayer(data);
    });

    socket.on("player_left", (data) => {
        const p = remotePlayers.get(data.id);
        if (p) {
            showNetworkToast(lang() === "ko" ? `${p.name || "Player"} 퇴장` : `${p.name || "Player"} left`);
            removeRemotePlayer(data.id);
        }
    });

    socket.on("player_died", (data) => {
        const p = remotePlayers.get(data.id);
        if (p) p.isAlive = false;
    });

    socket.on("take_damage", (data) => {
        // Another player hit us
        const PC = globalThis.PlayerController;
        const state = globalThis.GameState?.state;
        if (PC && state) {
            PC.damagePlayer(data.damage);
            // Show "PvP!" text
            const pos = PC.getPlayerPosition();
            try {
                const rt = globalThis.GameState.getRuntime();
                const t = rt.objects.DamageText?.createInstance("Game", pos.x, pos.y - 50);
                if (t) {
                    t.text = "-" + Math.round(data.damage);
                    t.colorRgb = [1, 0.2, 0.2];
                    t.opacity = 1;
                    try {
                        t.behaviors.Tween.startTween("y", pos.y - 150, 0.8, "easeoutquad");
                        t.behaviors.Tween.startTween("opacity", 0, 0.8, "easeoutquad");
                    } catch (e) {}
                    setTimeout(() => { try { if (t?.runtime) t.destroy(); } catch (e) {} }, 900);
                }
            } catch (e) {}
        }
    });

    socket.on("leaderboard_update", (data) => {
        // Cache latest leaderboard
        if (data.daily) cachedLeaderboard.daily = data.daily;
        if (data.weekly) cachedLeaderboard.weekly = data.weekly;
    });
}

// ============================================
// GAME ACTIONS
// ============================================
export function joinGame(heroId, name) {
    if (!socket || !connected) return;
    const state = globalThis.GameState?.state;
    socket.emit("join_game", {
        heroId: heroId || "archer",
        name: name || "Player_" + (myId || "").substr(0, 4),
        x: state?.playerX || 0,
        y: state?.playerY || 0,
        health: state?.playerMaxHealth || 100,
        maxHealth: state?.playerMaxHealth || 100
    });

    // Start sending position updates
    if (updateInterval) clearInterval(updateInterval);
    updateInterval = setInterval(sendUpdate, 50);  // 20 times/sec
}

function sendUpdate() {
    if (!socket || !connected) return;
    const state = globalThis.GameState?.state;
    const PC = globalThis.PlayerController;
    if (!state || !PC) return;

    const pos = PC.getPlayerPosition();
    socket.volatile.emit("update", {
        x: pos.x,
        y: pos.y,
        health: state.playerHealth,
        maxHealth: state.playerMaxHealth,
        level: state.playerLevel,
        kills: state.killCount,
        isAlive: state.playerHealth > 0,
        direction: state.moveX > 0 ? 1 : -1
    });
}

export function submitScore(data) {
    if (!socket || !connected) return;
    socket.emit("submit_score", data);

    // Also submit via REST (backup)
    fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    }).catch(() => {});
}

export function attackPlayer(targetId, damage) {
    if (!socket || !connected) return;
    socket.emit("attack_player", { targetId, damage });
}

export function notifyDeath() {
    if (!socket || !connected) return;
    socket.emit("player_died", {});
}

export function disconnect() {
    if (updateInterval) { clearInterval(updateInterval); updateInterval = null; }
    if (socket) { socket.disconnect(); socket = null; }
    connected = false;
    clearRemotePlayers();
}

// ============================================
// REMOTE PLAYER MANAGEMENT
// ============================================
function addRemotePlayer(data) {
    remotePlayers.set(data.id, {
        id: data.id,
        name: data.name,
        heroId: data.heroId || "archer",
        x: data.x || 0,
        y: data.y || 0,
        health: data.health || 100,
        maxHealth: data.maxHealth || 100,
        level: data.level || 1,
        isAlive: true,
        direction: 1,
        sprite: null
    });
}

function updateRemotePlayer(data) {
    const p = remotePlayers.get(data.id);
    if (!p) {
        addRemotePlayer(data);
        return;
    }
    p.x = data.x;
    p.y = data.y;
    p.health = data.health;
    p.maxHealth = data.maxHealth;
    p.level = data.level || p.level;
    p.isAlive = data.isAlive !== false;
    p.direction = data.direction || 1;
    p.heroId = data.heroId || p.heroId;
}

function removeRemotePlayer(id) {
    const p = remotePlayers.get(id);
    if (p?.sprite) {
        try { p.sprite.destroy(); } catch (e) {}
    }
    remotePlayers.delete(id);
}

function clearRemotePlayers() {
    for (const [id, p] of remotePlayers) {
        if (p.sprite) try { p.sprite.destroy(); } catch (e) {}
    }
    remotePlayers.clear();
}

// ============================================
// RENDER REMOTE PLAYERS (called every tick from main.js)
// ============================================
export function updateRemotePlayers(runtime) {
    if (!connected) return;

    for (const [id, p] of remotePlayers) {
        if (!p.isAlive) {
            if (p.sprite) { try { p.sprite.destroy(); } catch (e) {} p.sprite = null; }
            continue;
        }

        // Create sprite if needed (use Player object as template)
        if (!p.sprite || !p.sprite.runtime) {
            try {
                p.sprite = runtime.objects.Player?.createInstance("Game", p.x, p.y);
                if (p.sprite) {
                    // Set enemy color tint (red)
                    p.sprite.colorRgb = [1, 0.4, 0.4];
                    p.sprite.opacity = 0.85;
                    // Set hero animation
                    try { p.sprite.setAnimation(p.heroId + "_idle"); } catch (e) {
                        try { p.sprite.setAnimation("archer_idle"); } catch (e2) {}
                    }
                }
            } catch (e) {
                continue;
            }
        }

        if (!p.sprite) continue;

        // Smooth interpolation toward target position
        const lerp = 0.2;
        p.sprite.x += (p.x - p.sprite.x) * lerp;
        p.sprite.y += (p.y - p.sprite.y) * lerp;

        // Direction (flip sprite)
        if (p.direction < 0) {
            p.sprite.width = -Math.abs(p.sprite.width);
        } else {
            p.sprite.width = Math.abs(p.sprite.width);
        }

        // Check collision with local player (PvP contact damage)
        const PC = globalThis.PlayerController;
        if (PC) {
            const myPos = PC.getPlayerPosition();
            const dx = myPos.x - p.sprite.x;
            const dy = myPos.y - p.sprite.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 80) {
                PC.damagePlayer(8 * (1/60));  // 8 DPS on contact
            }
        }

        // Check if local player's melee/aura weapons hit this remote player
        checkMeleeHitOnRemote(p);
    }
}

// PvP: Check if local melee/aura weapons hit a remote player
let pvpMeleeCooldowns = new Map();  // playerId -> lastHitTime

function checkMeleeHitOnRemote(rp) {
    if (!rp.isAlive || !rp.sprite || !socket || !connected) return;

    const PC = globalThis.PlayerController;
    const state = globalThis.GameState?.state;
    if (!PC || !state) return;

    const myPos = PC.getPlayerPosition();
    const dx = myPos.x - rp.sprite.x;
    const dy = myPos.y - rp.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Melee range check (200px for melee weapons, 300px for aura)
    const now = Date.now();
    const lastHit = pvpMeleeCooldowns.get(rp.id) || 0;
    if (now - lastHit < 500) return;  // 0.5s cooldown between PvP melee hits

    // Check if player has melee/aura weapons active
    const weapons = state.equippedWeapons || [];
    for (let i = 0; i < weapons.length; i++) {
        const wid = weapons[i];
        if (!wid) continue;
        const wlv = state.weaponLevels?.[wid] || 0;
        if (wlv <= 0) continue;

        // Soul Aura range check
        if (wid === "soul_aura" && dist < 300) {
            const dmg = 15 + wlv * 3;
            attackPlayer(rp.id, dmg);
            pvpMeleeCooldowns.set(rp.id, now);
            showPvPHit(rp.sprite, dmg);
            return;
        }

        // Melee weapon range check (swift_blade, sword, spinning_axe)
        if ((wid === "swift_blade" || wid === "sword" || wid === "spinning_axe") && dist < 200) {
            const dmg = 10 + wlv * 4;
            attackPlayer(rp.id, dmg);
            pvpMeleeCooldowns.set(rp.id, now);
            showPvPHit(rp.sprite, dmg);
            return;
        }
    }
}

function showPvPHit(sprite, dmg) {
    try {
        const runtime = globalThis.GameState?.getRuntime?.();
        if (!runtime) return;
        const text = runtime.objects.DamageText?.createInstance("Game", sprite.x, sprite.y - 40);
        if (text) {
            text.text = String(Math.round(dmg));
            text.colorRgb = [1, 0.5, 0];
            text.opacity = 1;
            try {
                text.behaviors.Tween.startTween("y", sprite.y - 140, 0.8, "easeoutquad");
                text.behaviors.Tween.startTween("opacity", 0, 0.8, "easeoutquad");
            } catch (e) {}
            setTimeout(() => { try { if (text?.runtime) text.destroy(); } catch (e) {} }, 900);
        }
        // Flash white
        sprite.colorRgb = [1, 1, 1];
        setTimeout(() => { try { if (sprite?.runtime) sprite.colorRgb = [1, 0.4, 0.4]; } catch (e) {} }, 80);
    } catch (e) {}
}

export function getRemotePlayers() { return remotePlayers; }
export function isConnected() { return connected; }
export function getMyId() { return myId; }
export function getPlayerCount() { return remotePlayers.size + (connected ? 1 : 0); }
export function _getSocket() { return socket; }

// ============================================
// LEADERBOARD
// ============================================
let cachedLeaderboard = { daily: [], weekly: [], monthly: [] };

export async function fetchLeaderboard(period = "daily") {
    try {
        const res = await fetch(`/api/leaderboard/${period}`);
        const data = await res.json();
        cachedLeaderboard[period] = data.entries || [];
        return cachedLeaderboard[period];
    } catch (e) {
        return cachedLeaderboard[period] || [];
    }
}

export function getCachedLeaderboard() { return cachedLeaderboard; }

// ============================================
// LEADERBOARD UI (HTML overlay)
// ============================================
export function showLeaderboard() {
    // Remove existing
    document.getElementById("pi-leaderboard")?.remove();

    const isKo = lang() === "ko";

    const panel = document.createElement("div");
    panel.id = "pi-leaderboard";
    panel.className = "pi-panel";
    panel.style.maxHeight = "85vh";
    panel.innerHTML = `
        <h2>${isKo ? "🏅 리더보드" : "🏅 Leaderboard"}</h2>
        <button class="pi-close" onclick="document.getElementById('pi-leaderboard')?.remove();document.querySelector('.pi-backdrop')?.remove()">&times;</button>
        <div style="display:flex;gap:8px;margin-bottom:12px;justify-content:center">
            <button class="pi-buy lb-tab" data-period="daily" style="background:#e74c3c">${isKo?"오늘":"Today"}</button>
            <button class="pi-buy lb-tab" data-period="weekly" style="background:#3498db">${isKo?"주간":"Week"}</button>
            <button class="pi-buy lb-tab" data-period="monthly" style="background:#9b59b6">${isKo?"월간":"Month"}</button>
        </div>
        <div id="lb-content" style="min-height:100px"></div>
        <div id="lb-online" style="text-align:center;margin-top:8px;color:#2ecc71;font-size:12px"></div>
    `;

    const backdrop = document.createElement("div");
    backdrop.className = "pi-backdrop";
    backdrop.onclick = () => { panel.remove(); backdrop.remove(); };

    document.body.appendChild(backdrop);
    document.body.appendChild(panel);

    // Tab switching
    panel.querySelectorAll(".lb-tab").forEach(btn => {
        btn.addEventListener("click", async () => {
            panel.querySelectorAll(".lb-tab").forEach(b => b.style.opacity = "0.5");
            btn.style.opacity = "1";
            await loadLeaderboardTab(btn.dataset.period);
        });
    });

    // Load daily by default
    panel.querySelector('[data-period="daily"]').style.opacity = "1";
    panel.querySelectorAll('.lb-tab:not([data-period="daily"])').forEach(b => b.style.opacity = "0.5");
    loadLeaderboardTab("daily");

    // Online count
    fetch("/api/online").then(r => r.json()).then(d => {
        const el = document.getElementById("lb-online");
        if (el) el.textContent = `🟢 ${isKo?"접속 중":"Online"}: ${d.online || 0}`;
    }).catch(() => {});
}

async function loadLeaderboardTab(period) {
    const entries = await fetchLeaderboard(period);
    const container = document.getElementById("lb-content");
    if (!container) return;

    const isKo = lang() === "ko";

    if (!entries.length) {
        container.innerHTML = `<div style="text-align:center;color:#666;padding:20px">${isKo?"기록이 없습니다":"No records yet"}</div>`;
        return;
    }

    let html = '<div style="font-size:12px">';
    entries.slice(0, 20).forEach((e, i) => {
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i+1}`;
        const time = Math.floor(e.time / 60) + ":" + String(e.time % 60).padStart(2, "0");
        html += `<div class="pi-row" style="padding:6px 0">
            <span style="width:30px;font-weight:bold">${medal}</span>
            <span style="flex:1;font-weight:bold">${e.name}</span>
            <span style="color:#f1c40f;width:50px;text-align:right">${e.score}${isKo?"킬":"K"}</span>
            <span style="color:#aaa;width:45px;text-align:right;font-size:11px">Lv${e.level}</span>
            <span style="color:#888;width:45px;text-align:right;font-size:11px">${time}</span>
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

function lang() { const m = globalThis.i18n; return m ? m.getLanguage() : "en"; }

// ============================================
// TOAST NOTIFICATION
// ============================================
function showNetworkToast(msg) {
    const d = document.createElement("div");
    d.style.cssText = `position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
        background:rgba(0,0,0,0.85);color:#fff;padding:8px 16px;border-radius:8px;
        font-size:13px;z-index:100002;pointer-events:none;
        animation:pi-slide 0.3s ease-out;`;
    d.textContent = msg;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 2500);
}

// Online count display
function updateOnlineCount() {
    fetch("/api/online").then(r => r.json()).then(d => {
        let el = document.getElementById("pi-online-badge");
        if (!el) {
            el = document.createElement("div");
            el.id = "pi-online-badge";
            el.style.cssText = `position:fixed;bottom:8px;right:8px;background:rgba(0,0,0,0.7);
                color:#2ecc71;padding:4px 10px;border-radius:6px;font-size:11px;z-index:99998;`;
            document.body.appendChild(el);
        }
        el.textContent = `🟢 ${d.online || 0} online`;
    }).catch(() => {});
}

console.log("[NetworkManager] Module loaded!");
