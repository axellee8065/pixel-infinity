// ============================================
// VAMPIRE SURVIVORS CLONE - MAIN ENTRY POINT
// ============================================

// Import all modules
import * as GameConfig from "./GameConfig.js";
import * as GameState from "./GameState.js";
import * as InputManager from "./InputManager.js";
import * as PlayerController from "./PlayerController.js";
import * as EnemyManager from "./EnemyManager.js";
import * as CombatSystem from "./CombatSystem.js";
import * as XPSystem from "./XPSystem.js";
import * as LevelUpManager from "./LevelUpManager.js";
import * as UIManager from "./UIManager.js";
import * as DifficultyManager from "./DifficultyManager.js";
import * as SaveManager from "./SaveManager.js";
import * as HeroData from "./HeroData.js";
import * as LobbyManager from "./LobbyManager.js";
import * as HeroSelection from "./HeroSelection.js";
import * as MeleeAttack from "./MeleeAttack.js";
import * as ResponsiveScale from "./ResponsiveScale.js";
import * as BossManager from "./BossManager.js";
import * as DamageEffects from "./DamageEffects.js";
import * as GoldSystem from "./GoldSystem.js";
import * as WeaponSystem from "./WeaponSystem.js";
import * as WeaponData from "./WeaponData.js";
import * as SilverSystem from "./SilverSystem.js";
import * as ItemSystem from "./ItemSystem.js";
import * as DamageCalculator from "./DamageCalculator.js";
import * as StatusEffects from "./StatusEffects.js";
import * as ChestSystem from "./ChestSystem.js";
import * as StatsDisplay from "./StatsDisplay.js";
import * as MetaUI from "./MetaUI.js";
import * as i18n from "./i18n.js";
import * as NetworkManager from "./NetworkManager.js";
import * as AuthUI from "./AuthUI.js";

// Expose modules to globalThis for debugging/event sheets
// Detect language on load
i18n.detectLanguage();

globalThis.GameConfig = GameConfig;
globalThis.MetaUI = MetaUI;
globalThis.i18n = i18n;
globalThis.NetworkManager = NetworkManager;
globalThis.AuthUI = AuthUI;
globalThis.GameState = GameState;
globalThis.InputManager = InputManager;
globalThis.PlayerController = PlayerController;
globalThis.EnemyManager = EnemyManager;
globalThis.CombatSystem = CombatSystem;
globalThis.XPSystem = XPSystem;
globalThis.LevelUpManager = LevelUpManager;
globalThis.UIManager = UIManager;
globalThis.DifficultyManager = DifficultyManager;
globalThis.SaveManager = SaveManager;
globalThis.HeroData = HeroData;
globalThis.LobbyManager = LobbyManager;
globalThis.HeroSelection = HeroSelection;
globalThis.MeleeAttack = MeleeAttack;
globalThis.ResponsiveScale = ResponsiveScale;
globalThis.BossManager = BossManager;
globalThis.DamageEffects = DamageEffects;
globalThis.GoldSystem = GoldSystem;
globalThis.WeaponSystem = WeaponSystem;
globalThis.WeaponData = WeaponData;
globalThis.SilverSystem = SilverSystem;
globalThis.ItemSystem = ItemSystem;
globalThis.DamageCalculator = DamageCalculator;
globalThis.StatusEffects = StatusEffects;
globalThis.ChestSystem = ChestSystem;
globalThis.StatsDisplay = StatsDisplay;

// Expose commonly used functions directly
globalThis.damagePlayer = PlayerController.damagePlayer;
globalThis.damageEnemy = EnemyManager.damageEnemy;
globalThis.spawnGem = XPSystem.spawnGem;
globalThis.levelUp = XPSystem.levelUp;
globalThis.updateUI = UIManager.updateUI;

// Expose game state for easy access
globalThis.gameState = GameState.state;

// ============================================
// CONSOLE TEST COMMANDS
// ============================================

