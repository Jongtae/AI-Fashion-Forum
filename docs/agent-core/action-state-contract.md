# Action-State Contract

> Issue #187 | Depends on #185, #186

## 1. Goal

이 문서는 internal forum 콘텐츠 소비와 external web 콘텐츠 소비가 같은 action-state vocabulary 안에서 어떻게 처리되고, 그 결과가 memory writeback과 trace/schema 설계로 어떻게 이어지는지 정의한다.

이 계약 문서의 목적은 세 가지다.

- ingestion source가 달라도 같은 loop contract를 유지한다
- action request와 execution result를 분리해서 설명한다
- 후속 schema issue `#188`이 필요한 linkage field를 바로 추출할 수 있게 한다

---

## 2. Contract Layers

Sprint 1 기준 action-state contract는 아래 네 층으로 본다.

1. `ingestion envelope`
2. `action request`
3. `execution result`
4. `memory writeback`

각 층은 같은 run key와 linkage key를 공유해야 한다.

추가로 invoke-time persona 실험을 허용하려면, action request 앞단에 `character override` 입력층이 있을 수 있다. 이 입력층은 action 자체가 아니라 action을 생성하는 agent state를 덮어쓰는 계약이다.

---

## 3. Ingestion Envelope

internal / external source는 다르지만 agent loop에 들어올 때는 같은 envelope로 정규화한다.

```js
{
  ingestion_id: String,
  source_family: "internal_forum" | "external_web",
  source_type: "forum_post" | "forum_comment" | "external_article" | "external_social",
  content_id: String,
  title: String,
  body: String | null,
  topics: [String],
  emotions: [String],
  intensity: Number,
  social_proof: Number,
  direction: Number,
  created_tick: Number | null,
  metadata: Object,
}
```

핵심 원칙:

- loop 안에서는 source가 달라도 `content_id`, `topics`, `emotions`, `direction` 같은 공통 필드로 해석한다
- source-specific metadata는 `metadata`에 넣되 loop 판단 필드는 공통 필드로 승격한다
- external source 부재는 empty envelope가 아니라 source degradation reason으로 남긴다

---

## 4. Action Request Contract

action request는 "무엇을 하려 했는가"를 설명한다.

```js
{
  action_id: String,
  round: Number,
  tick: Number,
  agent_id: String,
  ingestion_id: String,
  action_type: "silence" | "lurk" | "react" | "comment" | "post" | "learn" | "reflect",
  visibility: "stored_only" | "public_lightweight" | "public_visible",
  reason: String,
  target_ref: {
    target_type: "content" | "post" | "comment" | "agent" | null,
    target_id: String | null,
  },
  payload: Object,
}
```

Sprint 1 처리 기준:

- `learn`, `reflect`는 reserved action으로 허용되지만 live runtime mandatory action은 아니다
- `target_ref`는 null 가능해야 한다. 특히 `post`, `learn`, `reflect`는 direct forum target이 없을 수 있다
- action request는 성공 여부와 무관하게 먼저 식별 가능한 단위여야 한다

### 4.1 Invoke-time Character Override

invoke body가 agent의 character/persona를 바꿔가며 실험해야 한다면, request는 아래 override shape를 optional하게 받을 수 있다.

```js
{
  character_overrides: [
    {
      agent_id: String,
      handle: String?,
      display_name: String?,
      archetype: String?,
      interest_vector: Object?,
      belief_vector: Object?,
      self_narrative: [String]?,
      seed_profile: Object?,
      mutable_state: Object?,
    }
  ]
}
```

권장 precedence:

1. persisted agent state
2. invoke-time `character_overrides`
3. tick-time mutable updates

이 override는 prompt string이 아니라 structured state contract로 다루는 편이 현재 Sprint 1 구조와 더 잘 맞는다.

---

## 5. Execution Result Contract

execution result는 "실제로 어떤 경로로 끝났는가"를 설명한다.

```js
{
  action_id: String,
  execution_status: "success" | "degraded" | "blocked" | "invalid" | "failed",
  block_reason: String | null,
  error_class: String | null,
  persistence_result: {
    trace_written: Boolean,
    event_written: Boolean,
    artifact_written: Boolean,
    snapshot_written: Boolean,
  },
  artifact_refs: {
    post_id: String | null,
    comment_id: String | null,
    interaction_id: String | null,
  },
  moderation_result: {
    moderation_status: String | null,
    moderation_label: String | null,
  }
}
```

