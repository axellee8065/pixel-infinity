// ============================================
// ITEM SYSTEM - Item definitions, inventory, effects
// ============================================

import { state, getRuntime } from "./GameState.js";
import * as PlayerController from "./PlayerController.js";

// ============================================
// ITEM DEFINITIONS - All 25 items
// ============================================
export const ITEMS = {
    fractured_lens: {
        id: "fractured_lens",
        name: "Fractured Lens",
        description: "Critical hits deal +1x more damage",
        effect: "critMultiplier",
        value: 1,  // +1x crit multiplier per stack (2x -> 3x -> 4x)
        rarity: "rare"
    },
    serpents_fang: {
        id: "serpents_fang",
        name: "Serpent's Fang",
        description: "+10% chance to poison enemies on hit",
        effect: "poisonChance",
        value: 10,  // +10% per stack
        rarity: "rare"
    },
    sages_scroll: {
        id: "sages_scroll",
        name: "Sage's Scroll",
        description: "+8% XP gain from gems",
        effect: "xpMultiplier",
        value: 8,  // +8% per stack
        rarity: "uncommon"
    },
    zephyr_amulet: {
        id: "zephyr_amulet",
        name: "Zephyr Amulet",
        description: "+10% chance to dodge attacks",
        effect: "dodgeChance",
        value: 10,  // +10% per stack
        rarity: "rare"
    },
    pouch_of_plunder: {
        id: "pouch_of_plunder",
        name: "Pouch of Plunder",
        description: "+1 gold from enemy kills",
        effect: "bonusGold",
        value: 1,  // +1 per stack
        rarity: "common"
    },
    power_core: {
        id: "power_core",
        name: "Power Core",
        description: "+10% damage to all attacks",
        effect: "damagePercent",
        value: 10,  // +10% per stack
        rarity: "uncommon"
    },
    stone_of_resilience: {
        id: "stone_of_resilience",
        name: "Stone of Resilience",
        description: "+25 maximum HP",
        effect: "maxHealth",
        value: 25,  // +25 per stack
        rarity: "common"
    },
    winged_sandals: {
        id: "winged_sandals",
        name: "Winged Sandals",
        description: "+15% movement speed",
        effect: "speedPercent",
        value: 15,  // +15% per stack
        rarity: "common"
    },
    precision_sight: {
        id: "precision_sight",
        name: "Precision Sight",
        description: "+20% damage to enemies above 90% HP",
        effect: "highHpDamage",
        value: 20,  // +20% per stack
        rarity: "uncommon"
    },
    tempo_metronome: {
        id: "tempo_metronome",
        name: "Tempo Metronome",
        description: "+8% attack speed",
        effect: "attackSpeedPercent",
        value: 8,  // +8% per stack
        rarity: "uncommon"
    },
    focus_crystal: {
        id: "focus_crystal",
        name: "Focus Crystal",
        description: "+10% critical hit chance",
        effect: "critChance",
        value: 10,  // +10% per stack
        rarity: "rare"
    },
    tyrants_bane: {
        id: "tyrants_bane",
        name: "Tyrant's Bane",
        description: "+15% damage to bosses",
        effect: "bossDamage",
        value: 15,  // +15% per stack
        rarity: "rare"
    },
    key: {
        id: "key",
        name: "Key",
        description: "+10% chance for free chests",
        effect: "freeChestChance",
        value: 10,  // +10% per stack
        rarity: "uncommon"
    },
    hoarders_charm: {
        id: "hoarders_charm",
        name: "Hoarder's Charm",
        description: "+2.5% permanent damage per chest opened",
        effect: "chestDamageBonus",
        value: 2.5,  // +2.5% per chest opened
        rarity: "epic"
    },
    velocity_shroud: {
        id: "velocity_shroud",
        name: "Velocity Shroud",
        description: "+20% speed for 3s when taking damage",
        effect: "damageSpeedBuff",
        value: 20,  // +20% speed buff
        rarity: "rare"
    },
    beer: {
        id: "beer",
        name: "Beer",
        description: "+10% damage to all attacks",
        effect: "damagePercent",
        value: 10,  // +10% per stack (stacks with Power Core)
        rarity: "common"
    },
    campfire: {
        id: "campfire",
        name: "Campfire",
        description: "+5 HP/sec when standing still",
        effect: "idleRegen",
        value: 5,  // +5 HP/sec per stack
        rarity: "uncommon"
    },
    brawlers_gauntlet: {
        id: "brawlers_gauntlet",
        name: "Brawler's Gauntlet",
        description: "+20% damage to nearby enemies",
        effect: "nearbyDamage",
        value: 20,  // +20% per stack
        rarity: "uncommon"
    },
    leeching_rune: {
        id: "leeching_rune",
        name: "Leeching Rune",
        description: "25% chance to heal on critical hits",
        effect: "critHealChance",
        value: 25,  // +25% per stack
        rarity: "epic"
    },
    echoing_tome: {
        id: "echoing_tome",
        name: "Echoing Tome",
        description: "+12% chance for extra XP gem on kill",
        effect: "extraGemChance",
        value: 12,  // +12% per stack
        rarity: "uncommon"
    },
    ring_of_fortitude: {
        id: "ring_of_fortitude",
        name: "Ring of Fortitude",
        description: "+20% damage per 100 max HP above base",
        effect: "hpDamageScaling",
        value: 20,  // +20% per 100 HP
        rarity: "epic"
    },
    berserkers_collar: {
        id: "berserkers_collar",
        name: "Berserker's Collar",
        description: "Deal more damage as HP gets lower (up to +100%)",
        effect: "lowHpDamage",
        value: 100,  // Max +100% at 0 HP
        rarity: "epic"
    },
    reapers_contract: {
        id: "reapers_contract",
        name: "Reaper's Contract",
        description: "+0.1% permanent damage per kill",
        effect: "killDamageBonus",
        value: 0.1,  // +0.1% per kill
        rarity: "legendary"
    },
    cataclysm_core: {
        id: "cataclysm_core",
        name: "Cataclysm Core",
        description: "2% chance for 20x damage (Ultra Crit)",
        effect: "ultraCritChance",
        value: 2,  // 2% chance per stack
        rarity: "legendary"
    },
    magnet: {
        id: "magnet",
        name: "Magnet",
        description: "Pull all XP every 30s (-5s per stack)",
        effect: "magnetPull",
        value: 30,  // Base 30s cooldown
        rarity: "rare"
    }
};

