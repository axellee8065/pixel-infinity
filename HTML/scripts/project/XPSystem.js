// ============================================
// XP SYSTEM - Gems, experience, leveling
// ============================================

import { state, getRuntime } from "./GameState.js";
import * as Config from "./GameConfig.js";
import * as PlayerController from "./PlayerController.js";
import * as UIManager from "./UIManager.js";
import * as LevelUpManager from "./LevelUpManager.js";
import * as ResponsiveScale from "./ResponsiveScale.js";
import * as TomeSystem from "./TomeSystem.js";
import * as EnemyManager from "./EnemyManager.js";
import * as BossManager from "./BossManager.js";
import * as DamageEffects from "./DamageEffects.js";
import * as HeroData from "./HeroData.js";

// Spawn XP gem at position
export function spawnGem(x, y, xpValue) {
    const runtime = getRuntime();
    const gem = runtime.objects.Gem?.createInstance("Game", x, y, true);
    if (gem) {
        gem.instVars.xpValue = xpValue;
    }
}

// Check gem pickup and attraction (called every tick)
export function checkGemPickup() {
    const runtime = getRuntime();
    const playerPos = PlayerController.getPlayerPosition();
    if (playerPos.x === 0 && playerPos.y === 0) return;

    // Pause magnet during level up
    if (state.isLevelingUp) return;

    const gems = runtime.objects.Gem?.getAllInstances() || [];

    // Get base pickup/attract radius and add Attraction Tome bonus
    const pickupRadiusBonus = TomeSystem.getPickupRadiusBonus();
    const pickupRadius = ResponsiveScale.getGemPickupRadius() + pickupRadiusBonus;
    const attractRadius = ResponsiveScale.getGemAttractRadius() + pickupRadiusBonus;

    for (const gem of gems) {
        const dx = gem.x - playerPos.x;
        const dy = gem.y - playerPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < pickupRadius) {
            // Collect gem
            collectGem(gem);
        } else if (state.bossDefeatedMagnet) {
            // Magnet active - pull ALL gems FAST
            const magnetSpeed = 1500;  // 3x faster!
            gem.x -= (dx / dist) * magnetSpeed * runtime.dt;
            gem.y -= (dy / dist) * magnetSpeed * runtime.dt;
        } else if (dist < attractRadius) {
            // Normal attract gem towards player (scaled speed)
            const attractSpeed = ResponsiveScale.getGemAttractSpeed();
            gem.x -= (dx / dist) * attractSpeed * runtime.dt;
            gem.y -= (dy / dist) * attractSpeed * runtime.dt;
        }
    }

    // Turn off magnet when all gems collected
    if (state.bossDefeatedMagnet && gems.length === 0) {
        const golds = runtime.objects.lootGold?.getAllInstances() || [];
        if (golds.length === 0) {
            state.bossDefeatedMagnet = false;
            console.log("[XPSystem] All loot collected, magnet off");
        }
    }
}

// Collect gem
export function collectGem(gem) {
    const runtime = getRuntime();
    runtime.callFunction("playAudio", "Blip5", 0, 10);

    let xpGain = gem.instVars.xpValue;

    // Apply Skeleton XP bonus (hero passive)
    const heroId = state.selectedHeroId;
    if (heroId && HeroData.hasPassive(heroId, "xpBonus")) {
        const hero = HeroData.getHero(heroId);
        const xpBonusPercent = hero.passiveValue || 0;  // e.g., 0.15 = 15%
        xpGain = Math.floor(xpGain * (1 + xpBonusPercent));
    }

    // Apply Sage's Scroll XP bonus (items)
    if (state.itemStats && state.itemStats.xpMultiplier > 0) {
        xpGain = Math.floor(xpGain * (1 + state.itemStats.xpMultiplier / 100));
    }

    // Apply XP Tome bonus
    const xpTomeBonus = TomeSystem.getXpMultiplierBonus();
    if (xpTomeBonus > 0) {
        xpGain = Math.floor(xpGain * (1 + xpTomeBonus / 100));
    }

    state.currentXP += xpGain;
    gem.destroy();

    // Update XP bar
    UIManager.updateExpBar();

    // Check level up
    if (state.currentXP >= state.xpToNextLevel) {
        levelUp();
    }
}

