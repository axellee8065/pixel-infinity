// ============================================
// WEAPON DATA - All weapon definitions
// ============================================

// Max weapon level
export const MAX_WEAPON_LEVEL = 8;

// All weapons - each weapon has unique mechanics
export const WEAPONS = {

    // ==========================================
    // LIGHTNING STAFF - Chain lightning hitting up to 3 enemies
    // ==========================================
    "lightning_staff": {
        id: "lightning_staff",
        name: "Lightning Staff",
        description: "Chain lightning strikes up to 3 nearby enemies",
        animationName: "Lightning Staff",
        type: "universal",
        weaponType: "targeted",  // strikes specific enemies
        baseDamage: 80,  // 2x
        baseCooldown: 1.8,  // Faster
        baseRange: 300,
        baseTargets: 3,  // Hit up to 3 enemies
        damagePerLevel: 10,  // More per level
        cooldownReduction: 0.12,
        effectDuration: 0.5,
        upgrades: [
            { damage: 10, cooldown: 0, desc: "+10 Damage" },
            { damage: 6, cooldown: 0.1, desc: "+6 Damage, -0.1s Cooldown" },
            { damage: 0, cooldown: 0.2, desc: "-0.2s Cooldown" },
            { damage: 15, cooldown: 0, desc: "+15 Damage" },
            { damage: 8, cooldown: 0.15, desc: "+8 Damage, -0.15s Cooldown" }
        ]
    },

    // ==========================================
    // SOUL AURA - Persistent damage field around player
    // ==========================================
    "soul_aura": {
        id: "soul_aura",
        name: "Soul Aura",
        description: "Large aura that constantly damages nearby enemies",
        animationName: "Soul Aura",
        type: "universal",
        weaponType: "aura_persistent",  // follows player, constant damage
        baseDamage: 30,  // 2x
        baseCooldown: 0.8,  // Faster ticks
        baseRange: 220,  // Bigger range
        damagePerLevel: 6,  // More per level
        cooldownReduction: 0.08,
        rangePerLevel: 15,  // Nerfed from 30 (less AoE scaling)
        effectDuration: 0,
        upgrades: [
            { damage: 6, cooldown: 0, desc: "+6 Damage/tick" },
            { damage: 0, cooldown: 0.1, desc: "-0.1s Tick Rate" },
            { damage: 5, cooldown: 0.08, desc: "+5 Damage, Faster Ticks" },
            { damage: 8, cooldown: 0, desc: "+8 Damage/tick" },
            { damage: 0, cooldown: 0, range: 40, desc: "+40 Range" }
        ]
    },

    // ==========================================
    // GUARDIAN SHIELD - Orbiting shields that block damage
    // ==========================================
    "guardian_shield": {
        id: "guardian_shield",
        name: "Guardian Shield",
        description: "Orbiting shields that block incoming damage",
        animationName: "Guardian Shield",
        type: "universal",
        weaponType: "shield_orbit",  // orbiting defensive shields
        baseDamage: 0,
        baseCooldown: 10.0,  // 10 second respawn time
        baseRange: 120,  // orbit distance (further from player)
        baseShieldCount: 1,  // starts with 1 shield
        shieldPerLevel: 0,  // +1 shield at certain levels
        effectDuration: 0,  // persistent until hit
        upgrades: [
            { shields: 1, cooldown: 0, desc: "+1 Shield" },
            { shields: 0, cooldown: 1, desc: "-1s Respawn Time" },
            { shields: 1, cooldown: 0, desc: "+1 Shield" },
            { shields: 0, cooldown: 1.5, desc: "-1.5s Respawn Time" },
            { shields: 1, cooldown: 0, desc: "+1 Shield" }
        ]
    },

    // ==========================================
    // INFERNO TRAIL - Fire path that damages enemies
    // ==========================================
    "inferno_trail": {
        id: "inferno_trail",
        name: "Inferno Trail",
        description: "Creates a burning fire path every few seconds",
        animationName: "Inferno Trail",
        type: "universal",
        weaponType: "fire_path",  // creates fire path periodically
        baseDamage: 10,  // 2x - damage per tick
        baseCooldown: 2.5,  // Faster
        pathLength: 319,
        pathWidth: 85,  // Wider path
        pathDuration: 5.0,  // Longer duration
        tickRate: 0.3,  // Nerfed from 0.15 (halved tick speed)
        damagePerLevel: 2,  // More per level
        durationPerLevel: 0.8,
        effectDuration: 0,
        upgrades: [
            { damage: 3, cooldown: 0, desc: "+3 Burn Damage/tick" },
            { damage: 0, cooldown: 0.4, desc: "-0.4s Cooldown" },
            { damage: 2, cooldown: 0, duration: 1, desc: "+2 Damage, +1s Duration" },
            { damage: 4, cooldown: 0, desc: "+4 Burn Damage/tick" },
            { damage: 0, cooldown: 0.5, desc: "-0.5s Cooldown" }
        ]
    },

    // ==========================================
    // SWIFT BLADE - Fast melee auto-target
    // ==========================================
    "swift_blade": {
        id: "swift_blade",
        name: "Swift Blade",
        description: "Rapidly slashes the nearest enemy",
        animationName: "Swift Blade",
        type: "universal",
        weaponType: "melee",
        baseDamage: 45,  // Nerfed from 70
        baseCooldown: 0.6,  // Nerfed from 0.5
        baseRange: 170,  // Longer reach
        damagePerLevel: 5,  // Nerfed from 8
        cooldownReduction: 0.05,
        effectDuration: 0.2,
        upgrades: [
            { damage: 8, cooldown: 0, desc: "+8 Damage" },
            { damage: 0, cooldown: 0.1, desc: "-0.1s Cooldown" },
            { damage: 6, cooldown: 0.06, desc: "+6 Damage, -0.06s CD" },
            { damage: 12, cooldown: 0, desc: "+12 Damage" },
            { damage: 0, cooldown: 0.12, desc: "-0.12s Cooldown" }
        ]
    },

    // ==========================================
    // FORTUNE DICE - Random damage, crit stacking
    // ==========================================
    "fortune_dice": {
        id: "fortune_dice",
        name: "Fortune Dice",
        description: "Throws dice dealing 1-6 random damage, 6 = +crit",
        animationName: "Fortune Dice",
        type: "universal",
        weaponType: "projectile",
        baseDamage: 20,  // 2x
        baseCooldown: 1.0,
        baseRange: 350,
        randomDamageMin: 5,
        randomDamageMax: 15,
        critStackChance: 0.167,  // 1/6 chance for crit (2x)
        damagePerLevel: 4,
        cooldownReduction: 0.08,
        effectDuration: 0.3,
        upgrades: [
            { damage: 1, cooldown: 0, desc: "+1 to all dice rolls" },
            { damage: 0, cooldown: 0.1, desc: "-0.1s Cooldown" },
            { damage: 1, cooldown: 0.05, desc: "+1 Damage, -0.05s CD" },
            { damage: 2, cooldown: 0, desc: "+2 to all dice rolls" },
            { damage: 0, cooldown: 0.15, desc: "-0.15s Cooldown" }
        ]
    },

    // ==========================================
    // EXECUTIONER - Piercing line attack, execute chance
    // ==========================================
    "executioner": {
        id: "executioner",
        name: "Executioner",
        description: "Piercing strikes with chance to instantly kill",
        animationName: "Executioner",
        type: "universal",
        weaponType: "piercing",
        baseDamage: 36,  // 2x
        baseCooldown: 1.5,
        baseRange: 200,
        executeChance: 0.05,
        damagePerLevel: 6,
        cooldownReduction: 0.1,
        effectDuration: 0.3,
        upgrades: [
            { damage: 6, cooldown: 0, desc: "+6 Damage" },
            { damage: 0, cooldown: 0.1, desc: "-0.1s Cooldown" },
            { damage: 4, cooldown: 0.05, desc: "+4 Damage, -0.05s CD" },
            { damage: 0, cooldown: 0, execute: 0.02, desc: "+2% Execute Chance" },
            { damage: 8, cooldown: 0, desc: "+8 Damage" }
        ]
    },

    // ==========================================
    // BLOOD RITUAL - AoE pulse, +HP on kill
    // ==========================================
    "blood_ritual": {
        id: "blood_ritual",
        name: "Blood Ritual",
        description: "Pulses damage, chance to gain +1 Max HP on kill",
        animationName: "Blood Ritual",
        type: "universal",
        weaponType: "pulse",
        baseDamage: 24,  // 2x
        baseCooldown: 1.8,
        baseRange: 280,
        hpGainChance: 0.05,  // 5% chance
        damagePerLevel: 4,
        cooldownReduction: 0.12,
        effectDuration: 0.4,
        upgrades: [
            { damage: 4, cooldown: 0, desc: "+4 Pulse Damage" },
            { damage: 0, cooldown: 0.15, desc: "-0.15s Cooldown" },
            { damage: 3, cooldown: 0.1, desc: "+3 Damage, -0.1s CD" },
            { damage: 0, cooldown: 0, hpChance: 0.02, desc: "+2% HP Gain Chance" },
            { damage: 6, cooldown: 0, desc: "+6 Pulse Damage" }
        ]
    },

    // ==========================================
    // BOOMERANG - Returning projectile
    // ==========================================
    "boomerang": {
        id: "boomerang",
        name: "Boomerang",
        description: "Thrown projectile that returns, hitting twice",
        animationName: "Boomerang",
        type: "universal",
        weaponType: "returning",
        baseDamage: 20,  // 2x
        baseCooldown: 1.5,
        baseRange: 350,
        baseProjectiles: 1,  // starts with 1 boomerang
        damagePerLevel: 4,
        cooldownReduction: 0.1,
        effectDuration: 0,
        upgrades: [
            { damage: 4, cooldown: 0, desc: "+4 Damage" },
            { damage: 0, cooldown: 0, projectiles: 1, desc: "+1 Boomerang (2 directions)" },
            { damage: 3, cooldown: 0.1, desc: "+3 Damage, -0.1s CD" },
            { damage: 0, cooldown: 0, projectiles: 1, desc: "+1 Boomerang (3 directions)" },
            { damage: 5, cooldown: 0.1, desc: "+5 Damage, -0.1s CD" },
            { damage: 0, cooldown: 0, projectiles: 1, desc: "+1 Boomerang (4 directions)" },
            { damage: 6, cooldown: 0.15, desc: "+6 Damage, -0.15s CD" }
        ]
    },

    // ==========================================
    // LONGBOW - Piercing arrows
    // ==========================================
    "longbow": {
        id: "longbow",
        name: "Longbow",
        description: "Fires piercing arrows through enemies",
        animationName: "Longbow",
        type: "universal",
        weaponType: "piercing_projectile",
        baseDamage: 24,  // 2x
        baseCooldown: 1.3,
        baseRange: 500,
        pierceCount: 3,
        damagePerLevel: 10,  // Buffed
        cooldownReduction: 0.15,
        effectDuration: 0,
        upgrades: [
            { damage: 12, cooldown: 0, desc: "+12 Damage" },
            { damage: 0, cooldown: 0.15, desc: "-0.15s Cooldown" },
            { damage: 10, cooldown: 0.1, desc: "+10 Damage, -0.1s CD" },
            { damage: 0, cooldown: 0, pierce: 2, desc: "+2 Pierce" },
            { damage: 15, cooldown: 0, desc: "+15 Damage" }
        ]
    },

    // ==========================================
    // PISTOL - Burst fire, crit scaling
    // ==========================================
    "pistol": {
        id: "pistol",
        name: "Pistol",
        description: "Fires burst of bullets with high crit chance",
        animationName: "Pistol",
        type: "universal",
        weaponType: "burst",
        baseDamage: 10,  // 2x
        baseCooldown: 1.0,
        baseRange: 300,
        burstCount: 6,
        critChance: 0.15,
        damagePerLevel: 2,
        cooldownReduction: 0.08,
        effectDuration: 0,
        upgrades: [
            { damage: 2, cooldown: 0, desc: "+2 Damage/bullet" },
            { damage: 0, cooldown: 0.1, desc: "-0.1s Cooldown" },
            { damage: 1, cooldown: 0.05, desc: "+1 Damage, -0.05s CD" },
            { damage: 0, cooldown: 0, crit: 0.05, desc: "+5% Crit Chance" },
            { damage: 3, cooldown: 0, desc: "+3 Damage/bullet" }
        ]
    },

    // ==========================================
    // SPINNING AXE - Orbiting projectiles
    // ==========================================
    "spinning_axe": {
        id: "spinning_axe",
        name: "Spinning Axe",
        description: "Throws 2 spinning axes that hit on each rotation",
        animationName: "Spinning Axe",
        type: "universal",
        weaponType: "orbit",
        baseDamage: 28,  // Buffed from 16
        baseCooldown: 1.6,  // Faster from 2.0
        baseRange: 450,
        orbitCount: 3,  // 3 axes from 2
        orbitDuration: 3.0,
        damagePerLevel: 4,  // Buffed from 3
        cooldownReduction: 0.12,
        effectDuration: 0,
        upgrades: [
            { damage: 3, cooldown: 0, desc: "+3 Damage" },
            { damage: 2, cooldown: 0, axeCount: 1, desc: "+2 Damage, +1 Axe" },
            { damage: 0, cooldown: 0.2, desc: "-0.2s Cooldown" },
            { damage: 3, cooldown: 0.15, desc: "+3 Damage, -0.15s CD" },
            { damage: 4, cooldown: 0, axeCount: 2, desc: "+4 Damage, +2 Axes" }
        ]
    },

    // ==========================================
    // BONE THROW - Bouncing projectile
    // ==========================================
    "bone_throw": {
        id: "bone_throw",
        name: "Bone Throw",
        description: "Throws bones that bounce between enemies",
        animationName: "Bone Throw",
        type: "universal",
        weaponType: "bouncing",
        baseDamage: 22,  // 2x
        baseCooldown: 1.8,
        baseRange: 300,
        bounceCount: 2,
        damagePerLevel: 4,
        cooldownReduction: 0.12,
        effectDuration: 0,
        upgrades: [
            { damage: 4, cooldown: 0, desc: "+4 Damage" },
            { damage: 0, cooldown: 0, bounce: 1, desc: "+1 Bounce" },
            { damage: 3, cooldown: 0.15, desc: "+3 Damage, -0.15s CD" },
            { damage: 0, cooldown: 0, bounce: 1, desc: "+1 Bounce" },
            { damage: 6, cooldown: 0, bounce: 1, desc: "+6 Damage, +1 Bounce" }
        ]
    },

    // ==========================================
    // SNIPER - High damage, piercing, long range
    // ==========================================
    "sniper": {
        id: "sniper",
        name: "Sniper",
        description: "Extremely high damage piercing shot",
        animationName: "Sniper",
        type: "universal",
        weaponType: "sniper",
        baseDamage: 90,  // 2x
        baseCooldown: 3.0,
        baseRange: 800,
        damagePerLevel: 15,
        cooldownReduction: 0.2,
        effectDuration: 0,
        upgrades: [
            { damage: 15, cooldown: 0, desc: "+15 Damage" },
            { damage: 0, cooldown: 0.25, desc: "-0.25s Cooldown" },
            { damage: 10, cooldown: 0.15, desc: "+10 Damage, -0.15s CD" },
            { damage: 20, cooldown: 0, desc: "+20 Damage" },
            { damage: 0, cooldown: 0.3, desc: "-0.3s Cooldown" }
        ]
    },

    // ==========================================
    // FROST TRAIL - Freeze path like fire trail
    // ==========================================
    "frost_trail": {
        id: "frost_trail",
        name: "Frost Trail",
        description: "Creates an icy path that freezes enemies",
        animationName: "Frost Trail",
        type: "universal",
        weaponType: "frost_path",  // like fire_path but freezes
        baseDamage: 0,  // no damage, just freeze
        baseCooldown: 3.0,
        pathLength: 319,
        pathWidth: 75,
        pathDuration: 4.0,
        freezeDuration: 1.5,  // freeze enemies for 1.5s
        tickRate: 0.3,
        damagePerLevel: 0,
        durationPerLevel: 0.5,
        effectDuration: 0,
        upgrades: [
            { damage: 0, cooldown: 0, freeze: 0.3, desc: "+0.3s Freeze Duration" },
            { damage: 0, cooldown: 0.3, desc: "-0.3s Cooldown" },
            { damage: 0, cooldown: 0, freeze: 0.3, duration: 0.5, desc: "+0.3s Freeze, +0.5s Path" },
            { damage: 0, cooldown: 0, freeze: 0.4, desc: "+0.4s Freeze Duration" },
            { damage: 0, cooldown: 0.5, freeze: 0.5, desc: "-0.5s CD, +0.5s Freeze" }
        ]
    },

    // ==========================================
    // SEEKING DAGGER - Auto-targeting daggers
    // ==========================================
    "seeking_dagger": {
        id: "seeking_dagger",
        name: "Seeking Dagger",
        description: "Daggers automatically seek nearby enemies",
        animationName: "Seeking Dagger",
        type: "universal",
        weaponType: "homing",
        baseDamage: 18,  // 2x
        baseCooldown: 1.2,
        baseRange: 350,
        bounceCount: 1,
        damagePerLevel: 3,
        cooldownReduction: 0.1,
        effectDuration: 0,
        upgrades: [
            { damage: 3, cooldown: 0, desc: "+3 Damage" },
            { damage: 0, cooldown: 0.1, desc: "-0.1s Cooldown" },
            { damage: 2, cooldown: 0.08, desc: "+2 Damage, -0.08s CD" },
            { damage: 0, cooldown: 0, bounce: 1, desc: "+1 Bounce" },
            { damage: 5, cooldown: 0, desc: "+5 Damage" }
        ]
    },

    // ==========================================
    // FIRE STAFF - Exploding fireballs
    // ==========================================
    "fire_staff": {
        id: "fire_staff",
        name: "Fire Staff",
        description: "Launches fireballs that explode on impact",
        animationName: "Fire Staff",
        type: "universal",
        weaponType: "explosive",
        baseDamage: 30,  // 2x
        baseCooldown: 1.5,
        baseRange: 400,
        explosionRadius: 150,
        damagePerLevel: 5,
        cooldownReduction: 0.1,
        effectDuration: 0.4,
        upgrades: [
            { damage: 5, cooldown: 0, desc: "+5 Explosion Damage" },
            { damage: 0, cooldown: 0.12, desc: "-0.12s Cooldown" },
            { damage: 4, cooldown: 0.08, desc: "+4 Damage, -0.08s CD" },
            { damage: 0, cooldown: 0, radius: 20, desc: "+20 Explosion Radius" },
            { damage: 7, cooldown: 0, desc: "+7 Explosion Damage" }
        ]
    },

    // ==========================================
    // SWORD - Basic melee slash
    // ==========================================
    "sword": {
        id: "sword",
        name: "Sword",
        description: "Heavy slash with long reach",
        animationName: "Sword",
        type: "universal",
        weaponType: "melee",
        baseDamage: 50,  // Buffed feel: slower but heavy hit
        baseCooldown: 1.2,  // Faster from 2.0 to differentiate from swift_blade
        baseRange: 240,
        damagePerLevel: 7,
        cooldownReduction: 0.08,
        effectDuration: 0.25,
        upgrades: [
            { damage: 6, cooldown: 0, desc: "+6 Damage" },
            { damage: 0, cooldown: 0.1, desc: "-0.1s Cooldown" },
            { damage: 5, cooldown: 0.08, desc: "+5 Damage, -0.08s CD" },
            { damage: 8, cooldown: 0, desc: "+8 Damage" },
            { damage: 0, cooldown: 0.12, desc: "-0.12s Cooldown" }
        ]
    },

    // ==========================================
    // CYCLONE - Knockback projectiles
    // ==========================================
    "cyclone": {
        id: "cyclone",
        name: "Cyclone",
        description: "Sends tornados that push enemies away",
        animationName: "Cyclone",
        type: "universal",
        weaponType: "knockback",
        baseDamage: 22,  // Buffed from 16
        baseCooldown: 1.5,  // Faster from 2.0
        baseRange: 280,
        knockbackForce: 200,  // Stronger knockback
        damagePerLevel: 4,  // Buffed from 3
        cooldownReduction: 0.12,
        effectDuration: 0,
        upgrades: [
            { damage: 3, cooldown: 0, desc: "+3 Damage" },
            { damage: 0, cooldown: 0.2, desc: "-0.2s Cooldown" },
            { damage: 2, cooldown: 0.1, desc: "+2 Damage, -0.1s CD" },
            { damage: 0, cooldown: 0, knockback: 50, desc: "+50 Knockback" },
            { damage: 5, cooldown: 0, desc: "+5 Damage" }
        ]
    }
};

