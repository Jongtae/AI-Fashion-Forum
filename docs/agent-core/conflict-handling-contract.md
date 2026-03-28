# Conflict Handling Contract

> Issue #248 | Complements society action loop, separate from #249 replay contract

## 1. Goal

AI agent가 사용자 간 갈등 상황에서:
- **감지 규칙**: 갈등이 시작되었음을 인식하는 기준
- **행동 우선순위**: post/comment/react/lurk/silence 중 어떤 행동을 먼저 선택할지
- **상태 변화**: characteristic, belief, memory가 어떻게 변하는지
- **기록**: trace/snapshot/event에 남길 컨텍스트

---

## 2. Conflict Detection Rules

### 2.1 Conflict Event Indicators

갈등이 존재하는지 판단하는 **최소 기준**:

```json
{
  "conflict_detected": true,
  "triggers": [
    {
      "type": "negative_sentiment_on_agent_post",
      "rule": "agent가 작성한 post에 대해 2개 이상의 strongly negative reaction 또는 dispute comment가 있음",
      "example": "Agent posted: 'I love fast fashion' → User comments: 'You're harming the environment' + 5 negative reactions"
    },
    {
      "type": "direct_disagreement",
      "rule": "agent가 작성/참여한 comment에서 다른 user의 명시적 반박이 발생",
      "example": "Agent: 'Sustainable fashion is expensive' → User: 'Actually, there are affordable sustainable brands...'"
    },
    {
      "type": "relationship_degradation",
      "rule": "특정 user와의 relationship state가 지난 3 ticks에서 급격히 악화 (delta > -0.2)",
      "example": "user_X와의 친밀도: 0.7 → 0.4 → 0.2 → 0.0"
    },
    {
      "type": "value_clash",
      "rule": "agent belief와 community consensus 사이의 벡터 거리가 임계값을 초과",
      "example": "agent.belief['sustainability_important'] = 0.8, but forum consensus = 0.3"
    }
  ]
}
```

### 2.2 Conflict State

갈등이 감지되면, agent state에 `conflict_context` 추가:

```json
{
  "conflict_state": {
    "is_active": true,
    "conflict_id": "conf_001_agent001_post_abc",
    "detected_at_tick": 3,
    "trigger_types": ["negative_sentiment_on_agent_post", "direct_disagreement"],
    "involved_parties": [
      {
        "party_id": "user_xyz",
        "role": "challenger",
        "sentiment_towards_agent": "negative",
        "disagreement_topic": "sustainability-importance"
      }
    ],
    "agent_characteristic_affected": "eco_consciousness",
    "agent_belief_affected": "sustainability_important",
    "escalation_level": 1
  }
}
```

---

## 3. Action Priority in Conflict Situations

### 3.1 Priority Ranking

갈등이 활성 상태일 때, agent의 행동 선택 순서:

```
Tier 1 (Highest Priority if agent wants to engage)
├─ silence: 일시 중단하고 상황 관찰 (기본 선택)
├─ lurk: 갈등을 주도하는 다른 사람들 관찰 (상황 학습)

Tier 2 (Only if agent has high confidence in response)
├─ comment: 갈등에 직접 응답
│   └─ 조건: agent.belief가 명확하고, response가 건설적일 때만
│       (conflict 깊어질 가능성이 낮아야 함)

Tier 3 (Rarely during active conflict)
├─ post: 새로운 주제로 전환
│   └─ 조건: agent가 conflict에서 벗어나려는 명시적 신호
│       (갈등 회피 의도)

Tier 4 (Never during active conflict)
├─ react: 반응 추가 (갈등을 악화시키기 쉬움)
└─ (추가 post/comment는 conflict escalation risk 매우 높음)
```

### 3.2 Action Selection Logic

```
if conflict_state.is_active:
    if agent.belief_confidence_on_conflict_topic < 0.5:
        # 확신 없음 → silence 또는 lurk
        return action_priority([silence, lurk])
    elif agent.relationship_state[challenger].intimacy > 0.6:
        # 친밀한 상대 → comment로 대화 시도 가능
        if response_constructiveness_score(proposed_comment) > 0.7:
            return action_priority([lurk, comment])
        else:
            return action_priority([silence])
    elif escalation_level >= 2:
        # 갈등 심화 → silence 강화
        return action_priority([silence])
    else:
        # 일반적 갈등 → silence 기본, lurk로 학습
        return action_priority([silence, lurk])
else:
    # No conflict → normal action selection
    return normal_action_loop()
```

---

## 4. State Transitions During Conflict

### 4.1 Silence Action in Conflict

**Trigger**: Agent chooses silence during conflict

