# Docs Overview

AI Fashion Forum 프로젝트 문서 인덱스입니다.

---

## start-here/ — 입문용 안내
처음 읽는 사람이 프로젝트 전체를 빠르게 이해하기 위한 문서.

| 파일 | 내용 |
|------|------|
| [project-guide.md](project-guide.md) | 처음 보는 사람용 프로젝트 전체 안내 |

---

## product-strategy/ — 제품 방향
핵심 비전과 현재 상태를 다루는 최상위 문서.

| 파일 | 내용 |
|------|------|
| [simulation-intent-guardrails.md](product-strategy/simulation-intent-guardrails.md) | 의도 고정 가드레일 |
| [product-identity.md](product-strategy/product-identity.md) | 프로젝트 정체성 정의 |
| [phase-2-ai-native-forum-direction.md](product-strategy/phase-2-ai-native-forum-direction.md) | Phase 2 방향 요약 |
| [current-product-state.md](product-strategy/current-product-state.md) | 현재 상태 및 진행 단계 |
| [ui-ux-consumption-identity-loop.md](product-strategy/ui-ux-consumption-identity-loop.md) | 소비-반응-정체성 UI/UX 방향 |

---

## sprint1/ — Sprint 1 구현
정체성 루프(Identity Loop) 첫 수직 슬라이스 구현 사양.

