// ============================================
// WEAPON SYSTEM - Weapon logic and effects
// ============================================

import { state, getRuntime } from "./GameState.js";
import * as WeaponData from "./WeaponData.js";
import * as PlayerController from "./PlayerController.js";
import * as EnemyManager from "./EnemyManager.js";
import * as BossManager from "./BossManager.js";
import * as UIManager from "./UIManager.js";
import * as DamageCalculator from "./DamageCalculator.js";
import * as ItemSystem from "./ItemSystem.js";
import * as TomeSystem from "./TomeSystem.js";
import * as HeroData from "./HeroData.js";
import * as MeleeAttack from "./MeleeAttack.js";
import * as SaveManager from "./SaveManager.js";

// Weapon cooldown timers (weaponId -> currentCooldown)
const weaponCooldowns = {};

// Active effects tracking
const activeTrails = [];  // For trail weapons
const activeOrbits = [];  // For orbit weapons
const activeProjectiles = [];  // For all projectiles
const activeShields = [];  // For guardian shield orbits
const activeFirePaths = [];  // For inferno trail fire paths
const activeFrostPaths = [];  // For frost trail freeze paths
let shieldRespawnTimer = 0;  // Timer for shield respawn
let shieldsDestroyed = false;  // Track if all shields were destroyed
let boomerangsInFlight = 0;  // Track how many boomerangs are currently flying
let boomerangMaxCount = 1;   // Max boomerangs based on level

// Soul Aura persistent effect
let soulAuraEffect = null;
let soulAuraDamageTimer = 0;
let soulAuraCurrentRange = 0;  // Track current range to update scale

// Player movement direction (for directional weapons)
let lastMoveX = 1;
let lastMoveY = 0;

// Get player's projectile spawn point (center of character, not feet)
// Since player origin is at bottom, we offset Y by half the height
function getPlayerFirePoint() {
    const runtime = getRuntime();
    const player = runtime.objects.Player?.getFirstInstance();
    if (!player) return PlayerController.getPlayerPosition();

    // Player origin is at bottom, so we need to offset Y up by half height
    // to fire from the center/chest area of the character
    return {
        x: player.x,
        y: player.y - (Math.abs(player.height) / 2)
    };
}

// Initialize weapon system for a new run
export function initWeapons() {
    // Clear cooldowns
    for (const key in weaponCooldowns) {
        delete weaponCooldowns[key];
    }

    // Clear active effects
    activeTrails.length = 0;
    activeOrbits.length = 0;
    activeProjectiles.length = 0;
    activeShields.length = 0;
    activeFirePaths.length = 0;
    shieldRespawnTimer = 0;
    shieldsDestroyed = false;
    boomerangsInFlight = 0;
    boomerangMaxCount = 1;

    // Destroy soul aura if exists
    if (soulAuraEffect && soulAuraEffect.runtime) {
        soulAuraEffect.destroy();
    }
    soulAuraEffect = null;
    soulAuraDamageTimer = 0;
    soulAuraCurrentRange = 0;

    // Reset paladin attack cooldown
    paladinAttackCooldown = 0;

    // Initialize cooldowns for equipped weapons
    for (let slot = 0; slot < 4; slot++) {
        const weaponId = state.equippedWeapons[slot];
        if (weaponId) {
            weaponCooldowns[weaponId] = 0;
        }
    }

    console.log("[WeaponSystem] Initialized with weapons:", state.equippedWeapons);
}

// Update player facing direction
export function updatePlayerDirection(dx, dy) {
    if (dx !== 0 || dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy);
        lastMoveX = dx / len;
        lastMoveY = dy / len;
    }
}

// Paladin basic attack cooldown
let paladinAttackCooldown = 0;
const PALADIN_ATTACK_COOLDOWN = 0.8;  // Slower attack (matching hero attackSpeed)

// Update all weapons (called every tick)
export function updateWeapons(dt) {
    if (!state.isPlaying || state.isPaused || state.isLevelingUp) return;

    const runtime = getRuntime();

    // Update player direction from input
    const player = PlayerController.getPlayer();
    if (player) {
        const keyboard = runtime.keyboard;
        let dx = 0, dy = 0;
        if (keyboard.isKeyDown("KeyW") || keyboard.isKeyDown("ArrowUp")) dy -= 1;
        if (keyboard.isKeyDown("KeyS") || keyboard.isKeyDown("ArrowDown")) dy += 1;
        if (keyboard.isKeyDown("KeyA") || keyboard.isKeyDown("ArrowLeft")) dx -= 1;
        if (keyboard.isKeyDown("KeyD") || keyboard.isKeyDown("ArrowRight")) dx += 1;
        updatePlayerDirection(dx, dy);
    }

    // Paladin basic melee attack (since Guardian Shield doesn't deal damage)
    if (player && HeroData.needsPaladinAttack(state.selectedHeroId)) {
        paladinAttackCooldown -= dt;
        if (paladinAttackCooldown <= 0) {
            // Check if any enemy is in melee range
            const enemies = EnemyManager.getAllEnemies();
            const meleeRange = 180;  // Paladin melee range
            let hasEnemyInRange = false;

            for (const enemy of enemies) {
                const dx = enemy.x - player.x;
                const dy = enemy.y - player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < meleeRange) {
                    hasEnemyInRange = true;
                    break;
                }
            }

            if (hasEnemyInRange) {
                MeleeAttack.performSlash(player);
                paladinAttackCooldown = 1 / state.playerAttackSpeed;  // Use hero's attack speed
            }
        }
    }

    // Update each equipped weapon
    for (let slot = 0; slot < 4; slot++) {
        const weaponId = state.equippedWeapons[slot];
        if (!weaponId) continue;

        const weaponLevel = state.weaponLevels[weaponId] || 0;
        if (weaponLevel <= 0) continue;  // Weapon not acquired yet

        // Get weapon stats at current level
        const stats = WeaponData.getWeaponStatsAtLevel(weaponId, weaponLevel);
        if (!stats) continue;

        // Get full weapon data
        const weaponData = WeaponData.getWeaponData(weaponId);
        if (!weaponData) continue;

        // Update cooldown
        if (weaponCooldowns[weaponId] === undefined) {
            weaponCooldowns[weaponId] = 0;
        }

        weaponCooldowns[weaponId] -= dt;

        // Fire weapon if ready
        if (weaponCooldowns[weaponId] <= 0) {
            fireWeapon(weaponId, stats, weaponData);
            // Apply attack speed multiplier from items (Tempo Metronome)
            let cooldown = stats.cooldown;
            const attackSpeedMult = ItemSystem.getAttackSpeedMultiplier();
            if (attackSpeedMult > 1) {
                cooldown /= attackSpeedMult;  // Faster = lower cooldown
            }
            // Apply Cooldown Tome reduction
            const cooldownReduction = TomeSystem.getCooldownReduction();
            if (cooldownReduction > 0) {
                cooldown *= (1 - cooldownReduction / 100);  // Reduce cooldown by %
            }
            weaponCooldowns[weaponId] = cooldown;
        }
    }

    // Update active projectiles
    updateProjectiles(dt);

    // Update active orbits
    updateOrbits(dt);

    // Update trails
    updateTrails(dt);

    // Update guardian shields
    updateShields(dt);

    // Update soul aura (persistent aura that follows player)
    updateSoulAura(dt);

    // Update fire paths (inferno trail)
    updateFirePaths(dt);

    // Update frost paths (frost trail)
    updateFrostPaths(dt);

    // Update frozen enemies
    updateFrozenEnemies(dt);
}

// Fire a specific weapon based on its type
function fireWeapon(weaponId, stats, weaponData) {
    const type = weaponData.weaponType;

    switch (type) {
        case "targeted":
            fireTargeted(weaponId, stats, weaponData);
            break;
        case "aura":
            fireAura(weaponId, stats, weaponData);
            break;
        case "aura_persistent":
            // Soul Aura is handled in updateSoulAura, not here
            break;
        case "trail":
            fireTrail(weaponId, stats, weaponData);
            break;
        case "melee":
            fireMelee(weaponId, stats, weaponData);
            break;
        case "projectile":
            fireProjectile(weaponId, stats, weaponData);
            break;
        case "piercing":
        case "piercing_projectile":
            firePiercing(weaponId, stats, weaponData);
            break;
        case "shield":
            fireShieldShockwave(weaponId, stats, weaponData);
            break;
        case "shield_orbit":
            spawnGuardianShields(weaponId, stats, weaponData);
            break;
        case "pulse":
            firePulse(weaponId, stats, weaponData);
            break;
        case "returning":
            fireReturning(weaponId, stats, weaponData);
            break;
        case "bouncing":
            fireBouncing(weaponId, stats, weaponData);
            break;
        case "burst":
            fireBurst(weaponId, stats, weaponData);
            break;
        case "orbit":
            fireOrbit(weaponId, stats, weaponData);
            break;
        case "sniper":
            fireSniper(weaponId, stats, weaponData);
            break;
        case "homing":
            fireHoming(weaponId, stats, weaponData);
            break;
        case "explosive":
            fireExplosive(weaponId, stats, weaponData);
            break;
        case "knockback":
            fireKnockback(weaponId, stats, weaponData);
            break;
        case "fire_path":
            fireFirePath(weaponId, stats, weaponData);
            break;
        case "frost_path":
            fireFrostPath(weaponId, stats, weaponData);
            break;
        default:
            console.warn("[WeaponSystem] Unknown weapon type:", type);
    }
}

