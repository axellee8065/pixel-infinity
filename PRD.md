# Pixel Infinity (Tavern Survivors) - Product Requirements Document

**Version:** 1.0
**Date:** 2026-04-13
**Engine:** Construct 3 (HTML5/WebGL)
**Platform:** Mobile Web (Portrait 1080x1920)

---

## 1. Product Overview

### 1.1 Game Concept
Pixel Infinity는 뱀파이어 서바이버즈 스타일의 로그라이트 액션 게임이다. 플레이어는 8명의 히어로 중 1명을 선택하고, 끊임없이 몰려오는 적들을 물리치며 무기/아이템/토메를 수집하여 강해진다. 시간이 지날수록 난이도가 상승하며, 레벨 12에서 보스를 처치하는 것이 목표이다.

### 1.2 Core Loop
```
히어로 선택 → 전투 시작 → 적 처치 → XP/골드/실버 수집 →
레벨업(무기/토메 선택) → 상자 오픈(아이템 획득) →
난이도 상승 → 보스 전투 → 게임 종료/재시작
```

### 1.3 Target Platform
- **Primary:** Mobile Web Browser (터치 조이스틱)
- **Secondary:** Desktop Browser (WASD/Arrow 키보드)
- **Orientation:** Portrait (세로)
- **Resolution:** 1080 x 1920 (반응형 스케일링)

---

## 2. Game Systems

### 2.1 Hero System

#### 2.1.1 히어로 목록 (8종)

| ID | 이름 | 공격타입 | HP | 속도 | 데미지 | 공속 | 크릿% | 크릿배율 | 패시브 | 해금비용 |
|----|------|----------|-----|------|--------|------|-------|---------|--------|----------|
| mage | Mage | 원거리 | 120 | 300 | 25 | 1.1 | 5% | 2x | 공속 +10% | 무료 |
| archer | Archer | 원거리 | 100 | 375 | 22 | 1.2 | 5% | 2x | 이속 +25% | 무료 |
| cowboy | Cowboy | 원거리 | 110 | 310 | 18 | 1.3 | 20% | 3x | 크릿 마스터 | 무료 |
| sniper | Sniper | 원거리 | 105 | 280 | 45 | 0.7 | 5% | 2x | 데미지 +50% | 500G |
| vampire | Vampire | 원거리 | 130 | 290 | 20 | 1.0 | 5% | 2x | 흡혈 +1HP/hit | 750G |
| skeleton | Skeleton | 원거리 | 115 | 300 | 22 | 1.1 | 5% | 2x | XP +15% | 600G |
| viking | Viking | 근접 | 150 | 270 | 35 | 0.9 | 5% | 2x | 무기뎀 +30% | 800G |
| paladin | Paladin | 근접 | 180 | 260 | 28 | 0.8 | 5% | 2x | 최대HP +50% | 1000G |

#### 2.1.2 패시브 능력 유형
- **Speed**: 이동속도 고정값 증가
- **Attack Speed**: 공격 쿨다운 감소
- **Damage**: 데미지 % 증가
- **Tank**: 최대 체력 증가
- **Crit Master**: 크릿확률 + 3배 크릿배율 (Cowboy)
- **Lifesteal**: 적중 시 1HP 회복 (Vampire)
- **XP Bonus**: 경험치 15% 추가 (Skeleton)
- **Weapon Damage**: 무기 스탯 30% 보너스 (Viking)

#### 2.1.3 히어로 선택 흐름
1. 로비 화면에서 히어로 카드 좌우 스와이프
2. 잠긴 히어로는 골드로 해금
3. 선택 후 Play 버튼으로 게임 시작
4. 히어로 스탯이 GameState에 적용됨

---

### 2.2 Weapon System

#### 2.2.1 무기 목록 (23종)

