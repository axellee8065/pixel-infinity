// ============================================
// STATUS EFFECTS - Poison, debuffs, and other effects
// ============================================

import { state, getRuntime } from "./GameState.js";
import * as DamageEffects from "./DamageEffects.js";

// Poison config
const POISON_DAMAGE = 2;           // Damage per tick
const POISON_TICK_RATE = 0.5;      // Seconds between ticks
const POISON_DURATION = 999;       // Effectively infinite (until death)
const POISON_COLOR = [0.5, 1, 0.5]; // Green tint

// Track poisoned enemies
const poisonedEnemies = new Map();  // uid -> { timer, tickTimer }

// ============================================
// POISON SYSTEM
// ============================================

/**
 * Apply poison to an enemy
 */
export function applyPoison(enemy) {
    if (!enemy || !enemy.instVars || !enemy.uid) return;

    // Skip if already poisoned
    if (enemy.instVars.isPoisoned) return;

    // Mark as poisoned
    enemy.instVars.isPoisoned = true;

    // Add to tracking
    poisonedEnemies.set(enemy.uid, {
        enemy: enemy,
        timer: POISON_DURATION,
        tickTimer: POISON_TICK_RATE
    });

    // Apply green tint
    try {
        enemy.colorRgb = POISON_COLOR;
    } catch (e) {}

    // Show "POISONED" text effect
    DamageEffects.showTextEffect(enemy.x, enemy.y, "poisoned");

    console.log("[StatusEffects] Enemy poisoned!");
}

/**
 * Update all poisoned enemies (called every tick)
 */
export function updatePoisonedEnemies(dt) {
    const runtime = getRuntime();

    for (const [uid, data] of poisonedEnemies.entries()) {
        const enemy = data.enemy;

        // Check if enemy still exists (robust check)
        try {
            if (!enemy || !enemy.runtime) {
                poisonedEnemies.delete(uid);
                continue;
            }
            // Test if we can actually access instVars
            const testHealth = enemy.instVars.health;
            if (testHealth === undefined) {
                poisonedEnemies.delete(uid);
                continue;
            }
        } catch (e) {
            // Enemy was destroyed, remove from tracking
            poisonedEnemies.delete(uid);
            continue;
        }

        // Update tick timer
        data.tickTimer -= dt;

        if (data.tickTimer <= 0) {
            data.tickTimer = POISON_TICK_RATE;

            try {
                // Deal poison damage
                enemy.instVars.health -= POISON_DAMAGE;

                // Show poison damage text (green)
                spawnPoisonDamageText(enemy.x, enemy.y, POISON_DAMAGE);

                // Flash enemy (keep green base)
                enemy.colorRgb = [0.3, 0.8, 0.3];  // Darker green flash
                setTimeout(() => {
                    try {
                        if (enemy && enemy.runtime && enemy.instVars?.isPoisoned) {
                            enemy.colorRgb = POISON_COLOR;  // Back to poison green
                        }
                    } catch (e) {}
                }, 100);

                // Check if enemy died from poison
                if (enemy.instVars.health <= 0) {
                    const EnemyManager = globalThis.EnemyManager;
                    if (EnemyManager) {
                        EnemyManager.killEnemy(enemy);
                    }
                    poisonedEnemies.delete(uid);
                }
            } catch (e) {
                // Enemy was destroyed during damage, remove from tracking
                poisonedEnemies.delete(uid);
                continue;
            }
        }

        // Update poison timer
        data.timer -= dt;
        if (data.timer <= 0) {
            // Poison expired
            try {
                removePoison(enemy);
            } catch (e) {}
            poisonedEnemies.delete(uid);
        }
    }
}

/**
 * Remove poison from enemy
 */
export function removePoison(enemy) {
    if (!enemy || !enemy.instVars) return;

    enemy.instVars.isPoisoned = false;

    // Remove green tint
    try {
        enemy.colorRgb = [1, 1, 1];
    } catch (e) {}

    // Remove from tracking
    if (enemy.uid) {
        poisonedEnemies.delete(enemy.uid);
    }
}

/**
 * Check if enemy is poisoned
 */
export function isPoisoned(enemy) {
    if (!enemy || !enemy.instVars) return false;
    return enemy.instVars.isPoisoned === true;
}

/**
 * Clear all poison (for game reset)
 */
export function clearAllPoison() {
    poisonedEnemies.clear();
}

// Spawn poison damage text
function spawnPoisonDamageText(x, y, damage) {
    const runtime = getRuntime();

    const offsetX = (Math.random() - 0.5) * 30;
    const offsetY = (Math.random() - 0.5) * 15;

    const text = runtime.objects.DamageText?.createInstance("Game", x + offsetX, y + offsetY);
    if (!text) return;

    text.text = damage.toString();
    text.opacity = 1;
    text.colorRgb = [0.2, 0.9, 0.2];  // Green poison color

    const startY = text.y;
    const endY = startY - 60;  // Shorter float for poison

    try {
        text.behaviors.Tween.startTween("y", endY, 0.6, "default");
    } catch (e) {}

    setTimeout(() => {
        try {
            if (text && text.runtime) {
                text.behaviors.Tween.startTween("opacity", 0, 0.3, "default");
            }
        } catch (e) {}
    }, 400);

    setTimeout(() => {
        try {
            if (text && text.runtime) text.destroy();
        } catch (e) {}
    }, 700);
}

// ============================================
// MAIN UPDATE FUNCTION
// ============================================

/**
 * Update all status effects (called every tick from main.js)
 */
export function updateStatusEffects(dt) {
    if (!state.isPlaying || state.isPaused || state.isLevelingUp) return;

    // Update poisoned enemies
    updatePoisonedEnemies(dt);
}

// ============================================
// RESET
// ============================================

/**
 * Reset status effects for new game
 */
export function reset() {
    clearAllPoison();
}

console.log("[StatusEffects] Module loaded!");
