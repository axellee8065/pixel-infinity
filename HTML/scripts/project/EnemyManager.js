// ============================================
// ENEMY MANAGER - Enemy spawning and AI
// ============================================

import { state, getRuntime } from "./GameState.js";
import * as Config from "./GameConfig.js";
import * as PlayerController from "./PlayerController.js";
import * as XPSystem from "./XPSystem.js";
import * as UIManager from "./UIManager.js";
import * as ResponsiveScale from "./ResponsiveScale.js";
import * as GoldSystem from "./GoldSystem.js";
import * as BossManager from "./BossManager.js";
import * as SilverSystem from "./SilverSystem.js";
import * as DamageCalculator from "./DamageCalculator.js";
import * as ItemSystem from "./ItemSystem.js";
import * as TomeSystem from "./TomeSystem.js";
import * as DamageEffects from "./DamageEffects.js";
import * as WeaponData from "./WeaponData.js";

// Track if guaranteed Fire Mage has spawned at level 5
let fireMageGuaranteedSpawned = false;

// AoE weapons that trigger more enemy spawns
const AOE_WEAPONS = [
    "lightning_staff",  // Chain lightning - all enemies in range
    "soul_aura",        // Persistent AoE
    "fire_staff",       // Explosive fireballs
    "inferno_trail",    // Fire path
    "frost_trail",      // Freeze path
    "blood_ritual",     // AoE pulse
    "spinning_axe",     // Orbit damage
    "cyclone",          // Knockback AoE
    "executioner",      // Piercing line
    "sniper"            // Long range piercing
];

// Calculate player's AoE power multiplier (affects spawn rate and max enemies)
function getPlayerAoEPower() {
    let power = 1.0;

    // Check each equipped weapon
    for (const weaponId of state.equippedWeapons) {
        if (!weaponId) continue;

        const level = state.weaponLevels[weaponId] || 0;
        if (level <= 0) continue;

        // AoE weapons increase spawn intensity (reduced values)
        if (AOE_WEAPONS.includes(weaponId)) {
            // Each level adds 5% more power, base 10% for having the weapon
            power += 0.1 + (level * 0.05);
        }
    }

    // Also factor in player level (higher level = more enemies)
    power += state.playerLevel * 0.03;

    // Cap at 2.5x max spawn intensity
    return Math.min(power, 2.5);
}

// Reset guaranteed spawn flag (call when starting new game)
export function resetGuaranteedSpawns() {
    fireMageGuaranteedSpawned = false;
}

// Calculate enemy HP scaling (level 4+: +30% HP per level)
function getEnemyHPMultiplier() {
    if (state.playerLevel < 4) return 1.0;
    return 1.0 + ((state.playerLevel - 3) * 0.3);  // +30% per level after 3
}

// Calculate enemy damage scaling (level 4+: +25% damage per level)
// Uses max(time, level) instead of multiply to prevent death-wall
function getEnemyDamageMultiplier() {
    if (state.playerLevel < 4) return state.difficultyMultiplier;
    const levelBonus = 1.0 + ((state.playerLevel - 3) * 0.25);  // +25% per level after 3
    return Math.max(state.difficultyMultiplier, levelBonus);  // max instead of multiply
}

// Calculate enemy speed scaling (level 4+: +10% speed per level)
function getEnemySpeedMultiplier() {
    if (state.playerLevel < 4) return 1.0;
    return 1.0 + ((state.playerLevel - 3) * 0.1);  // +10% per level after 3
}