| ID | 이름 | 타입 | 기본뎀 | 쿨다운 | 특수효과 | 레벨당뎀 | 쿨다운감소 |
|----|------|------|--------|--------|----------|----------|------------|
| lightning_staff | Lightning Staff | 타겟팅 | 80 | 1.8s | 3적 연쇄 | +8 | -0.12s |
| soul_aura | Soul Aura | 오라 | 30 | 0.8s | 지속 데미지장 | +5 | -0.06s |
| guardian_shield | Guardian Shield | 방어 | 0 | 10s | 회전 방패 | - | -1.0s |
| inferno_trail | Inferno Trail | 화염경로 | 10 | 2.5s | 불길 지형 | +3 | -0.15s |
| swift_blade | Swift Blade | 근접 | 70 | 0.5s | 자동 타겟 | +10 | -0.03s |
| fortune_dice | Fortune Dice | 랜덤 | 20 | 1.0s | 1-6뎀, 6=크릿 | +4 | -0.08s |
| executioner | Executioner | 관통 | 36 | 1.5s | 5% 즉사 | +6 | -0.1s |
| blood_ritual | Blood Ritual | 펄스 | 24 | 1.8s | 5% 최대HP+1/킬 | +4 | -0.12s |
| boomerang | Boomerang | 회귀 | 20 | 1.5s | 다중 부메랑 | +4 | -0.1s |
| longbow | Longbow | 관통 | 24 | 1.3s | 3적 관통 | +4 | -0.1s |
| pistol | Pistol | 버스트 | 10 | 1.0s | 6발/샷, 15%크릿 | +2 | -0.08s |
| spinning_axe | Spinning Axe | 공전 | 16 | 2.0s | 2개 회전 도끼 | +3 | -0.15s |
| bone_throw | Bone Throw | 바운스 | 22 | 1.8s | 적 사이 튕김 | +4 | -0.12s |
| sniper_rifle | Sniper | 관통 | 90 | 3.0s | 최고 단일타겟 | +15 | -0.2s |
| frost_trail | Frost Trail | 빙결경로 | 0 | 3.0s | 1.5s 빙결 | - | -0.25s |
| seeking_dagger | Seeking Dagger | 유도 | 18 | 1.2s | 자동 추적 | +3 | -0.08s |
| fire_staff | Fire Staff | 폭발 | 30 | 1.5s | 150반경 폭발 | +5 | -0.1s |
| sword | Sword | 근접 | 56 | 2.0s | 기본 강타 | +8 | -0.15s |
| cyclone | Cyclone | 넉백 | 16 | 2.0s | 적 밀어냄 | +3 | -0.15s |

#### 2.2.2 무기 레벨링 시스템
- **레벨 범위**: 0(미획득) ~ 8(최대)
- **획득 방법**: 레벨업 시 선택지에서 선택
- **레벨업 효과**: 데미지 증가 + 쿨다운 감소 + 특수 업그레이드
- **장착 슬롯**: 최대 4개 동시 장착
- **무기 타입**: 원거리/근접/오라/투사체/회귀/공전/화염경로/빙결경로

#### 2.2.3 무기 선택 로직
- 레벨업 시 3개 선택지 제공
- 최소 1개는 무기 (나머지는 토메)
- 이미 장착한 무기는 레벨업 선택지로 등장
- 4슬롯 가득 찬 경우 기존 무기 레벨업만 가능

---

### 2.3 Combat System

#### 2.3.1 데미지 계산 파이프라인
```
1. Base Damage (무기 또는 히어로 기본 공격)
   ↓
2. Additive % Modifiers (합산)
   - Power Core / Beer: +10%
   - Viking 패시브: +30%
   - Damage Tome: +18% per stack
   - Hoarder's Charm: +2.5% per chest
   - Reaper's Contract: +0.1% per kill
   ↓
3. Conditional Bonuses (조건부)
   - Precision Sight: +20% (적 HP > 90%)
   - Tyrant's Bane: +15% (보스)
   - Brawler's Gauntlet: +20% (근접 150px)
   - Ring of Fortitude: +20% per 100HP above base
   - Berserker's Collar: 0~100% (잃은 HP 비례)
   ↓
4. Critical Hit Check
   - Chance: 히어로 기본 + 아이템 + 토메 (max 90%)
   - Multiplier: 히어로 기본(2~3x) + 아이템
   - Ultra Crit: 2% 확률로 20x (Cataclysm Core)
   ↓
5. Floor & Clamp (최소 1 데미지)
```

#### 2.3.2 충돌 감지
- 총알 충돌 반경: 35px
- 적 충돌 반경: 80px (뷰포트 스케일링)
- 관통 총알: 적중 적 추적, 파괴되지 않음
- 보스 충돌: 일반 적과 분리 처리

#### 2.3.3 상태이상
| 효과 | 트리거 | 수치 | 지속시간 |
|------|--------|------|----------|
| 독 | Serpent's Fang 10% | 2뎀/0.5s틱 | 무한 (사망까지) |
| 속도 버프 | Velocity Shroud 피격 시 | +20% 이속 | 3초 |
| 빙결 | Frost Trail | 이동불가 | 1.5초 |

