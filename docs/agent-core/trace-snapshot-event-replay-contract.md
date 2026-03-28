# trace/snapshot/event Replay Contract

> Issue #249 | Builds on #188 Backend Artifact Schema

## 1. Goal

#188에서 정의한 trace/snapshot/event schema를 기반으로, **replay 가능한 저장 계약**을 명시한다.

핵심:
- action → trace → snapshot → event 흐름에서 상태 일관성 유지
- internal/external content consumption이 동일한 state/memory 경로 사용
- 특정 snapshot을 기준으로 이후 trace들을 재생했을 때 최종 상태가 일치하는지 검증

---

## 2. Core Replay Guarantee

### 2.1 State Consistency Chain

```
action_request (trigger)
  ↓
stored_action (action_id 할당)
  ↓
trace (state_before, state_after 기록)
  ↓
snapshot (state_after 저장, source_action_id 참조)
  ↓
event (metadata 기록)
```

**Rule**: trace의 `state_before[tick]` == snapshot의 `raw_snapshot[tick-1]`

이를 통해 replay 가능성을 보장한다.

### 2.2 State Transition Validation

trace가 저장될 때:

```json
{
  "action_id": "act_abc123",
  "tick": 5,
  "state_before": {
    "characteristic": "...",
    "belief": "...",
    "memory": "...",
    "mutable_axes": "...",
    "relationship_state": {...}
  },
  "state_after": {
    "characteristic": "...",
    "belief": "...",
    "memory": "...",
    "mutable_axes": "...",
    "relationship_state": {...}
  },
  "state_delta": {
    "fields_changed": ["characteristic", "belief"],
    "field_history": {...}
  }
}
```

검증 규칙:
- `state_before`는 이전 snapshot의 state와 정확히 일치해야 함
- `state_after`는 action 실행 후의 상태
- `state_delta`는 어떤 필드가 바뀌었는지 명확히

---

## 3. Snapshot Versioning & References

### 3.1 Snapshot ID 규칙

```
snapshot_id = "{agent_id}#{round}#{tick}#{state_hash}"
```

- `{state_hash}`: raw_snapshot의 SHA256 prefix (8 chars)
- 동일 tick의 동일 agent가 재실행되면 같은 snapshot_id 생성

### 3.2 Snapshot Reference Chain

```
trace.source_action_id → trace.created_after_snapshot_id
snapshot.snapshot_id ← trace.created_after_snapshot_id (backref)
event.snapshot_id ← trace의 결과 snapshot (optional)
```

**Rule**: 각 trace는 **정확히 하나의 source snapshot**을 참조해야 함.

---

## 4. Internal/External Content Consumption Merge

### 4.1 Content Consumption Event

```json
{
  "event_id": "evt_xyz789",
  "event_type": "content_consumed",
  "consumption_source": "internal_forum" | "external_web",
  "agent_id": "agent_001",
  "round": 1,
  "tick": 3,
  "action_id": "act_lurk_123",  // lurk 또는 learn action

  // 소비한 콘텐츠 메타
  "content_ref": {
    "source_type": "post" | "comment" | "web_article",
    "source_id": "post_abc" | "external_url",
    "author": "user_xyz" | "anonymous",
    "topic_tags": ["sustainable-fashion", "eco-friendly"]
  },

  // 상태 변화 영향
  "expected_state_delta": {
    "characteristic": {"delta": "increased_eco_interest"},
    "belief": {"delta": "sustainability_important"},
    "memory": {"added_topics": ["eco-friendly"]}
  },

  "created_at": "2026-03-28T09:15:00Z"
}
```

### 4.2 Memory Writeback Path (통합)

```
internal forum content
  ↓ (consume)
  ↓ (generate ingestion_id)
  ↓
content_consumed event
  ↓
trace (state change recorded)
  ↓
snapshot + memory update
                    ← (동일 경로)
external web content
  ↓ (consume)
  ↓ (generate ingestion_id)
  ↓
content_consumed event
  ↓
trace (state change recorded)
  ↓
snapshot + memory update
```

**Rule**: internal vs external 구분은 `consumption_source` 필드로만, state update 경로는 동일.

---

## 5. Minimum Validation Test Cases

### 5.1 Linear Replay Test

**목표**: snapshot[0] → action[0] → trace[0] → snapshot[1] 체인이 일관성 있게 연결되는가?

