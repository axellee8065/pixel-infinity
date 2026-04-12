// ============================================
// LEVEL UP MANAGER - Upgrade panel and selection
// ============================================

import { state, getRuntime } from "./GameState.js";
import * as Config from "./GameConfig.js";
import * as UIManager from "./UIManager.js";
import * as WeaponSystem from "./WeaponSystem.js";
import * as WeaponData from "./WeaponData.js";
import * as SaveManager from "./SaveManager.js";
import * as TomeSystem from "./TomeSystem.js";
import * as StatsDisplay from "./StatsDisplay.js";

// Show level up panel
export function showLevelUpPanel() {
    state.isLevelingUp = true;

    const runtime = getRuntime();

    // Show LevelUpUI layer
    const layer = runtime.layout.getLayer("LevelUpUI");
    if (layer) {
        layer.isVisible = true;
    }

    // Responsive sizing - scale to fit viewport
    const viewportWidth = runtime.viewportWidth;
    const viewportHeight = runtime.viewportHeight;

    // Panel scaling (90% of viewport, keeping aspect ratio)
    const panelScale = Math.min(viewportWidth * 0.9 / 756, viewportHeight * 0.85 / 1123, 1.2);

    // Create panel at temporary position first to get its original dimensions
    const centerX = viewportWidth / 2;
    const tempY = viewportHeight / 2;
    const panel = runtime.objects.LevelUpPanel?.createInstance("LevelUpUI", centerX, tempY);

    if (panel) {
        // Get original size to maintain aspect ratio
        const originalWidth = panel.width;
        const originalHeight = panel.height;

        // Apply uniform scale to both dimensions (maintain aspect ratio)
        const targetWidth = originalWidth * panelScale;
        const targetHeight = originalHeight * panelScale;

        // Position panel slightly above center (45% down from top)
        const centerY = viewportHeight * 0.45;
        panel.y = centerY;

        // Start small (but maintain aspect ratio)
        panel.width = targetWidth * 0.3;
        panel.height = targetHeight * 0.3;
        panel.opacity = 0;

        // Animate to full size
        try {
            panel.behaviors.Tween.startTween("width", targetWidth, 0.3, "easeoutback");
            panel.behaviors.Tween.startTween("height", targetHeight, 0.3, "easeoutback");
            panel.behaviors.Tween.startTween("opacity", 1, 0.2, "default");
        } catch (e) {
            // Fallback if no tween
            panel.width = targetWidth;
            panel.height = targetHeight;
            panel.opacity = 1;
        }

        // Wait for panel animation to complete, then create buttons
        setTimeout(() => {
            createUpgradeButtons(runtime, panel, centerX, centerY, panelScale, targetWidth, targetHeight);
            // createStatsButton(runtime, panel, centerX, centerY, panelScale); // DISABLED - User doesn't want stats button
        }, 300);  // Match panel animation duration
    }

    console.log("[LevelUpManager] Panel animation started");
}

// Create stats button below panel
function createStatsButton(runtime, panel, centerX, centerY, panelScale) {
    if (!panel) {
        console.error("[LevelUpManager] createStatsButton called with no panel");
        return;
    }

    // Position button below the panel (with spacing)
    const buttonY = centerY + (panel.height / 2) + (80 * panelScale);

    console.log("[LevelUpManager] Attempting to create stats button at:", centerX, buttonY);

    // Try to create stats button (fallback to UpgradeButton if StatsButton doesn't exist)
    let statsBtn = runtime.objects.StatsButton?.createInstance("LevelUpUI", centerX, buttonY);

    if (!statsBtn) {
        // Fallback: Use UpgradeButton as template
        console.warn("[LevelUpManager] StatsButton not found, using UpgradeButton as fallback");
        statsBtn = runtime.objects.UpgradeButton?.createInstance("LevelUpUI", centerX, buttonY);
        if (statsBtn) {
            console.log("[LevelUpManager] Created fallback button, setting upgradeType to 'stats'");
            statsBtn.instVars.upgradeType = "stats";  // Mark as stats button
        }
    } else {
        console.log("[LevelUpManager] StatsButton object found and created");
        if (statsBtn.instVars) {
            statsBtn.instVars.upgradeType = "stats";
            console.log("[LevelUpManager] Set StatsButton upgradeType to 'stats'");
        }
    }

    if (statsBtn) {
        // Don't change button size - keep original size from sprite
        console.log("[LevelUpManager] Stats button created at:", centerX, buttonY, "upgradeType:", statsBtn.instVars?.upgradeType);
    } else {
        console.error("[LevelUpManager] Could not create stats button - no suitable object found");
        return;
    }
}

