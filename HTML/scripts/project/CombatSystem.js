// ============================================
// COMBAT SYSTEM - Bullets, auto-attack, collisions
// Supports both ranged and melee attack types
// ============================================

import { state, getRuntime } from "./GameState.js";
import * as Config from "./GameConfig.js";
import * as PlayerController from "./PlayerController.js";
import * as EnemyManager from "./EnemyManager.js";
import * as HeroData from "./HeroData.js";
import * as SaveManager from "./SaveManager.js";
import * as MeleeAttack from "./MeleeAttack.js";
import * as ResponsiveScale from "./ResponsiveScale.js";
import * as BossManager from "./BossManager.js";
import * as DamageCalculator from "./DamageCalculator.js";

// Auto-attack based on hero type (called every tick)
// DISABLED: mageBullet will be added as a proper weapon later
export function autoAttack(dt) {
    // Auto-attack disabled - weapons handle all attacks now
    return;
}

// Ranged attack - find nearest enemy and shoot
function performRangedAttack(player) {
    const enemies = EnemyManager.getAllEnemies();
    if (enemies.length === 0) return;

    const heroId = SaveManager.getSelectedHeroId();
    const heroStats = HeroData.getHeroStats(heroId);
    const attackRange = ResponsiveScale.scaleDistance(heroStats.attackRange || Config.ATTACK_RANGE);

    let nearestEnemy = null;
    let nearestDist = Infinity;

    for (const enemy of enemies) {
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < nearestDist && dist < attackRange) {
            nearestDist = dist;
            nearestEnemy = enemy;
        }
    }

    if (nearestEnemy) {
        shootBullet(player, nearestEnemy);
        state.lastAttackTime = 0;
    }
}

// Melee attack - slash in direction of nearest enemy
function performMeleeAttack(player) {
    const enemies = EnemyManager.getAllEnemies();
    if (enemies.length === 0) return;

    const heroId = SaveManager.getSelectedHeroId();
    const heroStats = HeroData.getHeroStats(heroId);
    const attackRange = ResponsiveScale.scaleDistance((heroStats.attackRange || 150) * 2);  // Check wider range for melee

    // Check if any enemy is within melee range
    let hasEnemyInRange = false;
    for (const enemy of enemies) {
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < attackRange) {
            hasEnemyInRange = true;
            break;
        }
    }

    if (hasEnemyInRange) {
        MeleeAttack.performSlash(player);
        state.lastAttackTime = 0;
    }
}

// Shoot bullet at target
export function shootBullet(player, target) {
    const runtime = getRuntime();
    const bullet = runtime.objects.Bullet?.createInstance("Game", player.x, player.y);
    if (!bullet) return;

    // Calculate direction
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
        bullet.instVars.dirX = dx / dist;
        bullet.instVars.dirY = dy / dist;
    }

    // Get hero stats for projectile speed
    const heroId = SaveManager.getSelectedHeroId();
    const heroStats = HeroData.getHeroStats(heroId);

    bullet.instVars.damage = state.playerDamage;
    bullet.instVars.speed = ResponsiveScale.scaleSpeed(heroStats.projectileSpeed || Config.BULLET_SPEED);

    // Set piercing property for Ranger
    if (heroStats.piercing) {
        bullet.instVars.piercing = true;
    }

    // Set bullet animation based on hero type
    const animPrefix = HeroData.getAnimPrefix(heroId);
    const bulletAnim = animPrefix === "archer" ? "archerBullet" : "mageBullet";
    try {
        bullet.setAnimation(bulletAnim);
    } catch (e) {
        // Animation not found, keep default
    }
}

// Update all bullets (called every tick)
export function updateBullets(dt) {
    const runtime = getRuntime();
    const bullets = runtime.objects.Bullet?.getAllInstances() || [];
    const playerPos = PlayerController.getPlayerPosition();

    for (const bullet of bullets) {
        // Move bullet
        bullet.x += bullet.instVars.dirX * bullet.instVars.speed * dt;
        bullet.y += bullet.instVars.dirY * bullet.instVars.speed * dt;

        // Destroy if too far from player (scaled distance)
        const dx = bullet.x - playerPos.x;
        const dy = bullet.y - playerPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > ResponsiveScale.getBulletDestroyDistance()) {
            bullet.destroy();
        }
    }

    // Also update melee slash effects
    MeleeAttack.updateSlashes(dt);
}

