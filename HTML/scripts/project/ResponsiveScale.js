// ============================================
// RESPONSIVE SCALE - Viewport-based scaling
// ============================================
// Scales speeds, distances, and sizes based on viewport
// Base design: 1080x1920 (portrait mobile)

import * as Config from "./GameConfig.js";
import { state } from "./GameState.js";

// Base design viewport
const BASE_WIDTH = Config.VIEWPORT_WIDTH;   // 1080
const BASE_HEIGHT = Config.VIEWPORT_HEIGHT; // 1920

let scaleFactor = 1;
let runtime = null;
let lastViewportWidth = 0;
let lastViewportHeight = 0;

// Initialize
export function init(rt) {
    runtime = rt;
    updateScale();
    lastViewportWidth = runtime.viewportWidth;
    lastViewportHeight = runtime.viewportHeight;
}

// Update scale factor
export function updateScale() {
    if (!runtime) return;

    const viewW = runtime.viewportWidth;
    const viewH = runtime.viewportHeight;

    // Check if viewport size changed
    if (viewW !== lastViewportWidth || viewH !== lastViewportHeight) {
        lastViewportWidth = viewW;
        lastViewportHeight = viewH;

        // Hide tooltip on viewport resize
        import("./UIManager.js").then(UIManager => {
            UIManager.hideTooltipOnResize();
        });
    }

    // Calculate scale based on viewport diagonal vs base diagonal
    const baseDiag = Math.sqrt(BASE_WIDTH * BASE_WIDTH + BASE_HEIGHT * BASE_HEIGHT);
    const viewDiag = Math.sqrt(viewW * viewW + viewH * viewH);

    scaleFactor = viewDiag / baseDiag;
}

// Get scale factor
export function getScale() {
    return scaleFactor;
}

// Scale functions
export function scaleSpeed(baseSpeed) {
    return baseSpeed * scaleFactor;
}

export function scaleDistance(baseDistance) {
    return baseDistance * scaleFactor;
}

export function scaleRadius(baseRadius) {
    return baseRadius * scaleFactor;
}

// ============================================
// SCALED CONFIG VALUES
// ============================================

// Player
export function getPlayerSpeed() {
    // Use state.playerSpeed for dynamic speed changes (energy power-up, etc.)
    return scaleSpeed(state.playerSpeed || Config.PLAYER_DEFAULT_SPEED);
}

// Enemy
export function getEnemyBaseSpeed() {
    return scaleSpeed(Config.ENEMY_BASE_SPEED);
}

export function getEnemySpeedVariance() {
    return scaleSpeed(Config.ENEMY_SPEED_VARIANCE);
}

export function getEnemySpawnDistanceMin() {
    return scaleDistance(Config.ENEMY_SPAWN_DISTANCE_MIN);
}

export function getEnemySpawnDistanceMax() {
    return scaleDistance(Config.ENEMY_SPAWN_DISTANCE_MAX);
}

export function getEnemyCollisionRadius() {
    return scaleRadius(Config.ENEMY_COLLISION_RADIUS);
}

// Combat
export function getBulletSpeed() {
    return scaleSpeed(Config.BULLET_SPEED);
}

export function getAttackRange() {
    return scaleDistance(Config.ATTACK_RANGE);
}

export function getBulletDestroyDistance() {
    return scaleDistance(Config.BULLET_DESTROY_DISTANCE);
}

// XP & Gems
export function getGemPickupRadius() {
    return scaleRadius(Config.GEM_PICKUP_RADIUS);
}

export function getGemAttractRadius() {
    return scaleRadius(Config.GEM_ATTRACT_RADIUS);
}

export function getGemAttractSpeed() {
    return scaleSpeed(Config.GEM_ATTRACT_SPEED);
}

// ============================================
// TILED BACKGROUND - Infinite scrolling
// ============================================

// Setup TiledBackground - uses the size you set in Construct 3 editor
// Set the TiledBackground size in the editor to define play area bounds
export function setupTiledBackground() {
    if (!runtime) return;

    const tiledBg = runtime.objects.TiledBackground?.getFirstInstance() ||
                    runtime.objects.TiledBg?.getFirstInstance();

    if (tiledBg) {
        // Don't change size - use whatever is set in C3 editor
        // Just log current size for debugging
        console.log("[ResponsiveScale] TiledBackground size:", tiledBg.width, "x", tiledBg.height);
        console.log("[ResponsiveScale] TiledBackground position:", tiledBg.x, ",", tiledBg.y);
    }
}

// Get play area bounds (for TiledBackground, this is effectively infinite)
// We use a large fixed area for gameplay bounds
export function getPlayAreaBounds() {
    const size = 10000; // Large play area
    return {
        left: -size / 2,
        right: size / 2,
        top: -size / 2,
        bottom: size / 2
    };
}

console.log("[ResponsiveScale] Module loaded!");
