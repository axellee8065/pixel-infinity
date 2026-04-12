// ============================================
// CHEST SYSTEM - Chest opening with slot machine UI
// ============================================

import { state, getRuntime } from "./GameState.js";
import * as PlayerController from "./PlayerController.js";
import * as ItemSystem from "./ItemSystem.js";
import * as SilverSystem from "./SilverSystem.js";

// ============================================
// CHEST OPENING STATE
// ============================================
let isChestWindowOpen = false;
let currentChest = null;
let slotAnimationTimer = 0;
let slotCurrentItem = null;
let slotItemIndex = 0;
let slotSpeed = 0.08;
let slotPhase = "spinning";  // "spinning", "slowing", "stopped"
let finalItemId = null;
let lastSwitchTime = 0;

// UI elements
let chestWindowUI = {
    itemDisplay: null,
    itemNameText: null,
    itemDescText: null,
    claimButton: null
};

// Slot animation config
const SLOT_SPIN_DURATION = 2.0;
const SLOT_SLOW_START = 1.5;
const SLOT_MIN_SPEED = 0.3;
const SLOT_FAST_SPEED = 0.06;

// ============================================
// CHECK CHEST COLLISION
// ============================================
export function checkChestInteraction() {
    if (isChestWindowOpen) return;
    if (state.isLevelingUp || state.isPaused) return;

    const runtime = getRuntime();
    const playerPos = PlayerController.getPlayerPosition();
    if (playerPos.x === 0 && playerPos.y === 0) return;

    const chests = runtime.objects.Chest?.getAllInstances() || [];

    for (const chest of chests) {
        if (chest.instVars.isOpened) continue;

        const dx = Math.abs(chest.x - playerPos.x);
        const dy = Math.abs(chest.y - playerPos.y);
        const overlapX = chest.width / 2 + 40;
        const overlapY = chest.height / 2 + 40;

        if (dx < overlapX && dy < overlapY) {
            const cost = chest.instVars.silverCost || 0;

            // Check for free chest (Key item)
            let isFree = false;
            if (state.itemStats && state.itemStats.freeChestChance > 0) {
                if (Math.random() * 100 < state.itemStats.freeChestChance) {
                    isFree = true;
                    console.log("[ChestSystem] FREE chest from Key item!");
                }
            }

            if (isFree || state.silver >= cost) {
                if (!isFree) {
                    state.silver -= cost;
                    SilverSystem.updateSilverCountText();
                }
                openChest(chest);
                return;
            }
        }
    }
}

/**
 * Open a chest and show the slot machine UI
 */
function openChest(chest) {
    const runtime = getRuntime();

    console.log("[ChestSystem] Opening chest!");

    // Play chest open sound
    runtime.callFunction("playAudio", "powerup2", 0, 10);

    chest.instVars.isOpened = true;
    currentChest = chest;
    isChestWindowOpen = true;
    state.isPaused = true;

    // Determine the final item
    finalItemId = ItemSystem.getRandomItemId();

    // Reset slot animation
    slotAnimationTimer = 0;
    lastSwitchTime = 0;
    slotSpeed = SLOT_FAST_SPEED;
    slotPhase = "spinning";
    slotItemIndex = 0;

    // Show the LevelUpUI layer (has dark background)
    const layer = runtime.layout.getLayer("LevelUpUI");
    if (layer) {
        layer.isVisible = true;
    }

    // Create UI elements
    createChestWindowUI();

    // Trigger Hoarder's Charm effect
    ItemSystem.onChestOpened();

    console.log("[ChestSystem] Final item will be:", finalItemId);
}

/**
 * Create the chest window UI elements (same pattern as LevelUpManager)
 */
