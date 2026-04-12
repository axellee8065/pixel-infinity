// ============================================
// META UI - PowerUp Shop, Achievements, Daily/Weekly
// ============================================

import * as SaveManager from "./SaveManager.js";
import { t } from "./i18n.js";

let runtime = null;
let metaUIElements = [];

export function init(rt) {
    runtime = rt;
}

// ============================================
// POWERUP SHOP (called from lobby)
// ============================================

export function showPowerUpShop() {
    if (!runtime) return;
    closeMeta();

    const vw = runtime.viewportWidth;
    const vh = runtime.viewportHeight;
    const defs = SaveManager.getPowerUpDefs();
    const stats = Object.keys(defs);

    // Dark overlay
    const overlay = createText(vw / 2, vh / 2, "");
    if (overlay) {
        overlay.opacity = 0.7;
        overlay.colorRgb = [0, 0, 0];
    }

    // Title
    const title = createText(vw / 2, 80, t("powerup_title"));
    if (title) title.colorRgb = [1, 0.84, 0];

    // List each PowerUp
    let y = 160;
    for (const stat of stats) {
        const def = defs[stat];
        const level = SaveManager.getPowerUpLevel(stat);
        const cost = SaveManager.getPowerUpCost(stat);
        const maxed = level >= def.maxLevel;
        const name = t("powerup_" + stat) || def.name;

        const line = `${name}  Lv.${level}/${def.maxLevel}  ${def.desc}  ${maxed ? t("powerup_max") : t("powerup_cost") + ": " + cost + "G"}`;
        const txt = createText(vw / 2, y, line);
        if (txt) {
            txt.colorRgb = maxed ? [0.5, 0.5, 0.5] : [1, 1, 1];

            // Store stat name for click handling
            txt._powerUpStat = stat;
            txt._powerUpCost = cost;
            txt._powerUpMaxed = maxed;
        }
        y += 55;
    }

    // Close button hint
    const close = createText(vw / 2, y + 30, "[" + t("tutorial_start").replace(">>>", "").replace("<<<", "").trim() + "]");
    if (close) close.colorRgb = [0.7, 0.7, 0.7];

    // Handle clicks
    const clickHandler = (e) => {
        const layer = runtime.layout.getLayer("UI") || runtime.layout.getLayer(0);
        if (!layer) return;
        const [mx, my] = layer.cssPxToLayer(e.clientX, e.clientY);

        // Check if clicked on a PowerUp line
        for (const el of metaUIElements) {
            if (el._powerUpStat && !el._powerUpMaxed) {
                if (Math.abs(mx - el.x) < 300 && Math.abs(my - el.y) < 25) {
                    if (SaveManager.upgradePowerUp(el._powerUpStat)) {
                        console.log("[MetaUI] Upgraded:", el._powerUpStat);
                        try { runtime.callFunction("playAudio", "confirm", 0, 10); } catch (e2) {}
                        closeMeta();
                        runtime.removeEventListener("pointerdown", clickHandler);
                        showPowerUpShop(); // Refresh
                        return;
                    }
                }
            }
        }

        // Otherwise close
        closeMeta();
        runtime.removeEventListener("pointerdown", clickHandler);
    };

    runtime.addEventListener("pointerdown", clickHandler);
}

// ============================================
// ACHIEVEMENT POPUP
// ============================================

export function showAchievementPopup(achName, reward) {
    if (!runtime) return;

    const vw = runtime.viewportWidth;
    const text = createText(vw / 2, 120, `${t("ach_title")}: ${achName}\n+${reward}G`);
    if (text) {
        text.colorRgb = [1, 0.84, 0];
        try {
            text.behaviors?.Tween?.startTween("y", 20, 2.0, "easeoutquad");
            text.behaviors?.Tween?.startTween("opacity", 0, 2.0, "easeoutquad");
        } catch (e) {}
        setTimeout(() => { try { if (text?.runtime) text.destroy(); } catch (e) {} }, 2100);
    }
}

// ============================================
// DAILY REWARD SCREEN
// ============================================

export function showDailyReward() {
    if (!runtime) return;
    if (!SaveManager.canClaimDaily()) return null;

    const reward = SaveManager.claimDailyReward();
    if (!reward) return null;

    const vw = runtime.viewportWidth;
    const streak = SaveManager.getDailyStreak();

    const text = createText(vw / 2, 150,
        `${t("daily_title")} - ${streak + 1}${t("daily_day")}\n+${reward.gold}G${reward.item ? " + " + t("rarity_" + reward.item) : ""}`
    );
    if (text) {
        text.colorRgb = [0.2, 1, 0.4];
        try {
            text.behaviors?.Tween?.startTween("y", 50, 2.5, "easeoutquad");
            text.behaviors?.Tween?.startTween("opacity", 0, 2.5, "easeoutquad");
        } catch (e) {}
        setTimeout(() => { try { if (text?.runtime) text.destroy(); } catch (e) {} }, 2600);
    }

    try { runtime.callFunction("playAudio", "PowerUp", 0, 10); } catch (e) {}
    return reward;
}

// ============================================
// RUN RESULT SCREEN
// ============================================

export function showRunResult(stats) {
    if (!runtime) return;

    const vw = runtime.viewportWidth;
    const vh = runtime.viewportHeight;
    const isVictory = stats.bossDefeated;

    const lines = [
        isVictory ? t("gameover_victory") : t("gameover_defeat"),
        "",
        `${t("gameover_kills")}: ${stats.kills}`,
        `${t("gameover_level")}: ${stats.level}`,
        `${t("gameover_time")}: ${Math.floor(stats.time / 60)}:${String(stats.time % 60).padStart(2, "0")}`,
        `${t("gameover_gold")}: ${stats.goldEarned}G`
    ].join("\n");

    const text = createText(vw / 2, vh * 0.35, lines);
    if (text) {
        text.colorRgb = isVictory ? [1, 0.84, 0] : [1, 0.3, 0.3];
    }
}

// ============================================
// HELPERS
// ============================================

function createText(x, y, content) {
    if (!runtime) return null;
    const textObjs = ["TitleText", "TimerText", "KillCountText", "DamageText"];
    for (const name of textObjs) {
        const obj = runtime.objects[name];
        if (!obj) continue;
        const layer = runtime.layout.getLayer("UI") || runtime.layout.getLayer(0);
        if (!layer) continue;
        try {
            const inst = obj.createInstance(layer.name, x, y);
            if (inst) {
                inst.text = content;
                inst.opacity = 1;
                metaUIElements.push(inst);
                return inst;
            }
        } catch (e) {}
    }
    return null;
}

export function closeMeta() {
    for (const el of metaUIElements) {
        try { if (el?.runtime) el.destroy(); } catch (e) {}
    }
    metaUIElements = [];
}

console.log("[MetaUI] Module loaded!");
