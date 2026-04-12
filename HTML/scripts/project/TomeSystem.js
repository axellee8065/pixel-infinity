// ============================================
// TOME SYSTEM - Stackable passive upgrades
// ============================================

import { state, getRuntime } from "./GameState.js";
import * as UIManager from "./UIManager.js";
import * as PlayerController from "./PlayerController.js";

// ============================================
// TOME DEFINITIONS
// ============================================

export const TOMES = {
    agility_tome: {
        id: "agility_tome",
        name: "Agility Tome",
        description: "+60 Movement Speed",
        animationName: "Agility Tome",
        effect: "speed",
        value: 60,  // +60 speed per stack - HUGE boost!
        maxValue: 1000  // Cap total speed
    },
    silver_tome: {
        id: "silver_tome",
        name: "Silver Tome",
        description: "+3% Silver Drop Chance",
        animationName: "Silver Tome",
        effect: "silverChance",
        value: 3,  // +3% per stack
        maxValue: 50  // Max 50% bonus
    },
    regen_tome: {
        id: "regen_tome",
        name: "Regen Tome",
        description: "+1 HP per Kill",
        animationName: "Regen Tome",
        effect: "regenOnKill",
        value: 1,  // +1 HP per kill per stack
        maxValue: 10  // Max 10 HP per kill
    },
    crit_tome: {
        id: "crit_tome",
        name: "Crit Tome",
        description: "+12% Critical Chance",
        animationName: "Crit Tome",
        effect: "critChance",
        value: 12,  // +12% per stack - HUGE!
        maxValue: 90  // Max 90% crit
    },
    knockback_tome: {
        id: "knockback_tome",
        name: "Knockback Tome",
        description: "+10 Knockback Force",
        animationName: "Knockback Tome",
        effect: "knockback",
        value: 10,  // +10 knockback per stack
        maxValue: 150  // Max knockback
    },
    hp_tome: {
        id: "hp_tome",
        name: "HP Tome",
        description: "+30 Max Health",
        animationName: "HP Tome",
        effect: "maxHp",
        value: 30,  // +30 max HP per stack - tankier!
        maxValue: 800  // No practical cap
    },
    evasion_tome: {
        id: "evasion_tome",
        name: "Evasion Tome",
        description: "+5% Dodge Chance",
        animationName: "Evasion Tome",
        effect: "dodge",
        value: 5,  // +5% per stack - dodge more!
        maxValue: 50  // Max 50% dodge
    },
    gold_tome: {
        id: "gold_tome",
        name: "Gold Tome",
        description: "+3% Gold Drop Chance",
        animationName: "Gold Tome",
        effect: "goldChance",
        value: 3,  // +3% per stack
        maxValue: 50  // Max 50% bonus
    },
    damage_tome: {
        id: "damage_tome",
        name: "Damage Tome",
        description: "+18% All Damage",
        animationName: "Damage Tome",
        effect: "damagePercent",
        value: 18,  // +18% per stack - MASSIVE!
        maxValue: 300  // Max 300% bonus
    },
    cooldown_tome: {
        id: "cooldown_tome",
        name: "Cooldown Tome",
        description: "-10% Weapon Cooldown",
        animationName: "Cooldown Tome",
        effect: "cooldownReduction",
        value: 10,  // -10% cooldown per stack - attack faster!
        maxValue: 60  // Max 60% reduction
    },
    attraction_tome: {
        id: "attraction_tome",
        name: "Attraction Tome",
        description: "+30 Pickup Radius",
        animationName: "Attraction Tome",
        effect: "pickupRadius",
        value: 30,  // +30 radius per stack
        maxValue: 400  // Max radius
    },
    xp_tome: {
        id: "xp_tome",
        name: "XP Tome",
        description: "+25% XP Gain",
        animationName: "XP Tome",
        effect: "xpMultiplier",
        value: 25,  // +25% per stack - level faster!
        maxValue: 200  // Max 200% bonus XP
    }
};

// ============================================
// TOME STATS (accumulated from all tomes)
// ============================================