// Create upgrade buttons after panel animation completes
function createUpgradeButtons(runtime, panel, centerX, centerY, panelScale, finalWidth, finalHeight) {
    // Build pools for tomes and weapons
    const tomeOptions = TomeSystem.getRandomTomesForLevelUp(6);  // Get 6 random tomes
    const weaponOptionsList = [];

    // Add weapon upgrades (for equipped weapons that can be upgraded)
    const heroId = SaveManager.getSelectedHeroId();
    const weaponUpgrades = WeaponSystem.getAvailableWeaponsForLevelUp(heroId);

    console.log("[LevelUpManager] Hero:", heroId, "Available weapon upgrades:", weaponUpgrades.length, "Tome options:", tomeOptions.length);

    for (const wOpt of weaponUpgrades) {
        // Skip if no upgrade data (shouldn't happen but safety check)
        if (!wOpt.upgrade) {
            console.warn("[LevelUpManager] No upgrade data for weapon:", wOpt.weaponId);
            continue;
        }

        weaponOptionsList.push({
            isWeapon: true,
            isTome: false,
            weaponId: wOpt.weaponId,
            name: wOpt.name + " Lv" + wOpt.nextLevel,
            desc: wOpt.upgrade.desc,
            upgrade: wOpt.upgrade,  // Include full upgrade object
            currentLevel: wOpt.currentLevel,
            nextLevel: wOpt.nextLevel
        });
    }

    // Build final options: mix of tomes and weapons (3 total)
    // GUARANTEE at least 1 weapon if weapons are available
    const options = [];

    // Shuffle both pools
    const shuffledTomes = tomeOptions.sort(() => Math.random() - 0.5);
    const shuffledWeapons = weaponOptionsList.sort(() => Math.random() - 0.5);

    if (shuffledWeapons.length > 0) {
        // GUARANTEE: Add 1 weapon first
        options.push(shuffledWeapons[0]);

        // Combine remaining weapons and tomes for the other 2 slots
        const remainingWeapons = shuffledWeapons.slice(1);
        const allRemaining = [...shuffledTomes, ...remainingWeapons].sort(() => Math.random() - 0.5);

        // Pick 2 more options from the remaining pool
        for (let i = 0; i < Math.min(2, allRemaining.length); i++) {
            options.push(allRemaining[i]);
        }
    } else {
        // No weapons available - show only tomes
        for (let i = 0; i < Math.min(3, shuffledTomes.length); i++) {
            options.push(shuffledTomes[i]);
        }
    }

    // Final shuffle to randomize positions
    options.sort(() => Math.random() - 0.5);

    // Button scaling (same scale as panel for consistency)
    const buttonScale = panelScale;
    const buttonWidth = 642 * buttonScale;
    const buttonHeight = 186 * buttonScale;
    const buttonSpacing = 210 * buttonScale;  // Vertical spacing between buttons
    const iconSize = 120 * buttonScale;  // Larger icons

    // Calculate starting Y position from panel's Image Point 1
    let firstButtonY = centerY - (buttonSpacing * 0.7);  // Fallback
    if (panel) {
        try {
            const panelImagePointY = panel.getImagePointY("Image Point 1");
            firstButtonY = panelImagePointY;
        } catch (e) {
            console.warn("[LevelUpManager] Panel Image Point 1 not found, using fallback");
        }
    }

    // Create upgrade buttons
    for (let i = 0; i < options.length; i++) {
        const option = options[i];
        const btnY = firstButtonY + i * buttonSpacing;

        const btn = runtime.objects.UpgradeButton?.createInstance("LevelUpUI", centerX, btnY);
        if (btn) {
            btn.width = buttonWidth;
            btn.height = buttonHeight;

            if (option.isWeapon) {
                btn.instVars.upgradeType = "weapon";
                btn.instVars.upgradeValue = 0;
                btn.instVars.weaponId = option.weaponId;
            } else if (option.isTome) {
                btn.instVars.upgradeType = "tome";
                btn.instVars.upgradeValue = 0;
                btn.instVars.weaponId = option.tomeId;  // Store tome ID in weaponId field
            }
        }

        // Get icon position from Image Point 1
        let iconX = centerX;
        let iconY = btnY;
        if (btn) {
            iconX = btn.getImagePointX("Image Point 1");
            iconY = btn.getImagePointY("Image Point 1");
        }

        // Get text position from Image Point 2 (exactly where it is, no offset)
        let textX = centerX;
        let textY = btnY;
        if (btn) {
            try {
                textX = btn.getImagePointX("Image Point 2");
                textY = btn.getImagePointY("Image Point 2");
            } catch (e) {
                // Fallback if Image Point 2 doesn't exist
                textX = iconX + 80 * buttonScale;
                textY = btnY;
                console.warn("[LevelUpManager] Image Point 2 not found, using fallback");
            }
        }

        if (option.isTome) {
            // Create tome icon as child of button
            const icon = runtime.objects.Tomes?.createInstance("LevelUpUI", iconX, iconY);
            if (icon) {
                try {
                    // Get animation name from TomeSystem
                    const tome = TomeSystem.TOMES[option.tomeId];
                    if (tome && tome.animationName) {
                        icon.setAnimation(tome.animationName);
                    }
                } catch (e) {
                    console.warn("[LevelUpManager] Could not set tome animation:", e);
                }
                icon.width = iconSize;
                icon.height = iconSize;

                // Make icon a child of button
                if (btn) {
                    try {
                        btn.addChild(icon, { transformX: true, transformY: true, transformWidth: true, transformHeight: true, transformAngle: true, destroyWithParent: true });
                        console.log("[LevelUpManager] Tome icon added as child of button");
                    } catch (e) {
                        console.warn("[LevelUpManager] Could not add icon as child:", e);
                    }
                }
            }
        } else if (option.isWeapon) {
            // Create weapon icon as child of button
            const icon = runtime.objects.Weapons?.createInstance("LevelUpUI", iconX, iconY);
            if (icon) {
                // Weapons sprite uses snake_case animation names (same as weaponId)
                const animName = option.weaponId;
                console.log("[LevelUpManager] Setting weapon icon:", option.weaponId);
                if (animName) {
                    try {
                        icon.setAnimation(animName);
                    } catch (e) {
                        console.error("[LevelUpManager] Animation failed for:", animName, e.message);
                    }
                }
                icon.width = iconSize;
                icon.height = iconSize;

                // Make icon a child of button
                if (btn) {
                    try {
                        btn.addChild(icon, { transformX: true, transformY: true, transformWidth: true, transformHeight: true, transformAngle: true, destroyWithParent: true });
                        console.log("[LevelUpManager] Weapon icon added as child of button");
                    } catch (e) {
                        console.warn("[LevelUpManager] Could not add icon as child:", e);
                    }
                }
            }
        }

        // Create title text at Image Point 2 as child of button
        const titleText = runtime.objects.UpgradeText?.createInstance("LevelUpUI", textX, textY);
        if (titleText) {
            // Get title only
            let title = "";
            if (option.isTome) {
                if (option.currentCount > 0) {
                    title = option.name;
                } else {
                    title = "[color=yellow][NEW][/color] " + option.name;
                }
            } else if (option.isWeapon) {
                // Check if this is a NEW weapon acquisition
                if (option.isNewWeapon || option.currentLevel === 0) {
                    title = "[color=yellow][NEW][/color] " + option.name;
                } else {
                    title = option.name.replace(/ Lv\d+$/, "");
                }
            } else {
                title = option.name;
            }

            titleText.text = title;
            titleText.horizontalAlign = "left";
            titleText.verticalAlign = "top";
            titleText.wordWrap = "word";
            titleText.width = buttonWidth * 0.7;
            titleText.height = 50;
            titleText.fontSize = 24 * buttonScale;

            // Make title a child of button
            if (btn) {
                try {
                    btn.addChild(titleText, { transformX: true, transformY: true, transformWidth: true, transformHeight: true, transformAngle: true, destroyWithParent: true });
                    console.log("[LevelUpManager] Title added as child of button");
                } catch (e) {
                    console.warn("[LevelUpManager] Could not add title as child:", e);
                }
            }

            console.log("[LevelUpManager] Title created at:", textX, textY, "text:", title);
        }

        // Create description text below title as child of button
        const descY = textY + (45 * buttonScale);  // More gap below title
        const descText = runtime.objects.UpgradeText?.createInstance("LevelUpUI", textX, descY);
        if (descText) {
            descText.text = option.desc;
            descText.horizontalAlign = "left";
            descText.verticalAlign = "top";
            descText.wordWrap = "word";
            descText.width = buttonWidth * 0.7;
            descText.height = 60;
            descText.fontSize = 18 * buttonScale;

            // Make description a child of button
            if (btn) {
                try {
                    btn.addChild(descText, { transformX: true, transformY: true, transformWidth: true, transformHeight: true, transformAngle: true, destroyWithParent: true });
                    console.log("[LevelUpManager] Description added as child of button");
                } catch (e) {
                    console.warn("[LevelUpManager] Could not add description as child:", e);
                }
            }

            console.log("[LevelUpManager] Description created at:", textX, descY, "text:", option.desc);
        }
    }

    console.log("[LevelUpManager] Panel shown with", options.length, "upgrade options");
}

