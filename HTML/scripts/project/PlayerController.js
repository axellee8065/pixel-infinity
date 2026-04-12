// ============================================
// PLAYER CONTROLLER - Player movement and damage
// ============================================

import { state, getRuntime } from "./GameState.js";
import * as UIManager from "./UIManager.js";
import * as ResponsiveScale from "./ResponsiveScale.js";
import * as SaveManager from "./SaveManager.js";
import * as HeroData from "./HeroData.js";
import * as DamageEffects from "./DamageEffects.js";
import * as WeaponSystem from "./WeaponSystem.js";
import * as ItemSystem from "./ItemSystem.js";
import * as TomeSystem from "./TomeSystem.js";
import * as XPSystem from "./XPSystem.js";

// Track animation state
let isMoving = false;
let facingLeft = false;

// Footstep sound timer
let footstepTimer = 0;
const FOOTSTEP_INTERVAL = 0.35;  // Play sound every 0.35 seconds while moving

// Hit sound cooldown
let hitSoundCooldown = 0;
const HIT_SOUND_INTERVAL = 0.3;  // Minimum time between hit sounds

// Update player position (called every tick)
export function updatePlayer(dt) {
    const runtime = getRuntime();
    const player = runtime.objects.Player?.getFirstInstance();
    if (!player) return;

    // Move player with scaled speed (apply item speed multiplier)
    let speed = ResponsiveScale.getPlayerSpeed();

    // Apply speed multiplier from items (Winged Sandals, Velocity Shroud)
    const speedMult = ItemSystem.getSpeedMultiplier();
    speed *= speedMult;

    // Add Agility Tome bonus (flat speed increase)
    speed += TomeSystem.getSpeedBonus();

    // Cap max speed (much higher during energy mode)
    const maxSpeed = XPSystem.isEnergyModeActive() ? 3000 : 600;
    speed = Math.min(speed, maxSpeed);

    player.x += state.moveX * speed * dt;
    player.y += state.moveY * speed * dt;

    // Play footstep sound while moving
    const isCurrentlyMoving = (state.moveX !== 0 || state.moveY !== 0);
    if (isCurrentlyMoving) {
        footstepTimer += dt;
        if (footstepTimer >= FOOTSTEP_INTERVAL) {
            footstepTimer = 0;
            const footstepSound = Math.random() < 0.5 ? "grass" : "grass2";
            runtime.callFunction("playAudio", footstepSound, 0, 10);
        }
    } else {
        footstepTimer = 0;
    }

    // Update hit sound cooldown
    if (hitSoundCooldown > 0) {
        hitSoundCooldown -= dt;
    }

    // Check for TiledBackground (infinite scrolling) or static background
    const tiledBg = runtime.objects.TiledBackground?.getFirstInstance() ||
                    runtime.objects.TiledBg?.getFirstInstance();
    const staticBg = runtime.objects.background?.getFirstInstance();

    if (tiledBg) {
        // TiledBackground: origin is top-left corner in C3
        const bgLeft = tiledBg.x;
        const bgRight = tiledBg.x + tiledBg.width;
        const bgTop = tiledBg.y;
        const bgBottom = tiledBg.y + tiledBg.height;
        const margin = 50;

        // Clamp player position to TiledBackground bounds
        player.x = Math.max(bgLeft + margin, Math.min(bgRight - margin, player.x));
        player.y = Math.max(bgTop + margin, Math.min(bgBottom - margin, player.y));

        // Clamp camera so it doesn't show outside TiledBackground
        const viewW = runtime.viewportWidth;
        const viewH = runtime.viewportHeight;
        const camX = Math.max(bgLeft + viewW / 2, Math.min(bgRight - viewW / 2, player.x));
        const camY = Math.max(bgTop + viewH / 2, Math.min(bgBottom - viewH / 2, player.y));

        runtime.layout.scrollX = camX;
        runtime.layout.scrollY = camY;
    } else if (staticBg) {
        // Static background: clamp player and camera to bounds
        const bgLeft = staticBg.x - staticBg.width / 2;
        const bgRight = staticBg.x + staticBg.width / 2;
        const bgTop = staticBg.y - staticBg.height / 2;
        const bgBottom = staticBg.y + staticBg.height / 2;
        const margin = ResponsiveScale.scaleDistance(50);

        // Clamp player position to background bounds
        player.x = Math.max(bgLeft + margin, Math.min(bgRight - margin, player.x));
        player.y = Math.max(bgTop + margin, Math.min(bgBottom - margin, player.y));

        // Clamp camera so it doesn't show outside background
        const viewW = runtime.viewportWidth;
        const viewH = runtime.viewportHeight;
        const camX = Math.max(bgLeft + viewW / 2, Math.min(bgRight - viewW / 2, player.x));
        const camY = Math.max(bgTop + viewH / 2, Math.min(bgBottom - viewH / 2, player.y));

        runtime.layout.scrollX = camX;
        runtime.layout.scrollY = camY;
    } else {
        // No background: camera follows player
        runtime.layout.scrollX = player.x;
        runtime.layout.scrollY = player.y;
    }

    // Update animation based on movement direction
    updatePlayerAnimation(player, state.moveX, state.moveY);
}