// Get all item IDs as array
export function getAllItemIds() {
    return Object.keys(ITEMS);
}

// Get item data by ID
export function getItemData(itemId) {
    return ITEMS[itemId] || null;
}

// Rarity weights for item drops
const RARITY_WEIGHTS = {
    common: 35,
    uncommon: 30,
    rare: 20,
    epic: 12,
    legendary: 3
};

// Get random item ID (weighted by rarity)
export function getRandomItemId() {
    const ids = getAllItemIds();
    const items = ids.map(id => ({ id, rarity: ITEMS[id]?.rarity || "common" }));

    // Build weighted pool
    const pool = [];
    for (const item of items) {
        const weight = RARITY_WEIGHTS[item.rarity] || 10;
        for (let i = 0; i < weight; i++) {
            pool.push(item.id);
        }
    }

    return pool[Math.floor(Math.random() * pool.length)];
}

// ============================================
// ITEM INVENTORY - Track owned items
// ============================================

// Initialize item inventory in state (called when game starts)
export function initItemInventory() {
    // Reset item inventory
    state.itemInventory = {};

    // Reset item-related stats
    state.itemStats = {
        // Critical system
        critChance: 0,           // Start with 0% - earn crits through upgrades!
        critMultiplier: 2,       // Crit damage multiplier (starts at 2x)

        // Dodge system
        dodgeChance: 0,          // % chance to dodge

        // Damage modifiers (percentages)
        damagePercent: 0,        // Power Core + Beer
        highHpDamage: 0,         // Precision Sight (>90% HP enemies)
        bossDamage: 0,           // Tyrant's Bane
        nearbyDamage: 0,         // Brawler's Gauntlet
        lowHpDamage: 0,          // Berserker's Collar (calculated dynamically)
        hpDamageScaling: 0,      // Ring of Fortitude

        // Permanent bonuses (accumulate over run)
        chestDamageBonus: 0,     // Hoarder's Charm (+2.5% per chest)
        killDamageBonus: 0,      // Reaper's Contract (+0.1% per kill)

        // Ultra crit
        ultraCritChance: 0,      // Cataclysm Core (2% for 20x)

        // Poison
        poisonChance: 0,         // Serpent's Fang

        // XP
        xpMultiplier: 0,         // Sage's Scroll (% bonus)
        extraGemChance: 0,       // Echoing Tome

        // Gold
        bonusGold: 0,            // Pouch of Plunder

        // Speed
        speedPercent: 0,         // Winged Sandals
        attackSpeedPercent: 0,   // Tempo Metronome

        // Health
        bonusMaxHealth: 0,       // Stone of Resilience
        idleRegen: 0,            // Campfire (HP/sec when still)
        critHealChance: 0,       // Leeching Rune

        // Special
        freeChestChance: 0,      // Key
        damageSpeedBuff: 0,      // Velocity Shroud (% speed when hit)
        magnetCooldown: 30,      // Magnet base cooldown
        magnetTimer: 0           // Current magnet timer
    };

    // Track base max health for Ring of Fortitude
    state.baseMaxHealth = state.playerMaxHealth;

    // Velocity Shroud buff tracking
    state.velocityShroudActive = false;
    state.velocityShroudTimer = 0;

    // Campfire tracking
    state.playerStillTimer = 0;
    state.lastPlayerX = 0;
    state.lastPlayerY = 0;

    console.log("[ItemSystem] Item inventory initialized");
}

