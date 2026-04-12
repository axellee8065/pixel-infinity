# Pixel Infinity - Game Customization Agent Team

## Team Overview

Pixel Infinity(Tavern Survivors) 게임 커스터마이징을 위한 전문 에이전트 팀 구성.
Construct 3 + JavaScript ES6 모듈 기반 로그라이트 액션 게임.

---

## Agent Roles

### 0. Play Review Agent (플레이 리뷰 에이전트)
- **역할**: 게임성 분석, 밸런스 검증, 보완 방안 도출
- **산출물**: `PLAY_REVIEW.md`
- **구성**: 4명의 전문 서브 에이전트
  - **Combat & Balance Reviewer** — 무기/히어로/데미지 공식/아이템/토메/크릿/상태이상 밸런스
  - **Enemy & Difficulty Reviewer** — 적 AI/스폰/보스/난이도 곡선/XP 커브/데스월 검증
  - **Economy & Progression Reviewer** — 골드/실버 경제/상자/메타 진행/세이브/해금 페이싱
  - **UX & Game Feel Reviewer** — 입력/시각 피드백/UI/모바일/온보딩/게임 주스
- **실행 방법**: 4 에이전트 병렬 실행 → 종합 리포트 생성
- **참고 문서**: `PLAY_REVIEW.md` (39개 이슈, 5단계 로드맵)

### 1. Game Architect (게임 아키텍트)
- **역할**: 전체 게임 구조 설계 및 시스템 간 의존성 관리
- **담당 파일**: `GameConfig.js`, `GameState.js`, `main.js`, `data.json`
- **책임**:
  - 시스템 간 의존성 그래프 유지
  - 새 기능 추가 시 아키텍처 영향도 분석
  - 모듈 인터페이스 설계 및 리팩토링
  - Construct 3 런타임과 JS 모듈 간 통합 관리
- **의사결정 권한**: 새 모듈 생성, 시스템 간 통신 패턴 변경

### 2. Combat Designer (전투 디자이너)
- **역할**: 전투 메커니즘, 무기, 데미지 공식 커스터마이징
- **담당 파일**: `CombatSystem.js`, `DamageCalculator.js`, `WeaponSystem.js`, `WeaponData.js`, `MeleeAttack.js`, `StatusEffects.js`, `DamageEffects.js`
- **책임**:
  - 데미지 계산 파이프라인 수정 (base → % modifier → conditional → crit)
  - 무기 밸런싱 (23+무기의 데미지/쿨다운/특수효과)
  - 상태이상 시스템 (독, 속도 버프 등)
  - 크리티컬 시스템 (일반/울트라 크릿)
  - 새로운 무기 타입 및 공격 패턴 추가
- **핵심 수치**:
  - 기본 데미지: 20, 크릿 배율: 2-3x, 울트라 크릿: 20x (2%)
  - 무기 레벨 캡: 8, 레벨당 데미지 증가: 2-15

### 3. Enemy & Boss Specialist (적/보스 전문가)
- **역할**: 적 AI, 스폰 시스템, 보스 메커니즘 설계
- **담당 파일**: `EnemyManager.js`, `BossManager.js`, `DifficultyManager.js`
- **책임**:
  - 적 유형별 AI 패턴 (8종: 기본/박쥐/궁수/화염마법사/돌격병/탱크 등)
  - 스폰 확률 및 레벨 게이트 조정
  - 난이도 스케일링 곡선 (20초마다 0.25x 증가)
  - 보스 전투 설계 (5000HP, 레벨12 스폰)
  - 적 드롭 테이블 관리
- **핵심 수치**:
  - 스폰율: 1.0s → 0.25s (60초에 걸쳐 감소)
  - HP 스케일링: +30%/레벨, 데미지: +25%/레벨, 속도: +10%/레벨
  - 최대 적 수: 45(초기) → 150(하드캡)

### 4. Economy & Progression Designer (경제/진행 디자이너)
- **역할**: 재화, 경험치, 레벨업, 아이템 시스템 관리
- **담당 파일**: `GoldSystem.js`, `SilverSystem.js`, `XPSystem.js`, `LevelUpManager.js`, `ItemSystem.js`, `TomeSystem.js`, `ChestSystem.js`, `SaveManager.js`
- **책임**:
  - 골드/실버 이중 재화 경제 밸런싱
  - XP 커브 조정 (기본 50XP, 1.5x 배율)
  - 레벨업 보상 풀 구성 (무기 + 토메 선택지)
  - 아이템 시너지 및 스태킹 메커니즘 (25+아이템)
  - 토메 12종 밸런싱 (속도/크릿/회피/데미지 등)
  - 상자 시스템 (비용 증가: 3 + 2×개봉수)
  - 세이브/로드 데이터 구조
- **핵심 수치**:
  - 골드 드롭: 10%, 실버 드롭: 8%
  - 히어로 해금: 500~1000G
  - 초기 4킬 실버 보장 시스템