// Initialize tome stats in state
export function initTomeStats() {
    if (!state.tomeStats) {
        state.tomeStats = {
            speed: 0,
            silverChance: 0,
            regenOnKill: 0,
            critChance: 0,
            knockback: 0,
            maxHp: 0,
            dodge: 0,
            goldChance: 0,
            damagePercent: 0,
            cooldownReduction: 0,
            pickupRadius: 0,
            xpMultiplier: 0
        };
    }
    if (!state.tomeInventory) {
        state.tomeInventory = {};  // tomeId -> count
    }
}

// ============================================
// ACQUIRE TOME
// ============================================

export function acquireTome(tomeId) {
    const tome = TOMES[tomeId];
    if (!tome) {
        console.warn("[TomeSystem] Unknown tome:", tomeId);
        return;
    }

    initTomeStats();

    // Add to inventory
    state.tomeInventory[tomeId] = (state.tomeInventory[tomeId] || 0) + 1;
    const count = state.tomeInventory[tomeId];

    // Recalculate all stats
    recalculateTomeStats();

    console.log("[TomeSystem] Acquired", tome.name, "x" + count);
}

// ============================================
// RECALCULATE STATS
// ============================================

export function recalculateTomeStats() {
    initTomeStats();

    // Reset all stats
    const stats = state.tomeStats;
    for (const key in stats) {
        stats[key] = 0;
    }

    // Calculate from all tomes
    for (const [tomeId, count] of Object.entries(state.tomeInventory)) {
        const tome = TOMES[tomeId];
        if (!tome || count <= 0) continue;

        const totalValue = tome.value * count;
        const cappedValue = Math.min(totalValue, tome.maxValue);

        switch (tome.effect) {
            case "speed":
                stats.speed = cappedValue;
                break;
            case "silverChance":
                stats.silverChance = cappedValue;
                break;
            case "regenOnKill":
                stats.regenOnKill = cappedValue;
                break;
            case "critChance":
                stats.critChance = cappedValue;
                break;
            case "knockback":
                stats.knockback = cappedValue;
                break;
            case "maxHp":
                stats.maxHp = cappedValue;
                // Apply max HP bonus
                applyMaxHpBonus(cappedValue);
                break;
            case "dodge":
                stats.dodge = cappedValue;
                break;
            case "goldChance":
                stats.goldChance = cappedValue;
                break;
            case "damagePercent":
                stats.damagePercent = cappedValue;
                break;
            case "cooldownReduction":
                stats.cooldownReduction = cappedValue;
                break;
            case "pickupRadius":
                stats.pickupRadius = cappedValue;
                break;
            case "xpMultiplier":
                stats.xpMultiplier = cappedValue;
                break;
        }
    }

    console.log("[TomeSystem] Stats recalculated:", stats);
}

// Apply max HP bonus from tome
let lastMaxHpBonus = 0;
function applyMaxHpBonus(newBonus) {
    // Remove old bonus, add new
    const diff = newBonus - lastMaxHpBonus;
    if (diff > 0) {
        state.playerMaxHealth += diff;
        state.playerHealth += diff;  // Also heal the difference
        lastMaxHpBonus = newBonus;
        UIManager.updateHPBar();
    }
}

// ============================================
// GETTERS FOR OTHER SYSTEMS
// ============================================

export function getSpeedBonus() {
    return state.tomeStats?.speed || 0;
}

export function getSilverChanceBonus() {
    return state.tomeStats?.silverChance || 0;
}

export function getRegenOnKill() {
    return state.tomeStats?.regenOnKill || 0;
}

export function getCritChanceBonus() {
    return state.tomeStats?.critChance || 0;
}

export function getKnockback() {
    return state.tomeStats?.knockback || 0;
}

export function getDodgeChanceBonus() {
    return state.tomeStats?.dodge || 0;
}

export function getGoldChanceBonus() {
    return state.tomeStats?.goldChance || 0;
}

export function getDamagePercentBonus() {
    return state.tomeStats?.damagePercent || 0;
}

export function getCooldownReduction() {
    return state.tomeStats?.cooldownReduction || 0;
}

export function getPickupRadiusBonus() {
    return state.tomeStats?.pickupRadius || 0;
}

export function getXpMultiplierBonus() {
    return state.tomeStats?.xpMultiplier || 0;
}