// Add item to inventory and apply effects
export function addItem(itemId) {
    const item = getItemData(itemId);
    if (!item) {
        console.warn("[ItemSystem] Unknown item:", itemId);
        return false;
    }

    // Add to inventory (increment count)
    if (!state.itemInventory[itemId]) {
        state.itemInventory[itemId] = 0;
    }
    state.itemInventory[itemId]++;

    const count = state.itemInventory[itemId];
    console.log("[ItemSystem] Added item:", item.name, "x" + count);

    // Apply item effect
    applyItemEffect(item, count);

    return true;
}

// Apply item effect based on type
function applyItemEffect(item, count) {
    const stats = state.itemStats;

    switch (item.effect) {
        case "critMultiplier":
            // Fractured Lens: +1x crit multiplier per stack
            stats.critMultiplier = 2 + (count * item.value);
            console.log("[ItemSystem] Crit multiplier now:", stats.critMultiplier + "x");
            break;

        case "poisonChance":
            // Serpent's Fang: +10% poison chance
            stats.poisonChance = count * item.value;
            console.log("[ItemSystem] Poison chance now:", stats.poisonChance + "%");
            break;

        case "xpMultiplier":
            // Sage's Scroll: +8% XP
            stats.xpMultiplier = count * item.value;
            console.log("[ItemSystem] XP multiplier now:", stats.xpMultiplier + "%");
            break;

        case "dodgeChance":
            // Zephyr Amulet: +10% dodge
            stats.dodgeChance = count * item.value;
            console.log("[ItemSystem] Dodge chance now:", stats.dodgeChance + "%");
            break;

        case "bonusGold":
            // Pouch of Plunder: +1 gold
            stats.bonusGold = count * item.value;
            console.log("[ItemSystem] Bonus gold now:", stats.bonusGold);
            break;

        case "damagePercent":
            // Power Core / Beer: +10% damage each
            // Need to sum all items that give damagePercent
            let totalDamagePercent = 0;
            if (state.itemInventory["power_core"]) {
                totalDamagePercent += state.itemInventory["power_core"] * 10;
            }
            if (state.itemInventory["beer"]) {
                totalDamagePercent += state.itemInventory["beer"] * 10;
            }
            stats.damagePercent = totalDamagePercent;
            console.log("[ItemSystem] Damage percent now:", stats.damagePercent + "%");
            break;

        case "maxHealth":
            // Stone of Resilience: +25 max HP
            const oldBonus = stats.bonusMaxHealth;
            stats.bonusMaxHealth = count * item.value;
            const hpDiff = stats.bonusMaxHealth - oldBonus;
            state.playerMaxHealth += hpDiff;
            state.playerHealth += hpDiff;  // Also heal for the bonus
            // Update HP bar
            const UIManager = globalThis.UIManager;
            if (UIManager) UIManager.updateHPBar();
            console.log("[ItemSystem] Max HP now:", state.playerMaxHealth);
            break;

        case "speedPercent":
            // Winged Sandals: +15% speed
            stats.speedPercent = count * item.value;
            console.log("[ItemSystem] Speed percent now:", stats.speedPercent + "%");
            break;

        case "highHpDamage":
            // Precision Sight: +20% to >90% HP enemies
            stats.highHpDamage = count * item.value;
            console.log("[ItemSystem] High HP damage now:", stats.highHpDamage + "%");
            break;

        case "attackSpeedPercent":
            // Tempo Metronome: +8% attack speed
            stats.attackSpeedPercent = count * item.value;
            console.log("[ItemSystem] Attack speed percent now:", stats.attackSpeedPercent + "%");
            break;

        case "critChance":
            // Focus Crystal: +10% crit chance
            stats.critChance = count * item.value;
            console.log("[ItemSystem] Crit chance now:", stats.critChance + "%");
            break;

        case "bossDamage":
            // Tyrant's Bane: +15% to bosses
            stats.bossDamage = count * item.value;
            console.log("[ItemSystem] Boss damage now:", stats.bossDamage + "%");
            break;

        case "freeChestChance":
            // Key: +10% free chest chance
            stats.freeChestChance = count * item.value;
            console.log("[ItemSystem] Free chest chance now:", stats.freeChestChance + "%");
            break;

        case "chestDamageBonus":
            // Hoarder's Charm: effect applied when chest opened
            console.log("[ItemSystem] Hoarder's Charm equipped (+" + item.value + "% damage per chest)");
            break;

        case "damageSpeedBuff":
            // Velocity Shroud: +20% speed when hit
            stats.damageSpeedBuff = count * item.value;
            console.log("[ItemSystem] Damage speed buff now:", stats.damageSpeedBuff + "%");
            break;

        case "idleRegen":
            // Campfire: +5 HP/sec when still
            stats.idleRegen = count * item.value;
            console.log("[ItemSystem] Idle regen now:", stats.idleRegen + " HP/sec");
            break;

        case "nearbyDamage":
            // Brawler's Gauntlet: +20% to nearby enemies
            stats.nearbyDamage = count * item.value;
            console.log("[ItemSystem] Nearby damage now:", stats.nearbyDamage + "%");
            break;

        case "critHealChance":
            // Leeching Rune: +25% heal on crit
            stats.critHealChance = count * item.value;
            console.log("[ItemSystem] Crit heal chance now:", stats.critHealChance + "%");
            break;

        case "extraGemChance":
            // Echoing Tome: +12% extra gem chance
            stats.extraGemChance = count * item.value;
            console.log("[ItemSystem] Extra gem chance now:", stats.extraGemChance + "%");
            break;

        case "hpDamageScaling":
            // Ring of Fortitude: +20% per 100 HP above base
            stats.hpDamageScaling = count * item.value;
            console.log("[ItemSystem] HP damage scaling now:", stats.hpDamageScaling + "% per 100 HP");
            break;

        case "lowHpDamage":
            // Berserker's Collar: up to +100% based on missing HP
            stats.lowHpDamage = count * item.value;
            console.log("[ItemSystem] Low HP damage cap now:", stats.lowHpDamage + "%");
            break;

        case "killDamageBonus":
            // Reaper's Contract: +0.1% per kill (effect applied on kill)
            console.log("[ItemSystem] Reaper's Contract equipped (+" + item.value + "% per kill)");
            break;

        case "ultraCritChance":
            // Cataclysm Core: 2% for 20x damage
            stats.ultraCritChance = count * item.value;
            console.log("[ItemSystem] Ultra crit chance now:", stats.ultraCritChance + "%");
            break;

        case "magnetPull":
            // Magnet: reduce cooldown by 5s per stack after first
            stats.magnetCooldown = 30 - ((count - 1) * 5);
            stats.magnetCooldown = Math.max(5, stats.magnetCooldown);  // Min 5s
            console.log("[ItemSystem] Magnet cooldown now:", stats.magnetCooldown + "s");
            break;
    }
}

