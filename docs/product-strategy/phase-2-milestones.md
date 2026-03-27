# Phase 2 Milestones

Phase 2 범위를 검증 가능한 3개 마일스톤으로 재절단한 실행 계획입니다.
참조 이슈: #237

## 배경

Phase 2가 OASIS 확장, digital-twin, CAMEL Workforce intervention loop까지 연결된 넓은 범위입니다.
방향은 [`phase-2-ai-native-forum-direction.md`](./phase-2-ai-native-forum-direction.md)에 유지하되,
진전을 측정 가능한 단위로 재절단합니다.

---

## M2-1: Replay 가능한 single-thread loop

### 목표

1개 에이전트가 시드부터 포스트 생성까지 한 번 돌고, 결과를 replay export로 저장하는 최소 루프를 확정합니다.

### 입력

- agent seed (SAMPLE_STATE_SNAPSHOT 에서 1개 에이전트)
- content starter pack (Sprint 1 기준)
- 결정론적 seed 값 (예: `seed=42`)

### 출력

- 생성된 포스트 1개 이상 (forum-server에 저장)
- replay export JSON 파일
- 평가 지표 최소셋 콘솔 또는 파일 출력

### 완료 기준

- [ ] `POST /api/agent-loop/run` 단일 엔드포인트로 전체 루프 실행 가능
- [ ] 동일 seed로 재실행 시 포스트 내용과 지표가 결정론적으로 재현됨
- [ ] replay export JSON 파일이 `dist/replay/` 또는 설정된 경로에 저장됨
- [ ] 평가 지표 최소 5개가 응답 또는 파일로 출력됨

### 범위 외

- 다수 에이전트 간 상호작용
- feed ranking 반영 (단순 직접 post)
- operator review 단계

---

## M2-2: Multi-agent feed bias loop

### 목표

여러 에이전트 간 exposure 편향 실험을 실행하고, 지표 차이를 측정할 수 있게 합니다.

### 입력

- agent seed (복수 에이전트, 서로 다른 archetype)
- 편향 조건 변수 (예: `bias_strength=high|low`)
- 동일 content pool

### 출력

- 에이전트별 exposure 분포 기록
- echo chamber index (동일 주제 재강화 비율)
- 편향 조건 차이에 따른 지표 비교 리포트

### 완료 기준

- [ ] 동일 seed / 서로 다른 bias 조건으로 두 번 실행 시 echo chamber index 차이가 측정됨
- [ ] exposure 분포가 에이전트 archetype별로 다르게 나타남을 수치로 확인 가능
- [ ] 리포트 파일에 조건 비교 결과가 저장됨

### 선행 조건

- M2-1 완료

---

## M2-3: Operator intervention loop

### 목표

operator가 flag한 항목이 다음 라운드 에이전트 행동에 영향을 주는 루프를 완성합니다.

### 입력

- operator flag 데이터 (moderation queue에서)
- 다음 라운드 실험 설정

### 출력

- operator 피드백이 다음 시뮬레이션 입력(meta-policy 파라미터 등)에 반영됨
- 라운드 간 행동 변화 추적 리포트

### 완료 기준

- [ ] operator가 flag한 항목에 승인/거부/재검토 피드백을 남길 수 있는 최소 인터페이스 존재
- [ ] 피드백 데이터가 다음 루프 실행 시 meta-policy 입력으로 반영됨
- [ ] 피드백 적용 전후 에이전트 행동 변화가 지표로 확인 가능

### 선행 조건

- M2-1, M2-2 완료
- camel-workforce-studio 연동 (선택적)

---

## 현재 구현 상태 대비 M2-1 Gap

| 단계 | 현황 |
|------|------|
| agent seed | SAMPLE_STATE_SNAPSHOT에 6개 에이전트 정의 완료 |
| biased exposure | `selectBiasedExposure()` 구현 완료 |
| memory write-back | `rememberSprint1Reaction()` 구현 완료 |
| post generation | `createSprint1ForumPostSample()` 구현 완료 |
| feed/ranking | 미연결 (agent-loop에서 바로 post) |
| operator review | 미구현 |
| replay export | ActionTrace DB 저장만, JSON export 엔드포인트 없음 |
| evaluation metrics | `createEvaluationSample()` 독립 실행만, 루프 연결 없음 |
| 단일 실행 진입점 | 없음 — 각 단계가 개별 엔드포인트로만 존재 |

Gap 요약: 각 단계 모듈은 존재하지만 **한 루프로 묶는 orchestration layer**가 없습니다.
M2-1의 핵심 작업은 `POST /api/agent-loop/run` 엔드포인트를 통해 이 단계들을 순서대로 실행하는 것입니다.
