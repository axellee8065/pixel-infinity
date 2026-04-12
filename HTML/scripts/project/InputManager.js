// ============================================
// INPUT MANAGER - Dynamic joystick and keyboard handling
// ============================================

import { state, getRuntime } from "./GameState.js";
import * as Config from "./GameConfig.js";
import * as LevelUpManager from "./LevelUpManager.js";
import * as BossManager from "./BossManager.js";
import * as PlayerController from "./PlayerController.js";
import * as ChestSystem from "./ChestSystem.js";
import * as ItemSystem from "./ItemSystem.js";
import * as DamageCalculator from "./DamageCalculator.js";
import * as XPSystem from "./XPSystem.js";
import * as UIManager from "./UIManager.js";
import * as SaveManager from "./SaveManager.js";

// Dynamic joystick position (where finger touched)
let joystickBaseX = 0;
let joystickBaseY = 0;

// Initialize joystick (hide at start)
export function initializeJoystick() {
    const runtime = getRuntime();

    const base = runtime.objects.Joystick?.getFirstInstance();
    const knob = runtime.objects.JoystickKnob?.getFirstInstance();

    if (base) base.isVisible = false;
    if (knob) knob.isVisible = false;

    console.log("[InputManager] Joystick initialized (hidden)");
}

// Setup all input handlers
export function setupInputHandlers() {
    const runtime = getRuntime();

    runtime.addEventListener("pointerdown", onPointerDown);
    runtime.addEventListener("pointermove", onPointerMove);
    runtime.addEventListener("pointerup", onPointerUp);

    // Keyboard keydown event for one-time key presses
    document.addEventListener("keydown", onKeyDown);

    // Hide joystick at start
    initializeJoystick();

    console.log("[InputManager] Input handlers setup complete!");
}

// Debug mode flag - set to true only for development
const DEBUG_MODE = false;

// Handle keydown events (one-time key presses)
function onKeyDown(e) {
    if (!DEBUG_MODE) return;  // Debug keys disabled in production

    const runtime = getRuntime();

    // U key - test victory (instant win)
    if (e.key === "u" || e.key === "U") {
        console.log("[InputManager] U pressed - triggering test victory!");
        state.isPaused = true;
        SaveManager.addGold(200);
        runtime.callFunction("victory");
    }

    // L key - test level up (instant level)
    if (e.key === "l" || e.key === "L") {
        console.log("[InputManager] L pressed - triggering level up!");
        XPSystem.levelUp();
    }
}

function onPointerDown(e) {
    if (state.isLevelingUp) {
        LevelUpManager.handleLevelUpClick(e);
        return;
    }

    // Check if chest window is open
    if (ChestSystem.isWindowOpen()) {
        ChestSystem.handleChestClick(e);
        return;
    }

    // Already have active joystick
    if (state.joystickActive) return;

    const runtime = getRuntime();
    const x = e.clientX;
    const y = e.clientY;

    // Convert to layout coordinates
    const layer = runtime.layout.getLayer("UI");
    const [layerX, layerY] = layer.cssPxToLayer(x, y);

    // Create joystick at touch position (anywhere on screen)
    state.joystickActive = true;
    state.joystickTouchId = e.pointerId;

    // Set dynamic joystick base position
    joystickBaseX = layerX;
    joystickBaseY = layerY;

    // Show and position joystick
    const base = runtime.objects.Joystick?.getFirstInstance();
    const knob = runtime.objects.JoystickKnob?.getFirstInstance();

    if (base) {
        base.x = joystickBaseX;
        base.y = joystickBaseY;
        base.isVisible = true;
        base.opacity = 0.6;
    }

    if (knob) {
        knob.x = joystickBaseX;
        knob.y = joystickBaseY;
        knob.isVisible = true;
        knob.opacity = 0.8;
    }
}

function onPointerMove(e) {
    const runtime = getRuntime();

    // Handle level up hover effect
    if (state.isLevelingUp) {
        LevelUpManager.handleLevelUpMouseMove(e);
        return;
    }

    // Handle weapon slot tooltip (when not in level up and playing)
    if (state.isPlaying && !state.joystickActive) {
        const layer = runtime.layout.getLayer("UI");
        const [layerX, layerY] = layer.cssPxToLayer(e.clientX, e.clientY);
        UIManager.handleWeaponSlotHover(layerX, layerY);
    }

    if (!state.joystickActive) return;
    if (e.pointerId !== state.joystickTouchId) return;

    const layer = runtime.layout.getLayer("UI");
    const [layerX, layerY] = layer.cssPxToLayer(e.clientX, e.clientY);

    updateJoystick(layerX, layerY);
}

function onPointerUp(e) {
    if (e.pointerId === state.joystickTouchId) {
        state.joystickActive = false;
        state.joystickTouchId = null;
        state.moveX = 0;
        state.moveY = 0;

        // Hide joystick
        const runtime = getRuntime();
        const base = runtime.objects.Joystick?.getFirstInstance();
        const knob = runtime.objects.JoystickKnob?.getFirstInstance();

        if (base) base.isVisible = false;
        if (knob) knob.isVisible = false;
    }
}

function updateJoystick(touchX, touchY) {
    const runtime = getRuntime();

    // Calculate direction from dynamic joystick center
    const dx = touchX - joystickBaseX;
    const dy = touchY - joystickBaseY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Normalize and clamp to max radius
    if (dist > 0) {
        const clampedDist = Math.min(dist, Config.JOYSTICK_MAX_RADIUS);
        state.moveX = dx / dist;
        state.moveY = dy / dist;

        // Update knob position
        const knob = runtime.objects.JoystickKnob?.getFirstInstance();
        if (knob) {
            knob.x = joystickBaseX + (dx / dist) * clampedDist;
            knob.y = joystickBaseY + (dy / dist) * clampedDist;
        }
    } else {
        state.moveX = 0;
        state.moveY = 0;
    }
}



// Handle keyboard input (called every tick)
export function handleKeyboardInput() {
    const runtime = getRuntime();
    if (!runtime.keyboard) return;

    // Skip movement if joystick active
    if (state.joystickActive) return;

    let kx = 0, ky = 0;

    // WASD + Arrow keys
    if (runtime.keyboard.isKeyDown("KeyW") || runtime.keyboard.isKeyDown("ArrowUp")) ky = -1;
    if (runtime.keyboard.isKeyDown("KeyS") || runtime.keyboard.isKeyDown("ArrowDown")) ky = 1;
    if (runtime.keyboard.isKeyDown("KeyA") || runtime.keyboard.isKeyDown("ArrowLeft")) kx = -1;
    if (runtime.keyboard.isKeyDown("KeyD") || runtime.keyboard.isKeyDown("ArrowRight")) kx = 1;

    // Normalize diagonal movement
    if (kx !== 0 && ky !== 0) {
        const len = Math.sqrt(kx * kx + ky * ky);
        kx /= len;
        ky /= len;
    }

    if (kx !== 0 || ky !== 0) {
        state.moveX = kx;
        state.moveY = ky;
    } else if (!state.joystickActive) {
        state.moveX = 0;
        state.moveY = 0;
    }
}



console.log("[InputManager] Module loaded!");
