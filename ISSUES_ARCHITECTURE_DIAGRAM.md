# 이슈 #272, #273, #275 아키텍처 다이어그램

## 전체 시스템 흐름도

```
┌─────────────────────────────────────────────────────────────────┐
│                         OPERATOR BUNDLE                          │
│                   #263 (Epic) - Moderation & Policy              │
└─────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
                    ▼            ▼            ▼
        ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
        │   #272       │  │    #273      │  │    #275      │
        │  Metrics &   │  │ Experiments  │  │ Rules &      │
        │  Dashboard   │  │ & Feedback   │  │ Escalation   │
        └──────────────┘  └──────────────┘  └──────────────┘
             ~40%              ~45%              ~55%
```

---

## #275 Decision Flow (Post Creation → Removal)

```
┌─────────────────────────────────────────────────────────────────┐
│                    POST CREATION                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ scoreModerationText()
                    │ (moderation.js)
                    └────────┬─────────┘
                             │
                  ┌──────────┼──────────┐
                  │          │          │
             score<0.45  0.45≤score<0.65  score≥0.65
                  │          │          │
                  ▼          ▼          ▼
            ┌────────┐  ┌────────┐  ┌─────────┐
            │ Safe   │  │Borderline│ │ Clear   │
            │        │  │          │ │Violation│
            └───┬────┘  └────┬─────┘ └────┬────┘
                │            │            │
                ▼            ▼            ▼
         [275-1]      [275-1]       [275-1]
     classifyDecisionType()
                │            │            │
                ▼            ▼            ▼
        ┌──────────────┐ ┌──────────┐ ┌──────────────┐
        │APPROVED      │ │BORDERLINE│ │REMOVED       │
        │              │ │          │ │ (Auto)       │
        │              │ │[275-2]   │ │              │
        │              │ │Recheck   │ │[275-2]       │
        │              │ │policy    │ │Self-harm     │
        │              │ │          │ │escalation    │
        └──────────────┘ └──────────┘ └──────────────┘
                ▲            ▲            ▲
                │            │            │
        [275-3] ModerationDecision record
        (Decision audit log)
```

---

## #273 Experiment Lifecycle

```
┌──────────────────────────────────────────────────────────────┐
│                  POLICY EXPERIMENT                           │
│                      [273-1]                                 │
└──────────────────────────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
    CREATE           RUNNING           END
    ┌──┐             ┌───┐            ┌──┐
    │S1│─────────────│S2 │────────────│S3│
    └──┘             └───┘            └──┘
     │                │                │
     │ Before         │ Apply policy   │ After
     │ Snapshot       │                │ Snapshot
     │ [272-3]        │ [275-4]        │ [272-3]
     │                │                │
     └────────────────┼────────────────┘
                      │
                      ▼
        [273-3] STATISTICAL ANALYSIS
        ┌─────────────────────────────┐
        │ - Effect size (Cohen's d)   │
        │ - P-value                   │
        │ - Confidence interval       │
        │ - Recommendation            │
        └────────┬────────────────────┘
                 │
         ┌───────┴───────┐
         │               │
         ▼               ▼
      ADOPT           REJECT
    (Policy A)      (Policy B)
         │               │
         └───────┬───────┘
                 │
        [273-4] PATTERN ANALYSIS
        (Appeal tracking & rule refinement)
```

---

## #272 Metrics Architecture

```
┌────────────────────────────────────────────────────┐
│         OPERATOR DASHBOARD METRICS                 │
│            GET /api/operator/metrics               │
│          [272-1, 272-2, 272-3, 272-4]              │
└────────────────────────────────────────────────────┘
            │
    ┌───────┴────────┬───────────┬─────────────┐
    │                │           │             │
    ▼                ▼           ▼             ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ENGAGEMENT│  │DIVERSITY │  │ ECHO     │  │MODERATION│
│METRICS   │  │METRICS   │  │CHAMBER   │  │METRICS   │
│          │  │          │  │INDEX     │  │          │
│- likes   │  │- entropy │  │- score   │  │- flagged │
│- comments│  │- author  │  │- topic   │  │- reports │
│- views   │  │  variance│  │  homo    │  │- appeals │
│- rate    │  │- format  │  │- sent    │  │- override│
│          │  │  distrib │  │  cluster │  │  rate    │
└────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │             │
     │             │             │             │
     └─────────────┼─────────────┴─────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ [272-4]              │
        │ Time-series Data     │
        │ - Hourly/daily/weekly│
        │ - Cumulative         │
        │ - Trending           │
        └──────────────────────┘
```

---

