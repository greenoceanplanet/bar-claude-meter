# claude-meter (usage-meter 커스텀 버전)

Claude 사용량(5시간/주간 rate limit)을 상태줄에 보여주는 `usage-meter` 플러그인을 가져와 여러모로 수정해 쓰기 위한 작업 폴더.

## 출처
- 원본: https://github.com/0xGondarxyz/usage-meter (v0.1.0, commit 4bfe82f) — MIT
- 설치본 위치: `~/.claude/plugins/cache/usage-meter/usage-meter/0.1.0` (`usage-meter@usage-meter`, 아직 활성 상태)
- git: 첫 커밋 `3e39f3b` = 원본 그대로. remote `upstream` = 원본 저장소 (fork는 아직 안 함)

## 구조
- `hooks/meter.ts` — 사용량 계산/표시 핵심 로직
- `hooks/register.ts`, `hooks/hooks.json` — 훅 등록
- `hooks/usage-meter.test.ts` — 테스트
- `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` — 매니페스트

## 결정 사항
- 폴더명은 한글 대신 영문: `잔량표시기` → `claude-meter` (변경 완료)
- 플러그인/marketplace 이름도 `claude-meter` 로 변경 (완료) (원본 `usage-meter`와 충돌 방지)
- 패키지 매니저는 가급적 pnpm, uv

## 다음 할 일
1. ~~`.claude-plugin/*.json` 이름 → `claude-meter`~~ (완료)
2. 로컬 marketplace 등록: `/plugin marketplace add <이 폴더 경로>` → `claude-meter@claude-meter` 설치
3. 원본 `usage-meter@usage-meter` 비활성화/제거
4. 이후 원하는 기능 수정 (사용자에게 무엇을 바꿀지 확인)
