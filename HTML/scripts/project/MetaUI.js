// ============================================
// META UI - HTML overlay buttons & panels
// Uses globalThis references (not ES imports) for C3 compatibility
// ============================================

let overlayEl = null;
let buttonsEl = null;
let styleAdded = false;

function SM() { return globalThis.SaveManager; }
function LM() { return globalThis.LobbyManager; }
function i18n() { return globalThis.i18n; }
function tt(key) { const m = i18n(); return m ? m.t(key) : key; }
function lang() { const m = i18n(); return m ? m.getLanguage() : "en"; }

// Refresh lobby gold display after any gold change
function refreshGold() {
    try { LM()?.updateLobbyUI(); } catch (e) {}
}

// ============================================
// STYLES
// ============================================
function addStyles() {
    if (styleAdded) return;
    styleAdded = true;
    const s = document.createElement("style");
    s.textContent = `
        #pi-buttons { position:fixed; top:8px; right:8px; display:flex; flex-direction:column;
            gap:6px; z-index:99999; }
        #pi-buttons button { display:block; padding:10px 14px; border-radius:10px; border:2px solid rgba(255,255,255,0.3);
            color:#fff; font-size:13px; font-weight:bold; cursor:pointer;
            text-shadow:1px 1px 2px #000; -webkit-tap-highlight-color:transparent;
            touch-action:manipulation; }
        #pi-buttons button:active { transform:scale(0.93); }
        .pi-backdrop { position:fixed; top:0; left:0; width:100%; height:100%;
            background:rgba(0,0,0,0.7); z-index:100000; }
        .pi-panel { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
            background:#1a1a2e; border:2px solid #333; border-radius:14px; padding:20px;
            color:#fff; width:85vw; max-width:360px; max-height:75vh; overflow-y:auto;
            z-index:100001; font-family:sans-serif; box-shadow:0 8px 30px rgba(0,0,0,0.7); }
        .pi-panel h2 { text-align:center; color:#f1c40f; margin:0 0 14px 0; font-size:18px; }
        .pi-close { position:absolute; top:6px; right:10px; background:none; border:none;
            color:#888; font-size:22px; cursor:pointer; }
        .pi-row { display:flex; justify-content:space-between; align-items:center;
            padding:8px 4px; border-bottom:1px solid #333; }
        .pi-row:last-child { border-bottom:none; }
        .pi-buy { background:#27ae60; color:#fff; border:none; padding:6px 12px;
            border-radius:6px; font-weight:bold; cursor:pointer; font-size:12px; }
        .pi-buy:active { background:#2ecc71; }
        .pi-buy[disabled] { background:#444; color:#777; cursor:default; }
        .pi-gold { text-align:center; color:#f1c40f; font-weight:bold; margin-top:10px; }
        @keyframes pi-pulse { 0%,100%{box-shadow:0 0 5px #2ecc71} 50%{box-shadow:0 0 15px #2ecc71} }
        .pi-glow { animation: pi-pulse 1.5s infinite; }
        .pi-popup { position:fixed; top:15px; left:50%; transform:translateX(-50%);
            background:linear-gradient(135deg,#f1c40f,#f39c12); color:#000; padding:10px 20px;
            border-radius:10px; font-weight:bold; z-index:100002; pointer-events:none;
            animation: pi-slide 0.3s ease-out; font-size:14px; text-align:center; }
        @keyframes pi-slide { from{top:-40px;opacity:0} to{top:15px;opacity:1} }
    `;
    document.head.appendChild(s);
}