// equip("weapon_id") - Instantly equip and activate a weapon in slot 0
globalThis.equip = function (weaponId) {
    const weapon = WeaponData.getWeaponData(weaponId);
    if (!weapon) {
        console.log("❌ Weapon not found:", weaponId);
        console.log("📋 Use weapons() to see all available weapons");
        return;
    }

    // Replace slot 0
    GameState.state.equippedWeapons[0] = weaponId;

    // Set level to 1 (activate it)
    GameState.state.weaponLevels[weaponId] = 1;

    console.log("✅ Equipped:", weapon.name, "(", weaponId, ")");
    console.log("   Type:", weapon.weaponType);
    console.log("   Damage:", weapon.baseDamage, "| Cooldown:", weapon.baseCooldown + "s");
    return weapon.name;
};

// weapons() - List all available weapons
globalThis.weapons = function () {
    const allWeapons = WeaponData.getAllWeaponIds();
    console.log("🗡️ AVAILABLE WEAPONS (" + allWeapons.length + "):");
    console.log("─".repeat(50));

    for (const id of allWeapons) {
        const w = WeaponData.getWeaponData(id);
        const level = GameState.state.weaponLevels[id] || 0;
        const equipped = GameState.state.equippedWeapons.includes(id);
        const status = equipped ? (level > 0 ? "✅" : "📦") : "  ";
        console.log(status, id.padEnd(20), "|", w.weaponType.padEnd(12), "|", w.name);
    }

    console.log("─".repeat(50));
    console.log("✅ = Active | 📦 = Equipped but not acquired");
    console.log("💡 Use: equip('weapon_id') to test a weapon");
    return allWeapons.length + " weapons";
};

// slots() - Show current weapon slots
globalThis.slots = function () {
    console.log("🎰 WEAPON SLOTS:");
    for (let i = 0; i < 3; i++) {
        const weaponId = GameState.state.equippedWeapons[i];
        if (weaponId) {
            const w = WeaponData.getWeaponData(weaponId);
            const level = GameState.state.weaponLevels[weaponId] || 0;
            console.log("  Slot", i + ":", w?.name || weaponId, "| Level:", level);
        } else {
            console.log("  Slot", i + ":", "(empty)");
        }
    }
    return "3 slots";
};

// upgrade("weapon_id") - Max upgrade a weapon instantly
globalThis.upgrade = function (weaponId) {
    const weapon = WeaponData.getWeaponData(weaponId);
    if (!weapon) {
        console.log("❌ Weapon not found:", weaponId);
        return;
    }

    GameState.state.weaponLevels[weaponId] = WeaponData.MAX_WEAPON_LEVEL;
    console.log("⬆️ Maxed out:", weapon.name, "to level", WeaponData.MAX_WEAPON_LEVEL);
    return weapon.name + " MAX";
};

// allweapons() - Equip and activate all 3 default weapons at max level
globalThis.allweapons = function () {
    for (const weaponId of GameState.state.equippedWeapons) {
        if (weaponId) {
            GameState.state.weaponLevels[weaponId] = WeaponData.MAX_WEAPON_LEVEL;
            const w = WeaponData.getWeaponData(weaponId);
            console.log("⬆️ Activated:", w?.name, "at MAX level");
        }
    }
    return "All equipped weapons maxed!";
};

// ============================================
// ITEM TEST COMMANDS
// ============================================

// item("item_id") - Add an item to inventory
globalThis.item = function (itemId) {
    const item = ItemSystem.getItemData(itemId);
    if (!item) {
        console.log("❌ Item not found:", itemId);
        console.log("📋 Use items() to see all available items");
        return;
    }

    ItemSystem.addItem(itemId);
    console.log("✅ Added:", item.name);
    console.log("   Effect:", item.description);
    return item.name;
};

// items() - List all available items
globalThis.items = function () {
    const allItems = ItemSystem.getAllItemIds();
    console.log("📦 AVAILABLE ITEMS (" + allItems.length + "):");
    console.log("─".repeat(60));

    for (const id of allItems) {
        const item = ItemSystem.getItemData(id);
        const count = ItemSystem.getItemCount(id);
        const owned = count > 0 ? "✅ x" + count : "  ";
        console.log(owned.padEnd(6), id.padEnd(20), "|", item.name);
    }

    console.log("─".repeat(60));
    console.log("💡 Use: item('item_id') to add an item");
    return allItems.length + " items";
};