// Handle mouse move for hover effect
export function handleLevelUpMouseMove(e) {
    const runtime = getRuntime();
    const layer = runtime.layout.getLayer("LevelUpUI");
    if (!layer) return;

    const [layerX, layerY] = layer.cssPxToLayer(e.clientX, e.clientY);
    const buttons = runtime.objects.UpgradeButton?.getAllInstances() || [];

    for (const btn of buttons) {
        const dx = Math.abs(layerX - btn.x);
        const dy = Math.abs(layerY - btn.y);
        const isHovering = dx < btn.width / 2 && dy < btn.height / 2;

        // Store original size if not stored yet
        if (!btn.instVars.originalWidth) {
            btn.instVars.originalWidth = btn.width;
            btn.instVars.originalHeight = btn.height;
            btn.instVars.wasHovering = false;
        }

        // Hover effect
        if (isHovering) {
            // Play beep sound only when hover starts
            if (!btn.instVars.wasHovering) {
                runtime.callFunction("playAudio", "beep", 0, 10);
                btn.instVars.wasHovering = true;
            }

            const targetScale = 1.05;
            const targetWidth = btn.instVars.originalWidth * targetScale;
            const targetHeight = btn.instVars.originalHeight * targetScale;

            if (btn.behaviors?.Tween) {
                btn.behaviors.Tween.startTween("width", targetWidth, 0.15, "easeoutquad");
                btn.behaviors.Tween.startTween("height", targetHeight, 0.15, "easeoutquad");
            }
        } else {
            btn.instVars.wasHovering = false;
            // Reset to original size
            if (btn.behaviors?.Tween) {
                btn.behaviors.Tween.startTween("width", btn.instVars.originalWidth, 0.15, "easeoutquad");
                btn.behaviors.Tween.startTween("height", btn.instVars.originalHeight, 0.15, "easeoutquad");
            }
        }
    }
}

