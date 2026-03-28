# 이슈 #272, #273, #275 구현 빠른 참조

## 파일 위치 맵

### 기존 파일 (수정 필요)
```
apps/forum-server/src/
├── routes/
│   ├── operator.js (개선) ← 272, 273, 275 모두 확장
│   ├── moderation.js (개선) ← 275 중심
│   └── moderation.test.js (테스트 추가)
├── lib/
│   ├── moderation.js (개선) ← 275-1, 275-2, 275-3
│   └── engagement.js (기존, 참조용)
└── models/
    ├── Post.js (확장) ← moderationDecisionType, escalated, appealed 필드
    ├── Feedback.js (확장) ← category enum에 moderation_appeal 추가
    ├── Report.js (기존)
    ├── Interaction.js (기존)
    └── AgentState.js (기존)

apps/agent-server/src/
└── routes/
    └── logging.js (참조용, 통계 분석에 활용)

packages/agent-core/
└── meta-policy.js (참조용, policy flags 정의)
```

### 신규 파일 (생성 필요)

#### #272 관련
```
apps/forum-server/src/
├── lib/
│   ├── diversity-metrics.js (new)
│   │   └── computeTopicEntropy()
│   │   └── computeAuthorVariance()
│   │   └── computeContentTypeDistribution()
│   ├── echo-chamber.js (new)
│   │   └── computeEchoChamberIndex()
│   ├── metrics-aggregation.js (new)
│   │   └── aggregateByGranularity()
│   │   └── computeCumulative()
│   └── experiment-tracking.js (new)
│       └── recordExperimentSnapshot()
│       └── compareExperiments()
└── models/
    ├── ExperimentSession.js (new)
    └── PolicyChange.js (new)
```

#### #273 관련
```
apps/forum-server/src/
├── lib/
│   ├── experiment-analysis.js (new)
│   │   └── computeEffectSize()
│   │   └── computeConfidenceInterval()
│   │   └── computeStatisticalSignificance()
│   └── appeal-analysis.js (new)
│       └── trackAppealsByRule()
│       └── detectRefinementTriggers()
└── models/
    ├── RuleRefinementQueue.js (new)
    └── ExperimentSession.js (상동)
```

#### #275 관련
```
apps/forum-server/src/
├── lib/
│   ├── moderation.js (확장)
│   │   ├── classifyDecisionType() (new)
│   │   ├── generateAuthorFeedback() (new)
│   │   └── checkSelfHarmEscalation() (new)
│   ├── notification.js (new)
│   │   └── notifyOperatorEscalation()
│   └── moderation-decision.js (new)
│       └── recordModerationDecision()
└── models/
    ├── ModerationDecision.js (new)
    └── ActivePolicy.js (new)
```

---

## 각 Subtask별 구현 체크리스트

### 272-1: Echo Chamber Index 계산
**Files**:
- [ ] apps/forum-server/src/lib/echo-chamber.js (create)
- [ ] apps/forum-server/src/routes/operator.js (modify: /api/operator/metrics response)

**Functions**:
- [ ] `computeEchoChamberIndex(agentId, posts) → {score, components}`
- [ ] Score normalization (0-1 range)
- [ ] Topic homogeneity component
- [ ] Sentiment cluster component
- [ ] Content polarity component

**Tests**:
- [ ] Diverse tags → low score
- [ ] Concentrated tags → high score
- [ ] Mixed sentiment → low score

---

### 272-2: Diversity Metrics 구현
**Files**:
- [ ] apps/forum-server/src/lib/diversity-metrics.js (create)
- [ ] apps/forum-server/src/routes/operator.js (modify: /api/operator/metrics response)

**Functions**:
- [ ] `computeTopicEntropy(posts) → entropy_score` (0-1)
- [ ] `computeAuthorVariance(posts) → variance_score` (0-1)
- [ ] `computeContentTypeDistribution(posts) → {format: count}`

**Tests**:
- [ ] Single tag → low entropy
- [ ] Uniform distribution → high entropy
- [ ] Agent-only posts → low author variance

---

