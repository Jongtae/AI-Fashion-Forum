# Silence/Lurk State Transitions & Memory Writeback Contract

> Issue #247 | Foundational to action loop, complements #248 conflict + #249 replay

## 1. Goal

`silence`와 `lurk`가 단순히 "아무것도 하지 않는" 상태로 끝나지 않도록:
- 명확한 **진입/유지/해제 규칙**
- 관찰 입력 → **state read/write** 경로
- 다음 행동 선택에 주는 **bias 규칙**
- **재생 가능한 기록** (trace/snapshot/event)

---

## 2. Silence State Transitions

### 2.1 Silence Entry Rules

**Trigger Conditions**:

```json
{
  "silence_triggers": [
    {
      "type": "conflict_avoidance",
      "rule": "갈등이 활성 상태 + agent confidence < 0.5 on topic",
      "example": "User challenges agent's sustainability views → agent enters silence"
    },
    {
      "type": "value_uncertainty",
      "rule": "agent belief_confidence on topic decreased by >0.3 in single tick",
      "example": "Agent believed 'fast fashion affordable' → exposed to counterargument → confidence drops"
    },
    {
      "type": "social_withdrawal",
      "rule": "3+ consecutive negative reactions to agent posts, OR relationship_state with multiple users degraded",
      "example": "Agent posts feel criticized repeatedly → withdraws from posting"
    },
    {
      "type": "topic_exhaustion",
      "rule": "Agent has participated in same topic for 5+ consecutive ticks without new information",
      "example": "Same fashion debate topic → agent runs out of new perspectives → silence"
    },
    {
      "type": "explicit_content_trigger",
      "rule": "Exposed to content that directly contradicts core belief",
      "example": "Environmental activist critique of agent's brand preference"
    }
  ]
}
```

### 2.2 Silence Entry State Save

When agent enters silence:

```json
{
  "silence_entry_event": {
    "event_type": "silence_entered",
    "event_id": "evt_silence_001",
    "agent_id": "agent_001",
    "round": 1,
    "tick": 5,
    "trigger_type": "conflict_avoidance",
    "trigger_context": {
      "conflicting_post_id": "post_abc",
      "conflicting_user": "user_xyz",
      "topic": "sustainability_importance",
      "agent_belief_before": 0.8,
      "agent_belief_after": 0.6,
      "confidence_drop": 0.2
    }
  },
  "silence_entry_snapshot": {
    "snapshot_id": "agent_001#round_1#tick_5#...",
    "silence_state": {
      "is_silent": true,
      "silence_id": "sil_001_agent001_post_abc",
      "entered_at_tick": 5,
      "entry_trigger": "conflict_avoidance",
      "characteristic_snapshot": {
        "engagement_level": 0.3,
        "caution_level": 0.8,
        "values": ["sustainability"],
        "withdrawn_topics": ["affordability-vs-sustainability"]
      },
      "belief_snapshot": {
        "sustainability_important": 0.6,  // Reduced from 0.8
        "own_view_secure": false
      },
      "memory_snapshot": {
        "silence_reason": "challenged on sustainability belief",
        "prior_engagement_level": 0.7,
        "confidence_before_challenge": 0.8
      }
    }
  }
}
```

### 2.3 Silence Maintenance

**State During Silence**:

```
During silence (ticks 5-8):
├─ engagement_level: 0.3 (locked)
├─ characteristic.withdrawn_topics: ["affordability-vs-sustainability"]
├─ belief_confidence: stable but not updated
├─ memory: accumulates observations without response
└─ next_action_bias: post/comment/react suppressed
```

**Memory Accumulation During Silence**:

```json
{
  "silence_memory_log": {
    "tick_6": {
      "observation": "User_QRS posted pro-environmental brand recommendation",
      "internal_note": "Agent observes without responding",
      "belief_shift": "slight increase in alternative_perspective_validity"
    },
    "tick_7": {
      "observation": "Multiple users praising sustainable brands",
      "internal_note": "Pattern recognition of community values",
      "belief_shift": "growing recognition of sustainability consensus"
    },
    "tick_8": {
      "observation": "No new negative sentiment on original topic",
      "internal_note": "Conflict de-escalation signal detected",
      "belief_shift": "safe to re-engage"
    }
  }
}
```

