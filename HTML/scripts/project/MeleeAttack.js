// ============================================
// MELEE ATTACK - Slash attack system for melee heroes
// ============================================

import { state, getRuntime } from "./GameState.js";
import * as Config from "./GameConfig.js";
import * as PlayerController from "./PlayerController.js";
import * as EnemyManager from "./EnemyManager.js";
import * as HeroData from "./HeroData.js";
import * as SaveManager from "./SaveManager.js";
import * as DamageCalculator from "./DamageCalculator.js";

// Track active slash effects
let activeSlashes = [];

// Perform melee slash attack
export function performSlash(player) {
    const runtime = getRuntime();
    const heroId = SaveManager.getSelectedHeroId();
    const heroStats = HeroData.getHeroStats(heroId);

    // Find nearest enemy to determine attack direction
    const enemies = EnemyManager.getAllEnemies();
    let targetAngle = player.angle;

    if (enemies.length > 0) {
        let nearestEnemy = null;
        let nearestDist = Infinity;

        for (const enemy of enemies) {
            const dx = enemy.x - player.x;
            const dy = enemy.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < nearestDist && dist < heroStats.attackRange * 2) {
                nearestDist = dist;
                nearestEnemy = enemy;
            }
        }

        if (nearestEnemy) {
            targetAngle = Math.atan2(nearestEnemy.y - player.y, nearestEnemy.x - player.x);
        }
    }

    // Create slash effect
    const slash = runtime.objects.SlashEffect?.createInstance("Game", player.x, player.y);
    if (slash) {
        slash.angle = targetAngle;
        slash.width = heroStats.slashWidth || 200;
        slash.instVars.damage = state.playerDamage;
        slash.instVars.lifetime = 0.2;
        slash.opacity = 0.8;

        activeSlashes.push({
            instance: slash,
            hitEnemies: new Set(),  // Track enemies already hit by this slash
            lifetime: 0.2
        });
    }

    // Immediately check for enemies in slash arc
    hitEnemiesInSlash(player, targetAngle, heroStats);
}

// Hit all enemies within the slash arc
function hitEnemiesInSlash(player, slashAngle, heroStats) {
    const enemies = EnemyManager.getAllEnemies();
    const slashRange = heroStats.attackRange || 150;
    const slashArcDegrees = heroStats.slashAngle || 90;
    const slashArcRadians = (slashArcDegrees / 2) * (Math.PI / 180);

    for (const enemy of enemies) {
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Check if enemy is in range
        if (dist > slashRange) continue;

        // Check if enemy is within the slash arc
        const enemyAngle = Math.atan2(dy, dx);
        let angleDiff = enemyAngle - slashAngle;

        // Normalize angle difference to -PI to PI
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        // Check if within arc (or full 360 for whirlwind)
        if (slashArcDegrees >= 360 || Math.abs(angleDiff) <= slashArcRadians) {
            // Calculate damage with crit, items etc.
            const damageResult = DamageCalculator.calculateDamage(state.playerDamage, enemy);
            EnemyManager.damageEnemy(enemy, damageResult.damage, damageResult);
        }
    }
}

// Update active slash effects (fade out and destroy)
export function updateSlashes(dt) {
    const runtime = getRuntime();

    for (let i = activeSlashes.length - 1; i >= 0; i--) {
        const slashData = activeSlashes[i];
        slashData.lifetime -= dt;

        if (slashData.instance) {
            // Fade out
            slashData.instance.opacity = Math.max(0, slashData.lifetime / 0.2);

            if (slashData.lifetime <= 0) {
                slashData.instance.destroy();
                activeSlashes.splice(i, 1);
            }
        } else {
            activeSlashes.splice(i, 1);
        }
    }
}

// Clear all active slashes (called on game reset)
export function clearAllSlashes() {
    for (const slashData of activeSlashes) {
        if (slashData.instance) {
            slashData.instance.destroy();
        }
    }
    activeSlashes = [];
}

console.log("[MeleeAttack] Module loaded!");
