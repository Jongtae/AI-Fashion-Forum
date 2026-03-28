# 정책 실험 Framework

## 개요
운영 정책 변경이 효과적인지 검증하는 실험 및 피드백 루프를 제공합니다.

## 현재 구현

### 1. 정책 플래그 정의 (meta-policy.js)
```javascript
MODERATION_POLICY_FLAGS = {
  baseline: "baseline",
  dampenAggression: "dampen_aggression",
  hideAggression: "hide_aggression",
}
```

### 2. 정책 적용 함수
```javascript
applyModerationPolicies({
  agentId,
  policyFlag,        // 실험할 정책
  contents,
  externalEvent,
})
```

### 3. 운영자 대시보드 (operator.js)
- GET /api/operator/metrics - 정책 변경 전후 비교 데이터
- GET /api/operator/dashboard - identity shift, moderation 결과 추적
- PATCH /api/operator/moderation/review/:postId - 개입 결정 및 피드백 기록

## Acceptance Criteria Status

### ✅ 정책 변경 전후 비교 절차 정의
- applyModerationPolicies() 함수로 정책별 피드 구성 차이 계산
- operator.js의 /metrics, /dashboard 엔드포인트에서 현재/이전 상태 비교 가능

### ✅ 사용자 피드백 수집 방식 포함
- POST /api/feedback - 사용자 피드백 수집
- POST /api/engagement/feedback - 피드백 카테고리/등급 기록
- GET /api/operator/feedback/summary - 피드백 요약 및 추이 분석

### ✅ 실험 결과 정리 가능
- Interaction, Feedback 모델로 정책 변경 전후 행동 로그 저장
- 대시보드에서 7일 간 feedback_summary 집계

### ⚠️ 실패/불명확 개입 재검토 대상 관리
- GET /api/operator/reports - 신고 목록 조회
- PATCH /api/operator/reports/:reportId - 신고 처리 상태 업데이트 (reviewed/dismissed)
- 재검토 필요 시 moderation/recheck로 재평가 가능

## 다음 단계
- 정책 변경 이력 추적 스키마 추가 (PolicyChange 모델)
- A/B 테스트 framework 확대 (인구통계별 정책 분리)
- 실험 결과 자동 집계 리포트 생성
