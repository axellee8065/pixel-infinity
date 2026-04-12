// ============================================
// SILVER SYSTEM - Silver drops, chests, run-specific currency
// ============================================

import { state, getRuntime } from "./GameState.js";
import * as PlayerController from "./PlayerController.js";
import * as TomeSystem from "./TomeSystem.js";
import * as ResponsiveScale from "./ResponsiveScale.js";
import * as BossManager from "./BossManager.js";

// Config
const SILVER_PICKUP_RADIUS = 90;
const SILVER_ATTRACT_RADIUS = 150;
const SILVER_ATTRACT_SPEED = 400;

// Silver drop config (same for all enemy types)
const SILVER_DROP_CHANCE = 0.08;         // 8% chance - rarer drops
const SILVER_DROP_CHANCE_BOSS = 1.0;     // 100% from boss
const SILVER_VALUE_ENEMY = 1;
const SILVER_VALUE_ENEMY2 = 2;
const SILVER_VALUE_ENEMY3 = 1;           // Bats drop 1 silver
const SILVER_VALUE_BOSS = 15;

// Early game guarantee: First 4 kills guarantee at least 2 silver
const EARLY_GAME_KILLS = 4;
const EARLY_GAME_MIN_SILVER = 2;
let earlyGameKills = 0;
let earlyGameSilverDropped = 0;

// Chest config
const CHEST_SPAWN_INTERVAL = 25;     // Spawn a chest every ~25 seconds
const CHEST_SPAWN_RADIUS_MIN = 200;  // Min distance from player
const CHEST_SPAWN_RADIUS_MAX = 400;  // Max distance from player
const CHEST_BASE_COST = 3;           // Base silver cost to open
const CHEST_COST_INCREASE = 2;       // Cost increases each chest
const CHEST_TIMEOUT = 20;            // Chest disappears after 20 seconds if not opened

// Track active chests and their UI elements
const activeChestUI = new Map();  // chestUID -> {icon, text}
let chestsSpawned = 0;
let currentChestAge = 0;             // Track how long current chest has existed
let currentChestCost = 0;            // Track current chest's cost for respawn

// Spawn silver at position with drop animation
export function spawnSilver(x, y, silverValue) {
    const runtime = getRuntime();

    // Random horizontal offset for final position
    const offsetX = (Math.random() - 0.5) * 60;
    const finalX = x + offsetX;
    const finalY = y;

    // Start position (above, random arc)
    const startY = y - 80 - Math.random() * 40;

    const silver = runtime.objects.lootSilver?.createInstance("Game", finalX, startY, true);

    if (silver) {
        silver.instVars.silverValue = silverValue;

        // Start small and grow
        silver.width = 20;
        silver.height = 20;

        // Animate size (pop effect)
        silver.behaviors.Tween.startTween("width", 64, 0.15, "easeoutback");
        silver.behaviors.Tween.startTween("height", 64, 0.15, "easeoutback");

        // Fall down with bounce
        silver.behaviors.Tween.startTween("y", finalY, 0.4, "easeoutbounce");
    }
}

// Try to drop silver from enemy (based on chance)
export function tryDropSilver(x, y, enemyType) {
    let dropChance, silverValue;

    if (enemyType === "boss") {
        dropChance = SILVER_DROP_CHANCE_BOSS;
        silverValue = SILVER_VALUE_BOSS;
    } else {
        dropChance = SILVER_DROP_CHANCE;
        silverValue = 1;
    }

    // Apply Silver Tome bonus to drop chance
    const silverChanceBonus = TomeSystem.getSilverChanceBonus();
    if (silverChanceBonus > 0) {
        dropChance += silverChanceBonus / 100;  // Convert % to decimal
    }

    // Early game guarantee: ensure at least 2 silver from first 4 kills
    let shouldDrop = false;
    if (earlyGameKills < EARLY_GAME_KILLS) {
        earlyGameKills++;
        const killsRemaining = EARLY_GAME_KILLS - earlyGameKills;
        const silverNeeded = EARLY_GAME_MIN_SILVER - earlyGameSilverDropped;

        // Force drop if we need silver and running out of kills
        if (silverNeeded > 0 && silverNeeded >= killsRemaining + 1) {
            shouldDrop = true;
        } else {
            shouldDrop = Math.random() < dropChance;
        }

        if (shouldDrop) {
            earlyGameSilverDropped++;
        }
    } else {
        shouldDrop = Math.random() < dropChance;
    }

    if (shouldDrop) {
        spawnSilver(x, y, silverValue);
    }
}

// Track silvers flying to UI
const flyingSilvers = new Map();  // silver.uid -> {startX, startY, targetX, targetY, progress, value}