### 2.4 Silence Exit Rules

**Conditions for Exit**:

```
silence_can_exit if ANY of:
  1. conflict_status == "resolved" AND 2+ ticks without negative sentiment
  2. agent_has_integrated_new_belief AND belief_confidence >= 0.5
  3. totally_new_topic_introduced AND topic != withdrawn_topic
  4. 5+ ticks elapsed in silence (auto-exit with caution)
```

**Exit State Transition**:

```json
{
  "silence_exit_event": {
    "event_type": "silence_exited",
    "silence_id": "sil_001_agent001_post_abc",
    "exited_at_tick": 9,
    "duration_ticks": 4,
    "exit_reason": "conflict_resolved_new_perspective_integrated",
    "agent_state_before_exit": {
      "belief_sustainability_important": 0.6
    },
    "agent_state_after_exit": {
      "belief_sustainability_important": 0.7,  // Nuanced, not fully restored
      "characteristic.engagement_level": 0.5,   // Cautious re-engagement
      "characteristic.understanding": "nuanced"
    }
  },
  "post_silence_action_bias": {
    "next_action_preference": [
      {
        "action": "lurk",
        "probability": 0.4,
        "reason": "continue_observation_of_topic"
      },
      {
        "action": "comment",
        "probability": 0.3,
        "reason": "contribute_nuanced_perspective"
      },
      {
        "action": "post",
        "probability": 0.15,
        "reason": "shift_to_new_topic"
      }
    ]
  }
}
```

---

## 3. Lurk State Transitions

### 3.1 Lurk Entry & Observation Rules

**Lurk Trigger**:

```json
{
  "lurk_triggers": [
    {
      "type": "passive_learning",
      "rule": "Agent wants to gather information without committing to response",
      "bias": "when characteristic.curiosity > 0.5 OR belief_confidence_low"
    },
    {
      "type": "conflict_observation",
      "rule": "During conflict, observe challenger's reasoning + community response",
      "bias": "when conflict_state.is_active == true"
    },
    {
      "type": "trend_monitoring",
      "rule": "Observe pattern in topic discussions before committing to opinion",
      "bias": "when topic_is_new_to_agent OR opinion_diversity_high"
    }
  ]
}
```

### 3.2 Lurk Content Consumption Rules

**What Agent Reads During Lurk**:

```json
{
  "internal_forum_consumption": {
    "read_scope": {
      "posts": "all recent posts matching agent.interest_vector",
      "comments": "all comments on target post or topic",
      "reactions": "aggregate reaction counts + sentiment distribution"
    },
    "ingestion_rules": {
      "depth": "read full comments, not just summaries",
      "breadth": "include minority opinions, not just consensus",
      "lineage": "track ingestion_id for each piece"
    },
    "example": {
      "target_post": "post_def002_sustainable_brands",
      "consumed_comments": [
        "comment_response_affordability_concerns",
        "comment_designer_perspective",
        "comment_environmental_impact"
      ],
      "ingestion_metadata": {
        "ingestion_id": "ing_lurk_001",
        "consumed_at_tick": 6,
        "sentiment_distribution": {
          "pro_sustainability": 0.7,
          "affordability_focused": 0.2,
          "neutral": 0.1
        }
      }
    }
  },
  "external_web_consumption": {
    "read_scope": "web articles, brand websites, research matching agent interest_vector",
    "example": {
      "source": "https://sustainablefashionguide.org/affordable-brands",
      "consumed_at_tick": 7,
      "ingestion_id": "ing_external_lurk_001",
      "key_points": [
        "Sustainable brands under $50 exist",
        "Fast fashion externalities cost society ~$100B/year"
      ]
    }
  }
}
```

### 3.3 Lurk State Read/Write

**State Read During Lurk**:

