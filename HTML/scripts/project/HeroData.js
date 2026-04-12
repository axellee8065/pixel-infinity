// ============================================
// HERO DATA - Hero definitions and stats
// ============================================

// Attack types
export const ATTACK_TYPE = {
    RANGED: "ranged",    // Shoots projectiles
    MELEE: "melee"       // Slash attack hitting nearby enemies
};

// Hero definitions - 8 playable characters
export const HEROES = {
    // ==========================================
    // MAGE - Balanced caster, Fire Staff
    // ==========================================
    mage: {
        id: "mage",
        name: "Mage",
        description: "A powerful mage who wields fire magic.",
        attackType: ATTACK_TYPE.RANGED,
        ability: "+10% Attack Speed",
        color: "#3498db",  // Blue
        animPrefix: "mage",
        defaultWeapon: "fire_staff",
        stats: {
            health: 120,
            speed: 300,
            damage: 25,
            attackSpeed: 1.1,  // +10% from passive
            critChance: 0,
            critMultiplier: 2.0
        },
        passive: "attackSpeed",  // +10% attack speed
        passiveValue: 0.1,
        unlocked: true,
        unlockCost: 0
    },

    // ==========================================
    // ARCHER - Fast & fragile, Longbow
    // ==========================================
    archer: {
        id: "archer",
        name: "Archer",
        description: "Swift ranger with piercing arrows. Fast but fragile.",
        attackType: ATTACK_TYPE.RANGED,
        ability: "+25% Movement Speed",
        color: "#27ae60",  // Green
        animPrefix: "archer",
        defaultWeapon: "longbow",
        stats: {
            health: 100,  // Lowest HP - glass cannon
            speed: 375,   // Fastest character
            damage: 22,
            attackSpeed: 1.2,
            critChance: 0,
            critMultiplier: 2.0
        },
        passive: "speed",  // +25% movement speed
        passiveValue: 0.25,
        unlocked: true,
        unlockCost: 0
    },

    // ==========================================
    // COWBOY - Crit specialist, Pistol
    // ==========================================
    cowboy: {
        id: "cowboy",
        name: "Cowboy",
        description: "Gunslinger with deadly precision. Crits deal 3x damage!",
        attackType: ATTACK_TYPE.RANGED,
        ability: "+20% Crit Chance, 3x Crit Damage",
        color: "#d35400",  // Orange/Brown
        animPrefix: "cowboy",
        defaultWeapon: "pistol",
        stats: {
            health: 110,
            speed: 310,
            damage: 18,
            attackSpeed: 1.3,
            critChance: 20,      // High base crit!
            critMultiplier: 3.0  // 3x crit damage instead of 2x!
        },
        passive: "critMaster",  // Enhanced crit
        passiveValue: 0,
        unlocked: true,
        unlockCost: 0
    },

    // ==========================================
    // SNIPER - High damage, slow, Sniper rifle
    // ==========================================
    sniper: {
        id: "sniper",
        name: "Sniper",
        description: "Patient marksman. Massive damage but slow attacks.",
        attackType: ATTACK_TYPE.RANGED,
        ability: "+50% Damage",
        color: "#2c3e50",  // Dark blue
        animPrefix: "sniper",
        defaultWeapon: "sniper",
        stats: {
            health: 105,
            speed: 280,
            damage: 45,   // Highest base damage
            attackSpeed: 0.7,  // Slowest attack
            critChance: 0,
            critMultiplier: 2.5
        },
        passive: "damage",  // +50% damage
        passiveValue: 0.5,
        unlocked: false,
        unlockCost: 500
    },

    // ==========================================
    // VAMPIRE - Lifesteal, Blood Ritual
    // ==========================================
    vampire: {
        id: "vampire",
        name: "Vampire",
        description: "Dark lord who heals 1 HP per hit. Sustain master!",
        attackType: ATTACK_TYPE.RANGED,
        ability: "Lifesteal: +1 HP per hit",
        color: "#8e44ad",  // Purple
        animPrefix: "vampire",
        defaultWeapon: "blood_ritual",
        stats: {
            health: 130,
            speed: 290,
            damage: 20,
            attackSpeed: 1.0,
            critChance: 0,
            critMultiplier: 2.0
        },
        passive: "lifesteal",  // Heal 1 HP per hit
        passiveValue: 1,
        unlocked: false,
        unlockCost: 750
    },

    // ==========================================
    // SKELETON - Bone thrower, Bone Throw
    // ==========================================
    skeleton: {
        id: "skeleton",
        name: "Skeleton",
        description: "Undead warrior with bouncing bones. +15% XP gain!",
        attackType: ATTACK_TYPE.RANGED,
        ability: "+15% XP Gain",
        color: "#bdc3c7",  // Gray/White
        animPrefix: "skeleton",
        defaultWeapon: "bone_throw",
        stats: {
            health: 115,
            speed: 300,
            damage: 22,
            attackSpeed: 1.1,
            critChance: 0,
            critMultiplier: 2.0
        },
        passive: "xpBonus",  // +15% XP gain
        passiveValue: 0.15,
        unlocked: false,
        unlockCost: 600
    },

    // ==========================================
    // VIKING - High damage melee, Spinning Axe
    // ==========================================
    viking: {
        id: "viking",
        name: "Viking",
        description: "Brutal warrior with spinning axes. +30% weapon damage!",
        attackType: ATTACK_TYPE.MELEE,
        ability: "+30% Weapon Damage",
        color: "#c0392b",  // Red
        animPrefix: "viking",
        defaultWeapon: "spinning_axe",
        stats: {
            health: 150,
            speed: 270,   // Slower
            damage: 35,   // High base damage
            attackSpeed: 0.9,
            critChance: 0,
            critMultiplier: 2.0
        },
        passive: "weaponDamage",  // +30% weapon damage
        passiveValue: 0.3,
        unlocked: false,
        unlockCost: 800
    },

    // ==========================================
    // PALADIN - Tank, Guardian Shield + Basic Attack
    // ==========================================
    paladin: {
        id: "paladin",
        name: "Paladin",
        description: "Holy knight with shields. Highest HP, basic melee attack.",
        attackType: ATTACK_TYPE.MELEE,
        ability: "+50% Max Health",
        color: "#f1c40f",  // Gold
        animPrefix: "paladin",
        defaultWeapon: "guardian_shield",
        stats: {
            health: 180,  // Highest HP!
            speed: 260,   // Slowest
            damage: 28,
            attackSpeed: 0.8,
            critChance: 0,
            critMultiplier: 2.0
        },
        passive: "tank",  // +50% max health
        passiveValue: 0.5,
        hasPaladinAttack: true,  // Special flag for basic melee attack
        unlocked: false,
        unlockCost: 1000
    }
};