// ============================================
// TARGETED - Lightning Staff (strikes enemies)
// ============================================
function fireTargeted(weaponId, stats, weaponData) {
    const playerPos = PlayerController.getPlayerPosition();
    if (playerPos.x === 0 && playerPos.y === 0) return;

    const allEnemies = getAllTargets();
    const enemiesInRange = [];

    for (const enemy of allEnemies) {
        const dx = enemy.x - playerPos.x;
        const dy = enemy.y - playerPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= stats.range) {
            enemiesInRange.push({ enemy, dist });
        }
    }

    if (enemiesInRange.length === 0) return;

    enemiesInRange.sort((a, b) => a.dist - b.dist);
    const targetCount = Math.min(weaponData.baseTargets || 1, enemiesInRange.length);

    // Play lightning sound
    const runtime = getRuntime();
    runtime.callFunction("playAudio", "lightning", 0, 10);

    for (let i = 0; i < targetCount; i++) {
        const target = enemiesInRange[i].enemy;
        createWeaponEffect(weaponId, target.x, target.y, weaponData);
        damageTarget(target, stats.damage);
    }
}

// ============================================
// AURA - Soul Aura (constant damage field) - OLD VERSION
// ============================================
function fireAura(weaponId, stats, weaponData) {
    const playerPos = PlayerController.getPlayerPosition();
    if (playerPos.x === 0 && playerPos.y === 0) return;

    // Create visual aura effect around player
    createWeaponEffect(weaponId, playerPos.x, playerPos.y, weaponData);

    // Damage all enemies in range
    const allEnemies = getAllTargets();
    const auraRange = stats.range + (weaponData.rangePerLevel || 0) * ((state.weaponLevels[weaponId] || 1) - 1);

    for (const enemy of allEnemies) {
        const dx = enemy.x - playerPos.x;
        const dy = enemy.y - playerPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= auraRange) {
            damageTarget(enemy, stats.damage);
        }
    }
}

// ============================================
// SOUL AURA PERSISTENT - Follows player, constant tick damage
// ============================================
function updateSoulAura(dt) {
    const weaponId = "soul_aura";

    // Check if soul aura is equipped and active
    if (!state.equippedWeapons.includes(weaponId)) {
        // Destroy aura if not equipped
        if (soulAuraEffect && soulAuraEffect.runtime) {
            soulAuraEffect.destroy();
            soulAuraEffect = null;
        }
        return;
    }

    const weaponLevel = state.weaponLevels[weaponId] || 0;
    if (weaponLevel <= 0) {
        // Destroy aura if not acquired
        if (soulAuraEffect && soulAuraEffect.runtime) {
            soulAuraEffect.destroy();
            soulAuraEffect = null;
        }
        return;
    }

    const runtime = getRuntime();
    const playerPos = PlayerController.getPlayerPosition();
    if (playerPos.x === 0 && playerPos.y === 0) return;

    const weaponData = WeaponData.getWeaponData(weaponId);
    const stats = WeaponData.getWeaponStatsAtLevel(weaponId, weaponLevel);
    if (!stats || !weaponData) return;

    // Calculate aura range with level bonus
    const auraRange = stats.range + (weaponData.rangePerLevel || 0) * (weaponLevel - 1);

    // Create or update the visual effect
    if (!soulAuraEffect || !soulAuraEffect.runtime) {
        soulAuraEffect = runtime.objects.Effects?.createInstance("Game", playerPos.x, playerPos.y, true);
        if (soulAuraEffect) {
            try {
                soulAuraEffect.setAnimation(weaponData.animationName);
            } catch (e) { }

            // Store base size for scaling
            soulAuraEffect.instVars = soulAuraEffect.instVars || {};
            soulAuraEffect.baseWidth = Math.abs(soulAuraEffect.width);
            soulAuraEffect.baseHeight = Math.abs(soulAuraEffect.height);

            console.log("[WeaponSystem] Soul Aura created with range:", auraRange);
        }
        soulAuraCurrentRange = 0;  // Force scale update
    }

    // Update aura position to follow player
    if (soulAuraEffect && soulAuraEffect.runtime) {
        soulAuraEffect.x = playerPos.x;
        soulAuraEffect.y = playerPos.y;

        // Scale sprite based on range (range determines visual size)
        if (soulAuraCurrentRange !== auraRange) {
            soulAuraCurrentRange = auraRange;
            // Scale so that sprite diameter = range * 2
            const targetSize = auraRange * 2;
            const baseSize = soulAuraEffect.baseWidth || 64;
            const scale = targetSize / baseSize;
            soulAuraEffect.width = baseSize * scale;
            soulAuraEffect.height = (soulAuraEffect.baseHeight || 64) * scale;
        }

        // Keep it below player (at bottom z-order within effects)
        soulAuraEffect.moveToBottom();
    }

    // Damage tick
    soulAuraDamageTimer -= dt;
    if (soulAuraDamageTimer <= 0) {
        soulAuraDamageTimer = stats.cooldown;

        // Damage all enemies in range
        const allEnemies = getAllTargets();
        for (const enemy of allEnemies) {
            const dx = enemy.x - playerPos.x;
            const dy = enemy.y - playerPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= auraRange) {
                // Deal damage with blue damage text
                damageTargetWithColor(enemy, stats.damage, [0.3, 0.6, 1]);  // Blue color
            }
        }
    }
}

// Damage target with custom color for damage text
// Now uses DamageCalculator for proper damage bonuses, crit, and poison
function damageTargetWithColor(target, damage, color) {
    if (!target || !target.instVars) return;

    // Use DamageCalculator for consistent damage handling
    // This includes: damage bonuses, crit chance, poison chance (Fang), etc.
    DamageCalculator.applyDamageToEnemy(target, damage, { customColor: color });
}

// Spawn damage text with custom color
function spawnColoredDamageText(x, y, damage, color) {
    const runtime = getRuntime();

    const offsetX = (Math.random() - 0.5) * 40;
    const offsetY = (Math.random() - 0.5) * 20;

    const text = runtime.objects.DamageText?.createInstance("Game", x + offsetX, y + offsetY);
    if (!text) return;

    text.text = damage.toString();
    text.opacity = 1;
    text.colorRgb = color;  // Custom color (blue for soul aura)

    const startY = text.y;
    const endY = startY - 100;

    text.behaviors.Tween.startTween("y", endY, 1.0, "default");

    setTimeout(() => {
        try {
            if (text && text.runtime) {
                text.behaviors.Tween.startTween("opacity", 0, 0.4, "default");
            }
        } catch (e) { }
    }, 600);

    setTimeout(() => {
        try {
            if (text && text.runtime) text.destroy();
        } catch (e) { }
    }, 1100);
}

// ============================================
// TRAIL - Inferno/Frost Trail (leaves trail)
// ============================================
function fireTrail(weaponId, stats, weaponData) {
    const playerPos = PlayerController.getPlayerPosition();
    if (playerPos.x === 0 && playerPos.y === 0) return;

    // Only create trail if player is moving
    const player = PlayerController.getPlayer();
    if (!player) return;

    // Create trail effect at player position
    const runtime = getRuntime();
    const effect = runtime.objects.Effects?.createInstance("Game", playerPos.x, playerPos.y, true);
    if (!effect) return;

    try {
        effect.setAnimation(weaponData.animationName);
    } catch (e) {
        // Animation not found
    }

    // Calculate trail duration based on level
    const trailDuration = (weaponData.trailDuration || 2.0) +
        (weaponData.durationPerLevel || 0) * ((state.weaponLevels[weaponId] || 1) - 1);

    // Add to active trails
    activeTrails.push({
        effect: effect,
        x: playerPos.x,
        y: playerPos.y,
        damage: stats.damage,
        range: 30,  // Trail hit radius
        timeLeft: trailDuration,
        damageCooldown: 0,
        freezeDuration: weaponData.freezeDuration || 0,
        weaponId: weaponId
    });
}

