// ============================================
// i18n - Internationalization / Korean Support
// ============================================

const LANG = {
    ko: {
        // Tutorial
        tutorial_title: "=== 플레이 방법 ===",
        tutorial_move: "이동: 터치 & 드래그 (모바일) / WASD (키보드)",
        tutorial_attack: "공격: 자동!",
        tutorial_xp: "XP 젬을 모아 레벨업하세요",
        tutorial_levelup: "레벨업 시 무기/토메/스탯 선택",
        tutorial_chest: "실버로 상자를 열어 아이템 획득",
        tutorial_boss: "레벨 12에서 보스를 처치하세요!",
        tutorial_pause: "일시정지: Escape / P키",
        tutorial_start: ">>> 터치하면 시작 <<<",

        // HUD
        hud_kills: "처치",
        hud_level: "레벨",
        hud_gold: "골드",
        hud_silver: "실버",

        // Combo
        combo_nice: "좋아요!",
        combo_great: "훌륭해!",
        combo_amazing: "놀라워!",
        combo_unstoppable: "막을 수 없다!",
        combo_godlike: "신이시다!!!",
        combo_broken: "콤보 종료",

        // Boss
        boss_incoming: "보스 등장!",
        boss_phase2: "분노!",
        boss_phase3: "최종 형태!",

        // Level Up
        levelup_title: "레벨 업!",
        stat_damage: "공격력",
        stat_speed: "이동속도",
        stat_attackspeed: "공격속도",
        stat_health: "최대 체력",

        // Items - Rarity
        rarity_common: "일반",
        rarity_uncommon: "고급",
        rarity_rare: "희귀",
        rarity_epic: "영웅",
        rarity_legendary: "전설",

        // PowerUp Shop
        powerup_title: "영구 강화",
        powerup_damage: "공격력 강화",
        powerup_health: "체력 강화",
        powerup_speed: "이동속도 강화",
        powerup_attackSpeed: "공격속도 강화",
        powerup_armor: "방어력 강화",
        powerup_goldBonus: "골드 보너스",
        powerup_xpBonus: "경험치 보너스",
        powerup_luck: "행운 강화",
        powerup_max: "최대",
        powerup_cost: "비용",

        // Achievements
        ach_title: "업적",
        ach_first_kill: "첫 처치",
        ach_kills_100: "백인대장",
        ach_kills_500: "학살자",
        ach_kills_1000: "대학살",
        ach_boss_kill: "보스 사냥꾼",
        ach_level_5: "성장 중",
        ach_level_10: "베테랑",
        ach_survive_3min: "생존자",
        ach_survive_5min: "인내",
        ach_gold_500: "부자",
        ach_all_heroes: "수집가",
        ach_no_damage_30s: "무적",

        // Daily Rewards
        daily_title: "일일 보상",
        daily_day: "일차",
        daily_claimed: "수령 완료",
        daily_claim: "보상 받기",
        daily_streak: "연속 출석",

        // Weekly Challenges
        weekly_title: "주간 도전",
        weekly_completed: "완료",
        weekly_reward: "주간 보상: 300G",
        weekly_claim: "보상 받기",

        // Weapon Evolution
        evolution_evolved: "무기 진화!",

        // Game Over
        gameover_victory: "승리!",
        gameover_defeat: "패배...",
        gameover_kills: "처치 수",
        gameover_time: "생존 시간",
        gameover_gold: "획득 골드",
        gameover_level: "도달 레벨",

        // Endless
        endless_continue: "엔드리스 모드로 계속?",
        endless_yes: "계속하기",
        endless_no: "종료",
        endless_wave: "웨이브",

        // Heroes
        hero_mage: "마법사",
        hero_archer: "궁수",
        hero_cowboy: "카우보이",
        hero_sniper: "저격수",
        hero_vampire: "뱀파이어",
        hero_skeleton: "스켈레톤",
        hero_viking: "바이킹",
        hero_paladin: "팔라딘"
    },
    en: {
        tutorial_title: "=== HOW TO PLAY ===",
        tutorial_move: "MOVE: Touch & drag (mobile) / WASD (keyboard)",
        tutorial_attack: "ATTACK: Automatic!",
        tutorial_xp: "Collect XP gems to level up",
        tutorial_levelup: "Choose weapons & tomes on level up",
        tutorial_chest: "Open chests with Silver",
        tutorial_boss: "Defeat the Boss at Level 12!",
        tutorial_pause: "PAUSE: Escape / P key",
        tutorial_start: ">>> TAP ANYWHERE TO START <<<",
        hud_kills: "Kills",
        hud_level: "Level",
        hud_gold: "Gold",
        hud_silver: "Silver",
        combo_nice: "NICE!",
        combo_great: "GREAT!",
        combo_amazing: "AMAZING!",
        combo_unstoppable: "UNSTOPPABLE!",
        combo_godlike: "GODLIKE!!!",
        combo_broken: "COMBO BROKEN",
        boss_incoming: "BOSS INCOMING!",
        boss_phase2: "ENRAGE!",
        boss_phase3: "FINAL FORM!",
        levelup_title: "LEVEL UP!",
        stat_damage: "Attack Power",
        stat_speed: "Move Speed",
        stat_attackspeed: "Attack Speed",
        stat_health: "Max Health",
        rarity_common: "Common",
        rarity_uncommon: "Uncommon",
        rarity_rare: "Rare",
        rarity_epic: "Epic",
        rarity_legendary: "Legendary",
        powerup_title: "Power Ups",
        ach_title: "Achievements",
        daily_title: "Daily Rewards",
        daily_claim: "Claim",
        weekly_title: "Weekly Challenges",
        weekly_reward: "Weekly Reward: 300G",
        evolution_evolved: "WEAPON EVOLVED!",
        gameover_victory: "VICTORY!",
        gameover_defeat: "DEFEAT...",
        gameover_kills: "Kills",
        gameover_time: "Time",
        gameover_gold: "Gold Earned",
        gameover_level: "Level Reached",
        endless_continue: "Continue to Endless?",
        endless_yes: "Continue",
        endless_no: "Exit",
        endless_wave: "Wave"
    }
};

// Current language (auto-detect or default Korean)
let currentLang = "ko";

export function setLanguage(lang) {
    if (LANG[lang]) currentLang = lang;
}

export function getLanguage() { return currentLang; }

export function t(key) {
    return LANG[currentLang]?.[key] || LANG.en?.[key] || key;
}

// Auto-detect language from browser
export function detectLanguage() {
    const browserLang = navigator.language?.substring(0, 2) || "en";
    if (LANG[browserLang]) {
        currentLang = browserLang;
    } else {
        currentLang = "en";
    }
    console.log("[i18n] Language detected:", currentLang);
    return currentLang;
}

console.log("[i18n] Module loaded!");