// stats() - Show current item stats
globalThis.stats = function () {
    const stats = GameState.state.itemStats;
    if (!stats) {
        console.log("❌ Item system not initialized");
        return;
    }

    console.log("📊 ITEM STATS:");
    console.log("─".repeat(40));
    console.log("Crit Chance:", stats.critChance + "%");
    console.log("Crit Multiplier:", stats.critMultiplier + "x");
    console.log("Dodge Chance:", stats.dodgeChance + "%");
    console.log("Damage Bonus:", stats.damagePercent + "%");
    console.log("Attack Speed:", stats.attackSpeedPercent + "%");
    console.log("Speed Bonus:", stats.speedPercent + "%");
    console.log("Poison Chance:", stats.poisonChance + "%");
    console.log("XP Bonus:", stats.xpMultiplier + "%");
    console.log("Bonus Gold:", stats.bonusGold);
    console.log("Free Chest:", stats.freeChestChance + "%");
    console.log("─".repeat(40));
    return "Stats displayed";
};

// silver(amount) - Add silver for testing chests
globalThis.silver = function (amount = 10) {
    GameState.state.silver += amount;
    console.log("💰 Added", amount, "silver. Total:", GameState.state.silver);
    return GameState.state.silver;
};

// allitems() - Add one of each item for testing
globalThis.allitems = function () {
    const allItemIds = ItemSystem.getAllItemIds();
    console.log("📦 Adding all", allItemIds.length, "items...");
    for (const id of allItemIds) {
        ItemSystem.addItem(id);
    }
    console.log("✅ All items added! Use stats() to see bonuses");
    return allItemIds.length + " items added";
};

// hurt(amount) - Damage player for testing dodge/velocity shroud
globalThis.hurt = function (amount = 10) {
    PlayerController.damagePlayer(amount);
    console.log("💔 Damaged player by", amount);
    return "Player hurt";
};

// heal(amount) - Heal player
globalThis.heal = function (amount = 50) {
    GameState.state.playerHealth = Math.min(
        GameState.state.playerHealth + amount,
        GameState.state.playerMaxHealth
    );
    UIManager.updateHPBar();
    console.log("💚 Healed", amount, "HP. Current:", GameState.state.playerHealth);
    return GameState.state.playerHealth;
};

// godmode() - Toggle invincibility
globalThis.godmode = function () {
    GameState.state.playerMaxHealth = 99999;
    GameState.state.playerHealth = 99999;
    UIManager.updateHPBar();
    console.log("🛡️ GODMODE activated! HP set to 99999");
    return "GODMODE ON";
};

console.log("[MAIN] All modules imported!");
console.log("💡 Test commands: items(), item('id'), allitems(), stats(), hurt(), heal(), godmode()");

// ============================================
// RUNTIME INITIALIZATION
// ============================================
let runtime;
let currentLayout = null;
let lobbyClickHandler = null;
let lobbyPointerMoveHandler = null;
let heroesClickHandler = null;

runOnStartup(async runtimeInstance => {
    runtime = runtimeInstance;
    globalThis.runtime = runtime;

    // Set runtime in GameState
    GameState.setRuntime(runtime);

    // Initialize responsive scaling
    ResponsiveScale.init(runtime);

    // Initialize save system
    SaveManager.init();

    console.log("[MAIN] Runtime initialized!");

    // Layout events are unreliable when goToLayout is called from event handlers
    // We use tick-based detection instead (see Tick function)

    runtime.addEventListener("beforeprojectstart", () => OnBeforeProjectStart(runtime));
});