// ============================================
// MELEE - Swift Blade, Sword (slash nearest)
// ============================================
function fireMelee(weaponId, stats, weaponData) {
    const playerPos = PlayerController.getPlayerPosition();
    if (playerPos.x === 0 && playerPos.y === 0) return;

    const allEnemies = getAllTargets();
    const hitRange = stats.range;  // 150 pixels

    // Find nearest enemy within hit range
    let nearestEnemy = null;
    let nearestDist = hitRange;

    for (const enemy of allEnemies) {
        const dx = enemy.x - playerPos.x;
        const dy = enemy.y - playerPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < nearestDist) {
            nearestDist = dist;
            nearestEnemy = enemy;
        }
    }

    // No enemy in range - don't attack
    if (!nearestEnemy) return;

    // Slash at enemy position
    const dx = nearestEnemy.x - playerPos.x;
    const dy = nearestEnemy.y - playerPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const dirX = dx / dist;
    const dirY = dy / dist;

    // Create slash effect at enemy
    const effect = createWeaponEffect(weaponId, nearestEnemy.x, nearestEnemy.y, weaponData);

    if (effect && effect.runtime) {
        // Rotate to face direction
        effect.angle = Math.atan2(dirY, dirX);
        // Make effect slightly bigger (1.3x size)
        effect.width *= 1.3;
        effect.height *= 1.3;
    }

    // Damage ALL enemies within range from PLAYER
    for (const enemy of allEnemies) {
        const dx = enemy.x - playerPos.x;
        const dy = enemy.y - playerPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= hitRange) {
            damageTarget(enemy, stats.damage);
        }
    }
}

// ============================================
// PROJECTILE - Fortune Dice (random damage)
// ============================================
function fireProjectile(weaponId, stats, weaponData) {
    const playerPos = PlayerController.getPlayerPosition();
    if (playerPos.x === 0 && playerPos.y === 0) return;

    const firePoint = getPlayerFirePoint();

    // Find nearest enemy
    const target = findNearestEnemy(playerPos, stats.range);
    if (!target) return;

    // Calculate random damage for fortune dice
    let damage = stats.damage;
    if (weaponData.randomDamageMin !== undefined) {
        const roll = Math.floor(Math.random() * (weaponData.randomDamageMax - weaponData.randomDamageMin + 1)) + weaponData.randomDamageMin;
        damage = roll + (stats.level - 1);  // Base roll + level bonus

        // Crit on max roll (6)
        if (roll === weaponData.randomDamageMax) {
            damage *= 2;  // Double damage on crit
        }
    }

    // Create projectile (fortune dice spins and is smaller)
    const isDice = weaponData.randomDamageMin !== undefined;
    spawnProjectile(weaponId, firePoint.x, firePoint.y, target.x, target.y, damage, weaponData, {
        speed: 400,
        pierce: 0,
        scale: isDice ? 0.5 : 1,  // Dice is 50% smaller
        spin: isDice  // Dice spins while flying
    });
}

// ============================================
// PIERCING - Executioner, Longbow
// ============================================
function firePiercing(weaponId, stats, weaponData) {
    const playerPos = PlayerController.getPlayerPosition();
    if (playerPos.x === 0 && playerPos.y === 0) return;

    const firePoint = getPlayerFirePoint();

    // Find nearest enemy
    const target = findNearestEnemy(playerPos, stats.range);
    if (!target) return;

    const pierce = weaponData.pierceCount || 999;  // Executioner pierces all

    // Longbow specific settings - faster and smaller
    const isLongbow = weaponId === "longbow";

    // Play arrow sound for longbow
    if (isLongbow) {
        const runtime = getRuntime();
        runtime.callFunction("playAudio", "arrow", 0, 10);
    }

    spawnProjectile(weaponId, firePoint.x, firePoint.y, target.x, target.y, stats.damage, weaponData, {
        speed: isLongbow ? 1800 : 1200,  // Much faster!
        pierce: pierce,
        executeChance: weaponData.executeChance || 0,
        scale: isLongbow ? 0.7 : 1  // Longbow smaller sprite
    });
}

// ============================================
// SHIELD SHOCKWAVE (legacy - not used by Guardian Shield anymore)
// ============================================
function fireShieldShockwave(weaponId, stats, weaponData) {
    const playerPos = PlayerController.getPlayerPosition();
    if (playerPos.x === 0 && playerPos.y === 0) return;

    // Create shockwave effect
    createWeaponEffect(weaponId, playerPos.x, playerPos.y, weaponData);

    // Damage all enemies in range
    const allEnemies = getAllTargets();
    for (const enemy of allEnemies) {
        const dx = enemy.x - playerPos.x;
        const dy = enemy.y - playerPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= stats.range) {
            damageTarget(enemy, stats.damage);
        }
    }
}

// ============================================
// GUARDIAN SHIELD - Orbiting shields that block damage
// ============================================
function spawnGuardianShields(weaponId, stats, weaponData) {
    // Don't spawn if shields already exist
    if (activeShields.length > 0) return;

    // Don't spawn if in respawn cooldown
    if (shieldsDestroyed && shieldRespawnTimer > 0) return;

    const playerPos = PlayerController.getPlayerPosition();
    if (playerPos.x === 0 && playerPos.y === 0) return;

    const runtime = getRuntime();
    const level = state.weaponLevels[weaponId] || 1;

    // Calculate shield count based on level (1 base + upgrades)
    let shieldCount = weaponData.baseShieldCount || 1;
    // Add shields from upgrades (every 2 levels = +1 shield roughly)
    shieldCount += Math.floor((level - 1) / 2);
    shieldCount = Math.min(shieldCount, 4);  // Max 4 shields

    const orbitRadius = stats.range;

    for (let i = 0; i < shieldCount; i++) {
        const effect = runtime.objects.Effects?.createInstance("Game", playerPos.x, playerPos.y, true);
        if (!effect) continue;

        try {
            effect.setAnimation(weaponData.animationName);
        } catch (e) { }

        // Make shield smaller (0.7x size)
        effect.width *= 0.7;
        effect.height *= 0.7;

        const angle = (i / shieldCount) * Math.PI * 2;

        activeShields.push({
            effect: effect,
            angle: angle,
            orbitRadius: orbitRadius,
            rotationSpeed: 2.0,  // radians per second
            weaponId: weaponId
        });
    }

    shieldsDestroyed = false;
    console.log("[WeaponSystem] Spawned", shieldCount, "Guardian Shields");
}

// Update shield positions (called from updateWeapons)
function updateShields(dt) {
    const playerPos = PlayerController.getPlayerPosition();
    if (playerPos.x === 0 && playerPos.y === 0) return;

    // Update respawn timer if all shields destroyed
    if (shieldsDestroyed && activeShields.length === 0) {
        shieldRespawnTimer -= dt;
        if (shieldRespawnTimer <= 0) {
            shieldsDestroyed = false;
            // Trigger respawn on next weapon update cycle
            const weaponId = "guardian_shield";
            if (state.equippedWeapons.includes(weaponId) && (state.weaponLevels[weaponId] || 0) > 0) {
                weaponCooldowns[weaponId] = 0;  // Reset cooldown to spawn immediately
            }
        }
        return;
    }

    // Update each shield's orbit position
    for (const shield of activeShields) {
        shield.angle += shield.rotationSpeed * dt;

        const shieldX = playerPos.x + Math.cos(shield.angle) * shield.orbitRadius;
        const shieldY = playerPos.y + Math.sin(shield.angle) * shield.orbitRadius;

        if (shield.effect && shield.effect.runtime) {
            shield.effect.x = shieldX;
            shield.effect.y = shieldY;
            // Sprite stays upright (no rotation)
            shield.effect.angle = 0;
        }
    }
}

// Try to block damage with Guardian Shield (called from PlayerController)
export function tryBlockDamage(damage) {
    // Check if we have active shields
    if (activeShields.length === 0) return false;

    // Block the damage by destroying one shield
    const shield = activeShields.pop();
    if (shield.effect && shield.effect.runtime) {
        shield.effect.destroy();
    }

    console.log("[WeaponSystem] Shield blocked", damage, "damage!", activeShields.length, "shields remaining");

    // If all shields gone, start respawn timer
    if (activeShields.length === 0) {
        const weaponData = WeaponData.getWeaponData("guardian_shield");
        const level = state.weaponLevels["guardian_shield"] || 1;
        // Base 10 seconds, reduced by upgrades
        shieldRespawnTimer = Math.max(5, (weaponData?.baseCooldown || 10) - (level - 1) * 0.5);
        shieldsDestroyed = true;
        console.log("[WeaponSystem] All shields destroyed! Respawning in", shieldRespawnTimer, "seconds");
    }

    return true;  // Damage was blocked
}

// Get active shield count (for UI)
export function getActiveShieldCount() {
    return activeShields.length;
}

