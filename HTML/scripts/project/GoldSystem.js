// ============================================
// GOLD SYSTEM - Gold drops, pickup, floating text
// ============================================

import { state, getRuntime } from "./GameState.js";
import * as Config from "./GameConfig.js";
import * as PlayerController from "./PlayerController.js";
import * as UIManager from "./UIManager.js";
import * as TomeSystem from "./TomeSystem.js";
import * as SaveManager from "./SaveManager.js";

// Spawn gold at position with drop animation
export function spawnGold(x, y, goldValue) {
    const runtime = getRuntime();

    // Random horizontal offset for final position
    const offsetX = (Math.random() - 0.5) * 60;
    const finalX = x + offsetX;
    const finalY = y;

    // Start position (above enemy, random arc)
    const startY = y - 80 - Math.random() * 40;  // 80-120 pixels above

    const gold = runtime.objects.lootGold?.createInstance("Game", finalX, startY, true);

    if (gold) {
        gold.instVars.goldValue = goldValue;

        // Start small and grow
        gold.width = 20;
        gold.height = 20;

        // Animate size (pop effect)
        gold.behaviors.Tween.startTween("width", 64, 0.15, "easeoutback");
        gold.behaviors.Tween.startTween("height", 64, 0.15, "easeoutback");

        // Fall down with bounce
        gold.behaviors.Tween.startTween("y", finalY, 0.4, "easeoutbounce");
    }
}

// Try to drop gold from enemy (based on chance)
export function tryDropGold(x, y, enemyType) {
    let dropChance, goldValue;

    if (enemyType === "boss") {
        dropChance = Config.GOLD_DROP_CHANCE_BOSS;
        goldValue = Config.GOLD_VALUE_BOSS;
    } else {
        dropChance = Config.GOLD_DROP_CHANCE;
        goldValue = Config.GOLD_VALUE;
    }

    // Apply Gold Tome bonus to drop chance
    const goldChanceBonus = TomeSystem.getGoldChanceBonus();
    if (goldChanceBonus > 0) {
        dropChance += goldChanceBonus / 100;  // Convert % to decimal
    }

    if (Math.random() < dropChance) {
        // Add bonus gold from Pouch of Plunder
        if (state.itemStats && state.itemStats.bonusGold > 0) {
            goldValue += state.itemStats.bonusGold;
        }
        spawnGold(x, y, goldValue);
    }
}

// Check gold pickup (called every tick)
export function checkGoldPickup() {
    const runtime = getRuntime();
    const playerPos = PlayerController.getPlayerPosition();
    if (playerPos.x === 0 && playerPos.y === 0) return;

    // Pause magnet during level up
    if (state.isLevelingUp) return;

    const golds = runtime.objects.lootGold?.getAllInstances() || [];

    for (const gold of golds) {
        const dx = playerPos.x - gold.x;
        const dy = playerPos.y - gold.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Pickup gold
        if (dist < Config.GOLD_PICKUP_RADIUS) {
            collectGold(gold.instVars.goldValue);
            gold.destroy();
        } else if (state.bossDefeatedMagnet) {
            // Boss defeated - pull ALL gold at high speed
            const magnetSpeed = 800;
            gold.x += (dx / dist) * magnetSpeed * runtime.dt;
            gold.y += (dy / dist) * magnetSpeed * runtime.dt;
        } else if (dist < Config.GOLD_ATTRACT_RADIUS) {
            // Normal attract gold when close
            const speed = Config.GOLD_ATTRACT_SPEED * runtime.dt;
            gold.x += (dx / dist) * speed;
            gold.y += (dy / dist) * speed;
        }
    }
}

// Collect gold and update floating text
function collectGold(amount) {
    state.gold += amount;

    // Save to localStorage
    const totalGold = SaveManager.addGold(amount);
    console.log("[GoldSystem] Collected", amount, "gold. Total saved:", totalGold);

    // Add to accumulated gold text
    state.goldTextValue += amount;
    state.goldTextTimer = Config.GOLD_TEXT_DURATION;

    // Update gold display in UI
    UIManager.updateGoldDisplay();
}

// Update gold text timer and visibility (called every tick)
export function updateGoldText(dt) {
    if (state.goldTextTimer > 0) {
        state.goldTextTimer -= dt;

        if (state.goldTextTimer <= 0) {
            // Reset accumulated value when text disappears
            state.goldTextValue = 0;
        }
    }

    // Update floating text position and content
    updateFloatingGoldText();
}

// Update floating +gold text near player
function updateFloatingGoldText() {
    const runtime = getRuntime();

    // Try to find or use GoldText object (we'll use existing text object)
    const goldText = runtime.objects.GoldText?.getFirstInstance();
    if (!goldText) return;

    if (state.goldTextValue > 0 && state.goldTextTimer > 0) {
        // Position near player (using viewport center since camera follows)
        const centerX = runtime.viewportWidth / 2;
        const centerY = runtime.viewportHeight / 2;

        goldText.x = centerX + 80;  // Right of player
        goldText.y = centerY - 60;  // Above player
        goldText.text = "+" + state.goldTextValue;
        goldText.isVisible = true;

        // Fade effect based on timer
        const fadeStart = 0.5;  // Start fading at 0.5 seconds
        if (state.goldTextTimer < fadeStart) {
            goldText.opacity = state.goldTextTimer / fadeStart;
        } else {
            goldText.opacity = 1;
        }
    } else {
        goldText.isVisible = false;
    }
}

// Get current gold count
export function getGold() {
    return state.gold;
}

console.log("[GoldSystem] Module loaded!");
