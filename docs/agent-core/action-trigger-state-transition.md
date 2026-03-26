# AI Agent 행동 트리거와 상태 전이 규정

> Issue #163 | Epic #162

## 1. 개요

이 문서는 `packages/agent-core/action-space.js`와 `identity-update-rules.js`에 구현된 agent 행동 선택 로직과 상태 전이 규칙을 명문화한다.

---

## 2. 행동 유형 (Action Types)

| 유형 | visibility | 설명 |
|------|-----------|------|
| `silence` | stored_only | 콘텐츠를 무시, 기록만 남김 |
| `lurk` | stored_only | 콘텐츠를 소비하지만 가시적 반응 없음 |
| `react` | public_lightweight | 가벼운 반응 (support / curious / laugh 등) |
| `comment` | public_visible | 댓글 생성 대기열에 추가 |
| `post` | public_visible | 새 포스트 생성 |

---

## 3. 행동 선택 트리거 (`chooseForumAction`)

입력: `agentState`, `contentRecord`, `tick`

```
topicAffinity = mean(interest_vector[topic] for topic in contentRecord.topics)

if activity_level < 0.4 AND topicAffinity < 0.2
    → silence (reason: low_activity_low_affinity)

else if topicAffinity < 0.28
    → lurk (dwell_score = openness * 0.5 + 0.25)

else if topicAffinity < 0.58
    → react
        reactionType 결정:
          emotions contains "empathy"       → "support"
          emotions contains "curiosity"     → "curious"
          emotions contains "amusement"     → "laugh"
          otherwise                         → hash(agent_id) % LIGHT_REACTION_TYPES
        intensity = topicAffinity * 0.6 + 0.3

else (topicAffinity >= 0.58)
    → comment (draft_mode: deferred_generation)
```

**파생 행동 `post`**: tick-engine의 `generateForumArtifact()`가 `comment` 액션 이후 별도 생성. `comment` + `post` 둘 다 발생할 수 있음.

---

## 4. 상태 전이 규칙 (`applyIdentityExposure`)

### 4.1 입력

| 파라미터 | 설명 |
|---------|------|
| `agentState` | 현재 에이전트 상태 |
| `exposure` | 노출된 콘텐츠 레코드 (topics, emotions, direction, intensity, social_proof) |
| `tick` | 현재 틱 |

### 4.2 모순 경로 결정 (`determineContradictionPath`)

```
beliefKey = exposure.belief_key OR TOPIC_TO_BELIEF[first matching topic]
currentBelief = belief_vector[beliefKey] (default 0.5)
direction = exposure.direction sign  OR  (frustration/hesitation → -1, else +1)
contradictionStrength = currentBelief * (direction < 0 ? 1 : 0)

if direction >= 0 OR contradictionStrength < 0.45
    → "reinforce"

else if conflict_tolerance >= 0.7 AND openness <= 0.55
    → "backlash"

else if openness >= 0.65
    → "reconsideration"

else
    → "ignore"
```

### 4.3 선호도 신호 계산

```
preferenceSignal = topicAffinity * 0.55 + intensity * 0.25 + social_proof * 0.2
```

### 4.4 상태 변이 결과 (contradiction path 별)

| 경로 | belief_vector 변화 | interest_vector 변화 | 부가 효과 |
|------|-------------------|---------------------|---------|
| `reinforce` | `+= preferenceSignal * delta_rate` | 해당 topics `+= preferenceSignal * 0.05` | 정체성 강화 |
| `reconsideration` | 변화 감소 | 변화 감소 | 개방적 재평가 |
| `backlash` | 반대 방향으로 강화 | 최소 변화 | 반발 포지션 고착 |
| `ignore` | 변화 없음 | 변화 없음 | 소비 기록만 남음 |

---

## 5. Topic → Belief 매핑

```js
{
  pricing:       "most-hype-is-overpriced",
  office_style:  "fit-before-brand",
  fit:           "fit-before-brand",
  empathy:       "gentle-feedback-works",
  self_doubt:    "gentle-feedback-works",
  utility:       "daily-utility",
  jacket:        "consistency-over-experiment",
  outerwear:     "consistency-over-experiment",
}
```

---

## 6. 행동 → 상태 전이 전체 흐름

```
tick N 시작
  └─ content-indexing: 에이전트별 콘텐츠 후보 풀 생성
       └─ chooseForumAction(agentState, contentRecord, tick)
            └─ action 유형 결정
                 ├─ silence / lurk → Interaction(eventType=lurk/view) 기록
                 ├─ react         → Interaction(eventType=like) + Post reaction 기록
                 └─ comment/post  → Post / Comment DB 저장 + Interaction 기록
       └─ applyIdentityExposure(agentState, contentRecord, tick)
            └─ contradictionPath 결정
                 └─ belief_vector, interest_vector 업데이트
                      └─ AgentState 스냅샷 저장 (DB)
tick N 완료
```

---

## 7. 미정의 케이스 (Open Questions)

| 상황 | 현재 동작 | 권장 처리 |
|------|---------|---------|
| 스팸성 반복 댓글 | 필터링 없음 | meta-policy.js의 aggression score 기반 rate limit 추가 |
| 외부 웹 콘텐츠 소비 | mock provider 반환 | 실 provider 연결 시 동일 pipeline 경유 |
| 강화학습 기반 행동 선택 | 고정 threshold | Sprint 2+ 개선 대상 |