// Handle click during level up
export function handleLevelUpClick(e) {
    const runtime = getRuntime();
    const layer = runtime.layout.getLayer("LevelUpUI");
    const [layerX, layerY] = layer.cssPxToLayer(e.clientX, e.clientY);

    console.log("[LevelUpManager] Click at:", layerX, layerY);

    // Check if stats window is open and handle its clicks
    if (StatsDisplay.isWindowOpen()) {
        console.log("[LevelUpManager] Stats window is open, forwarding click");
        StatsDisplay.handleStatsWindowClick(e);
        return;
    }

    // Check all buttons (UpgradeButton and StatsButton)
    const allButtons = [
        ...(runtime.objects.UpgradeButton?.getAllInstances() || []),
        ...(runtime.objects.StatsButton?.getAllInstances() || [])
    ];

    console.log("[LevelUpManager] Found", allButtons.length, "buttons to check");

    for (const btn of allButtons) {
        const dx = Math.abs(layerX - btn.x);
        const dy = Math.abs(layerY - btn.y);

        console.log(`[LevelUpManager] Button at (${btn.x}, ${btn.y}), size: ${btn.width}x${btn.height}, type: ${btn.instVars?.upgradeType}, distance: (${dx}, ${dy})`);

        if (dx < btn.width / 2 && dy < btn.height / 2) {
            console.log("[LevelUpManager] Button clicked! Type:", btn.instVars?.upgradeType);

            // Check button type
            if (btn.instVars.upgradeType === "stats") {
                // Stats button clicked
                console.log("[LevelUpManager] Opening stats window...");
                StatsDisplay.openStatsWindow();
                return;
            } else if (btn.instVars.upgradeType === "weapon") {
                // Play confirm sound
                runtime.callFunction("playAudio", "confirm", 0, 10);
                // Weapon upgrade
                console.log("[LevelUpManager] Weapon upgrade:", btn.instVars.weaponId);
                WeaponSystem.acquireWeapon(btn.instVars.weaponId);
                closeLevelUpPanel();
                return;
            } else if (btn.instVars.upgradeType === "tome") {
                // Play confirm sound
                runtime.callFunction("playAudio", "confirm", 0, 10);
                // Tome upgrade
                console.log("[LevelUpManager] Tome upgrade:", btn.instVars.weaponId);
                TomeSystem.acquireTome(btn.instVars.weaponId);  // weaponId contains tomeId
                closeLevelUpPanel();
                return;
            }
        }
    }

    console.log("[LevelUpManager] No button was clicked");
}

