// ============================================
// LOBBY MANAGER - Lobby screen logic
// ============================================

import * as SaveManager from "./SaveManager.js";
import { ITEMS, getAllItemIds, getItemData } from "./ItemSystem.js";
import { getAllWeaponIds, getWeaponData } from "./WeaponData.js";
import * as HeroData from "./HeroData.js";

let runtime = null;
let createdSlots = [];  // Track created slot sprites
let createdIcons = [];  // Track created icons (with id stored)
let activeTooltip = null;   // Current tooltip instance
let activeTooltipBg = null; // Tooltip background
let currentTab = "items";  // Current active tab: "characters", "weapons", "items"

// Grid settings for display
const GRID_SPACING = 128;
const GRID_COLUMNS = 7;
const SLOT_SIZE = 128;
const ICON_SIZE = 80;  // Slightly smaller than slot
const CHARACTER_ICON_SIZE = 100;  // Slightly bigger for characters

// Character list (matching characterPortraits animations and HeroData)
const CHARACTERS = [
    { id: "archer", name: "Archer", animation: "archer", description: "Fast & fragile. +25% Speed", price: 0 },
    { id: "cowboy", name: "Cowboy", animation: "cowboy", description: "Crit master. 3x Crit damage!", price: 500 },
    { id: "vampire", name: "Vampire", animation: "vampire", description: "Lifesteal. +1 HP per hit", price: 1000 },
    { id: "sniper", name: "Sniper", animation: "sniper", description: "High damage. +50% Damage", price: 1500 },
    { id: "mage", name: "Mage", animation: "mage", description: "Fire mage. +10% Attack Speed", price: 2000 },
    { id: "skeleton", name: "Skeleton", animation: "skeleton", description: "Undead. +15% XP Gain", price: 2500 },
    { id: "paladin", name: "Paladin", animation: "paladin", description: "Tank. +50% Max Health", price: 2500 },
    { id: "viking", name: "Viking", animation: "viking", description: "Brutal. +30% Weapon Damage", price: 3000 }
];

// Track currently previewed character (may be locked)
let previewedCharacterId = null;

// Track if buy button is being processed
let isBuyButtonProcessing = false;

// Track G key state
let gKeyPressed = false;

// Track weapon purchase screen state
let weaponPurchaseScreenActive = false;
let weaponPurchaseObjects = [];
let selectedWeaponForPurchase = null;

// Default weapon price
const DEFAULT_WEAPON_PRICE = 1250;

// Track equipped weapon icons in lobby slots
let equippedWeaponIcons = [];

// Initialize lobby
export function init(runtimeInstance) {
    runtime = runtimeInstance;

    // Update UI with saved data
    updateLobbyUI();

    // Apply saved hero selection to Player animation
    applySavedHeroSelection();

    // Initialize purchase UI based on selected hero
    const savedHeroId = SaveManager.getSelectedHeroId();
    const isUnlocked = SaveManager.isHeroUnlocked(savedHeroId);
    updatePurchaseUI(savedHeroId, isUnlocked);

    // Ensure default weapon is equipped
    ensureDefaultWeaponEquipped();

    // Update equipped weapon display (4 slots at top)
    updateEquippedWeaponDisplay();

    // Set default tab to characters
    switchTab("characters");

    console.log("[LobbyManager] Lobby initialized!");
}

// Handle keyboard input in lobby (called every tick)
export function handleLobbyKeyboard() {
    if (!runtime || !runtime.keyboard) return;

    // G key - Add 1000 gold (dev feature)
    if (runtime.keyboard.isKeyDown("KeyG")) {
        if (!gKeyPressed) {
            gKeyPressed = true;
            SaveManager.addGold(1000);
            updateLobbyUI();
            console.log("[LobbyManager] Added 1000 gold! Total:", SaveManager.getGold());
        }
    } else {
        gKeyPressed = false;
    }
}

// Apply saved hero selection to Player sprite
function applySavedHeroSelection() {
    if (!runtime) return;

    const savedHeroId = SaveManager.getSelectedHeroId();
    const player = runtime.objects.Player?.getFirstInstance();

    if (player && savedHeroId) {
        const animationName = savedHeroId + "Idle";
        try {
            player.setAnimation(animationName);
            console.log("[LobbyManager] Applied saved hero:", savedHeroId, "-> animation:", animationName);
        } catch (e) {
            console.warn("[LobbyManager] Animation not found for saved hero:", animationName);
        }
    }
}

// Ensure default weapon is equipped
function ensureDefaultWeaponEquipped() {
    const selectedHeroId = SaveManager.getSelectedHeroId();
    const defaultWeapon = HeroData.getDefaultWeapon(selectedHeroId);
    let equippedWeapons = SaveManager.getEquippedWeaponsLobby();

    // Get all heroes' default weapons
    const allDefaultWeapons = CHARACTERS.map(char => HeroData.getDefaultWeapon(char.id));

    // Remove all default weapons except current hero's (unless owned)
    equippedWeapons = equippedWeapons.filter(weaponId => {
        // Keep if it's owned
        if (SaveManager.isWeaponUnlocked(weaponId)) return true;
        // Keep if it's current hero's default
        if (weaponId === defaultWeapon) return true;
        // Keep if it's lightning_staff (everyone has it)
        if (weaponId === "lightning_staff") return true;
        // Remove if it's another hero's default weapon
        if (allDefaultWeapons.includes(weaponId)) return false;
        // Keep everything else
        return true;
    });

    // Add current hero's default weapon if not already equipped
    if (!equippedWeapons.includes(defaultWeapon)) {
        equippedWeapons.unshift(defaultWeapon);
    }

    // Keep max 4
    if (equippedWeapons.length > 4) {
        equippedWeapons = equippedWeapons.slice(0, 4);
    }

    SaveManager.setEquippedWeaponsLobby(equippedWeapons);
    console.log("[LobbyManager] Ensured equipped weapons:", equippedWeapons);
}