// Get item count in inventory
export function getItemCount(itemId) {
    return state.itemInventory[itemId] || 0;
}

// Check if player has item
export function hasItem(itemId) {
    return getItemCount(itemId) > 0;
}

// ============================================
// SPECIAL ITEM EFFECTS (called from other systems)
// ============================================

// Called when chest is opened (for Hoarder's Charm)
export function onChestOpened() {
    if (!hasItem("hoarders_charm")) return;

    const count = getItemCount("hoarders_charm");
    const bonus = count * 2.5;  // +2.5% per item per chest
    state.itemStats.chestDamageBonus += bonus;
    // Cap at 50% max bonus
    state.itemStats.chestDamageBonus = Math.min(state.itemStats.chestDamageBonus, 50);
    console.log("[ItemSystem] Hoarder's Charm: +" + bonus + "% damage (total: " + state.itemStats.chestDamageBonus + "%)");
}

// Called when enemy is killed (for Reaper's Contract)
export function onEnemyKilled() {
    if (!hasItem("reapers_contract")) return;

    const count = getItemCount("reapers_contract");
    const bonus = count * 0.1;  // +0.1% per item per kill
    state.itemStats.killDamageBonus += bonus;
    // Cap at 100% max bonus
    state.itemStats.killDamageBonus = Math.min(state.itemStats.killDamageBonus, 100);
    // Keep damage bonus as whole numbers for display
    state.itemStats.killDamageBonus = Math.round(state.itemStats.killDamageBonus * 10) / 10;
}

