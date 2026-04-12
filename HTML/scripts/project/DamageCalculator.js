// ============================================
// DAMAGE CALCULATOR - Centralized damage with all modifiers
// ============================================

import { state, getRuntime } from "./GameState.js";
import * as PlayerController from "./PlayerController.js";
import * as TomeSystem from "./TomeSystem.js";
import * as DamageEffects from "./DamageEffects.js";
import * as HeroData from "./HeroData.js";

// Nearby damage range (same as swift_blade melee range)
const NEARBY_RANGE = 150;

// ============================================
// MAIN DAMAGE CALCULATION
// ============================================

/**
 * Calculate final damage with all item modifiers
 * @param {number} baseDamage - Base damage before modifiers
 * @param {object} target - Target enemy instance
 * @param {object} options - Additional options
 * @returns {object} { damage, isCrit, isUltraCrit, color }
 */
export function calculateDamage(baseDamage, target, options = {}) {
    if (!state.itemStats) {
        // Item system not initialized, return base damage
        return {
            damage: Math.round(baseDamage),
            isCrit: false,
            isUltraCrit: false,
            color: [1, 0.2, 0.2]  // Normal red
        };
    }

    const stats = state.itemStats;
    let damage = baseDamage;
    let isCrit = false;
    let isUltraCrit = false;
    let damageColor = [1, 0.2, 0.2];  // Default red

    // ============================================
    // STEP 1: Base percentage modifiers (additive)
    // ============================================

    // Power Core + Beer: flat damage percent
    let percentBonus = stats.damagePercent || 0;

    // Viking weapon damage bonus (+30%)
    const heroId = state.selectedHeroId;
    if (heroId && HeroData.hasPassive(heroId, "weaponDamage")) {
        const hero = HeroData.getHero(heroId);
        const weaponDamageBonus = (hero.passiveValue || 0) * 100;  // Convert 0.3 to 30%
        percentBonus += weaponDamageBonus;
    }

    // Damage Tome bonus
    percentBonus += TomeSystem.getDamagePercentBonus();

    // Hoarder's Charm: permanent damage from chests
    percentBonus += stats.chestDamageBonus || 0;

    // Reaper's Contract: permanent damage from kills
    percentBonus += stats.killDamageBonus || 0;

    // ============================================
    // STEP 2: Conditional damage bonuses
    // ============================================

    // Precision Sight: +damage to enemies above 90% HP
    if (stats.highHpDamage > 0 && target && target.instVars) {
        const maxHp = getEnemyMaxHp(target);
        const currentHp = target.instVars.health;
        if (currentHp > maxHp * 0.9) {
            percentBonus += stats.highHpDamage;
        }
    }

    // Tyrant's Bane: +damage to bosses
    if (stats.bossDamage > 0 && target && target.instVars?.isBoss) {
        percentBonus += stats.bossDamage;
    }

    // Brawler's Gauntlet: +damage to nearby enemies
    if (stats.nearbyDamage > 0 && target) {
        const playerPos = PlayerController.getPlayerPosition();
        const dx = target.x - playerPos.x;
        const dy = target.y - playerPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= NEARBY_RANGE) {
            percentBonus += stats.nearbyDamage;
        }
    }

    // Ring of Fortitude: +damage per 100 max HP above base
    if (stats.hpDamageScaling > 0 && state.baseMaxHealth) {
        const hpAboveBase = state.playerMaxHealth - state.baseMaxHealth;
        if (hpAboveBase > 0) {
            const bonusStacks = Math.floor(hpAboveBase / 100);
            percentBonus += bonusStacks * stats.hpDamageScaling;
        }
    }

    // Berserker's Collar: +damage based on missing HP (up to lowHpDamage%)
    if (stats.lowHpDamage > 0) {
        const hpPercent = state.playerHealth / state.playerMaxHealth;
        const missingPercent = 1 - hpPercent;
        // Scale linearly: at 50% HP = 50% of max bonus, at 0% HP = 100% of max bonus
        const berserkerBonus = missingPercent * stats.lowHpDamage;
        percentBonus += berserkerBonus;
    }

    // Apply percentage bonus
    const hadBonus = percentBonus > 0;
    damage *= (1 + percentBonus / 100);

    // ============================================
    // STEP 3: Critical hit check
    // ============================================

    // Total crit chance (hero base + items + tome)
    const heroCritChance = state.playerCritChance || 0;
    const totalCritChance = heroCritChance + (stats.critChance || 0) + TomeSystem.getCritChanceBonus();

    // Hero's crit multiplier (e.g., Cowboy has 3x instead of 2x)
    const heroCritMult = state.playerCritMultiplier || 2.0;

    // Check for Ultra Crit first (Cataclysm Core)
    if (stats.ultraCritChance > 0 && Math.random() * 100 < stats.ultraCritChance) {
        damage *= 20;  // 20x damage!
        isUltraCrit = true;
        isCrit = true;
        damageColor = [1, 0, 1];  // Purple for ultra crit
        console.log("[DamageCalculator] ULTRA CRIT! 20x damage!");
    }
    // Normal crit check (hero + items + Crit Tome)
    else if (totalCritChance > 0 && Math.random() * 100 < totalCritChance) {
        // Use hero's crit multiplier, then add item bonus
        const itemCritBonus = (stats.critMultiplier || 0) - 2.0;  // Item bonus above default 2x
        const finalCritMult = heroCritMult + Math.max(0, itemCritBonus);
        damage *= finalCritMult;
        isCrit = true;
        damageColor = [1, 1, 0];  // Yellow for crit
    }

    // ============================================
    // STEP 4: Round damage (no decimals)
    // ============================================
    damage = Math.round(damage);
    damage = Math.max(1, damage);  // Minimum 1 damage

    // Guarantee at least +1 damage if any bonus was applied
    // This ensures small damage values still show the bonus effect
    if (hadBonus && damage <= baseDamage) {
        damage = baseDamage + 1;
    }

    return {
        damage,
        isCrit,
        isUltraCrit,
        color: damageColor
    };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// Get enemy max HP (estimate based on current HP if not stored)