// Legacy hero ID mapping (hero1 -> mage, hero2 -> archer, etc.)
const LEGACY_ID_MAP = {
    "hero1": "mage",
    "hero2": "archer",
    "hero3": "cowboy",
    "hero4": "sniper"
};

// Get hero by ID (supports both new and legacy IDs)
export function getHero(heroId) {
    // Check legacy mapping
    if (LEGACY_ID_MAP[heroId]) {
        heroId = LEGACY_ID_MAP[heroId];
    }
    return HEROES[heroId] || HEROES.mage;
}

// Get all heroes as array
export function getAllHeroes() {
    return Object.values(HEROES);
}

// Get hero stats with passive abilities applied
export function getHeroStats(heroId) {
    const hero = getHero(heroId);
    const stats = { ...hero.stats };

    // Apply passive ability bonuses
    switch (hero.passive) {
        case "attackSpeed":
            stats.attackSpeed *= (1 + hero.passiveValue);
            break;
        case "speed":
            stats.speed *= (1 + hero.passiveValue);
            break;
        case "damage":
            stats.damage *= (1 + hero.passiveValue);
            break;
        case "tank":
            stats.health *= (1 + hero.passiveValue);
            break;
        // critMaster, lifesteal, xpBonus, weaponDamage are handled elsewhere
    }

    return stats;
}

// Get hero passive info
export function getHeroPassive(heroId) {
    const hero = getHero(heroId);
    return {
        type: hero.passive,
        value: hero.passiveValue
    };
}

// Check if hero has specific passive
export function hasPassive(heroId, passiveType) {
    const hero = getHero(heroId);
    return hero.passive === passiveType;
}

// Check if hero uses ranged attacks
export function isRangedHero(heroId) {
    return getHero(heroId).attackType === ATTACK_TYPE.RANGED;
}

// Check if hero uses melee attacks
export function isMeleeHero(heroId) {
    return getHero(heroId).attackType === ATTACK_TYPE.MELEE;
}

// Get hero animation prefix (mage, archer, etc.)
export function getAnimPrefix(heroId) {
    return getHero(heroId).animPrefix || "mage";
}

// Get hero's default weapon
export function getDefaultWeapon(heroId) {
    return getHero(heroId).defaultWeapon || "fire_staff";
}

// Check if hero needs paladin basic attack
export function needsPaladinAttack(heroId) {
    return getHero(heroId).hasPaladinAttack === true;
}

console.log("[HeroData] Module loaded with", Object.keys(HEROES).length, "heroes!");