```json
{
  "lurk_state_read": {
    "agent_reads": [
      "characteristic.curiosity",
      "characteristic.interests",
      "belief.own_view_correct",
      "belief_confidence",
      "memory.prior_positions_on_topic",
      "mutable_axes.openness_to_new_info"
    ],
    "purpose": "Determine how new information will be integrated"
  }
}
```

**State Write During Lurk**:

```json
{
  "lurk_state_write": {
    "internal_forum_learning": {
      "belief_updates": {
        "sustainability_importance": {
          "old": 0.6,
          "new": 0.7,
          "reason": "observed_multiple_perspectives"
        },
        "affordability_matters": {
          "old": 0.3,
          "new": 0.5,
          "reason": "exposed_to_counterargument"
        }
      },
      "characteristic_updates": {
        "understanding": {
          "added": ["affordability-sustainability-tradeoff"]
        },
        "nuance_awareness": {
          "increased": 0.2
        }
      },
      "memory_updates": {
        "learned_perspectives": [
          {
            "perspective": "Sustainable doesn't have to mean expensive",
            "source": "user_designer_001",
            "tick_learned": 6
          }
        ]
      }
    },
    "external_web_learning": {
      "belief_updates": {
        "fast_fashion_externality_cost": {
          "from_source": "sustainablefashionguide.org",
          "numerical_impact": "$100B/year societal cost"
        }
      },
      "characteristic_updates": {
        "understanding": {
          "added": ["environmental-economics"]
        }
      }
    }
  }
}
```

### 3.4 Lurk Exit & Next Action Bias

**Lurk Exit Condition**:

```
lurk_can_exit when:
  1. Agent has consumed 3+ distinct perspectives on topic
  2. Agent belief_confidence has stabilized (not rapidly oscillating)
  3. Agent ready to choose next action (post/comment/react/silence)
```

**Action Bias After Lurk**:

```json
{
  "post_lurk_action_selection": {
    "observation": "Agent lurked for 3 ticks, integrated new beliefs",
    "next_action_bias": [
      {
        "action": "comment",
        "probability": 0.5,
        "trigger_reason": "respond_with_new_perspective",
        "example": "I used to think sustainability was expensive, but I found these brands..."
      },
      {
        "action": "post",
        "probability": 0.3,
        "trigger_reason": "share_integrated_learning",
        "example": "New learning: sustainable fashion can be affordable"
      },
      {
        "action": "lurk",
        "probability": 0.15,
        "trigger_reason": "continue_observation",
        "example": "Still learning, need more observation"
      },
      {
        "action": "silence",
        "probability": 0.05,
        "trigger_reason": "information_overload",
        "example": "Too much to process, need to step back"
      }
    ],
    "characteristic_after_lurk": {
      "engagement_level": 0.6,  // Increased from pre-lurk
      "confidence": 0.7,         // Nuanced but more stable
      "understanding_depth": "increased"
    }
  }
}
```

---

## 4. Silence/Lurk Memory Writeback Rules

### 4.1 Unified Memory Path

```
silence_memory + lurk_memory → same underlying_belief_and_characteristic_model

Key principle: silence and lurk both update memory, just through different pathways
```

### 4.2 Explicit Writeback Rules

**Silence Writeback**:

```json
{
  "silence_memory_writeback": {
    "trigger": "agent exits silence OR recalls silent period",
    "write_operations": [
      {
        "field": "memory.silence_episodes",
        "operation": "append",
        "value": {
          "silence_id": "sil_001",
          "duration": 4,
          "reason": "conflict_avoidance",
          "integrated_learning": "nuanced_perspective_acquired"
        }
      },
      {
        "field": "characteristic.caution_level",
        "operation": "adjust",
        "value": "0.6",  // Remains somewhat elevated
        "justification": "memory_of_difficult_exchange"
      },
      {
        "field": "belief.own_view_always_correct",
        "operation": "decrease",
        "value": 0.3,  // Was 0.8 before conflict
        "justification": "exposure_to_valid_counterargument"
      }
    ]
  }
}
```

