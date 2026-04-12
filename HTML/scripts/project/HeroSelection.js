// ============================================
// HERO SELECTION - Heroes screen logic
// ============================================

import * as SaveManager from "./SaveManager.js";
import * as HeroData from "./HeroData.js";

let runtime = null;
let currentSelectedHeroId = null;

// Initialize heroes screen
export function init(runtimeInstance) {
    runtime = runtimeInstance;

    // Load currently selected hero
    currentSelectedHeroId = SaveManager.getSelectedHeroId();

    // Setup hero cards
    setupHeroCards();

    // Update display for selected hero
    updateHeroDisplay(currentSelectedHeroId);

    console.log("[HeroSelection] Heroes screen initialized!");
}

// Setup hero cards with lock overlays
function setupHeroCards() {
    if (!runtime) return;

    const heroCards = runtime.objects.HeroCard?.getAllInstances() || [];
    const lockOverlays = runtime.objects.LockOverlay?.getAllInstances() || [];
    const unlockedHeroes = SaveManager.getUnlockedHeroes();

    heroCards.forEach((card, index) => {
        const heroId = card.instVars?.heroId || `hero${index + 1}`;
        const hero = HeroData.getHero(heroId);
        const isUnlocked = unlockedHeroes.includes(heroId);

        // Show lock overlay for locked heroes
        if (lockOverlays[index]) {
            lockOverlays[index].isVisible = !isUnlocked;
            lockOverlays[index].x = card.x;
            lockOverlays[index].y = card.y;
        }
    });

    // Position selection frame on currently selected hero
    updateSelectionFrame();
}

// Update selection frame position
function updateSelectionFrame() {
    if (!runtime) return;

    const selectionFrame = runtime.objects.SelectionFrame?.getFirstInstance();
    const heroCards = runtime.objects.HeroCard?.getAllInstances() || [];

    if (selectionFrame) {
        // Find card for selected hero
        for (const card of heroCards) {
            if (card.instVars?.heroId === currentSelectedHeroId) {
                selectionFrame.x = card.x;
                selectionFrame.y = card.y;
                break;
            }
        }
    }
}

// Update hero display (preview, name, description, stats)
function updateHeroDisplay(heroId) {
    if (!runtime) return;

    const hero = HeroData.getHero(heroId);
    const isUnlocked = SaveManager.isHeroUnlocked(heroId);

    // Update player preview (using Player sprite instead of HeroPreview)
    const playerPreview = runtime.objects.Player?.getFirstInstance();
    if (playerPreview) {
        // Set color based on hero
        const color = hexToRgb(hero.color);
        if (color) {
            playerPreview.colorRgb = [color.r / 255, color.g / 255, color.b / 255];
        }
        // Could also change animation here if heroes have different animations
        // playerPreview.setAnimation(hero.id);
    }

    // Update hero name
    const nameText = runtime.objects.HeroNameText?.getFirstInstance();
    if (nameText) {
        nameText.text = hero.name.toUpperCase();
    }

    // Update description
    const descText = runtime.objects.HeroDescText?.getFirstInstance();
    if (descText) {
        if (isUnlocked) {
            descText.text = hero.description;
        } else {
            descText.text = `[LOCKED] Unlock for ${hero.unlockCost} Gold`;
        }
    }

    // Update weapon text
    const weaponText = runtime.objects.WeaponText?.getFirstInstance();
    if (weaponText) {
        weaponText.text = hero.weapon;
    }

    // Update ability text
    const abilityText = runtime.objects.AbilityText?.getFirstInstance();
    if (abilityText) {
        abilityText.text = hero.ability;
    }

    // Update confirm button text
    const confirmText = runtime.objects.ConfirmButtonText?.getFirstInstance();
    if (confirmText) {
        if (!isUnlocked) {
            confirmText.text = `UNLOCK (${hero.unlockCost}G)`;
        } else if (heroId === SaveManager.getSelectedHeroId()) {
            confirmText.text = "SELECTED";
        } else {
            confirmText.text = "SELECT";
        }
    }
}

// Convert hex color to RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// Handle clicks in hero selection screen
export function handleHeroSelectionClick(e) {
    if (!runtime) return;

    const layer = runtime.layout.getLayer("UI");
    if (!layer) return;

    const [layerX, layerY] = layer.cssPxToLayer(e.clientX, e.clientY);

    // Check back button
    const backBtn = runtime.objects.BackButton?.getFirstInstance();
    if (backBtn && isPointInSprite(layerX, layerY, backBtn)) {
        goBack();
        return;
    }

    // Check confirm button
    const confirmBtn = runtime.objects.ConfirmButton?.getFirstInstance();
    if (confirmBtn && isPointInSprite(layerX, layerY, confirmBtn)) {
        confirmSelection();
        return;
    }

    // Check hero cards
    const heroCards = runtime.objects.HeroCard?.getAllInstances() || [];
    for (const card of heroCards) {
        if (isPointInSprite(layerX, layerY, card)) {
            const heroId = card.instVars?.heroId;
            if (heroId) {
                selectHeroCard(heroId);
                return;
            }
        }
    }
}

// Select a hero card
function selectHeroCard(heroId) {
    currentSelectedHeroId = heroId;
    updateSelectionFrame();
    updateHeroDisplay(heroId);
}

// Confirm hero selection or unlock
function confirmSelection() {
    if (!currentSelectedHeroId) return;

    const isUnlocked = SaveManager.isHeroUnlocked(currentSelectedHeroId);
    const hero = HeroData.getHero(currentSelectedHeroId);

    if (!isUnlocked) {
        // Try to unlock hero
        if (SaveManager.spendGold(hero.unlockCost)) {
            SaveManager.unlockHero(currentSelectedHeroId);
            console.log("[HeroSelection] Unlocked hero:", currentSelectedHeroId);
            setupHeroCards();
            updateHeroDisplay(currentSelectedHeroId);
        } else {
            console.log("[HeroSelection] Not enough gold!");
            // Could show a message here
        }
    } else {
        // Select this hero
        SaveManager.setSelectedHeroId(currentSelectedHeroId);
        console.log("[HeroSelection] Selected hero:", currentSelectedHeroId);
        updateHeroDisplay(currentSelectedHeroId);
    }
}

// Go back to lobby
function goBack() {
    if (runtime) {
        setTimeout(() => {
            runtime.goToLayout("Lobby");
        }, 0);
    }
}

// Check if point is inside sprite bounds
function isPointInSprite(x, y, sprite) {
    const halfW = sprite.width / 2;
    const halfH = sprite.height / 2;

    return x >= sprite.x - halfW && x <= sprite.x + halfW &&
           y >= sprite.y - halfH && y <= sprite.y + halfH;
}

// Get currently selected hero ID (for game to use)
export function getSelectedHeroId() {
    return SaveManager.getSelectedHeroId();
}

console.log("[HeroSelection] Module loaded!");
