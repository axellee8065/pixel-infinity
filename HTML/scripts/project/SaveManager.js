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
    totalPlayTime: 0,
    // Weapons are NOT saved - they reset each run based on hero selection

    // === META PROGRESSION: Permanent stat upgrades ===
    powerUps: {
        damage: 0,      // +5% per level
        health: 0,       // +10 HP per level
        speed: 0,        // +8% per level
        attackSpeed: 0,  // +5% per level
        armor: 0,        // -3% damage taken per level
        goldBonus: 0,    // +10% gold drop per level
        xpBonus: 0,      // +8% XP gain per level
        luck: 0          // +5% rare item chance per level
    },

    // === ACHIEVEMENTS ===
    achievements: [],  // Array of unlocked achievement IDs

    // === RUN STATS (last run) ===
    lastRunStats: null,

    // === TUTORIAL ===
    tutorialShown: false
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

// === POWER-UP SYSTEM (Permanent Stat Upgrades) ===

const POWERUP_DEFS = {
    damage:      { name: "Attack Power",   desc: "+5% Damage",        costBase: 50,  costScale: 1.4, maxLevel: 20, valuePerLevel: 5 },
    health:      { name: "Max Health",     desc: "+10 HP",            costBase: 40,  costScale: 1.35, maxLevel: 25, valuePerLevel: 10 },
    speed:       { name: "Move Speed",     desc: "+8% Speed",         costBase: 45,  costScale: 1.35, maxLevel: 15, valuePerLevel: 8 },
    attackSpeed: { name: "Attack Speed",   desc: "+5% Attack Speed",  costBase: 60,  costScale: 1.45, maxLevel: 15, valuePerLevel: 5 },
    armor:       { name: "Armor",          desc: "-3% Damage Taken",  costBase: 55,  costScale: 1.4, maxLevel: 15, valuePerLevel: 3 },
    goldBonus:   { name: "Gold Find",      desc: "+10% Gold Drop",    costBase: 35,  costScale: 1.3, maxLevel: 20, valuePerLevel: 10 },
    xpBonus:     { name: "XP Boost",       desc: "+8% XP Gain",       costBase: 40,  costScale: 1.3, maxLevel: 20, valuePerLevel: 8 },
    luck:        { name: "Luck",           desc: "+5% Rare Items",    costBase: 70,  costScale: 1.5, maxLevel: 10, valuePerLevel: 5 }
};

export function getPowerUpDefs() { return POWERUP_DEFS; }

export function getPowerUpLevel(stat) {
    const data = getSaveData();
    if (!data.powerUps) data.powerUps = {};
    return data.powerUps[stat] || 0;
}

export function getPowerUpCost(stat) {
    const def = POWERUP_DEFS[stat];
    if (!def) return 999999;
    const level = getPowerUpLevel(stat);
    return Math.floor(def.costBase * Math.pow(def.costScale, level));
}

export function getPowerUpValue(stat) {
    const def = POWERUP_DEFS[stat];
    if (!def) return 0;
    return getPowerUpLevel(stat) * def.valuePerLevel;
}

export function upgradePowerUp(stat) {
    const def = POWERUP_DEFS[stat];
    if (!def) return false;
    const level = getPowerUpLevel(stat);
    if (level >= def.maxLevel) return false;
    const cost = getPowerUpCost(stat);
    if (!spendGold(cost)) return false;
    if (!saveData.powerUps) saveData.powerUps = {};
    saveData.powerUps[stat] = level + 1;
    saveGame();
    return true;
}

export function getAllPowerUpBonuses() {
    const bonuses = {};
    for (const stat of Object.keys(POWERUP_DEFS)) {
        bonuses[stat] = getPowerUpValue(stat);
    }
    return bonuses;
}

// === ACHIEVEMENTS ===

const ACHIEVEMENT_DEFS = [
    { id: "first_kill",     name: "First Blood",       desc: "Kill your first enemy",          condition: "kills", target: 1, reward: 10 },
    { id: "kills_100",      name: "Centurion",          desc: "Kill 100 enemies in one run",    condition: "kills", target: 100, reward: 25 },
    { id: "kills_500",      name: "Slayer",             desc: "Kill 500 enemies in one run",    condition: "kills", target: 500, reward: 50 },
    { id: "kills_1000",     name: "Massacre",           desc: "Kill 1000 enemies total",        condition: "totalKills", target: 1000, reward: 100 },
    { id: "boss_kill",      name: "Boss Slayer",        desc: "Defeat the boss",                condition: "bossKill", target: 1, reward: 50 },
    { id: "level_5",        name: "Getting Strong",     desc: "Reach level 5",                  condition: "level", target: 5, reward: 15 },
    { id: "level_10",       name: "Veteran",            desc: "Reach level 10",                 condition: "level", target: 10, reward: 30 },
    { id: "survive_3min",   name: "Survivor",           desc: "Survive for 3 minutes",          condition: "time", target: 180, reward: 20 },
    { id: "survive_5min",   name: "Endurance",          desc: "Survive for 5 minutes",          condition: "time", target: 300, reward: 40 },
    { id: "gold_500",       name: "Rich",               desc: "Accumulate 500 gold",            condition: "totalGold", target: 500, reward: 50 },
    { id: "all_heroes",     name: "Collector",          desc: "Unlock all heroes",              condition: "heroes", target: 8, reward: 200 },
    { id: "no_damage_30s",  name: "Untouchable",        desc: "Take no damage for 30 seconds",  condition: "noDamage", target: 30, reward: 75 }
];

export function getAchievementDefs() { return ACHIEVEMENT_DEFS; }

export function isAchievementUnlocked(achId) {
    const data = getSaveData();
    if (!data.achievements) data.achievements = [];
    return data.achievements.includes(achId);
}

export function unlockAchievement(achId) {
    if (isAchievementUnlocked(achId)) return false;
    const def = ACHIEVEMENT_DEFS.find(a => a.id === achId);
    if (!def) return false;
    if (!saveData.achievements) saveData.achievements = [];
    saveData.achievements.push(achId);
    // Grant gold reward
    saveData.gold += def.reward;
    saveGame();
    console.log("[SaveManager] Achievement unlocked:", def.name, "+", def.reward, "gold!");
    return true;
}

export function getUnlockedAchievementCount() {
    const data = getSaveData();
    return (data.achievements || []).length;
}

// === LAST RUN STATS ===

export function saveLastRunStats(stats) {
    saveData.lastRunStats = stats;
    saveGame();
}

export function getLastRunStats() {
    return getSaveData().lastRunStats;
}

// === TUTORIAL ===
export function isTutorialShown() {
    return getSaveData().tutorialShown === true;
}

export function markTutorialShown() {
    saveData.tutorialShown = true;
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
