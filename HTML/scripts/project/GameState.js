// ============================================
// GAME STATE - Central state management
// ============================================

import * as Config from "./GameConfig.js";

// Selected hero stats (set during game init)
let selectedHeroStats = null;

// Game state object
export const state = {
    // Runtime reference
    runtime: null,

    // Game status
    isPlaying: false,
    isPaused: false,
    isLevelingUp: false,
    isGameOver: false,
    bossDefeatedMagnet: false,  // Attracts all XP/Gold after boss death

    // Player stats
    playerLevel: 1,
    currentXP: 0,
    xpToNextLevel: Config.XP_TO_FIRST_LEVEL,
    killCount: 0,
    gameTime: 0,

    // Player combat stats (can be upgraded)
    playerDamage: Config.PLAYER_DEFAULT_DAMAGE,
    playerSpeed: Config.PLAYER_DEFAULT_SPEED,
    playerAttackSpeed: Config.PLAYER_DEFAULT_ATTACK_SPEED,
    playerMaxHealth: Config.PLAYER_DEFAULT_HEALTH,
    playerHealth: Config.PLAYER_DEFAULT_HEALTH,

    // Attack timing
    lastAttackTime: 0,
    attackCooldown: 1 / Config.PLAYER_DEFAULT_ATTACK_SPEED,

    // Enemy spawn
    enemySpawnRate: Config.INITIAL_SPAWN_RATE,
    lastSpawnTime: 0,
    maxEnemies: Config.INITIAL_MAX_ENEMIES,
    difficultyMultiplier: 1,

    // Input
    moveX: 0,
    moveY: 0,
    joystickActive: false,
    joystickTouchId: null,

    // Gold system
    gold: 0,
    goldTextValue: 0,      // Current accumulated +gold value
    goldTextTimer: 0,      // Time until gold text disappears

    // Silver system (run-specific currency)
    silver: 0,
    silverTextValue: 0,
    silverTextTimer: 0,
    lastChestSpawnTime: 0,  // Timer for chest spawning

    // Weapon system (run-specific)
    equippedWeapons: [null, null, null, null],  // 4 weapon slots (first 2 unlocked) - slot 1 filled by hero's default weapon
    weaponLevels: {},       // weaponId -> level (1-8), reset each run
    unlockedWeaponSlots: 4, // All 4 weapon slots unlocked by default

    // Item system (run-specific)
    itemInventory: {},      // itemId -> count
    itemStats: null,        // Will be initialized by ItemSystem
    baseMaxHealth: 100,     // Starting max HP for Ring of Fortitude

    // Item effect tracking
    velocityShroudActive: false,
    velocityShroudTimer: 0,
    playerStillTimer: 0,
    lastPlayerX: 0,
    lastPlayerY: 0
};

// Initialize runtime reference
export function setRuntime(runtime) {
    state.runtime = runtime;
}

// Get runtime
export function getRuntime() {
    return state.runtime;
}

// Set hero stats for this run (called before resetState)
export function setHeroStats(heroStats, heroId) {
    selectedHeroStats = heroStats;
    state.selectedHeroId = heroId;
}

// Get current hero stats
export function getHeroStats() {
    return selectedHeroStats;
}

// Reset game state for new game
export function resetState() {
    state.isPlaying = false;
    state.isPaused = false;
    state.isLevelingUp = false;
    state.isGameOver = false;
    state.bossDefeatedMagnet = false;

    state.playerLevel = 1;
    state.currentXP = 0;
    state.xpToNextLevel = Config.XP_TO_FIRST_LEVEL;
    state.killCount = 0;
    state.gameTime = 0;

    // Use hero stats if available, otherwise defaults
    if (selectedHeroStats) {
        state.playerDamage = selectedHeroStats.damage || Config.PLAYER_DEFAULT_DAMAGE;
        state.playerSpeed = selectedHeroStats.speed || Config.PLAYER_DEFAULT_SPEED;
        state.playerAttackSpeed = selectedHeroStats.attackSpeed || Config.PLAYER_DEFAULT_ATTACK_SPEED;
        state.playerMaxHealth = selectedHeroStats.health || Config.PLAYER_DEFAULT_HEALTH;
        state.playerHealth = state.playerMaxHealth;
        state.playerCritChance = selectedHeroStats.critChance || 0;
        state.playerCritMultiplier = selectedHeroStats.critMultiplier || 2.0;
    } else {
        state.playerDamage = Config.PLAYER_DEFAULT_DAMAGE;
        state.playerSpeed = Config.PLAYER_DEFAULT_SPEED;
        state.playerAttackSpeed = Config.PLAYER_DEFAULT_ATTACK_SPEED;
        state.playerMaxHealth = Config.PLAYER_DEFAULT_HEALTH;
        state.playerHealth = Config.PLAYER_DEFAULT_HEALTH;
        state.playerCritChance = 0;
        state.playerCritMultiplier = 2.0;
    }

    state.lastAttackTime = 0;
    state.attackCooldown = 1 / state.playerAttackSpeed;

    state.enemySpawnRate = Config.INITIAL_SPAWN_RATE;
    state.lastSpawnTime = 0;
    state.maxEnemies = Config.INITIAL_MAX_ENEMIES;
    state.difficultyMultiplier = 1;

    state.moveX = 0;
    state.moveY = 0;
    state.joystickActive = false;
    state.joystickTouchId = null;

    state.gold = 0;
    state.goldTextValue = 0;
    state.goldTextTimer = 0;

    state.silver = 0;
    state.silverTextValue = 0;
    state.silverTextTimer = 0;
    state.lastChestSpawnTime = 0;

    // Reset weapon levels for new run (weapons start at level 0 = not acquired)
    // Must select weapon from level-up to get level 1 and activate it
    state.weaponLevels = {};

    // Reset item system
    state.itemInventory = {};
    state.itemStats = null;
    state.baseMaxHealth = state.playerMaxHealth;  // Use hero's max health as base
    state.velocityShroudActive = false;
    state.velocityShroudTimer = 0;
    state.playerStillTimer = 0;
    state.lastPlayerX = 0;
    state.lastPlayerY = 0;

    // Reset archer projectiles
    state.archerProjectiles = [];
}

console.log("[GameState] State manager loaded!");
