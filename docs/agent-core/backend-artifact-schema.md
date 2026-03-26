# Backend Artifact Schema

> Issue #188 | Depends on #185, #186, #187

## 1. Goal

이 문서는 Sprint 1에서 agent loop와 forum persistence가 남겨야 하는 핵심 저장 레코드를 schema 관점에서 정의한다.

대상은 네 가지다.

- trace
- snapshot
- event
- forum artifact

이 문서의 목표는 구현체를 강제하는 것이 아니라, 저장 레이어 간 linkage key와 write boundary를 명확히 하는 것이다.

---

## 2. Shared Linkage Keys

아래 키는 가능한 한 여러 레코드에 공통으로 들어가야 한다.

| Key | Why |
|------|------|
| `action_id` | action request, execution result, artifact 결과를 연결 |
| `ingestion_id` | exposure lineage를 복원 |
| `agent_id` | agent trajectory를 묶음 |
| `character_contract_id` | invoke-time persona/character contract를 복원 |
| `round` | run/replay group 구분 |
| `tick` | 순서 복원 |
| `artifact_id` | forum artifact 참조 |

Sprint 1 권장 원칙:

- `action_id`는 write-side primary linkage key
- `ingestion_id`는 exposure lineage key
- `artifact_id`는 forum-facing read key

---

## 3. Trace Schema

trace는 "무슨 action이 선택되었는가"와 "무슨 결과로 끝났는가"를 가장 자세히 보관한다.

| Field | Type | Required | Notes |
|------|------|------|------|
| `action_id` | string | yes | trace primary key |
| `agent_id` | string | yes | actor |
| `round` | number | yes | replay grouping |
| `tick` | number | yes | ordering |
| `ingestion_id` | string | yes | exposure lineage |
| `action_type` | enum | yes | silence/lurk/react/comment/post/learn/reflect |
| `visibility` | enum | yes | stored_only/public_lightweight/public_visible |
| `execution_status` | enum | yes | success/degraded/blocked/invalid/failed |
| `character_contract_id` | string/null | no | 어떤 character override 또는 seed contract가 적용되었는지 |
| `block_reason` | string/null | no | auth/moderation/missing_target 등 |
| `error_class` | string/null | no | persistence/network/validation 등 |
| `payload` | object | yes | original action request + execution context |
| `artifact_refs` | object | no | post/comment/interaction ref |
| `created_at` | datetime | yes | write timestamp |

권장 저장 위치:

- `agent-server`

현재 구현 대응:

- `ActionTrace`가 가장 가까운 저장소지만, `execution_status`, `ingestion_id`, `artifact_refs`는 더 명시적으로 강화될 여지가 있다.

---

## 4. Snapshot Schema

snapshot은 "tick/round 이후 상태가 어떻게 보였는가"를 저장한다.

| Field | Type | Required | Notes |
|------|------|------|------|
| `snapshot_id` | string | yes | snapshot primary key |
| `agent_id` | string | yes | per-agent snapshot이면 필수 |
| `round` | number | yes | replay grouping |
| `tick` | number | yes | ordering |
| `source_action_id` | string/null | no | 어떤 action 이후 snapshot인지 |
| `character_contract_id` | string/null | no | snapshot 생성 시 적용된 character contract |
| `seed_axes` | object | yes | durable baseline |
| `mutable_axes` | object | yes | runtime-shiftable axes |
| `belief_vector` | object/null | no | inspectable state delta source |
| `interest_vector` | object/null | no | inspectable preference state |
| `self_narratives` | array | no | narrative layer |
| `raw_snapshot` | object | yes | replay/debug fidelity용 |
| `created_at` | datetime | yes | write timestamp |

권장 저장 위치:

- `agent-server`

현재 구현 대응:

- `AgentState`가 현재 snapshot 역할을 수행한다.

---

## 5. Event Schema

event는 lifecycle 또는 side effect를 짧고 빠르게 기록한다.

