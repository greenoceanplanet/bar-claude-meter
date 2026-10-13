# meter-js (usage-meter 커스텀 버전)

Claude 사용량(5시간/주간 rate limit)을 상태줄에 보여주는 `usage-meter` 플러그인을 가져와 여러모로 수정해 쓰기 위한 작업 폴더.

## 출처
- 원본: https://github.com/0xGondarxyz/usage-meter (v0.1.0, commit 4bfe82f) — MIT
- 설치본 위치: `~/.claude/plugins/cache/usage-meter/usage-meter/0.1.0` (`usage-meter@usage-meter`, 제거됨)
- git: 첫 커밋 `3e39f3b` = 원본 그대로. remote `upstream` = 원본 저장소 (fork는 아직 안 함)

## 구조
- `hooks/meter.ts` — 사용량 계산/표시 핵심 로직
- `hooks/register.tsx` — 입력창 아래 힌트줄에 컬러 막대 표시(위=토큰 잔량 파랑, 아래=시간 잔량 주황), `types/index.d.ts` = $.state 계약
- `hooks/hooks.json` — 훅 등록
- `hooks/usage-meter.test.ts` — 테스트
- `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` — 매니페스트

## 결정 사항
- 폴더명은 한글 대신 영문: `잔량표시기` → `claude-meter` (변경 완료)
- 플러그인/marketplace 이름은 `meter-js` (`claude-` 접두어는 Anthropic 예약이라 사용 불가). 폴더명은 claude-meter (원본 `usage-meter`와 충돌 방지)
- 패키지 매니저는 가급적 pnpm, uv
- 하단 상태줄($.ui.status)은 색 불가 → 입력창 아래 힌트줄(PromptHint)을 대신 그림(엔진 힌트는 뒤에 흐리게). 예전엔 AbovePrompt band 사용. band 바깥 Box에 음수 margin을 주면 band가 아예 안 보임. 입력창 위 빈 줄은 엔진 기본 간격이라 못 줄임

## 다음 할 일
1. ~~`.claude-plugin/*.json` 이름 → `meter-js`~~ (완료)
2. ~~로컬 marketplace 등록 + `meter-js@meter-js` 설치~~ (완료)
3. ~~원본 `usage-meter@usage-meter` 제거~~ (완료)
4. 이후 원하는 기능 수정 (사용자에게 무엇을 바꿀지 확인)
