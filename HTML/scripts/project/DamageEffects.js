// ============================================
// DAMAGE EFFECTS - Screen shake and vignette
// ============================================

import { getRuntime } from "./GameState.js";

// Shake state
let shakeIntensity = 0;
let shakeDuration = 0;
let shakeTimer = 0;
let originalScrollX = 0;
let originalScrollY = 0;

// Trigger damage effect (call when player takes damage)
export function triggerDamageEffect(damageAmount = 10) {
    const runtime = getRuntime();

    // Scale effect intensity based on damage
    const intensity = Math.min(damageAmount / 10, 3); // Cap at 3x

    // Camera shake
    startCameraShake(8 * intensity, 0.15);

    // Red vignette flash
    showDamageVignette();
}

// Start camera shake
function startCameraShake(intensity, duration) {
    const runtime = getRuntime();

    shakeIntensity = intensity;
    shakeDuration = duration;
    shakeTimer = 0;
    originalScrollX = runtime.layout.scrollX;
    originalScrollY = runtime.layout.scrollY;
}

// Update camera shake (call every tick)
export function updateCameraShake(dt) {
    if (shakeIntensity <= 0) return;

    const runtime = getRuntime();
    shakeTimer += dt;

    if (shakeTimer >= shakeDuration) {
        // Shake finished - restore position
        shakeIntensity = 0;
        return;
    }

    // Calculate shake offset (decreases over time)
    const progress = shakeTimer / shakeDuration;
    const currentIntensity = shakeIntensity * (1 - progress);

    // Random offset
    const offsetX = (Math.random() - 0.5) * 2 * currentIntensity;
    const offsetY = (Math.random() - 0.5) * 2 * currentIntensity;

    // Apply shake (will be overwritten by player follow, so add to current)
    runtime.layout.scrollX += offsetX;
    runtime.layout.scrollY += offsetY;
}

// Show red vignette effect
function showDamageVignette() {
    const runtime = getRuntime();
    const vignette = runtime.objects.DamageVignette?.getFirstInstance();

    if (!vignette) return;

    // Get UI layer's actual viewport (handles Scale Outer mode)
    const uiLayer = runtime.layout.getLayer("UI");
    if (uiLayer) {
        const viewport = uiLayer.getViewport();
        const viewWidth = viewport.right - viewport.left;
        const viewHeight = viewport.bottom - viewport.top;

        // Resize vignette to fit actual viewport
        vignette.width = viewWidth;
        vignette.height = viewHeight;

        // Center on viewport
        vignette.x = viewport.left + viewWidth / 2;
        vignette.y = viewport.top + viewHeight / 2;
    }

    // Make visible and set opacity
    vignette.isVisible = true;
    vignette.opacity = 0.5;

    // Fade out using tween
    if (vignette.behaviors?.Tween) {
        vignette.behaviors.Tween.startTween("opacity", 0, 0.3, "easeoutquad");

        // Hide after fade
        setTimeout(() => {
            vignette.isVisible = false;
        }, 300);
    } else {
        // Fallback without tween
        vignette.opacity = 0.4;
        setTimeout(() => {
            vignette.opacity = 0;
            vignette.isVisible = false;
        }, 150);
    }
}

// Reset effects (for new game)
export function reset() {
    shakeIntensity = 0;
    shakeDuration = 0;
    shakeTimer = 0;
}

// Show text effect on enemy
export function showTextEffect(enemyX, enemyY, effectType) {
    const runtime = getRuntime();

    // Random offset so multiple effects don't stack on top of each other
    const offsetX = (Math.random() - 0.5) * 60;
    const offsetY = (Math.random() - 0.5) * 30;

    // Create textEffects sprite at enemy position (slightly above with random offset)
    const textEffect = runtime.objects.textEffects?.createInstance("Game", enemyX + offsetX, enemyY - 30 + offsetY);

    if (!textEffect) {
        return;
    }

    // Set animation based on effect type
    const animationMap = {
        "overkill": "Overkill",
        "crit": "Crit",
        "ultra_crit": "Ultra Crit",
        "poisoned": "Poisoned",
        "stunned": "Stunned",
        "executed": "Executed",
        "dodge": "Dodge"
    };

    const animName = animationMap[effectType];
    if (animName) {
        try {
            textEffect.setAnimation(animName);
        } catch (e) {
            console.warn("[DamageEffects] Animation not found:", animName, e);
        }
    }

    // Set initial opacity
    textEffect.opacity = 1;

    // Move upward and fade out using tween
    if (textEffect.behaviors?.Tween) {
        const targetY = enemyY - 150; // Move 120 pixels up
        textEffect.behaviors.Tween.startTween("y", targetY, 1.2, "easeoutquad");
        textEffect.behaviors.Tween.startTween("opacity", 0, 1.2, "easeoutquad");
    }

    // Destroy after animation completes
    setTimeout(() => {
        if (textEffect && textEffect.isDestroyed === false) {
            textEffect.destroy();
        }
    }, 1200);
}