// Spawn enemies (called every tick)
export function spawnEnemies(dt) {
    // Don't spawn during rest period (after boss death)
    if (BossManager.isRestPeriod()) return;

    // Don't spawn during boss fight - 1v1 only!
    if (BossManager.isBossActive()) return;

    state.lastSpawnTime += dt;

    // Guaranteed Fire Mage spawn at level 3 (one time only)
    if (state.playerLevel >= 3 && !fireMageGuaranteedSpawned) {
        fireMageGuaranteedSpawned = true;
        const runtime = getRuntime();
        const playerPos = PlayerController.getPlayerPosition();
        if (playerPos.x !== 0 || playerPos.y !== 0) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 400;
            const spawnX = playerPos.x + Math.cos(angle) * distance;
            const spawnY = playerPos.y + Math.sin(angle) * distance;
            spawnEnemy7(runtime, spawnX, spawnY);
            console.log("[EnemyManager] Guaranteed Fire Mage spawned at level 3!");
        }
    }

    // Calculate player's AoE power for dynamic spawning
    const aoePower = getPlayerAoEPower();

    // Apply spawn rate boost based on player power (more AoE = faster spawns)
    let effectiveSpawnRate = state.enemySpawnRate / aoePower;  // Divide to spawn faster
    if (state.playerLevel >= Config.ENEMY2_MIN_LEVEL) {
        effectiveSpawnRate *= Config.LEVEL3_SPAWN_BOOST;
    }
    // Level 4+ spawn boost - enemies spawn much faster
    if (state.playerLevel >= 4) {
        effectiveSpawnRate *= 0.6;  // 40% faster spawns after level 4
    }
    // Minimum spawn rate to avoid overwhelming
    effectiveSpawnRate = Math.max(effectiveSpawnRate, 0.15);

    if (state.lastSpawnTime < effectiveSpawnRate) return;
    state.lastSpawnTime = 0;

    const runtime = getRuntime();

    // Dynamic max enemies based on player power
    const dynamicMaxEnemies = Math.floor(state.maxEnemies * aoePower);
    const cappedMaxEnemies = Math.min(dynamicMaxEnemies, 150);  // Hard cap at 150

    // Check max enemies (count all types)
    const enemy1Count = runtime.objects.Enemy?.getAllInstances()?.length || 0;
    const enemy2Count = runtime.objects.Enemy2?.getAllInstances()?.length || 0;
    const enemy3Count = runtime.objects.Enemy3?.getAllInstances()?.length || 0;
    const enemy4Count = runtime.objects.Enemy4?.getAllInstances()?.length || 0;
    const enemy5Count = runtime.objects.Enemy5?.getAllInstances()?.length || 0;
    const enemy6Count = runtime.objects.Enemy6?.getAllInstances()?.length || 0;
    const enemy7Count = runtime.objects.Enemy7?.getAllInstances()?.length || 0;
    const enemy8Count = runtime.objects.Enemy8?.getAllInstances()?.length || 0;
    const totalEnemies = enemy1Count + enemy2Count + enemy3Count + enemy4Count + enemy5Count + enemy6Count + enemy7Count + enemy8Count;

    // Spawn multiple enemies at once if player is very powerful (batch spawning)
    const enemiesToSpawn = aoePower >= 2.0 ? Math.floor(aoePower) : 1;

    if (totalEnemies >= cappedMaxEnemies) return;

    // Get player position
    const playerPos = PlayerController.getPlayerPosition();
    if (playerPos.x === 0 && playerPos.y === 0) return;

    // Decide which enemy types can spawn based on player level
    const canSpawnEnemy6 = state.playerLevel >= Config.ENEMY6_MIN_LEVEL;  // Level 3 (very rare)
    const canSpawnEnemy5 = state.playerLevel >= Config.ENEMY5_MIN_LEVEL;  // Level 4
    const canSpawnEnemy7 = state.playerLevel >= Config.ENEMY7_MIN_LEVEL;  // Level 5 (fire mage)
    const canSpawnEnemy8 = state.playerLevel >= Config.ENEMY8_MIN_LEVEL;  // Level 8 (tank)
    const canSpawnEnemy2 = state.playerLevel >= Config.ENEMY2_MIN_LEVEL;  // Level 12
    const canSpawnEnemy4 = state.playerLevel >= Config.ENEMY4_MIN_LEVEL;  // Level 5
    const canSpawnEnemy3 = state.playerLevel >= Config.ENEMY3_MIN_LEVEL;  // Level 14

    // Spawn multiple enemies if player is powerful (batch spawning)
    for (let spawnIndex = 0; spawnIndex < enemiesToSpawn; spawnIndex++) {
        // Check if we've hit the cap mid-batch
        if (totalEnemies + spawnIndex >= cappedMaxEnemies) break;

        // Spawn at random position outside viewport (scaled distances)
        const angle = Math.random() * Math.PI * 2;
        const minDist = ResponsiveScale.getEnemySpawnDistanceMin();
        const maxDist = ResponsiveScale.getEnemySpawnDistanceMax();
        const distance = minDist + Math.random() * (maxDist - minDist);

        const spawnX = playerPos.x + Math.cos(angle) * distance;
        const spawnY = playerPos.y + Math.sin(angle) * distance;

        // Roll for enemy type
        const roll = Math.random();
        let cumChance = 0;

        // Enemy6 (Heavy Brute) - Level 3+ (very rare 2%)
        if (canSpawnEnemy6 && roll < (cumChance += Config.ENEMY6_SPAWN_CHANCE)) {
            spawnEnemy6(runtime, spawnX, spawnY);
        }
        // Enemy7 (Fire Mage) - Level 5+ (very rare 1.5%)
        else if (canSpawnEnemy7 && roll < (cumChance += Config.ENEMY7_SPAWN_CHANCE)) {
            spawnEnemy7(runtime, spawnX, spawnY);
        }
        // Enemy8 (Tank) - Level 8+ (rare 3%)
        else if (canSpawnEnemy8 && roll < (cumChance += Config.ENEMY8_SPAWN_CHANCE)) {
            spawnEnemy8(runtime, spawnX, spawnY);
        }
        // Enemy3 (Bat) - Level 14+
        else if (canSpawnEnemy3 && roll < (cumChance += Config.ENEMY3_SPAWN_CHANCE)) {
            spawnEnemy3(runtime, spawnX, spawnY);
        }
        // Enemy4 (Archer) - Level 5+
        else if (canSpawnEnemy4 && roll < (cumChance += Config.ENEMY4_SPAWN_CHANCE)) {
            spawnEnemy4(runtime, spawnX, spawnY);
        }
        // Enemy2 (Goblin Warrior) - Level 12+
        else if (canSpawnEnemy2 && roll < (cumChance += Config.ENEMY2_SPAWN_CHANCE)) {
            spawnEnemy2(runtime, spawnX, spawnY);
        }
        // Enemy5 (Fast Melee) - Level 4+
        else if (canSpawnEnemy5 && roll < (cumChance += Config.ENEMY5_SPAWN_CHANCE)) {
            spawnEnemy5(runtime, spawnX, spawnY);
        }
        // Enemy1 (Regular) - Always
        else {
            spawnEnemy1(runtime, spawnX, spawnY);
        }
    }  // End of batch spawn loop
}

// Spawn helper functions
function spawnEnemy1(runtime, x, y) {
    const enemy = runtime.objects.Enemy?.createInstance("Game", x, y, true);
    if (enemy) {
        const hpMult = getEnemyHPMultiplier();
        const maxHp = Config.ENEMY_BASE_HEALTH * hpMult;
        enemy.instVars.health = maxHp;
        enemy.instVars.maxHealth = maxHp;
        const speedMult = getEnemySpeedMultiplier();
        enemy.instVars.speed = (ResponsiveScale.getEnemyBaseSpeed() +
            Math.random() * ResponsiveScale.getEnemySpeedVariance()) * speedMult;
        enemy.instVars.damage = Config.ENEMY_BASE_DAMAGE * getEnemyDamageMultiplier();
        enemy.instVars.xpValue = Config.ENEMY_XP_VALUE;
        enemy.instVars.isPoisoned = false;
    }
}

function spawnEnemy2(runtime, x, y) {
    const enemy = runtime.objects.Enemy2?.createInstance("Game", x, y, true);
    if (enemy) {
        const hpMult = getEnemyHPMultiplier();
        const maxHp = Config.ENEMY2_BASE_HEALTH * hpMult;
        enemy.instVars.health = maxHp;
        enemy.instVars.maxHealth = maxHp;
        const speedMult = getEnemySpeedMultiplier();
        enemy.instVars.speed = ResponsiveScale.scaleSpeed((Config.ENEMY2_BASE_SPEED +
            Math.random() * Config.ENEMY2_SPEED_VARIANCE) * speedMult);
        enemy.instVars.damage = Config.ENEMY2_BASE_DAMAGE * getEnemyDamageMultiplier();
        enemy.instVars.xpValue = Config.ENEMY2_XP_VALUE;
        enemy.instVars.isPoisoned = false;
    }
}