// Level up
export function levelUp() {
    const runtime = getRuntime();
    runtime.callFunction("playAudio", "level", 0, 10);

    state.playerLevel++;
    state.currentXP -= state.xpToNextLevel;
    state.xpToNextLevel = Math.floor(state.xpToNextLevel * Config.XP_LEVEL_MULTIPLIER);

    // Full HP restore on level up
    state.playerHealth = state.playerMaxHealth;
    UIManager.updateHPBar();

    // Update level text
    UIManager.updateLevelText();

    // Update XP bar to show overflow XP
    UIManager.updateExpBar();

    // Show level up panel
    LevelUpManager.showLevelUpPanel();

    console.log("[XPSystem] Level up! Now level", state.playerLevel, "- HP restored!");
}

// Get current level
export function getCurrentLevel() {
    return state.playerLevel;
}

// Get XP progress (0-1)
export function getXPProgress() {
    return state.currentXP / state.xpToNextLevel;
}

// ============================================
// MAGNET PICKUP SYSTEM
// ============================================

const MAGNET_SPAWN_INTERVAL = 15;  // Check every 15 seconds
const MAGNET_SPAWN_CHANCE = 0.15;  // 15% chance per check (very rare)
const MAGNET_LIFETIME = 10;  // 10 seconds before disappearing
const MAGNET_PICKUP_RADIUS = 60;

let magnetSpawnTimer = 0;
let activeMagnets = [];  // Track magnets with their spawn time

// Update magnet system (call every tick)
export function updateMagnets(dt) {
    const runtime = getRuntime();
    if (!state.isPlaying || state.isLevelingUp) return;

    // Don't spawn magnets during boss fight
    if (BossManager.isBossActive()) return;

    // Spawn timer
    magnetSpawnTimer += dt;
    if (magnetSpawnTimer >= MAGNET_SPAWN_INTERVAL) {
        magnetSpawnTimer = 0;
        if (Math.random() < MAGNET_SPAWN_CHANCE) {
            spawnMagnet();
        }
    }

    // Check magnet pickup and timeout
    checkMagnetPickup();
    updateMagnetLifetimes(dt);
}

// Spawn a magnet near player
function spawnMagnet() {
    const runtime = getRuntime();
    const playerPos = PlayerController.getPlayerPosition();
    if (playerPos.x === 0 && playerPos.y === 0) return;

    // Spawn at visible distance (200-400 pixels from player)
    const angle = Math.random() * Math.PI * 2;
    const distance = 200 + Math.random() * 200;

    const spawnX = playerPos.x + Math.cos(angle) * distance;
    const spawnY = playerPos.y + Math.sin(angle) * distance;

    // Create magnet using Items sprite with "magnet" animation
    const magnet = runtime.objects.Items?.createInstance("Game", spawnX, spawnY - 80, true);
    if (!magnet) return;

    try {
        magnet.setAnimation("magnet");
    } catch (e) {
        console.warn("[XPSystem] Could not set magnet animation");
    }

    // Start small and invisible for bounce effect
    magnet.opacity = 0;
    magnet.width = 20;
    magnet.height = 20;

    // Bounce animation
    try {
        magnet.behaviors.Tween.startTween("opacity", 1, 0.3, "default");
        magnet.behaviors.Tween.startTween("width", 96, 0.4, "easeoutback");
        magnet.behaviors.Tween.startTween("height", 96, 0.4, "easeoutback");
        magnet.behaviors.Tween.startTween("y", spawnY, 0.5, "easeoutbounce");
    } catch (e) {}

    // Track this magnet
    activeMagnets.push({
        instance: magnet,
        lifetime: MAGNET_LIFETIME
    });

    console.log("[XPSystem] Magnet spawned!");
}