async function OnBeforeProjectStart(runtime) {
    console.log("[MAIN] Project starting...");

    // Determine which layout we're on
    currentLayout = runtime.layout.name;
    console.log("[MAIN] Current layout:", currentLayout);

    // Setup based on layout (for initial layout only)
    if (currentLayout === "Lobby") {
        initLobby(runtime);
    } else if (currentLayout === "Heroes") {
        initHeroes(runtime);
    } else if (currentLayout === "Game") {
        initGame(runtime);
    }

    // Start game loop (runs on all layouts but does different things)
    runtime.addEventListener("tick", () => Tick(runtime));

    console.log("[MAIN] Ready!");
}

// ============================================
// REMOVE ALL LAYOUT EVENT LISTENERS
// ============================================
function removeAllLayoutListeners() {
    if (lobbyClickHandler) {
        runtime.removeEventListener("pointerdown", lobbyClickHandler);
        lobbyClickHandler = null;
    }
    if (lobbyPointerMoveHandler) {
        runtime.removeEventListener("pointermove", lobbyPointerMoveHandler);
        lobbyPointerMoveHandler = null;
    }
    if (heroesClickHandler) {
        runtime.removeEventListener("pointerdown", heroesClickHandler);
        heroesClickHandler = null;
    }
}

// ============================================
// LOBBY INITIALIZATION
// ============================================
function initLobby(runtime) {
    console.log("[MAIN] Initializing Lobby...");

    // Remove old listeners first
    removeAllLayoutListeners();

    // Re-init SaveManager with current user's save key
    SaveManager.init();

    LobbyManager.init(runtime);

    // Init auth
    AuthUI.init();

    // Always show lobby UI (MetaUI buttons, chat)
    function setupLobbyUI() {
        try {
            MetaUI.hideLobbyButtons();  // Clear old buttons
            MetaUI.init();
            MetaUI.showLobbyButtons();
            addLeaderboardButton();
            AuthUI.showChat(); AuthUI.showStats();
            console.log("[MAIN] Lobby UI ready");
        } catch (e) {
            console.error("[MAIN] MetaUI init failed:", e);
        }
    }

    if (AuthUI.isLoggedIn()) {
        // Already logged in — setup directly
        setTimeout(setupLobbyUI, 300);
    } else {
        // Show auth page
        AuthUI.showAuthPage((username) => {
            console.log("[MAIN] Logged in as:", username);
            SaveManager.init();  // Re-init with new user key
            setTimeout(setupLobbyUI, 300);
        });
    }

    // Connect to multiplayer server
    NetworkManager.connect().then(() => {
        console.log("[MAIN] Connected to multiplayer server");
        setTimeout(() => AuthUI.showChat(), 500);
    }).catch(() => {
        console.log("[MAIN] Offline mode");
    });

    // Connect to multiplayer server (also try before auth completes)
    NetworkManager.connect().then(() => {
        console.log("[MAIN] Connected to multiplayer server");
    }).catch(() => {
        console.log("[MAIN] Offline mode - multiplayer unavailable");
    });

    // Setup click handler for lobby buttons (also handles mobile tooltips)
    lobbyClickHandler = (e) => {
        LobbyManager.handleLobbyClick(e);
    };
    runtime.addEventListener("pointerdown", lobbyClickHandler);

    // Setup pointer move for item tooltips
    lobbyPointerMoveHandler = (e) => {
        LobbyManager.handlePointerMove(e);
    };
    runtime.addEventListener("pointermove", lobbyPointerMoveHandler);

    console.log("[MAIN] Lobby handlers attached");
}

// ============================================
// HEROES SCREEN INITIALIZATION
// ============================================
function initHeroes(runtime) {
    console.log("[MAIN] Initializing Heroes screen...");

    // Remove old listeners first
    removeAllLayoutListeners();

    HeroSelection.init(runtime);

    // Setup click handler for hero selection
    heroesClickHandler = (e) => {
        HeroSelection.handleHeroSelectionClick(e);
    };
    runtime.addEventListener("pointerdown", heroesClickHandler);

    console.log("[MAIN] Heroes click handler attached");
}