// Track which enemies each bullet has hit (for piercing bullets)
const bulletHitMap = new WeakMap();

// Check bullet-enemy collisions (called every tick)
export function checkCollisions() {
    const runtime = getRuntime();
    const bullets = runtime.objects.Bullet?.getAllInstances() || [];
    const enemies = EnemyManager.getAllEnemies();

    for (const bullet of bullets) {
        let bulletHit = false;

        // Get or create hit set for this bullet
        if (!bulletHitMap.has(bullet)) {
            bulletHitMap.set(bullet, new Set());
        }
        const hitEnemies = bulletHitMap.get(bullet);

        // Check enemy collisions
        for (const enemy of enemies) {
            // Skip if already hit this enemy (piercing)
            if (hitEnemies.has(enemy.uid)) continue;

            const dx = bullet.x - enemy.x;
            const dy = bullet.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < Config.BULLET_COLLISION_RADIUS) {
                // Calculate damage with all modifiers (crit, items, etc.)
                const damageResult = DamageCalculator.calculateDamage(bullet.instVars.damage, enemy);
                EnemyManager.damageEnemy(enemy, damageResult.damage, damageResult);
                hitEnemies.add(enemy.uid);  // Mark as hit

                // Only destroy bullet if not piercing
                if (!bullet.instVars.piercing) {
                    bullet.destroy();
                    bulletHit = true;
                    break;
                }
            }
        }

        // Check boss collision (if bullet not destroyed)
        if (!bulletHit) {
            const boss = BossManager.getBoss();
            if (boss) {
                const dx = bullet.x - boss.x;
                const dy = bullet.y - boss.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < Config.BOSS_COLLISION_RADIUS) {
                    // Calculate damage with all modifiers
                    const damageResult = DamageCalculator.calculateDamage(bullet.instVars.damage, boss);
                    BossManager.damageBoss(boss, damageResult.damage, damageResult);

                    if (!bullet.instVars.piercing) {
                        bullet.destroy();
                        bulletHit = true;
                    }
                }
            }
        }

        // === PvP: Check bullet vs remote players ===
        if (!bulletHit) {
            const NM = globalThis.NetworkManager;
            if (NM && NM.isConnected()) {
                const remotePlayers = NM.getRemotePlayers();
                for (const [id, rp] of remotePlayers) {
                    if (!rp.isAlive || !rp.sprite) continue;
                    const dx = bullet.x - rp.sprite.x;
                    const dy = bullet.y - rp.sprite.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 60) {  // PvP hit radius
                        const baseDmg = bullet.instVars?.damage || 10;
                        // Send damage to remote player
                        NM.attackPlayer(id, baseDmg);

                        // Show damage text on their sprite
                        const DamageEffects = globalThis.DamageEffects;
                        if (DamageEffects) {
                            try {
                                const runtime2 = getRuntime();
                                const text = runtime2.objects.DamageText?.createInstance("Game", rp.sprite.x, rp.sprite.y - 30);
                                if (text) {
                                    text.text = String(Math.round(baseDmg));
                                    text.colorRgb = [1, 0.5, 0];  // Orange for PvP
                                    text.opacity = 1;
                                    try {
                                        text.behaviors.Tween.startTween("y", rp.sprite.y - 130, 1.0, "easeoutquad");
                                        text.behaviors.Tween.startTween("opacity", 0, 1.0, "easeoutquad");
                                    } catch (e) {}
                                    setTimeout(() => { try { if (text?.runtime) text.destroy(); } catch (e) {} }, 1100);
                                }
                            } catch (e) {}
                        }

                        // Flash remote player sprite white
                        try {
                            rp.sprite.colorRgb = [1, 1, 1];
                            setTimeout(() => {
                                try { if (rp.sprite?.runtime) rp.sprite.colorRgb = [1, 0.4, 0.4]; } catch (e) {}
                            }, 100);
                        } catch (e) {}

                        if (!bullet.instVars?.piercing) {
                            bullet.destroy();
                            bulletHit = true;
                            break;
                        }
                    }
                }
            }
        }
    }
}

console.log("[CombatSystem] Module loaded!");