// Check if player picks up a magnet
function checkMagnetPickup() {
    const runtime = getRuntime();
    const playerPos = PlayerController.getPlayerPosition();

    for (let i = activeMagnets.length - 1; i >= 0; i--) {
        const magnetData = activeMagnets[i];
        const magnet = magnetData.instance;

        if (!magnet || !magnet.runtime) {
            activeMagnets.splice(i, 1);
            continue;
        }

        const dx = magnet.x - playerPos.x;
        const dy = magnet.y - playerPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MAGNET_PICKUP_RADIUS) {
            // Picked up!
            collectMagnet(magnet);
            activeMagnets.splice(i, 1);
        }
    }
}

// Collect magnet - activate XP pull
function collectMagnet(magnet) {
    // Activate the magnet effect (pull all XP)
    state.bossDefeatedMagnet = true;

    // Visual feedback - quick scale up then destroy
    try {
        magnet.behaviors.Tween.startTween("width", 140, 0.2, "ease-out");
        magnet.behaviors.Tween.startTween("height", 140, 0.2, "ease-out");
        magnet.behaviors.Tween.startTween("opacity", 0, 0.2, "ease-out");
    } catch (e) {}

    setTimeout(() => {
        try {
            if (magnet && magnet.runtime) magnet.destroy();
        } catch (e) {}
    }, 250);

    console.log("[XPSystem] Magnet collected! Pulling all XP!");
}

// Update magnet lifetimes and destroy expired ones
function updateMagnetLifetimes(dt) {
    for (let i = activeMagnets.length - 1; i >= 0; i--) {
        const magnetData = activeMagnets[i];
        magnetData.lifetime -= dt;

        if (magnetData.lifetime <= 0) {
            const magnet = magnetData.instance;
            if (magnet && magnet.runtime) {
                // Fade out and destroy
                try {
                    magnet.behaviors.Tween.startTween("opacity", 0, 0.5, "ease-out");
                    magnet.behaviors.Tween.startTween("width", 20, 0.5, "ease-in");
                    magnet.behaviors.Tween.startTween("height", 20, 0.5, "ease-in");
                } catch (e) {}

                setTimeout(() => {
                    try {
                        if (magnet && magnet.runtime) magnet.destroy();
                    } catch (e) {}
                }, 550);
            }
            activeMagnets.splice(i, 1);
            console.log("[XPSystem] Magnet expired");
        }
        // Blink when about to expire (last 3 seconds)
        else if (magnetData.lifetime <= 3) {
            const magnet = magnetData.instance;
            if (magnet && magnet.runtime) {
                // Blink effect
                const blink = Math.sin(magnetData.lifetime * 10) > 0;
                magnet.opacity = blink ? 1 : 0.3;
            }
        }
    }
}

// Reset magnets (for new game)
export function resetMagnets() {
    for (const magnetData of activeMagnets) {
        try {
            if (magnetData.instance && magnetData.instance.runtime) {
                magnetData.instance.destroy();
            }
        } catch (e) {}
    }
    activeMagnets = [];
    magnetSpawnTimer = 0;
}

// ============================================
// ENERGY PICKUP SYSTEM - Power-up mode
// ============================================

const ENERGY_SPAWN_INTERVAL = 15;  // Check every 15 seconds (same as magnet)
const ENERGY_SPAWN_CHANCE = 0.15;  // 15% chance per check (same rarity as magnet)
const ENERGY_LIFETIME = 10;  // 10 seconds before disappearing
const ENERGY_PICKUP_RADIUS = 60;
const ENERGY_EFFECT_DURATION = 10;  // 10 seconds power-up
const ENERGY_COLLISION_DAMAGE = 100;  // Damage to enemies on touch
const ENERGY_COLLISION_TICK = 0.25;  // Damage tick rate (slower = better FPS)
const ENERGY_SIZE_MULTIPLIER = 2;  // 2x size
const ENERGY_SPEED_MULTIPLIER = 2;  // 2x speed

let energySpawnTimer = 0;
let activeEnergy = null;  // Only one energy can exist at a time
let energyLifetime = 0;

// Guaranteed energy spawns at specific levels
let energyGuaranteedLevel4 = false;
let energyGuaranteedLevel12 = false;
let energyGuaranteedLevel13 = false;