function spawnEnemy3(runtime, x, y) {
    const enemy = runtime.objects.Enemy3?.createInstance("Game", x, y, true);
    if (enemy) {
        const hpMult = getEnemyHPMultiplier();
        const maxHp = Config.ENEMY3_BASE_HEALTH * hpMult;
        enemy.instVars.health = maxHp;
        enemy.instVars.maxHealth = maxHp;
        const speedMult = getEnemySpeedMultiplier();
        enemy.instVars.speed = ResponsiveScale.scaleSpeed((Config.ENEMY3_BASE_SPEED +
            Math.random() * Config.ENEMY3_SPEED_VARIANCE) * speedMult);
        enemy.instVars.damage = Config.ENEMY3_BASE_DAMAGE * getEnemyDamageMultiplier();
        enemy.instVars.xpValue = Config.ENEMY3_XP_VALUE;
        enemy.instVars.isPoisoned = false;
    }
}

function spawnEnemy4(runtime, x, y) {
    const enemy = runtime.objects.Enemy4?.createInstance("Game", x, y, true);
    if (enemy) {
        const hpMult = getEnemyHPMultiplier();
        const maxHp = Config.ENEMY4_BASE_HEALTH * hpMult;
        enemy.instVars.health = maxHp;
        enemy.instVars.maxHealth = maxHp;
        const speedMult = getEnemySpeedMultiplier();
        enemy.instVars.speed = ResponsiveScale.scaleSpeed((Config.ENEMY4_BASE_SPEED +
            Math.random() * Config.ENEMY4_SPEED_VARIANCE) * speedMult);
        enemy.instVars.damage = Config.ENEMY4_BASE_DAMAGE;  // Fixed damage, no scaling
        enemy.instVars.xpValue = Config.ENEMY4_XP_VALUE;
        enemy.instVars.isPoisoned = false;
        enemy.instVars.attackCooldown = 0;  // Ready to attack
        enemy.instVars.isAttacking = false;
        // Start with Walk animation
        try { enemy.setAnimation("Walk"); } catch (e) { }
    }
}

function spawnEnemy5(runtime, x, y) {
    const enemy = runtime.objects.Enemy5?.createInstance("Game", x, y, true);
    if (enemy) {
        const hpMult = getEnemyHPMultiplier();
        const maxHp = Config.ENEMY5_BASE_HEALTH * hpMult;
        enemy.instVars.health = maxHp;
        enemy.instVars.maxHealth = maxHp;
        const speedMult = getEnemySpeedMultiplier();
        enemy.instVars.speed = ResponsiveScale.scaleSpeed((Config.ENEMY5_BASE_SPEED +
            Math.random() * Config.ENEMY5_SPEED_VARIANCE) * speedMult);
        enemy.instVars.damage = Config.ENEMY5_BASE_DAMAGE * getEnemyDamageMultiplier();
        enemy.instVars.xpValue = Config.ENEMY5_XP_VALUE;
        enemy.instVars.isPoisoned = false;
    }
}

function spawnEnemy6(runtime, x, y) {
    const enemy = runtime.objects.Enemy6?.createInstance("Game", x, y, true);
    if (enemy) {
        const hpMult = getEnemyHPMultiplier();
        const maxHp = Config.ENEMY6_BASE_HEALTH * hpMult;
        enemy.instVars.health = maxHp;
        enemy.instVars.maxHealth = maxHp;
        const speedMult = getEnemySpeedMultiplier();
        enemy.instVars.speed = ResponsiveScale.scaleSpeed((Config.ENEMY6_BASE_SPEED +
            Math.random() * Config.ENEMY6_SPEED_VARIANCE) * speedMult);
        enemy.instVars.damage = Config.ENEMY6_BASE_DAMAGE * getEnemyDamageMultiplier();
        enemy.instVars.xpValue = Config.ENEMY6_XP_VALUE;
        enemy.instVars.isPoisoned = false;
    }
}

function spawnEnemy7(runtime, x, y) {
    const enemy = runtime.objects.Enemy7?.createInstance("Game", x, y, true);
    if (enemy) {
        const hpMult = getEnemyHPMultiplier();
        const maxHp = Config.ENEMY7_BASE_HEALTH * hpMult;
        enemy.instVars.health = maxHp;
        enemy.instVars.maxHealth = maxHp;
        const speedMult = getEnemySpeedMultiplier();
        enemy.instVars.speed = ResponsiveScale.scaleSpeed((Config.ENEMY7_BASE_SPEED +
            Math.random() * Config.ENEMY7_SPEED_VARIANCE) * speedMult);
        enemy.instVars.damage = Config.ENEMY7_BASE_DAMAGE * getEnemyDamageMultiplier();
        enemy.instVars.xpValue = Config.ENEMY7_XP_VALUE;
        enemy.instVars.isPoisoned = false;
    }
}

function spawnEnemy8(runtime, x, y) {
    const enemy = runtime.objects.Enemy8?.createInstance("Game", x, y, true);
    if (enemy) {
        const hpMult = getEnemyHPMultiplier();
        const maxHp = Config.ENEMY8_BASE_HEALTH * hpMult;  // 200 HP - Very tanky!
        enemy.instVars.health = maxHp;
        enemy.instVars.maxHealth = maxHp;
        const speedMult = getEnemySpeedMultiplier();
        enemy.instVars.speed = ResponsiveScale.scaleSpeed((Config.ENEMY8_BASE_SPEED +
            Math.random() * Config.ENEMY8_SPEED_VARIANCE) * speedMult);
        enemy.instVars.damage = Config.ENEMY8_BASE_DAMAGE * getEnemyDamageMultiplier();
        enemy.instVars.xpValue = Config.ENEMY8_XP_VALUE;
        enemy.instVars.isPoisoned = false;
    }
}