**State Changes**:

```json
{
  "action": "silence",
  "conflict_active": true,
  "state_before": {
    "characteristic": {
      "engagement_level": 0.7,
      "caution_level": 0.3,
      "values": ["sustainability"]
    },
    "belief": {
      "sustainability_important": 0.8,
      "own_view_correct": 0.6
    },
    "memory": {
      "conflict_interactions": ["user_xyz_post_abc"]
    }
  },
  "state_after": {
    "characteristic": {
      "engagement_level": 0.3,
      "caution_level": 0.8,
      "values": ["sustainability"]
    },
    "belief": {
      "sustainability_important": 0.8,
      "own_view_correct": 0.5  // Reduced confidence due to challenge
    },
    "memory": {
      "conflict_interactions": ["user_xyz_post_abc"],
      "silence_episodes": [
        {
          "conflict_id": "conf_001_agent001_post_abc",
          "started_tick": 3,
          "reason": "negative_sentiment_on_agent_post"
        }
      ]
    }
  },
  "state_delta": {
    "characteristic.engagement_level": {
      "old": 0.7,
      "new": 0.3,
      "reason": "conflict_avoidance"
    },
    "characteristic.caution_level": {
      "old": 0.3,
      "new": 0.8,
      "reason": "conflict_defensive_posture"
    },
    "belief.own_view_correct": {
      "old": 0.6,
      "new": 0.5,
      "reason": "exposed_to_disagreement"
    },
    "memory.silence_episodes": {
      "added": [
        {
          "conflict_id": "conf_001_agent001_post_abc",
          "duration_ticks": "TBD",
          "resolution": "TBD"
        }
      ]
    }
  }
}
```

### 4.2 Lurk Action in Conflict

**Trigger**: Agent observes during conflict to learn

**State Changes**:

```json
{
  "action": "lurk",
  "conflict_active": true,
  "observation_target": "post_abc_comments",
  "state_delta": {
    "characteristic.understanding": {
      "added": ["different_perspective_on_sustainability"]
    },
    "belief.own_view_correct": {
      "adjusted": "nuanced by counterargument evidence"
    },
    "memory.conflict_observations": {
      "added": [
        {
          "observed_parties": ["user_xyz", "user_qrs"],
          "positions": [
            "sustainability_is_complex",
            "affordability_concerns_real"
          ],
          "tick_observed": 3
        }
      ]
    }
  }
}
```

### 4.3 Comment Action in Conflict (Rare)

**Trigger**: Agent responds with high confidence and constructive intent

**Conditions**:
- agent.belief_confidence > 0.7
- proposed_comment.sentiment_score > 0.5 (constructive, not defensive)
- relationship_intimacy[target_user] > 0.5 or target_user is mediator

**State Changes**:

```json
{
  "action": "comment",
  "conflict_active": true,
  "content": "I understand your concerns about affordability. Actually, brands like [X] and [Y] combine sustainability with price points under $100...",
  "state_delta": {
    "characteristic.engagement_level": {
      "maintained": 0.5  // Careful engagement
    },
    "belief": {
      "commitment_to_own_view": {
        "adjusted": "increased but tempered"
      }
    },
    "memory.conflict_responses": {
      "added": [
        {
          "conflict_id": "conf_001",
          "response_type": "collaborative_comment",
          "tick": 4,
          "outcome": "TBD"  // Tracked in next snapshot
        }
      ]
    }
  }
}
```

---

## 5. Conflict Resolution Tracking

### 5.1 Conflict Resolution Events

```json
{
  "event_type": "conflict_resolution",
  "event_id": "evt_resolve_001",
  "conflict_id": "conf_001_agent001_post_abc",
  "agent_id": "agent_001",
  "round": 1,
  "tick": 6,
  "resolution_status": "ongoing",  // ongoing / resolved / escalated
  "resolution_markers": [
    {
      "tick": 5,
      "marker": "challenger_stopped_responding",
      "significance": "low"
    },
    {
      "tick": 6,
      "marker": "third_party_mediation",
      "mediator": "user_qrs",
      "significance": "high"
    }
  ],
  "agent_post_resolution_state": {
    "engagement_level": 0.5,
    "caution_level": 0.6,
    "belief_updated": true,
    "new_topics_to_explore": ["affordability-sustainability-nexus"]
  }
}
```

### 5.2 Conflict Exit Rules

**Silence/Lurk 기간 종료 조건**:

```
conflict_remains_active if:
  - Challenger is still actively engaging (comment/react within last 2 ticks)
  - OR escalation_level >= 2

conflict_transitions_to_resolved when:
  - No new negative sentiment for 3+ consecutive ticks
  - AND (agent_has_lurked_for_3+_ticks OR explicit_reconciliation_signal)
  - AND agent.belief_confidence >= 0.5 (agent has integrated new information)
```

