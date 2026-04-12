// ============================================
// BOSS MANAGER - Boss spawning and behavior
// ============================================

import { state, getRuntime } from "./GameState.js";
import * as Config from "./GameConfig.js";
import * as PlayerController from "./PlayerController.js";
import * as XPSystem from "./XPSystem.js";
import * as UIManager from "./UIManager.js";
import * as ResponsiveScale from "./ResponsiveScale.js";
import * as GoldSystem from "./GoldSystem.js";
import * as EnemyManager from "./EnemyManager.js";
import * as SilverSystem from "./SilverSystem.js";
import * as SaveManager from "./SaveManager.js";

// Boss state
let bossActive = false;
let bossWarningShown = false;
let warningTextInstance = null;
let warningFlashTimer = 0;
let warningDuration = 3; // seconds
let warningElapsed = 0;
let warningStarted = false;
let bossDefeated = false;  // Once true, no more bosses spawn
let restPeriodTimer = 0;   // Pause enemy spawning after boss death

// Boss HP bar UI references
let bossHPBarBg = null;
let bossHPBarFill = null;
let bossHPText = null;

// Check if it's time to spawn boss
export function checkBossSpawn(dt) {
    const runtime = getRuntime();

    // Update rest period timer
    if (restPeriodTimer > 0) {
        restPeriodTimer -= dt;
    }

    // Don't spawn if boss already defeated (only one boss per run)
    if (bossDefeated) return;

    // Don't spawn if boss already active
    if (bossActive) return;

    // Check if it's boss time (level-based)
    if (state.playerLevel >= Config.BOSS_SPAWN_LEVEL && !bossWarningShown) {
        showBossWarning();
        bossWarningShown = true;
        warningStarted = true;
        warningElapsed = 0;
    }

    // Update warning animation (even if text instance failed)
    if (warningStarted && !bossActive) {
        warningElapsed += dt;
        warningFlashTimer += dt;

        // Flash effect for warning text
        if (warningTextInstance && warningFlashTimer > 0.2) {
            warningFlashTimer = 0;
            warningTextInstance.isVisible = !warningTextInstance.isVisible;
        }

        // After warning duration, spawn boss and remove text
        if (warningElapsed >= warningDuration) {
            if (warningTextInstance) {
                warningTextInstance.destroy();
                warningTextInstance = null;
            }
            warningStarted = false;
            spawnBoss();
        }
    }
}

// Show "BOSS INCOMING!" warning
function showBossWarning() {
    const runtime = getRuntime();

    // Try to create warning text - use TitleText or any available Text object
    try {
        // Try different text objects
        const textObjects = ['TitleText', 'TimerText', 'KillCountText'];

        for (const objName of textObjects) {
            const textObj = runtime.objects[objName];
            if (textObj) {
                const player = PlayerController.getPlayer();
                const x = player ? player.x : runtime.viewportWidth / 2;
                const y = player ? player.y - 200 : runtime.viewportHeight / 2;

                warningTextInstance = textObj.createInstance("Game", x, y);
                if (warningTextInstance) {
                    warningTextInstance.text = "BOSS INCOMING!";
                    warningTextInstance.colorRgb = [1, 0.2, 0.2]; // Red
                    console.log("[BossManager] Warning text created using", objName);
                    break;
                }
            }
        }
    } catch (e) {
        console.warn("[BossManager] Could not create warning text:", e);
    }

    console.log("[BossManager] Boss warning shown!");
}

