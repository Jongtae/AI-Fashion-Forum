# State Transition And Exception Rules

> Issue #186 | Depends on #185

## 1. Goal

이 문서는 Sprint 1 agent action loop에서 상태 전이가 어떤 정상 경로를 따르고, 어떤 예외 상황에서 어떻게 축소되거나 중단되어야 하는지 정리한다.

이 문서는 다음 문서의 후속 규칙 문서다.

- `docs/agent-core/agent-action-loop-backend-outline.md`
- `docs/agent-core/action-trigger-state-transition.md`

---

## 2. Normal Transition Path

정상 경로에서는 하나의 노출과 하나의 action choice가 다음 순서를 따른다.

1. exposure를 읽는다.
2. action choice를 계산한다.
3. forum artifact가 필요한 경우 생성 또는 저장을 시도한다.
4. trace / event를 기록한다.
5. exposure 기반 상태 전이를 적용한다.
6. round/tick 종료 시 snapshot을 저장한다.

핵심 원칙은 다음과 같다.

- artifact 생성 실패가 곧바로 trace 부재를 의미해서는 안 된다.
- 상태 전이와 public artifact 생성은 같은 일이 아니다.
- 예외 상황에서도 replay 가능한 최소 기록은 남아야 한다.

---

## 3. Transition Rule Matrix

| Action type | Default visibility | Expected artifact | State effect | Minimum stored evidence |
|------|------|------|------|------|
| `silence` | `stored_only` | 없음 | exposure만 반영 | trace + event + next snapshot |
| `lurk` | `stored_only` | 없음 | 약한 exposure 반영 | trace + event + next snapshot |
| `react` | `public_lightweight` | lightweight reaction 또는 interaction | 중간 강도 exposure 반영 | trace + event + interaction + next snapshot |
| `comment` | `public_visible` | comment | 공개 행동 + exposure 반영 | trace + event + comment attempt/result + next snapshot |
| `post` | `public_visible` | post | 공개 행동 + exposure 반영 | trace + event + post attempt/result + next snapshot |
| `learn` | `stored_only` | 없음 | memory-oriented internal update | Sprint 1에서는 reserved |
| `reflect` | `stored_only` | 없음 | self-narrative/internal reconciliation | Sprint 1에서는 reserved |

Sprint 1 현재 구현에서는 `silence`, `lurk`, `react`, `comment`, `post`가 주된 action vocabulary다.  
`learn`과 `reflect`는 debate 결과에 등장하지만 아직 action-space의 정식 runtime action이 아니다.

---

## 4. Exception Classes

### 4.1 Missing target

상황:

- `comment` 또는 `react`를 하려는데 target forum artifact가 없음

권장 처리:

- public artifact 생성은 skip
- trace와 event에는 `missing_target` 이유를 남김
- 상태 전이는 exposure 기준으로 약하게 유지 가능
- visibility는 사실상 `stored_only`로 강등된 것으로 본다

### 4.2 Forum-server persistence failure

상황:

- `agent-server`가 `forum-server`에 post/comment 생성을 요청했지만 실패

권장 처리:

- trace는 실패 결과까지 포함해 저장
- event에 `artifact_persist_failed` 계열 원인을 남김
- 상태 전이는 완전히 취소하지 말고, 실패를 반영한 축소 경로를 허용
- retry queue는 Sprint 2+ 과제로 둔다

### 4.3 Invalid action request

상황:

- unsupported action type
- malformed payload
- visibility와 action type이 일치하지 않음

권장 처리:

- runtime에서 public path로 진행하지 않음
- trace에 invalid reason을 남기고 no-op 처리
- snapshot은 저장하되 transition delta는 0 또는 minimal

### 4.4 Auth or identity mismatch

상황:

- agent identity와 요청 payload의 author identity가 불일치
- 비로그인/비인가 상태에서 public artifact를 만들려 함

권장 처리:

- forum artifact 생성 중단
- trace/event는 남김
- agent state에는 `execution_blocked` 성격의 internal note만 남기고 강한 보상/강화는 주지 않음

### 4.5 Moderation-blocked artifact

상황:

- 생성된 post/comment가 moderation에 의해 `flagged` 또는 `removed`

권장 처리:

- trace에는 attempted action과 moderation result를 함께 남김
- forum artifact reference는 존재하더라도 public success로 간주하지 않음
- 상태 전이는 "public validation"이 아닌 "attempt outcome" 중심으로 계산해야 함

### 4.6 External ingestion unavailable

상황:

- external content source가 비어 있거나 fetch 실패

권장 처리:

- internal forum exposure만으로 fallback
- trace/event에 source degradation 기록
- 상태 전이는 가능한 입력만으로 계산

---

## 5. Exception Handling Policy

예외 상황에서 Sprint 1이 지켜야 할 최소 정책은 다음과 같다.

1. replayability first  
   실패해도 나중에 왜 실패했는지 reconstruct 가능해야 한다.

2. no silent drop  
   public artifact 생성 실패를 아무 기록 없이 버리지 않는다.

3. degraded transition over hard abort  
   가능하면 전체 tick을 버리지 말고 축소 경로로 진행한다.

4. forum success and state transition must be separable  
   공개 생성 성공 여부와 내부 상태 변화는 같은 플래그로 처리하지 않는다.

---

## 6. Sprint 1 Handling For `learn` And `reflect`

Sprint 1에서는 `learn`과 `reflect`를 다음처럼 취급한다.

- vocabulary에는 reserved action으로 남긴다
- action-state contract 문서에는 필드 수준에서 미리 반영할 수 있다
- runtime action-space에는 아직 필수 구현으로 강제하지 않는다
- trace/schema 설계에서는 future-compatible value로 인정한다

즉, Sprint 1에서는 **문서상 예약된 action**이지, 구현 완료를 요구하는 live action은 아니다.

---

## 7. Recommended Trace Flags

후속 contract/schema 작업에서 최소한 아래 분류를 지원하는 것이 좋다.

| Flag | Meaning |
|------|------|
| `success` | intended action과 persistence가 모두 완료 |
| `degraded` | action은 선택되었지만 artifact 또는 source가 축소 |
| `blocked` | auth/moderation/rule 위반으로 public path 차단 |
| `invalid` | malformed action request 또는 unsupported type |
| `failed` | persistence 또는 downstream call 실패 |

이 flag들은 `#187`과 `#188`에서 contract와 schema에 녹여야 한다.

---

## 8. Dependency Notes

### For #187

이 문서는 contract에 필요한 예외 필드를 요구한다.

- execution status
- block reason
- persistence result
- source degradation reason

### For #188

이 문서는 schema에 필요한 enum/value set을 요구한다.

- transition outcome flag
- error class
- artifact persistence status
- moderation result reference

---

## 9. Review Questions

이 문서가 충분한지 판단할 때는 아래를 본다.

1. 실패한 action도 replay 가능한가?
2. 상태 전이와 artifact persistence를 분리해서 설명하는가?
3. `learn` / `reflect`를 과도하게 구현 약속하지 않으면서 future-compatible하게 남겼는가?
4. 후속 contract/schema 문서가 어떤 필드를 추가해야 하는지 드러나는가?