// Store the original 4 equipped slots (found on first init)
let originalEquippedSlots = [];

// Update equipped weapon display in the 4 fixed slots
function updateEquippedWeaponDisplay() {
    if (!runtime) return;

    // Clear old equipped weapon icons
    for (const iconData of equippedWeaponIcons) {
        try {
            if (iconData.sprite && iconData.sprite.runtime) iconData.sprite.destroy();
        } catch (e) { }
    }
    equippedWeaponIcons = [];

    // Get equipped weapons from save
    const equippedWeapons = SaveManager.getEquippedWeaponsLobby();

    // Find the original 4 equipped slots (by lowest UIDs - they were placed in layout)
    if (originalEquippedSlots.length === 0) {
        const allSlots = runtime.objects.weaponEquipped?.getAllInstances() || [];
        // Sort by UID (lowest = created first in layout)
        const sortedSlots = allSlots.sort((a, b) => a.uid - b.uid);
        // Take first 4
        originalEquippedSlots = sortedSlots.slice(0, 4);
        console.log("[LobbyManager] Found", originalEquippedSlots.length, "original equipped slots");
    }

    // Create weapon icons on the original slots
    for (let i = 0; i < Math.min(equippedWeapons.length, originalEquippedSlots.length); i++) {
        const slot = originalEquippedSlots[i];
        if (!slot || !slot.runtime) continue;

        const weaponId = equippedWeapons[i];
        if (weaponId) {
            // Create weapon icon on the slot
            const icon = runtime.objects.Weapons?.createInstance("UI", slot.x, slot.y);
            if (icon) {
                icon.width = slot.width * 0.8;
                icon.height = slot.height * 0.8;
                icon.zElevation = 10;
                try {
                    icon.setAnimation(weaponId);
                } catch (e) {
                    console.warn("[LobbyManager] No animation for equipped weapon:", weaponId);
                }
                equippedWeaponIcons.push({ sprite: icon, id: weaponId, type: "weapon" });
            }
        }
    }

    console.log("[LobbyManager] Updated equipped weapon display:", equippedWeapons);
}

// Reset original slots (called when leaving lobby)
export function resetOriginalSlots() {
    originalEquippedSlots = [];
    equippedWeaponIcons = [];
}

// Switch between tabs
function switchTab(tabName) {
    if (!runtime) return;

    // Play tab switch sound
    runtime.callFunction("playAudio", "Pickup6", 0, 10);

    currentTab = tabName;
    console.log("[LobbyManager] Switching to tab:", tabName);

    // Update activetab visibility
    const activeTabs = runtime.objects.activetab?.getAllInstances() || [];
    for (const tab of activeTabs) {
        const tabSlot = tab.instVars?.slot;
        if (tabSlot === "characters") {
            tab.isVisible = (tabName === "characters");
        } else if (tabSlot === "weapons") {
            tab.isVisible = (tabName === "weapons");
        } else if (tabSlot === "items") {
            tab.isVisible = (tabName === "items");
        }
    }

    // Clear current grid and create new one
    clearGrid();

    if (tabName === "characters") {
        createCharacterGrid();
    } else if (tabName === "weapons") {
        createWeaponGrid();
    } else if (tabName === "items") {
        createItemGrid();
    }
}

// Update all lobby UI elements
export function updateLobbyUI() {
    if (!runtime) return;

    const saveData = SaveManager.getSaveData();
    console.log("[LobbyManager] Save data gold:", saveData.gold);

    // Update level text
    const levelText = runtime.objects.LevelTextLobby?.getFirstInstance();
    if (levelText) {
        levelText.text = `Level ${saveData.currentLevel}`;
    }

    // Update gold text (all instances)
    const goldTexts = runtime.objects.GoldText?.getAllInstances() || [];
    for (const goldText of goldTexts) {
        goldText.text = formatNumber(saveData.gold);
    }
    console.log("[LobbyManager] GoldText updated to:", formatNumber(saveData.gold), "(" + goldTexts.length + " instances)");
}

// Format large numbers (1000 -> 1K, etc.)
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + "M";
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
}

// Get grid start position from slotbg
function getGridStartPosition() {
    const slotbg = runtime.objects.slotbg?.getFirstInstance();
    if (!slotbg) {
        console.warn("[LobbyManager] slotbg not found for positioning");
        return { x: 156, y: 896 };  // Fallback
    }
    return {
        x: slotbg.getImagePointX("Image Point 1"),
        y: slotbg.getImagePointY("Image Point 1")
    };
}