// Get weapon data by ID
export function getWeaponData(weaponId) {
    return WEAPONS[weaponId] || null;
}

// Get all weapons available for a hero (all are universal now)
export function getWeaponsForHero(heroId) {
    return Object.values(WEAPONS);
}

// Get all universal weapons
export function getUniversalWeapons() {
    return Object.values(WEAPONS);
}

// Calculate weapon stats at a specific level
export function getWeaponStatsAtLevel(weaponId, level) {
    const weapon = WEAPONS[weaponId];
    if (!weapon) return null;

    level = Math.max(1, Math.min(8, level));
    const levelBonus = level - 1;

    // Calculate bonuses from upgrades
    let hpChanceBonus = 0;
    let axeCountBonus = 0;
    let bounceBonus = 0;
    let projectilesBonus = 0;
    if (weapon.upgrades && levelBonus > 0) {
        for (let i = 0; i < Math.min(levelBonus, weapon.upgrades.length); i++) {
            if (weapon.upgrades[i].hpChance) {
                hpChanceBonus += weapon.upgrades[i].hpChance;
            }
            if (weapon.upgrades[i].axeCount) {
                axeCountBonus += weapon.upgrades[i].axeCount;
            }
            if (weapon.upgrades[i].bounce) {
                bounceBonus += weapon.upgrades[i].bounce;
            }
            if (weapon.upgrades[i].projectiles) {
                projectilesBonus += weapon.upgrades[i].projectiles;
            }
        }
    }

    return {
        damage: weapon.baseDamage + (weapon.damagePerLevel * levelBonus),
        cooldown: Math.max(0.1, weapon.baseCooldown - ((weapon.cooldownReduction || 0) * levelBonus)),
        range: (weapon.baseRange || 200) + ((weapon.rangePerLevel || 0) * levelBonus),
        hpGainChance: (weapon.hpGainChance || 0) + hpChanceBonus,
        axeCount: (weapon.orbitCount || 2) + axeCountBonus,
        bounceCount: (weapon.bounceCount || 0) + bounceBonus,
        projectileCount: (weapon.baseProjectiles || 1) + projectilesBonus,
        level: level
    };
}