// Update all enemies (called every tick)
export function updateEnemies(dt) {
    const runtime = getRuntime();
    const playerPos = PlayerController.getPlayerPosition();
    if (playerPos.x === 0 && playerPos.y === 0) return;

    // Get all melee enemy types (Enemy4 handled separately)
    const enemies1 = runtime.objects.Enemy?.getAllInstances() || [];
    const enemies2 = runtime.objects.Enemy2?.getAllInstances() || [];
    const enemies3 = runtime.objects.Enemy3?.getAllInstances() || [];
    const enemies5 = runtime.objects.Enemy5?.getAllInstances() || [];
    const enemies6 = runtime.objects.Enemy6?.getAllInstances() || [];
    const enemies8 = runtime.objects.Enemy8?.getAllInstances() || [];  // Tank enemy
    const meleeEnemies = [...enemies1, ...enemies2, ...enemies3, ...enemies5, ...enemies6, ...enemies8];

    // Update melee enemies with type-specific AI
    const gameTime = state.gameTime || 0;
    for (const enemy of meleeEnemies) {
        const dx = playerPos.x - enemy.x;
        const dy = playerPos.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            const speed = enemy.instVars.speed;
            let moveX = dx / dist;
            let moveY = dy / dist;

            // === Enemy3 (Bat): Zigzag movement ===
            if (enemy.objectType?.name === "Enemy3") {
                const zigzag = Math.sin(gameTime * 6 + enemy.uid * 0.7) * 0.6;
                // Perpendicular offset
                moveX += (-dy / dist) * zigzag;
                moveY += (dx / dist) * zigzag;
                const len = Math.sqrt(moveX * moveX + moveY * moveY);
                if (len > 0) { moveX /= len; moveY /= len; }
            }

            // === Enemy6 (Brute): Charge when close ===
            if (enemy.objectType?.name === "Enemy6") {
                if (dist < 300) {
                    enemy.x += moveX * speed * 2.0 * dt;
                    enemy.y += moveY * speed * 2.0 * dt;
                } else {
                    enemy.x += moveX * speed * dt;
                    enemy.y += moveY * speed * dt;
                }
            }
            // === Enemy8 (Tank): Buff aura — nearby enemies get +30% speed ===
            else if (enemy.objectType?.name === "Enemy8") {
                enemy.x += moveX * speed * dt;
                enemy.y += moveY * speed * dt;
                // Apply buff aura to nearby enemies (radius 200)
                for (const other of meleeEnemies) {
                    if (other === enemy) continue;
                    const adx = other.x - enemy.x;
                    const ady = other.y - enemy.y;
                    if (adx * adx + ady * ady < 200 * 200) {
                        // Temporary speed boost (visual: slight red tint)
                        if (!other.instVars._buffed) {
                            other.instVars.speed *= 1.3;
                            other.instVars._buffed = true;
                            try { other.colorRgb = [1, 0.7, 0.7]; } catch (e) {}
                        }
                    }
                }
            }
            // === Enemy2 (Goblin): Evasion — sidestep when player faces them ===
            else if (enemy.objectType?.name === "Enemy2") {
                // Strafe perpendicular when close (evasive movement)
                if (dist < 400) {
                    const strafeDir = (enemy.uid % 2 === 0) ? 1 : -1;
                    const strafeFactor = Math.sin(gameTime * 3 + enemy.uid) * 0.5 * strafeDir;
                    const evadeX = moveX + (-dy / dist) * strafeFactor;
                    const evadeY = moveY + (dx / dist) * strafeFactor;
                    const eLen = Math.sqrt(evadeX * evadeX + evadeY * evadeY);
                    enemy.x += (evadeX / eLen) * speed * 1.2 * dt;
                    enemy.y += (evadeY / eLen) * speed * 1.2 * dt;
                } else {
                    enemy.x += moveX * speed * dt;
                    enemy.y += moveY * speed * dt;
                }
            }
            // === Default movement ===
            else {
                enemy.x += moveX * speed * dt;
                enemy.y += moveY * speed * dt;
            }

            // Face player
            if (dx < 0) {
                enemy.width = -Math.abs(enemy.width);
            } else {
                enemy.width = Math.abs(enemy.width);
            }
        }

        // Check if touching player (scaled collision radius)
        if (dist < ResponsiveScale.getEnemyCollisionRadius()) {
            const damage = enemy.instVars.damage * dt;
            if (DamageCalculator.checkDodge()) {
                showDodgeText();
            } else {
                PlayerController.damagePlayer(damage);
            }
        }
    }

    // Update Enemy4 (Archer) - ranged behavior
    updateArcherEnemies(dt, playerPos);
}