// Check silver pickup (called every tick)
export function checkSilverPickup() {
    const runtime = getRuntime();
    const playerPos = PlayerController.getPlayerPosition();
    if (playerPos.x === 0 && playerPos.y === 0) return;

    // Pause during level up
    if (state.isLevelingUp) return;

    const silvers = runtime.objects.lootSilver?.getAllInstances() || [];

    for (const silver of silvers) {
        // Skip indicator silvers (used for chest UI)
        if (silver.instVars.silverValue < 0) continue;

        // Skip silvers already flying to UI
        if (flyingSilvers.has(silver.uid)) continue;

        const dx = playerPos.x - silver.x;
        const dy = playerPos.y - silver.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Pickup silver - start flying to UI (no attract, just pickup when close)
        if (dist < SILVER_PICKUP_RADIUS) {
            startSilverFlyToUI(silver);
        }
        // Note: No attract behavior - silver stays in place until picked up
    }

    // Update flying silvers
    updateFlyingSilvers(runtime.dt);
}

// Animation timing constants
const SILVER_FLY_DURATION = 1.0;    // Time to fly to target (slower)
const SILVER_WAIT_DURATION = 0.15;  // Time to wait at target
const SILVER_PUFF_DURATION = 0.2;   // Time to shrink and disappear

// Start silver flying to UI with parabolic path
function startSilverFlyToUI(silver) {
    const runtime = getRuntime();
    const silverCountBG = runtime.objects.silverCountBG?.getFirstInstance();

    if (!silverCountBG) {
        // Fallback: just collect normally
        collectSilver(silver.instVars.silverValue);
        silver.destroy();
        return;
    }

    // Convert silver's world position to screen position
    // UI layer has parallax 0, so screen coords = UI layer coords
    const scrollX = runtime.layout.scrollX;
    const scrollY = runtime.layout.scrollY;
    const viewW = runtime.viewportWidth;
    const viewH = runtime.viewportHeight;

    // Silver's position relative to viewport
    const screenX = silver.x - (scrollX - viewW / 2);
    const screenY = silver.y - (scrollY - viewH / 2);

    // Move silver to UI layer and set screen position
    const uiLayer = runtime.layout.getLayer("UI");
    if (uiLayer) {
        silver.moveToLayer(uiLayer);
        silver.x = screenX;
        silver.y = screenY;
    }

    // Get Image Point 1 position (target)
    const targetX = silverCountBG.getImagePointX("Image Point 1");
    const targetY = silverCountBG.getImagePointY("Image Point 1");

    // Store flying data
    flyingSilvers.set(silver.uid, {
        startX: silver.x,
        startY: silver.y,
        targetX: targetX,
        targetY: targetY,
        progress: 0,
        phase: "flying",  // "flying" -> "waiting" -> "puff"
        value: silver.instVars.silverValue,
        startWidth: silver.width,
        startHeight: silver.height
    });
}

// Update all flying silvers with parabolic motion
function updateFlyingSilvers(dt) {
    const runtime = getRuntime();
    const silvers = runtime.objects.lootSilver?.getAllInstances() || [];

    for (const [uid, data] of flyingSilvers.entries()) {
        const silver = silvers.find(s => s.uid === uid);

        if (!silver) {
            // Silver was destroyed externally
            flyingSilvers.delete(uid);
            continue;
        }

        if (data.phase === "flying") {
            // Update flight progress
            data.progress += dt / SILVER_FLY_DURATION;

            if (data.progress >= 1) {
                // Arrived at destination - start waiting
                data.progress = 0;
                data.phase = "waiting";
                silver.x = data.targetX;
                silver.y = data.targetY;
                continue;
            }

            // Parabolic interpolation
            const t = data.progress;
            const easeT = t * t * (3 - 2 * t);  // Smooth step

            // Interpolate X
            silver.x = data.startX + (data.targetX - data.startX) * easeT;

            // Parabolic arc for Y (goes up then down)
            const arcHeight = ResponsiveScale.scaleDistance(-150);  // Scale arc height
            const linearY = data.startY + (data.targetY - data.startY) * easeT;
            const parabola = 4 * t * (1 - t);  // Peaks at t=0.5
            silver.y = linearY + arcHeight * parabola;

        } else if (data.phase === "waiting") {
            // Wait at target
            data.progress += dt / SILVER_WAIT_DURATION;

            if (data.progress >= 1) {
                // Done waiting - start puff
                data.progress = 0;
                data.phase = "puff";
                // Collect silver when it arrives (number updates here)
                collectSilver(data.value);
            }

        } else if (data.phase === "puff") {
            // Shrink and fade out
            data.progress += dt / SILVER_PUFF_DURATION;

            if (data.progress >= 1) {
                // Done - destroy
                silver.destroy();
                flyingSilvers.delete(uid);
                continue;
            }

            // Shrink
            const shrinkFactor = 1 - data.progress;
            silver.width = data.startWidth * shrinkFactor;
            silver.height = data.startHeight * shrinkFactor;

            // Fade out
            silver.opacity = 1 - data.progress;
        }
    }
}