// ============================================
// GAME INITIALIZATION
// ============================================
function initGame(runtime) {
    console.log("[MAIN] Initializing Game...");

    // Hide lobby UI buttons + chat
    MetaUI.hideAll();
    AuthUI.hideChat();

    // Remove menu listeners when entering game
    removeAllLayoutListeners();

    // Reset lobby original slots cache
    LobbyManager.resetOriginalSlots();

    // Destroy all existing objects from layout (template instances)
    const enemies = runtime.objects.Enemy?.getAllInstances() || [];
    for (const enemy of enemies) {
        enemy.destroy();
    }
    const enemies2 = runtime.objects.Enemy2?.getAllInstances() || [];
    for (const enemy of enemies2) {
        enemy.destroy();
    }
    const enemies3 = runtime.objects.Enemy3?.getAllInstances() || [];
    for (const enemy of enemies3) {
        enemy.destroy();
    }
    const enemies4 = runtime.objects.Enemy4?.getAllInstances() || [];
    for (const enemy of enemies4) {
        enemy.destroy();
    }
    const enemies5 = runtime.objects.Enemy5?.getAllInstances() || [];
    for (const enemy of enemies5) {
        enemy.destroy();
    }
    const enemies6 = runtime.objects.Enemy6?.getAllInstances() || [];
    for (const enemy of enemies6) {
        enemy.destroy();
    }
    const enemies7 = runtime.objects.Enemy7?.getAllInstances() || [];
    for (const enemy of enemies7) {
        enemy.destroy();
    }
    const enemies8 = runtime.objects.Enemy8?.getAllInstances() || [];
    for (const enemy of enemies8) {
        enemy.destroy();
    }
    const bosses = runtime.objects.Boss1?.getAllInstances() || [];
    for (const boss of bosses) {
        boss.destroy();
    }
    const golds = runtime.objects.lootGold?.getAllInstances() || [];
    for (const gold of golds) {
        gold.destroy();
    }
    const gems = runtime.objects.Gem?.getAllInstances() || [];
    for (const gem of gems) {
        gem.destroy();
    }
    const effects = runtime.objects.Effects?.getAllInstances() || [];
    for (const effect of effects) {
        effect.destroy();
    }
    const damageTexts = runtime.objects.DamageText?.getAllInstances() || [];
    for (const txt of damageTexts) {
        txt.destroy();
    }
    const silvers = runtime.objects.lootSilver?.getAllInstances() || [];
    for (const silver of silvers) {
        silver.destroy();
    }
    const chests = runtime.objects.Chest?.getAllInstances() || [];
    for (const chest of chests) {
        chest.destroy();
    }
    // Hide boss HP bar UI (will be shown when boss spawns)
    const hpBarBg2 = runtime.objects.HPBarBg2?.getFirstInstance();
    if (hpBarBg2) hpBarBg2.isVisible = false;
    const hpBarFill2 = runtime.objects.HPBarFill2?.getFirstInstance();
    if (hpBarFill2) hpBarFill2.isVisible = false;
    const hpText2 = runtime.objects.HPText2?.getFirstInstance();
    if (hpText2) hpText2.isVisible = false;
    console.log("[MAIN] Cleared", enemies.length + enemies2.length + enemies3.length + enemies4.length + enemies5.length, "enemies,", bosses.length, "bosses,", golds.length, "golds,", gems.length, "gems,", effects.length, "effects,", damageTexts.length, "damageTexts,", silvers.length, "silvers,", chests.length, "chests");

    // Clear all text effects from previous game
    DamageEffects.clearAllTextEffects();

    // Reset game state
    GameState.resetState();

    // Reset boss manager
    BossManager.reset();

    // Reset silver system
    SilverSystem.reset();

    // Reset status effects
    StatusEffects.reset();

    // Reset chest system
    ChestSystem.reset();

    // Reset guaranteed enemy spawns
    EnemyManager.resetGuaranteedSpawns();

    // Reset magnet and energy pickups
    XPSystem.resetMagnets();
    XPSystem.resetEnergy();

    // Setup TiledBackground for infinite scrolling
    ResponsiveScale.setupTiledBackground();

    // Apply hero stats to player
    applyHeroStats();

    // Initialize item system
    ItemSystem.initItemInventory();

    // Initialize weapon system (weapons are reset each run)
    WeaponSystem.initWeapons();

    // Start game
    GameState.state.isPlaying = true;
    GameState.state.attackCooldown = 1 / GameState.state.playerAttackSpeed;

    // Setup input handlers
    InputManager.setupInputHandlers();

    // Update UI initially
    UIManager.updateUI();

    // Update silver count text initially
    SilverSystem.updateSilverCountText();

    // Reset weapon icons cache
    UIManager.resetWeaponIcons();

    // Update weapon equipped display initially
    UIManager.updateWeaponEquippedDisplay();

    // Destroy any existing tooltips
    UIManager.destroyTooltips();

    // Initialize MetaUI
    MetaUI.init(runtime);

    // Join multiplayer room with username
    try {
        const heroId = SaveManager.getSelectedHeroId();
        const username = AuthUI.getUsername() || "Player_" + Math.random().toString(36).substr(2, 4);
        NetworkManager.joinGame(heroId, username);
    } catch (e) {
        console.log("[MAIN] Multiplayer join failed, playing offline");
    }

    // Show tutorial for first-time players
    if (!SaveManager.isTutorialShown()) {
        showTutorialOverlay(runtime);
    }

    console.log("[MAIN] Game started!");
}

