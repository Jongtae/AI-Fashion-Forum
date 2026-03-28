# 커뮤니티 규칙 및 모더레이션 정책

## 개요
이 문서는 콘텐츠 검토 기준, 플래그 룰, 에스컬레이션 조건, 그리고 운영 개입 절차를 정의합니다.

## 1. 플래그 기준 및 카테고리

### Flag Categories & Weights
| 카테고리 | Weight | 예시 용어 | Severity |
|---------|--------|---------|----------|
| **harassment** | 0.38 | stupid, idiot, trash, 멍청, 꺼져 | 중간 |
| **hate** | 0.42 | slur, vermin, 혐오, 열등 | 높음 |
| **sexual** | 0.36 | nude, explicit, 야동, 노출 | 중간 |
| **scam** | 0.28 | crypto giveaway, 투자금, 사기 | 낮음 |
| **self_harm** | 0.45 | self harm, 자해, 극단적 선택 | 최고 |

### Scoring Algorithm
```
Score = Σ(rule.weight + intensity_boost)
       + uppercase_ratio * 0.35
       + exclamation_ratio * 0.6

Label: "review" if score >= 0.45, else "safe"
Flag: shouldFlag = (score >= 0.45)
```

## 2. 모더레이션 Decision Flow

```
Post Created
  ↓
scoreModerationText() — 자동 평가
  ├─ score ≥ 0.45 → moderationStatus = "flagged"
  └─ score < 0.45 → moderationStatus = "approved"
  ↓
Operator Review Queue
  ├─ PATCH /api/operator/moderation/review/:postId
  │   ├─ approve → moderationStatus = "approved"
  │   ├─ reject  → moderationStatus = "removed"
  │   └─ recheck → re-evaluate with latest rules
  └─ Interaction 로그 기록
```

## 3. 에스컬레이션 조건

### Automatic Escalation
- **self_harm (category weight 0.45)**: 즉시 "removed" + operator 알림
- **Multiple matched categories**: dominantCategories.length ≥ 2 → 우선 검토
- **Repeated flagged posts by same user**: reportCount ≥ 3 → identity shift 추적

### Manual Escalation
- User reports: GET /api/operator/reports → status = "pending"
- Report approval: PATCH /api/operator/reports/:reportId → status = "reviewed" 
  → Post automatically set to "removed"

## 4. 규칙 위반 유형별 운영 개입

### Type 1: 명확한 위반 (Clear Violation)
- **Indicators**: score ≥ 0.65, single high-weight category
- **Action**: reject (remove post immediately)
- **Notification**: Author feedback, Community guidelines link

### Type 2: 경계 사례 (Borderline)
- **Indicators**: 0.45 ≤ score < 0.65, ambiguous context
- **Action**: recheck (apply moderation policy experiment)
- **Feedback**: Context-aware nudge to author

### Type 3: 콘텍스트 기반 (Context-Dependent)
- **Indicators**: score ≥ 0.45 but educational/satirical intent
- **Action**: approve with note, or add warning label
- **Feedback**: Operator decision override + reasoning

## 5. 정책 충돌 및 예외 처리

### Conflict Resolution Principles
1. **self_harm always escalates** - 다른 규칙보다 우선
2. **Community context matters** - 동일 용어도 콘텍스트에 따라 다름
3. **Operator override authority** - recheck + manual decision이 최종 판정

### Exception Handling
- **Appeal Process**: User can request review_appeal (Feedback.category = "moderation_appeal")
- **Pattern Analysis**: 3+ appeals on same decision → rule refinement 신청
- **Emergency Policies**: Meta-policy flags (dampen_aggression, hide_aggression) 적용 가능

## 6. 모니터링 및 효과 측정

### KPIs
- **Flag Rate**: flaggedCount / totalPosts (target: 0.05 - 0.15)
- **Appeal Rate**: appeals / removed_posts (monitor for bias)
- **Override Rate**: operator_approvals / flagged_posts (rule accuracy check)

### Dashboard Metrics
- GET /api/operator/dashboard → moderation_queue (top 10 flagged)
- GET /api/operator/metrics → moderation.flaggedPosts, pendingReports
- Feedback summary by category (avg rating per moderation decision type)

## 7. 현재 구현 상태

### ✅ 완성
- CATEGORY_RULES 정의 및 점수 계산
- scoreModerationText() 자동 평가
- buildModerationState() 상태 반영
- POST /api/moderation/filter - 실시간 필터링
- GET /api/operator/moderation/queue - 큐 조회
- PATCH /api/operator/moderation/review/:postId - 운영자 결정

### 📋 향후 개선 필요
- Policy experiment framework 통합 (dampen/hide aggression 정책 검증)
- Appeal 프로세스 자동화 (Feedback 카테고리 확장)
- Rule version management (A/B 테스트 용도)
- Language-specific rule sets (영어/한국어 분리)

## API Reference

### POST /api/moderation/filter
```bash
curl -X POST http://localhost:4318/api/moderation/filter \
  -H "Content-Type: application/json" \
  -d '{
    "content": "This is dangerous content",
    "tags": ["hate"]
  }'
```

Response:
```json
{
  "allowed": false,
  "score": 0.65,
  "label": "review",
  "reasons": ["hate:slur"],
  "categories": ["hate"],
  "modelVersion": "prototype-v1"
}
```

### GET /api/operator/moderation/queue
```bash
curl http://localhost:4318/api/operator/moderation/queue?minScore=0.45&limit=50
```

Response: 플래그된 포스트 목록 (moderationScore 내림차순)

### PATCH /api/operator/moderation/review/:postId
```bash
curl -X PATCH http://localhost:4318/api/operator/moderation/review/xxx \
  -H "Content-Type: application/json" \
  -d '{"decision": "approve", "reason": "Context is educational"}'
```