// ============================================
// PULSE - Blood Ritual (AoE pulse + HP gain)
// ============================================
function firePulse(weaponId, stats, weaponData) {
    const playerPos = PlayerController.getPlayerPosition();
    if (playerPos.x === 0 && playerPos.y === 0) return;

    const runtime = getRuntime();

    // Damage all enemies in range and create blood drain effect on each
    const allEnemies = getAllTargets();
    let killedAny = false;

    for (const enemy of allEnemies) {
        const dx = enemy.x - playerPos.x;
        const dy = enemy.y - playerPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= stats.range) {
            // Create blood drain effect on enemy, facing towards player
            const effect = runtime.objects.Effects?.createInstance("Game", enemy.x, enemy.y, true);
            if (effect) {
                try {
                    effect.setAnimation(weaponData.animationName);
                } catch (e) { }

                // Rotate to face from enemy towards player (blood drains to player)
                effect.angle = Math.atan2(dy, dx);

                // Auto-destroy after animation
                const duration = weaponData.effectDuration || 0.4;
                setTimeout(() => {
                    try {
                        if (effect && effect.runtime) effect.destroy();
                    } catch (e) { }
                }, duration * 1000);
            }

            const healthBefore = enemy.instVars?.health || 0;
            damageTarget(enemy, stats.damage);

            // Check if we killed it (enemy destroyed or health <= 0)
            const isDead = !enemy.runtime || (enemy.instVars && enemy.instVars.health <= 0);
            if (healthBefore > 0 && isDead) {
                killedAny = true;
            }
        }
    }

    // HP gain chance on kill (uses stats which includes level bonuses)
    const hpChance = stats.hpGainChance || weaponData.hpGainChance || 0;
    console.log("[BloodRitual] killedAny:", killedAny, "hpChance:", hpChance);

    if (killedAny && hpChance > 0 && Math.random() < hpChance) {
        state.playerMaxHealth += 1;
        state.playerHealth += 1;
        console.log("[BloodRitual] +1 Max HP! Now:", state.playerMaxHealth);

        // Update HP bar immediately
        UIManager.updateHPBar();

        // Show +1 Max HP text
        spawnHpPlusText(playerPos.x, playerPos.y, 1);
    }
}

// Spawn HP plus text above player
function spawnHpPlusText(x, y, amount) {
    const runtime = getRuntime();

    console.log("[hpplusText] Attempting to create. Object exists:", !!runtime.objects.hpplusText);

    const text = runtime.objects.hpplusText?.createInstance("Game", x, y - 30);
    console.log("[hpplusText] Created:", !!text);
    if (!text) {
        // Fallback: try using GoldText object instead
        const fallbackText = runtime.objects.GoldText?.createInstance("Game", x, y - 30);
        if (fallbackText) {
            fallbackText.text = "+1 HP";
            fallbackText.colorRgb = [0.2, 1, 0.2]; // Green for HP
            // Make it bigger and more visible
            fallbackText.width = 200;
            fallbackText.height = 60;
            try {
                fallbackText.sizePt = 36; // Larger font size
            } catch (e) { }
            try {
                fallbackText.behaviors.Tween.startTween("y", y - 90, 0.8, "ease-out");
            } catch (e) { }
            setTimeout(() => {
                try {
                    if (fallbackText && fallbackText.runtime) {
                        fallbackText.behaviors.Tween.startTween("opacity", 0, 0.3, "default");
                    }
                } catch (e) { }
            }, 500);
            setTimeout(() => {
                try {
                    if (fallbackText && fallbackText.runtime) fallbackText.destroy();
                } catch (e) { }
            }, 900);
            console.log("[hpplusText] Used GoldText fallback");
            return;
        }
        console.log("[hpplusText] No text object available!");
        return;
    }

    text.text = "+" + amount;
    text.opacity = 1;

    // Float up animation
    const startY = text.y;
    const endY = startY - 60;

    try {
        text.behaviors.Tween.startTween("y", endY, 0.8, "ease-out");
    } catch (e) { }

    // Fade out and destroy
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

// ============================================
// RETURNING - Boomerang (hits twice)
// ============================================
function fireReturning(weaponId, stats, weaponData) {
    const playerPos = PlayerController.getPlayerPosition();
    if (playerPos.x === 0 && playerPos.y === 0) return;

    const firePoint = getPlayerFirePoint();

    // Get projectile count from stats (1-4 based on level)
    const projectileCount = stats.projectileCount || 1;
    boomerangMaxCount = projectileCount;

    // Don't fire if all boomerangs are already in flight
    if (boomerangsInFlight >= projectileCount) return;

    // Find target direction (nearest enemy or facing direction)
    const target = findNearestEnemy(playerPos, stats.range);
    let dirX, dirY;

    if (target) {
        const dx = target.x - firePoint.x;
        const dy = target.y - firePoint.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        dirX = dx / dist;
        dirY = dy / dist;
    } else {
        dirX = lastMoveX;
        dirY = lastMoveY;
    }

    // Fire all boomerangs in same direction with spread
    for (let i = 0; i < projectileCount; i++) {
        // First boomerang goes straight, others spread out more
        const spreadAngle = i === 0 ? 0 : (i - (projectileCount) / 2) * 0.4;  // ~23 degrees spread
        const cos = Math.cos(spreadAngle);
        const sin = Math.sin(spreadAngle);
        const spreadDirX = dirX * cos - dirY * sin;
        const spreadDirY = dirX * sin + dirY * cos;

        const targetX = firePoint.x + spreadDirX * stats.range;
        const targetY = firePoint.y + spreadDirY * stats.range;

        boomerangsInFlight++;

        spawnProjectile(weaponId, firePoint.x, firePoint.y, targetX, targetY, stats.damage, weaponData, {
            speed: 650,
            pierce: 999,
            returning: true,
            maxDist: stats.range,
            spin: true,
            isBoomerang: true
        });
    }
}

// ============================================
// BOUNCING - Bone Throw
// ============================================
function fireBouncing(weaponId, stats, weaponData) {
    const playerPos = PlayerController.getPlayerPosition();
    if (playerPos.x === 0 && playerPos.y === 0) return;

    const firePoint = getPlayerFirePoint();

    const target = findNearestEnemy(playerPos, stats.range);
    if (!target) return;

    // Use stats.bounceCount (includes upgrades) or fallback to weaponData
    const bounces = stats.bounceCount || weaponData.bounceCount || 2;
    console.log("[BoneThrow] Level:", stats.level, "Bounces:", bounces);

    spawnProjectile(weaponId, firePoint.x, firePoint.y, target.x, target.y, stats.damage, weaponData, {
        speed: 500,
        pierce: 0,
        bounces: bounces,
        bouncedFrom: [],
        scale: 0.5,  // Smaller sprite
        spin: true   // Spin while flying
    });
}

// ============================================
// BURST - Pistol (multiple rapid shots)
// ============================================
function fireBurst(weaponId, stats, weaponData) {
    const runtime = getRuntime();
    const playerPos = PlayerController.getPlayerPosition();
    if (playerPos.x === 0 && playerPos.y === 0) return;

    const target = findNearestEnemy(playerPos, stats.range);
    if (!target) return;

    const burstCount = weaponData.burstCount || 6;
    const critChance = weaponData.critChance || 0.15;

    for (let i = 0; i < burstCount; i++) {
        setTimeout(() => {
            const currentTarget = findNearestEnemy(playerPos, stats.range);
            if (!currentTarget) return;

            // Get current fire point
            const firePoint = getPlayerFirePoint();

            let damage = stats.damage;
            if (Math.random() < critChance) {
                damage *= 2;  // Crit!
            }

            // Add slight spread
            const spread = (Math.random() - 0.5) * 30;
            const angle = Math.atan2(currentTarget.y - firePoint.y, currentTarget.x - firePoint.x) + spread * Math.PI / 180;
            const targetX = firePoint.x + Math.cos(angle) * stats.range;
            const targetY = firePoint.y + Math.sin(angle) * stats.range;

            // Muzzle flash effect on fire point
            const muzzleFlash = runtime.objects.Effects?.createInstance("Game", firePoint.x, firePoint.y, true);
            if (muzzleFlash) {
                try {
                    muzzleFlash.setAnimation("PistolE");
                } catch (e) { }
                muzzleFlash.angle = angle;  // Point towards target
                // Quick disappear
                setTimeout(() => {
                    try {
                        if (muzzleFlash && muzzleFlash.runtime) muzzleFlash.destroy();
                    } catch (e) { }
                }, 80);
            }

            spawnProjectile(weaponId, firePoint.x, firePoint.y, targetX, targetY, damage, weaponData, {
                speed: 1200,  // Very fast
                pierce: 0,
                scale: 0.15  // Tiny bullets
            });
        }, i * 50);  // 50ms between shots
    }
}

// ============================================
// ORBIT - Spinning Axe (thrown, spin = extra hits)
// ============================================
function fireOrbit(weaponId, stats, weaponData) {
    const playerPos = PlayerController.getPlayerPosition();
    if (playerPos.x === 0 && playerPos.y === 0) return;

    const firePoint = getPlayerFirePoint();

    // Find 2 nearest enemies (or same enemy twice if only one)
    const allEnemies = getAllTargets();
    if (allEnemies.length === 0) return;

    // Sort by distance
    allEnemies.sort((a, b) => {
        const distA = Math.sqrt((a.x - playerPos.x) ** 2 + (a.y - playerPos.y) ** 2);
        const distB = Math.sqrt((b.x - playerPos.x) ** 2 + (b.y - playerPos.y) ** 2);
        return distA - distB;
    });

    // Filter by range
    const inRange = allEnemies.filter(e => {
        const dist = Math.sqrt((e.x - playerPos.x) ** 2 + (e.y - playerPos.y) ** 2);
        return dist <= stats.range;
    });

    if (inRange.length === 0) return;

    // Calculate axe count from upgrades (base 2, max 5)
    const axeCount = stats.axeCount || 2;

    for (let i = 0; i < axeCount; i++) {
        // Target different enemies if possible, otherwise same
        const target = inRange[i % inRange.length];

        // Spread axes evenly in a cone
        const baseAngle = Math.atan2(target.y - firePoint.y, target.x - firePoint.x);
        // Spread based on axe count: more axes = wider spread
        const totalSpread = 1.2;  // Total cone width in radians (~70 degrees)
        const angleOffset = axeCount > 1
            ? (i / (axeCount - 1) - 0.5) * totalSpread
            : 0;
        const angle = baseAngle + angleOffset;

        const targetX = firePoint.x + Math.cos(angle) * stats.range * 2.5;
        const targetY = firePoint.y + Math.sin(angle) * stats.range * 2.5;

        spawnProjectile(weaponId, firePoint.x, firePoint.y, targetX, targetY, stats.damage, weaponData, {
            speed: 400,
            pierce: 999,  // Pierce all enemies
            spin: true,  // Spin while flying
            spinDamage: true,  // Deal damage on each full rotation
            maxDist: stats.range * 2.5,
            hitRadius: 70  // Large hit area for axes
        });
    }
}

// ============================================
// SNIPER - High damage long range
// ============================================
function fireSniper(weaponId, stats, weaponData) {
    const playerPos = PlayerController.getPlayerPosition();
    if (playerPos.x === 0 && playerPos.y === 0) return;

    const firePoint = getPlayerFirePoint();

    // Find farthest enemy in range (prefers distant targets)
    const allEnemies = getAllTargets();
    let farthest = null;
    let farthestDist = 0;

    for (const enemy of allEnemies) {
        const dx = enemy.x - playerPos.x;
        const dy = enemy.y - playerPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= stats.range && dist > farthestDist) {
            farthestDist = dist;
            farthest = enemy;
        }
    }

    if (!farthest) return;

    spawnProjectile(weaponId, firePoint.x, firePoint.y, farthest.x, farthest.y, stats.damage, weaponData, {
        speed: 1000,
        pierce: 999  // Pierce all
    });
}