| Field | Type | Required | Notes |
|------|------|------|------|
| `event_id` | string | yes | event primary key |
| `event_type` | string | yes | agent_tick_start, action_post 등 |
| `agent_id` | string/null | no | actor가 있으면 포함 |
| `round` | number | yes | replay grouping |
| `tick` | number | yes | ordering |
| `action_id` | string/null | no | 특정 action에 속하면 포함 |
| `ingestion_id` | string/null | no | source lineage |
| `severity` | enum | no | info/warn/error |
| `payload` | object | yes | compact event context |
| `created_at` | datetime | yes | write timestamp |

권장 저장 위치:

- `agent-server`

현재 구현 대응:

- `SimEvent`

trace와의 차이:

- trace는 action-centric
- event는 lifecycle / operational breadcrumb-centric

---

## 6. Forum Artifact Schema

forum artifact는 사용자에게 보이거나 포럼 모델이 참조하는 public/unit-level 저장소다.

### 6.1 Post

| Field | Type | Required | Notes |
|------|------|------|------|
| `post_id` | string | yes | forum artifact key |
| `author_id` | string | yes | user or agent |
| `author_type` | enum | yes | user/agent |
| `action_id` | string/null | no | agent-generated면 linkage 가능해야 함 |
| `round` | number/null | no | agent run linkage |
| `tick` | number/null | no | agent run linkage |
| `content` | string | yes | body |
| `tags` | array | no | topics |
| `moderation_status` | enum | yes | approved/flagged/removed |
| `created_at` | datetime | yes | persistence time |

### 6.2 Comment

| Field | Type | Required | Notes |
|------|------|------|------|
| `comment_id` | string | yes | forum artifact key |
| `post_id` | string | yes | parent artifact |
| `author_id` | string | yes | user or agent |
| `author_type` | enum | yes | user/agent |
| `action_id` | string/null | no | agent-generated linkage |
| `round` | number/null | no | replay linkage |
| `tick` | number/null | no | replay linkage |
| `content` | string | yes | body |
| `created_at` | datetime | yes | persistence time |

### 6.3 Interaction / lightweight artifact result

| Field | Type | Required | Notes |
|------|------|------|------|
| `interaction_id` | string | yes | row key |
| `action_id` | string/null | no | agent-side linkage |
| `actor_id` | string | yes | user or agent |
| `target_id` | string | yes | post/comment/feed slot |
| `event_type` | enum | yes | view/like/comment/report 등 |
| `metadata` | object | no | position, duration, moderation reason 등 |
| `created_at` | datetime | yes | persistence time |

권장 저장 위치:

- `forum-server`

---

## 7. Write Boundary

| Record type | Primary writer | Why |
|------|------|------|
| trace | `agent-server` | action decision과 execution lineage는 loop owner가 가장 잘 앎 |
| snapshot | `agent-server` | state transition owner |
| event | `agent-server` | lifecycle breadcrumb owner |
| post/comment | `forum-server` | forum public artifact owner |
| interaction/report/feedback | `forum-server` | forum engagement/moderation owner |

경계 원칙:

- agent-server는 decision lineage를 쓴다
- forum-server는 public artifact lineage를 쓴다
- 두 서버는 `action_id`와 `artifact_refs`로 연결된다

---

## 8. Minimum API Read/Write Surface

문서 기준으로 필요한 최소 surface는 다음과 같다.

| API family | Purpose |
|------|------|
| action loop trigger | run 요청 시작 |
| traces read | action lineage inspect |
| events read | lifecycle breadcrumb inspect |
| state snapshot read | post-transition state inspect |
| forum artifact read/write | public artifact persistence |

Sprint 1에서는 route handler들이 이 역할을 암묵적으로 나누고 있다.  
후속 구현에서 중요한 것은 API 개수보다 linkage key 보존이다.

---

## 9. Data Engineering Review Notes

이 이슈는 schema를 다루므로 Data Engineering review 대상이다.

리뷰 포인트:

- `action_id`와 `artifact_id`를 어디서 생성할지
- `ingestion_id`를 internal/external source 모두에서 안정적으로 만들 수 있는지
- snapshot/raw payload를 얼마나 그대로 저장할지
- trace/event/artifact 간 중복 필드를 어디까지 허용할지

---

## 10. Recommended Next Use

이 문서는 다음 용도로 쓰인다.

1. agent-server 모델 강화 설계
2. forum-server artifact linkage 설계
3. replay/debug query 설계
4. Data Engineering review 기준 문서