// Update Enemy4 (Archer) AI
function updateArcherEnemies(dt, playerPos) {
    const runtime = getRuntime();
    const archers = runtime.objects.Enemy4?.getAllInstances() || [];

    for (const archer of archers) {
        const dx = playerPos.x - archer.x;
        const dy = playerPos.y - archer.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Face player (only when not attacking)
        // Note: Archer sprite faces LEFT by default, so mirror logic is reversed
        if (!archer.instVars.isAttacking) {
            if (dx > 0) {
                archer.width = -Math.abs(archer.width);  // Player on right, flip to face right
            } else {
                archer.width = Math.abs(archer.width);   // Player on left, normal (faces left)
            }
        }

        // Update attack cooldown
        if (archer.instVars.attackCooldown > 0) {
            archer.instVars.attackCooldown -= dt;
        }

        // Handle attack animation timer
        if (archer.instVars.isAttacking) {
            // Initialize attack timer if not set
            if (!archer.instVars.attackTimer) {
                archer.instVars.attackTimer = 0;
                archer.instVars.hasFired = false;
            }

            archer.instVars.attackTimer += dt;

            // Fire at 0.4 seconds
            if (!archer.instVars.hasFired && archer.instVars.attackTimer >= 0.4) {
                archer.instVars.hasFired = true;
                fireArcherProjectile(archer, playerPos);
            }

            // End attack at 1.0 seconds
            if (archer.instVars.attackTimer >= 1.0) {
                archer.instVars.isAttacking = false;
                archer.instVars.attackTimer = 0;
                archer.instVars.hasFired = false;
                archer.instVars.attackCooldown = Config.ENEMY4_ATTACK_COOLDOWN;
                try { archer.setAnimation("Walk"); } catch (e) { }
            }
            continue;
        }

        // Check if in attack range
        if (dist <= Config.ENEMY4_ATTACK_RANGE) {
            // In range - stop and attack
            if (archer.instVars.attackCooldown <= 0) {
                archer.instVars.isAttacking = true;
                archer.instVars.attackTimer = 0;
                archer.instVars.hasFired = false;
                try { archer.setAnimation("Attack"); } catch (e) { }
            } else {
                // Waiting for cooldown - circle around player
                const circleSpeed = archer.instVars.speed * 0.5;
                const perpX = -dy / dist;
                const perpY = dx / dist;
                archer.x += perpX * circleSpeed * dt;
                archer.y += perpY * circleSpeed * dt;
            }
        } else {
            // Out of range - move towards player
            if (dist > 0) {
                const speed = archer.instVars.speed;
                archer.x += (dx / dist) * speed * dt;
                archer.y += (dy / dist) * speed * dt;
            }
        }
    }
}

// Fire archer projectile
function fireArcherProjectile(archer, playerPos) {
    const runtime = getRuntime();

    // Create projectile using Effects object
    const proj = runtime.objects.Effects?.createInstance("Game", archer.x, archer.y, true);
    if (!proj) return;

    // Calculate initial direction
    const dx = playerPos.x - archer.x;
    const dy = playerPos.y - archer.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Set animation to longbow (arrow)
    try { proj.setAnimation("longbow"); } catch (e) { }

    // Make arrow smaller
    proj.width = 32;
    proj.height = 32;

    // Rotate to face direction
    proj.angle = Math.atan2(dy, dx);

    // Track archer projectiles with metadata in array (homing arrow)
    if (!state.archerProjectiles) state.archerProjectiles = [];
    state.archerProjectiles.push({
        sprite: proj,
        dirX: dx / dist,
        dirY: dy / dist,
        speed: Config.ENEMY4_PROJECTILE_SPEED,
        damage: archer.instVars.damage,
        lifetime: 4,
        isHoming: true
    });
}

// Update archer projectiles (called from main tick)
export function updateArcherProjectiles(dt) {
    if (!state.archerProjectiles) return;
    const playerPos = PlayerController.getPlayerPosition();

    for (let i = state.archerProjectiles.length - 1; i >= 0; i--) {
        const projData = state.archerProjectiles[i];
        const sprite = projData.sprite;

        // Check if sprite destroyed
        if (!sprite || !sprite.runtime) {
            state.archerProjectiles.splice(i, 1);
            continue;
        }

        // Homing: adjust direction towards player
        if (projData.isHoming) {
            const toDx = playerPos.x - sprite.x;
            const toDy = playerPos.y - sprite.y;
            const toDist = Math.sqrt(toDx * toDx + toDy * toDy);

            if (toDist > 0) {
                // Gradually turn towards player
                const homingStrength = Config.ENEMY4_HOMING_STRENGTH * dt;
                projData.dirX += (toDx / toDist - projData.dirX) * homingStrength;
                projData.dirY += (toDy / toDist - projData.dirY) * homingStrength;

                // Normalize direction
                const dirLen = Math.sqrt(projData.dirX * projData.dirX + projData.dirY * projData.dirY);
                if (dirLen > 0) {
                    projData.dirX /= dirLen;
                    projData.dirY /= dirLen;
                }

                // Update rotation to face direction
                sprite.angle = Math.atan2(projData.dirY, projData.dirX);
            }
        }

        // Move projectile
        sprite.x += projData.dirX * projData.speed * dt;
        sprite.y += projData.dirY * projData.speed * dt;

        // Update lifetime
        projData.lifetime -= dt;
        if (projData.lifetime <= 0) {
            sprite.destroy();
            state.archerProjectiles.splice(i, 1);
            continue;
        }

        // Check collision with player
        const dx = sprite.x - playerPos.x;
        const dy = sprite.y - playerPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 40) {  // Player collision radius
            // Check dodge
            if (DamageCalculator.checkDodge()) {
                showDodgeText();
            } else {
                PlayerController.damagePlayer(projData.damage);
                // Show damage text on player
                showPlayerDamageText(projData.damage);
            }
            sprite.destroy();
            state.archerProjectiles.splice(i, 1);
        }
    }
}

// Update Enemy7 (Fire Mage) - ranged enemies that throw fireballs from above
export function updateFireMages(dt) {
    const runtime = getRuntime();
    const playerPos = PlayerController.getPlayerPosition();
    if (playerPos.x === 0 && playerPos.y === 0) return;

    const fireMages = runtime.objects.Enemy7?.getAllInstances() || [];

    for (const mage of fireMages) {
        const dx = playerPos.x - mage.x;
        const dy = playerPos.y - mage.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Face player
        // Note: Fire Mage sprite faces LEFT by default, so mirror logic is reversed
        if (dx > 0) {
            mage.width = -Math.abs(mage.width);  // Player on right, flip to face right
        } else {
            mage.width = Math.abs(mage.width);   // Player on left, normal (faces left)
        }

        // Initialize attackCooldown if not set
        if (mage.instVars.attackCooldown === undefined) {
            mage.instVars.attackCooldown = 0;
        }

        // Update attack cooldown
        if (mage.instVars.attackCooldown > 0) {
            mage.instVars.attackCooldown -= dt;
        }

        // Check if in attack range
        if (dist <= Config.ENEMY7_ATTACK_RANGE) {
            // In range - attack if cooldown ready
            if (mage.instVars.attackCooldown <= 0) {
                fireFireball(mage, playerPos);
                mage.instVars.attackCooldown = Config.ENEMY7_ATTACK_COOLDOWN;
            }
            // Circle around player while waiting
            const circleSpeed = mage.instVars.speed * 0.5;
            const perpX = -dy / dist;
            const perpY = dx / dist;
            mage.x += perpX * circleSpeed * dt;
            mage.y += perpY * circleSpeed * dt;
        } else {
            // Out of range - move towards player
            if (dist > 0) {
                mage.x += (dx / dist) * mage.instVars.speed * dt;
                mage.y += (dy / dist) * mage.instVars.speed * dt;
            }
        }
    }
}