// Collect silver
function collectSilver(amount) {
    state.silver += amount;
    state.silverTextValue += amount;
    state.silverTextTimer = 2.0;  // Show for 2 seconds
    updateSilverCountText();
    console.log("[SilverSystem] Collected", amount, "silver. Total:", state.silver);
}

// Update silverCountText UI to show total silver
export function updateSilverCountText() {
    const runtime = getRuntime();
    const silverText = runtime.objects.silverCountText?.getFirstInstance();
    if (silverText) {
        silverText.text = state.silver.toString();
    }
}

// Try to spawn a chest near player
export function trySpawnChest(dt) {
    const runtime = getRuntime();
    const playerPos = PlayerController.getPlayerPosition();
    if (playerPos.x === 0 && playerPos.y === 0) return;

    // Don't spawn during level up
    if (state.isLevelingUp) return;

    // Don't spawn during boss fight
    if (BossManager.isBossActive()) return;

    // Check if there's already a chest
    const existingChests = runtime.objects.Chest?.getAllInstances() || [];

    if (existingChests.length > 0) {
        // Track chest age
        currentChestAge += dt;

        // Check if chest timed out (20 seconds without being opened)
        if (currentChestAge >= CHEST_TIMEOUT) {
            const oldChest = existingChests[0];

            // Clean up UI for the old chest
            const ui = activeChestUI.get(oldChest.uid);
            if (ui) {
                if (ui.icon && ui.icon.runtime) ui.icon.destroy();
                if (ui.text && ui.text.runtime) ui.text.destroy();
                activeChestUI.delete(oldChest.uid);
            }

            // Destroy old chest
            oldChest.destroy();
            console.log("[SilverSystem] Chest timed out! Spawning new one near player.");

            // Reset age and spawn new chest immediately near player (keep same cost)
            currentChestAge = 0;
            spawnChestNearPlayer(playerPos, currentChestCost);
        }
        return;  // Don't spawn another if chest exists and hasn't timed out
    }

    // Update timer
    state.lastChestSpawnTime += dt;

    // Check if it's time to spawn
    if (state.lastChestSpawnTime < CHEST_SPAWN_INTERVAL) return;
    state.lastChestSpawnTime = 0;

    // Spawn chest at random position around player
    const angle = Math.random() * Math.PI * 2;
    const distance = CHEST_SPAWN_RADIUS_MIN + Math.random() * (CHEST_SPAWN_RADIUS_MAX - CHEST_SPAWN_RADIUS_MIN);

    const spawnX = playerPos.x + Math.cos(angle) * distance;
    const spawnY = playerPos.y + Math.sin(angle) * distance;

    // Calculate chest cost (increases with each chest opened)
    const chestCost = CHEST_BASE_COST + (chestsSpawned * CHEST_COST_INCREASE);

    const chest = runtime.objects.Chest?.createInstance("Game", spawnX, spawnY - 100, true);

    if (chest) {
        chest.instVars.silverCost = chestCost;
        chest.instVars.isOpened = false;

        // Start invisible and small
        chest.opacity = 0;
        chest.width = 20;
        chest.height = 20;

        // Tween in: fade + grow + fall (bigger chest)
        chest.behaviors.Tween.startTween("opacity", 1, 0.3, "default");
        chest.behaviors.Tween.startTween("width", 140, 0.4, "easeoutback");
        chest.behaviors.Tween.startTween("height", 110, 0.4, "easeoutback");
        chest.behaviors.Tween.startTween("y", spawnY, 0.5, "easeoutbounce");

        currentChestCost = chestCost;  // Store cost for potential respawn
        currentChestAge = 0;  // Reset age for new chest
        console.log("[SilverSystem] Spawned chest, cost:", chestCost);
    }
}

// Called when chest is opened - increases cost for next chest
export function onChestOpened() {
    chestsSpawned++;
    console.log("[SilverSystem] Chest opened! Next chest will cost more.");
}

