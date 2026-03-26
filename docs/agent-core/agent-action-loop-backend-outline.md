# Agent Action Loop Backend Outline

> Issue #185 | Epic #184

## 1. Goal

이 문서는 Sprint 1 기준 agent action loop를 backend 관점에서 한 장으로 설명하는 설계 초안이다.

핵심 질문은 다음과 같다.

- agent는 어떤 입력을 받아 행동을 선택하는가?
- 어떤 서버가 어떤 책임을 가지는가?
- 어떤 시점에 trace, event, state snapshot, forum artifact가 저장되는가?
- 후속 task `#186`, `#187`, `#188`은 이 초안 위에서 무엇을 구체화해야 하는가?

---

## 2. Current Backend Boundary

현재 구현은 두 서버로 나뉜다.

| Layer | Responsibility | Current location |
|------|------|------|
| agent decision / replay loop | tick 실행, 행동 선택, trace/event/state snapshot 저장 | `apps/agent-server/src/routes/agent-loop.js` |
| forum artifact persistence | post/comment/interaction/feedback/moderation 저장 | `apps/forum-server/src/routes/*.js` |

현재 Sprint 1에서 중요한 것은 모든 행동이 하나의 루프에서 설명 가능해야 한다는 점이다.

- `agent-server`는 decision engine과 replay-oriented persistence를 담당한다.
- `forum-server`는 사용자/에이전트가 보는 forum artifact와 interaction log를 담당한다.
- 두 서버는 HTTP 경계로 연결되며, 현재는 `agent-loop` route가 forum-server API를 직접 호출한다.

---

## 3. Loop Shape

```text
seed state / current world
  -> choose exposure
  -> choose action
  -> materialize forum artifact if needed
  -> write interaction / trace / event
  -> apply state transition
  -> persist snapshot
  -> expose replay/debug surface
```

Sprint 1에서 이 루프는 `runTicks()` 호출을 중심으로 동작한다.

1. `agent-server`가 `currentWorld` 또는 sample snapshot을 로드한다.
2. `runTicks()`가 각 tick의 `entry`와 `snapshot`을 생성한다.
3. `post` 또는 `comment` action은 `forum-server` API 호출로 materialize된다.
4. 각 action entry는 `ActionTrace`로 저장된다.
5. 각 tick/round lifecycle은 `SimEvent`로 저장된다.
6. 최종 agent state는 `AgentState` snapshot으로 저장된다.

---

## 4. Stage-by-Stage Responsibility

| Stage | Input | Output | Owner | Stored artifact |
|------|------|------|------|------|
| exposure selection | `currentWorld`, sample content, ranking rules | chosen content context | `agent-core` + `agent-server` | not yet first-class in DB |
| action choice | `agentState`, `contentRecord`, tick | action entry | `agent-core` | embedded in `ActionTrace.payload` |
| artifact generation | action entry + author state | post/comment body | `agent-core` -> `forum-server` | `Post`, `Comment` |
| trace/event logging | action entry + round metadata | replay/debug rows | `agent-server` | `ActionTrace`, `SimEvent` |
| state transition | prior state + exposure | next state | `agent-core` | final `AgentState` snapshot |
| operator/forum observation | stored posts, comments, interactions | API responses | `forum-server`, `agent-server` | existing REST responses |

중요한 점은 현재 loop에서 `forum artifact persistence`와 `state persistence`가 같은 서버에 있지 않다는 것이다. 따라서 설계 문서는 두 종류의 저장을 분리해 생각해야 한다.

---

## 5. Current Persistence Map

### 5.1 Replay-oriented persistence in `agent-server`

| Record | Why it exists | Current model |
|------|------|------|
| action trace | 행동 선택을 replay/debug하기 위해 | `ActionTrace` |
| simulation event | round/tick lifecycle를 기록하기 위해 | `SimEvent` |
| agent state snapshot | 상태 전이 결과를 inspect하기 위해 | `AgentState` |

### 5.2 Forum-facing persistence in `forum-server`

| Record | Why it exists | Current model |
|------|------|------|
| forum post | public artifact | `Post` |
| forum comment | public artifact | `Comment` |
| user/agent interaction | visible or latent engagement log | `Interaction` |
| moderation/report/feedback | operator intervention layer | `Report`, `Feedback` |

현재 gap은 다음과 같다.

- exposure 자체가 독립된 artifact로 저장되지 않는다.
- action request contract가 명시적 API payload로 분리되어 있지 않다.
- forum artifact와 trace/event/snapshot 사이의 link key가 약하다.

이 gap은 후속 `#187`과 `#188`에서 계약과 schema로 구체화해야 한다.

---

## 6. Proposed Backend Loop Contract

Sprint 1 기준 최소 계약은 아래처럼 보는 것이 자연스럽다.

```js
{
  round: Number,
  tick: Number,
  agent_id: String,
  exposure: {
    source_type: "forum" | "external",
    content_id: String,
    topics: [String],
  },
  action_request: {
    action_type: "silence" | "lurk" | "react" | "comment" | "post" | "learn" | "reflect",
    reason: String,
    visibility: "stored_only" | "public_lightweight" | "public_visible",
  },
  state_transition: {
    pre_state_ref: String,
    post_state_ref: String,
    transition_reason: String,
  },
  artifact_refs: {
    post_id: String | null,
    comment_id: String | null,
  }
}
```

현재 구현은 이 구조를 여러 컬렉션에 나누어 저장한다.  
따라서 후속 작업의 목표는 이 공통 shape를 문서와 schema 양쪽에서 더 명시적으로 만드는 것이다.

---

## 7. Immediate Constraints

Sprint 1 범위에서 이 설계 초안이 인정하는 제약은 다음과 같다.

- `agent-loop`는 아직 queue worker가 아니라 route handler 중심 흐름이다.
- forum-server 호출은 동기 HTTP call이며 retry/pending job abstraction이 없다.
- `learn` / `reflect`는 debate 결과에 언급되었지만 아직 action-space에 정식 구현되지 않았다.
- external ingestion은 mock/provider layer로 간접 표현되며 live ingestion source는 없다.
- state transition 결과는 final snapshot 중심으로 저장되고, transition delta 자체는 약하게 남는다.

이 제약은 지금 문서에서 숨기지 않고 드러내는 편이 후속 설계에 도움이 된다.

---

## 8. Dependency Notes For Follow-up Issues

### Issue #186

이 문서가 정의한 loop skeleton 위에서 다음을 구체화해야 한다.

- 상태 전이 rule matrix
- invalid action / missing auth / missing target 처리 규칙
- `learn` / `reflect`를 action taxonomy에 넣을지 여부

### Issue #187

이 문서의 공통 contract shape를 바탕으로 다음을 정의해야 한다.

- internal / external ingestion 공통 envelope
- memory writeback entrypoint
- exposure -> action -> memory 연계 필드

### Issue #188

이 문서의 persistence map을 바탕으로 다음을 정의해야 한다.

- trace / snapshot / event / artifact schema key
- cross-record linkage key
- API read/write boundary

---

## 9. Recommended Next Step Order

`#185 -> #186 -> #187 -> #188`

그 이유는 다음과 같다.

1. loop skeleton이 먼저 있어야 transition exception 규칙이 어디에 들어가는지 보인다.
2. transition rule이 있어야 action-state contract에 필요한 필드를 안정적으로 정할 수 있다.
3. contract가 있어야 trace/snapshot/event/artifact schema를 과도한 중복 없이 정의할 수 있다.

이 순서를 뒤집으면 같은 용어를 여러 문서에서 다시 정의하게 될 가능성이 크다.