// Clear current grid
function clearGrid() {
    // Destroy tracked sprites (only the ones we created for grid)
    for (const slot of createdSlots) {
        try {
            if (slot && slot.runtime) slot.destroy();
        } catch (e) { }
    }
    createdSlots = [];

    for (const iconData of createdIcons) {
        try {
            if (iconData.sprite && iconData.sprite.runtime) iconData.sprite.destroy();
        } catch (e) { }
    }
    createdIcons = [];

    // Destroy dynamically created Items/Weapons/Portraits (but NOT weaponEquipped with slot variable)
    const existingItems = runtime.objects.Items?.getAllInstances() || [];
    for (const item of existingItems) {
        try { item.destroy(); } catch (e) { }
    }

    const existingWeapons = runtime.objects.Weapons?.getAllInstances() || [];
    for (const weapon of existingWeapons) {
        // Don't destroy weapons that are in equippedWeaponIcons
        const isEquipped = equippedWeaponIcons.some(iconData => iconData.sprite === weapon);
        if (!isEquipped) {
            try { weapon.destroy(); } catch (e) { }
        }
    }

    const existingPortraits = runtime.objects.characterPortraits?.getAllInstances() || [];
    for (const portrait of existingPortraits) {
        try { portrait.destroy(); } catch (e) { }
    }

    hideTooltip();
}

// Create CHARACTER grid
function createCharacterGrid() {
    if (!runtime) return;

    const { x: startX, y: startY } = getGridStartPosition();
    const selectedHeroId = SaveManager.getSelectedHeroId();
    console.log("[LobbyManager] Creating character grid, selected:", selectedHeroId);

    for (let i = 0; i < CHARACTERS.length; i++) {
        const col = i % GRID_COLUMNS;
        const row = Math.floor(i / GRID_COLUMNS);

        const x = startX + (col * GRID_SPACING);
        const y = startY + (row * GRID_SPACING);

        const character = CHARACTERS[i];
        const isSelected = (character.id === selectedHeroId);

        // Create slot background
        const slot = runtime.objects.weaponEquipped?.createInstance("UI", x, y);
        if (slot) {
            slot.width = SLOT_SIZE;
            slot.height = SLOT_SIZE;
            slot.zElevation = 0;
            slot.opacity = isSelected ? 1.0 : 0.7;
            createdSlots.push(slot);
        }

        // Create character portrait icon
        const icon = runtime.objects.characterPortraits?.createInstance("UI", x, y);
        if (icon) {
            icon.width = CHARACTER_ICON_SIZE;
            icon.height = CHARACTER_ICON_SIZE;
            // Set higher z elevation so it appears above slot
            icon.zElevation = 10;
            icon.opacity = isSelected ? 1.0 : 0.7;
            try {
                icon.setAnimation(character.animation);
            } catch (e) {
                console.warn("[LobbyManager] No animation for character:", character.animation);
            }
            createdIcons.push({ sprite: icon, id: character.id, type: "character" });

            // Add lock icon if character is locked
            const isUnlocked = SaveManager.isHeroUnlocked(character.id);
            if (!isUnlocked) {
                const lockIcon = runtime.objects.lock?.createInstance("UI", x, y);
                if (lockIcon) {
                    lockIcon.width = ICON_SIZE * 0.7;
                    lockIcon.zElevation = 15;
                    createdIcons.push({ sprite: lockIcon, id: character.id + "_lock", type: "lock" });
                }
            }
        }
    }

    console.log("[LobbyManager] Created", CHARACTERS.length, "character slots");
}

// Create WEAPON grid
function createWeaponGrid() {
    if (!runtime) return;

    const { x: startX, y: startY } = getGridStartPosition();
    const weaponIds = getAllWeaponIds();

    // Get selected hero's default weapon
    const selectedHeroId = SaveManager.getSelectedHeroId();
    const defaultWeapon = HeroData.getDefaultWeapon(selectedHeroId);
    const equippedWeapons = SaveManager.getEquippedWeaponsLobby();
    console.log("[LobbyManager] Creating weapon grid, default weapon:", defaultWeapon);

    for (let i = 0; i < weaponIds.length; i++) {
        const col = i % GRID_COLUMNS;
        const row = Math.floor(i / GRID_COLUMNS);

        const x = startX + (col * GRID_SPACING);
        const y = startY + (row * GRID_SPACING);

        const weaponId = weaponIds[i];
        const weaponData = getWeaponData(weaponId);

        // Check if weapon is available (owned OR default weapon of current hero OR lightning_staff)
        const isOwned = SaveManager.isWeaponUnlocked(weaponId);
        const isDefaultWeapon = (weaponId === defaultWeapon);
        const isLightningStaff = (weaponId === "lightning_staff");
        const isAvailable = isOwned || isDefaultWeapon || isLightningStaff;
        const isEquipped = equippedWeapons.includes(weaponId);

        // Create slot background
        const slot = runtime.objects.weaponEquipped?.createInstance("UI", x, y);
        if (slot) {
            slot.width = SLOT_SIZE;
            slot.height = SLOT_SIZE;
            slot.zElevation = 0;
            slot.opacity = isEquipped ? 1.0 : (isAvailable ? 1.0 : 0.7);
            createdSlots.push(slot);
        }

        // Create weapon icon
        const icon = runtime.objects.Weapons?.createInstance("UI", x, y);
        if (icon) {
            icon.width = ICON_SIZE;
            icon.height = ICON_SIZE;
            icon.zElevation = 10;
            icon.opacity = isEquipped ? 1.0 : (isAvailable ? 1.0 : 0.7);
            // Use weaponId directly - it matches Weapons sprite animation names
            try {
                icon.setAnimation(weaponId);
            } catch (e) {
                console.warn("[LobbyManager] No animation for weapon:", weaponId);
            }
            createdIcons.push({ sprite: icon, id: weaponId, type: "weapon" });

            // Add lock icon if weapon is locked (not available)
            if (!isAvailable) {
                const lockIcon = runtime.objects.lock?.createInstance("UI", x, y);
                if (lockIcon) {
                    lockIcon.width = ICON_SIZE * 0.7;
                    lockIcon.zElevation = 15;
                    createdIcons.push({ sprite: lockIcon, id: weaponId + "_lock", type: "lock" });
                }
            }
        }
    }

    console.log("[LobbyManager] Created", weaponIds.length, "weapon slots");
}