function createChestWindowUI() {
    const runtime = getRuntime();

    const centerX = 540;  // Fixed center like LevelUpManager
    const centerY = 960;

    // Create item display (use Items sprite)
    const itemDisplay = runtime.objects.Items?.createInstance("LevelUpUI", centerX, centerY - 150);
    if (itemDisplay) {
        itemDisplay.width = 200;
        itemDisplay.height = 200;
        try {
            itemDisplay.setAnimation("Default");
        } catch (e) {}
        chestWindowUI.itemDisplay = itemDisplay;
    }

    // Create item name text (use tapto2)
    const nameText = runtime.objects.tapto2?.createInstance("LevelUpUI", centerX, centerY + 50);
    if (nameText) {
        nameText.text = "???";
        chestWindowUI.itemNameText = nameText;
    }

    // Create item description text (use tapto2)
    const descText = runtime.objects.tapto2?.createInstance("LevelUpUI", centerX, centerY + 150);
    if (descText) {
        descText.text = "";
        chestWindowUI.itemDescText = descText;
    }

    // Create claim button (use Claim sprite)
    const claimBtn = runtime.objects.Claim?.createInstance("LevelUpUI", centerX, centerY + 350);
    if (claimBtn) {
        claimBtn.opacity = 0;  // Hidden until slot stops
        chestWindowUI.claimButton = claimBtn;
    }

    console.log("[ChestSystem] UI created");
}

/**
 * Update chest window (slot machine animation)
 */
export function updateChestWindow(dt) {
    if (!isChestWindowOpen) return;

    slotAnimationTimer += dt;

    if (slotPhase === "spinning" || slotPhase === "slowing") {
        // Phase transition
        if (slotAnimationTimer >= SLOT_SLOW_START && slotPhase === "spinning") {
            slotPhase = "slowing";
        }

        // Slow down over time
        if (slotPhase === "slowing") {
            const slowProgress = (slotAnimationTimer - SLOT_SLOW_START) / (SLOT_SPIN_DURATION - SLOT_SLOW_START);
            slotSpeed = SLOT_FAST_SPEED + (SLOT_MIN_SPEED - SLOT_FAST_SPEED) * slowProgress;
        }

        // Stop or switch items
        if (slotAnimationTimer >= SLOT_SPIN_DURATION) {
            slotPhase = "stopped";
            slotCurrentItem = finalItemId;
            showFinalItem();
        } else {
            // Time-based item switching
            if (slotAnimationTimer - lastSwitchTime >= slotSpeed) {
                lastSwitchTime = slotAnimationTimer;

                const itemIds = ItemSystem.getAllItemIds();
                slotItemIndex = (slotItemIndex + 1) % itemIds.length;

                if (slotAnimationTimer > SLOT_SPIN_DURATION - 0.5) {
                    slotCurrentItem = finalItemId;
                } else {
                    slotCurrentItem = itemIds[slotItemIndex];
                }

                updateSlotDisplay();
            }
        }
    }
}

/**
 * Update the slot display with current item
 */
function updateSlotDisplay() {
    if (!slotCurrentItem) return;

    const item = ItemSystem.getItemData(slotCurrentItem);
    if (!item) return;

    // Update item display animation
    if (chestWindowUI.itemDisplay) {
        try {
            chestWindowUI.itemDisplay.setAnimation(item.id);
            chestWindowUI.itemDisplay.colorRgb = [1, 1, 1];
        } catch (e) {
            try {
                chestWindowUI.itemDisplay.setAnimation("Default");
            } catch (e2) {}
        }
    }

    // Keep name as ??? while spinning
    if (chestWindowUI.itemNameText) {
        chestWindowUI.itemNameText.text = "???";
    }
}

/**
 * Show the final item after slot stops
 */