// Tutorial overlay for first play
function addLeaderboardButton() {
    const bar = document.getElementById("pi-buttons");
    if (!bar) return;
    // Prevent duplicate
    if (document.getElementById("pi-lb-btn")) return;
    const isKo = i18n.getLanguage() === "ko";
    const btn = document.createElement("button");
    btn.id = "pi-lb-btn";
    btn.textContent = isKo ? "🏅 리더보드" : "🏅 Ranking";
    btn.style.cssText = "background:rgba(243,156,18,0.9);";
    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        NetworkManager.showLeaderboard();
    });
    bar.appendChild(btn);
}

function showTutorialOverlay(runtime) {
    GameState.state.isPaused = true;

    try {
        const vw = runtime.viewportWidth;
        const vh = runtime.viewportHeight;

        // Create dark overlay text using available text object
        const textObjs = ['TitleText', 'TimerText', 'KillCountText'];
        let tutText = null;

        for (const objName of textObjs) {
            tutText = runtime.objects[objName]?.createInstance("UI", vw / 2, vh / 2);
            if (tutText) break;
        }

        if (tutText) {
            tutText.text = [
                i18n.t("tutorial_title"),
                "",
                i18n.t("tutorial_move"),
                "",
                i18n.t("tutorial_attack"),
                "",
                i18n.t("tutorial_xp"),
                i18n.t("tutorial_levelup"),
                i18n.t("tutorial_chest"),
                i18n.t("tutorial_boss"),
                "",
                i18n.t("tutorial_pause"),
                "",
                i18n.t("tutorial_start")
            ].join("\n");
            tutText.colorRgb = [1, 1, 0.6];

            // Dismiss on any click/touch
            const dismiss = () => {
                try {
                    if (tutText && tutText.runtime) tutText.destroy();
                } catch (e) {}
                GameState.state.isPaused = false;
                SaveManager.markTutorialShown();
                runtime.removeEventListener("pointerdown", dismiss);
                document.removeEventListener("keydown", dismiss);
            };

            runtime.addEventListener("pointerdown", dismiss);
            document.addEventListener("keydown", dismiss);
        }
    } catch (e) {
        // Tutorial failed to show - just unpause
        GameState.state.isPaused = false;
        SaveManager.markTutorialShown();
        console.warn("[MAIN] Tutorial overlay failed:", e);
    }
}