// Create ITEM grid
function createItemGrid() {
    if (!runtime) return;

    const { x: startX, y: startY } = getGridStartPosition();
    const itemIds = getAllItemIds();

    console.log("[LobbyManager] Creating item grid with", itemIds.length, "items");

    for (let i = 0; i < itemIds.length; i++) {
        const col = i % GRID_COLUMNS;
        const row = Math.floor(i / GRID_COLUMNS);

        const x = startX + (col * GRID_SPACING);
        const y = startY + (row * GRID_SPACING);

        const itemId = itemIds[i];

        // Create slot background
        const slot = runtime.objects.weaponEquipped?.createInstance("UI", x, y);
        if (slot) {
            slot.width = SLOT_SIZE;
            slot.height = SLOT_SIZE;
            slot.zElevation = 0;
            createdSlots.push(slot);
        }

        // Create item icon
        const icon = runtime.objects.Items?.createInstance("UI", x, y);
        if (icon) {
            icon.width = ICON_SIZE;
            icon.height = ICON_SIZE;
            icon.zElevation = 10;
            try {
                icon.setAnimation(itemId);
            } catch (e) {
                console.warn("[LobbyManager] No animation for item:", itemId);
            }
            createdIcons.push({ sprite: icon, id: itemId, type: "item" });
        }
    }

    console.log("[LobbyManager] Created", itemIds.length, "item slots");
}

// Current hovered id to prevent re-creating tooltip
let currentHoveredId = null;

// Viewport dimensions
const VIEWPORT_WIDTH = 1080;

// Show tooltip for any icon (item, weapon, or character)
function showTooltip(id, type, x, y) {
    if (!runtime) return;

    // Don't recreate if same item, but ensure it's on top
    if (currentHoveredId === id && activeTooltipBg && activeTooltipBg.isVisible) {
        activeTooltipBg.zElevation = 50;
        activeTooltipBg.moveToTop();
        if (activeTooltip) {
            activeTooltip.zElevation = 51;
            activeTooltip.moveToTop();
        }
        return;
    }

    // Get data based on type
    let name = "";
    let description = "";

    if (type === "item") {
        const itemData = getItemData(id);
        if (!itemData) return;
        name = itemData.name;
        description = itemData.description;
    } else if (type === "weapon") {
        const weaponData = getWeaponData(id);
        if (!weaponData) return;
        name = weaponData.name;
        description = weaponData.description || "";
    } else if (type === "character") {
        const character = CHARACTERS.find(c => c.id === id);
        if (!character) return;
        name = character.name;
        description = character.description || "Click to select";
    }

    currentHoveredId = id;

    // Play beep sound when tooltip appears
    runtime.callFunction("playAudio", "beep", 0, 10);

    // Calculate tooltip position - avoid going off screen
    let tooltipX = x;
    let tooltipY = y - 80;

    // If item is on the left edge, show tooltip to the right
    if (x < 300) {
        tooltipX = x + 150;
    }
    // If item is on the right edge, show tooltip to the left
    else if (x > VIEWPORT_WIDTH - 300) {
        tooltipX = x - 150;
    }

    // Find existing Tooltip instance in layout (don't create new one)
    activeTooltipBg = runtime.objects.ToolTip2?.getFirstInstance();
    if (!activeTooltipBg) {
        console.warn("[LobbyManager] ToolTip2 instance not found in layout");
        return;
    }

    // Position and show the tooltip
    activeTooltipBg.x = tooltipX;
    activeTooltipBg.y = tooltipY;
    activeTooltipBg.isVisible = true;
    activeTooltipBg.zElevation = 50;
    activeTooltipBg.moveToTop();
    console.log(`[LobbyManager] TooltipBG Pos: ${activeTooltipBg.x},${activeTooltipBg.y}`);

    // Find TooltipText instance
    activeTooltip = runtime.objects.TooltipText2?.getFirstInstance();
    if (activeTooltip) {
        activeTooltip.text = `${name}\n${description}`;
        activeTooltip.isVisible = true;
        activeTooltip.zElevation = 51;
        activeTooltip.moveToTop();
        console.log(`[LobbyManager] Showing tooltip at (${tooltipX}, ${tooltipY}) - Text: ${name}`);
    } else {
        console.warn("[LobbyManager] TooltipText2 instance not found!");
    }
}

// Hide tooltip
function hideTooltip() {
    currentHoveredId = null;

    if (activeTooltipBg) {
        try {
            activeTooltipBg.isVisible = false;
        } catch (e) { }
    }
    if (activeTooltip) {
        try {
            activeTooltip.isVisible = false;
        } catch (e) { }
    }
}