// Close level up panel
export function closeLevelUpPanel() {
    state.isLevelingUp = false;

    const runtime = getRuntime();

    // Close stats window if open
    if (StatsDisplay.isWindowOpen()) {
        StatsDisplay.closeStatsWindow();
    }

    // Hide layer
    const layer = runtime.layout.getLayer("LevelUpUI");
    if (layer) {
        layer.isVisible = false;
    }

    // Destroy panel and buttons
    const panel = runtime.objects.LevelUpPanel?.getFirstInstance();
    if (panel) panel.destroy();

    const buttons = runtime.objects.UpgradeButton?.getAllInstances() || [];
    for (const btn of buttons) btn.destroy();

    const texts = runtime.objects.UpgradeText?.getAllInstances() || [];
    for (const txt of texts) txt.destroy();

    // Destroy stats button (check both dedicated object and fallback UpgradeButtons with stats type)
    const statsBtns = runtime.objects.StatsButton?.getAllInstances() || [];
    for (const btn of statsBtns) btn.destroy();

    const statsBtnTexts = runtime.objects.StatsBtnText?.getAllInstances() || [];
    for (const txt of statsBtnTexts) txt.destroy();

    // Also destroy any UpgradeButtons that were used as stats buttons
    const remainingUpgradeBtns = runtime.objects.UpgradeButton?.getAllInstances() || [];
    for (const btn of remainingUpgradeBtns) {
        if (btn.instVars?.upgradeType === "stats") {
            btn.destroy();
        }
    }

    // Destroy icons ONLY on LevelUpUI layer (not UI layer where weaponEquipped icons are)
    const tomeIcons = runtime.objects.Tomes?.getAllInstances() || [];
    for (const icon of tomeIcons) {
        if (icon.layer && icon.layer.name === "LevelUpUI") {
            icon.destroy();
        }
    }

    const weaponIcons = runtime.objects.Weapons?.getAllInstances() || [];
    for (const icon of weaponIcons) {
        if (icon.layer && icon.layer.name === "LevelUpUI") {
            icon.destroy();
        }
    }

    // Reset XP bar
    UIManager.updateExpBar();

    console.log("[LevelUpManager] Panel closed");
}

console.log("[LevelUpManager] Module loaded!");
