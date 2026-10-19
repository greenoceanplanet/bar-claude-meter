# meter-js

[English](README.md) | **한국어**

Claude 사용량이 얼마나 남았는지 Claude Code 입력창 바로 아래에 보여주는 mod입니다.

![Claude Code에서 meter-js 사용 화면](docs/screenshot.png)

입력창 아래 줄에 지금 쓰는 모델과 effort, 5시간·주간(7일) 사용 한도 막대, 컨텍스트 사용률이 표시됩니다. `/usage`를 따로 입력하지 않아도 한도까지 얼마나 남았는지 바로 볼 수 있습니다.

## 화면 읽는 법

```
Opus 5.5 medium  5h▕██████▏92% 4h23m  7d▕█████ ▏80% 3d18h  C5%
```

| 표시 | 의미 |
| --- | --- |
| `Opus 5.5 medium` | 현재 모델과 effort. effort는 첫 메시지를 보낸 뒤에 나타납니다. |
| `5h` 막대 | 5시간 사용 한도 |
| `7d` 막대 | 주간 사용 한도 |
| `92%` (주황) | 해당 한도에서 **남은** 사용량 |
| `4h23m` (회색) | 한도가 초기화되기까지 남은 시간 |
| `C5%` | 컨텍스트 창 사용률. 80% 이상이면 빨간색 |

막대 하나에 두 막대가 위아래로 겹쳐 있습니다.

- **위쪽 주황:** 남은 사용량
- **아래쪽 회색:** 초기화까지 남은 시간

주황이 회색보다 길면 여유 있게 쓰고 있는 것이고, 회색이 더 길면 시간보다 사용량이 빨리 줄고 있어서 초기화 전에 한도에 닿을 수 있다는 뜻입니다.

5시간·주간 한도를 80%, 90% 썼을 때 알림도 띄워 줍니다.

터미널이 좁으면 알아서 줄여서 보여줍니다. 90칸 미만이면 숫자를 숨기고, 70칸 미만이면 `5h`/`7d` 글자도 숨깁니다.

## 설치 전 확인

- **Claude Code**가 설치되어 있고 **Claude 구독**(Pro 또는 Max)으로 로그인되어 있어야 합니다. API 키로 쓰면 5시간·주간 한도가 없어서 막대가 나오지 않습니다.
- Claude Code v2.1.303에서 확인했습니다. `claude --version`으로 버전을 보고, 낮으면 `claude update`로 업데이트하세요.

## 설치 방법

아래 명령은 Claude Code **안의 입력창**에 입력합니다. (터미널 명령창이 아닙니다.)

**1. 마켓플레이스 추가.** Claude Code가 이 mod를 어디서 받을지 알려줍니다.

```
/plugin marketplace add greenoceanplanet/meter-js
```

**2. mod 설치.**

```
/plugin install meter-js@meter-js
```

`meter-js@meter-js`는 "`meter-js` 마켓플레이스에 있는 `meter-js` mod"라는 뜻입니다.

**3. Claude Code 재시작.** `/exit`(또는 Ctrl+C 두 번)로 끄고 `claude`를 다시 실행합니다.

**4. 아무 메시지나 보내기.** 사용량 정보는 응답과 함께 오기 때문에 Claude가 한 번 답한 뒤부터 막대가 보입니다.

메뉴로 하고 싶다면 `/plugin`을 입력하고 **Marketplaces**에서 `greenoceanplanet/meter-js`를 추가한 뒤 **Discover**에서 `meter-js`를 고르면 됩니다.

> Mod는 샌드박스 없이 Claude Code와 같은 권한으로 실행됩니다. 소스가 짧으니 설치 전에 [`hooks/register.tsx`](hooks/register.tsx)와 [`hooks/meter.ts`](hooks/meter.ts)를 한번 훑어보셔도 좋습니다.

## 업데이트 받기

직접 추가한 마켓플레이스는 기본으로 자동 업데이트가 꺼져 있습니다. 자동 업데이트를 켜려면:

1. `/plugin`을 입력하고 **Marketplaces**를 엽니다.
2. **meter-js**를 선택합니다.
3. **Enable auto-update**를 고릅니다.

그러면 Claude Code를 시작할 때마다 새 버전이 있는지 확인합니다. 직접 업데이트하려면:

```
/plugin marketplace update meter-js
```

업데이트 후에는 Claude Code를 다시 시작하세요.

## 삭제

```
/plugin uninstall meter-js@meter-js
/plugin marketplace remove meter-js
```

## 문제 해결

| 증상 | 확인할 것 |
| --- | --- |
| 막대가 전혀 안 보임 | 메시지를 한 번 보내 보세요. 그래도 안 보이면 API 키가 아니라 구독 계정으로 로그인했는지 `/status`로 확인하세요. |
| 일부만 보임 | 터미널이 좁아서입니다. 창을 90칸 이상으로 넓히면 숫자까지 보입니다. |
| `/plugin` 명령이 없음 | Claude Code를 업데이트하세요: `claude update` |

## 직접 고쳐 쓰기

저장소를 받아서 그 폴더로 Claude Code를 실행하면 됩니다.

```
git clone https://github.com/greenoceanplanet/meter-js.git
claude --plugin-dir ./meter-js
```

- **색:** `hooks/register.tsx` 위쪽 상수 (`QUOTA_COLOR`, `TIME_COLOR`, `CTX_COLOR`, `CTX_WARN_COLOR`)
- **폭 기준:** `hooks/register.tsx`의 `LABELS_MIN_COLUMNS`, `NUMBERS_MIN_COLUMNS`
- **막대 길이:** `hooks/meter.ts`의 `barWidthFor` (터미널 폭에 따라 5~10칸)
- **Claude Code 기본 안내 문구:** `hooks/register.tsx`의 `HINT_PARTS`. 기본값은 `(shift+tab to cycle)`, `← for agents`는 숨기고 `esc to interrupt`는 넓은 터미널에서만 표시. 각각 `true`(항상) / `false`(숨김) / `'wide'`(넓을 때만)로 바꿀 수 있습니다. 권한 모드 표시(`⏵⏵ auto mode on ·`)는 Claude Code가 그리는 부분이라 바꿀 수 없습니다.

테스트 실행:

```
claude plugin test .
```

## 출처

0xGondarxyz의 [usage-meter](https://github.com/0xGondarxyz/usage-meter)(MIT)를 바탕으로 만들었습니다.

## 라이선스

MIT. [`LICENSE`](LICENSE) 참고.