// Check if mobile (narrow screen)
function isMobile() {
    return window.innerWidth < 800;
}

// Handle pointer move for tooltip (desktop only)
export function handlePointerMove(e) {
    if (!runtime) return;

    // On mobile, tooltips are shown on click, not hover
    if (isMobile()) return;

    const layer = runtime.layout.getLayer("UI");
    if (!layer) return;

    const [layerX, layerY] = layer.cssPxToLayer(e.clientX, e.clientY);

    // Check if hovering over any icon
    let found = false;

    // Helper to check list
    const checkList = (list) => {
        for (const iconData of list) {
            if (!iconData.sprite || !iconData.sprite.runtime) continue;

            if (isPointInSprite(layerX, layerY, iconData.sprite)) {
                // Only log if it's a new hover to avoid spam
                if (currentHoveredId !== iconData.id) {
                    console.log("[LobbyManager] Hover detected on:", iconData.id, "Type:", iconData.type);
                }
                showTooltip(iconData.id, iconData.type, iconData.sprite.x, iconData.sprite.y);
                return true;
            }
        }
        return false;
    };

    // Check both lists
    if (checkList(createdIcons) || checkList(equippedWeaponIcons)) {
        found = true;
    }

    if (!found && currentHoveredId) {
        console.log("[LobbyManager] Hover lost, hiding tooltip");
        hideTooltip();
    }
}

// Handle icon tap (for tooltip on mobile, or character selection)
function handleIconTap(layerX, layerY) {
    // If weapon purchase screen is active, ignore grid taps (allow buy button click)
    if (weaponPurchaseScreenActive) return false;

    // Check if tapping on equipped weapon icons (to unequip) - PRIORITY CHECK
    for (const iconData of equippedWeaponIcons) {
        if (!iconData.sprite || !iconData.sprite.runtime) continue;

        if (isPointInSprite(layerX, layerY, iconData.sprite)) {
            // Unequip the weapon
            handleWeaponUnequip(iconData.id);
            return true;
        }
    }

    // Check if tapping on grid icons (characters, weapons in grid)
    // Note: equippedWeaponIcons removed from here to avoid conflict
    const allIcons = [...createdIcons];
    for (const iconData of allIcons) {
        if (!iconData.sprite || !iconData.sprite.runtime) continue;

        if (isPointInSprite(layerX, layerY, iconData.sprite)) {
            // Character selection - change Player animation
            if (iconData.type === "character") {
                previewCharacter(iconData.id);
                return true;
            }

            // For items and weapons, show tooltip on tap (mobile or desktop)
            if (currentHoveredId === iconData.id && activeTooltipBg && activeTooltipBg.isVisible) {
                hideTooltip();
            } else {
                console.log("[LobbyManager] Tap detected on:", iconData.id);
                showTooltip(iconData.id, iconData.type, iconData.sprite.x, iconData.sprite.y);
            }

            // Handle weapon equipping from grid
            if (iconData.type === "weapon") {
                handleWeaponEquipFromGrid(iconData.id);
            }

            return true;
        }
    }

    // Tapped elsewhere - hide tooltip
    if (activeTooltipBg && activeTooltipBg.isVisible) {
        hideTooltip();
    }

    return false;
}

// Handle weapon equip from grid
function handleWeaponEquipFromGrid(weaponId) {
    const selectedHeroId = SaveManager.getSelectedHeroId();
    const defaultWeapon = HeroData.getDefaultWeapon(selectedHeroId);
    const isOwned = SaveManager.isWeaponUnlocked(weaponId);
    const isDefaultWeapon = (weaponId === defaultWeapon);
    const isLightningStaff = (weaponId === "lightning_staff");

    // Can only equip if owned OR is current hero's default weapon OR lightning_staff
    if (!isOwned && !isDefaultWeapon && !isLightningStaff) {
        console.log("[LobbyManager] Weapon is locked, showing purchase screen:", weaponId);
        showWeaponPurchaseScreen(weaponId);
        return;
    }

    // Try to add to equipped weapons
    const success = SaveManager.addEquippedWeapon(weaponId);
    if (success) {
        console.log("[LobbyManager] Equipped weapon:", weaponId);
        updateEquippedWeaponDisplay();
        // Refresh weapon grid to update opacity
        if (currentTab === "weapons") {
            clearGrid();
            createWeaponGrid();
        }
    } else {
        console.log("[LobbyManager] Cannot equip - already equipped or slots full");
    }
}

// Handle weapon unequip from equipped slots
function handleWeaponUnequip(weaponId) {
    console.log("[LobbyManager] Attempting to unequip weapon:", weaponId);

    // Check if it's the current hero's default weapon
    const selectedHeroId = SaveManager.getSelectedHeroId();
    const defaultWeapon = HeroData.getDefaultWeapon(selectedHeroId);

    if (weaponId === defaultWeapon) {
        console.log("[LobbyManager] Cannot unequip default weapon:", weaponId);
        return;
    }

    const success = SaveManager.removeEquippedWeapon(weaponId);
    if (success) {
        console.log("[LobbyManager] Unequipped weapon:", weaponId);
        updateEquippedWeaponDisplay();
        // Refresh weapon grid to update opacity
        if (currentTab === "weapons") {
            clearGrid();
            createWeaponGrid();
        }
    } else {
        console.log("[LobbyManager] Failed to unequip weapon:", weaponId);
    }
}