// Fire a fireball that falls from above onto player position
function fireFireball(mage, playerPos) {
    const runtime = getRuntime();

    // Fireball starts above player's current position
    const targetX = playerPos.x;
    const targetY = playerPos.y;
    const startY = targetY - 400;  // Start 400 pixels above target

    // Create fireball using Effects object
    const fireball = runtime.objects.Effects?.createInstance("Game", targetX, startY, true);
    if (!fireball) return;

    // Set animation to Fire Staff
    try { fireball.setAnimation("Fire Staff"); } catch (e) { }

    // Make fireball big and visible
    fireball.width = 96;
    fireball.height = 96;

    // Track fireball
    if (!state.fireballProjectiles) state.fireballProjectiles = [];
    state.fireballProjectiles.push({
        sprite: fireball,
        targetX: targetX,
        targetY: targetY,
        speed: Config.ENEMY7_FIREBALL_SPEED,
        damage: mage.instVars.damage,
        radius: Config.ENEMY7_FIREBALL_RADIUS
    });
}

// Update fireball projectiles (called from main tick)
export function updateFireballProjectiles(dt) {
    if (!state.fireballProjectiles) return;
    const runtime = getRuntime();
    const playerPos = PlayerController.getPlayerPosition();

    for (let i = state.fireballProjectiles.length - 1; i >= 0; i--) {
        const fb = state.fireballProjectiles[i];
        const sprite = fb.sprite;

        // Check if sprite destroyed
        if (!sprite || !sprite.runtime) {
            state.fireballProjectiles.splice(i, 1);
            continue;
        }

        // Move fireball down
        sprite.y += fb.speed * dt;

        // Rotate for effect
        sprite.angle += 5 * dt;

        // Check if player touches fireball while it's falling (mid-air hit)
        const dxAir = playerPos.x - sprite.x;
        const dyAir = playerPos.y - sprite.y;
        const distAir = Math.sqrt(dxAir * dxAir + dyAir * dyAir);
        const hitRadiusAir = 50;  // Smaller radius for mid-air collision

        let shouldExplode = false;

        if (distAir < hitRadiusAir) {
            // Player hit mid-air!
            if (DamageCalculator.checkDodge()) {
                showDodgeText();
            } else {
                PlayerController.damagePlayer(fb.damage);
                showPlayerDamageText(fb.damage);
            }
            shouldExplode = true;
        }

        // Check if reached target Y (ground level)
        if (sprite.y >= fb.targetY) {
            // Fireball landed - check if player is in radius
            const dx = playerPos.x - fb.targetX;
            const dy = playerPos.y - fb.targetY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < fb.radius) {
                // Player hit!
                if (DamageCalculator.checkDodge()) {
                    showDodgeText();
                } else {
                    PlayerController.damagePlayer(fb.damage);
                    showPlayerDamageText(fb.damage);
                }
            }
            shouldExplode = true;
        }

        if (shouldExplode) {
            // Create explosion effect - big burst then fade
            // Keep reference to sprite for explosion animation
            const explosionSprite = sprite;

            // Remove from projectiles list first
            state.fireballProjectiles.splice(i, 1);

            // Animate explosion
            let explosionTime = 0;
            const explosionDuration = 0.4;
            const startSize = 96;
            const endSize = 200;

            const animateExplosion = () => {
                if (!explosionSprite || !explosionSprite.runtime) return;

                explosionTime += 0.016; // ~60fps
                const progress = Math.min(explosionTime / explosionDuration, 1);

                // Ease out
                const eased = 1 - Math.pow(1 - progress, 2);

                // Scale up
                const size = startSize + (endSize - startSize) * eased;
                explosionSprite.width = size;
                explosionSprite.height = size;

                // Fade out
                explosionSprite.opacity = 1 - eased;

                if (progress < 1) {
                    requestAnimationFrame(animateExplosion);
                } else {
                    try { explosionSprite.destroy(); } catch (e) { }
                }
            };

            requestAnimationFrame(animateExplosion);
        }
    }
}

// Update solid opacity based on enemy/player overlap
export function updateSolidOpacity() {
    const runtime = getRuntime();
    const solids = runtime.objects.Sprite3?.getAllInstances() || [];
    const allEnemies = getAllEnemies();
    const player = runtime.objects.Player?.getFirstInstance();

    for (const solid of solids) {
        let hasOverlap = false;

        // Check enemies
        for (const enemy of allEnemies) {
            const dx = Math.abs(solid.x - enemy.x);
            const dy = Math.abs(solid.y - enemy.y);
            const overlapX = (solid.width / 2 + 30);
            const overlapY = (solid.height / 2 + 30);

            if (dx < overlapX && dy < overlapY) {
                hasOverlap = true;
                break;
            }
        }

        // Check player
        if (!hasOverlap && player) {
            const dx = Math.abs(solid.x - player.x);
            const dy = Math.abs(solid.y - player.y);
            const overlapX = (solid.width / 2 + 30);
            const overlapY = (solid.height / 2 + 30);

            if (dx < overlapX && dy < overlapY) {
                hasOverlap = true;
            }
        }

        // Set opacity based on overlap
        if (hasOverlap) {
            solid.opacity = 0.4;  // Semi-transparent when something behind
        } else {
            solid.opacity = 1.0;  // Full opacity normally
        }
    }
}

