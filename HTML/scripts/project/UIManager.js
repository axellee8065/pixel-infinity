// ============================================
// UI MANAGER - HP bar, XP bar, text displays
// ============================================

import { state, getRuntime } from "./GameState.js";
import * as Config from "./GameConfig.js";

// Update all UI elements
export function updateUI() {
    updateHPBar();
    updateExpBar();
    updateKillCount();
    updateTimerDisplay();
    updateLevelText();
}

// Store original bar fill widths
let hpBarFillMaxWidth = null;
let expBarFillMaxWidth = null;

// Update HP bar fill amount only
export function updateHPBar() {
    const runtime = getRuntime();

    const fill = runtime.objects.HPBarFill?.getFirstInstance();
    if (fill) {
        // Store original width on first call
        if (hpBarFillMaxWidth === null) {
            hpBarFillMaxWidth = fill.width;
        }

        // Calculate new width based on health percentage
        const percentage = Math.max(0, state.playerHealth / state.playerMaxHealth);
        fill.width = hpBarFillMaxWidth * percentage;
    }

    // Update HP text
    const hpText = runtime.objects.HPText?.getFirstInstance();
    if (hpText) {
        const currentHP = Math.ceil(state.playerHealth);
        const maxHP = Math.ceil(state.playerMaxHealth);
        hpText.text = currentHP + "/" + maxHP;
    }
}

// Update HP bar position to follow player (called every tick)
export function updateHPBarPosition() {
    const runtime = getRuntime();

    // Get player's actual world position
    const player = runtime.objects.Player?.getFirstInstance();
    if (!player) return;

    // Convert player's world position to UI layer position
    const gameLayer = runtime.layout.getLayer("Game");
    const uiLayer = runtime.layout.getLayer("UI");
    if (!gameLayer || !uiLayer) return;

    // Player's position relative to camera
    const scrollX = runtime.layout.scrollX;
    const scrollY = runtime.layout.scrollY;
    const viewW = runtime.viewportWidth;
    const viewH = runtime.viewportHeight;

    // Player's screen position
    const screenX = player.x - (scrollX - viewW / 2);
    const screenY = player.y - (scrollY - viewH / 2);

    const offsetY = -180; // Above player's head

    // Position HPBarBg above player (origin is center)
    const bg = runtime.objects.HPBarBg?.getFirstInstance();
    if (bg) {
        bg.x = screenX;
        bg.y = screenY + offsetY;
    }

    // Position HPBarFill at bg's Image Point 1 (origin is left)
    const fill = runtime.objects.HPBarFill?.getFirstInstance();
    if (fill && bg) {
        fill.x = bg.getImagePointX("Image Point 1");
        fill.y = bg.getImagePointY("Image Point 1");
    }

    // Position HP text centered on bar
    const hpText = runtime.objects.HPText?.getFirstInstance();
    if (hpText && bg) {
        hpText.x = bg.x;  // bg already centered
        hpText.y = bg.y;
    }
}

// Update XP bar width (called when XP changes)
export function updateExpBar() {
    const runtime = getRuntime();
    const fill = runtime.objects.ExpBarFill?.getFirstInstance();
    const bg = runtime.objects.ExpBarBg?.getFirstInstance();

    if (fill && bg) {
        // Store original width on first call (use bg width as reference)
        if (expBarFillMaxWidth === null) {
            expBarFillMaxWidth = bg.width;
        }

        // Calculate new width based on XP percentage
        const percentage = Math.max(0, Math.min(1, state.currentXP / state.xpToNextLevel));
        const targetWidth = expBarFillMaxWidth * percentage;

        if (fill.behaviors?.Tween) {
            fill.behaviors.Tween.startTween("width", targetWidth, 0.2, "easeoutquad");
        } else {
            fill.width = targetWidth;
        }
    }
}

// Update XP bar position (called every tick for responsiveness)
export function updateExpBarPosition() {
    const runtime = getRuntime();
    const fill = runtime.objects.ExpBarFill?.getFirstInstance();
    const bg = runtime.objects.ExpBarBg?.getFirstInstance();

    if (fill && bg) {
        // Position ExpBarFill at left edge of ExpBarBg
        // ExpBarBg has origin at center (0.5, 0.5), ExpBarFill has origin at left (0, 0.5)
        fill.x = bg.x - (bg.width / 2);
        fill.y = bg.y;
    }
}

