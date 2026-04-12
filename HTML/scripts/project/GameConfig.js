// ============================================
// GAME CONFIGURATION - All game constants
// Version: 1.0.1 - Railway Auto-Deploy Enabled
// ============================================

// Viewport
export const VIEWPORT_WIDTH = 1080;
export const VIEWPORT_HEIGHT = 1920;

// Player defaults - start weak, grow strong!
export const PLAYER_DEFAULT_HEALTH = 100;
export const PLAYER_DEFAULT_SPEED = 300;  // Good start
export const PLAYER_DEFAULT_DAMAGE = 20;  // 2x base
export const PLAYER_DEFAULT_ATTACK_SPEED = 1.5; // attacks per second

// Enemy defaults
export const ENEMY_BASE_HEALTH = 15;
export const ENEMY_BASE_SPEED = 120;
export const ENEMY_SPEED_VARIANCE = 40;
export const ENEMY_BASE_DAMAGE = 5;
export const ENEMY_XP_VALUE = 15;  // Base enemy XP
export const ENEMY_SPAWN_DISTANCE_MIN = 600;
export const ENEMY_SPAWN_DISTANCE_MAX = 800;
export const ENEMY_COLLISION_RADIUS = 80;

// Enemy5 (Fast Melee) - Spawns at level 4 for early variety
export const ENEMY5_MIN_LEVEL = 4;  // Start spawning at player level 4
export const ENEMY5_BASE_HEALTH = 18;
export const ENEMY5_BASE_SPEED = 140;  // Faster than Enemy2
export const ENEMY5_SPEED_VARIANCE = 30;
export const ENEMY5_BASE_DAMAGE = 8;
export const ENEMY5_XP_VALUE = 40;  // More XP for late-game leveling
export const ENEMY5_SPAWN_CHANCE = 0.10;  // 10% chance when eligible

// Enemy2 (Goblin Warrior) - Stronger, spawns at level 7+
export const ENEMY2_MIN_LEVEL = 7;  // Start spawning at player level 7 (was 12)
export const ENEMY2_BASE_HEALTH = 25;  // Stronger than Enemy but manageable
export const ENEMY2_BASE_SPEED = 100;
export const ENEMY2_SPEED_VARIANCE = 30;
export const ENEMY2_BASE_DAMAGE = 12;  // Higher damage
export const ENEMY2_XP_VALUE = 55;  // More XP for late-game leveling
export const ENEMY2_SPAWN_CHANCE = 0.08;  // 8% chance when eligible

// Enemy4 (Archer) - Ranged enemy, spawns at level 5+
export const ENEMY4_MIN_LEVEL = 5;  // Earlier spawn
export const ENEMY4_BASE_HEALTH = 12;  // Low health (fragile)
export const ENEMY4_BASE_SPEED = 90;  // Slower, ranged attacker
export const ENEMY4_SPEED_VARIANCE = 20;
export const ENEMY4_BASE_DAMAGE = 5;  // Fixed archer damage, no scaling
export const ENEMY4_XP_VALUE = 50;  // More XP for late-game leveling
export const ENEMY4_SPAWN_CHANCE = 0.03;  // 3% chance (very rare)
export const ENEMY4_ATTACK_RANGE = 600;  // Attack range (longer)
export const ENEMY4_ATTACK_COOLDOWN = 2.5;  // Seconds between attacks
export const ENEMY4_PROJECTILE_SPEED = 500;  // Fast arrow
export const ENEMY4_HOMING_STRENGTH = 4.0;  // How strongly arrow tracks player

// Enemy3 (Bat) - Very fast swarm enemy, low damage, spawns at level 6+
export const ENEMY3_MIN_LEVEL = 6;  // Start spawning at player level 6 (was 14)
export const ENEMY3_MIN_TIME = 0;   // No time requirement
export const ENEMY3_BASE_HEALTH = 20;  // Weakest, but hard to hit
export const ENEMY3_BASE_SPEED = 200;  // Fast but manageable
export const ENEMY3_SPEED_VARIANCE = 60;
export const ENEMY3_BASE_DAMAGE = 8;  // Low damage
export const ENEMY3_XP_VALUE = 35;  // More XP for late-game leveling
export const ENEMY3_SPAWN_CHANCE = 0.12;  // 12% chance when eligible

// Enemy6 (Heavy Brute) - Slow but high damage tank, spawns at level 3+
export const ENEMY6_MIN_LEVEL = 3;  // Start spawning at player level 3
export const ENEMY6_BASE_HEALTH = 50;  // Tanky
export const ENEMY6_BASE_SPEED = 60;  // Very slow
export const ENEMY6_SPEED_VARIANCE = 15;
export const ENEMY6_BASE_DAMAGE = 25;  // High damage!
export const ENEMY6_XP_VALUE = 60;  // Good XP reward
export const ENEMY6_SPAWN_CHANCE = 0.02;  // 2% chance - very rare!