// Update player animation based on movement
// Animations: {prefix}Idle, {prefix}Run (e.g., mageIdle, mageRun, archerIdle, archerRun)
// Left direction uses mirrored sprite (negative width)
function updatePlayerAnimation(player, moveX, moveY) {
    // Get hero animation prefix
    const heroId = SaveManager.getSelectedHeroId();
    const animPrefix = HeroData.getAnimPrefix(heroId);

    const wasMoving = isMoving;
    const wasFacingLeft = facingLeft;

    // Check if moving
    isMoving = (moveX !== 0 || moveY !== 0);

    // Update facing direction only when moving
    if (isMoving) {
        if (moveX < 0) {
            facingLeft = true;
        } else if (moveX > 0) {
            facingLeft = false;
        }
        // If only moving vertically, keep last horizontal facing
    }

    // Determine which animation to play
    const animName = isMoving ? animPrefix + "Run" : animPrefix + "Idle";

    // Only update if animation state changed
    if (isMoving !== wasMoving || facingLeft !== wasFacingLeft) {
        player.setAnimation(animName);

        // Mirror sprite for left direction
        if (facingLeft) {
            player.width = -Math.abs(player.width);
        } else {
            player.width = Math.abs(player.width);
        }
    }
}

// Get player instance
export function getPlayer() {
    const runtime = getRuntime();
    return runtime.objects.Player?.getFirstInstance();
}

// Get player position
export function getPlayerPosition() {
    const player = getPlayer();
    if (!player) return { x: 0, y: 0 };
    return { x: player.x, y: player.y };
}

// Damage player
export function damagePlayer(amount) {
    // Try to block damage with Guardian Shield
    if (WeaponSystem.tryBlockDamage(amount)) {
        // Damage was blocked by shield!
        // Show visual feedback (blue flash instead of red)
        const player = getPlayer();
        if (player) {
            player.colorRgb = [0.5, 0.8, 1];  // Blue flash for blocked
            setTimeout(() => {
                if (player) player.colorRgb = [1, 1, 1];
            }, 150);
        }
        return;  // Don't take damage
    }

    state.playerHealth -= amount;

    // Play hit sound (with cooldown to prevent spam)
    const runtime = getRuntime();
    if (hitSoundCooldown <= 0) {
        runtime.callFunction("playAudio", "Hit", 0, 10);
        hitSoundCooldown = HIT_SOUND_INTERVAL;
    }

    // Update HP bar
    UIManager.updateHPBar();

    // Trigger damage effects (screen shake + red vignette)
    DamageEffects.triggerDamageEffect(amount);

    // Trigger Velocity Shroud speed buff
    ItemSystem.onPlayerDamaged();

    // Flash player red
    const player = getPlayer();
    if (player) {
        player.colorRgb = [1, 0.5, 0.5];
        setTimeout(() => {
            if (player) player.colorRgb = [1, 1, 1];
        }, 100);
    }

    // Check death
    if (state.playerHealth <= 0) {
        gameOver();
    }
}

// Heal player
export function healPlayer(amount) {
    state.playerHealth = Math.min(state.playerHealth + amount, state.playerMaxHealth);
    UIManager.updateHPBar();
}

// Game over
export function gameOver() {
    state.isPlaying = false;
    state.isGameOver = true;

    // Play fail sound and call defeat function
    const runtime = getRuntime();
    runtime.callFunction("playAudio", "fail", 0, 10);
    runtime.callFunction("defeat");

    console.log("[PlayerController] Game Over! Kills:", state.killCount, "Time:", Math.floor(state.gameTime));

    const player = getPlayer();
    if (player) {
        player.opacity = 0.5;
    }
}

// Check if player is alive
export function isAlive() {
    return state.playerHealth > 0;
}

console.log("[PlayerController] Module loaded!");