// Damage enemy
export function damageEnemy(enemy, damage, damageInfo = {}) {
    if (!enemy || !enemy.instVars) return;

    const enemyMaxHp = enemy.instVars.maxHealth || 100;
    const previousHealth = enemy.instVars.health;

    enemy.instVars.health -= damage;

    // Show floating damage text
    spawnDamageText(enemy.x, enemy.y, Math.round(damage));

    // Show text effects based on damage info
    if (damageInfo.isUltraCrit) {
        DamageEffects.showTextEffect(enemy.x, enemy.y, "ultra_crit");
    } else if (damageInfo.isCrit) {
        DamageEffects.showTextEffect(enemy.x, enemy.y, "crit");
    }

    // Check for overkill (damage > enemy's remaining HP by 3x)
    if (damage > previousHealth * 3 && previousHealth > 0) {
        DamageEffects.showTextEffect(enemy.x, enemy.y, "overkill");
    }

    // Check for executed (enemy was low HP and killed)
    if (enemy.instVars.health <= 0 && previousHealth < enemyMaxHp * 0.2) {
        DamageEffects.showTextEffect(enemy.x, enemy.y, "executed");
    }

    // Apply knockback from Knockback Tome
    applyKnockback(enemy);

    // Flash white then red, then back to normal
    try {
        enemy.colorRgb = [1, 1, 1];  // White flash
        setTimeout(() => {
            try {
                if (enemy && enemy.runtime) enemy.colorRgb = [1, 0.5, 0.5];  // Red
            } catch (e) { }
        }, 50);
        setTimeout(() => {
            try {
                if (enemy && enemy.runtime) enemy.colorRgb = [1, 1, 1];  // Back to normal
            } catch (e) { }
        }, 400);
    } catch (e) {
        // Enemy was destroyed, ignore
    }

    if (enemy.instVars.health <= 0) {
        killEnemy(enemy);
    }
}

// Apply knockback to enemy (push away from player)
function applyKnockback(enemy) {
    const knockbackForce = TomeSystem.getKnockback();
    if (knockbackForce <= 0) return;

    const playerPos = PlayerController.getPlayerPosition();
    if (playerPos.x === 0 && playerPos.y === 0) return;

    // Calculate direction away from player
    const dx = enemy.x - playerPos.x;
    const dy = enemy.y - playerPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
        // Push enemy away
        enemy.x += (dx / dist) * knockbackForce;
        enemy.y += (dy / dist) * knockbackForce;
    }
}

// Spawn floating damage text
export function spawnDamageText(x, y, damage) {
    const runtime = getRuntime();

    // Random offset so texts don't stack
    const offsetX = (Math.random() - 0.5) * 40;
    const offsetY = (Math.random() - 0.5) * 20;

    const text = runtime.objects.DamageText?.createInstance("Game", x + offsetX, y + offsetY);
    if (!text) return;

    text.text = damage.toString();
    text.opacity = 1;
    text.colorRgb = [1, 0.2, 0.2];  // Red color

    // Float up with full opacity, then fade out
    const startY = text.y;
    const endY = startY - 100;

    // Move up over 1 second
    text.behaviors.Tween.startTween("y", endY, 1.0, "default");

    // Start fading after 0.6 seconds (stays visible longer)
    setTimeout(() => {
        try {
            if (text && text.runtime) {
                text.behaviors.Tween.startTween("opacity", 0, 0.4, "default");
            }
        } catch (e) { }
    }, 600);

    // Destroy after animation
    setTimeout(() => {
        try {
            if (text && text.runtime) text.destroy();
        } catch (e) {
            // Already destroyed
        }
    }, 1100);
}

// Kill enemy
export function killEnemy(enemy) {
    // Determine enemy type based on XP value
    let enemyType = "enemy";
    if (enemy.instVars.xpValue === Config.ENEMY2_XP_VALUE) {
        enemyType = "enemy2";
    } else if (enemy.instVars.xpValue === Config.ENEMY3_XP_VALUE) {
        enemyType = "enemy3";
    } else if (enemy.instVars.xpValue === Config.ENEMY4_XP_VALUE) {
        enemyType = "enemy4";
    } else if (enemy.instVars.xpValue === Config.ENEMY5_XP_VALUE) {
        enemyType = "enemy5";
    } else if (enemy.instVars.xpValue === Config.ENEMY6_XP_VALUE) {
        enemyType = "enemy6";
    }

    // Drop gem
    XPSystem.spawnGem(enemy.x, enemy.y, enemy.instVars.xpValue);

    // Check for extra gem (Echoing Tome)
    if (state.itemStats && state.itemStats.extraGemChance > 0) {
        if (Math.random() * 100 < state.itemStats.extraGemChance) {
            // Spawn extra gem nearby
            const offsetX = (Math.random() - 0.5) * 40;
            const offsetY = (Math.random() - 0.5) * 40;
            XPSystem.spawnGem(enemy.x + offsetX, enemy.y + offsetY, enemy.instVars.xpValue);
            console.log("[EnemyManager] Echoing Tome: Extra gem spawned!");
        }
    }

    // Try to drop gold
    GoldSystem.tryDropGold(enemy.x, enemy.y, enemyType);

    // Try to drop silver
    SilverSystem.tryDropSilver(enemy.x, enemy.y, enemyType);

    // Update kill count
    state.killCount++;
    UIManager.updateKillCount();

    // Trigger Reaper's Contract (permanent damage bonus)
    ItemSystem.onEnemyKilled();

    // Trigger Regen Tome (heal on kill)
    TomeSystem.onEnemyKilled();

    // Kill combo
    addCombo();

    // Hit-stop: enhanced by combo tier
    if (comboCount >= 30) {
        triggerHitStop("multi");
    } else {
        triggerHitStop("normal");
    }

    // Destroy enemy
    enemy.destroy();
}

// ============================================
// KILL COMBO SYSTEM
// ============================================
let comboCount = 0;
let comboTimer = 0;
const COMBO_TIMEOUT = 2.0;  // 2 seconds to maintain combo