#### 2.3.4 특수 전투 메커니즘
- **Vampire 흡혈**: 적중 시 +1HP (오버힐 불가)
- **Leeching Rune**: 크릿 시 25% 확률로 10HP 회복
- **회피**: Zephyr Amulet + Evasion Tome으로 피해 무효화

---

### 2.4 Enemy System

#### 2.4.1 적 유형 (8종 + 보스)

| ID | 이름 | HP | 속도 | 데미지 | XP | 출현레벨 | 스폰확률 | 특수 |
|----|------|-----|------|--------|-----|----------|----------|------|
| enemy1 | Basic | 15 | 120 | 5 | 15 | 1 | 나머지% | 기본 돌진 |
| enemy5 | Fast Melee | 18 | 140 | 8 | 40 | 4 | 10% | 빠른 돌진 |
| enemy6 | Heavy Brute | 50 | 60 | 25 | 60 | 3 | 2% | 고HP 고데미지 |
| enemy4 | Archer | 12 | 90 | - | 50 | 5 | 3% | 원거리(600px) |
| enemy7 | Fire Mage | 25 | 70 | - | 45 | 5 | 7% | 파이어볼(500px) |
| enemy8 | Tank | 200 | 50 | 30 | 80 | 8 | 3% | 초고HP 저속 |
| enemy3 | Bat | 20 | 200 | 8 | 35 | 14 | 12% | 고속 |
| enemy2 | Goblin | 25 | 100 | 12 | 55 | 12 | 8% | 중간형 |
| boss | Boss | 5000 | 120 | 35 | 200 | 12 | 이벤트 | 1v1 전투 |

#### 2.4.2 스폰 시스템
- **동적 스폰율**: AoE 무기 보유량에 따라 더 많은 적 스폰
- **스폰 주기**: 1.0s → 0.25s (60초에 걸쳐 감소)
- **최대 적 수**: 45(초기) → 150(하드캡)
- **보장 스폰**: 레벨 3에서 Fire Mage 1회 보장
- **속도 분산**: 기본 적 ±40px 랜덤 변동

#### 2.4.3 적 AI
- **기본**: 플레이어 방향으로 직진
- **궁수**: 500px 사거리, 3초 쿨다운 원거리 공격
- **화염마법사**: 500px 사거리, 3초 쿨다운 파이어볼
- **보스**: 직진 + 고데미지 근접

#### 2.4.4 드롭 테이블
| 드롭 | 확률 | 값 | 보스 |
|------|------|-----|------|
| XP 젬 | 100% | 적 XP값 | 200 |
| 골드 | 10% | 1 | 10 (100%) |
| 실버 | 8% | 1~2 | 15 (100%) |

#### 2.4.5 보스 시스템
- **출현 조건**: 플레이어 레벨 12
- **사전 경고**: 3초 경고 후 스폰
- **1v1 모드**: 스폰 전 모든 일반 적 제거
- **보스 HP바**: 별도 상단 HP바 표시
- **처치 후**: 10초 휴식, 자석 효과로 모든 XP/골드 수집
- **HP 스케일링**: 5000 × 난이도 배수

---

### 2.5 Item System

#### 2.5.1 아이템 목록 (25종)