function getEnemyMaxHp(enemy) {
    if (!enemy || !enemy.instVars) return 100;

    // Check if we have stored max HP
    if (enemy.instVars.maxHealth) {
        return enemy.instVars.maxHealth;
    }

    // Estimate based on enemy type
    if (enemy.instVars.isBoss) {
        return 500 * (state.difficultyMultiplier || 1);
    }
    if (enemy.instVars.xpValue >= 35) {
        // Enemy2 (higher XP)
        return 25 * (state.difficultyMultiplier || 1);
    }
    // Regular enemy
    return 15 * (state.difficultyMultiplier || 1);
}

// ============================================
// CRIT HEAL CHECK (for Leeching Rune)
// ============================================

/**
 * Check if crit should heal player (Leeching Rune)
 * Call this after dealing crit damage
 */
export function checkCritHeal(wasCrit) {
    if (!wasCrit || !state.itemStats) return;

    const healChance = state.itemStats.critHealChance || 0;
    if (healChance <= 0) return;

    if (Math.random() * 100 < healChance) {
        // Heal player (10 HP base)
        const healAmount = 10;
        state.playerHealth = Math.min(state.playerHealth + healAmount, state.playerMaxHealth);

        // Show heal text
        const playerPos = PlayerController.getPlayerPosition();
        spawnHealText(playerPos.x, playerPos.y, healAmount);

        // Update HP bar
        const UIManager = globalThis.UIManager;
        if (UIManager) UIManager.updateHPBar();

        console.log("[DamageCalculator] Leeching Rune healed", healAmount, "HP!");
    }
}