const COMBO_TIERS = [
    { threshold: 5,   label: "NICE!",        xpMult: 1.2, color: [1, 1, 0.5] },
    { threshold: 15,  label: "GREAT!",       xpMult: 1.5, color: [1, 0.8, 0] },
    { threshold: 30,  label: "AMAZING!",     xpMult: 2.0, color: [1, 0.5, 0] },
    { threshold: 50,  label: "UNSTOPPABLE!", xpMult: 2.5, color: [1, 0.2, 0] },
    { threshold: 100, label: "GODLIKE!!!",   xpMult: 3.0, color: [1, 0, 0.5] }
];

function addCombo() {
    comboCount++;
    comboTimer = COMBO_TIMEOUT;

    // Check tier transitions
    for (let i = COMBO_TIERS.length - 1; i >= 0; i--) {
        const tier = COMBO_TIERS[i];
        if (comboCount === tier.threshold) {
            showComboText(tier.label, tier.color);
            // Camera shake on tier transition
            const DamageEffects = globalThis.DamageEffects;
            if (DamageEffects) DamageEffects.triggerDamageEffect(tier.threshold / 5);
            break;
        }
    }
}

function showComboText(label, color) {
    const runtime = getRuntime();
    const playerPos = PlayerController.getPlayerPosition();
    const text = runtime.objects.DamageText?.createInstance("Game", playerPos.x, playerPos.y - 200);
    if (!text) return;
    text.text = label + " x" + comboCount;
    text.colorRgb = color;
    text.opacity = 1;
    try {
        text.behaviors.Tween.startTween("y", playerPos.y - 350, 1.5, "easeoutquad");
        text.behaviors.Tween.startTween("opacity", 0, 1.5, "easeoutquad");
    } catch (e) {}
    setTimeout(() => { try { if (text?.runtime) text.destroy(); } catch (e) {} }, 1600);
}

export function getComboXPMultiplier() {
    for (let i = COMBO_TIERS.length - 1; i >= 0; i--) {
        if (comboCount >= COMBO_TIERS[i].threshold) return COMBO_TIERS[i].xpMult;
    }
    return 1.0;
}

export function getComboCount() { return comboCount; }

export function updateCombo(dt) {
    if (comboTimer > 0) {
        comboTimer -= dt;
        if (comboTimer <= 0 && comboCount > 0) {
            if (comboCount >= 5) {
                showComboText("COMBO BROKEN", [0.5, 0.5, 0.5]);
            }
            comboCount = 0;
        }
    }
}

export function resetCombo() { comboCount = 0; comboTimer = 0; }

// ============================================
// HIT-STOP SYSTEM (enhanced with crit/multi-kill)
// ============================================
let hitStopTimer = 0;
let hitStopScale = 0.1;

export function triggerHitStop(type = "normal") {
    switch (type) {
        case "crit":
            hitStopTimer = 0.050;  // 50ms for crit kills
            hitStopScale = 0.05;
            break;
        case "ultra_crit":
            hitStopTimer = 0.150;  // 150ms for ultra crit
            hitStopScale = 0.02;
            break;
        case "multi":
            hitStopTimer = 0.100;  // 100ms slowmo for multi-kills
            hitStopScale = 0.3;
            break;
        default:
            hitStopTimer = 0.025;  // 25ms normal kill
            hitStopScale = 0.1;
    }
}

export function getHitStopScale() {
    if (hitStopTimer > 0) return hitStopScale;
    return 1.0;
}

export function updateHitStop(dt) {
    if (hitStopTimer > 0) {
        hitStopTimer -= dt;
        if (hitStopTimer < 0) hitStopTimer = 0;
    }
}

// Show DODGE text above player
let dodgeTextCooldown = 0;
function showDodgeText() {
    // Rate limit dodge text
    if (dodgeTextCooldown > 0) return;
    dodgeTextCooldown = 0.5;  // Show at most every 0.5s

    const playerPos = PlayerController.getPlayerPosition();

    // Use textEffects sprite for dodge text
    DamageEffects.showTextEffect(playerPos.x, playerPos.y, "dodge");

    // Decrease cooldown in tick
    setTimeout(() => { dodgeTextCooldown = 0; }, 500);
}

// Show damage text on player when hit by arrow
function showPlayerDamageText(damage) {
    const runtime = getRuntime();
    const playerPos = PlayerController.getPlayerPosition();

    // Random offset
    const offsetX = (Math.random() - 0.5) * 40;
    const offsetY = (Math.random() - 0.5) * 20;

    const text = runtime.objects.DamageText?.createInstance("Game", playerPos.x + offsetX, playerPos.y - 30 + offsetY);
    if (!text) return;

    text.text = Math.round(damage).toString();
    text.opacity = 1;
    text.colorRgb = [1, 0.3, 0.3];  // Red for player damage

    const startY = text.y;
    const endY = startY - 80;

    try {
        text.behaviors.Tween.startTween("y", endY, 0.8, "default");
    } catch (e) { }

    setTimeout(() => {
        try {
            if (text && text.runtime) {
                text.behaviors.Tween.startTween("opacity", 0, 0.3, "default");
            }
        } catch (e) { }
    }, 500);

    setTimeout(() => {
        try {
            if (text && text.runtime) text.destroy();
        } catch (e) { }
    }, 900);
}

// Get all enemies (all types)
export function getAllEnemies() {
    const runtime = getRuntime();
    const enemies1 = runtime.objects.Enemy?.getAllInstances() || [];
    const enemies2 = runtime.objects.Enemy2?.getAllInstances() || [];
    const enemies3 = runtime.objects.Enemy3?.getAllInstances() || [];
    const enemies4 = runtime.objects.Enemy4?.getAllInstances() || [];
    const enemies5 = runtime.objects.Enemy5?.getAllInstances() || [];
    const enemies6 = runtime.objects.Enemy6?.getAllInstances() || [];
    const enemies7 = runtime.objects.Enemy7?.getAllInstances() || [];
    const enemies8 = runtime.objects.Enemy8?.getAllInstances() || [];
    return [...enemies1, ...enemies2, ...enemies3, ...enemies4, ...enemies5, ...enemies6, ...enemies7, ...enemies8];
}

// Get enemy count
export function getEnemyCount() {
    return getAllEnemies().length;
}

console.log("[EnemyManager] Module loaded!");