// Delete all textEffects on game start
export function clearAllTextEffects() {
    const runtime = getRuntime();
    const textEffects = runtime.objects.textEffects?.getAllInstances() || [];

    for (const effect of textEffects) {
        effect.destroy();
    }

    console.log("[DamageEffects] Cleared all text effects");
}

// ============================================
// RARITY DROP EFFECTS
// ============================================

export function showRarityDropEffect(x, y, rarity, itemName) {
    const runtime = getRuntime();

    if (rarity === "legendary") {
        // Legendary: camera shake + large gold text + slowmo
        startCameraShake(20, 0.4);
        const text = runtime.objects.DamageText?.createInstance("Game", x, y - 50);
        if (text) {
            text.text = "LEGENDARY!\n" + itemName;
            text.colorRgb = [1, 0.84, 0];
            text.opacity = 1;
            try {
                text.behaviors.Tween.startTween("y", y - 250, 2.0, "easeoutquad");
                text.behaviors.Tween.startTween("opacity", 0, 2.0, "easeoutquad");
            } catch (e) {}
            setTimeout(() => { try { if (text?.runtime) text.destroy(); } catch (e) {} }, 2100);
        }
        // Trigger slowmo
        const EM = globalThis.EnemyManager;
        if (EM) EM.triggerHitStop("ultra_crit");
    } else if (rarity === "epic") {
        startCameraShake(12, 0.25);
        const text = runtime.objects.DamageText?.createInstance("Game", x, y - 50);
        if (text) {
            text.text = "EPIC!\n" + itemName;
            text.colorRgb = [0.6, 0.2, 1];
            text.opacity = 1;
            try {
                text.behaviors.Tween.startTween("y", y - 200, 1.5, "easeoutquad");
                text.behaviors.Tween.startTween("opacity", 0, 1.5, "easeoutquad");
            } catch (e) {}
            setTimeout(() => { try { if (text?.runtime) text.destroy(); } catch (e) {} }, 1600);
        }
    } else if (rarity === "rare") {
        const text = runtime.objects.DamageText?.createInstance("Game", x, y - 40);
        if (text) {
            text.text = itemName;
            text.colorRgb = [0.2, 0.5, 1];
            text.opacity = 1;
            try {
                text.behaviors.Tween.startTween("y", y - 150, 1.2, "easeoutquad");
                text.behaviors.Tween.startTween("opacity", 0, 1.2, "easeoutquad");
            } catch (e) {}
            setTimeout(() => { try { if (text?.runtime) text.destroy(); } catch (e) {} }, 1300);
        }
    }
}

// ============================================
// WEAPON EVOLUTION CEREMONY
// ============================================

export function showEvolutionCeremony(x, y, evolvedName) {
    const runtime = getRuntime();

    // Big camera shake
    startCameraShake(25, 0.5);

    // Slowmo
    const EM = globalThis.EnemyManager;
    if (EM) EM.triggerHitStop("ultra_crit");

    // "EVOLVED!" text
    const label = runtime.objects.DamageText?.createInstance("Game", x, y - 100);
    if (label) {
        label.text = "WEAPON EVOLVED!";
        label.colorRgb = [1, 1, 1];
        label.opacity = 1;
        try {
            label.behaviors.Tween.startTween("y", y - 250, 2.0, "easeoutquad");
            label.behaviors.Tween.startTween("opacity", 0, 2.5, "easeoutquad");
        } catch (e) {}
        setTimeout(() => { try { if (label?.runtime) label.destroy(); } catch (e) {} }, 2600);
    }

    // Evolved weapon name (delayed)
    setTimeout(() => {
        const nameText = runtime.objects.DamageText?.createInstance("Game", x, y - 60);
        if (nameText) {
            nameText.text = evolvedName;
            nameText.colorRgb = [1, 0.84, 0];
            nameText.opacity = 1;
            try {
                nameText.behaviors.Tween.startTween("y", y - 200, 2.0, "easeoutquad");
                nameText.behaviors.Tween.startTween("opacity", 0, 2.0, "easeoutquad");
            } catch (e) {}
            setTimeout(() => { try { if (nameText?.runtime) nameText.destroy(); } catch (e) {} }, 2100);
        }
    }, 300);
}

console.log("[DamageEffects] Module loaded!");