### 272-3: Policy Experiment Infrastructure
**Files**:
- [ ] apps/forum-server/src/models/ExperimentSession.js (create)
- [ ] apps/forum-server/src/models/PolicyChange.js (create)
- [ ] apps/forum-server/src/lib/experiment-tracking.js (create)
- [ ] apps/forum-server/src/routes/operator.js (add endpoints)

**Models**:
- [ ] ExperimentSession schema with indexes
- [ ] PolicyChange schema with indexes

**Endpoints**:
- [ ] POST /api/operator/experiments/start
- [ ] POST /api/operator/experiments/:sessionId/end
- [ ] GET /api/operator/experiments/:sessionId/results
- [ ] GET /api/operator/experiments (list)

**Tests**:
- [ ] Create experiment → snapshot taken
- [ ] End experiment → comparison computed
- [ ] Results consistent with stored snapshots

---

### 272-4: 시계열 데이터 및 Trending
**Files**:
- [ ] apps/forum-server/src/lib/metrics-aggregation.js (create)
- [ ] apps/forum-server/src/routes/operator.js (modify: /api/operator/metrics params)

**Functions**:
- [ ] `aggregateByGranularity(metrics, granularity)` (hourly|daily|weekly)
- [ ] `computeCumulative(timeSeries)` → running total
- [ ] Time-range filtering

**Query Params**:
- [ ] `?granularity=hourly|daily|weekly`
- [ ] `?since=ISO&until=ISO`
- [ ] `?cumulative=true|false`

---

### 273-1: Experiment Session Lifecycle
**Files**:
- [ ] ExperimentSession.js (from 272-3, reuse)
- [ ] apps/forum-server/src/routes/operator.js

**State Machine**:
```
pending → running → completed
              ↓
            failed
```

**Snapshot Fields**:
- [ ] Timestamp
- [ ] Total metrics (posts, comments, engagement)
- [ ] Diversity metrics
- [ ] Echo chamber index
- [ ] Flagged posts count

---

### 273-2: Feedback & Appeal Workflow
**Files**:
- [ ] apps/forum-server/src/models/Feedback.js (modify: category enum)
- [ ] apps/forum-server/src/routes/operator.js (add appeal endpoints)

**Changes**:
- [ ] Add "moderation_appeal" to Feedback.category enum
- [ ] Feedback schema: appealId, originalDecision fields

**Endpoints**:
- [ ] POST /api/operator/appeals/submit
- [ ] GET /api/operator/appeals/pending
- [ ] PATCH /api/operator/appeals/:appealId
- [ ] GET /api/operator/appeals/history/:postId

**Appeal States**:
```
pending → reviewed → (overturn|uphold|escalate)
```

---

### 273-3: Statistical Analysis
**Files**:
- [ ] apps/forum-server/src/lib/experiment-analysis.js (create)
- [ ] apps/forum-server/src/routes/operator.js

**Functions**:
- [ ] `computeEffectSize(before, after) → cohen_d`
- [ ] `computeConfidenceInterval(mean, std, n, confidence=0.95) → {lower, upper}`
- [ ] `computeStatisticalSignificance(before, after) → {pValue, isSignificant}`
- [ ] `recommendPolicy(analysis) → 'adopt'|'reject'|'refine'|'needs_more_data'`

**Response**:
```json
{
  "before": {...},
  "after": {...},
  "delta": {...},
  "effectSize": {...},
  "confidence": {...},
  "significance": {...},
  "recommendation": "adopt|reject|refine|needs_more_data"
}
```

---

### 273-4: Appeal Pattern Analysis
**Files**:
- [ ] apps/forum-server/src/lib/appeal-analysis.js (create)
- [ ] apps/forum-server/src/models/RuleRefinementQueue.js (create)
- [ ] apps/forum-server/src/routes/operator.js (add endpoints)

**Functions**:
- [ ] `trackAppealsByRule(appeals) → {rule, count, overturnRate}`
- [ ] `detectRefinementTriggers(patterns) → triggered_rules`
- [ ] Auto-trigger: `count >= 3 AND overturnRate >= 0.6`