// Show weapon purchase screen
function showWeaponPurchaseScreen(weaponId) {
    if (!runtime) return;

    weaponPurchaseScreenActive = true;
    selectedWeaponForPurchase = weaponId;

    // Clear grid
    clearGrid();

    const weaponData = getWeaponData(weaponId);
    if (!weaponData) return;

    // Get slotbg position as center
    const slotbg = runtime.objects.slotbg?.getFirstInstance();
    if (!slotbg) {
        console.warn("[LobbyManager] slotbg not found!");
        return;
    }

    const centerX = slotbg.x;
    const centerY = slotbg.y;

    // Create large weapon slot background
    const slot = runtime.objects.weaponEquipped?.createInstance("UI", centerX, centerY - 150);
    if (slot) {
        slot.width = 150;
        slot.height = 150;
        slot.zElevation = 20;
        weaponPurchaseObjects.push(slot);
    }

    // Create large weapon icon
    const icon = runtime.objects.Weapons?.createInstance("UI", centerX, centerY - 150);
    if (icon) {
        icon.width = 120;
        icon.height = 120;
        icon.zElevation = 25;
        try {
            icon.setAnimation(weaponId);
        } catch (e) {
            console.warn("[LobbyManager] No animation for weapon:", weaponId);
        }
        weaponPurchaseObjects.push(icon);
    }

    // Create buy text
    const buyText = runtime.objects.buyText?.createInstance("UI", centerX, centerY + 10);
    if (buyText) {
        buyText.text = `Do you want to purchase ${weaponData.name}?`;
        buyText.zElevation = 20;
        weaponPurchaseObjects.push(buyText);
    }

    // Create close button (top-right corner)
    const closeButton = runtime.objects.close?.createInstance("UI", centerX + 300, centerY - 200);
    if (closeButton) {
        closeButton.width = 50;
        closeButton.zElevation = 20;
        weaponPurchaseObjects.push(closeButton);
    }

    // Create gold icon
    const goldIcon = runtime.objects.lootGold?.createInstance("UI", centerX - 80, centerY + 100);
    if (goldIcon) {
        goldIcon.width = 40;
        goldIcon.height = 40;
        goldIcon.zElevation = 20;
        weaponPurchaseObjects.push(goldIcon);
    }

    // Create price text
    const priceText = runtime.objects.priceText?.createInstance("UI", centerX + 40, centerY + 100);
    if (priceText) {
        priceText.text = DEFAULT_WEAPON_PRICE.toString();
        priceText.zElevation = 20;
        weaponPurchaseObjects.push(priceText);
    }

    // Create buy button
    const buyButton = runtime.objects.buyButton?.createInstance("UI", centerX, centerY + 200);
    if (buyButton) {
        buyButton.zElevation = 20;
        buyButton.isVisible = true;
        weaponPurchaseObjects.push(buyButton);
    }

    console.log("[LobbyManager] Weapon purchase screen shown for:", weaponId);
}

// Close weapon purchase screen
function closeWeaponPurchaseScreen() {
    weaponPurchaseScreenActive = false;
    selectedWeaponForPurchase = null;

    // Destroy all purchase screen objects
    for (const obj of weaponPurchaseObjects) {
        try {
            if (obj && obj.runtime) obj.destroy();
        } catch (e) { }
    }
    weaponPurchaseObjects = [];

    // Recreate weapon grid
    if (currentTab === "weapons") {
        createWeaponGrid();
    }
}

// Handle weapon purchase
function handleWeaponPurchase() {
    if (!selectedWeaponForPurchase) return;

    const currentGold = SaveManager.getGold();
    const price = DEFAULT_WEAPON_PRICE;

    if (currentGold >= price) {
        // Purchase successful
        SaveManager.spendGold(price);
        SaveManager.unlockWeapon(selectedWeaponForPurchase);

        // Auto-equip the purchased weapon
        SaveManager.addEquippedWeapon(selectedWeaponForPurchase);

        // Update UI
        updateLobbyUI();
        updateEquippedWeaponDisplay();

        console.log("[LobbyManager] Purchased weapon:", selectedWeaponForPurchase);

        // Close purchase screen
        closeWeaponPurchaseScreen();
    } else {
        console.log("[LobbyManager] Not enough gold for weapon!");
    }
}

// Select a character and change Player animation
function selectCharacter(characterId) {
    if (!runtime) return;

    const player = runtime.objects.Player?.getFirstInstance();
    if (!player) return;

    // Save selection
    SaveManager.setSelectedHeroId(characterId);

    // Update equipped weapons (removes old default, adds new default)
    ensureDefaultWeaponEquipped();

    // Set animation to characterIdIdle (e.g., "paladinIdle", "vikingIdle")
    const animationName = characterId + "Idle";
    try {
        player.setAnimation(animationName);
        console.log("[LobbyManager] Selected character:", characterId, "-> animation:", animationName);
    } catch (e) {
        console.warn("[LobbyManager] Animation not found:", animationName);
    }

    // Update opacity for all character icons (selected = 100%, others = 70%)
    updateCharacterOpacity(characterId);

    // Update equipped weapon display (hero's default weapon changes)
    updateEquippedWeaponDisplay();

    // Refresh weapon grid to update opacity (default weapon changed)
    if (currentTab === "weapons") {
        clearGrid();
        createWeaponGrid();
    }
}