// Update progressFill2 to be at the end of ExpBarFill (called every tick)
export function updateProgressFill2() {
    const runtime = getRuntime();
    const expBarBg = runtime.objects.ExpBarBg?.getFirstInstance();
    const progressFill2 = runtime.objects.progressFill2?.getFirstInstance();

    if (progressFill2 && expBarBg) {
        // Store original width on first call
        if (expBarFillMaxWidth === null) {
            expBarFillMaxWidth = expBarBg.width;
        }

        // Calculate current XP percentage and fill width
        const percentage = Math.max(0, Math.min(1, state.currentXP / state.xpToNextLevel));
        const currentFillWidth = expBarFillMaxWidth * percentage;

        // Position progressFill2 at the right edge of the fill
        // ExpBarBg origin is at center, so left edge is at: bg.x - (bg.width / 2)
        // Right edge of fill is at: leftEdge + currentFillWidth
        const fillLeftEdge = expBarBg.x - (expBarBg.width / 2);
        progressFill2.x = fillLeftEdge + currentFillWidth;
        progressFill2.y = expBarBg.y;
    }
}

// Update kill count text
export function updateKillCount() {
    const runtime = getRuntime();
    const text = runtime.objects.KillCountText?.getFirstInstance();
    if (text) {
        text.text = "Kills: " + state.killCount;
    }
}

// Update timer display
export function updateTimerDisplay() {
    const runtime = getRuntime();
    const text = runtime.objects.TimerText?.getFirstInstance();
    if (text) {
        const mins = Math.floor(state.gameTime / 60);
        const secs = Math.floor(state.gameTime % 60);
        text.text = String(mins).padStart(2, '0') + ":" + String(secs).padStart(2, '0');
    }
}

// Update level text
export function updateLevelText() {
    const runtime = getRuntime();
    const levelText = runtime.objects.LevelText?.getFirstInstance();
    if (levelText) {
        levelText.text = "Level " + state.playerLevel;
    }
}

// Update gold display - persistent HUD counter
export function updateGoldDisplay() {
    const runtime = getRuntime();
    // Try to find or create a GoldHUD text
    const goldText = runtime.objects.GoldText?.getFirstInstance();
    if (goldText) {
        const SaveManager = globalThis.SaveManager;
        if (SaveManager) {
            goldText.text = "Gold: " + SaveManager.getGold();
        }
    }
}

// Update silver display during gameplay
export function updateSilverDisplay(silver) {
    const runtime = getRuntime();
    const silverText = runtime.objects.SilverText?.getFirstInstance();
    if (silverText) {
        silverText.text = "Silver: " + (silver || 0);
    }
}

// Update weapon level indicators on HUD slots
export function updateWeaponLevelDisplay() {
    // Show weapon levels as text near weapon slots
    // This uses existing weapon slot sprites
    const runtime = getRuntime();
    const weaponEquippedSprites = runtime.objects.weaponEquipped?.getAllInstances() || [];

    for (const sprite of weaponEquippedSprites) {
        const slotIndex = sprite.instVars.slot - 1;
        const weaponId = state.equippedWeapons?.[slotIndex];
        if (!weaponId) continue;

        const level = state.weaponLevels?.[weaponId] || 0;
        if (level > 0) {
            // Check if evolved
            const isEvolved = state.evolvedWeapons && state.evolvedWeapons[weaponId];
            // Store level in inst var for tooltip display
            sprite.instVars.level = level;
            sprite.instVars.evolved = isEvolved ? 1 : 0;
        }
    }
}

// ============================================
// WEAPON EQUIPPED DISPLAY
// ============================================

// Track weapon icon instances created for each slot
const weaponIcons = {};  // slot -> icon instance
const lockOverlays = {};  // slot -> lock overlay instance

// Tooltip system
let tooltipInstance = null;
let tooltipTextInstance = null;

