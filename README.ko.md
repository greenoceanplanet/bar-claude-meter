# meter-js

[English](README.md) | **한국어**

Claude Code 입력창 아래 줄에 Claude 사용량을 막대로 보여주는 mod.

```
Opus 5.5 high 5h▕████▀▀  ▏ 7d▕███▀▀   ▏ C28%
```

## 보여주는 것

- **모델명 · effort**: 메인 모델과 현재 effort. effort는 첫 요청을 보낸 뒤에 나타난다.
- **5h / 7d 막대**: 한 칸에 두 막대를 겹쳐 그린다.
  - 위(주황) = 남은 토큰 한도
  - 아래(회색) = 리셋까지 남은 시간
  - 끝에 주황(▀)만 남으면 토큰이 시간보다 많이 남은 것(여유). 회색(▄)만 남으면 토큰이 더 빨리 줄고 있는 것.
- **C%**: 컨텍스트 창 사용률. 80% 이상이면 빨간색.
- 터미널 폭이 110칸 이상이면 `5h`·`7d` 라벨과 함께 막대 뒤에 남은 % 와 남은 시간(`70% 2h30m`)도 표시.
- 막대 길이는 터미널 폭에 따라 5~10칸.
- 5h·주간 한도가 80%, 90%에 처음 닿을 때 토스트로 알림.

원래 힌트줄의 `(shift+tab to cycle)`, `← for agents` 문구는 숨긴다. 권한 모드 표시(`⏵⏵ auto mode on ·`)는 엔진이 그려서 바꿀 수 없다.

## 설치

```
/plugin marketplace add greenoceanplanet/meter-js
/plugin install meter-js@meter-js
```

로컬 폴더에서 바로:

```
claude --plugin-dir <이 폴더>
```

Mod는 샌드박스 없이 Claude Code와 같은 권한으로 실행된다. 설치 전에 소스를 확인할 것.

## 참고

- Claude 구독이 필요하다. API 키로는 rate limit 정보가 없어 막대가 나오지 않는다.
- 수치는 응답마다 갱신되고, 시간 막대는 1분마다 다시 그린다.
- 색은 `hooks/register.tsx` 위쪽 상수, 막대 길이는 `hooks/meter.ts`의 `barWidthFor` 에서 바꾼다.

## 테스트

```
claude plugin test .
```

## 라이선스

MIT. `LICENSE` 참고.