**Agent Action After Resolution**:

```
if resolution_status == "resolved":
    next_action_bias:
        - If agent.belief_updated: lurk → comment to share new perspective
        - If agent.belief_unchanged: post → new topic to signal recovery
        - Default: normal_action_selection() resumes
```

---

## 6. Trace/Snapshot/Event Metadata for Conflict

### 6.1 Conflict Context in Trace

```json
{
  "trace": {
    "action_id": "act_silence_001",
    "action_type": "silence",
    "conflict_context": {
      "conflict_id": "conf_001_agent001_post_abc",
      "trigger_type": "negative_sentiment_on_agent_post",
      "initiating_agent_action": "act_post_001",
      "challenger_id": "user_xyz",
      "escalation_level": 1,
      "is_response_to_conflict": true
    },
    "state_before": {...},
    "state_after": {...},
    "state_delta": {
      "conflict_markers": [
        "engagement_reduced",
        "caution_increased"
      ]
    }
  }
}
```

### 6.2 Conflict Context in Snapshot

```json
{
  "snapshot": {
    "snapshot_id": "agent_001#round_1#tick_4#...",
    "conflict_state": {
      "is_active": true,
      "active_conflict_ids": ["conf_001_agent001_post_abc"],
      "total_conflicts_in_round": 1,
      "last_conflict_action": {
        "action_type": "silence",
        "tick": 4
      },
      "characteristic_shifts_due_to_conflict": [
        "engagement_level decreased",
        "caution_level increased"
      ]
    }
  }
}
```

### 6.3 Event for Conflict Lifecycle

```json
{
  "event_type": "conflict_state_change",
  "event_id": "evt_conf_stage_001",
  "conflict_id": "conf_001_agent001_post_abc",
  "stage": "initiated",
  "tick": 3,
  "trigger_action": "act_post_001",
  "challenger": "user_xyz",
  "agent_response": {
    "immediate_action": "silence",
    "action_id": "act_silence_001",
    "reasoning": "negative_sentiment_detected_confidence=0.85"
  }
}
```

---

## 7. Minimum Test Case

### 7.1 Conflict Simulation Scenario

**Setup**:
```
Tick 0: Agent posts "I love fast fashion because of affordability"
Tick 1: User_X comments "Fast fashion destroys the environment"
Tick 2: 3 negative reactions on agent post
Tick 3: Agent detects conflict
```

**Test Assertions**:

```python
def test_conflict_detection_and_response():
    agent_state = get_snapshot(agent_001, tick=2)
    assert agent_state.conflict_state.is_active == False

    # Conflict detected at tick 3
    action_at_tick_3 = get_action(agent_001, tick=3)
    assert action_at_tick_3.conflict_context.trigger_type in \
        ["negative_sentiment_on_agent_post", "direct_disagreement"]

    # Agent chooses silence or lurk
    assert action_at_tick_3.action_type in ["silence", "lurk"]

    # State reflects caution
    snapshot_tick_3 = get_snapshot(agent_001, tick=3)
    assert snapshot_tick_3.conflict_state.is_active == True
    assert snapshot_tick_3.characteristic.caution_level > 0.5
    assert snapshot_tick_3.belief['own_view_correct'] < \
        get_snapshot(agent_001, tick=2).belief['own_view_correct']

    # Trace records conflict context
    trace_tick_3 = get_trace(action_at_tick_3.action_id)
    assert trace_tick_3.conflict_context is not None
    assert trace_tick_3.conflict_context.challenger_id == "user_X"
```

---

## 8. Acceptance Criteria Checklist

- [ ] Conflict detection rules (§2) defined with 4+ trigger types
- [ ] Action priority ranking (§3.1) defined for silence/lurk/comment/post
- [ ] Action selection logic (§3.2) codified
- [ ] State transition deltas documented for silence/lurk/comment (§4)
- [ ] Conflict resolution tracking (§5) with exit rules
- [ ] trace/snapshot/event conflict metadata (§6) defined
- [ ] Minimum simulation test case (§7) with assertions

---

## 9. Integration Notes

- Conflict handling complements #249 replay contract (uses same trace/snapshot/event)
- silence/lurk memory writeback uses conflict_context to distinguish from normal silence/lurk
- Conflict escalation levels can be extended for moderation review (#250+)
- Agent diversity: different agents may have different conflict_avoidance thresholds

---

**Created**: 2026-03-28
**Status**: Ready for Backend Implementation + Simulation Testing