// ============================================
// HOMING - Seeking Dagger
// ============================================
function fireHoming(weaponId, stats, weaponData) {
    const playerPos = PlayerController.getPlayerPosition();
    if (playerPos.x === 0 && playerPos.y === 0) return;

    const firePoint = getPlayerFirePoint();

    const target = findNearestEnemy(playerPos, stats.range);
    if (!target) return;

    spawnProjectile(weaponId, firePoint.x, firePoint.y, target.x, target.y, stats.damage, weaponData, {
        speed: 300,
        pierce: 0,
        homing: true,
        homingStrength: 5,
        bounces: weaponData.bounceCount || 1,
        bouncedFrom: [],
        scale: 0.4  // Much smaller sprite
    });
}

// ============================================
// EXPLOSIVE - Fire Staff
// ============================================
function fireExplosive(weaponId, stats, weaponData) {
    const playerPos = PlayerController.getPlayerPosition();
    if (playerPos.x === 0 && playerPos.y === 0) return;

    const firePoint = getPlayerFirePoint();

    const target = findNearestEnemy(playerPos, stats.range);
    if (!target) return;

    spawnProjectile(weaponId, firePoint.x, firePoint.y, target.x, target.y, stats.damage, weaponData, {
        speed: 350,
        pierce: 0,
        explosive: true,
        explosionRadius: weaponData.explosionRadius || 150,
        scale: 0.5  // Smaller fireball sprite
    });
}


// ============================================
// KNOCKBACK - Cyclone
// ============================================
function fireKnockback(weaponId, stats, weaponData) {
    const playerPos = PlayerController.getPlayerPosition();
    if (playerPos.x === 0 && playerPos.y === 0) return;

    const firePoint = getPlayerFirePoint();

    // Find nearest enemy to target
    const target = findNearestEnemy(playerPos, stats.range);
    if (!target) return;

    spawnProjectile(weaponId, firePoint.x, firePoint.y, target.x, target.y, stats.damage, weaponData, {
        speed: 200,
        pierce: 999,
        knockback: weaponData.knockbackForce || 150,
        scale: 0.4,  // Much smaller
        noRotate: true  // Don't change angle
    });
}


// ============================================
// FIRE PATH - Inferno Trail (creates stationary fire paths)
// ============================================
function fireFirePath(weaponId, stats, weaponData) {
    const playerPos = PlayerController.getPlayerPosition();
    if (playerPos.x === 0 && playerPos.y === 0) return;

    const runtime = getRuntime();
    const level = state.weaponLevels[weaponId] || 1;
    const maxLevel = 5;

    // Scale based on level: 50% at level 1, 100% at max level
    const minScale = 0.5;
    const scale = minScale + ((1 - minScale) / (maxLevel - 1)) * (level - 1);

    // Fire path properties (scaled by level)
    const maxLength = weaponData.pathLength || 319;
    const maxWidth = weaponData.pathWidth || 75;
    const pathLength = maxLength * scale;
    const pathWidth = maxWidth * scale;
    const pathDuration = (weaponData.pathDuration || 4.0) + (weaponData.durationPerLevel || 0) * (level - 1);
    const tickRate = weaponData.tickRate || 0.2;

    // Create fire path BEHIND player (opposite to movement direction)
    const angle = Math.atan2(lastMoveY, lastMoveX);

    // Path center is BEHIND player (opposite direction)
    const pathCenterX = playerPos.x - Math.cos(angle) * (pathLength / 2);
    const pathCenterY = playerPos.y - Math.sin(angle) * (pathLength / 2);

    // Create the fire path effect
    const effect = runtime.objects.Effects?.createInstance("Game", pathCenterX, pathCenterY, true);
    if (!effect) return;

    try {
        effect.setAnimation(weaponData.animationName);
    } catch (e) { }

    // Rotate and scale effect (keeps aspect ratio)
    effect.angle = angle;
    effect.width = pathLength;
    effect.height = pathWidth;

    // Place below player sprite (lower z-order)
    effect.moveToBottom();

    // Add to active fire paths
    activeFirePaths.push({
        effect: effect,
        x: pathCenterX,
        y: pathCenterY,
        angle: angle,
        length: pathLength,
        width: pathWidth,
        damage: stats.damage,
        tickRate: tickRate,
        timeLeft: pathDuration,
        damageTimers: new Map(),  // Track damage cooldown per enemy
        weaponId: weaponId
    });

    console.log("[WeaponSystem] Created fire path at", pathCenterX.toFixed(0), pathCenterY.toFixed(0), "duration:", pathDuration);
}

// Update fire paths (damages enemies standing on them)
function updateFirePaths(dt) {
    for (let i = activeFirePaths.length - 1; i >= 0; i--) {
        const path = activeFirePaths[i];

        // Update lifetime
        path.timeLeft -= dt;
        if (path.timeLeft <= 0) {
            if (path.effect && path.effect.runtime) path.effect.destroy();
            activeFirePaths.splice(i, 1);
            continue;
        }

        // Fade out effect when close to expiring
        if (path.effect && path.effect.runtime && path.timeLeft < 1.0) {
            path.effect.opacity = path.timeLeft;
        }

        // Update damage timers for each enemy
        for (const [uid, timer] of path.damageTimers.entries()) {
            path.damageTimers.set(uid, timer - dt);
        }

        // Check for enemies standing on the fire path
        const targets = getAllTargets();
        for (const target of targets) {
            if (!target || !target.runtime) continue;

            // Check if enemy is within the fire path (rotated rectangle check)
            if (isPointInFirePath(target.x, target.y, path)) {
                // Check if this enemy can take damage (cooldown expired)
                const lastDamageTimer = path.damageTimers.get(target.uid) || 0;
                if (lastDamageTimer <= 0) {
                    // Deal tick damage with orange color
                    damageTargetWithColor(target, path.damage, [1, 0.5, 0]);  // Orange fire color
                    path.damageTimers.set(target.uid, path.tickRate);
                }
            }
        }
    }
}