// Get random upgrade for a weapon
export function getRandomUpgrade(weaponId) {
    const weapon = WEAPONS[weaponId];
    if (!weapon || !weapon.upgrades) return null;
    const randomIndex = Math.floor(Math.random() * weapon.upgrades.length);
    return weapon.upgrades[randomIndex];
}

// Get all weapon IDs
export function getAllWeaponIds() {
    return Object.keys(WEAPONS);
}

// Default equipped weapons (3 slots)
export const DEFAULT_EQUIPPED = {
    0: "lightning_staff",
    1: "soul_aura",
    2: "inferno_trail"
};

// Default available weapon for ALL characters (appears in level-up, not pre-equipped)
export const DEFAULT_AVAILABLE_WEAPON = "lightning_staff";

// ============================================
// WEAPON EVOLUTION - Item + Max Level Weapon = Evolved Weapon
// ============================================

export const EVOLUTIONS = {
    // weaponId: { requiredItem, evolvedName, bonusDesc, damageBoost, cooldownBoost, specialEffect }
    "lightning_staff": {
        requiredItem: "focus_crystal",
        evolvedName: "Thunder God Staff",
        bonusDesc: "Chains to 6 enemies, +50% damage",
        damageBoost: 1.5,
        cooldownBoost: 0.8,
        specialEffect: "chain6"
    },
    "fire_staff": {
        requiredItem: "power_core",
        evolvedName: "Infernal Orb",
        bonusDesc: "Double explosion radius, +40% damage",
        damageBoost: 1.4,
        cooldownBoost: 0.85,
        specialEffect: "bigExplosion"
    },
    "longbow": {
        requiredItem: "winged_sandals",
        evolvedName: "Gale Bow",
        bonusDesc: "Pierces all enemies, +30% damage",
        damageBoost: 1.3,
        cooldownBoost: 0.7,
        specialEffect: "infinitePierce"
    },
    "pistol": {
        requiredItem: "fractured_lens",
        evolvedName: "Golden Revolver",
        bonusDesc: "12 bullets, 30% crit, +50% damage",
        damageBoost: 1.5,
        cooldownBoost: 0.75,
        specialEffect: "doubleBurst"
    },
    "soul_aura": {
        requiredItem: "serpents_fang",
        evolvedName: "Plague Aura",
        bonusDesc: "Poisons all enemies in range, +60% damage",
        damageBoost: 1.6,
        cooldownBoost: 0.7,
        specialEffect: "poisonAura"
    },
    "sword": {
        requiredItem: "beer",
        evolvedName: "Berserker Blade",
        bonusDesc: "Hits all enemies in range, +80% damage",
        damageBoost: 1.8,
        cooldownBoost: 0.6,
        specialEffect: "cleave"
    },
    "spinning_axe": {
        requiredItem: "stone_of_resilience",
        evolvedName: "Storm Axes",
        bonusDesc: "6 axes, +40% damage",
        damageBoost: 1.4,
        cooldownBoost: 0.75,
        specialEffect: "moreAxes"
    },
    "seeking_dagger": {
        requiredItem: "tempo_metronome",
        evolvedName: "Shadow Blades",
        bonusDesc: "3 daggers per cast, +50% damage",
        damageBoost: 1.5,
        cooldownBoost: 0.6,
        specialEffect: "tripleDagger"
    }
};

// Check if a weapon can evolve
export function canEvolve(weaponId, itemInventory) {
    const evo = EVOLUTIONS[weaponId];
    if (!evo) return false;
    return (itemInventory[evo.requiredItem] || 0) > 0;
}

// Get evolution data
export function getEvolution(weaponId) {
    return EVOLUTIONS[weaponId] || null;
}

console.log("[WeaponData] Loaded", Object.keys(WEAPONS).length, "weapons,", Object.keys(EVOLUTIONS).length, "evolutions!");