// Apply selected hero stats to player
function applyHeroStats() {
    const heroId = SaveManager.getSelectedHeroId();
    const heroStats = HeroData.getHeroStats(heroId);
    const hero = HeroData.getHero(heroId);
    const state = GameState.state;

    console.log("[MAIN] Applying hero stats for:", heroId);

    // Set hero stats in GameState (for resetState and other systems)
    GameState.setHeroStats(heroStats, heroId);

    // Apply base stats
    state.playerMaxHealth = heroStats.health;
    state.playerHealth = heroStats.health;
    state.playerSpeed = heroStats.speed;
    state.playerDamage = heroStats.damage;
    state.playerAttackSpeed = heroStats.attackSpeed || 1.0;
    state.attackCooldown = 1 / state.playerAttackSpeed;

    // Apply crit stats from hero
    state.playerCritChance = heroStats.critChance || 0;
    state.playerCritMultiplier = heroStats.critMultiplier || 2.0;

    // Store hero's base max health for Ring of Fortitude scaling
    state.baseMaxHealth = heroStats.health;

    // Store selected hero ID
    state.selectedHeroId = heroId;

    // Load equipped weapons from SaveManager (set in Lobby)
    const lobbyEquippedWeapons = SaveManager.getEquippedWeaponsLobby();
    console.log("[MAIN] Loading equipped weapons from lobby:", lobbyEquippedWeapons);

    // Clear current equipped weapons
    state.equippedWeapons = [null, null, null, null];

    // Apply lobby weapons to game state
    for (let i = 0; i < lobbyEquippedWeapons.length; i++) {
        const weaponId = lobbyEquippedWeapons[i];
        if (weaponId) {
            state.equippedWeapons[i] = weaponId;
            // Initialize at level 0 (not active yet, must be found in level up)
            // Unless it's the default weapon which we'll handle below
            state.weaponLevels[weaponId] = 0;
            console.log("[MAIN] Set deck weapon slot", i, ":", weaponId, "(Level 0)");
        }
    }

    // Ensure default weapon is equipped and active (Level 1)
    if (hero.defaultWeapon) {
        // Find if it's already in the deck
        let slotIndex = state.equippedWeapons.indexOf(hero.defaultWeapon);

        // If not in deck, put it in first empty slot or force slot 0
        if (slotIndex === -1) {
            const emptySlot = state.equippedWeapons.indexOf(null);
            if (emptySlot !== -1) {
                state.equippedWeapons[emptySlot] = hero.defaultWeapon;
            } else {
                state.equippedWeapons[0] = hero.defaultWeapon; // Force slot 0
            }
        }

        // Set level to 1 (Active)
        state.weaponLevels[hero.defaultWeapon] = 1;
        console.log("[MAIN] Activated default weapon:", hero.defaultWeapon, "(Level 1)");
    }

    // Set player sprite animation to hero's idle animation
    const player = runtime.objects.Player?.getFirstInstance();
    if (player) {
        const animPrefix = HeroData.getAnimPrefix(heroId);
        player.setAnimation(animPrefix + "Idle");
        console.log("[MAIN] Set player animation to:", animPrefix + "Idle");
    }

    console.log("[MAIN] Hero stats applied:", {
        health: state.playerMaxHealth,
        speed: state.playerSpeed,
        damage: state.playerDamage,
        attackSpeed: state.playerAttackSpeed,
        critChance: state.playerCritChance,
        critMultiplier: state.playerCritMultiplier
    });
}

// ============================================
// MAIN GAME LOOP
// ============================================
let lastLayoutName = null;