// ============================================
// ON ENEMY KILLED - Regen effect
// ============================================

export function onEnemyKilled() {
    const regenAmount = getRegenOnKill();
    if (regenAmount > 0) {
        // Heal player
        state.playerHealth = Math.min(state.playerHealth + regenAmount, state.playerMaxHealth);
        UIManager.updateHPBar();

        // Show small heal text
        showHealText(regenAmount);
    }
}

function showHealText(amount) {
    const runtime = getRuntime();
    const playerPos = PlayerController.getPlayerPosition();

    // Use HPText for green heal text
    const text = runtime.objects.HPText?.createInstance("Game", playerPos.x + 30, playerPos.y - 20);
    if (!text) return;

    text.text = "+" + amount;
    text.opacity = 1;

    try {
        text.behaviors.Tween.startTween("y", text.y - 40, 0.5, "ease-out");
    } catch(e) {}

    setTimeout(() => {
        try {
            if (text && text.runtime) {
                text.behaviors.Tween.startTween("opacity", 0, 0.3, "default");
            }
        } catch(e) {}
    }, 300);

    setTimeout(() => {
        try {
            if (text && text.runtime) text.destroy();
        } catch(e) {}
    }, 600);
}

// ============================================
// GET RANDOM TOMES FOR LEVEL UP
// ============================================

export function getRandomTomesForLevelUp(count = 3) {
    const allTomeIds = Object.keys(TOMES);
    const shuffled = allTomeIds.sort(() => Math.random() - 0.5);

    const result = [];
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
        const tomeId = shuffled[i];
        const tome = TOMES[tomeId];
        const currentCount = state.tomeInventory?.[tomeId] || 0;

        // Calculate current and new values for display
        const currentValue = currentCount * tome.value;
        const newValue = Math.min((currentCount + 1) * tome.value, tome.maxValue);

        // Format the description with current → new values
        let formattedDesc = tome.description;
        if (currentCount > 0) {
            // Show progression: current → new
            formattedDesc = formatTomeProgression(tome, currentValue, newValue);
        }

        result.push({
            isTome: true,
            tomeId: tomeId,
            name: tome.name,
            desc: formattedDesc,
            currentCount: currentCount,
            currentValue: currentValue,
            newValue: newValue
        });
    }

    return result;
}

// Format tome upgrade progression for display
function formatTomeProgression(tome, currentValue, newValue) {
    const effect = tome.effect;

    switch (effect) {
        case "speed":
            return `Speed: +${currentValue} → +${newValue}`;
        case "silverChance":
            return `Silver Drop: +${currentValue}% → +${newValue}%`;
        case "regenOnKill":
            return `HP/Kill: +${currentValue} → +${newValue}`;
        case "critChance":
            return `Crit: +${currentValue}% → +${newValue}%`;
        case "knockback":
            return `Knockback: +${currentValue} → +${newValue}`;
        case "maxHp":
            return `Max HP: +${currentValue} → +${newValue}`;
        case "dodge":
            return `Dodge: +${currentValue}% → +${newValue}%`;
        case "goldChance":
            return `Gold Drop: +${currentValue}% → +${newValue}%`;
        case "damagePercent":
            return `Damage: +${currentValue}% → +${newValue}%`;
        case "cooldownReduction":
            return `Cooldown: -${currentValue}% → -${newValue}%`;
        case "pickupRadius":
            return `Pickup: +${currentValue} → +${newValue}`;
        case "xpMultiplier":
            return `XP Gain: +${currentValue}% → +${newValue}%`;
        default:
            return tome.description;
    }
}

// ============================================
// RESET
// ============================================

export function reset() {
    state.tomeStats = {
        speed: 0,
        silverChance: 0,
        regenOnKill: 0,
        critChance: 0,
        knockback: 0,
        maxHp: 0,
        dodge: 0,
        goldChance: 0,
        damagePercent: 0,
        cooldownReduction: 0,
        pickupRadius: 0,
        xpMultiplier: 0
    };
    state.tomeInventory = {};
    lastMaxHpBonus = 0;
}

console.log("[TomeSystem] Module loaded with", Object.keys(TOMES).length, "tomes!");
