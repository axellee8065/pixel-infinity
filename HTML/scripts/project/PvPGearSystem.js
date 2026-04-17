// ============================================
// PVP GEAR SYSTEM - Equipment + Enhancement
// ============================================

// ============================================
// GEAR DEFINITIONS
// ============================================
export const PVP_GEARS = {
    thorn_armor: {
        id: "thorn_armor", name: "Thorn Armor",
        desc: "Reflect 10% damage back to attacker",
        effect: "reflect", baseValue: 10, perLevel: 2,
        icon: "🗡️", unlockCost: 200
    },
    pvp_shield: {
        id: "pvp_shield", name: "PvP Shield",
        desc: "Reduce player damage taken by 15%",
        effect: "pvpDefense", baseValue: 15, perLevel: 3,
        icon: "🛡️", unlockCost: 300
    },
    dash_boots: {
        id: "dash_boots", name: "Dash Boots",
        desc: "Move 12% faster in PvP zones",
        effect: "pvpSpeed", baseValue: 12, perLevel: 2,
        icon: "💨", unlockCost: 250
    },
    hunters_mark: {
        id: "hunters_mark", name: "Hunter's Mark",
        desc: "Deal 8% more damage to players",
        effect: "pvpDamage", baseValue: 8, perLevel: 2,
        icon: "🎯", unlockCost: 350
    },
    assassin_blade: {
        id: "assassin_blade", name: "Assassin Blade",
        desc: "First PvP hit deals 50% bonus damage",
        effect: "firstStrike", baseValue: 50, perLevel: 10,
        icon: "💀", unlockCost: 500
    },
    vampiric_touch: {
        id: "vampiric_touch", name: "Vampiric Touch",
        desc: "Heal 20% HP on PvP kill",
        effect: "pvpLifesteal", baseValue: 20, perLevel: 4,
        icon: "❤️", unlockCost: 450
    },
    burn_aura: {
        id: "burn_aura", name: "Burn Aura",
        desc: "Nearby enemies take 2 DPS",
        effect: "pvpBurnAura", baseValue: 2, perLevel: 1,
        icon: "🔥", unlockCost: 400
    },
    stun_strike: {
        id: "stun_strike", name: "Stun Strike",
        desc: "Every 5th hit stuns for 0.3s",
        effect: "pvpStun", baseValue: 5, perLevel: -0.5,  // hits needed decreases
        icon: "⚡", unlockCost: 600
    }
};

// ============================================
// ENHANCE SYSTEM
// ============================================
// Enhancement success rates
const ENHANCE_RATES = {
    1: 100, 2: 100, 3: 95, 4: 90,
    5: 70, 6: 55, 7: 40, 8: 30, 9: 20, 10: 10
};

// Enhancement stone cost per attempt
const STONE_COST = {
    1: 1, 2: 1, 3: 2, 4: 2,
    5: 3, 6: 4, 7: 5, 8: 7, 9: 10, 10: 15
};

// Can item be destroyed on fail? (level 5+)
function canDestroy(currentLevel) {
    return currentLevel >= 5;
}

// Attempt enhancement
export function tryEnhance(gearId) {
    const SM = globalThis.SaveManager;
    if (!SM) return { success: false, reason: "System error" };

    const saveData = SM.getSaveData();
    if (!saveData.pvpGear) saveData.pvpGear = {};
    if (!saveData.enhanceStones) saveData.enhanceStones = 0;

    const gear = saveData.pvpGear[gearId];
    if (!gear) return { success: false, reason: "Gear not owned" };
    if (gear.level >= 10) return { success: false, reason: "Already +10" };

    const nextLevel = gear.level + 1;
    const cost = STONE_COST[nextLevel] || 1;
    if (saveData.enhanceStones < cost) return { success: false, reason: "Need " + cost + " stones (have " + saveData.enhanceStones + ")" };

    // Consume stones
    saveData.enhanceStones -= cost;

    // Roll success
    const rate = ENHANCE_RATES[nextLevel] || 50;
    const roll = Math.random() * 100;

    if (roll < rate) {
        // SUCCESS
        gear.level = nextLevel;
        SM.saveGame();
        return { success: true, level: nextLevel, rate: rate };
    } else {
        // FAIL
        if (canDestroy(gear.level)) {
            // DESTROYED!
            delete saveData.pvpGear[gearId];
            // Unequip if equipped
            if (saveData.pvpGearSlots) {
                for (let i = 0; i < saveData.pvpGearSlots.length; i++) {
                    if (saveData.pvpGearSlots[i] === gearId) saveData.pvpGearSlots[i] = null;
                }
            }
            SM.saveGame();
            return { success: false, destroyed: true, rate: rate };
        } else {
            // Just failed, no destroy
            SM.saveGame();
            return { success: false, destroyed: false, rate: rate };
        }
    }
}