function Tick(runtime) {
    // Update responsive scale (checks for viewport resize and hides tooltip if needed)
    ResponsiveScale.updateScale();

    // Check if layout changed (tick-based detection - more reliable than events)
    const layoutName = runtime.layout.name;
    if (layoutName !== lastLayoutName) {
        lastLayoutName = layoutName;
        currentLayout = layoutName;

        // Initialize the new layout
        if (layoutName === "Lobby") {
            initLobby(runtime);
        } else if (layoutName === "Heroes") {
            initHeroes(runtime);
        } else if (layoutName === "Game") {
            initGame(runtime);
        }
    }

    // Handle Lobby keyboard input
    if (currentLayout === "Lobby") {
        LobbyManager.handleLobbyKeyboard();
        return;
    }

    // Only run game logic on Game layout
    if (currentLayout !== "Game") return;

    const state = GameState.state;

    // Get delta time first (needed for chest window even when paused)
    const dt = runtime.dt;

    // Update chest window even when paused (slot machine animation)
    if (ChestSystem.isWindowOpen()) {
        ChestSystem.updateChestWindow(dt);
        return; // Don't run other game logic while chest is open
    }

    if (!state.isPlaying || state.isPaused || state.isLevelingUp) return;

    // Apply hit-stop time scaling for impact feel
    EnemyManager.updateHitStop(dt);
    EnemyManager.updateCombo(dt);
    const hitScale = EnemyManager.getHitStopScale();
    const scaledDt = dt * hitScale;

    state.gameTime += scaledDt;

    // Handle keyboard input
    InputManager.handleKeyboardInput();

    // Update player movement
    PlayerController.updatePlayer(dt);

    // Update camera shake effect (must be after player update)
    DamageEffects.updateCameraShake(dt);

    // Update remote multiplayer players
    try { NetworkManager.updateRemotePlayers(runtime); } catch (e) {}

    // Update enemies
    EnemyManager.updateEnemies(dt);
    EnemyManager.updateArcherProjectiles(dt);
    EnemyManager.updateFireMages(dt);
    EnemyManager.updateFireballProjectiles(dt);
    EnemyManager.updateSolidOpacity();

    // Spawn enemies
    EnemyManager.spawnEnemies(dt);

    // Check boss spawn and update
    BossManager.checkBossSpawn(dt);
    BossManager.updateBoss(dt);
    BossManager.updateBossFireballs(dt);  // Update boss fireballs

    // Auto-attack nearest enemy
    CombatSystem.autoAttack(dt);

    // Update weapons (Lightning Staff, etc.)
    WeaponSystem.updateWeapons(dt);

    // Update bullets
    CombatSystem.updateBullets(dt);

    // Check collisions
    CombatSystem.checkCollisions();

    // Check gem pickups
    XPSystem.checkGemPickup();

    // Update magnet spawns and pickups
    XPSystem.updateMagnets(dt);

    // Update energy spawns and power-up effect
    XPSystem.updateEnergy(dt);

    // Check gold pickups
    GoldSystem.checkGoldPickup();

    // Update gold text
    GoldSystem.updateGoldText(dt);

    // Check silver pickups
    SilverSystem.checkSilverPickup();

    // Try to spawn chests
    SilverSystem.trySpawnChest(dt);

    // Update chest UI (icons and cost text)
    SilverSystem.updateChestUI();

    // Check chest interaction (opens chest window)
    ChestSystem.checkChestInteraction();

    // Update chest window (slot machine animation)
    ChestSystem.updateChestWindow(dt);

    // Update item effects (Campfire, Magnet, Velocity Shroud)
    ItemSystem.updateItems(dt);

    // Update status effects (poison)
    StatusEffects.updateStatusEffects(dt);

    // Update timer display
    UIManager.updateTimerDisplay();

    // Update HP bar position (follows player)
    UIManager.updateHPBarPosition();

    // Update XP bar position (must be updated every tick for responsiveness)
    UIManager.updateExpBarPosition();

    // Update progressFill2 position (light at end of XP bar)
    UIManager.updateProgressFill2();

    // Update weapon slot positions (responsive)
    UIManager.updateWeaponSlotPositions();

    // Update difficulty
    DifficultyManager.updateDifficulty();

    // Keep shadows at bottom z-order
    updateShadowZOrder();
}

// Keep shadow sprites at bottom
function updateShadowZOrder() {
    const runtime = getRuntime();
    const shadows = runtime.objects.shadow?.getAllInstances() || [];
    for (const shadow of shadows) {
        shadow.moveToBottom();
    }
}

// Get runtime helper
function getRuntime() {
    return globalThis.runtime;
}

console.log("[MAIN] Main script loaded!");
