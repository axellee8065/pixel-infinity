// ============================================
// DIFFICULTY MANAGER - Scale difficulty over time
// ============================================

import { state } from "./GameState.js";
import * as Config from "./GameConfig.js";

// Update difficulty based on game time (called every tick)
export function updateDifficulty() {
    // Increase difficulty multiplier every X seconds
    state.difficultyMultiplier = 1 +
        Math.floor(state.gameTime / Config.DIFFICULTY_INCREASE_INTERVAL) *
        Config.DIFFICULTY_MULTIPLIER_INCREMENT;

    // Spawn enemies faster over time
    state.enemySpawnRate = Math.max(
        Config.MIN_SPAWN_RATE,
        Config.INITIAL_SPAWN_RATE - state.gameTime / Config.SPAWN_RATE_DECREASE_TIME
    );

    // Increase max enemies over time
    state.maxEnemies = Math.min(
        Config.MAX_ENEMIES_CAP,
        Config.INITIAL_MAX_ENEMIES + Math.floor(state.gameTime / 60) * 5
    );
}

// Get current difficulty info
export function getDifficultyInfo() {
    return {
        multiplier: state.difficultyMultiplier,
        spawnRate: state.enemySpawnRate,
        maxEnemies: state.maxEnemies
    };
}

console.log("[DifficultyManager] Module loaded!");