| ID | 이름 | 효과 | 값 | 등급 | 스태킹 |
|----|------|------|-----|------|--------|
| fractured_lens | Fractured Lens | 크릿배율 증가 | +1x | Rare | O |
| serpents_fang | Serpent's Fang | 독 확률 | +10% | Rare | O |
| sages_scroll | Sage's Scroll | XP 보너스 | +8% | Uncommon | O |
| zephyr_amulet | Zephyr Amulet | 회피 확률 | +10% | Rare | O |
| pouch_of_plunder | Pouch of Plunder | 골드/킬 | +1 | Common | O |
| power_core | Power Core | 데미지 증가 | +10% | Uncommon | O |
| stone_of_resilience | Stone of Resilience | 최대HP 증가 | +25 | Common | O |
| winged_sandals | Winged Sandals | 이동속도 | +15% | Common | O |
| precision_sight | Precision Sight | 조건부 데미지(>90%HP) | +20% | Uncommon | O |
| tempo_metronome | Tempo Metronome | 공격속도 | +8% | Uncommon | O |
| focus_crystal | Focus Crystal | 크릿확률 | +10% | Rare | O |
| tyrants_bane | Tyrant's Bane | 보스 데미지 | +15% | Rare | O |
| key | Key | 무료 상자 확률 | +10% | Uncommon | O |
| hoarders_charm | Hoarder's Charm | 상자당 데미지 | +2.5% | Epic | O |
| velocity_shroud | Velocity Shroud | 피격 시 이속 버프 | +20%/3s | Rare | O |
| beer | Beer | 데미지 증가 | +10% | Common | O |
| campfire | Campfire | 정지 시 HP 재생 | +5HP/s | Uncommon | O |
| brawlers_gauntlet | Brawler's Gauntlet | 근접 조건부 데미지 | +20% | Uncommon | O |
| leeching_rune | Leeching Rune | 크릿 시 회복 | 25%→10HP | Epic | O |
| echoing_tome | Echoing Tome | 추가 젬 드롭 | +12% | Uncommon | O |
| ring_of_fortitude | Ring of Fortitude | HP비례 데미지 | +20%/100HP | Epic | O |
| berserkers_collar | Berserker's Collar | 잃은HP 비례 데미지 | 0~100% | Epic | O |
| reapers_contract | Reaper's Contract | 킬당 영구 데미지 | +0.1%/kill | Legendary | O |
| cataclysm_core | Cataclysm Core | 울트라 크릿 | 2%→20x | Legendary | O |

#### 2.5.2 아이템 획득 경로
- **상자 시스템**: 25초마다 스폰, 실버로 개봉
- **비용 증가**: 3 + (2 × 개봉 횟수)
- **슬롯 머신 연출**: 개봉 시 룰렛 애니메이션
- **스태킹**: 동일 아이템 중복 획득 가능, 효과 누적

---

### 2.6 Tome System

#### 2.6.1 토메 목록 (12종)

| ID | 이름 | 효과 | 값/스택 | 최대값 |
|----|------|------|---------|--------|
| agility | Agility Tome | 이동속도 | +60 | 1000 |
| silver | Silver Tome | 실버 드롭률 | +3% | 50% |
| regen | Regen Tome | 킬당 회복 | +1HP | 10HP |
| crit | Crit Tome | 크릿확률 | +12% | 90% |
| knockback | Knockback Tome | 넉백력 | +10 | 150 |
| hp | HP Tome | 최대HP | +30 | 800 |
| evasion | Evasion Tome | 회피확률 | +5% | 50% |
| gold | Gold Tome | 골드 드롭률 | +3% | 50% |
| damage | Damage Tome | 전체 데미지 | +18% | 300% |
| cooldown | Cooldown Tome | 무기 쿨다운 | -10% | 60% |
| attraction | Attraction Tome | 픽업 범위 | +30 | 400 |
| xp | XP Tome | XP 보너스 | +25% | 200% |

#### 2.6.2 토메 메커니즘
- 레벨업 시 6개 랜덤 토메 중 1개 선택 가능
- 무한 스태킹 (캡까지)
- 스탯 즉시 재계산
- 런 내 지속 (런 종료 시 초기화)

---

### 2.7 Economy System

#### 2.7.1 골드 (영구 재화)
- **획득**: 적 처치 10% 확률(1G), 보스 100%(10G)
- **용도**: 히어로 해금 (500~1000G)
- **저장**: LocalStorage에 영구 저장
- **추가 보너스**: Pouch of Plunder (+1G/킬), Gold Tome (+3% 드롭)

#### 2.7.2 실버 (런 재화)
- **획득**: 적 처치 8% 확률(1~2S), 보스 100%(15S)
- **용도**: 상자 개봉
- **초기화**: 매 런 리셋
- **보장**: 첫 4킬에서 2실버 보장
- **추가 보너스**: Silver Tome (+3% 드롭)

#### 2.7.3 상자 시스템
- **스폰 주기**: ~25초
- **개봉 비용**: 3 + (2 × 개봉수)
- **대기 시간**: 20초 후 타임아웃
- **보상**: 랜덤 아이템 1개
- **연출**: 슬롯 머신 애니메이션

---

### 2.8 Progression System

#### 2.8.1 XP 커브
```
Level 1:  50 XP
Level 2:  75 XP (× 1.5)
Level 3:  112 XP
Level 4:  168 XP
Level 5:  253 XP
...
Level 12: ~6,440 XP (보스 스폰)
```

