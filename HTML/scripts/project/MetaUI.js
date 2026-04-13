// ============================================
// META UI - HTML overlay-based UI system
// PowerUp Shop, Achievements, Daily Rewards, Language
// ============================================

import * as SaveManager from "./SaveManager.js";
import { t, setLanguage, getLanguage } from "./i18n.js";

let overlayContainer = null;

// ============================================
// INIT - Create overlay container
// ============================================
export function init() {
    if (overlayContainer) return;
    overlayContainer = document.createElement("div");
    overlayContainer.id = "meta-overlay";
    overlayContainer.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        pointer-events: none; z-index: 9999; font-family: 'Segoe UI', Arial, sans-serif;
    `;
    document.body.appendChild(overlayContainer);
    console.log("[MetaUI] HTML overlay initialized");
}

// ============================================
// LOBBY BUTTONS - Floating action buttons
// ============================================
let lobbyButtonsCreated = false;

export function showLobbyButtons() {
    if (lobbyButtonsCreated) return;
    init();
    lobbyButtonsCreated = true;

    const btnStyle = `
        pointer-events: auto; cursor: pointer;
        padding: 10px 16px; margin: 6px; border-radius: 12px;
        font-size: 14px; font-weight: bold; border: 2px solid rgba(255,255,255,0.3);
        color: #fff; text-shadow: 1px 1px 2px #000;
        backdrop-filter: blur(4px); transition: transform 0.1s;
        -webkit-tap-highlight-color: transparent;
    `;

    const bar = document.createElement("div");
    bar.id = "lobby-buttons";
    bar.style.cssText = `
        position: fixed; top: 10px; right: 10px;
        display: flex; flex-direction: column; align-items: flex-end;
        pointer-events: auto; z-index: 10000;
    `;

    // Language button
    const langBtn = document.createElement("button");
    langBtn.id = "btn-lang";
    langBtn.textContent = getLanguage() === "ko" ? "🌐 English" : "🌐 한국어";
    langBtn.style.cssText = btnStyle + "background: rgba(52,152,219,0.85);";
    langBtn.onclick = () => {
        const newLang = getLanguage() === "ko" ? "en" : "ko";
        setLanguage(newLang);
        langBtn.textContent = newLang === "ko" ? "🌐 English" : "🌐 한국어";
        // Refresh other buttons
        powerBtn.textContent = newLang === "ko" ? "⚡ 강화" : "⚡ PowerUp";
        achBtn.textContent = newLang === "ko" ? "🏆 업적" : "🏆 Achieve";
        dailyBtn.textContent = newLang === "ko" ? "🎁 일일보상" : "🎁 Daily";
    };
    bar.appendChild(langBtn);

    // PowerUp button
    const powerBtn = document.createElement("button");
    powerBtn.id = "btn-powerup";
    powerBtn.textContent = getLanguage() === "ko" ? "⚡ 강화" : "⚡ PowerUp";
    powerBtn.style.cssText = btnStyle + "background: rgba(231,76,60,0.85);";
    powerBtn.onclick = () => showPowerUpShop();
    bar.appendChild(powerBtn);

    // Achievements button
    const achBtn = document.createElement("button");
    achBtn.id = "btn-ach";
    achBtn.textContent = getLanguage() === "ko" ? "🏆 업적" : "🏆 Achieve";
    achBtn.style.cssText = btnStyle + "background: rgba(155,89,182,0.85);";
    achBtn.onclick = () => showAchievements();
    bar.appendChild(achBtn);

    // Daily button
    const dailyBtn = document.createElement("button");
    dailyBtn.id = "btn-daily";
    dailyBtn.textContent = getLanguage() === "ko" ? "🎁 일일보상" : "🎁 Daily";
    dailyBtn.style.cssText = btnStyle + "background: rgba(46,204,113,0.85);";
    if (SaveManager.canClaimDaily()) {
        dailyBtn.style.animation = "pulse 1s infinite";
        dailyBtn.style.boxShadow = "0 0 15px rgba(46,204,113,0.8)";
    }
    dailyBtn.onclick = () => showDailyReward();
    bar.appendChild(dailyBtn);

    overlayContainer.appendChild(bar);

    // Add pulse animation
    if (!document.getElementById("meta-ui-styles")) {
        const style = document.createElement("style");
        style.id = "meta-ui-styles";
        style.textContent = `
            @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
            .meta-panel { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%);
                background: rgba(0,0,0,0.92); border: 2px solid rgba(255,255,255,0.2);
                border-radius: 16px; padding: 24px; color: #fff; max-width: 90vw; max-height: 80vh;
                overflow-y: auto; pointer-events: auto; z-index: 10001;
                font-family: 'Segoe UI', Arial, sans-serif; min-width: 300px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.5); }
            .meta-panel h2 { text-align: center; margin: 0 0 16px 0; color: #f1c40f; font-size: 20px; }
            .meta-panel .close-btn { position: absolute; top: 8px; right: 12px; font-size: 24px;
                cursor: pointer; color: #aaa; background: none; border: none; }
            .meta-panel .close-btn:hover { color: #fff; }
            .meta-row { display: flex; justify-content: space-between; align-items: center;
                padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1); }
            .meta-row:last-child { border-bottom: none; }
            .meta-btn { padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer;
                font-weight: bold; font-size: 13px; transition: background 0.2s; }
            .meta-btn:active { transform: scale(0.95); }
            .meta-btn-buy { background: #27ae60; color: #fff; }
            .meta-btn-buy:hover { background: #2ecc71; }
            .meta-btn-max { background: #555; color: #999; cursor: default; }
            .meta-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.6); pointer-events: auto; z-index: 10000; }
        `;
        document.head.appendChild(style);
    }
}

export function hideLobbyButtons() {
    const bar = document.getElementById("lobby-buttons");
    if (bar) bar.remove();
    lobbyButtonsCreated = false;
}

// ============================================
// POWERUP SHOP
// ============================================
export function showPowerUpShop() {
    closePanel();
    init();

    const backdrop = createBackdrop();
    const panel = document.createElement("div");
    panel.className = "meta-panel";
    panel.innerHTML = `<h2>${t("powerup_title")}</h2><button class="close-btn">&times;</button>`;
    panel.querySelector(".close-btn").onclick = closePanel;

    const defs = SaveManager.getPowerUpDefs();
    const gold = SaveManager.getGold();

    for (const [stat, def] of Object.entries(defs)) {
        const level = SaveManager.getPowerUpLevel(stat);
        const cost = SaveManager.getPowerUpCost(stat);
        const maxed = level >= def.maxLevel;
        const canBuy = !maxed && gold >= cost;

        const row = document.createElement("div");
        row.className = "meta-row";

        const name = t("powerup_" + stat) || def.name;

        row.innerHTML = `
            <div style="flex:1">
                <div style="font-weight:bold;color:${maxed ? '#888' : '#fff'}">${name}</div>
                <div style="font-size:12px;color:#aaa">Lv.${level}/${def.maxLevel} | ${def.desc}</div>
            </div>
        `;

        const btn = document.createElement("button");
        btn.className = maxed ? "meta-btn meta-btn-max" : "meta-btn meta-btn-buy";
        btn.textContent = maxed ? t("powerup_max") || "MAX" : `${cost}G`;
        btn.style.opacity = canBuy ? "1" : maxed ? "0.5" : "0.6";

        if (canBuy) {
            btn.onclick = () => {
                if (SaveManager.upgradePowerUp(stat)) {
                    closePanel();
                    showPowerUpShop(); // Refresh
                }
            };
        }

        row.appendChild(btn);
        panel.appendChild(row);
    }

    // Gold display
    const goldDiv = document.createElement("div");
    goldDiv.style.cssText = "text-align:center;margin-top:12px;color:#f1c40f;font-size:16px;font-weight:bold;";
    goldDiv.textContent = `${t("hud_gold") || "Gold"}: ${gold}G`;
    panel.appendChild(goldDiv);

    overlayContainer.appendChild(backdrop);
    overlayContainer.appendChild(panel);
}

// ============================================
// ACHIEVEMENTS
// ============================================
export function showAchievements() {
    closePanel();
    init();

    const backdrop = createBackdrop();
    const panel = document.createElement("div");
    panel.className = "meta-panel";
    panel.innerHTML = `<h2>${t("ach_title")}</h2><button class="close-btn">&times;</button>`;
    panel.querySelector(".close-btn").onclick = closePanel;

    const defs = SaveManager.getAchievementDefs();

    for (const ach of defs) {
        const unlocked = SaveManager.isAchievementUnlocked(ach.id);
        const row = document.createElement("div");
        row.className = "meta-row";

        const achName = t("ach_" + ach.id) || ach.name;

        row.innerHTML = `
            <div style="flex:1">
                <div style="font-weight:bold;color:${unlocked ? '#2ecc71' : '#888'}">
                    ${unlocked ? '✅' : '🔒'} ${achName}
                </div>
                <div style="font-size:12px;color:#aaa">${ach.desc}</div>
            </div>
            <div style="color:#f1c40f;font-weight:bold;font-size:14px">${ach.reward}G</div>
        `;
        panel.appendChild(row);
    }

    const countDiv = document.createElement("div");
    countDiv.style.cssText = "text-align:center;margin-top:12px;color:#aaa;font-size:14px;";
    countDiv.textContent = `${SaveManager.getUnlockedAchievementCount()} / ${defs.length}`;
    panel.appendChild(countDiv);

    overlayContainer.appendChild(backdrop);
    overlayContainer.appendChild(panel);
}

// ============================================
// DAILY REWARD
// ============================================
export function showDailyReward() {
    closePanel();
    init();

    const canClaim = SaveManager.canClaimDaily();
    const streak = SaveManager.getDailyStreak();
    const rewards = SaveManager.getDailyRewards();

    const backdrop = createBackdrop();
    const panel = document.createElement("div");
    panel.className = "meta-panel";
    panel.innerHTML = `<h2>${t("daily_title")}</h2><button class="close-btn">&times;</button>`;
    panel.querySelector(".close-btn").onclick = closePanel;

    for (let i = 0; i < rewards.length; i++) {
        const r = rewards[i];
        const isCurrent = i === (canClaim ? streak : streak);
        const isPast = i < streak && !canClaim;
        const isClaimable = i === streak && canClaim;

        const row = document.createElement("div");
        row.className = "meta-row";
        row.style.background = isClaimable ? "rgba(46,204,113,0.15)" : "transparent";
        row.style.borderRadius = "8px";
        row.style.padding = "10px 8px";

        const itemText = r.item ? ` + ${t("rarity_" + r.item) || r.item}` : "";

        row.innerHTML = `
            <div style="flex:1">
                <div style="font-weight:bold;color:${isPast ? '#555' : isClaimable ? '#2ecc71' : '#fff'}">
                    ${isPast ? '✅' : isClaimable ? '🎁' : '📦'} Day ${i + 1}
                </div>
                <div style="font-size:12px;color:#aaa">${r.gold}G${itemText}</div>
            </div>
        `;

        if (isClaimable) {
            const btn = document.createElement("button");
            btn.className = "meta-btn meta-btn-buy";
            btn.textContent = t("daily_claim") || "Claim!";
            btn.style.animation = "pulse 1s infinite";
            btn.onclick = () => {
                SaveManager.claimDailyReward();
                closePanel();
                showDailyReward();
                // Update daily button glow
                const dailyBtn = document.getElementById("btn-daily");
                if (dailyBtn) {
                    dailyBtn.style.animation = "none";
                    dailyBtn.style.boxShadow = "none";
                }
            };
            row.appendChild(btn);
        }

        panel.appendChild(row);
    }

    const streakDiv = document.createElement("div");
    streakDiv.style.cssText = "text-align:center;margin-top:12px;color:#f1c40f;font-size:14px;";
    streakDiv.textContent = `${t("daily_streak") || "Streak"}: ${streak + (canClaim ? 0 : 1)} ${t("daily_day") || "days"}`;
    panel.appendChild(streakDiv);

    overlayContainer.appendChild(backdrop);
    overlayContainer.appendChild(panel);
}

// ============================================
// ACHIEVEMENT POPUP (in-game notification)
// ============================================
export function showAchievementPopup(achName, reward) {
    init();
    const popup = document.createElement("div");
    popup.style.cssText = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        background: linear-gradient(135deg, rgba(241,196,15,0.95), rgba(243,156,18,0.95));
        color: #000; padding: 12px 24px; border-radius: 12px;
        font-weight: bold; font-size: 15px; z-index: 10002;
        pointer-events: none; text-align: center;
        box-shadow: 0 4px 16px rgba(241,196,15,0.4);
        animation: slideDown 0.3s ease-out, fadeOut 0.5s 2.5s forwards;
    `;
    popup.innerHTML = `🏆 ${achName}<br><span style="font-size:13px">+${reward}G</span>`;

    if (!document.getElementById("meta-popup-styles")) {
        const s = document.createElement("style");
        s.id = "meta-popup-styles";
        s.textContent = `
            @keyframes slideDown { from { top: -50px; opacity: 0; } to { top: 20px; opacity: 1; } }
            @keyframes fadeOut { to { opacity: 0; top: -20px; } }
        `;
        document.head.appendChild(s);
    }

    overlayContainer.appendChild(popup);
    setTimeout(() => popup.remove(), 3000);
}

// ============================================
// RUN RESULT SCREEN
// ============================================
export function showRunResult(stats) {
    init();
    const isVictory = stats.bossDefeated;

    const panel = document.createElement("div");
    panel.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%);
        background: rgba(0,0,0,0.9); border: 3px solid ${isVictory ? '#f1c40f' : '#e74c3c'};
        border-radius: 16px; padding: 32px; color: #fff; text-align: center;
        pointer-events: auto; z-index: 10001; min-width: 280px;
        box-shadow: 0 0 30px ${isVictory ? 'rgba(241,196,15,0.3)' : 'rgba(231,76,60,0.3)'};
    `;

    const mins = Math.floor(stats.time / 60);
    const secs = String(stats.time % 60).padStart(2, "0");

    panel.innerHTML = `
        <h2 style="color:${isVictory ? '#f1c40f' : '#e74c3c'};font-size:28px;margin:0 0 20px 0">
            ${isVictory ? t("gameover_victory") : t("gameover_defeat")}
        </h2>
        <div style="font-size:16px;line-height:2">
            ${t("gameover_kills")}: <b>${stats.kills}</b><br>
            ${t("gameover_level")}: <b>${stats.level}</b><br>
            ${t("gameover_time")}: <b>${mins}:${secs}</b><br>
            ${t("gameover_gold")}: <b style="color:#f1c40f">${stats.goldEarned}G</b>
        </div>
    `;

    overlayContainer.appendChild(panel);
    setTimeout(() => { if (panel.parentNode) panel.remove(); }, 8000);
}

// ============================================
// HELPERS
// ============================================
function createBackdrop() {
    const backdrop = document.createElement("div");
    backdrop.className = "meta-backdrop";
    backdrop.onclick = closePanel;
    return backdrop;
}

export function closePanel() {
    if (!overlayContainer) return;
    const backdrops = overlayContainer.querySelectorAll(".meta-backdrop");
    const panels = overlayContainer.querySelectorAll(".meta-panel");
    backdrops.forEach(b => b.remove());
    panels.forEach(p => p.remove());
}

// Hide all meta UI (for game start)
export function hideAll() {
    hideLobbyButtons();
    closePanel();
}

console.log("[MetaUI] Module loaded!");