// Reset weapon icons (called on game init)
export function resetWeaponIcons() {
    for (const key in weaponIcons) delete weaponIcons[key];
    for (const key in lockOverlays) delete lockOverlays[key];
}


// Update weapon equipped icons in UI
export function updateWeaponEquippedDisplay() {
    const runtime = getRuntime();
    const weaponEquippedSprites = runtime.objects.weaponEquipped?.getAllInstances() || [];

    // First, destroy all existing lock overlays
    const existingLocks = runtime.objects.LockOverlay?.getAllInstances() || [];
    for (const lock of existingLocks) {
        lock.destroy();
    }
    // Clear lock tracking
    for (const key in lockOverlays) {
        delete lockOverlays[key];
    }

    for (const sprite of weaponEquippedSprites) {
        const slotIndex = sprite.instVars.slot - 1;  // Convert 1-based to 0-based
        const slotNumber = sprite.instVars.slot;

        // Check if slot is unlocked
        const isUnlocked = (slotNumber <= state.unlockedWeaponSlots);

        if (!isUnlocked) {
            // Slot is locked - create lock overlay
            sprite.opacity = 1;  // Keep full opacity
            sprite.isVisible = true;

            // Create lock overlay as child of weaponEquipped
            const lockOverlay = runtime.objects.LockOverlay?.createInstance("UI", sprite.x, sprite.y);
            if (lockOverlay) {
                lockOverlay.width = sprite.width * 0.6;
                lockOverlay.height = sprite.height * 0.6;
                lockOverlays[slotNumber] = lockOverlay;

                // Make lock overlay a child of weaponEquipped slot
                try {
                    sprite.addChild(lockOverlay, {
                        transformX: true,
                        transformY: true,
                        transformWidth: true,
                        transformHeight: true,
                        transformAngle: true,
                        destroyWithParent: true
                    });
                } catch (e) {
                    console.warn("[UIManager] Could not add lock overlay as child:", e);
                }
            }

            // Hide weapon icon if exists
            if (weaponIcons[slotNumber]) {
                weaponIcons[slotNumber].isVisible = false;
            }
            continue;
        }

        // Slot is unlocked
        sprite.opacity = 1;
        sprite.isVisible = true;

        // Get weapon in this slot
        const weaponId = state.equippedWeapons[slotIndex];

        if (!weaponId) {
            // Empty slot - hide weapon icon
            if (weaponIcons[slotNumber]) {
                weaponIcons[slotNumber].isVisible = false;
            }
            continue;
        }

        // Check if weapon is acquired (level > 0)
        const weaponLevel = state.weaponLevels[weaponId] || 0;
        if (weaponLevel <= 0) {
            // Weapon in deck but not acquired yet - hide icon
            if (weaponIcons[slotNumber]) {
                weaponIcons[slotNumber].isVisible = false;
            }
            continue;
        }

        // Create or update weapon icon using Weapons sprite
        let icon = weaponIcons[slotNumber];

        if (!icon || !icon.runtime) {
            // Create new icon as child of weaponEquipped
            icon = runtime.objects.Weapons?.createInstance("UI", sprite.x, sprite.y);
            if (icon) {
                icon.width = sprite.width * 0.8;  // Slightly smaller than background
                icon.height = sprite.height * 0.8;
                weaponIcons[slotNumber] = icon;

                // Make weapon icon a child of weaponEquipped slot
                try {
                    sprite.addChild(icon, {
                        transformX: true,
                        transformY: true,
                        transformWidth: true,
                        transformHeight: true,
                        transformAngle: true,
                        destroyWithParent: true
                    });
                } catch (e) {
                    console.warn("[UIManager] Could not add weapon icon as child:", e);
                }
            }
        }

        if (icon) {
            // Update icon position and animation (position will follow parent automatically)
            icon.x = sprite.x;
            icon.y = sprite.y;
            icon.isVisible = true;
            icon.moveToTop(); // Ensure it's visible above background

            try {
                icon.setAnimation(weaponId);
            } catch (e) {
                console.warn("[UIManager] No animation for weapon:", weaponId);
            }
        }
    }

    console.log("[UIManager] Weapon equipped display updated");
}