## Data Model Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                    POST                                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ - moderationStatus: approved|flagged|removed              │ │
│  │ - moderationScore: 0-1                                    │ │
│  │ - moderationLabel: safe|review                            │ │
│  │ - moderationCategories: [harassment, hate, ...]           │ │
│  │ [275] moderationDecisionType: clear|borderline|context    │ │
│  │ [275] escalated: boolean                                  │ │
│  │ [273] appealed: boolean                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│           │              │              │                        │
└───────────┼──────────────┼──────────────┼────────────────────────┘
            │              │              │
    ┌───────▼──┐   ┌───────▼──────┐   ┌──▼──────────┐
    │           │   │              │   │             │
    ▼           ▼   ▼              ▼   ▼             ▼
 REPORT     FEEDBACK         MODERATION_DECISION  INTERACTION
 [273]      [273]            [275-3]              [272, 273]
            [appeal]         [audit log]
                             [history]
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
            MODERATION_DECISION      RULE_REFINEMENT_QUEUE
            (Multiple records        [273-4]
             per post)               (Triggered by pattern)
```

---

## File Creation Timeline

```
WEEK 1-2 (Foundation)
┌────────────────────────────────────────┐
│ 275-1: classifyDecisionType()           │
│ 275-2: checkSelfHarmEscalation()        │
│ Modify: Post.js (+3 fields)             │
└────────────────────────────────────────┘

WEEK 2-3 (Experiment Setup)
┌────────────────────────────────────────┐
│ 272-3: ExperimentSession.js (new)       │
│ 273-1: ExperimentSession lifecycle      │
│ 272-4: metrics-aggregation.js (new)     │
└────────────────────────────────────────┘

WEEK 3-4 (Metrics & Analysis)
┌────────────────────────────────────────┐
│ 272-1: echo-chamber.js (new)            │
│ 272-2: diversity-metrics.js (new)       │
│ 273-3: experiment-analysis.js (new)     │
└────────────────────────────────────────┘

WEEK 4-5 (Feedback Loop)
┌────────────────────────────────────────┐
│ 273-2: appeal-analysis.js (new)         │
│ 273-4: RuleRefinementQueue.js (new)     │
│ 275-3: ModerationDecision.js (new)      │
│ Modify: Feedback.js (enum extension)    │
└────────────────────────────────────────┘

WEEK 5-6 (Polish)
┌────────────────────────────────────────┐
│ 275-4: ActivePolicy.js (new)            │
│ Integration tests                       │
│ Documentation                           │
└────────────────────────────────────────┘
```

---

## Integration Points

### #272 ↔ #273 (Metrics ↔ Experiments)
```
ExperimentSession
    │
    ├─ beforeSnapshot ──────► GET /api/operator/metrics
    │
    └─ afterSnapshot ───────► GET /api/operator/metrics
                                    │
                                    ▼
                          Compute delta metrics
                          (experiment-analysis.js)
```

### #273 ↔ #275 (Experiments ↔ Rules)
```
Appeal Pattern
    │
    ├─ count >= 3
    │
    └─ overturnRate >= 0.6
            │
            ▼
    RuleRefinementQueue
            │
            ├─ Trigger rule update
            │
            └─ Next experiment iteration
```

### #275 ↔ #272 (Rules ↔ Metrics)
```
ModerationDecision
    │
    ├─ Clear violations (type 1)
    │   └─► flagged_posts count
    │
    ├─ Borderline (type 2)
    │   └─► recheck_rate
    │
    └─ Context-dependent (type 3)
        └─► override_rate
```

---

## API Endpoint Hierarchy

```
/api/operator
├── /metrics [272]
│   └── GET (granularity, since, until)
│       → {engagement, diversity, echo_chamber, moderation}
│
├── /dashboard [272]
│   └── GET
│       → {summary, high_conflict, identity_shift, queue, feedback}
│
├── /experiments [273]
│   ├── POST /start
│   ├── POST /:sessionId/end
│   ├── GET /:sessionId/results
│   ├── GET /:sessionId/analysis
│   └── GET (list all)
│
├── /appeals [273]
│   ├── POST /submit
│   ├── GET /pending
│   ├── PATCH /:appealId
│   ├── GET /patterns
│   └── GET /history/:postId
│
├── /rules [273, 275]
│   ├── GET /pending-refinements
│   └── PATCH /:ruleId/refine
│
├── /policies [275]
│   ├── POST /activate
│   ├── DELETE /:policyId
│   ├── GET /active
│   └── GET /history
│
└── /moderation [275]
    ├── /queue
    │   └── GET (minScore, limit)
    │
    ├── /review/:postId
    │   └── PATCH (decision: approve|reject|recheck)
    │
    ├── /escalations [275-2]
    │   └── GET
    │
    └── /decisions/:postId/history [275-3]
        └── GET