// Check if a point is inside a rotated rectangle (fire/frost path)
function isPointInPath(px, py, path) {
    // Translate point relative to path center
    const dx = px - path.x;
    const dy = py - path.y;

    // Rotate point to align with path's local coordinate system
    const cos = Math.cos(-path.angle);
    const sin = Math.sin(-path.angle);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    // Check if point is within the unrotated rectangle bounds
    const halfLength = path.length / 2;
    const halfWidth = path.width / 2;

    return Math.abs(localX) <= halfLength && Math.abs(localY) <= halfWidth;
}

// Alias for backwards compatibility
function isPointInFirePath(px, py, path) {
    return isPointInPath(px, py, path);
}

// ============================================
// FROST PATH - Frost Trail (freezes enemies)
// ============================================
function fireFrostPath(weaponId, stats, weaponData) {
    const playerPos = PlayerController.getPlayerPosition();
    if (playerPos.x === 0 && playerPos.y === 0) return;

    const runtime = getRuntime();
    const level = state.weaponLevels[weaponId] || 1;
    const maxLevel = 5;

    // Scale based on level: 50% at level 1, 100% at max level
    const minScale = 0.5;
    const scale = minScale + ((1 - minScale) / (maxLevel - 1)) * (level - 1);

    // Frost path properties (scaled by level)
    const maxLength = weaponData.pathLength || 319;
    const maxWidth = weaponData.pathWidth || 75;
    const pathLength = maxLength * scale;
    const pathWidth = maxWidth * scale;
    const pathDuration = (weaponData.pathDuration || 4.0) + (weaponData.durationPerLevel || 0) * (level - 1);
    const freezeDuration = weaponData.freezeDuration || 1.5;
    const tickRate = weaponData.tickRate || 0.3;

    // Create frost path BEHIND player (opposite to movement direction)
    const angle = Math.atan2(lastMoveY, lastMoveX);

    // Path center is BEHIND player
    const pathCenterX = playerPos.x - Math.cos(angle) * (pathLength / 2);
    const pathCenterY = playerPos.y - Math.sin(angle) * (pathLength / 2);

    // Create the frost path effect
    const effect = runtime.objects.Effects?.createInstance("Game", pathCenterX, pathCenterY, true);
    if (!effect) return;

    try {
        effect.setAnimation(weaponData.animationName);
    } catch (e) { }

    // Rotate and scale effect
    effect.angle = angle;
    effect.width = pathLength;
    effect.height = pathWidth;

    // Place below player sprite
    effect.moveToBottom();

    // Add to active frost paths
    activeFrostPaths.push({
        effect: effect,
        x: pathCenterX,
        y: pathCenterY,
        angle: angle,
        length: pathLength,
        width: pathWidth,
        freezeDuration: freezeDuration,
        tickRate: tickRate,
        timeLeft: pathDuration,
        freezeTimers: new Map(),  // Track freeze cooldown per enemy
        weaponId: weaponId
    });

    console.log("[WeaponSystem] Created frost path, freeze duration:", freezeDuration);
}

// Update frost paths (freezes enemies standing on them)
function updateFrostPaths(dt) {
    for (let i = activeFrostPaths.length - 1; i >= 0; i--) {
        const path = activeFrostPaths[i];

        // Update lifetime
        path.timeLeft -= dt;
        if (path.timeLeft <= 0) {
            if (path.effect && path.effect.runtime) path.effect.destroy();
            activeFrostPaths.splice(i, 1);
            continue;
        }

        // Fade out effect when close to expiring
        if (path.effect && path.effect.runtime && path.timeLeft < 1.0) {
            path.effect.opacity = path.timeLeft;
        }

        // Update freeze timers for each enemy
        for (const [uid, timer] of path.freezeTimers.entries()) {
            path.freezeTimers.set(uid, timer - dt);
        }

        // Check for enemies standing on the frost path
        const targets = getAllTargets();
        for (const target of targets) {
            if (!target || !target.runtime) continue;

            // Check if enemy is within the frost path
            if (isPointInPath(target.x, target.y, path)) {
                // Check if this enemy can be frozen (cooldown expired)
                const lastFreezeTimer = path.freezeTimers.get(target.uid) || 0;
                if (lastFreezeTimer <= 0) {
                    // Freeze the enemy
                    freezeEnemy(target, path.freezeDuration);
                    path.freezeTimers.set(target.uid, path.tickRate);
                }
            }
        }
    }
}

// Freeze an enemy for a duration
function freezeEnemy(enemy, duration) {
    if (!enemy || !enemy.instVars) return;

    // Store original speed if not already frozen
    if (!enemy.instVars.isFrozen) {
        enemy.instVars.originalSpeed = enemy.instVars.speed || 100;
        enemy.instVars.isFrozen = true;
        enemy.instVars.speed = 0;

        // Visual effect - blue tint
        try {
            enemy.colorRgb = [0.5, 0.8, 1];  // Blue/cyan tint
        } catch (e) { }
    }

    // Set/extend freeze timer
    enemy.instVars.freezeTimer = Math.max(enemy.instVars.freezeTimer || 0, duration);
}

// Update frozen enemies (called from main update)
function updateFrozenEnemies(dt) {
    const targets = getAllTargets();
    for (const enemy of targets) {
        if (!enemy || !enemy.instVars || !enemy.instVars.isFrozen) continue;

        enemy.instVars.freezeTimer -= dt;

        if (enemy.instVars.freezeTimer <= 0) {
            // Unfreeze
            enemy.instVars.isFrozen = false;
            enemy.instVars.speed = enemy.instVars.originalSpeed || 100;

            // Remove blue tint
            try {
                enemy.colorRgb = [1, 1, 1];
            } catch (e) { }
        }
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// Get all valid targets (enemies + boss)
function getAllTargets() {
    const runtime = getRuntime();
    const enemies1 = runtime.objects.Enemy?.getAllInstances() || [];
    const enemies2 = runtime.objects.Enemy2?.getAllInstances() || [];
    const enemies3 = runtime.objects.Enemy3?.getAllInstances() || [];
    const enemies4 = runtime.objects.Enemy4?.getAllInstances() || [];
    const enemies5 = runtime.objects.Enemy5?.getAllInstances() || [];
    const enemies6 = runtime.objects.Enemy6?.getAllInstances() || [];
    const enemies7 = runtime.objects.Enemy7?.getAllInstances() || [];
    const enemies8 = runtime.objects.Enemy8?.getAllInstances() || [];
    const boss = runtime.objects.Boss1?.getFirstInstance();

    const targets = [...enemies1, ...enemies2, ...enemies3, ...enemies4, ...enemies5, ...enemies6, ...enemies7, ...enemies8];
    if (boss) targets.push(boss);

    return targets;
}

// Find nearest enemy to a position
function findNearestEnemy(pos, maxRange) {
    const allEnemies = getAllTargets();
    let nearest = null;
    let nearestDist = maxRange;

    for (const enemy of allEnemies) {
        const dx = enemy.x - pos.x;
        const dy = enemy.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < nearestDist) {
            nearestDist = dist;
            nearest = enemy;
        }
    }

    return nearest;
}

// Damage a target with item modifiers (handles boss separately)
function damageTarget(target, baseDamage) {
    if (!target) return;

    // Use DamageCalculator to apply all item modifiers
    const result = DamageCalculator.applyDamageToEnemy(target, baseDamage);
    return result;
}

// Spawn a projectile
function spawnProjectile(weaponId, startX, startY, targetX, targetY, damage, weaponData, options = {}) {
    const runtime = getRuntime();

    const effect = runtime.objects.Effects?.createInstance("Game", startX, startY, true);
    if (!effect) return;

    try {
        effect.setAnimation(weaponData.animationName);
    } catch (e) { }

    // Scale option (for smaller projectiles)
    if (options.scale) {
        effect.width *= options.scale;
        effect.height *= options.scale;
    }

    // Spin option flag (will be rotated in updateProjectiles)
    const spinSpeed = options.spin ? 15 : 0;  // radians per second

    const dx = targetX - startX;
    const dy = targetY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) return;

    const dirX = dx / dist;
    const dirY = dy / dist;

    // Rotate effect to face direction (skip if spinning or noRotate)
    if (!options.spin && !options.noRotate) {
        effect.angle = Math.atan2(dirY, dirX);
    }

    activeProjectiles.push({
        effect: effect,
        x: startX,
        y: startY,
        dirX: dirX,
        dirY: dirY,
        speed: options.speed || 400,
        damage: damage,
        pierce: options.pierce || 0,
        pierceCount: 0,
        hitEnemies: new Set(),
        maxDist: options.maxDist || 1000,
        traveledDist: 0,
        returning: options.returning || false,
        returnPhase: false,
        bounces: options.bounces || 0,
        bouncedFrom: options.bouncedFrom || [],
        homing: options.homing || false,
        homingStrength: options.homingStrength || 5,
        explosive: options.explosive || false,
        explosionRadius: options.explosionRadius || 80,
        knockback: options.knockback || 0,
        executeChance: options.executeChance || 0,
        spinSpeed: spinSpeed,
        weaponId: weaponId,
        isBoomerang: options.isBoomerang || false,
        spinDamage: options.spinDamage || false,  // Deal damage on each full rotation
        totalRotation: 0,  // Track total rotation for spinDamage
        hitRadius: options.hitRadius || 40,  // Collision radius
        noRotate: options.noRotate || false  // Don't change angle during flight
    });
}