// Energy power-up state
let isEnergyActive = false;
let energyEffectTimer = 0;
let originalPlayerWidth = 0;
let originalPlayerHeight = 0;
let originalPlayerHealth = 0;
let originalPlayerMaxHealth = 0;
let originalPlayerSpeed = 0;
let energyCollisionTimer = 0;

// Update energy system (call every tick)
export function updateEnergy(dt) {
    const runtime = getRuntime();
    if (!state.isPlaying || state.isLevelingUp) return;

    // Update energy effect if active
    if (isEnergyActive) {
        updateEnergyEffect(dt);
    }

    // Don't spawn energy while boss is active
    const bossActive = BossManager.getBoss() !== null && BossManager.getBoss() !== undefined;

    // Guaranteed energy spawn at level 4
    if (state.playerLevel >= 4 && !energyGuaranteedLevel4 && !activeEnergy && !isEnergyActive && !bossActive) {
        energyGuaranteedLevel4 = true;
        spawnEnergy();
        console.log("[XPSystem] Guaranteed Energy spawned at level 4!");
        return;
    }

    // Guaranteed energy spawn at level 12
    if (state.playerLevel >= 12 && !energyGuaranteedLevel12 && !activeEnergy && !isEnergyActive && !bossActive) {
        energyGuaranteedLevel12 = true;
        spawnEnergy();
        console.log("[XPSystem] Guaranteed Energy spawned at level 12!");
        return;
    }

    // Guaranteed energy spawn at level 13
    if (state.playerLevel >= 13 && !energyGuaranteedLevel13 && !activeEnergy && !isEnergyActive && !bossActive) {
        energyGuaranteedLevel13 = true;
        spawnEnergy();
        console.log("[XPSystem] Guaranteed Energy spawned at level 13!");
        return;
    }

    // Only try to spawn if no energy exists and boss not active
    if (!activeEnergy && !bossActive) {
        energySpawnTimer += dt;
        if (energySpawnTimer >= ENERGY_SPAWN_INTERVAL) {
            energySpawnTimer = 0;
            if (Math.random() < ENERGY_SPAWN_CHANCE) {
                spawnEnergy();
            }
        }
    }

    // Update existing energy if it exists
    if (activeEnergy) {
        // Update existing energy lifetime
        energyLifetime -= dt;

        // Blink when about to expire (last 3 seconds)
        if (energyLifetime <= 3 && activeEnergy.runtime) {
            const blink = Math.sin(energyLifetime * 10) > 0;
            activeEnergy.opacity = blink ? 1 : 0.3;
        }

        // Expired
        if (energyLifetime <= 0) {
            destroyEnergy();
        } else {
            // Check pickup
            checkEnergyPickup();
        }
    }
}

// Spawn energy near player
function spawnEnergy() {
    const runtime = getRuntime();
    const playerPos = PlayerController.getPlayerPosition();
    if (playerPos.x === 0 && playerPos.y === 0) return;

    // Spawn at visible distance (200-400 pixels from player)
    const angle = Math.random() * Math.PI * 2;
    const distance = 200 + Math.random() * 200;

    const spawnX = playerPos.x + Math.cos(angle) * distance;
    const spawnY = playerPos.y + Math.sin(angle) * distance;

    // Create energy using Energy sprite
    const energy = runtime.objects.Energy?.createInstance("Game", spawnX, spawnY - 80, true);
    if (!energy) {
        console.warn("[XPSystem] Could not create Energy instance");
        return;
    }

    // Start small and invisible for bounce effect
    energy.opacity = 0;
    const originalWidth = energy.width;
    const originalHeight = energy.height;
    energy.width = 20;
    energy.height = 20;

    // Bounce animation
    try {
        energy.behaviors.Tween.startTween("opacity", 1, 0.3, "default");
        energy.behaviors.Tween.startTween("width", originalWidth, 0.4, "easeoutback");
        energy.behaviors.Tween.startTween("height", originalHeight, 0.4, "easeoutback");
        energy.behaviors.Tween.startTween("y", spawnY, 0.5, "easeoutbounce");
    } catch (e) {}

    activeEnergy = energy;
    energyLifetime = ENERGY_LIFETIME;

    console.log("[XPSystem] Energy spawned!");
}