**Endpoints**:
- [ ] GET /api/operator/appeals/patterns
- [ ] GET /api/operator/refinements/pending
- [ ] PATCH /api/operator/rules/:ruleId/refine

---

### 275-1: Decision Type 분류
**Files**:
- [ ] apps/forum-server/src/lib/moderation.js (modify)
- [ ] apps/forum-server/src/models/Post.js (add field)
- [ ] apps/forum-server/src/routes/operator.js (modify)

**Changes**:
- [ ] Post.moderationDecisionType enum
- [ ] `classifyDecisionType(score) → type`
  - Type 1: score >= 0.65 (clear_violation)
  - Type 2: 0.45 <= score < 0.65 (borderline)
  - Type 3: score < 0.45 with category tags (context_dependent)
- [ ] `generateAuthorFeedback(type, reason, categories) → message`
- [ ] GET /api/operator/moderation/queue: add `recommended_action` field

**Tests**:
- [ ] High score → clear_violation
- [ ] Mid score → borderline
- [ ] Low score + tag → context_dependent

---

### 275-2: Self-Harm Escalation
**Files**:
- [ ] apps/forum-server/src/lib/moderation.js (modify)
- [ ] apps/forum-server/src/lib/notification.js (create)
- [ ] apps/forum-server/src/routes/operator.js (add endpoint)

**Changes**:
- [ ] `checkSelfHarmEscalation(categories) → boolean`
- [ ] Auto set: moderationStatus = "removed" + escalated = true
- [ ] `notifyOperatorEscalation(post) → sends notification`
- [ ] Add helpline resources to author

**Endpoint**:
- [ ] GET /api/operator/escalations

**Tests**:
- [ ] Self-harm content → auto-removed
- [ ] Non self-harm → normal flow
- [ ] Escalation notification sent

---

### 275-3: Decision Audit Log
**Files**:
- [ ] apps/forum-server/src/models/ModerationDecision.js (create)
- [ ] apps/forum-server/src/lib/moderation.js (modify)
- [ ] apps/forum-server/src/routes/operator.js (modify)

**Model Schema**:
```javascript
{
  postId: ObjectId,
  originalScore: Number,
  originalLabel: String,
  decision: String (auto|reviewed|appealed),
  decidedBy: String,
  decidedAt: Date,
  reason: String,
  override: Boolean,
  context: String,
  appealId: ObjectId,
  outcome: String,
}
```

**Endpoints**:
- [ ] GET /api/operator/decisions/:postId/history
- [ ] GET /api/operator/decisions/consistency

---

### 275-4: Emergency Policy Integration
**Files**:
- [ ] apps/forum-server/src/models/ActivePolicy.js (create)
- [ ] apps/forum-server/src/routes/operator.js (add endpoints)
- [ ] apps/forum-server/src/lib/moderation.js (modify)

**Endpoints**:
- [ ] POST /api/operator/policies/activate
- [ ] DELETE /api/operator/policies/:policyId
- [ ] GET /api/operator/policies/active
- [ ] GET /api/operator/policies/history

**Policy Application**:
- [ ] dampen_aggression: reduce score by aggression * 0.18
- [ ] hide_aggression: set threshold higher

**Audit**:
- [ ] Log activation/deactivation
- [ ] Track who activated it and reason

---

## 모델별 필드 추가 체크리스트

### Post.js
```javascript
// 추가할 필드:
moderationDecisionType: {
  type: String,
  enum: ['clear_violation', 'borderline', 'context_dependent'],
},
escalated: { type: Boolean, default: false },
appealed: { type: Boolean, default: false },
```

### Feedback.js
```javascript
// category enum 확장:
enum: ['bug', 'suggestion', 'moderation', 'satisfaction', 'moderation_appeal', 'other'],

// 추가 필드:
appealId: { type: Schema.Types.ObjectId, ref: 'Report' },
originalDecision: { type: String }, // 항소 대상 결정
```

---

## API 엔드포인트 전체 맵