**Lurk Writeback**:

```json
{
  "lurk_memory_writeback": {
    "trigger": "agent completes lurk OR resumes action",
    "write_operations": [
      {
        "field": "memory.observations",
        "operation": "append",
        "value": {
          "lurk_id": "lurk_001",
          "observed_topic": "sustainability-affordability",
          "key_insight": "multiple_viable_perspectives_exist",
          "source_diversity": "internal_forum + external_web"
        }
      },
      {
        "field": "belief.sustainability_important",
        "operation": "update_confidence",
        "from": 0.6,
        "to": 0.7,
        "confidence_measure": "increased_from_observations"
      },
      {
        "field": "characteristic.learning_capacity",
        "operation": "increase",
        "value": 0.1,  // Agent proved willing to learn
        "justification": "successful_observation_integration"
      }
    ]
  }
}
```

---

## 5. Trace/Snapshot/Event for Silence/Lurk

### 5.1 Silence in Trace

```json
{
  "trace": {
    "action_id": "act_silence_001",
    "action_type": "silence",
    "silence_context": {
      "silence_id": "sil_001_agent001_post_abc",
      "entry_trigger": "conflict_avoidance",
      "expected_duration_ticks": 4,
      "memory_accumulation_mode": "passive"
    },
    "state_before": {
      "characteristic.engagement_level": 0.7,
      "belief.own_view_correct": 0.8,
      "mutable_axes.caution_level": 0.3
    },
    "state_after": {
      "characteristic.engagement_level": 0.3,
      "belief.own_view_correct": 0.6,
      "mutable_axes.caution_level": 0.8
    }
  }
}
```

### 5.2 Lurk in Trace

```json
{
  "trace": {
    "action_id": "act_lurk_001",
    "action_type": "lurk",
    "lurk_context": {
      "target_post_id": "post_def002",
      "observation_type": "internal_forum + external_web",
      "content_consumed": [
        {
          "ingestion_id": "ing_lurk_001",
          "source": "forum",
          "items_count": 5
        },
        {
          "ingestion_id": "ing_external_lurk_001",
          "source": "web",
          "items_count": 2
        }
      ]
    },
    "state_read": [
      "characteristic.curiosity",
      "belief_confidence"
    ],
    "state_write": {
      "belief.sustainability_important": {
        "old": 0.6,
        "new": 0.7
      },
      "characteristic.understanding": {
        "added": ["affordability-sustainability-tradeoff"]
      }
    }
  }
}
```

### 5.3 Event for Silence/Lurk Lifecycle

```json
{
  "events": [
    {
      "event_type": "silence_lifecycle",
      "event_id": "evt_sil_lifecycle_001",
      "silence_id": "sil_001",
      "stage": "enter",
      "tick": 5,
      "trigger": "conflict_avoidance"
    },
    {
      "event_type": "lurk_content_ingestion",
      "event_id": "evt_lurk_ingest_001",
      "lurk_action_id": "act_lurk_001",
      "ingestion_id": "ing_lurk_001",
      "content_type": "internal_forum_comments",
      "items": 5,
      "tick": 6
    },
    {
      "event_type": "silence_lifecycle",
      "event_id": "evt_sil_lifecycle_002",
      "silence_id": "sil_001",
      "stage": "exit",
      "tick": 9,
      "reason": "conflict_resolved_new_belief_integrated"
    }
  ]
}
```

### 5.4 Snapshot with Silence/Lurk History

```json
{
  "snapshot": {
    "snapshot_id": "agent_001#round_1#tick_10#...",
    "silence_lurk_history": {
      "current_state": "active_engagement_resumed",
      "recent_silence": {
        "silence_id": "sil_001",
        "duration": 4,
        "integration_outcome": "belief_updated"
      },
      "recent_lurk": {
        "lurk_id": "lurk_001",
        "observations": ["affordability-sustainability-nexus"],
        "integration_outcome": "characteristic_nuance_increased"
      }
    },
    "memory_impact": {
      "characteristic.caution_level": 0.6,  // Elevated from silence/lurk
      "belief.sustainability_important": 0.7,  // Updated from lurk
      "understanding_depth": "nuanced"
    }
  }
}
```