// Called when player takes damage (for Velocity Shroud)
export function onPlayerDamaged() {
    if (!hasItem("velocity_shroud")) return;

    // Activate speed buff for 3 seconds
    state.velocityShroudActive = true;
    state.velocityShroudTimer = 3.0;
    console.log("[ItemSystem] Velocity Shroud activated!");
}

// ============================================
// UPDATE FUNCTIONS (called every tick)
// ============================================

// Update item effects that need tick updates
export function updateItems(dt) {
    if (!state.itemStats) return;

    // Update Velocity Shroud timer
    if (state.velocityShroudActive) {
        state.velocityShroudTimer -= dt;
        if (state.velocityShroudTimer <= 0) {
            state.velocityShroudActive = false;
            console.log("[ItemSystem] Velocity Shroud ended");
        }
    }

    // Update Campfire healing
    updateCampfireRegen(dt);

    // Update Magnet
    updateMagnet(dt);
}

// Campfire: heal when standing still
function updateCampfireRegen(dt) {
    if (state.itemStats.idleRegen <= 0) return;

    const playerPos = PlayerController.getPlayerPosition();

    // Check if player moved
    const moved = Math.abs(playerPos.x - state.lastPlayerX) > 1 ||
                  Math.abs(playerPos.y - state.lastPlayerY) > 1;

    state.lastPlayerX = playerPos.x;
    state.lastPlayerY = playerPos.y;

    if (moved) {
        state.playerStillTimer = 0;
        return;
    }

    // Player is still - accumulate time
    state.playerStillTimer += dt;

    // Heal every second while still
    if (state.playerStillTimer >= 1.0) {
        state.playerStillTimer -= 1.0;

        // Heal
        const healAmount = state.itemStats.idleRegen;
        if (state.playerHealth < state.playerMaxHealth) {
            state.playerHealth = Math.min(state.playerHealth + healAmount, state.playerMaxHealth);

            // Show heal text
            spawnHealText(playerPos.x, playerPos.y, healAmount);

            // Update HP bar
            const UIManager = globalThis.UIManager;
            if (UIManager) UIManager.updateHPBar();
        }
    }
}