// ============================================
// WEAPON TOOLTIP SYSTEM
// ============================================

// Destroy existing tooltips (called at game start)
export function destroyTooltips() {
    const runtime = getRuntime();

    // Destroy all tooltip instances
    const tooltips = runtime.objects.Tooltip?.getAllInstances() || [];
    for (const tooltip of tooltips) {
        tooltip.destroy();
    }

    // Destroy all tooltip text instances
    const tooltipTexts = runtime.objects.TooltipText?.getAllInstances() || [];
    for (const text of tooltipTexts) {
        text.destroy();
    }

    tooltipInstance = null;
    tooltipTextInstance = null;

    console.log("[UIManager] Tooltips destroyed");
}

// Show tooltip at mouse position with weapon info
export async function showWeaponTooltip(mouseX, mouseY, weaponId) {
    const runtime = getRuntime();

    // Import WeaponData
    const WeaponData = await import("./WeaponData.js");
    const weaponData = WeaponData.getWeaponData(weaponId);
    if (!weaponData) return;

    // Destroy old tooltip if exists
    hideWeaponTooltip();

    // Create tooltip background at mouse position with 0.1 opacity
    tooltipInstance = runtime.objects.Tooltip?.createInstance("UI", mouseX, mouseY, true, 0.1);
    if (!tooltipInstance) {
        console.warn("[UIManager] Tooltip object not found");
        return;
    }

    // Wait a frame for TooltipText child to be created
    await new Promise(resolve => setTimeout(resolve, 0));

    // Get tooltipText child (should be created as child of Tooltip)
    const allTooltipTexts = runtime.objects.TooltipText?.getAllInstances() || [];
    tooltipTextInstance = allTooltipTexts[allTooltipTexts.length - 1];  // Get the last created one

    if (tooltipTextInstance) {
        // Set tooltip text to weapon name and description only
        const description = `${weaponData.name}\n${weaponData.description || "No description"}`;
        tooltipTextInstance.text = description;
    }
}

// Hide tooltip
export function hideWeaponTooltip() {
    if (tooltipInstance && tooltipInstance.runtime) {
        tooltipInstance.destroy();
        tooltipInstance = null;
    }

    if (tooltipTextInstance && tooltipTextInstance.runtime) {
        tooltipTextInstance.destroy();
        tooltipTextInstance = null;
    }
}

// Hide tooltip on viewport resize (called from ResponsiveScale)
export function hideTooltipOnResize() {
    hideWeaponTooltip();
}

// Update weapon icon and lock positions to follow their parent weaponEquipped slots
// NOTE: This function is now deprecated - icons and locks are children of weaponEquipped
// and automatically follow their parent's position. Kept for backwards compatibility.
export function updateWeaponSlotPositions() {
    // No longer needed - weapon icons and lock overlays are now children of weaponEquipped
    // and automatically follow parent position
}

// Handle mouse move over weapon slots (called from InputManager)
export function handleWeaponSlotHover(mouseX, mouseY) {
    const runtime = getRuntime();
    const weaponEquippedSprites = runtime.objects.weaponEquipped?.getAllInstances() || [];

    let hoveredWeapon = null;

    for (const sprite of weaponEquippedSprites) {
        const slotIndex = sprite.instVars.slot - 1;
        const slotNumber = sprite.instVars.slot;

        // Check if unlocked
        const isUnlocked = (slotNumber <= state.unlockedWeaponSlots);
        if (!isUnlocked) continue;

        // Get weapon in this slot
        const weaponId = state.equippedWeapons[slotIndex];
        if (!weaponId) continue;

        // Check if mouse is over this sprite
        const dx = Math.abs(mouseX - sprite.x);
        const dy = Math.abs(mouseY - sprite.y);

        if (dx < sprite.width / 2 && dy < sprite.height / 2) {
            hoveredWeapon = weaponId;
            break;
        }
    }

    if (hoveredWeapon) {
        // Show tooltip at mouse position
        showWeaponTooltip(mouseX, mouseY, hoveredWeapon);
    } else {
        // Hide tooltip
        hideWeaponTooltip();
    }
}

console.log("[UIManager] Module loaded!");