| 파일 | 내용 |
|------|------|
| [sprint1-agent-seed-schema.md](sprint1/sprint1-agent-seed-schema.md) | 에이전트 상태 계약 (Issue #140) |
| [sprint1-content-starter-pack.md](sprint1/sprint1-content-starter-pack.md) | 시드 콘텐츠 팩 (Issue #141) |
| [sprint1-biased-exposure-loop.md](sprint1/sprint1-biased-exposure-loop.md) | 편향 노출 루프 (Issue #142) |
| [sprint1-memory-writeback.md](sprint1/sprint1-memory-writeback.md) | 메모리 writeback (Issue #143) |
| [sprint1-state-driven-posts.md](sprint1/sprint1-state-driven-posts.md) | 상태 기반 포스트 생성 (Issue #144) |
| [sprint1-replay-drift-ui.md](sprint1/sprint1-replay-drift-ui.md) | Replay Drift UI (Issue #145) |
| [sprint1-divergence-evaluation.md](sprint1/sprint1-divergence-evaluation.md) | 발산도 평가 (Issue #146) |

---

## core-systems/ — 핵심 시스템
시뮬레이션 레이어별 구현 사양 (MVP Issue #96–#115).

| 파일 | 내용 |
|------|------|
| [action-space-and-light-reactions.md](core-systems/action-space-and-light-reactions.md) | 행동 스키마 (silence/lurk/react/post) |
| [content-provider-normalization.md](core-systems/content-provider-normalization.md) | 콘텐츠 수집 계약 |
| [chroma-indexing-and-biased-exposure.md](core-systems/chroma-indexing-and-biased-exposure.md) | Chroma 인덱싱 + 편향 노출 |
| [identity-update-rules.md](core-systems/identity-update-rules.md) | 정체성 변화 규칙 |
| [forum-generation-and-relationship-updates.md](core-systems/forum-generation-and-relationship-updates.md) | 포스트 생성 + 관계 업데이트 |
| [ranking-core-and-experiment-flags.md](core-systems/ranking-core-and-experiment-flags.md) | 피드 랭킹 + 실험 플래그 |
| [meta-policy-and-events.md](core-systems/meta-policy-and-events.md) | 포럼 메타 정책 |
| [graph-sync-and-event-log.md](core-systems/graph-sync-and-event-log.md) | Neo4j 싱크 + 이벤트 로그 |
| [retrieval-and-decision-debug-console.md](core-systems/retrieval-and-decision-debug-console.md) | 디버그 콘솔 + 결정 설명 |
| [core-metrics-and-consistency.md](core-systems/core-metrics-and-consistency.md) | 핵심 평가 지표 |
| [social-dynamics-and-batch-runner.md](core-systems/social-dynamics-and-batch-runner.md) | 배치 실험 러너 |
| [sim-server-api-and-queue.md](core-systems/sim-server-api-and-queue.md) | 서버 API + Job Queue |
| [staging-guardrails-cost-and-demo.md](core-systems/staging-guardrails-cost-and-demo.md) | 데모 패키징 + 비용 가드레일 |

---

## agent-core/ — action/state backend contracts
agent loop, action-state contract, backend 연결 초안 문서.

| 파일 | 내용 |
|------|------|
| [action-trigger-state-transition.md](agent-core/action-trigger-state-transition.md) | 행동 선택과 상태 전이 규정 |
| [action-state-contract.md](agent-core/action-state-contract.md) | action-state contract와 memory writeback 경로 |
| [agent-action-loop-backend-outline.md](agent-core/agent-action-loop-backend-outline.md) | Sprint 1 기준 agent action loop backend 설계 초안 |
| [state-transition-exception-rules.md](agent-core/state-transition-exception-rules.md) | 상태 전이 규칙과 예외 처리 기준 |
| [backend-artifact-schema.md](agent-core/backend-artifact-schema.md) | trace/snapshot/event/forum artifact schema 정의 |

---

## data-architecture/ — 데이터 & 스키마
상태 모델, 메모리 스택, 콘텐츠 정합성 정의.

| 파일 | 내용 |
|------|------|
| [neo4j-state-model.md](data-architecture/neo4j-state-model.md) | Neo4j 그래프 스키마 |
| [memory-and-self-narrative.md](data-architecture/memory-and-self-narrative.md) | 메모리 스택 + 자기서사 |
| [content-image-alignment-data-model.md](data-architecture/content-image-alignment-data-model.md) | 콘텐츠-이미지 정합성 모델 |

---

## seed-world-policy/ — 시드월드 정책
시드월드 콘텐츠 품질과 이미지 소싱 가이드라인.

| 파일 | 내용 |
|------|------|
| [generated-image-policy.md](seed-world-policy/generated-image-policy.md) | 생성 이미지 사용 기준 |
| [korean-ugc-outfit-shot-guidance.md](seed-world-policy/korean-ugc-outfit-shot-guidance.md) | 한국식 UGC 의상 촬영 가이드 |
| [product-image-binding-layout-rules.md](seed-world-policy/product-image-binding-layout-rules.md) | 제품 이미지 바인딩 규칙 |
| [product-mention-card-policy.md](seed-world-policy/product-mention-card-policy.md) | 제품 언급 카드 정책 |
| [real-photo-preferred-pet-lifestyle-strategy.md](seed-world-policy/real-photo-preferred-pet-lifestyle-strategy.md) | 펫 라이프스타일 소싱 전략 |
| [image-crawling-workflow.md](seed-world-policy/image-crawling-workflow.md) | 이미지 크롤링 워크플로우 |

---

## governance-workflow/ — 팀 프로세스
이슈 관리, 회의 핸드오프, 리뷰 기준.

| 파일 | 내용 |
|------|------|
| [github-issue-workflow.md](governance-workflow/github-issue-workflow.md) | GitHub 이슈 워크플로우 |
| [meeting-handoff-workflow.md](governance-workflow/meeting-handoff-workflow.md) | 회의 핸드오프 프로세스 |
| [meeting-handoff-template.md](governance-workflow/meeting-handoff-template.md) | 핸드오프 템플릿 |
| [review-checklist.md](governance-workflow/review-checklist.md) | 리뷰 체크리스트 |

---

## project-planning/ — 프로젝트 계획
백로그와 구현 로드맵.

| 파일 | 내용 |
|------|------|
| [ai-forum-world-implementation-plan.md](project-planning/ai-forum-world-implementation-plan.md) | 전체 구현 계획 (한/영) |
| [mvp-v1-project-backlog.md](project-planning/mvp-v1-project-backlog.md) | MVP v1 백로그 (10 epic / 20 issue) |

---

## adr/ — Architecture Decision Records
기술 스택 선택 근거.

| 파일 | 내용 |
|------|------|
| [001-stack.md](adr/001-stack.md) | MVP-v1 스택 기준 (2026-03-23) |

---

## meeting-handoffs/ — 회의 기록
과거 의사결정 히스토리. 삭제하지 않고 맥락과 회귀 방지 가드로 보존. 전체 목록은 [README](meeting-handoffs/README.md) 참조.

| 파일 | 내용 | 상태 |
|------|------|------|
| [identity-formation-agent-pivot-round1-meeting-handoff.md](meeting-handoffs/identity-formation-agent-pivot-round1-meeting-handoff.md) | mock → AI 네이티브 피벗 결정 | 히스토리 |
| [lifestyle-pet-expansion-meeting-handoff.md](meeting-handoffs/lifestyle-pet-expansion-meeting-handoff.md) | 시드월드 확장 결정 | 활성 |
| [local-export-replay-viewer-meeting-handoff.md](meeting-handoffs/local-export-replay-viewer-meeting-handoff.md) | GitHub Pages 배포 모델 결정 | 활성 |
| [seed-world-ui-historical-lessons.md](meeting-handoffs/seed-world-ui-historical-lessons.md) | Outfit preview / fallback UI 교훈 (3개 통합) | 히스토리 |

---

## archive/ — 아카이브
더 이상 유효하지 않은 문서. 참고용으로만 보존.

| 파일 | 내용 |
|------|------|
| [openai-outfit-preview-feasibility-poc.md](archive/openai-outfit-preview-feasibility-poc.md) | 의상 미리보기 PoC (구식) |
| [Step-by-Step Implementation Plan...pdf](archive/) | 초기 Phase 2 계획 PDF (구식) |