```

---

## Moderation Decision State Machine

```
                    ┌─────────────────────┐
                    │   PENDING REVIEW    │
                    └──────────┬──────────┘
                               │
                    ┌──────────┼──────────┐
                    │          │          │
                    ▼          ▼          ▼
        ┌──────────────┐ ┌──────────┐ ┌──────────────┐
        │ APPROVED     │ │RECHECK   │ │REMOVED       │
        │              │ │          │ │              │
        │ (Auto OK)    │ │(Policy X)│ │(Auto reject) │
        └────┬─────────┘ └────┬─────┘ └────┬─────────┘
             │                │            │
             │ [273]          │ [273]       │ [275-2]
             │                │            │
             └────────────────┼────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │  APPEAL SUBMITTED   │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
        ┌──────────────────┐  ┌───────────────────┐
        │ APPEAL APPROVED  │  │ APPEAL REJECTED   │
        │ (Override prev)  │  │ (Uphold decision) │
        └────────┬─────────┘  └───────────────────┘
                 │
                 ▼
        ┌──────────────────┐
        │  RULE REFINED    │ [273-4]
        │ (Update weights) │
        └──────────────────┘
```

---

## Metric Calculation Dependencies

```
RAW DATA
├── Post (content, tags, moderationScore)
├── Interaction (eventType, actorType)
├── Feedback (category, rating)
└── AgentState (mutableAxes, archetype)
    │
    ├─ [272-1] computeEchoChamberIndex()
    │   └─ INPUT: Post.tags, Interaction.eventType
    │   └─ OUTPUT: echo_chamber_score (0-1)
    │
    ├─ [272-2] computeTopicEntropy()
    │   └─ INPUT: Post.tags
    │   └─ OUTPUT: diversity_score (0-1)
    │
    ├─ [272-2] computeAuthorVariance()
    │   └─ INPUT: Post.authorType, timestamp
    │   └─ OUTPUT: variance_score (0-1)
    │
    ├─ [272-4] aggregateByGranularity()
    │   └─ INPUT: metrics + granularity (hourly|daily|weekly)
    │   └─ OUTPUT: time_series_data[]
    │
    └─ [273-3] computeEffectSize()
        └─ INPUT: beforeSnapshot, afterSnapshot
        └─ OUTPUT: effect_size, confidence, significance
```

---

## Cross-Issue Testing Strategy

```
Unit Tests (Isolated)
├─ moderation.test.js [275-1, 275-2]
├─ metrics.test.js [272-1, 272-2]
├─ experiment.test.js [273-1, 273-3]
└─ appeal.test.js [273-2, 273-4]

Integration Tests (Component Level)
├─ operator-workflow.test.js
│   ├─ Post → Moderation → Decision [275]
│   └─ Appeal → Pattern → Rule Refinement [273-4]
│
├─ experiment-workflow.test.js
│   ├─ Create session → Apply policy → End session [273-1]
│   └─ Snapshot → Analysis → Recommendation [273-3]
│
└─ metrics-workflow.test.js
    ├─ Collect → Aggregate → Visualize [272]
    └─ Experiment metrics → Effect size [272-3, 273-3]

E2E Tests (System Level)
├─ moderation-full-cycle.test.js
│   └─ Create → Flag → Review → Appeal → Rule Update
│
├─ policy-experiment-full-cycle.test.js
│   └─ Start → Apply → Monitor → End → Compare → Adopt
│
└─ operator-dashboard-full-cycle.test.js
    └─ Metrics → Trends → Experiment → Results → Decision
```

---

## Risk Mitigation Flows

```
RISK: Self-harm false positive
│
├─ Cause: Overly aggressive pattern matching
├─ Mitigation:
│   ├─ Periodic manual review
│   ├─ Appeal process [273-2]
│   └─ Rule confidence threshold
│
└─ Monitor: GET /api/operator/escalations → analyze false positive rate

RISK: Experiment data contamination
│
├─ Cause: Policy changed mid-experiment
├─ Mitigation:
│   ├─ Track ExperimentSession.status (running|completed|failed)
│   ├─ Warn when policy changes during active experiment
│   └─ Snapshot isolation
│
└─ Monitor: GET /api/operator/experiments → check status transitions

RISK: Echo chamber calculation performance
│
├─ Cause: N² operations on large tag distributions
├─ Mitigation:
│   ├─ Batch calculation (daily, not real-time)
│   ├─ Sampling for large datasets
│   └─ Cache for 1-hour TTL
│
└─ Monitor: Calculation time tracking in metrics aggregation
```