**단계**:
1. snapshot[0] 로드 (agent_001, round=1, tick=0)
2. action[0] 실행 (post action, tick=1)
3. trace[0] 생성 (state_before = snapshot[0].raw_snapshot, state_after = new state)
4. snapshot[1] 생성 (source_action_id = action[0].id)
5. 검증: snapshot[1].raw_snapshot == trace[0].state_after

### 5.2 Content Consumption Merge Test

**목표**: internal + external consumption이 same state model에 누적되는가?

**단계**:
1. snapshot[0] (characteristic: "trendy", belief: "fashion_is_important")
2. action[internal_lurk] (observe forum post on sustainability)
   - trace: state_after.characteristic += "eco_conscious"
3. action[external_learn] (read web article on sustainable fashion)
   - trace: state_after.belief += "sustainability_critical"
4. snapshot[2] 검증
   - raw_snapshot.characteristic = "trendy + eco_conscious"
   - raw_snapshot.belief = "fashion_is_important + sustainability_critical"

### 5.3 State Consistency Chain Test (3+ ticks)

**목표**: 연속된 여러 trace들이 state_before/state_after를 올바르게 이어나가는가?

**단계**:
1. snapshot[0] (baseline)
2. trace[0] → snapshot[1]
3. trace[1] (state_before must == snapshot[1].raw_snapshot) → snapshot[2]
4. trace[2] (state_before must == snapshot[2].raw_snapshot) → snapshot[3]
5. 모든 trace의 state_before가 이전 snapshot의 state_after와 일치하는지 검증

---

## 6. Schema Additions (to #188)

### 6.1 Extend trace schema

추가 필드:
```json
{
  "action_id": "string (required)",
  "state_delta": {
    "fields_changed": ["array of field names"],
    "field_history": "object with detailed delta"
  },
  "created_after_snapshot_id": "string (required, refs snapshot.snapshot_id)"
}
```

### 6.2 Extend snapshot schema

추가 필드:
```json
{
  "snapshot_id": "string (required, format: agent_id#round#tick#state_hash)",
  "raw_snapshot": {
    "characteristic": "object",
    "belief": "object",
    "memory": "object",
    "mutable_axes": "object",
    "relationship_state": "object"
  }
}
```

### 6.3 Extend event schema for content consumption

```json
{
  "event_type": "content_consumed",
  "consumption_source": "internal_forum | external_web",
  "content_ref": "object",
  "expected_state_delta": "object",
  "snapshot_id": "string (optional backref to resulting snapshot)"
}
```

---

## 7. Replay Implementation Notes

### 7.1 Replay Query

```sql
-- 주어진 snapshot을 기준으로 이후의 모든 trace 재생
SELECT trace.*
FROM traces
WHERE agent_id = ?
  AND round = ?
  AND tick >= ?
ORDER BY tick ASC;

-- 각 trace마다:
-- 1. verify(trace.state_before == prev_snapshot.raw_snapshot)
-- 2. verify(trace.state_after과 action result 일치)
-- 3. create_snapshot(trace.state_after)
```

### 7.2 Consistency Check

```python
def validate_replay_chain(snapshots, traces):
    for i, trace in enumerate(traces):
        # Rule 1: state_before matches previous snapshot
        assert trace['state_before'] == snapshots[i]['raw_snapshot']

        # Rule 2: state_after becomes next snapshot
        assert trace['state_after'] == snapshots[i+1]['raw_snapshot']

        # Rule 3: snapshot references are correct
        assert traces[i]['created_after_snapshot_id'] == snapshots[i]['snapshot_id']

    return True
```

---

## 8. Acceptance Criteria Checklist

- [ ] action_request → stored_action → trace → snapshot → event 관계가 #188 확장으로 명확해짐
- [ ] snapshot version/timestamp/reference rules가 정의됨 (#6)
- [ ] trace와 event가 snapshot을 어떻게 참조하는지 정의됨 (#3, #6)
- [ ] internal/external content consumption을 replay 가능하게 남기는 규칙 정의됨 (#4)
- [ ] 최소 3개의 검증 테스트 케이스가 정의됨 (#5)
- [ ] 구현 시 검증할 수 있는 체크포인트 제시됨 (#7)

---

## 9. Next Steps

1. AI-Fashion-Forum backend에서 #188 schema를 #249의 추가 필드로 확장 구현
2. content consumption event 생성 로직 추가
3. replay validation test suite 구현
4. moderation / analytics layer가 이 계약을 재사용 가능하도록 API 정의

---

**Created**: 2026-03-28
**Status**: Ready for Core Workforce Implementation