// ============================================
// GEAR MANAGEMENT
// ============================================

export function initGearData(saveData) {
    if (!saveData.pvpGear) saveData.pvpGear = {};  // gearId -> { level }
    if (!saveData.pvpGearSlots) saveData.pvpGearSlots = [null, null, null, null];
    if (saveData.enhanceStones === undefined) saveData.enhanceStones = 0;
}

export function buyGear(gearId) {
    const SM = globalThis.SaveManager;
    if (!SM) return false;
    const saveData = SM.getSaveData();
    initGearData(saveData);

    const def = PVP_GEARS[gearId];
    if (!def) return false;
    if (saveData.pvpGear[gearId]) return false;  // Already owned

    if (saveData.gold < def.unlockCost) return false;
    saveData.gold -= def.unlockCost;
    saveData.pvpGear[gearId] = { level: 0 };  // +0 (unenhanced)
    SM.saveGame();
    return true;
}

export function equipGear(gearId, slot) {
    const SM = globalThis.SaveManager;
    if (!SM) return false;
    const saveData = SM.getSaveData();
    initGearData(saveData);

    if (!saveData.pvpGear[gearId]) return false;
    if (slot < 0 || slot > 3) return false;

    // Unequip from other slot if already equipped
    for (let i = 0; i < 4; i++) {
        if (saveData.pvpGearSlots[i] === gearId) saveData.pvpGearSlots[i] = null;
    }
    saveData.pvpGearSlots[slot] = gearId;
    SM.saveGame();
    return true;
}

export function unequipGear(slot) {
    const SM = globalThis.SaveManager;
    if (!SM) return;
    const saveData = SM.getSaveData();
    initGearData(saveData);
    saveData.pvpGearSlots[slot] = null;
    SM.saveGame();
}

export function addEnhanceStones(count) {
    const SM = globalThis.SaveManager;
    if (!SM) return;
    const saveData = SM.getSaveData();
    if (saveData.enhanceStones === undefined) saveData.enhanceStones = 0;
    saveData.enhanceStones += count;
    SM.saveGame();
}

// ============================================
// GET EQUIPPED GEAR EFFECTS (for combat)
// ============================================
export function getEquippedEffects() {
    const SM = globalThis.SaveManager;
    if (!SM) return {};
    const saveData = SM.getSaveData();
    initGearData(saveData);

    const effects = {};
    for (const gearId of saveData.pvpGearSlots) {
        if (!gearId) continue;
        const def = PVP_GEARS[gearId];
        const gear = saveData.pvpGear[gearId];
        if (!def || !gear) continue;

        const level = gear.level || 0;
        const value = def.baseValue + (def.perLevel * level);
        effects[def.effect] = (effects[def.effect] || 0) + value;
    }
    return effects;
}

export function getEnhanceRate(level) { return ENHANCE_RATES[level + 1] || 0; }
export function getStoneCost(level) { return STONE_COST[level + 1] || 999; }
export function getGearDef(id) { return PVP_GEARS[id] || null; }
export function getAllGearDefs() { return PVP_GEARS; }

console.log("[PvPGearSystem] Module loaded!");