function showFinalItem() {
    const item = ItemSystem.getItemData(finalItemId);
    if (!item) return;

    console.log("[ChestSystem] Slot stopped on:", item.name);

    // Update item display
    if (chestWindowUI.itemDisplay) {
        try {
            chestWindowUI.itemDisplay.setAnimation(item.id);
        } catch (e) {}

        // Rarity color
        switch (item.rarity) {
            case "common":
                chestWindowUI.itemDisplay.colorRgb = [0.8, 0.8, 0.8];
                break;
            case "uncommon":
                chestWindowUI.itemDisplay.colorRgb = [0.3, 1, 0.3];
                break;
            case "rare":
                chestWindowUI.itemDisplay.colorRgb = [0.3, 0.5, 1];
                break;
            case "epic":
                chestWindowUI.itemDisplay.colorRgb = [0.8, 0.3, 1];
                break;
            case "legendary":
                chestWindowUI.itemDisplay.colorRgb = [1, 0.8, 0.2];
                break;
            default:
                chestWindowUI.itemDisplay.colorRgb = [1, 1, 1];
        }
    }

    // Update name text
    if (chestWindowUI.itemNameText) {
        chestWindowUI.itemNameText.text = item.name;
    }

    // Update description text
    if (chestWindowUI.itemDescText) {
        chestWindowUI.itemDescText.text = item.description;
    }

    // Show claim button
    if (chestWindowUI.claimButton) {
        chestWindowUI.claimButton.opacity = 1;
    }
}

/**
 * Handle click on chest window (called from InputManager)
 */
export function handleChestClick(e) {
    if (!isChestWindowOpen) return;
    if (slotPhase !== "stopped") return;

    const runtime = getRuntime();
    const layer = runtime.layout.getLayer("LevelUpUI");
    if (!layer) return;

    const [layerX, layerY] = layer.cssPxToLayer(e.clientX, e.clientY);

    // Check claim button (same pattern as LevelUpManager)
    const btn = chestWindowUI.claimButton;
    if (btn && btn.opacity > 0) {
        const dx = Math.abs(layerX - btn.x);
        const dy = Math.abs(layerY - btn.y);

        if (dx < btn.width / 2 && dy < btn.height / 2) {
            claimItem();
            return;
        }
    }
}

/**
 * Claim the item and close the chest window
 */
function claimItem() {
    console.log("[ChestSystem] Claiming item:", finalItemId);
    ItemSystem.addItem(finalItemId);
    SilverSystem.onChestOpened();  // Increase cost for next chest

    // Show rarity drop effect
    const itemData = ItemSystem.getItemData(finalItemId);
    if (itemData) {
        const DamageEffects = globalThis.DamageEffects;
        const PlayerController = globalThis.PlayerController;
        if (DamageEffects && PlayerController) {
            const pos = PlayerController.getPlayerPosition();
            DamageEffects.showRarityDropEffect(pos.x, pos.y, itemData.rarity, itemData.name);
        }
    }

    closeChestWindow();
}

/**
 * Close the chest window and resume game
 */
function closeChestWindow() {
    console.log("[ChestSystem] Closing chest window");

    const runtime = getRuntime();

    // Destroy UI elements
    if (chestWindowUI.itemDisplay) {
        try { chestWindowUI.itemDisplay.destroy(); } catch (e) {}
        chestWindowUI.itemDisplay = null;
    }
    if (chestWindowUI.itemNameText) {
        try { chestWindowUI.itemNameText.destroy(); } catch (e) {}
        chestWindowUI.itemNameText = null;
    }
    if (chestWindowUI.itemDescText) {
        try { chestWindowUI.itemDescText.destroy(); } catch (e) {}
        chestWindowUI.itemDescText = null;
    }
    if (chestWindowUI.claimButton) {
        try { chestWindowUI.claimButton.destroy(); } catch (e) {}
        chestWindowUI.claimButton = null;
    }

    // Hide the LevelUpUI layer
    const layer = runtime.layout.getLayer("LevelUpUI");
    if (layer) {
        layer.isVisible = false;
    }

    // Destroy the chest
    if (currentChest) {
        try { currentChest.destroy(); } catch (e) {}
    }

    // Reset state
    isChestWindowOpen = false;
    currentChest = null;
    finalItemId = null;
    slotPhase = "spinning";
    lastSwitchTime = 0;

    // Resume game
    state.isPaused = false;
}

/**
 * Check if chest window is open
 */
export function isWindowOpen() {
    return isChestWindowOpen;
}

/**
 * Reset chest system (for new game)
 */
export function reset() {
    if (isChestWindowOpen) {
        closeChestWindow();
    }
}

console.log("[ChestSystem] Module loaded!");