// Spawn the boss
function spawnBoss() {
    const runtime = getRuntime();
    const playerPos = PlayerController.getPlayerPosition();

    console.log("[BossManager] Attempting to spawn boss...");
    console.log("[BossManager] Boss1 object exists:", !!runtime.objects.Boss1);

    // Kill ALL enemies before boss spawns - 1v1 only!
    const enemies1 = runtime.objects.Enemy?.getAllInstances() || [];
    const enemies2 = runtime.objects.Enemy2?.getAllInstances() || [];
    const enemies3 = runtime.objects.Enemy3?.getAllInstances() || [];
    const enemies4 = runtime.objects.Enemy4?.getAllInstances() || [];
    const enemies5 = runtime.objects.Enemy5?.getAllInstances() || [];
    const enemies6 = runtime.objects.Enemy6?.getAllInstances() || [];
    const enemies7 = runtime.objects.Enemy7?.getAllInstances() || [];
    const enemies8 = runtime.objects.Enemy8?.getAllInstances() || [];
    const allEnemies = [...enemies1, ...enemies2, ...enemies3, ...enemies4, ...enemies5, ...enemies6, ...enemies7, ...enemies8];

    console.log("[BossManager] Clearing", allEnemies.length, "enemies for boss fight!");
    for (const enemy of allEnemies) {
        try {
            enemy.destroy();
        } catch (e) { }
    }

    // Spawn boss at a distance from player
    const angle = Math.random() * Math.PI * 2;
    const distance = ResponsiveScale.scaleDistance(800);

    const spawnX = playerPos.x + Math.cos(angle) * distance;
    const spawnY = playerPos.y + Math.sin(angle) * distance;

    console.log("[BossManager] Spawn position:", spawnX, spawnY);

    try {
        const boss = runtime.objects.Boss1?.createInstance("Game", spawnX, spawnY, true);

        if (boss) {
            // Boss health based on equipped item count
            const itemCount = Object.keys(state.itemInventory || {}).length;
            let bossHealth = 4000;  // Default
            if (itemCount === 2) {
                bossHealth = 5000;
            } else if (itemCount > 2) {
                bossHealth = 6000;
            }
            boss.instVars.health = bossHealth;
            boss.instVars.maxHealth = boss.instVars.health;
            console.log("[BossManager] Item count:", itemCount, "-> Boss HP:", bossHealth);
            boss.instVars.speed = Config.BOSS_SPEED;
            boss.instVars.damage = Config.BOSS_DAMAGE * state.difficultyMultiplier;
            boss.instVars.xpValue = Config.BOSS_XP_VALUE;
            boss.instVars.isBoss = true;
            boss.instVars.fireballCooldown = 0;  // Fireball attack cooldown

            bossActive = true;

            // Create boss HP bar UI
            createBossHPBar(runtime);

            console.log("[BossManager] Boss spawned with HP:", boss.instVars.health);
        } else {
            console.warn("[BossManager] Boss1 object not found! Add Boss1 sprite to project.");
        }
    } catch (e) {
        console.error("[BossManager] Error spawning boss:", e);
    }
}

// Show boss HP bar UI
function createBossHPBar(runtime) {
    // Get existing instances and make them visible
    bossHPBarBg = runtime.objects.HPBarBg2?.getFirstInstance();
    if (bossHPBarBg) {
        bossHPBarBg.isVisible = true;
    }

    bossHPBarFill = runtime.objects.HPBarFill2?.getFirstInstance();
    if (bossHPBarFill) {
        bossHPBarFill.isVisible = true;
    }

    bossHPText = runtime.objects.HPText2?.getFirstInstance();
    if (bossHPText) {
        bossHPText.isVisible = true;
        bossHPText.text = "BOSS";
    }

    console.log("[BossManager] Boss HP bar shown");
}

// Update boss HP bar UI
function updateBossHPBar(boss) {
    if (!boss) return;

    const health = boss.instVars.health;
    const maxHealth = boss.instVars.maxHealth;
    const healthPercent = health / maxHealth;

    // Update fill bar width (100% = 329)
    if (bossHPBarFill) {
        bossHPBarFill.width = 329 * healthPercent;
    }

    // Update HP text
    if (bossHPText) {
        bossHPText.text = Math.ceil(health) + " / " + Math.ceil(maxHealth);
    }
}

// Hide boss HP bar UI
function destroyBossHPBar() {
    if (bossHPBarBg) {
        bossHPBarBg.isVisible = false;
    }
    if (bossHPBarFill) {
        bossHPBarFill.isVisible = false;
    }
    if (bossHPText) {
        bossHPText.isVisible = false;
    }
    console.log("[BossManager] Boss HP bar hidden");
}