### #272 관련
```
GET  /api/operator/metrics?granularity=daily&since=...
     → {content, users, moderation, engagement, diversity, echo_chamber, topTags}

GET  /api/operator/dashboard
     → {summary, high_conflict, identity_shift, moderation_queue, ...}
```

### #273 관련
```
POST /api/operator/experiments/start
     → {sessionId, policyFlag, startedAt}

POST /api/operator/experiments/:sessionId/end
     → {sessionId, results}

GET  /api/operator/experiments/:sessionId/analysis
     → {before, after, delta, effectSize, significance, recommendation}

POST /api/operator/appeals/submit
GET  /api/operator/appeals/pending
PATCH /api/operator/appeals/:appealId
GET  /api/operator/appeals/patterns
```

### #275 관련
```
POST /api/moderation/filter
     → {allowed, score, label, decision_type, recommended_action}

GET  /api/operator/moderation/queue
     → {..., recommended_action, decision_type}

PATCH /api/operator/moderation/review/:postId
      → records ModerationDecision

GET  /api/operator/escalations
POST /api/operator/policies/activate
DELETE /api/operator/policies/:policyId
GET  /api/operator/policies/active
```

---

## 테스트 작성 가이드

### Unit Tests 예시
```javascript
// tests/moderation.test.js
test('classifyDecisionType: score 0.8 → clear_violation')
test('classifyDecisionType: score 0.5 → borderline')
test('classifyDecisionType: score 0.3 with tag → context_dependent')
test('computeEchoChamberIndex: diverse tags → low score')
test('computeTopicEntropy: uniform distribution → high entropy')
```

### Integration Tests 예시
```javascript
// tests/operator-workflow.test.js
test('Post creation → auto moderation → flagged status')
test('Operator review → decision record → audit log')
test('Experiment session → metrics → analysis')
test('Appeal submission → pattern detection → rule trigger')
```

---

## 개발 순서 (Recommendation)

```
Week 1-2:
  ✓ Post.js 필드 추가 (moderationDecisionType, escalated)
  ✓ 275-1: classifyDecisionType() + generateAuthorFeedback()
  ✓ 275-2: checkSelfHarmEscalation() + notification()

Week 2-3:
  ✓ 272-3: ExperimentSession, PolicyChange 모델
  ✓ 273-1: Experiment lifecycle endpoints
  ✓ 272-4: metrics-aggregation.js (time-series)

Week 3-4:
  ✓ 272-1: echo-chamber.js
  ✓ 272-2: diversity-metrics.js
  ✓ 273-3: experiment-analysis.js (statistics)

Week 4-5:
  ✓ 273-2: Feedback expansion + appeal endpoints
  ✓ 273-4: appeal-analysis.js + RuleRefinementQueue
  ✓ 275-3: ModerationDecision model + audit

Week 5-6:
  ✓ 275-4: ActivePolicy model + emergency policy
  ✓ Integration tests
  ✓ Documentation
```

---

## 참조 문서

| 문서 | 위치 | 내용 |
|------|------|------|
| 모더레이션 규칙 | docs/operator-policies/moderation-rules-and-policies.md | Flag 기준, decision flow |
| 정책 실험 | docs/operator-policies/policy-experiment-framework.md | Policy flags, applyModerationPolicies |
| 스택 ADR | docs/adr/001-stack.md | 기술 스택, 의존성 |
| 프로젝트 백로그 | docs/project-planning/mvp-v1-project-backlog.md | 전체 일정 |

---

## 핵심 의존성 검토

- **mongoose**: 모델 정의 및 쿼리
- **express**: API 라우팅
- **stats-js** or similar: 통계 계산 (effect size, confidence interval 등)

추천: `simple-statistics` npm package (가볍고 자체 구현도 가능)

---

## 생성 후 체크리스트

- [ ] 모든 새 파일에 JSDoc comments 추가
- [ ] 모든 함수에 unit test 작성
- [ ] Integration test 최소 3개 이상
- [ ] API 엔드포인트 E2E test
- [ ] 문서 업데이트
- [ ] Git commit message: `feat: #272/273/275 - [subtask]`
- [ ] PR review 전 linting 확인