// Check if player picks up energy
function checkEnergyPickup() {
    if (!activeEnergy || !activeEnergy.runtime) return;

    const playerPos = PlayerController.getPlayerPosition();
    const dx = activeEnergy.x - playerPos.x;
    const dy = activeEnergy.y - playerPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < ENERGY_PICKUP_RADIUS) {
        collectEnergy();
    }
}

// Collect energy - activate power-up mode
function collectEnergy() {
    if (!activeEnergy) return;
    if (isEnergyActive) return;  // Prevent stacking!

    const runtime = getRuntime();
    runtime.callFunction("playAudio", "PowerUp", 0, 10);
    const player = PlayerController.getPlayer();
    if (!player) return;

    // Store original values (only if not already in energy mode)
    originalPlayerWidth = player.width;
    originalPlayerHeight = player.height;
    originalPlayerHealth = state.playerHealth;
    originalPlayerMaxHealth = state.playerMaxHealth;
    originalPlayerSpeed = state.playerSpeed;

    // Apply power-up effects - 3x size
    const targetWidth = originalPlayerWidth * ENERGY_SIZE_MULTIPLIER;
    const targetHeight = originalPlayerHeight * ENERGY_SIZE_MULTIPLIER;
    try {
        player.behaviors.Tween.startTween("width", targetWidth, 0.3, "easeoutback");
        player.behaviors.Tween.startTween("height", targetHeight, 0.3, "easeoutback");
    } catch (e) {
        player.width = targetWidth;
        player.height = targetHeight;
    }

    // 9999 health
    state.playerMaxHealth = 9999;
    state.playerHealth = 9999;
    UIManager.updateHPBar();

    // 8x speed (much faster!)
    state.playerSpeed = originalPlayerSpeed * ENERGY_SPEED_MULTIPLIER;

    // Activate energy mode
    isEnergyActive = true;
    energyEffectTimer = ENERGY_EFFECT_DURATION;
    energyCollisionTimer = 0;

    // Visual feedback - destroy energy with effect
    try {
        activeEnergy.behaviors.Tween.startTween("width", 150, 0.2, "ease-out");
        activeEnergy.behaviors.Tween.startTween("height", 150, 0.2, "ease-out");
        activeEnergy.behaviors.Tween.startTween("opacity", 0, 0.2, "ease-out");
    } catch (e) {}

    setTimeout(() => {
        destroyEnergy();
    }, 250);

    console.log("[XPSystem] Energy collected! POWER MODE ACTIVATED!");
}

// Destroy energy pickup
function destroyEnergy() {
    if (activeEnergy && activeEnergy.runtime) {
        try {
            activeEnergy.destroy();
        } catch (e) {}
    }
    activeEnergy = null;
    energyLifetime = 0;
}

// Update energy effect (collision damage, timer)
function updateEnergyEffect(dt) {
    if (!isEnergyActive) return;

    const runtime = getRuntime();
    const player = PlayerController.getPlayer();
    const playerPos = PlayerController.getPlayerPosition();

    // Collision damage to enemies
    energyCollisionTimer -= dt;
    if (energyCollisionTimer <= 0) {
        energyCollisionTimer = ENERGY_COLLISION_TICK;

        // Get all enemies and damage those touching player (excludes boss)
        // Use current player size for accurate collision
        const collisionRadius = player ? Math.max(player.width, player.height) * 0.5 : 200;
        const allEnemies = getAllEnemiesNoBoss(runtime);

        for (const enemy of allEnemies) {
            if (!enemy || !enemy.runtime || !enemy.instVars) continue;

            const dx = enemy.x - playerPos.x;
            const dy = enemy.y - playerPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < collisionRadius) {
                const previousHealth = enemy.instVars.health;

                // Deal damage directly (skip most text effects for FPS)
                enemy.instVars.health -= ENERGY_COLLISION_DAMAGE;

                // Quick flash effect
                try {
                    enemy.colorRgb = [1, 1, 0];  // Yellow flash
                } catch (e) {}

                // Kill if dead
                if (enemy.instVars.health <= 0) {
                    // Show overkill effect
                    if (ENERGY_COLLISION_DAMAGE > previousHealth * 3 && previousHealth > 0) {
                        DamageEffects.showTextEffect(enemy.x, enemy.y, "overkill");
                    }
                    EnemyManager.killEnemy(enemy);
                }
            }
        }
    }

    // Timer countdown
    energyEffectTimer -= dt;

    // Blink player when about to expire (last 3 seconds)
    if (energyEffectTimer <= 3 && player && player.runtime) {
        const blink = Math.sin(energyEffectTimer * 8) > 0;
        player.opacity = blink ? 1 : 0.5;
    }

    // Effect expired
    if (energyEffectTimer <= 0) {
        deactivateEnergy();
    }
}