// Update boss behavior (called every tick)
let debugLogCounter = 0;
export function updateBoss(dt) {
    if (!bossActive) return;

    const runtime = getRuntime();
    const boss = runtime.objects.Boss1?.getFirstInstance();

    // Debug log every 60 frames (about 1 second)
    debugLogCounter++;
    if (debugLogCounter % 60 === 0) {
        console.log("[BossManager] updateBoss - boss exists:", !!boss, "position:", boss?.x, boss?.y);
    }

    if (!boss) {
        bossActive = false;
        return;
    }

    // Update boss HP bar
    updateBossHPBar(boss);

    const playerPos = PlayerController.getPlayerPosition();
    if (playerPos.x === 0 && playerPos.y === 0) return;

    // Move towards player (melee attack)
    const dx = playerPos.x - boss.x;
    const dy = playerPos.y - boss.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
        // Use Config speed directly if instVars not set
        const speed = boss.instVars?.speed || Config.BOSS_SPEED;
        boss.x += (dx / dist) * speed * dt;
        boss.y += (dy / dist) * speed * dt;

        // Face player
        if (dx < 0) {
            boss.width = -Math.abs(boss.width);
        } else {
            boss.width = Math.abs(boss.width);
        }
    }

    // Check collision with player (melee damage)
    if (dist < ResponsiveScale.scaleRadius(Config.BOSS_COLLISION_RADIUS)) {
        const damage = boss.instVars?.damage || Config.BOSS_DAMAGE;
        PlayerController.damagePlayer(damage * dt);
    }

    // Fireball attack system
    if (boss.instVars.fireballCooldown === undefined) {
        boss.instVars.fireballCooldown = 0;
    }

    boss.instVars.fireballCooldown -= dt;

    // Fire fireball every 0.8 seconds from random direction (rapid fire!)
    if (boss.instVars.fireballCooldown <= 0) {
        boss.instVars.fireballCooldown = 0.8;  // 0.8 second cooldown - much faster!
        fireBossFireball(boss, playerPos);
    }
}

// Damage boss
export function damageBoss(boss, damage) {
    if (!boss || !boss.instVars) return;

    boss.instVars.health -= damage;

    // Flash white then red, then back to normal
    try {
        boss.colorRgb = [1, 1, 1];  // White flash
        setTimeout(() => {
            try {
                if (boss && boss.runtime) boss.colorRgb = [1, 0.3, 0.3];  // Red
            } catch (e) { }
        }, 50);
        setTimeout(() => {
            try {
                if (boss && boss.runtime) boss.colorRgb = [1, 1, 1];  // Back to normal
            } catch (e) { }
        }, 400);
    } catch (e) {
        // Boss was destroyed, ignore
    }

    if (boss.instVars.health <= 0) {
        killBoss(boss);
    }
}

