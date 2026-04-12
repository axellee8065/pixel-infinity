// ============================================
// STATS DISPLAY - Show all player stats
// ============================================

import { state, getRuntime } from "./GameState.js";
import * as TomeSystem from "./TomeSystem.js";
import * as ItemSystem from "./ItemSystem.js";
import * as HeroData from "./HeroData.js";
import * as SaveManager from "./SaveManager.js";

let isStatsWindowOpen = false;

// Open stats window
export function openStatsWindow() {
    if (isStatsWindowOpen) return;
    isStatsWindowOpen = true;

    const runtime = getRuntime();
    const viewportWidth = runtime.viewportWidth;
    const viewportHeight = runtime.viewportHeight;

    // list layer is parallax 0 (UI layer), so use viewport center
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;

    // Create list container with children on list layer (,1 = hierarchy children will come with it)
    const listStartY = centerY;
    const listSprite = runtime.objects.list?.createInstance("list", centerX, listStartY, 1);
    if (!listSprite) {
        console.error("[StatsDisplay] 'list' sprite not found!");
        isStatsWindowOpen = false;
        return;
    }

    // Get choruspin and 9patchchours - they should already exist in hierarchy
    const choruspin = runtime.objects.choruspin?.getFirstInstance();
    const ninePatch = runtime.objects["9patchchours"]?.getFirstInstance();

    if (!choruspin) {
        console.error("[StatsDisplay] 'choruspin' not found in hierarchy!");
        isStatsWindowOpen = false;
        return;
    }

    if (ninePatch) {
        ninePatch.instVars.listTotHeight = 0;
    }

    // Get choruspin position to start rendering from there
    const startX = choruspin.x;
    const startY = choruspin.y;

    // Generate stats and create text objects on LevelUpUI layer
    renderStatsOnList(runtime, startX, startY, viewportWidth * 0.8, 1.0);

    console.log("[StatsDisplay] Stats window opened at center:", centerX, centerY);
}

// Close stats window
export function closeStatsWindow() {
    if (!isStatsWindowOpen) return;
    isStatsWindowOpen = false;

    const runtime = getRuntime();

    // Destroy list sprite - this will also destroy hierarchy children (choruspin, 9patchchours, closelist)
    const listSprites = runtime.objects.list?.getAllInstances() || [];
    for (const sprite of listSprites) {
        sprite.destroy();
    }

    console.log("[StatsDisplay] Stats window closed - list destroyed with hierarchy");
}

// Check if stats window is open
export function isWindowOpen() {
    return isStatsWindowOpen;
}

// Handle click on stats window
export function handleStatsWindowClick(e) {
    if (!isStatsWindowOpen) return false;

    const runtime = getRuntime();
    const listLayer = runtime.layout.getLayer("list");
    if (!listLayer) return false;

    const [layerX, layerY] = listLayer.cssPxToLayer(e.clientX, e.clientY);

    // Check closelist button
    const closeListBtns = runtime.objects.closelist?.getAllInstances() || [];

    for (const btn of closeListBtns) {
        const dx = Math.abs(layerX - btn.x);
        const dy = Math.abs(layerY - btn.y);

        if (dx < btn.width / 2 && dy < btn.height / 2) {
            closeStatsWindow();
            return true;
        }
    }

    return false;
}

// Render stats as individual text objects on list layer
function renderStatsOnList(runtime, centerX, startY, panelWidth, panelScale) {
    const spacingY = 45; // Satırlar arası boşluk
    let currentY = startY;

    const statsData = generateStatsData();
    const ninePatch = runtime.objects["9patchchours"]?.getFirstInstance();
    const choruspin = runtime.objects.choruspin?.getFirstInstance();

    if (ninePatch) {
        ninePatch.instVars.listTotHeight = 0;
    }

    // Her stat satırı için text create et
    statsData.forEach(statLine => {
        const statText = runtime.objects.StatsText?.createInstance("list", centerX, currentY);

        if (!statText) {
            // Fallback to UpgradeText
            const fallbackText = runtime.objects.UpgradeText?.createInstance("list", centerX, currentY);
            if (fallbackText) {
                fallbackText.text = statLine;
                fallbackText.fontSize = 14 * panelScale;
                fallbackText.width = panelWidth * 0.8;
                fallbackText.horizontalAlign = "left";

                // Child to choruspin - choruspin parent olmalı
                if (choruspin) {
                    choruspin.addChild(fallbackText, {
                        transformX: true,
                        transformY: true,
                        destroyWithParent: true
                    });
                }
            }
        } else {
            statText.text = statLine;
            statText.fontSize = 14 * panelScale;
            statText.width = panelWidth * 0.8;
            statText.horizontalAlign = "left";

            // Child to choruspin - choruspin parent olmalı
            if (choruspin) {
                choruspin.addChild(statText, {
                    transformX: true,
                    transformY: true,
                    destroyWithParent: true
                });
            }
        }

        if (ninePatch) {
            ninePatch.instVars.listTotHeight += spacingY;
        }

        currentY += spacingY;
    });

    console.log("[StatsDisplay] Rendered", statsData.length, "stat lines, childed to choruspin");
}