#### 2.8.2 레벨업 보상
1. 풀 HP 회복
2. 3개 선택지 중 1개 선택:
   - 무기 획득/업그레이드 (최소 1개 보장)
   - 토메 획득
3. 게임 일시정지, 선택 패널 표시

#### 2.8.3 런 간 진행
| 항목 | 저장 여부 |
|------|-----------|
| 골드 | O (영구) |
| 해금 히어로 | O (영구) |
| 선택 히어로 | O (영구) |
| 하이스코어 | O (영구) |
| 총 플레이타임 | O (영구) |
| 무기/아이템/토메 | X (런 리셋) |
| 실버 | X (런 리셋) |
| 레벨/XP | X (런 리셋) |

---

### 2.9 Difficulty System

#### 2.9.1 시간 기반 스케일링
```
매 20초:
  난이도 배수 += 0.25x (가산)

레벨 4 이상:
  적 HP: +30% per level
  적 데미지: +25% per level
  적 속도: +10% per level

스폰율:
  1.0s → 0.25s (60초에 걸쳐 선형 감소)
  레벨 12+: 45% 가속
  레벨 4+: 40% 가속

최대 적 수:
  분당 +5 증가
  하드캡: 150
```

#### 2.9.2 동적 스폰 조정
- AoE 무기 보유량에 따라 스폰율 추가 증가
- 강한 플레이어 = 더 많은 적 = 더 많은 XP/드롭

---

### 2.10 UI/UX System

#### 2.10.1 게임 HUD
- **HP바**: 플레이어 위 (월드 공간), 비율 기반 채움
- **XP바**: 화면 하단 중앙
- **골드/실버 표시**: 플레이어 근처 플로팅 텍스트
- **레벨 텍스트**: 현재 레벨
- **킬 카운터**: 현재 런 처치수
- **타이머**: 경과 시간

#### 2.10.2 입력 시스템
- **모바일**: 가상 조이스틱 (터치 위치에 동적 생성)
- **데스크톱**: WASD / 방향키
- **디버그 키**: U(즉시 승리 +200G), L(즉시 레벨업)

#### 2.10.3 시각 피드백
- **카메라 쉐이크**: 8x 강도, 0.15s (데미지 비례)
- **비네트 플래시**: 피격 시 붉은 틴트
- **데미지 텍스트**: 빨강(일반), 노랑(크릿), 보라(울트라 크릿)

#### 2.10.4 반응형 스케일링
```javascript
scaleFactor = sqrt(viewportW² + viewportH²) / sqrt(1080² + 1920²)
```
- 플레이어/적 속도, 스폰 거리, 픽업 범위, 공격 범위 모두 스케일링
- 쿨다운은 스케일링 제외

---

### 2.11 Save/Load System

#### 2.11.1 저장 구조
```javascript
{
  selectedHeroId: "archer",    // 선택된 히어로
  unlockedHeroes: ["archer"],  // 해금된 히어로 목록
  gold: 0,                     // 보유 골드
  currentLevel: 1,             // 최고 레벨
  highScore: 0,                // 최고 기록
  totalPlayTime: 0             // 총 플레이 시간
}
```

#### 2.11.2 저장 시점
- 골드 획득 시
- 히어로 해금 시
- 게임 종료 시

#### 2.11.3 저장소
- **Key**: `VSURVIVORS_SAVE`
- **Engine**: LocalStorage
- **Format**: JSON

---

## 3. Technical Architecture

### 3.1 Module Structure (30 Files)