// Spawn a chest near the player (after timeout) - keeps same cost
function spawnChestNearPlayer(playerPos, keepCost) {
    const runtime = getRuntime();

    // Spawn at visible distance (250-400 pixels from player)
    const angle = Math.random() * Math.PI * 2;
    const distance = 250 + Math.random() * 150;

    const spawnX = playerPos.x + Math.cos(angle) * distance;
    const spawnY = playerPos.y + Math.sin(angle) * distance;

    const chest = runtime.objects.Chest?.createInstance("Game", spawnX, spawnY - 100, true);

    if (chest) {
        // Use the same cost as the timed-out chest
        chest.instVars.silverCost = keepCost;
        chest.instVars.isOpened = false;

        // Start invisible and small
        chest.opacity = 0;
        chest.width = 20;
        chest.height = 20;

        // Tween in: fade + grow + fall (bigger chest)
        chest.behaviors.Tween.startTween("opacity", 1, 0.3, "default");
        chest.behaviors.Tween.startTween("width", 140, 0.4, "easeoutback");
        chest.behaviors.Tween.startTween("height", 110, 0.4, "easeoutback");
        chest.behaviors.Tween.startTween("y", spawnY, 0.5, "easeoutbounce");

        // Note: Don't increment chestsSpawned - cost only increases when chest is OPENED
        console.log("[SilverSystem] Respawned chest near player, same cost:", keepCost);
    }
}

// Update chest UI elements (silver icon + cost text) and chest appearance
export function updateChestUI() {
    const runtime = getRuntime();
    const chests = runtime.objects.Chest?.getAllInstances() || [];
    const playerPos = PlayerController.getPlayerPosition();

    // Clean up UI for destroyed chests
    for (const [uid, ui] of activeChestUI.entries()) {
        const chestExists = chests.some(c => c.uid === uid);
        if (!chestExists) {
            if (ui.icon && ui.icon.runtime) ui.icon.destroy();
            if (ui.text && ui.text.runtime) ui.text.destroy();
            activeChestUI.delete(uid);
        }
    }

    // Update or create UI for each chest
    for (const chest of chests) {
        if (chest.instVars.isOpened) continue;

        let ui = activeChestUI.get(chest.uid);

        // Check if player is overlapping chest
        const dx = Math.abs(chest.x - playerPos.x);
        const dy = Math.abs(chest.y - playerPos.y);
        const overlapX = chest.width / 2 + 30;
        const overlapY = chest.height / 2 + 30;
        const isOverlapping = dx < overlapX && dy < overlapY;

        // Set chest opacity based on overlap
        chest.opacity = isOverlapping ? 0.4 : 1.0;

        // Check if player can afford this chest
        const canAfford = state.silver >= chest.instVars.silverCost;

        // Set chest color based on affordability
        if (canAfford) {
            chest.colorRgb = [1, 1, 1];  // Normal color
        } else {
            chest.colorRgb = [1, 0.4, 0.4];  // Red tint - can't afford
        }

        // Create UI elements if not exists
        if (!ui) {
            // Create silver icon above chest (marked as indicator so it won't be picked up)
            const icon = runtime.objects.lootSilver?.createInstance("Game", chest.x - 25, chest.y - 80, true);
            if (icon) {
                icon.width = 36;
                icon.height = 36;
                icon.instVars.silverValue = -1;  // Mark as indicator (negative = not pickable)
            }

            // Create cost text (same height as icon)
            const text = runtime.objects.DamageText?.createInstance("Game", chest.x + 15, chest.y - 80);
            if (text) {
                text.text = chest.instVars.silverCost.toString();
                text.colorRgb = [0.75, 0.75, 0.85];  // Silver/gray color
            }

            ui = { icon, text };
            activeChestUI.set(chest.uid, ui);
        }

        // Update positions to follow chest
        if (ui.icon && ui.icon.runtime) {
            ui.icon.x = chest.x - 25;
            ui.icon.y = chest.y - 80;
            ui.icon.opacity = chest.opacity;  // Match chest opacity
        }
        if (ui.text && ui.text.runtime) {
            ui.text.x = chest.x + 15;
            ui.text.y = chest.y - 80;
            ui.text.text = chest.instVars.silverCost.toString();
            ui.text.opacity = chest.opacity;  // Match chest opacity

            // Text color based on affordability
            if (canAfford) {
                ui.text.colorRgb = [0.75, 0.75, 0.85];  // Silver/gray
            } else {
                ui.text.colorRgb = [1, 0.3, 0.3];  // Red - can't afford
            }
        }
    }
}

// Check chest interaction (for now, do nothing on touch)
export function checkChestInteraction() {
    // Chest interaction disabled for now
    // Will be implemented later for opening chests
}

// Get current silver count
export function getSilver() {
    return state.silver;
}

// Reset system for new run
export function reset() {
    // Clean up all UI
    for (const [uid, ui] of activeChestUI.entries()) {
        if (ui.icon && ui.icon.runtime) ui.icon.destroy();
        if (ui.text && ui.text.runtime) ui.text.destroy();
    }
    activeChestUI.clear();
    flyingSilvers.clear();  // Clear flying silvers
    chestsSpawned = 0;
    currentChestAge = 0;  // Reset chest timeout tracker
    currentChestCost = 0;  // Reset chest cost tracker

    // Reset early game silver guarantee
    earlyGameKills = 0;
    earlyGameSilverDropped = 0;
}

console.log("[SilverSystem] Module loaded!");