// Generate stats data as array of strings (one per line)
function generateStatsData() {
    const heroId = SaveManager.getSelectedHeroId();
    const hero = HeroData.getHero(heroId);
    const tomeStats = state.tomeStats || {};
    const itemStats = state.itemStats || {};

    const lines = [];

    // === HERO INFO ===
    lines.push("[color=#FFD700][b]=== HERO ===[/b][/color]");
    lines.push(hero.name);
    lines.push(`Level: ${state.playerLevel}`);
    lines.push(""); // Empty line

    // === COMBAT STATS ===
    lines.push("[color=#FF6B6B][b]=== COMBAT ===[/b][/color]");
    const baseDmg = state.playerDamage;
    lines.push(`Base Damage: ${baseDmg.toFixed(1)}`);
    const dmgPercent = (tomeStats.damagePercent || 0) + (itemStats.damagePercent || 0);
    lines.push(`Damage Bonus: +${dmgPercent.toFixed(1)}%`);
    const chestBonus = itemStats.chestDamageBonus || 0;
    lines.push(`Chest Bonus: +${chestBonus.toFixed(1)}%`);
    const killBonus = itemStats.killDamageBonus || 0;
    lines.push(`Kill Bonus: +${killBonus.toFixed(2)}%`);
    const bossDmg = itemStats.bossDamage || 0;
    lines.push(`Boss Damage: +${bossDmg}%`);
    const highHpDmg = itemStats.highHpDamage || 0;
    lines.push(`High HP Damage: +${highHpDmg}%`);
    const nearbyDmg = itemStats.nearbyDamage || 0;
    lines.push(`Nearby Damage: +${nearbyDmg}%`);
    const hpScaling = itemStats.hpDamageScaling || 0;
    lines.push(`HP Scaling: +${hpScaling}% per 100 HP`);
    const lowHpDmg = itemStats.lowHpDamage || 0;
    lines.push(`Low HP Damage: up to +${lowHpDmg}%`);
    const atkSpeed = state.playerAttackSpeed;
    const atkSpeedBonus = itemStats.attackSpeedPercent || 0;
    lines.push(`Attack Speed: ${atkSpeed.toFixed(2)} (+${atkSpeedBonus}%)`);
    const cdReduction = tomeStats.cooldownReduction || 0;
    lines.push(`Cooldown Reduction: ${cdReduction}%`);
    const knockback = tomeStats.knockback || 0;
    lines.push(`Knockback Force: ${knockback}`);
    lines.push("");

    // === CRITICAL ===
    lines.push("[color=#FFFF00][b]=== CRITICAL ===[/b][/color]");
    const critChance = (tomeStats.critChance || 0) + (itemStats.critChance || 0);
    const critMult = itemStats.critMultiplier || 2;
    const ultraCrit = itemStats.ultraCritChance || 0;
    const critHeal = itemStats.critHealChance || 0;
    lines.push(`Crit Chance: ${critChance.toFixed(1)}%`);
    lines.push(`Crit Multiplier: ${critMult.toFixed(1)}x`);
    lines.push(`Ultra Crit: ${ultraCrit}% (20x dmg)`);
    lines.push(`Crit Heal: ${critHeal}%`);
    lines.push("");

    // === DEFENSE ===
    lines.push("[color=#4ECDC4][b]=== DEFENSE ===[/b][/color]");
    const maxHp = state.playerMaxHealth;
    const currentHp = state.playerHealth;
    const dodgeChance = (tomeStats.dodge || 0) + (itemStats.dodgeChance || 0);
    const regenOnKill = tomeStats.regenOnKill || 0;
    const idleRegen = itemStats.idleRegen || 0;
    lines.push(`Health: ${currentHp.toFixed(0)} / ${maxHp.toFixed(0)}`);
    lines.push(`Dodge Chance: ${dodgeChance}%`);
    lines.push(`HP per Kill: +${regenOnKill}`);
    lines.push(`Idle Regen: ${idleRegen} HP/sec`);
    lines.push("");

    // === MOVEMENT ===
    lines.push("[color=#95E1D3][b]=== MOVEMENT ===[/b][/color]");
    const baseSpeed = state.playerSpeed;
    const speedBonus = tomeStats.speed || 0;
    const speedPercent = itemStats.speedPercent || 0;
    const speedBuff = itemStats.damageSpeedBuff || 0;
    lines.push(`Base Speed: ${baseSpeed.toFixed(0)}`);
    lines.push(`Speed Bonus: +${speedBonus}`);
    lines.push(`Speed %: +${speedPercent}%`);
    lines.push(`On-Hit Buff: +${speedBuff}% (3s)`);
    lines.push("");

    // === SPECIAL ===
    lines.push("[color=#C77DFF][b]=== SPECIAL ===[/b][/color]");
    const poisonChance = itemStats.poisonChance || 0;
    lines.push(`Poison Chance: ${poisonChance}%`);
    lines.push("");

    // === XP & LOOT ===
    lines.push("[color=#7DFF7D][b]=== XP & LOOT ===[/b][/color]");
    const xpBonus = (tomeStats.xpMultiplier || 0) + (itemStats.xpMultiplier || 0);
    const extraGemChance = itemStats.extraGemChance || 0;
    const pickupRadius = tomeStats.pickupRadius || 0;
    const goldChance = tomeStats.goldChance || 0;
    const bonusGold = itemStats.bonusGold || 0;
    const silverChance = tomeStats.silverChance || 0;
    const freeChestChance = itemStats.freeChestChance || 0;
    const magnetCooldown = itemStats.magnetCooldown || 30;
    lines.push(`XP Bonus: +${xpBonus}%`);
    lines.push(`Extra Gem: ${extraGemChance}%`);
    lines.push(`Pickup Radius: +${pickupRadius}`);
    lines.push(`Magnet Cooldown: ${magnetCooldown}s`);
    lines.push(`Gold Chance: +${goldChance}%`);
    lines.push(`Bonus Gold: +${bonusGold}`);
    lines.push(`Silver Chance: +${silverChance}%`);
    lines.push(`Free Chest: ${freeChestChance}%`);
    lines.push("");

    // === PROGRESSION ===
    lines.push("[color=#9B59B6][b]=== PROGRESSION ===[/b][/color]");
    lines.push(`Kills: ${state.killCount}`);
    lines.push(`Current Gold: ${state.gold}`);
    lines.push(`Current Silver: ${state.silver}`);
    lines.push(`Current XP: ${state.currentXP} / ${state.xpToNextLevel}`);
    const xpPercent = ((state.currentXP / state.xpToNextLevel) * 100).toFixed(1);
    lines.push(`XP Progress: ${xpPercent}%`);
    lines.push(`Unlocked Weapon Slots: ${state.unlockedWeaponSlots}`);
    lines.push("");

    // === WEAPONS ===
    lines.push("[color=#FF9999][b]=== WEAPONS ===[/b][/color]");
    let weaponCount = 0;
    for (let i = 0; i < state.equippedWeapons.length; i++) {
        const weaponId = state.equippedWeapons[i];
        if (weaponId && state.weaponLevels[weaponId] > 0) {
            weaponCount++;
            const level = state.weaponLevels[weaponId];
            lines.push(`${i + 1}. ${weaponId.replace(/_/g, ' ')} (Lv${level})`);
        }
    }
    if (weaponCount === 0) {
        lines.push("No weapons equipped");
    }
    lines.push("");

    // === TOMES ===
    lines.push("[color=#FFB366][b]=== TOMES ===[/b][/color]");
    let tomeCount = 0;
    if (state.tomeInventory) {
        for (const tomeId in state.tomeInventory) {
            const count = state.tomeInventory[tomeId];
            if (count > 0) {
                const tome = TomeSystem.TOMES[tomeId];
                if (tome) {
                    tomeCount++;
                    lines.push(`${tome.name} x${count}`);
                }
            }
        }
    }
    if (tomeCount === 0) {
        lines.push("No tomes collected");
    }
    lines.push("");

    // === ITEMS ===
    lines.push("[color=#B39DDB][b]=== ITEMS ===[/b][/color]");
    let itemCount = 0;
    if (state.itemInventory) {
        for (const itemId in state.itemInventory) {
            const count = state.itemInventory[itemId];
            if (count > 0) {
                const item = ItemSystem.getItemData(itemId);
                if (item) {
                    itemCount++;
                    lines.push(`${item.name} x${count}`);
                }
            }
        }
    }
    if (itemCount === 0) {
        lines.push("No items collected");
    }

    return lines;
}