// Spawn heal text
function spawnHealText(x, y, amount) {
    const runtime = getRuntime();

    const text = runtime.objects.hpplusText?.createInstance("Game", x, y - 30);
    if (!text) {
        // Fallback
        const fallback = runtime.objects.GoldText?.createInstance("Game", x, y - 30);
        if (fallback) {
            fallback.text = "+" + amount;
            fallback.colorRgb = [0.2, 1, 0.2];
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
// POISON CHECK (for Serpent's Fang)
// ============================================

/**
 * Check if hit should poison enemy
 * Call this after dealing damage
 */
export function checkPoison(target) {
    if (!state.itemStats || !target || !target.instVars) return false;

    const poisonChance = state.itemStats.poisonChance || 0;
    if (poisonChance <= 0) return false;

    if (Math.random() * 100 < poisonChance) {
        // Import StatusEffects dynamically to avoid circular dependency
        const StatusEffects = globalThis.StatusEffects;
        if (StatusEffects) {
            StatusEffects.applyPoison(target);
        }
        return true;
    }
    return false;
}

// ============================================
// VAMPIRE LIFESTEAL CHECK
// ============================================

/**
 * Check if player is Vampire and should heal on hit
 * Vampire heals 1 HP per hit (doesn't stack, just flat 1 HP)
 */
export function checkVampireLifesteal() {
    const heroId = state.selectedHeroId;
    if (!heroId) return;

    // Check if hero has lifesteal passive
    if (!HeroData.hasPassive(heroId, "lifesteal")) return;

    const hero = HeroData.getHero(heroId);
    const healAmount = hero.passiveValue || 1;  // Default 1 HP

    // Don't overheal
    if (state.playerHealth >= state.playerMaxHealth) return;

    // Heal player
    state.playerHealth = Math.min(state.playerHealth + healAmount, state.playerMaxHealth);

    // Update HP bar
    const UIManager = globalThis.UIManager;
    if (UIManager) UIManager.updateHPBar();
}

// ============================================
// DODGE CHECK (for Zephyr Amulet)
// ============================================

/**
 * Check if player should dodge incoming damage
 * @returns {boolean} True if damage should be dodged
 */
export function checkDodge() {
    // Total dodge chance (items + Evasion Tome)
    const itemDodge = state.itemStats?.dodgeChance || 0;
    const tomeDodge = TomeSystem.getDodgeChanceBonus();
    const totalDodge = itemDodge + tomeDodge;

    if (totalDodge <= 0) return false;

    if (Math.random() * 100 < totalDodge) {
        console.log("[DamageCalculator] DODGE!");
        return true;
    }
    return false;
}

// ============================================
// APPLY DAMAGE TO TARGET (wrapper function)
// ============================================

/**
 * Apply damage to enemy with all item effects
 * @param {object} target - Enemy instance
 * @param {number} baseDamage - Base damage
 * @param {object} options - { skipPoison, customColor }
 */
export function applyDamageToEnemy(target, baseDamage, options = {}) {
    if (!target || !target.instVars) return;

    // Calculate damage with modifiers
    const result = calculateDamage(baseDamage, target, options);

    // Check if target is a boss
    const isBoss = target.instVars.isBoss;

    if (isBoss) {
        // Use BossManager for boss damage (it handles HP bar and death)
        const BossManager = globalThis.BossManager;
        if (BossManager) {
            // BossManager.damageBoss handles health reduction, flashing, and death
            // But we need to show our custom damage text for crits/ultra crits
            target.instVars.health -= result.damage;

            // Show damage text with appropriate color
            const color = options.customColor || result.color;
            spawnDamageText(target.x, target.y, result.damage, color, result.isUltraCrit);

            // Flash boss (handle crit coloring)
            try {
                target.colorRgb = [1, 1, 1];
                setTimeout(() => {
                    try {
                        if (target && target.runtime) target.colorRgb = result.isCrit ? [1, 0.2, 0.2] : [1, 0.3, 0.3];
                    } catch (e) {}
                }, 50);
                setTimeout(() => {
                    try {
                        if (target && target.runtime) target.colorRgb = [1, 1, 1];
                    } catch (e) {}
                }, 400);
            } catch (e) {}

            // Check death - BossManager internal killBoss will be triggered
            if (target.instVars.health <= 0) {
                // Call damageBoss with 0 damage to trigger the death logic
                BossManager.damageBoss(target, 0);
            }
        }
    } else {
        // Regular enemy
        target.instVars.health -= result.damage;

        // Show damage text with appropriate color
        const color = options.customColor || result.color;
        spawnDamageText(target.x, target.y, result.damage, color, result.isUltraCrit);

        // Flash enemy
        flashEnemy(target, result.isCrit);

        // Check if enemy died
        if (target.instVars.health <= 0) {
            const EnemyManager = globalThis.EnemyManager;
            if (EnemyManager) {
                EnemyManager.killEnemy(target);
            }
        }
    }

    // Show text effects for crit/ultra crit
    if (result.isUltraCrit) {
        DamageEffects.showTextEffect(target.x, target.y, "ultra_crit");
    } else if (result.isCrit) {
        DamageEffects.showTextEffect(target.x, target.y, "crit");
    }

    // Check crit heal
    if (result.isCrit) {
        checkCritHeal(true);
    }

    // Check poison (unless skipped, and only for non-bosses)
    if (!options.skipPoison && !isBoss) {
        checkPoison(target);
    }

    // Check Vampire lifesteal (heal 1 HP per hit)
    checkVampireLifesteal();

    return result;
}

// Spawn damage text with custom color
function spawnDamageText(x, y, damage, color, isUltraCrit = false) {
    const runtime = getRuntime();

    const offsetX = (Math.random() - 0.5) * 40;
    const offsetY = (Math.random() - 0.5) * 20;

    const text = runtime.objects.DamageText?.createInstance("Game", x + offsetX, y + offsetY);
    if (!text) return;

    text.text = damage.toString();
    text.opacity = 1;
    text.colorRgb = color;

    // Make ultra crit text bigger
    if (isUltraCrit) {
        text.width *= 1.5;
        text.height *= 1.5;
    }

    const startY = text.y;
    const endY = startY - 100;

    text.behaviors.Tween.startTween("y", endY, 1.0, "default");

    setTimeout(() => {
        try {
            if (text && text.runtime) {
                text.behaviors.Tween.startTween("opacity", 0, 0.4, "default");
            }
        } catch (e) {}
    }, 600);

    setTimeout(() => {
        try {
            if (text && text.runtime) text.destroy();
        } catch (e) {}
    }, 1100);
}

// Flash enemy on hit
function flashEnemy(enemy, isCrit) {
    if (!enemy) return;

    try {
        // White flash first
        enemy.colorRgb = [1, 1, 1];
        setTimeout(() => {
            try {
                if (enemy && enemy.runtime) {
                    // Red flash (brighter for crit)
                    enemy.colorRgb = isCrit ? [1, 0.3, 0.3] : [1, 0.5, 0.5];
                }
            } catch (e) {}
        }, 50);
        setTimeout(() => {
            try {
                if (enemy && enemy.runtime) {
                    // Check if poisoned before resetting color
                    if (enemy.instVars?.isPoisoned) {
                        enemy.colorRgb = [0.5, 1, 0.5];  // Green for poison
                    } else {
                        enemy.colorRgb = [1, 1, 1];  // Normal
                    }
                }
            } catch (e) {}
        }, 400);
    } catch (e) {}
}

console.log("[DamageCalculator] Module loaded!");