// Kill boss
function killBoss(boss) {
    const bossX = boss.x;
    const bossY = boss.y;

    // Kill ALL enemies on screen when boss dies
    const runtime = getRuntime();
    const enemies1 = runtime.objects.Enemy?.getAllInstances() || [];
    const enemies2 = runtime.objects.Enemy2?.getAllInstances() || [];
    const enemies3 = runtime.objects.Enemy3?.getAllInstances() || [];
    const enemies4 = runtime.objects.Enemy4?.getAllInstances() || [];
    const enemies5 = runtime.objects.Enemy5?.getAllInstances() || [];
    const enemies6 = runtime.objects.Enemy6?.getAllInstances() || [];
    const enemies7 = runtime.objects.Enemy7?.getAllInstances() || [];
    const enemies8 = runtime.objects.Enemy8?.getAllInstances() || [];
    const allEnemies = [...enemies1, ...enemies2, ...enemies3, ...enemies4, ...enemies5, ...enemies6, ...enemies7, ...enemies8];

    console.log("[BossManager] Found", allEnemies.length, "enemies to kill");

    let killedCount = 0;
    for (const enemy of allEnemies) {
        try {
            // Spawn XP for each killed enemy
            if (enemy.instVars) {
                XPSystem.spawnGem(enemy.x, enemy.y, enemy.instVars.xpValue || 10);
            }
            enemy.destroy();
            killedCount++;
            state.killCount++;
        } catch (e) {
            console.warn("[BossManager] Error killing enemy:", e);
        }
    }
    console.log("[BossManager] Killed", killedCount, "enemies with boss!");

    // Spawn LOTS of XP gems in a burst pattern (more gems, more XP each)
    const gemCount = 35;  // 35 XP gems
    const xpPerGem = 25;  // Each gem gives 25 XP (total 875 XP!)

    for (let i = 0; i < gemCount; i++) {
        // Spawn in a circle around boss
        const angle = (i / gemCount) * Math.PI * 2 + Math.random() * 0.3;
        const dist = 30 + Math.random() * 120;
        const gemX = bossX + Math.cos(angle) * dist;
        const gemY = bossY + Math.sin(angle) * dist;

        // Delay spawn slightly for burst effect
        setTimeout(() => {
            XPSystem.spawnGem(gemX, gemY, xpPerGem);
        }, i * 25);
    }

    // Spawn gold (less than XP but still a lot)
    const goldCount = 12;  // 12 gold drops
    for (let i = 0; i < goldCount; i++) {
        const angle = (i / goldCount) * Math.PI * 2 + Math.random() * 0.5;
        const dist = 20 + Math.random() * 60;
        const goldX = bossX + Math.cos(angle) * dist;
        const goldY = bossY + Math.sin(angle) * dist;

        setTimeout(() => {
            GoldSystem.spawnGold(goldX, goldY, Config.GOLD_VALUE_BOSS);
        }, i * 50);
    }

    // Spawn silver (boss drops guaranteed silver)
    const silverCount = 8;  // 8 silver drops
    for (let i = 0; i < silverCount; i++) {
        const angle = (i / silverCount) * Math.PI * 2 + Math.random() * 0.4;
        const dist = 40 + Math.random() * 80;
        const silverX = bossX + Math.cos(angle) * dist;
        const silverY = bossY + Math.sin(angle) * dist;

        setTimeout(() => {
            SilverSystem.spawnSilver(silverX, silverY, 3);  // 3 silver each = 24 total
        }, i * 40);
    }

    // Update kill count (boss itself)
    state.killCount++;
    UIManager.updateKillCount();

    // Boss defeated - no more bosses this run
    bossActive = false;
    bossDefeated = true;  // Prevents second boss from spawning
    restPeriodTimer = 6;  // 6 second rest period - no enemy spawns

    // Activate magnet - pull all XP/Gold to player
    state.bossDefeatedMagnet = true;

    // Destroy boss HP bar UI
    destroyBossHPBar();

    // Destroy boss
    boss.destroy();

    console.log("[BossManager] Boss defeated! Magnet activated. Spawned", gemCount, "gems and", goldCount, "gold!");

    // Victory - stop game and call victory function
    state.isPaused = true;

    // Add 200 gold reward for victory
    SaveManager.addGold(200);
    console.log("[BossManager] Victory! Added 200 gold to player.");

    runtime.callFunction("victory");
}

// Check if entity is a boss
export function isBoss(entity) {
    return entity?.instVars?.isBoss === true;
}

// Get boss instance
export function getBoss() {
    const runtime = getRuntime();
    return runtime.objects.Boss1?.getFirstInstance();
}

// Check if in rest period (no enemy spawns)
export function isRestPeriod() {
    return restPeriodTimer > 0;
}

// Check if boss fight is active (no enemy spawns during boss)
export function isBossActive() {
    return bossActive;
}