// Get all enemies helper (excludes boss for energy damage)
function getAllEnemiesNoBoss(runtime) {
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

// Deactivate energy power-up
function deactivateEnergy() {
    const player = PlayerController.getPlayer();

    // Restore original size
    if (player && player.runtime) {
        try {
            player.behaviors.Tween.startTween("width", originalPlayerWidth, 0.3, "ease-in");
            player.behaviors.Tween.startTween("height", originalPlayerHeight, 0.3, "ease-in");
        } catch (e) {
            player.width = originalPlayerWidth;
            player.height = originalPlayerHeight;
        }
        player.opacity = 1;
    }

    // Restore original health (but cap at original max)
    state.playerMaxHealth = originalPlayerMaxHealth;
    state.playerHealth = Math.min(state.playerHealth, originalPlayerMaxHealth);
    UIManager.updateHPBar();

    // Restore original speed
    state.playerSpeed = originalPlayerSpeed;

    isEnergyActive = false;
    energyEffectTimer = 0;

    console.log("[XPSystem] Energy effect ended, back to normal");
}

// Check if energy mode is active
export function isEnergyModeActive() {
    return isEnergyActive;
}

// Manually activate energy (for testing with E key)
export function activateEnergyManual() {
    if (isEnergyActive) return;  // Already active

    const player = PlayerController.getPlayer();
    if (!player) return;

    // Store original values
    originalPlayerWidth = player.width;
    originalPlayerHeight = player.height;
    originalPlayerHealth = state.playerHealth;
    originalPlayerMaxHealth = state.playerMaxHealth;
    originalPlayerSpeed = state.playerSpeed;

    // Apply power-up effects - 3x size
    const targetWidth = originalPlayerWidth * ENERGY_SIZE_MULTIPLIER;
    const targetHeight = originalPlayerHeight * ENERGY_SIZE_MULTIPLIER;
    try {
        player.behaviors.Tween.startTween("width", targetWidth, 0.3, "easeoutback");
        player.behaviors.Tween.startTween("height", targetHeight, 0.3, "easeoutback");
    } catch (e) {
        player.width = targetWidth;
        player.height = targetHeight;
    }

    // 9999 health
    state.playerMaxHealth = 9999;
    state.playerHealth = 9999;
    UIManager.updateHPBar();

    // 8x speed
    state.playerSpeed = originalPlayerSpeed * ENERGY_SPEED_MULTIPLIER;

    // Activate energy mode
    isEnergyActive = true;
    energyEffectTimer = ENERGY_EFFECT_DURATION;
    energyCollisionTimer = 0;

    console.log("[XPSystem] Energy activated manually (E key)!");
}

// Reset energy (for new game)
export function resetEnergy() {
    destroyEnergy();
    if (isEnergyActive) {
        deactivateEnergy();
    }
    energySpawnTimer = 0;
    isEnergyActive = false;
    energyEffectTimer = 0;
    energyGuaranteedLevel4 = false;
    energyGuaranteedLevel12 = false;
    energyGuaranteedLevel13 = false;
}

console.log("[XPSystem] Module loaded!");