// Preview a character (show animation, check lock status)
function previewCharacter(characterId) {
    if (!runtime) return;

    previewedCharacterId = characterId;
    const isUnlocked = SaveManager.isHeroUnlocked(characterId);

    // Change player animation to preview
    const player = runtime.objects.Player?.getFirstInstance();
    if (player) {
        const animationName = characterId + "Idle";
        try {
            player.setAnimation(animationName);
        } catch (e) {
            console.warn("[LobbyManager] Animation not found:", animationName);
        }
    }

    // Update UI based on lock status
    updatePurchaseUI(characterId, isUnlocked);

    // Update visual highlight
    updateCharacterOpacity(characterId);

    // If unlocked, also save it as selected
    if (isUnlocked) {
        SaveManager.setSelectedHeroId(characterId);
        ensureDefaultWeaponEquipped();
        updateEquippedWeaponDisplay();
        console.log("[LobbyManager] Selected character:", characterId);
    }
}

// Update Purchase UI visibility and text
function updatePurchaseUI(characterId, isUnlocked) {
    const buyButton = runtime.objects.buyButton?.getFirstInstance();
    const priceText = runtime.objects.priceText?.getFirstInstance();
    const lootGold = runtime.objects.lootGold?.getAllInstances().find(i => i.uid === 93); // Specific gold icon

    if (isUnlocked) {
        // Hide purchase UI
        if (buyButton) buyButton.isVisible = false;
        if (priceText) priceText.isVisible = false;
        if (lootGold) lootGold.isVisible = false;
    } else {
        // Show purchase UI
        const charData = CHARACTERS.find(c => c.id === characterId);
        if (charData) {
            if (buyButton) buyButton.isVisible = true;
            if (lootGold) lootGold.isVisible = true;
            if (priceText) {
                priceText.isVisible = true;
                priceText.text = charData.price.toString();
            }
        }
    }
}

// Handle Buy Button Click
function handleBuyClick() {
    if (!previewedCharacterId) return;

    const charData = CHARACTERS.find(c => c.id === previewedCharacterId);
    if (!charData) return;

    const price = charData.price;
    const currentGold = SaveManager.getGold();

    if (currentGold >= price) {
        // Purchase successful
        SaveManager.spendGold(price);
        SaveManager.unlockHero(previewedCharacterId);

        // Update UI
        updateLobbyUI(); // Update gold display
        previewCharacter(previewedCharacterId); // Refresh state (will select and hide UI)

        // Refresh character grid to remove lock icon
        if (currentTab === "characters") {
            clearGrid();
            createCharacterGrid();
        }

        console.log("[LobbyManager] Purchased hero:", previewedCharacterId);
    } else {
        console.log("[LobbyManager] Not enough gold!");
        // Optional: Shake effect or red flash on price text could go here
    }
}

// Update character icon opacity based on selection
function updateCharacterOpacity(selectedId) {
    for (let i = 0; i < createdIcons.length; i++) {
        const iconData = createdIcons[i];
        if (iconData.type !== "character") continue;

        const isSelected = (iconData.id === selectedId);
        if (iconData.sprite && iconData.sprite.runtime) {
            iconData.sprite.opacity = isSelected ? 1.0 : 0.7;
        }
    }

    // Also update slot backgrounds
    for (let i = 0; i < createdSlots.length; i++) {
        const slot = createdSlots[i];
        if (!slot || !slot.runtime) continue;

        // Find matching icon for this slot index
        const iconData = createdIcons[i];
        if (iconData && iconData.type === "character") {
            const isSelected = (iconData.id === selectedId);
            slot.opacity = isSelected ? 1.0 : 0.7;
        }
    }
}

