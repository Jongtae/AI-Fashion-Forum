# 이슈 #272, #273, #275 심화 분석 보고서

**분석 날짜**: 2026-03-28
**상태**: 모두 CLOSED (부분 구현)
**전체 구현도**: 약 45-50%

---

## 개요

이 세 이슈는 "커뮤니티 규칙 및 자정 정책 설계" 에픽(#263)의 핵심 구성 요소로, 모두 깊이 있는 분석과 부분적 구현 상태입니다.

| 이슈 | 제목 | 구현도 | 핵심 미흡점 |
|------|------|--------|-----------|
| **#272** | 운영자 대시보드와 개입 효과 metric 설계 | ~40% | Echo chamber 지수, 다양성 메트릭, 시계열 추이 데이터 |
| **#273** | 운영 정책 실험 및 피드백 루프 | ~45% | 실험 세션 라이프사이클, 통계 분석, Appeal workflow |
| **#275** | 모더레이션 정책과 플래그 처리 규칙 | ~55% | Decision type 자동 분류, Self-harm escalation, Context-aware override |

---

## 이슈별 상세 분석

### #272: 운영자 대시보드와 개입 효과 metric 설계

**현재 상태**:
- ✅ 기본 메트릭 수집: totalPosts, totalComments, totalUsers, likes, flaggedPosts, pendingReports
- ✅ 대시보드 엔드포인트 존재: GET /api/operator/dashboard (5개 섹션)
- ✅ Identity shift agents 추적 (mutableAxes 변화도)
- ✅ Feedback 요약 (7일 집계)

**부분 구현 항목** (4개):

| 항목 | 현황 | 미흡점 |
|------|------|--------|
| **Engagement metrics** | 기본 수치만 | ❌ 시간별 추이, 사용자별 분화, 참여도 변화율 |
| **Diversity metrics** | Tag Top 10만 | ❌ Topic entropy, author variance, content type distribution |
| **Echo chamber index** | 완전 미구현 | ❌ 0-1 점수, 콘텐츠 폐쇄도 계산 |
| **Policy experiment tracking** | Meta-policy 함수만 | ❌ 실험 세션 모델, before/after 스냅샷, 비교 API |

**미구현 항목** (7개):
- Time-series metrics (hourly/daily/weekly 그룹화)
- PolicyChange 모델 (정책 변경 이력)
- Comparative metrics API (정책 A vs B)
- KPI threshold alerts
- Appeal handling metrics
- Statistical significance testing

**4개 Subtask**:
1. Echo chamber index 계산 알고리즘 (medium)
2. Diversity metrics 구현 (medium)
3. Policy experiment infrastructure (large)
4. 시계열 데이터 및 trending (medium)

---

### #273: 운영 정책 실험 및 피드백 루프 구축

**현재 상태**:
- ✅ Feedback 모델 완성 (category, rating, message, status)
- ✅ GET /api/operator/feedback - 목록 조회
- ✅ GET /api/operator/feedback/summary - 카테고리별 집계
- ✅ applyModerationPolicies() 함수 (meta-policy.js)
- ✅ Policy flags: baseline, dampen_aggression, hide_aggression

**부분 구현 항목** (4개):

| 항목 | 현황 | 미흡점 |
|------|------|--------|
| **정책 변경 전후 비교** | 함수 레벨만 | ❌ 시스템 레벨 비교 워크플로우, A/B 테스트 그룹 분리 |
| **사용자 피드백** | Feedback 모델만 | ❌ moderation_appeal 카테고리, policy change 피드백 수집 |
| **실험 결과 정리** | 상태 조회만 | ❌ 자동 해석, 통계 분석, 다음 정책 추천 |
| **재검토 대상 관리** | Report 상태만 | ❌ Appeal workflow, 패턴 분석, 규칙 개선 트리거 |

**미구현 항목** (10개):
- ExperimentSession 모델
- PolicyChange 모델
- A/B 그룹 할당
- Effect size, confidence interval 계산
- Policy effectiveness scoring
- Appeal process workflow
- Pattern-based rule refinement
- Policy change 자동 로깅
- 실패 개입 자동 플래깅
- 실험 결과 리포트 생성

**4개 Subtask**:
1. 정책 실험 세션 라이프사이클 (large)
2. Feedback 카테고리 확장 및 appeal workflow (medium)
3. 실험 결과 통계 분석 (large)
4. Appeal pattern analysis 및 규칙 개선 (medium)

---

### #275: 모더레이션 정책과 플래그 처리 규칙 정의

**현재 상태**:
- ✅ CATEGORY_RULES 정의 (5개: harassment, hate, sexual, scam, self_harm)
- ✅ scoreModerationText() - 자동 평가 함수
- ✅ buildModerationState() - 상태 반영
- ✅ moderationStatus enum: approved, flagged, removed
- ✅ POST /api/moderation/filter - 실시간 필터링
- ✅ PATCH /api/operator/moderation/review/:postId - 검토 결정
- ✅ Tests (moderation.test.js) - 카테고리별 정확도 검증

**부분 구현 항목** (4개):

| 항목 | 현황 | 미흡점 |
|------|------|--------|
| **Flag 기준 & escalation** | 문서만 있음 | ❌ Self-harm auto escalation (코드), Multiple category priority, Repeated posts tracking |
| **Decision flow** | 기본 흐름만 | ❌ Type 1 (clear, ≥0.65) 자동 거부, Type 2 (borderline) recheck, Type 3 context-aware |
| **위반 유형별 개입** | 문서만 있음 | ❌ 자동 분류, Type별 처리, Author feedback 생성, Decision audit log |
| **정책 충돌 & 예외** | 원칙만 있음 | ❌ Self-harm priority 코드 레벨, Context override, Emergency policy 통합 |

**미구현 항목** (11개):
- Self-harm automatic escalation + notification
- Score >= 0.65 자동 거부
- Decision type 자동 분류 (Type 1/2/3)
- Post.moderationDecisionType 필드
- Author nudge/feedback 자동 생성
- Context-aware override
- Decision audit log 상세화
- Appeal process 통합
- Emergency policy 트리거
- KPI monitoring (flag rate 0.05-0.15)
- Rule version management

**4개 Subtask**:
1. Decision type 자동 분류 및 처리 (medium)
2. Self-harm escalation 및 긴급 알림 (medium)
3. Decision audit log 및 appeal integration (medium)
4. Emergency policy 통합 및 operator 컨트롤 (medium)

---

## 교차 분석

### 의존성 체인
```
#272 (Metrics)
  ↓
#273 (Experiments) ← [Metrics를 experiment 전후로 비교]
  ↓
#275 (Rules) ← [Appeal workflow가 규칙 개선을 트리거]
```

### 통합 지점

| 통합점 | #272 | #273 | #275 |
|--------|------|------|------|
| **Policy experiment tracking** | Session model | Lifecycle & analysis | Emergency activation |
| **Appeal workflow** | - | Submission & analysis | Decision audit trail |
| **Dashboard metrics** | Diversity & echo | Experiment results | Decision distribution |

### 필요한 신규 모델 (5개)

| 모델 | 필드 | 관련 이슈 |
|------|------|----------|
| **ExperimentSession** | sessionId, policyFlag, startedAt, endedAt, beforeSnapshot, afterSnapshot | #272, #273 |
| **PolicyChange** | policyChangeId, sessionId, policyFlag, appliedAt, agents | #272, #273 |
| **ModerationDecision** | postId, decision, decidedBy, decidedAt, reason, appealId | #273, #275 |
| **RuleRefinementQueue** | ruleId, appealCount, overturnRate, topReasons | #273 |
| **ActivePolicy** | policyFlag, activatedAt, reason, targetAgents, expiresAt | #275 |

### 기존 모델 확장 필요

**Post**:
- ➕ moderationDecisionType: enum [clear_violation, borderline, context_dependent]
- ➕ escalated: boolean (self-harm)
- ➕ appealed: boolean

**Feedback**:
- ➕ category enum에 "moderation_appeal" 추가

---

## 구현 순서 추천

### Phase 1: Foundation (Week 1-2)
**Task**: 275-1, 275-2
**이유**: Decision classification과 self-harm escalation은 기존 moderation.js 기반이므로 가장 빨리 구현 가능

### Phase 2: Experiment Infrastructure (Week 2-3)
**Task**: 272-3, 273-1 (병렬)
**이유**: ExperimentSession, PolicyChange 모델 구현. 이후 단계의 기초

### Phase 3: Metrics & Analysis (Week 3-4)
**Task**: 272-1, 272-2, 273-3 (병렬)
**이유**: Echo chamber, diversity, statistical analysis. 실험 결과 해석 필수

### Phase 4: Appeal & Feedback Loop (Week 4-5)
**Task**: 273-2, 273-4, 275-3
**이유**: Appeal workflow와 decision audit. 규칙 개선과 연결

### Phase 5: Polish & Integration (Week 5-6)
**Task**: 272-4, 275-4
**이유**: 시계열 데이터, emergency policy. 최종 통합

---

## 리스크 평가

| 리스크 | 심각도 | 완화 방안 |
|--------|--------|----------|
| Decision auto-reject vs operator review 충돌 | **중간** | Optional flag로 제공, default는 operator 검토 |
| Self-harm escalation false positive | **높음** | 정기 검수, appeal process, 규칙 강화 |
| 실험 중 정책 변경 시 데이터 오염 | **중간** | ExperimentSession.status로 running 추적 |
| Echo chamber 계산 성능 (대규모) | **중간** | 캐싱, 배치 계산, sample 기반 실시간 계산 |
| Appeal rate 급증 | **중간** | 자동 분류, 우선순위 지정, threshold 설정 |

---

## 테스트 전략

### Unit Tests
- scoreModerationText() 카테고리별 정확도
- classifyDecisionType() score range별 분류
- computeEchoChamberIndex() 다양한 분포
- Appeal pattern detection

### Integration Tests
- Post creation → auto evaluation → flagged
- Operator review → decision record → audit log
- Experiment session → metrics → analysis
- Appeal → pattern detection → rule trigger

### E2E Tests
- 전체 moderation workflow (create → flag → review → appeal)
- 정책 실험 full lifecycle
- Emergency policy activation flow

---

## 문서화 필요 사항

1. **Flag 기준 & 점수 계산** - moderation-rules-and-policies.md 최신화
2. **Decision type 분류** - Type 1/2/3 상세 기준
3. **Appeal process** - 워크플로우 다이어그램
4. **Experiment lifecycle** - 실험 세션 다이어그램
5. **Echo chamber index** - 수학적 설명
6. **Statistical methods** - Effect size, CI 계산
7. **Emergency policy** - 활성화 기준 및 모니터링

---

## 주요 발견

### 강점
1. **기초 구조 탄탄**: moderation.js, operator.js 기본 API 존재
2. **모델 설계 양호**: Post, Feedback, Interaction, AgentState 잘 정의됨
3. **문서화 우수**: 정책 문서가 명확하게 작성됨
4. **테스트 기반**: moderation 테스트 케이스 충실

### 약점
1. **시스템 레벨 통합 부족**: 함수 레벨은 있으나, full lifecycle 미흡
2. **데이터 모델 미완성**: ExperimentSession, ModerationDecision 등 5개 모델 부재
3. **자동화 부족**: Decision type 분류, self-harm escalation, pattern analysis 등 자동화 미흡
4. **통계 분석 영역 공백**: Effect size, significance testing, confidence interval 전무

---

## 권장 즉시 조치

### High Priority (Week 1-2)
1. **Post 모델 확장**: moderationDecisionType, escalated 필드 추가
2. **Decision type 분류**: 275-1 구현 (3개 타입 자동 분류)
3. **Self-harm escalation**: 275-2 구현 (긴급 처리)

### Medium Priority (Week 2-3)
4. **ExperimentSession 모델**: 272-3, 273-1 (experiment infrastructure)
5. **Feedback 확장**: 273-2 (moderation_appeal 카테고리)

### Lower Priority (Week 3+)
6. **통계 분석**: 273-3
7. **메트릭 고도화**: 272-1, 272-2
8. **Appeal 자동화**: 273-4

---

## 결론

세 이슈는 operator bundle의 핵심으로, 현재 45-50% 구현 상태입니다. **기초 구조는 탄탄하나, 시스템 레벨 통합과 자동화가 부족**합니다.

가장 효율적인 구현 경로는:
1. Decision type 분류 (275-1) → foundation
2. Experiment infrastructure (272-3, 273-1) → middle
3. Metrics & analysis (272-1, 272-2, 273-3) → capstone
4. Appeal automation (273-2, 273-4) → polish

총 **약 4-6주 개발 작업**이 필요하며, 팀 역량에 따라 조정 가능합니다.