// Update all active projectiles
function updateProjectiles(dt) {
    const runtime = getRuntime();
    const playerPos = PlayerController.getPlayerPosition();

    for (let i = activeProjectiles.length - 1; i >= 0; i--) {
        const proj = activeProjectiles[i];

        // Homing behavior
        if (proj.homing && !proj.returnPhase) {
            const target = findNearestEnemy({ x: proj.x, y: proj.y }, 300);
            if (target) {
                const dx = target.x - proj.x;
                const dy = target.y - proj.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    const targetDirX = dx / dist;
                    const targetDirY = dy / dist;
                    proj.dirX += (targetDirX - proj.dirX) * proj.homingStrength * dt;
                    proj.dirY += (targetDirY - proj.dirY) * proj.homingStrength * dt;
                    const len = Math.sqrt(proj.dirX * proj.dirX + proj.dirY * proj.dirY);
                    proj.dirX /= len;
                    proj.dirY /= len;
                }
            }
        }

        // Returning behavior
        if (proj.returning && !proj.returnPhase && proj.traveledDist >= proj.maxDist) {
            proj.returnPhase = true;
            proj.hitEnemies.clear();  // Can hit again on return
        }

        if (proj.returnPhase) {
            const dx = playerPos.x - proj.x;
            const dy = playerPos.y - proj.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                proj.dirX = dx / dist;
                proj.dirY = dy / dist;
            }
            if (dist < 30) {
                // Returned to player
                if (proj.isBoomerang) {
                    boomerangsInFlight = Math.max(0, boomerangsInFlight - 1);  // Decrement counter
                }
                if (proj.effect && proj.effect.runtime) proj.effect.destroy();
                activeProjectiles.splice(i, 1);
                continue;
            }
        }

        // Move projectile
        const moveX = proj.dirX * proj.speed * dt;
        const moveY = proj.dirY * proj.speed * dt;
        proj.x += moveX;
        proj.y += moveY;
        proj.traveledDist += Math.sqrt(moveX * moveX + moveY * moveY);

        if (proj.effect && proj.effect.runtime) {
            proj.effect.x = proj.x;
            proj.effect.y = proj.y;

            // Spin rotation or face direction
            if (proj.spinSpeed) {
                const rotation = proj.spinSpeed * dt;
                proj.effect.angle += rotation;

                // Track rotation for spinDamage weapons (like spinning axe)
                if (proj.spinDamage) {
                    proj.totalRotation += Math.abs(rotation);
                    // Every full rotation (2*PI), allow hitting enemies again
                    if (proj.totalRotation >= Math.PI * 2) {
                        proj.totalRotation -= Math.PI * 2;
                        proj.hitEnemies.clear();  // Can hit all enemies again
                    }
                }
            } else if (!proj.noRotate) {
                proj.effect.angle = Math.atan2(proj.dirY, proj.dirX);
            }
        }

        // Check collisions
        const targets = getAllTargets();
        for (const target of targets) {
            if (proj.hitEnemies.has(target.uid)) continue;
            if (proj.bouncedFrom && proj.bouncedFrom.includes(target.uid)) continue;

            const dx = target.x - proj.x;
            const dy = target.y - proj.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const hitRadius = proj.hitRadius || 40;
            if (dist < hitRadius) {
                // Hit!
                proj.hitEnemies.add(target.uid);

                // Execute chance
                if (proj.executeChance > 0 && Math.random() < proj.executeChance) {
                    // Instant kill (very high damage)
                    damageTarget(target, 99999);
                } else {
                    damageTarget(target, proj.damage);
                }

                // Knockback
                if (proj.knockback > 0 && target.x !== undefined) {
                    target.x += proj.dirX * proj.knockback;
                    target.y += proj.dirY * proj.knockback;
                }

                // Explosive
                if (proj.explosive) {
                    createExplosion(proj.x, proj.y, proj.explosionRadius, proj.damage, proj.weaponId);
                    if (proj.effect && proj.effect.runtime) proj.effect.destroy();
                    activeProjectiles.splice(i, 1);
                    break;
                }

                // Bouncing
                if (proj.bounces > 0) {
                    proj.bounces--;
                    if (proj.bouncedFrom) proj.bouncedFrom.push(target.uid);

                    // Find new target (wider search range)
                    const allTargets = getAllTargets();
                    let newTarget = null;
                    let nearestDist = 800;  // Search up to 800 pixels (increased)

                    for (const t of allTargets) {
                        if (proj.bouncedFrom.includes(t.uid)) continue;
                        const tdx = t.x - proj.x;
                        const tdy = t.y - proj.y;
                        const tdist = Math.sqrt(tdx * tdx + tdy * tdy);
                        if (tdist < nearestDist) {
                            nearestDist = tdist;
                            newTarget = t;
                        }
                    }

                    if (newTarget) {
                        const ndx = newTarget.x - proj.x;
                        const ndy = newTarget.y - proj.y;
                        const ndist = Math.sqrt(ndx * ndx + ndy * ndy);
                        if (ndist > 0) {
                            proj.dirX = ndx / ndist;
                            proj.dirY = ndy / ndist;
                            // Reset travel distance for bounce
                            proj.traveledDist = 0;
                            proj.maxDist = 600;  // Give it more range after bounce
                        }
                        console.log("[Bounce] Found new target at dist:", Math.round(nearestDist), "Bounces left:", proj.bounces);
                    } else {
                        console.log("[Bounce] No target found! Bounces wasted:", proj.bounces + 1);
                        // No target found - projectile continues in same direction
                    }
                    break;  // Exit target loop after bounce
                }

                // Pierce
                proj.pierceCount++;
                if (proj.pierce > 0 && proj.pierceCount > proj.pierce) {
                    if (proj.effect && proj.effect.runtime) proj.effect.destroy();
                    activeProjectiles.splice(i, 1);
                    break;
                }

                // Non-piercing projectile
                if (proj.pierce === 0 && !proj.bounces) {
                    if (proj.effect && proj.effect.runtime) proj.effect.destroy();
                    activeProjectiles.splice(i, 1);
                    break;
                }
            }
        }

        // Check if projectile went too far
        if (!proj.returning && proj.traveledDist > proj.maxDist) {
            if (proj.effect && proj.effect.runtime) proj.effect.destroy();
            activeProjectiles.splice(i, 1);
        }
    }
}

// Create explosion at position
function createExplosion(x, y, radius, damage, weaponId) {
    const runtime = getRuntime();

    // Play fire sound for explosion
    runtime.callFunction("playAudio", "fire", 0, 10);

    const weaponData = WeaponData.getWeaponData(weaponId);

    // Create explosion effect - scale based on radius
    if (weaponData) {
        const effect = runtime.objects.Effects?.createInstance("Game", x, y, true);
        if (effect) {
            try {
                effect.setAnimation(weaponData.animationName);
            } catch (e) { }

            // Scale effect to match explosion radius (visual feedback)
            // Base sprite is 48x48, scale relative to radius but keep it smaller
            const scale = (radius / 150) * 1.2;  // Max ~1.2x at 150 radius
            effect.width *= scale;
            effect.height *= scale;
            effect.opacity = 0.8;

            // Fade out and destroy
            setTimeout(() => {
                try {
                    if (effect && effect.runtime) {
                        effect.behaviors.Tween.startTween("opacity", 0, 0.3, "default");
                    }
                } catch (e) { }
            }, 100);
            setTimeout(() => {
                try {
                    if (effect && effect.runtime) effect.destroy();
                } catch (e) { }
            }, 400);
        }
    }

    // Damage all enemies in radius
    const targets = getAllTargets();
    for (const target of targets) {
        const dx = target.x - x;
        const dy = target.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= radius) {
            damageTarget(target, damage);
        }
    }
}