// ============================================
// LOBBY BUTTONS
// ============================================
export function showLobbyButtons() {
    addStyles();
    if (buttonsEl) return;

    buttonsEl = document.createElement("div");
    buttonsEl.id = "pi-buttons";

    const mkBtn = (emoji, koText, enText, color, fn) => {
        const b = document.createElement("button");
        b.style.background = color;
        b.textContent = emoji + " " + (lang() === "ko" ? koText : enText);
        b.addEventListener("click", (e) => { e.stopPropagation(); e.preventDefault(); fn(b); });
        b.addEventListener("touchend", (e) => { e.stopPropagation(); e.preventDefault(); fn(b); }, { passive: false });
        buttonsEl.appendChild(b);
        return b;
    };

    // User profile + Logout button
    const auth = globalThis.AuthUI;
    const username = auth?.getUsername() || "Guest";
    const profileBtn = mkBtn("👤", username, username, "rgba(100,100,100,0.9)", () => {
        if (confirm(`${username}\n\nLogout?`)) {
            if (auth) auth.logout();
            window.location.href = '/login.html';
        }
    });

    const langBtn = mkBtn("🌐", "English", "한국어", "rgba(52,152,219,0.9)", (b) => {
        try {
            const m = i18n();
            if (!m) { alert("i18n not loaded"); return; }
            const nl = lang() === "ko" ? "en" : "ko";
            m.setLanguage(nl);
            b.textContent = "🌐 " + (nl === "ko" ? "English" : "한국어");
            // Update other button labels
            if (powerBtn) powerBtn.textContent = "⚡ " + (nl === "ko" ? "강화" : "PowerUp");
            if (achBtn) achBtn.textContent = "🏆 " + (nl === "ko" ? "업적" : "Achieve");
            if (dailyBtn) dailyBtn.textContent = "🎁 " + (nl === "ko" ? "일일보상" : "Daily");
        } catch (err) { console.error("[MetaUI] Lang error:", err); }
    });

    const powerBtn = mkBtn("⚡", "강화", "PowerUp", "rgba(231,76,60,0.9)", () => {
        try { showPowerUpShop(); } catch (err) { console.error("[MetaUI] PowerUp error:", err); }
    });

    const achBtn = mkBtn("🏆", "업적", "Achieve", "rgba(155,89,182,0.9)", () => {
        try { showAchievements(); } catch (err) { console.error("[MetaUI] Ach error:", err); }
    });

    const dailyBtn = mkBtn("🎁", "일일보상", "Daily", "rgba(46,204,113,0.9)", () => {
        try { showDailyReward(); } catch (err) { console.error("[MetaUI] Daily error:", err); }
    });

    // Pulse daily if claimable
    try {
        if (SM()?.canClaimDaily()) dailyBtn.classList.add("pi-glow");
    } catch (e) {}

    document.body.appendChild(buttonsEl);
    console.log("[MetaUI] Lobby buttons created");
}

export function hideLobbyButtons() {
    if (buttonsEl) { buttonsEl.remove(); buttonsEl = null; }
}

// ============================================
// PANEL HELPERS
// ============================================
function openPanel(title) {
    closePanel();
    const bg = document.createElement("div");
    bg.className = "pi-backdrop";
    bg.addEventListener("click", closePanel);
    document.body.appendChild(bg);

    const p = document.createElement("div");
    p.className = "pi-panel";
    p.innerHTML = `<h2>${title}</h2><button class="pi-close" onclick="document.querySelectorAll('.pi-backdrop,.pi-panel').forEach(e=>e.remove())">&times;</button>`;
    document.body.appendChild(p);
    return p;
}

export function closePanel() {
    document.querySelectorAll(".pi-backdrop,.pi-panel").forEach(e => e.remove());
}

// ============================================
// POWERUP SHOP
// ============================================
export function showPowerUpShop() {
    const sm = SM();
    if (!sm) { console.warn("[MetaUI] SaveManager not ready"); return; }

    const p = openPanel(lang() === "ko" ? "⚡ 영구 강화" : "⚡ Power Ups");
    const defs = sm.getPowerUpDefs();
    const gold = sm.getGold();

    const koNames = { damage:"공격력", health:"체력", speed:"이동속도", attackSpeed:"공격속도",
        armor:"방어력", goldBonus:"골드 보너스", xpBonus:"경험치 보너스", luck:"행운" };

    for (const [stat, def] of Object.entries(defs)) {
        const lv = sm.getPowerUpLevel(stat);
        const cost = sm.getPowerUpCost(stat);
        const maxed = lv >= def.maxLevel;
        const canBuy = !maxed && gold >= cost;
        const name = lang() === "ko" ? (koNames[stat] || def.name) : def.name;

        const row = document.createElement("div");
        row.className = "pi-row";
        row.innerHTML = `<div><b style="color:${maxed?'#666':'#fff'}">${name}</b>
            <div style="font-size:11px;color:#999">Lv.${lv}/${def.maxLevel} | ${def.desc}</div></div>`;

        const btn = document.createElement("button");
        btn.className = "pi-buy";
        btn.textContent = maxed ? "MAX" : cost + "G";
        btn.disabled = !canBuy;
        if (canBuy) {
            btn.addEventListener("click", () => {
                sm.upgradePowerUp(stat);
                refreshGold();
                closePanel();
                showPowerUpShop();
            });
        }
        row.appendChild(btn);
        p.appendChild(row);
    }

    const g = document.createElement("div");
    g.className = "pi-gold";
    g.textContent = (lang() === "ko" ? "보유 골드: " : "Gold: ") + gold + "G";
    p.appendChild(g);
}

