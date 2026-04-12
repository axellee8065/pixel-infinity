// ============================================
// SAVE MANAGER - LocalStorage persistence
// ============================================

const SAVE_KEY = "VSURVIVORS_SAVE";

// Default save data structure
const defaultSaveData = {
    selectedHeroId: "archer",
    unlockedHeroes: ["archer"],  // Only archer unlocked by default
    unlockedWeapons: [],  // Weapons unlocked by purchase (not including default weapons)
    equippedWeapons: ["lightning_staff"],  // Currently equipped weapons (max 4)
    gold: 0,
    currentLevel: 1,
    highScore: 0,
    totalKills: 0,
    totalPlayTime: 0
    // Weapons are NOT saved - they reset each run based on hero selection
};

// Current save data in memory
let saveData = null;

// Initialize save system - load or create default
export function init() {
    loadGame();
    console.log("[SaveManager] Initialized with data:", saveData);
}

// Load game data from LocalStorage
export function loadGame() {
    try {
        const saved = localStorage.getItem(SAVE_KEY);
        if (saved) {
            saveData = JSON.parse(saved);
            // Merge with defaults to handle new fields in updates
            saveData = { ...defaultSaveData, ...saveData };
        } else {
            saveData = { ...defaultSaveData };
        }
    } catch (e) {
        console.warn("[SaveManager] Failed to load save, using defaults:", e);
        saveData = { ...defaultSaveData };
    }
    return saveData;
}

// Save game data to LocalStorage
export function saveGame() {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
        console.log("[SaveManager] Game saved!");
        return true;
    } catch (e) {
        console.error("[SaveManager] Failed to save game:", e);
        return false;
    }
}

// Get current save data
export function getSaveData() {
    if (!saveData) loadGame();
    return saveData;
}

// Selected Hero
export function getSelectedHeroId() {
    return getSaveData().selectedHeroId;
}

export function setSelectedHeroId(heroId) {
    saveData.selectedHeroId = heroId;
    saveGame();
}

// Unlocked Heroes
export function getUnlockedHeroes() {
    return getSaveData().unlockedHeroes;
}

export function isHeroUnlocked(heroId) {
    return getUnlockedHeroes().includes(heroId);
}

export function unlockHero(heroId) {
    if (!isHeroUnlocked(heroId)) {
        saveData.unlockedHeroes.push(heroId);
        saveGame();
        return true;
    }
    return false;
}

// Unlocked Weapons
export function getUnlockedWeapons() {
    return getSaveData().unlockedWeapons || [];
}

export function isWeaponUnlocked(weaponId) {
    return getUnlockedWeapons().includes(weaponId);
}

export function unlockWeapon(weaponId) {
    if (!isWeaponUnlocked(weaponId)) {
        saveData.unlockedWeapons.push(weaponId);
        saveGame();
        return true;
    }
    return false;
}

// Equipped Weapons (in lobby)
export function getEquippedWeaponsLobby() {
    return getSaveData().equippedWeapons || [];
}

export function setEquippedWeaponsLobby(weapons) {
    saveData.equippedWeapons = weapons;
    saveGame();
}

export function addEquippedWeapon(weaponId) {
    const equipped = getEquippedWeaponsLobby();
    if (equipped.length < 4 && !equipped.includes(weaponId)) {
        equipped.push(weaponId);
        setEquippedWeaponsLobby(equipped);
        return true;
    }
    return false;
}

export function removeEquippedWeapon(weaponId) {
    const equipped = getEquippedWeaponsLobby();
    const index = equipped.indexOf(weaponId);
    if (index > -1) {
        equipped.splice(index, 1);
        setEquippedWeaponsLobby(equipped);
        return true;
    }
    return false;
}

// Gold
export function getGold() {
    return getSaveData().gold;
}

export function addGold(amount) {
    saveData.gold += amount;
    saveGame();
    return saveData.gold;
}

export function spendGold(amount) {
    if (saveData.gold >= amount) {
        saveData.gold -= amount;
        saveGame();
        return true;
    }
    return false;
}

// Level
export function getCurrentLevel() {
    return getSaveData().currentLevel;
}

export function setCurrentLevel(level) {
    saveData.currentLevel = level;
    saveGame();
}

// Stats
export function getHighScore() {
    return getSaveData().highScore;
}

export function updateHighScore(score) {
    if (score > saveData.highScore) {
        saveData.highScore = score;
        saveGame();
        return true;
    }
    return false;
}

export function addKills(kills) {
    saveData.totalKills += kills;
    saveGame();
}

export function addPlayTime(seconds) {
    saveData.totalPlayTime += seconds;
    saveGame();
}

// Reset save data (for testing or new game)
export function resetSave() {
    saveData = { ...defaultSaveData };
    saveGame();
    console.log("[SaveManager] Save data reset!");
}

// Equipped Weapons
export function getEquippedWeapons() {
    return getSaveData().equippedWeapons || ["lightning_staff", null, null];
}

export function setEquippedWeapon(slot, weaponId) {
    if (slot < 0 || slot > 2) return false;
    saveData.equippedWeapons[slot] = weaponId;
    saveGame();
    return true;
}

export function setEquippedWeapons(weapons) {
    saveData.equippedWeapons = weapons;
    saveGame();
}

console.log("[SaveManager] Module loaded!");