// Update orbiting projectiles
function updateOrbits(dt) {
    const playerPos = PlayerController.getPlayerPosition();

    for (let i = activeOrbits.length - 1; i >= 0; i--) {
        const orbit = activeOrbits[i];

        orbit.timeLeft -= dt;
        if (orbit.timeLeft <= 0) {
            if (orbit.effect && orbit.effect.runtime) orbit.effect.destroy();
            activeOrbits.splice(i, 1);
            continue;
        }

        // Rotate around player
        orbit.angle += orbit.rotationSpeed * dt;
        const orbitX = playerPos.x + Math.cos(orbit.angle) * orbit.orbitRadius;
        const orbitY = playerPos.y + Math.sin(orbit.angle) * orbit.orbitRadius;

        if (orbit.effect && orbit.effect.runtime) {
            orbit.effect.x = orbitX;
            orbit.effect.y = orbitY;
            orbit.effect.angle = orbit.angle;
        }

        // Damage cooldown
        orbit.damageCooldown -= dt;
        if (orbit.damageCooldown > 0) continue;

        // Check collisions
        const targets = getAllTargets();
        for (const target of targets) {
            if (orbit.hitEnemies.has(target.uid)) continue;

            const dx = target.x - orbitX;
            const dy = target.y - orbitY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < orbit.hitRadius) {
                damageTarget(target, orbit.damage);
                orbit.hitEnemies.add(target.uid);
                orbit.damageCooldown = 0.3;  // Can't hit same enemy for 0.3s

                // Clear hit list after a bit so it can hit again
                setTimeout(() => {
                    orbit.hitEnemies.delete(target.uid);
                }, 500);
            }
        }
    }
}

// Update trail effects
function updateTrails(dt) {
    for (let i = activeTrails.length - 1; i >= 0; i--) {
        const trail = activeTrails[i];

        trail.timeLeft -= dt;
        if (trail.timeLeft <= 0) {
            if (trail.effect && trail.effect.runtime) trail.effect.destroy();
            activeTrails.splice(i, 1);
            continue;
        }

        // Damage cooldown
        trail.damageCooldown -= dt;
        if (trail.damageCooldown > 0) continue;

        // Check collisions
        const targets = getAllTargets();
        for (const target of targets) {
            const dx = target.x - trail.x;
            const dy = target.y - trail.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < trail.range) {
                damageTarget(target, trail.damage);

                // Freeze effect
                if (trail.freezeDuration > 0 && target.instVars) {
                    const originalSpeed = target.instVars.speed;
                    target.instVars.speed = 0;
                    setTimeout(() => {
                        if (target && target.instVars) {
                            target.instVars.speed = originalSpeed;
                        }
                    }, trail.freezeDuration * 1000);
                }

                trail.damageCooldown = 0.3;  // Tick rate for trail damage
                break;
            }
        }
    }
}

// ============================================
// WEAPON EFFECTS
// ============================================
function createWeaponEffect(weaponId, x, y, weaponData) {
    const runtime = getRuntime();

    const effect = runtime.objects.Effects?.createInstance("Game", x, y, true);
    if (!effect) return null;

    try {
        effect.setAnimation(weaponData.animationName);
    } catch (e) {
        console.warn("[WeaponSystem] Animation not found:", weaponData.animationName);
    }

    // Auto-destroy after duration
    const duration = weaponData.effectDuration || 0.5;
    if (duration > 0) {
        setTimeout(() => {
            try {
                if (effect && effect.runtime) {
                    effect.destroy();
                }
            } catch (e) { }
        }, duration * 1000);
    }

    return effect;
}

// ============================================
// WEAPON ACQUISITION (Level Up)
// ============================================

// Add or upgrade a weapon (called when selecting from level up)
export function acquireWeapon(weaponId) {
    const currentLevel = state.weaponLevels[weaponId] || 0;

    if (currentLevel >= WeaponData.MAX_WEAPON_LEVEL) {
        console.log("[WeaponSystem] Weapon already at max level:", weaponId);
        return false;
    }

    // If this is a NEW weapon (level 0), add it to an empty slot
    if (currentLevel === 0) {
        const isEquipped = state.equippedWeapons.includes(weaponId);
        if (!isEquipped) {
            // Find first empty slot within unlocked slots
            let addedToSlot = -1;
            for (let i = 0; i < state.unlockedWeaponSlots; i++) {
                if (state.equippedWeapons[i] === null) {
                    state.equippedWeapons[i] = weaponId;
                    addedToSlot = i;
                    console.log("[WeaponSystem] Added new weapon to slot", i + 1, ":", weaponId);
                    break;
                }
            }
            if (addedToSlot === -1) {
                console.warn("[WeaponSystem] No empty slot for new weapon:", weaponId);
                return false;
            }
        }
        // Initialize cooldown for new weapon
        weaponCooldowns[weaponId] = 0;
    }

    // Increase level
    state.weaponLevels[weaponId] = currentLevel + 1;

    console.log("[WeaponSystem] Acquired weapon:", weaponId, "level:", state.weaponLevels[weaponId]);

    // Update weapon equipped display in UI
    UIManager.updateWeaponEquippedDisplay();

    return true;
}

// Get random upgrade description for a weapon
export function getUpgradeDescription(weaponId) {
    const upgrade = WeaponData.getRandomUpgrade(weaponId);
    if (!upgrade) return "Upgrade";
    return upgrade.desc;
}

// Check if weapon can be upgraded
export function canUpgradeWeapon(weaponId) {
    const currentLevel = state.weaponLevels[weaponId] || 0;
    return currentLevel < WeaponData.MAX_WEAPON_LEVEL;
}

// Get available weapons for level up (considers hero and current levels)
export function getAvailableWeaponsForLevelUp(heroId) {
    const available = [];
    const heroWeapons = WeaponData.getWeaponsForHero(heroId);

    for (const weapon of heroWeapons) {
        // Check if weapon is equipped in any slot
        const isEquipped = state.equippedWeapons.includes(weapon.id);
        if (!isEquipped) continue;

        // Check if can still upgrade
        if (canUpgradeWeapon(weapon.id)) {
            const currentLevel = state.weaponLevels[weapon.id] || 0;

            if (currentLevel === 0) {
                // New weapon acquisition
                available.push({
                    weaponId: weapon.id,
                    name: weapon.name,
                    currentLevel: 0,
                    nextLevel: 1,
                    isNewWeapon: true,
                    upgrade: {
                        desc: weapon.description,
                        damage: weapon.baseDamage
                    }
                });
            } else {
                // Existing upgrade
                available.push({
                    weaponId: weapon.id,
                    name: weapon.name,
                    currentLevel: currentLevel,
                    nextLevel: currentLevel + 1,
                    upgrade: WeaponData.getRandomUpgrade(weapon.id)
                });
            }
        }
    }

    // Add default available weapon (Lightning Staff) as a NEW weapon option
    // Only if not already acquired (level 0) and there's an empty slot
    const defaultWeaponId = WeaponData.DEFAULT_AVAILABLE_WEAPON;
    if (defaultWeaponId) {
        const defaultWeaponLevel = state.weaponLevels[defaultWeaponId] || 0;
        const isAlreadyEquipped = state.equippedWeapons.includes(defaultWeaponId);
        const hasEmptySlot = state.equippedWeapons.some((w, i) => w === null && i < state.unlockedWeaponSlots);

        // Show as option if: not acquired yet AND (not equipped OR has empty slot)
        if (defaultWeaponLevel === 0 && (!isAlreadyEquipped || hasEmptySlot)) {
            const defaultWeapon = WeaponData.getWeaponData(defaultWeaponId);
            if (defaultWeapon) {
                available.push({
                    weaponId: defaultWeaponId,
                    name: defaultWeapon.name,
                    currentLevel: 0,
                    nextLevel: 1,
                    isNewWeapon: true,  // Mark as new weapon acquisition
                    upgrade: {
                        desc: defaultWeapon.description,
                        damage: defaultWeapon.baseDamage
                    }
                });
            }
        }
    }

    return available;
}

// Get weapon current level
export function getWeaponLevel(weaponId) {
    return state.weaponLevels[weaponId] || 0;
}

// Get weapon's current stat value (damage, cooldown, range, etc.)
// NOTE: This returns the base stat formula, NOT including custom upgrades
// Custom upgrades (+3 Damage, -0.1s Cooldown) are NOT tracked separately
export function getWeaponStat(weaponId, statType) {
    const weaponData = WeaponData.getWeaponData(weaponId);
    if (!weaponData) return null;

    const currentLevel = state.weaponLevels[weaponId] || 0;

    // IMPORTANT: This only returns base formula values
    // It does NOT include custom upgrade bonuses (those aren't tracked)
    switch (statType) {
        case 'damage':
            return weaponData.baseDamage + (currentLevel * (weaponData.damagePerLevel || 0));
        case 'cooldown':
            return Math.max(0.1, weaponData.baseCooldown - (currentLevel * (weaponData.cooldownReduction || 0)));
        case 'range':
            return weaponData.baseRange + (currentLevel * (weaponData.rangePerLevel || 0));
        case 'targets':
            return weaponData.baseTargets || weaponData.baseProjectiles || 1;
        default:
            return null;
    }
}

console.log("[WeaponSystem] Module loaded!");