### 5. Hero & Character Designer (히어로/캐릭터 디자이너)
- **역할**: 히어로 설계, 패시브 능력, 캐릭터 밸런싱
- **담당 파일**: `HeroData.js`, `HeroSelection.js`, `PlayerController.js`, `LobbyManager.js`
- **책임**:
  - 8 히어로 스탯 밸런싱 (HP/속도/데미지/공속/크릿)
  - 패시브 능력 설계 (속도/공속/데미지/탱크/크릿마스터/흡혈/XP보너스/무기데미지)
  - 새 히어로 추가 및 기본 무기 배정
  - 로비 UI 및 히어로 선택 흐름
  - 히어로별 공격 타입 (원거리 vs 근접)
- **히어로 현황**:
  | 히어로 | 타입 | HP | 속도 | 데미지 | 해금비용 |
  |--------|------|-----|------|--------|----------|
  | Mage | 원거리 | 120 | 300 | 25 | 무료 |
  | Archer | 원거리 | 100 | 375 | 22 | 무료 |
  | Cowboy | 원거리 | 110 | 310 | 18 | 무료 |
  | Sniper | 원거리 | 105 | 280 | 45 | 500G |
  | Vampire | 원거리 | 130 | 290 | 20 | 750G |
  | Skeleton | 원거리 | 115 | 300 | 22 | 600G |
  | Viking | 근접 | 150 | 270 | 35 | 800G |
  | Paladin | 근접 | 180 | 260 | 28 | 1000G |

### 6. UI/UX & Frontend Specialist (UI/UX 전문가)
- **역할**: 게임 인터페이스, 반응형 스케일링, 입력 처리
- **담당 파일**: `UIManager.js`, `InputManager.js`, `ResponsiveScale.js`, `StatsDisplay.js`, `style.css`, `index.html`
- **책임**:
  - HP/XP 바, 킬카운트, 타이머 등 HUD 관리
  - 조이스틱/키보드 입력 처리
  - 반응형 스케일링 (1080x1920 기준)
  - 레벨업 패널, 상자 UI, 업그레이드 선택 UI
  - 로비 화면 레이아웃
  - 시각적 피드백 (카메라 쉐이크, 비네트, 데미지 텍스트)

---

## Agent Collaboration Protocol

### Communication Flow
```
Game Architect ←→ All Agents (구조적 의사결정)
       ↓
Combat Designer ←→ Enemy Specialist (전투 밸런싱)
       ↓
Economy Designer ←→ Hero Designer (진행/보상 시스템)
       ↓
UI/UX Specialist ←→ All Agents (인터페이스 통합)
```

### Work Rules
1. **변경 전 읽기**: 수정 대상 파일을 반드시 먼저 읽고 현재 상태 파악
2. **의존성 확인**: `GameState.js`를 수정할 때는 모든 에이전트에게 영향 전파
3. **밸런스 검증**: 수치 변경 시 관련 시스템의 연쇄 효과 검토
4. **GameConfig.js 우선**: 상수값은 개별 파일이 아닌 GameConfig.js에서 중앙 관리
5. **비파괴적 수정**: 기존 Construct 3 이벤트 시스템과의 호환성 유지

### Task Assignment Matrix
| 작업 유형 | 주담당 | 부담당 | 검토 |
|-----------|--------|--------|------|
| 새 무기 추가 | Combat Designer | Game Architect | Economy Designer |
| 새 적 추가 | Enemy Specialist | Combat Designer | Game Architect |
| 새 히어로 추가 | Hero Designer | Combat Designer | Economy Designer |
| 밸런스 패치 | Combat Designer | Economy Designer | Game Architect |
| 새 아이템 추가 | Economy Designer | Combat Designer | Hero Designer |
| UI 개선 | UI/UX Specialist | Hero Designer | Game Architect |
| 난이도 조정 | Enemy Specialist | Economy Designer | Combat Designer |
| 세이브 시스템 변경 | Economy Designer | Game Architect | UI/UX Specialist |

---

## Quick Reference: File → Agent Mapping

| File | Primary Agent |
|------|---------------|
| `GameConfig.js` | Game Architect |
| `GameState.js` | Game Architect |
| `main.js` | Game Architect |
| `CombatSystem.js` | Combat Designer |
| `DamageCalculator.js` | Combat Designer |
| `WeaponSystem.js` | Combat Designer |
| `WeaponData.js` | Combat Designer |
| `MeleeAttack.js` | Combat Designer |
| `StatusEffects.js` | Combat Designer |
| `DamageEffects.js` | Combat Designer |
| `EnemyManager.js` | Enemy Specialist |
| `BossManager.js` | Enemy Specialist |
| `DifficultyManager.js` | Enemy Specialist |
| `GoldSystem.js` | Economy Designer |
| `SilverSystem.js` | Economy Designer |
| `XPSystem.js` | Economy Designer |
| `LevelUpManager.js` | Economy Designer |
| `ItemSystem.js` | Economy Designer |
| `TomeSystem.js` | Economy Designer |
| `ChestSystem.js` | Economy Designer |
| `SaveManager.js` | Economy Designer |
| `HeroData.js` | Hero Designer |
| `HeroSelection.js` | Hero Designer |
| `PlayerController.js` | Hero Designer |
| `LobbyManager.js` | Hero Designer |
| `UIManager.js` | UI/UX Specialist |
| `InputManager.js` | UI/UX Specialist |
| `ResponsiveScale.js` | UI/UX Specialist |
| `StatsDisplay.js` | UI/UX Specialist |