// Enemy7 (Fire Mage) - Ranged, throws fireballs from above, spawns at level 5+
export const ENEMY7_MIN_LEVEL = 5;  // Start spawning at player level 5
export const ENEMY7_BASE_HEALTH = 25;  // Medium health
export const ENEMY7_BASE_SPEED = 70;  // Slow, stays at range
export const ENEMY7_SPEED_VARIANCE = 15;
export const ENEMY7_BASE_DAMAGE = 18;  // Fireball damage
export const ENEMY7_XP_VALUE = 45;  // Good XP
export const ENEMY7_SPAWN_CHANCE = 0.07;  // 7% chance
export const ENEMY7_ATTACK_RANGE = 500;  // Attack range
export const ENEMY7_ATTACK_COOLDOWN = 3.0;  // Seconds between fireballs
export const ENEMY7_FIREBALL_SPEED = 350;  // Falling speed
export const ENEMY7_FIREBALL_RADIUS = 120;  // Explosion/hit radius - bigger danger zone

// Enemy8 (Tank) - Very tanky, high damage, slow, spawns at level 8+
export const ENEMY8_MIN_LEVEL = 8;  // Start spawning at player level 8
export const ENEMY8_BASE_HEALTH = 200;  // Very tanky!
export const ENEMY8_BASE_SPEED = 50;  // Very slow
export const ENEMY8_SPEED_VARIANCE = 10;
export const ENEMY8_BASE_DAMAGE = 30;  // High damage!
export const ENEMY8_XP_VALUE = 80;  // Great XP reward
export const ENEMY8_SPAWN_CHANCE = 0.03;  // 3% chance - rare

// Boss settings
export const BOSS_SPAWN_LEVEL = 12;  // Boss spawns at level 12
export const BOSS_HEALTH = 5000;
export const BOSS_SPEED = 120;  // Faster than normal enemies
export const BOSS_DAMAGE = 35;  // More impactful
export const BOSS_XP_VALUE = 200;
export const BOSS_COLLISION_RADIUS = 180;  // Larger for better damage feel

// Combat
export const BULLET_SPEED = 2000;  // Super fast projectiles
export const BULLET_COLLISION_RADIUS = 35;  // Slightly bigger hitbox
export const BULLET_DESTROY_DISTANCE = 1500;
export const ATTACK_RANGE = 600;  // Longer attack range

// XP & Leveling
export const XP_TO_FIRST_LEVEL = 50;  // Halved for faster leveling
export const XP_LEVEL_MULTIPLIER = 1.5;
export const GEM_PICKUP_RADIUS = 80;
export const GEM_ATTRACT_RADIUS = 200;
export const GEM_ATTRACT_SPEED = 800;  // Normal pickup speed

// Spawning
export const INITIAL_SPAWN_RATE = 1.0; // seconds - fast initial spawn
export const MIN_SPAWN_RATE = 0.25;  // Can get very fast
export const INITIAL_MAX_ENEMIES = 45;  // Good enemy count
export const MAX_ENEMIES_CAP = 90;  // Dynamic scaling can push to ~120
export const LEVEL3_SPAWN_BOOST = 0.55;  // 45% faster spawn at level 3+

// Gold drops (same for all enemy types)
export const GOLD_DROP_CHANCE = 0.10;         // 10% chance for all enemies
export const GOLD_DROP_CHANCE_BOSS = 1.0;     // 100% from boss
export const GOLD_VALUE = 1;                  // All enemies drop 1 gold
export const GOLD_VALUE_BOSS = 10;
export const GOLD_PICKUP_RADIUS = 60;
export const GOLD_ATTRACT_RADIUS = 150;
export const GOLD_ATTRACT_SPEED = 900;  // Normal pickup speed
export const GOLD_TEXT_DURATION = 1.5;  // seconds before +gold text fades

// Difficulty scaling - faster progression
export const DIFFICULTY_INCREASE_INTERVAL = 20; // seconds - faster scaling
export const DIFFICULTY_MULTIPLIER_INCREMENT = 0.25;  // Bigger jumps
export const SPAWN_RATE_DECREASE_TIME = 60; // seconds to reach min spawn rate - faster chaos

// Joystick
export const JOYSTICK_BASE_X = 200;
export const JOYSTICK_BASE_Y = 1700;
export const JOYSTICK_MAX_RADIUS = 120;  // Enlarged from 80 for better control

// UI
export const HP_BAR_WIDTH = 150;  // Fill width
export const HP_BAR_HEIGHT = 36;  // Fill height
export const HP_BAR_BG_WIDTH = 180;  // BG wider for padding
export const HP_BAR_BG_HEIGHT = 52;
export const EXP_BAR_WIDTH = 996;

// Upgrade values - HUGE power spikes!
export const UPGRADES = [
    { type: 'damage', name: 'Attack Power', desc: '+15 Damage', value: 15 },
    { type: 'speed', name: 'Movement Speed', desc: '+70 Speed', value: 70 },
    { type: 'attackspeed', name: 'Attack Speed', desc: '+0.5 Attacks/sec', value: 0.5 },
    { type: 'health', name: 'Max Health', desc: '+40 HP', value: 40 }
];

console.log("[GameConfig] Configuration loaded!");