// Magnet: pull all XP periodically
function updateMagnet(dt) {
    if (!hasItem("magnet")) return;

    state.itemStats.magnetTimer += dt;

    if (state.itemStats.magnetTimer >= state.itemStats.magnetCooldown) {
        state.itemStats.magnetTimer = 0;

        // Pull all XP gems
        const runtime = getRuntime();
        const gems = runtime.objects.Gem?.getAllInstances() || [];
        const playerPos = PlayerController.getPlayerPosition();

        if (gems.length > 0) {
            console.log("[ItemSystem] Magnet activated! Pulling", gems.length, "gems");

            // Set flag to attract all gems at high speed
            for (const gem of gems) {
                // Teleport gems closer to player for instant collection effect
                const dx = playerPos.x - gem.x;
                const dy = playerPos.y - gem.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 100) {
                    // Move gem to within attract range
                    gem.x = playerPos.x + (dx / dist) * -100;
                    gem.y = playerPos.y + (dy / dist) * -100;
                }
            }
        }
    }
}

// Spawn heal text
function spawnHealText(x, y, amount) {
    const runtime = getRuntime();

    const text = runtime.objects.hpplusText?.createInstance("Game", x, y - 30);
    if (!text) {
        // Fallback to GoldText
        const fallback = runtime.objects.GoldText?.createInstance("Game", x, y - 30);
        if (fallback) {
            fallback.text = "+" + amount;
            fallback.colorRgb = [0.2, 1, 0.2];  // Green
            try {
                fallback.behaviors.Tween.startTween("y", y - 90, 0.8, "ease-out");
            } catch (e) {}
            setTimeout(() => {
                try {
                    if (fallback && fallback.runtime) {
                        fallback.behaviors.Tween.startTween("opacity", 0, 0.3, "default");
                    }
                } catch (e) {}
            }, 500);
            setTimeout(() => {
                try {
                    if (fallback && fallback.runtime) fallback.destroy();
                } catch (e) {}
            }, 900);
        }
        return;
    }

    text.text = "+" + amount;
    text.opacity = 1;

    try {
        text.behaviors.Tween.startTween("y", y - 90, 0.8, "ease-out");
    } catch (e) {}

    setTimeout(() => {
        try {
            if (text && text.runtime) {
                text.behaviors.Tween.startTween("opacity", 0, 0.3, "default");
            }
        } catch (e) {}
    }, 500);

    setTimeout(() => {
        try {
            if (text && text.runtime) text.destroy();
        } catch (e) {}
    }, 900);
}

// ============================================
// STAT GETTERS (for DamageCalculator)
// ============================================

// Get current speed multiplier (for PlayerController)
export function getSpeedMultiplier() {
    if (!state.itemStats) return 1;

    let mult = 1 + (state.itemStats.speedPercent / 100);

    // Add Velocity Shroud buff if active
    if (state.velocityShroudActive) {
        mult += state.itemStats.damageSpeedBuff / 100;
    }

    return mult;
}

// Get current attack speed multiplier (for WeaponSystem)
export function getAttackSpeedMultiplier() {
    if (!state.itemStats) return 1;
    return 1 + (state.itemStats.attackSpeedPercent / 100);
}

console.log("[ItemSystem] Module loaded with", Object.keys(ITEMS).length, "items!");