// Fire boss fireball from random direction
function fireBossFireball(boss, playerPos) {
    const runtime = getRuntime();

    // Pick random direction around player (fireballlar comes from all sides!)
    const angle = Math.random() * Math.PI * 2;
    const distance = 500;  // Start 500px away from player

    const startX = playerPos.x + Math.cos(angle) * distance;
    const startY = playerPos.y + Math.sin(angle) * distance;

    // Create fireball
    const fireball = runtime.objects.Effects?.createInstance("Game", startX, startY, true);
    if (!fireball) return;

    // Set animation to Fire Staff
    try { fireball.setAnimation("Fire Staff"); } catch (e) { }

    // Make fireball big and menacing
    fireball.width = 80;
    fireball.height = 80;

    // Calculate direction towards player (current position)
    const dx = playerPos.x - startX;
    const dy = playerPos.y - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Track boss fireballs
    if (!state.bossFireballs) state.bossFireballs = [];
    state.bossFireballs.push({
        sprite: fireball,
        targetX: playerPos.x,
        targetY: playerPos.y,
        speed: 400,  // Fast fireball
        damage: boss.instVars.damage * 0.8,  // 80% of boss damage
        radius: 80,  // Hit radius
        dirX: dx / dist,
        dirY: dy / dist
    });

    console.log("[BossManager] Boss fired fireball from angle:", angle);
}

// Update boss fireballs (call from main tick)
export function updateBossFireballs(dt) {
    if (!state.bossFireballs) return;

    const playerPos = PlayerController.getPlayerPosition();

    for (let i = state.bossFireballs.length - 1; i >= 0; i--) {
        const fb = state.bossFireballs[i];
        const sprite = fb.sprite;

        // Check if sprite destroyed
        if (!sprite || !sprite.runtime) {
            state.bossFireballs.splice(i, 1);
            continue;
        }

        // Move fireball towards target
        sprite.x += fb.dirX * fb.speed * dt;
        sprite.y += fb.dirY * fb.speed * dt;

        // Rotate for effect
        sprite.angle += 8 * dt;

        // Check if reached target or passed it
        const dxToTarget = fb.targetX - sprite.x;
        const dyToTarget = fb.targetY - sprite.y;
        const distToTarget = Math.sqrt(dxToTarget * dxToTarget + dyToTarget * dyToTarget);

        // Check if player is hit
        const dxPlayer = playerPos.x - sprite.x;
        const dyPlayer = playerPos.y - sprite.y;
        const distPlayer = Math.sqrt(dxPlayer * dxPlayer + dyPlayer * dyPlayer);

        if (distPlayer < fb.radius) {
            // Hit player!
            PlayerController.damagePlayer(fb.damage);
            // Show explosion and destroy
            explodeBossFireball(sprite);
            state.bossFireballs.splice(i, 1);
            continue;
        }

        // Fireball missed - traveled too far
        if (distToTarget < 30 || distToTarget > 600) {
            explodeBossFireball(sprite);
            state.bossFireballs.splice(i, 1);
        }
    }
}

// Explode boss fireball
function explodeBossFireball(sprite) {
    if (!sprite || !sprite.runtime) return;

    // Explosion animation
    let explosionTime = 0;
    const explosionDuration = 0.3;
    const startSize = sprite.width;
    const endSize = startSize * 2;

    const animate = () => {
        if (!sprite || !sprite.runtime) return;

        explosionTime += 0.016;
        const progress = Math.min(explosionTime / explosionDuration, 1);
        const eased = 1 - Math.pow(1 - progress, 2);

        sprite.width = startSize + (endSize - startSize) * eased;
        sprite.height = sprite.width;
        sprite.opacity = 1 - eased;

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            try { sprite.destroy(); } catch (e) { }
        }
    };

    requestAnimationFrame(animate);
}

// Reset boss state (for new game)
export function reset() {
    bossActive = false;
    bossWarningShown = false;
    warningTextInstance = null;
    warningFlashTimer = 0;
    warningElapsed = 0;
    warningStarted = false;
    bossDefeated = false;
    restPeriodTimer = 0;

    // Reset HP bar references
    bossHPBarBg = null;
    bossHPBarFill = null;
    bossHPText = null;
}

console.log("[BossManager] Module loaded!");