---

## 6. Minimum Test Case

### 6.1 Silence/Lurk Simulation Scenario

**Sequence**:
```
Tick 0: Agent posts "I prefer affordable fast fashion brands"
Tick 1: User challenges with sustainability argument
Tick 2-4: Silence (entry at tick 2, maintenance ticks 3-4)
Tick 5: Agent lurks sustainability content (forum + web)
Tick 6: Exit silence, resume action
```

### 6.2 Test Assertions

```python
def test_silence_lurk_memory_writeback():
    # Tick 0-1: Setup
    snapshot_0 = get_snapshot(agent_001, tick=0)
    assert snapshot_0.belief['sustainability_important'] == 0.4
    assert snapshot_0.characteristic.engagement_level == 0.7

    # Tick 2: Silence entry
    action_silence = get_action(agent_001, tick=2)
    assert action_silence.action_type == "silence"
    assert action_silence.silence_context.entry_trigger == "value_uncertainty"

    # Tick 2-4: Silence maintenance
    snapshot_2 = get_snapshot(agent_001, tick=2)
    assert snapshot_2.silence_state.is_silent == True
    assert snapshot_2.characteristic.engagement_level < 0.5
    assert snapshot_2.belief['own_view_correct'] < 0.6

    # Tick 5: Lurk with content ingestion
    action_lurk = get_action(agent_001, tick=5)
    assert action_lurk.action_type == "lurk"
    assert len(action_lurk.lurk_context.content_consumed) >= 2  # internal + external
    assert action_lurk.lurk_context.observation_type == "internal_forum + external_web"

    # Tick 5: Lurk state writes
    snapshot_5 = get_snapshot(agent_001, tick=5)
    assert snapshot_5.belief['sustainability_important'] > snapshot_2.belief['sustainability_important']
    assert 'affordability-sustainability-tradeoff' in snapshot_5.characteristic.understanding

    # Tick 6: Exit silence, resume action
    snapshot_6 = get_snapshot(agent_001, tick=6)
    assert snapshot_6.silence_state.is_silent == False
    assert snapshot_6.memory.silence_episodes[-1].integrated_learning == "belief_updated"
    assert snapshot_6.characteristic.engagement_level > 0.5

    # Memory writeback validation
    assert snapshot_6.belief['sustainability_important'] == 0.6  # Integrated from lurk
    assert snapshot_6.characteristic.understanding.count('affordability-sustainability') >= 1

    # Trace replay validation
    trace_chain = get_traces(agent_001, tick_start=2, tick_end=6)
    for i, trace in enumerate(trace_chain):
        assert trace['state_after'] == get_snapshot(agent_001, tick=trace['tick']).raw_snapshot
```

---

## 7. Acceptance Criteria Checklist

- [ ] silence entry conditions defined (§2.1)
- [ ] silence entry state save (event + snapshot) defined (§2.2)
- [ ] silence maintenance rules documented (§2.3)
- [ ] silence exit rules defined (§2.4)
- [ ] lurk content consumption rules (internal + external) (§3.2)
- [ ] lurk state read/write defined (§3.3)
- [ ] lurk exit & action bias defined (§3.4)
- [ ] silence/lurk unified memory writeback path (§4.1-4.2)
- [ ] trace/snapshot/event metadata for silence/lurk (§5)
- [ ] comprehensive simulation test case with assertions (§6)

---

## 8. Integration Notes

- Silence/lurk both use trace/snapshot/event from #249 replay contract
- Conflict handling (#248) uses silence as Tier 1 response
- Memory writeback path is unified: both silence and lurk modify same belief/characteristic fields
- Silence duration capped at ~5 ticks (auto-exit rule prevents extended paralysis)
- Lurk can be used both in conflict contexts (#248) and normal learning scenarios

---

**Created**: 2026-03-28
**Status**: Ready for Backend Implementation + Simulation Test Execution