// Handle button clicks in lobby
export function handleLobbyClick(e) {
    if (!runtime) return;

    const layer = runtime.layout.getLayer("UI");
    const [layerX, layerY] = layer.cssPxToLayer(e.clientX, e.clientY);

    console.log("[LobbyManager] Click at layer coords:", layerX, layerY);

    // Check tab clicks - activetab objects
    const activeTabs = runtime.objects.activetab?.getAllInstances() || [];
    console.log("[LobbyManager] Found activetabs:", activeTabs.length);

    for (const tab of activeTabs) {
        console.log("[LobbyManager] activetab:", tab.instVars?.slot, "at", tab.x, tab.y, "size:", tab.width, "x", tab.height);
        if (isPointInSprite(layerX, layerY, tab)) {
            const tabSlot = tab.instVars?.slot;
            console.log("[LobbyManager] Clicked on activetab:", tabSlot);
            if (tabSlot) {
                switchTab(tabSlot);
                return;
            }
        }
    }

    // Check icon taps (characters, items, weapons)
    if (handleIconTap(layerX, layerY)) {
        return;
    }

    // Check Heroes button
    const heroesBtn = runtime.objects.HeroesButton?.getFirstInstance();
    if (heroesBtn && isPointInSprite(layerX, layerY, heroesBtn)) {
        console.log("[LobbyManager] Heroes button clicked!");
        goToHeroes();
        return;
    }

    // Check Settings button
    const settingsBtn = runtime.objects.buttonsettings?.getFirstInstance();
    if (settingsBtn && isPointInSprite(layerX, layerY, settingsBtn)) {
        runtime.callFunction("playAudio", "Pickup6", 0, 10);
        console.log("[LobbyManager] Settings button clicked!");
        return;
    }

    // Check Settings button 2
    const settingsBtn2 = runtime.objects.buttonsettings2?.getFirstInstance();
    if (settingsBtn2 && isPointInSprite(layerX, layerY, settingsBtn2)) {
        runtime.callFunction("playAudio", "confirm", 0, 10);
        console.log("[LobbyManager] Settings button 2 clicked!");
        return;
    }

    // Check Settings button 3
    const settingsBtn3 = runtime.objects.buttonsettings3?.getFirstInstance();
    if (settingsBtn3 && isPointInSprite(layerX, layerY, settingsBtn3)) {
        runtime.callFunction("playAudio", "confirm", 0, 10);
        console.log("[LobbyManager] Settings button 3 clicked!");
        return;
    }

    // Check Exit button
    const exitBtn = runtime.objects.exitbutton?.getFirstInstance();
    if (exitBtn && isPointInSprite(layerX, layerY, exitBtn)) {
        runtime.callFunction("playAudio", "confirm", 0, 10);
        console.log("[LobbyManager] Exit button clicked!");
        return;
    }

    // Check Yes button
    const yesBtn = runtime.objects.yes?.getFirstInstance();
    if (yesBtn && isPointInSprite(layerX, layerY, yesBtn)) {
        runtime.callFunction("playAudio", "confirm", 0, 10);
        console.log("[LobbyManager] Yes button clicked!");
        return;
    }

    // Check No button
    const noBtn = runtime.objects.no?.getFirstInstance();
    if (noBtn && isPointInSprite(layerX, layerY, noBtn)) {
        runtime.callFunction("playAudio", "confirm", 0, 10);
        console.log("[LobbyManager] No button clicked!");
        return;
    }

    // Check if weapon purchase screen is active
    if (weaponPurchaseScreenActive) {
        // Check close button
        const closeButton = runtime.objects.close?.getFirstInstance();
        if (closeButton && isPointInSprite(layerX, layerY, closeButton)) {
            console.log("[LobbyManager] Close button clicked!");
            closeWeaponPurchaseScreen();
            return;
        }
    }

    // Check Play button
    const playBtn = runtime.objects.PlayButton?.getFirstInstance();
    if (playBtn && isPointInSprite(layerX, layerY, playBtn)) {
        console.log("[LobbyManager] Play button clicked!");
        startGame();
        return;
    }

    // Check Buy button (for both character and weapon purchase)
    const buyButtons = runtime.objects.buyButton?.getAllInstances() || [];
    for (const buyButton of buyButtons) {
        if (buyButton && buyButton.isVisible && isPointInSprite(layerX, layerY, buyButton)) {
            // Prevent multiple clicks
            if (isBuyButtonProcessing) return;

            console.log("[LobbyManager] Buy button clicked! UID:", buyButton.uid);
            isBuyButtonProcessing = true;

            // Store original size
            const originalWidth = buyButton.width;
            const originalHeight = buyButton.height;

            // Tween effect - scale down slightly
            const tweenBehavior = buyButton.behaviors?.Tween;

            if (tweenBehavior) {
                try {
                    // Scale down
                    buyButton.width = originalWidth * 0.95;
                    buyButton.height = originalHeight * 0.95;

                    // Scale back up after 100ms
                    setTimeout(() => {
                        buyButton.width = originalWidth;
                        buyButton.height = originalHeight;

                        // Check if weapon purchase screen is active
                        if (weaponPurchaseScreenActive) {
                            handleWeaponPurchase();
                        } else {
                            handleBuyClick();
                        }

                        isBuyButtonProcessing = false;
                    }, 100);
                } catch (e) {
                    console.warn("[LobbyManager] Tween failed:", e);

                    // Check if weapon purchase screen is active
                    if (weaponPurchaseScreenActive) {
                        handleWeaponPurchase();
                    } else {
                        handleBuyClick();
                    }

                    isBuyButtonProcessing = false;
                }
            } else {
                // No tween, just manual scale
                buyButton.width = originalWidth * 0.95;
                buyButton.height = originalHeight * 0.95;

                setTimeout(() => {
                    buyButton.width = originalWidth;
                    buyButton.height = originalHeight;

                    // Check if weapon purchase screen is active
                    if (weaponPurchaseScreenActive) {
                        handleWeaponPurchase();
                    } else {
                        handleBuyClick();
                    }

                    isBuyButtonProcessing = false;
                }, 100);
            }
            return;
        }
    }
}

// Check if point is inside sprite bounds
function isPointInSprite(x, y, sprite) {
    const halfW = sprite.width / 2;
    const halfH = sprite.height / 2;

    return x >= sprite.x - halfW && x <= sprite.x + halfW &&
        y >= sprite.y - halfH && y <= sprite.y + halfH;
}

// Navigate to Heroes screen
function goToHeroes() {
    if (runtime) {
        setTimeout(() => {
            runtime.goToLayout("Heroes");
        }, 0);
    }
}

// Start the game
function startGame() {
    if (runtime) {
        // Play start game sound
        runtime.callFunction("playAudio", "confirm", 0, 10);

        setTimeout(() => {
            runtime.goToLayout("Game");
        }, 0);
    }
}

console.log("[LobbyManager] Module loaded!");