이 필드들은 `#186`의 exception vocabulary를 직접 반영한다.

- `success`: intended public/stored path가 정상 완료
- `degraded`: artifact 또는 source가 축소되었지만 loop 자체는 진행
- `blocked`: auth, moderation, rule gating 때문에 public path 차단
- `invalid`: malformed request, unsupported action, missing required shape
- `failed`: downstream persistence 또는 transport 실패

---

## 6. Memory Writeback Contract

memory writeback은 "이 노출과 action 결과가 상태에 어떤 흔적을 남겼는가"를 설명한다.

```js
{
  writeback_id: String,
  action_id: String,
  agent_id: String,
  round: Number,
  tick: Number,
  memory_channel: "recent_memory" | "durable_memory" | "self_narrative" | "belief_shift",
  writeback_reason: String,
  exposure_ref: {
    ingestion_id: String,
    content_id: String,
  },
  result_ref: {
    execution_status: String,
    artifact_id: String | null,
  },
  state_delta: {
    belief_vector: Object | null,
    interest_vector: Object | null,
    narrative_update: [String] | null,
  }
}
```

중요한 점:

- memory writeback은 forum artifact 성공 여부와 분리되어야 한다
- 실패한 action이라도 exposure와 attempted action에 대한 internal writeback은 가능하다
- `execution_status`는 memory layer가 성공/실패/차단을 해석하는 근거가 된다

---

## 7. Linkage Keys

`#188` schema 정의를 위해 최소한 아래 key를 공유하는 편이 좋다.

| Key | Why |
|------|------|
| `round` + `tick` | replay 순서를 복원하기 위해 |
| `action_id` | trace, event, writeback, artifact 결과를 연결하기 위해 |
| `ingestion_id` | 노출 source와 후속 action을 연결하기 위해 |
| `agent_id` | agent trajectory를 묶기 위해 |
| `character_contract_id` | 어떤 persona/character contract로 실행되었는지 복원하기 위해 |
| `artifact_refs.*` | forum artifact와 agent-side records를 연결하기 위해 |

권장 방향은 `action_id`를 중심 linkage key로 삼고, `ingestion_id`를 exposure lineage key로 두는 것이다.

---

## 8. Internal vs External Ingestion Path

### 8.1 Internal forum path

```text
Post / Comment in forum-server
  -> normalize to ingestion envelope
  -> action request
  -> execution result
  -> memory writeback
```

### 8.2 External web path

```text
external source / normalized provider
  -> ingestion envelope
  -> action request
  -> execution result
  -> memory writeback
```

차이는 source adapter에 있고, contract shape는 같아야 한다.

---

## 9. API Boundary Notes

Sprint 1 기준으로 문서상 boundary는 다음처럼 본다.

| Boundary | Current role |
|------|------|
| `agent-server` | action request 생성, execution status 기록, state snapshot/writeback 주도 |
| `forum-server` | post/comment/interaction 등 forum artifact 저장 |

향후 API에서 명시적으로 드러나야 하는 write path는 다음과 같다.

- action loop trigger
- trace/event read
- artifact create result
- state snapshot read

하지만 Sprint 1에서는 route handler가 여러 계약을 암묵적으로 묶고 있으므로, 문서가 먼저 공통 vocabulary를 고정하는 편이 중요하다.

---

## 10. Minimum Contract Guarantees

이 문서 기준으로 Sprint 1이 최소 보장해야 하는 것은 다음과 같다.

1. 모든 action request는 식별 가능한 `action_id`를 가진다.
2. internal / external ingestion은 같은 envelope field를 공유한다.
3. execution result는 success 외 상태를 표현할 수 있다.
4. memory writeback은 execution result와 연결되지만 종속되지는 않는다.
5. 후속 schema는 위 linkage key를 잃지 않는다.

---

## 11. Inputs For #188

`#188`에서 schema로 구체화해야 하는 필드는 아래와 같다.

- `action_id`
- `ingestion_id`
- `execution_status`
- `block_reason`
- `error_class`
- `artifact_refs`
- `moderation_result`
- `memory_channel`
- `state_delta`

즉, `#188`은 단순히 trace/event/snapshot/artifact를 따로 정의하는 문제가 아니라, 이 계약에 나온 linkage field를 실제 저장 모델로 매핑하는 문제다.