// Generate ALL stats in one column for scrolling (LEGACY - artık kullanılmıyor)
function generateAllStatsText() {
    const heroId = SaveManager.getSelectedHeroId();
    const hero = HeroData.getHero(heroId);
    const tomeStats = state.tomeStats || {};
    const itemStats = state.itemStats || {};

    let text = "";

    // === HERO INFO ===
    text += "[color=#FFD700][b]=== HERO ===[/b][/color]\n";
    text += `${hero.name}\n`;
    text += `Level: ${state.playerLevel}\n\n`;

    // === COMBAT STATS ===
    text += "[color=#FF6B6B][b]=== COMBAT ===[/b][/color]\n";
    const baseDmg = state.playerDamage;
    text += `Base Damage: ${baseDmg.toFixed(1)}\n`;
    const dmgPercent = (tomeStats.damagePercent || 0) + (itemStats.damagePercent || 0);
    text += `Damage Bonus: +${dmgPercent.toFixed(1)}%\n`;
    const chestBonus = itemStats.chestDamageBonus || 0;
    text += `Chest Bonus: +${chestBonus.toFixed(1)}%\n`;
    const killBonus = itemStats.killDamageBonus || 0;
    text += `Kill Bonus: +${killBonus.toFixed(2)}%\n`;
    const bossDmg = itemStats.bossDamage || 0;
    text += `Boss Damage: +${bossDmg}%\n`;
    const highHpDmg = itemStats.highHpDamage || 0;
    text += `High HP Damage: +${highHpDmg}%\n`;
    const nearbyDmg = itemStats.nearbyDamage || 0;
    text += `Nearby Damage: +${nearbyDmg}%\n`;
    const hpScaling = itemStats.hpDamageScaling || 0;
    text += `HP Scaling: +${hpScaling}% per 100 HP\n`;
    const lowHpDmg = itemStats.lowHpDamage || 0;
    text += `Low HP Damage: up to +${lowHpDmg}%\n`;
    const atkSpeed = state.playerAttackSpeed;
    const atkSpeedBonus = itemStats.attackSpeedPercent || 0;
    text += `Attack Speed: ${atkSpeed.toFixed(2)} (+${atkSpeedBonus}%)\n`;
    const cdReduction = tomeStats.cooldownReduction || 0;
    text += `Cooldown Reduction: ${cdReduction}%\n`;
    const knockback = tomeStats.knockback || 0;
    text += `Knockback Force: ${knockback}\n\n`;

    // === CRITICAL SYSTEM ===
    text += "[color=#FFFF00][b]=== CRITICAL ===[/b][/color]\n";
    const critChance = (tomeStats.critChance || 0) + (itemStats.critChance || 0);
    const critMult = itemStats.critMultiplier || 2;
    const ultraCrit = itemStats.ultraCritChance || 0;
    const critHeal = itemStats.critHealChance || 0;
    text += `Crit Chance: ${critChance.toFixed(1)}%\n`;
    text += `Crit Multiplier: ${critMult.toFixed(1)}x\n`;
    text += `Ultra Crit: ${ultraCrit}% (20x dmg)\n`;
    text += `Crit Heal: ${critHeal}%\n\n`;

    // === DEFENSE ===
    text += "[color=#4ECDC4][b]=== DEFENSE ===[/b][/color]\n";
    const maxHp = state.playerMaxHealth;
    const currentHp = state.playerHealth;
    const dodgeChance = (tomeStats.dodge || 0) + (itemStats.dodgeChance || 0);
    const regenOnKill = tomeStats.regenOnKill || 0;
    const idleRegen = itemStats.idleRegen || 0;
    text += `Health: ${currentHp.toFixed(0)} / ${maxHp.toFixed(0)}\n`;
    text += `Dodge Chance: ${dodgeChance}%\n`;
    text += `HP per Kill: +${regenOnKill}\n`;
    text += `Idle Regen: ${idleRegen} HP/sec\n\n`;

    // === MOVEMENT ===
    text += "[color=#95E1D3][b]=== MOVEMENT ===[/b][/color]\n";
    const baseSpeed = state.playerSpeed;
    const speedBonus = tomeStats.speed || 0;
    const speedPercent = itemStats.speedPercent || 0;
    const speedBuff = itemStats.damageSpeedBuff || 0;
    text += `Base Speed: ${baseSpeed.toFixed(0)}\n`;
    text += `Speed Bonus: +${speedBonus}\n`;
    text += `Speed %: +${speedPercent}%\n`;
    text += `On-Hit Buff: +${speedBuff}% (3s)\n\n`;

    // === SPECIAL EFFECTS ===
    text += "[color=#C77DFF][b]=== SPECIAL ===[/b][/color]\n";
    const poisonChance = itemStats.poisonChance || 0;
    text += `Poison Chance: ${poisonChance}%\n\n`;

    // === XP & LOOT ===
    text += "[color=#7DFF7D][b]=== XP & LOOT ===[/b][/color]\n";
    const xpBonus = (tomeStats.xpMultiplier || 0) + (itemStats.xpMultiplier || 0);
    const extraGemChance = itemStats.extraGemChance || 0;
    const pickupRadius = tomeStats.pickupRadius || 0;
    const goldChance = tomeStats.goldChance || 0;
    const bonusGold = itemStats.bonusGold || 0;
    const silverChance = tomeStats.silverChance || 0;
    const freeChestChance = itemStats.freeChestChance || 0;
    const magnetCooldown = itemStats.magnetCooldown || 30;
    text += `XP Bonus: +${xpBonus}%\n`;
    text += `Extra Gem: ${extraGemChance}%\n`;
    text += `Pickup Radius: +${pickupRadius}\n`;
    text += `Magnet Cooldown: ${magnetCooldown}s\n`;
    text += `Gold Chance: +${goldChance}%\n`;
    text += `Bonus Gold: +${bonusGold}\n`;
    text += `Silver Chance: +${silverChance}%\n`;
    text += `Free Chest: ${freeChestChance}%\n\n`;

    // === PROGRESSION ===
    text += "[color=#9B59B6][b]=== PROGRESSION ===[/b][/color]\n";
    text += `Kills: ${state.killCount}\n`;
    text += `Current Gold: ${state.gold}\n`;
    text += `Current Silver: ${state.silver}\n`;
    text += `Current XP: ${state.currentXP} / ${state.xpToNextLevel}\n`;
    const xpPercent = ((state.currentXP / state.xpToNextLevel) * 100).toFixed(1);
    text += `XP Progress: ${xpPercent}%\n`;
    text += `Unlocked Weapon Slots: ${state.unlockedWeaponSlots}\n\n`;

    // === WEAPONS ===
    text += "[color=#FF9999][b]=== WEAPONS ===[/b][/color]\n";
    let weaponCount = 0;
    for (let i = 0; i < state.equippedWeapons.length; i++) {
        const weaponId = state.equippedWeapons[i];
        if (weaponId && state.weaponLevels[weaponId] > 0) {
            weaponCount++;
            const level = state.weaponLevels[weaponId];
            text += `${i + 1}. ${weaponId.replace(/_/g, ' ')} (Lv${level})\n`;
        }
    }
    if (weaponCount === 0) {
        text += "No weapons equipped\n";
    }
    text += "\n";

    // === TOMES ===
    text += "[color=#FFB366][b]=== TOMES ===[/b][/color]\n";
    let tomeCount = 0;
    if (state.tomeInventory) {
        for (const tomeId in state.tomeInventory) {
            const count = state.tomeInventory[tomeId];
            if (count > 0) {
                const tome = TomeSystem.TOMES[tomeId];
                if (tome) {
                    tomeCount++;
                    text += `${tome.name} x${count}\n`;
                }
            }
        }
    }
    if (tomeCount === 0) {
        text += "No tomes collected\n";
    }
    text += "\n";

    // === ITEMS ===
    text += "[color=#B39DDB][b]=== ITEMS ===[/b][/color]\n";
    let itemCount = 0;
    if (state.itemInventory) {
        for (const itemId in state.itemInventory) {
            const count = state.itemInventory[itemId];
            if (count > 0) {
                const item = ItemSystem.getItemData(itemId);
                if (item) {
                    itemCount++;
                    text += `${item.name} x${count}\n`;
                }
            }
        }
    }
    if (itemCount === 0) {
        text += "No items collected\n";
    }

    return text;
}

console.log("[StatsDisplay] Module loaded!");
