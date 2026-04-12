# Pixel Infinity - Project Guide

## Project Overview
Construct 3 기반 로그라이트 액션 게임 (Tavern Survivors). Vampire Survivors 스타일.
8 히어로, 23+ 무기, 25+ 아이템, 12 토메, 8+ 적 유형, 보스 시스템.

## Key Files
- **Game Logic**: `HTML/scripts/project/*.js` (30 ES6 모듈)
- **Constants**: `HTML/scripts/project/GameConfig.js` — 모든 밸런스 수치
- **State**: `HTML/scripts/project/GameState.js` — 전역 상태 (수정 시 전 시스템 영향)
- **C3 Project**: `source.c3p` (zip) — Construct 3 원본 프로젝트
- **Web Build**: `HTML/` — 실행 가능한 웹 빌드

## Agent Team
6명의 전문 에이전트 팀이 `AGENTS.md`에 정의됨:
1. Game Architect — 구조/설정
2. Combat Designer — 전투/무기/데미지
3. Enemy & Boss Specialist — 적/보스/난이도
4. Economy & Progression Designer — 재화/XP/아이템/토메
5. Hero & Character Designer — 히어로/캐릭터
6. UI/UX Specialist — 인터페이스/입력

## PRD
전체 기능 명세는 `PRD.md` 참조. 모든 시스템의 수치, 공식, 데이터 테이블 포함.

## Working Rules
1. 수정 전 해당 파일을 반드시 읽을 것
2. 상수 변경은 `GameConfig.js`에서 중앙 관리
3. `GameState.js` 변경 시 모든 의존 모듈 확인
4. Construct 3 런타임 API는 `getRuntime()` 통해 접근
5. 새 오브젝트 타입 추가는 C3 에디터 필요 (JS만으로 불가)
6. 스프라이트 추가는 `HTML/images/`에 WebP 포맷으로
7. 반응형 스케일링: `ResponsiveScale.js`의 `scaleValue()` 사용

## Debug
- **U키**: 즉시 승리, **L키**: 즉시 레벨업
- 콘솔: `equip()`, `weapons()`, `items()`, `stats()`