```
HTML/scripts/project/
├── Core
│   ├── main.js              (25KB) 엔트리포인트, 시스템 초기화
│   ├── GameConfig.js         상수/설정값 중앙 관리
│   ├── GameState.js          전역 상태 컨테이너
│   └── SaveManager.js        LocalStorage 영속성
│
├── Combat
│   ├── CombatSystem.js       충돌 감지, 데미지 적용
│   ├── DamageCalculator.js   (16KB) 복합 데미지 공식
│   ├── WeaponSystem.js       (75KB) 무기 생성/발사/쿨다운
│   ├── WeaponData.js         (22KB) 23+무기 정의/업그레이드
│   ├── MeleeAttack.js        근접 공격 (팔라딘/바이킹)
│   ├── StatusEffects.js      독 디버프 시스템
│   └── DamageEffects.js      시각적 피드백
│
├── Enemies
│   ├── EnemyManager.js       (39KB) 스폰, AI, 상태 관리
│   ├── BossManager.js        (19KB) 보스 전용 로직
│   └── DifficultyManager.js  시간 기반 난이도 스케일링
│
├── Progression
│   ├── XPSystem.js           (23KB) 젬 수집, XP, 레벨링
│   ├── LevelUpManager.js     (21KB) 레벨업 패널/선택
│   ├── ItemSystem.js         (23KB) 25+아이템 정의/인벤토리
│   ├── TomeSystem.js         (13KB) 12종 토메/스태킹
│   ├── ChestSystem.js        (11KB) 상자 스폰/개봉
│   ├── GoldSystem.js         골드 드롭/수집
│   └── SilverSystem.js       (18KB) 실버 드롭/수집
│
├── Characters
│   ├── HeroData.js           8 히어로 정의/패시브
│   ├── HeroSelection.js      히어로 선택 로직
│   └── PlayerController.js   플레이어 이동/체력/데미지
│
├── UI
│   ├── UIManager.js          (15KB) HUD 업데이트
│   ├── InputManager.js       조이스틱/키보드 입력
│   ├── StatsDisplay.js       (19KB) 스탯 패널
│   ├── LobbyManager.js       (43KB) 로비/메뉴 UI
│   └── ResponsiveScale.js    반응형 스케일링
│
└── Events
    └── javaScriptInEvents.js C3 이벤트-JS 브리지
```

### 3.2 Asset Summary
| 카테고리 | 포맷 | 크기 | 내용 |
|----------|------|------|------|
| 스프라이트 | WebP | ~7.1MB | 히어로, 적, 보스, 아이템, 무기, 토메, 이펙트, 배경 |
| 오디오 | WebM | ~968KB | BGM 2곡, SFX 15+종 |
| 폰트 | TTF | ~84KB | UI 폰트 + 던전 폰트 |
| 아이콘 | PNG | ~144KB | 16~512px 앱 아이콘 |

### 3.3 External Dependencies
- **Construct 3 Runtime**: `c3runtime.js` (1.5MB)
- **Behaviors**: NSG_Isometric, Tween, MoveTo, Solid
- **Shaders**: BetterOutline (by skymen)
- **Service Worker**: 오프라인 캐싱 지원

---

## 4. Customization Points

### 4.1 즉시 수정 가능 (GameConfig.js)
- 플레이어 기본 스탯 (HP/속도/데미지/공속)
- 적 유형별 HP/속도/데미지/XP/스폰레벨
- 보스 HP/스탯/스폰 레벨
- 난이도 스케일링 간격/배수
- 스폰율 범위
- 골드/실버 드롭 확률/값
- XP 기초값/배수
- 뷰포트 해상도

### 4.2 모듈 단위 수정
- **새 무기 추가**: WeaponData.js에 정의 + WeaponSystem.js에 발사 로직
- **새 적 추가**: GameConfig.js에 스탯 + EnemyManager.js에 AI + 스프라이트 추가
- **새 히어로 추가**: HeroData.js에 정의 + 스프라이트 + LobbyManager.js 카드 추가
- **새 아이템 추가**: ItemSystem.js에 정의 + DamageCalculator.js에 효과 반영
- **새 토메 추가**: TomeSystem.js에 정의 + LevelUpManager.js에 선택풀 추가
- **새 상태이상**: StatusEffects.js에 로직 + DamageEffects.js에 시각효과

### 4.3 대규모 기능 확장
- 멀티 보스 시스템 (현재 1보스)
- 스테이지/맵 시스템 (현재 무한 필드)
- 온라인 리더보드
- 업적 시스템
- 무기 진화/합성 시스템
- 펫/소환물 시스템
- 이벤트/시즌 콘텐츠

---

## 5. Debug & Testing

### 5.1 내장 디버그 키
- **U키**: 즉시 승리 (+200 골드)
- **L키**: 즉시 레벨업

### 5.2 콘솔 테스트 명령어
```javascript
equip()     // 무기 장착 테스트
weapons()   // 무기 목록 출력
items()     // 아이템 목록 출력
stats()     // 현재 스탯 출력
```

---

## 6. Known Constraints
1. **Construct 3 종속**: 오브젝트 생성/파괴는 C3 런타임 API 필수
2. **싱글 보스**: 현재 1종 보스만 구현
3. **로컬 저장**: 서버 없이 LocalStorage만 사용
4. **모바일 우선**: 데스크톱 UI는 부차적
5. **에너지 모드**: 미완성 기능 (3x 크기, 9999HP 유닛)