// ============================================
// ACHIEVEMENTS
// ============================================
export function showAchievements() {
    const sm = SM();
    if (!sm) return;

    const p = openPanel(lang() === "ko" ? "🏆 업적" : "🏆 Achievements");
    const defs = sm.getAchievementDefs();

    const koAch = { first_kill:"첫 처치", kills_100:"백인대장", kills_500:"학살자",
        kills_1000:"대학살", boss_kill:"보스 사냥꾼", level_5:"성장 중",
        level_10:"베테랑", survive_3min:"생존자", survive_5min:"인내",
        gold_500:"부자", all_heroes:"수집가", no_damage_30s:"무적" };

    for (const a of defs) {
        const done = sm.isAchievementUnlocked(a.id);
        const name = lang() === "ko" ? (koAch[a.id] || a.name) : a.name;
        const row = document.createElement("div");
        row.className = "pi-row";
        row.innerHTML = `<div>
            <b style="color:${done?'#2ecc71':'#666'}">${done?'✅':'🔒'} ${name}</b>
            <div style="font-size:11px;color:#999">${a.desc}</div>
        </div><span style="color:#f1c40f;font-weight:bold">${a.reward}G</span>`;
        p.appendChild(row);
    }

    const c = document.createElement("div");
    c.className = "pi-gold";
    c.textContent = `${sm.getUnlockedAchievementCount()} / ${defs.length}`;
    p.appendChild(c);
}

// ============================================
// DAILY REWARD
// ============================================
export function showDailyReward() {
    const sm = SM();
    if (!sm) return;

    const p = openPanel(lang() === "ko" ? "🎁 일일 보상" : "🎁 Daily Rewards");
    const canClaim = sm.canClaimDaily();
    const streak = sm.getDailyStreak();
    const rewards = sm.getDailyRewards();

    for (let i = 0; i < rewards.length; i++) {
        const r = rewards[i];
        const isToday = (canClaim && i === streak) || (!canClaim && i === streak);
        const isPast = canClaim ? i < streak : i <= streak;
        const isClaimable = canClaim && i === streak;

        const row = document.createElement("div");
        row.className = "pi-row";
        row.style.background = isClaimable ? "rgba(46,204,113,0.15)" : "transparent";
        row.style.borderRadius = "6px";

        const icon = isPast && !isClaimable ? "✅" : isClaimable ? "🎁" : "📦";
        const itemText = r.item ? " + " + r.item : "";

        row.innerHTML = `<div>
            <b style="color:${isPast && !isClaimable?'#555':isClaimable?'#2ecc71':'#fff'}">${icon} Day ${i+1}</b>
            <div style="font-size:11px;color:#999">${r.gold}G${itemText}</div>
        </div>`;

        if (isClaimable) {
            const btn = document.createElement("button");
            btn.className = "pi-buy pi-glow";
            btn.textContent = lang() === "ko" ? "받기!" : "Claim!";
            btn.addEventListener("click", () => {
                sm.claimDailyReward();
                refreshGold();
                closePanel();
                showDailyReward();
                // Remove glow from lobby button
                const db = document.querySelector("#pi-buttons button:last-child");
                if (db) db.classList.remove("pi-glow");
            });
            row.appendChild(btn);
        }

        p.appendChild(row);
    }

    const info = document.createElement("div");
    info.className = "pi-gold";
    info.textContent = (lang()==="ko" ? "연속 출석: " : "Streak: ") + (streak + (canClaim ? 0 : 1)) + (lang()==="ko" ? "일" : " days");
    p.appendChild(info);
}

// ============================================
// IN-GAME POPUPS
// ============================================
export function showAchievementPopup(name, reward) {
    addStyles();
    const d = document.createElement("div");
    d.className = "pi-popup";
    d.innerHTML = `🏆 ${name}<br>+${reward}G`;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 3000);
}

export function showRunResult(stats) {
    addStyles();
    const v = stats.bossDefeated;
    const m = Math.floor(stats.time / 60);
    const s = String(stats.time % 60).padStart(2, "0");

    const d = document.createElement("div");
    d.className = "pi-panel";
    d.style.cssText += "text-align:center;pointer-events:none;";
    d.innerHTML = `
        <h2 style="color:${v?'#f1c40f':'#e74c3c'};font-size:24px">${v ? (lang()==="ko"?"승리!":"VICTORY!") : (lang()==="ko"?"패배...":"DEFEAT...")}</h2>
        <div style="font-size:15px;line-height:2.2">
            ${lang()==="ko"?"처치":"Kills"}: <b>${stats.kills}</b><br>
            ${lang()==="ko"?"레벨":"Level"}: <b>${stats.level}</b><br>
            ${lang()==="ko"?"시간":"Time"}: <b>${m}:${s}</b><br>
            ${lang()==="ko"?"골드":"Gold"}: <b style="color:#f1c40f">${stats.goldEarned}G</b>
        </div>`;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 6000);
}

// ============================================
// LIFECYCLE
// ============================================
export function init() { addStyles(); }
export function hideAll() { hideLobbyButtons(); closePanel(); }

console.log("[MetaUI] HTML overlay module loaded!");
