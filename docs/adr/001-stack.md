# ADR 001: MVP-v1 Stack Baseline

- Status: Accepted
- Date: 2026-03-23
- Related issues: `#95`, `#94`, `#81`

## Context

The repository is no longer only a static fashion-forum mock.

Under the active phase-2 direction, it is becoming an identity-forming forum simulation stack with:

- a social simulation core
- a long-running orchestration loop
- memory and retrieval layers
- a relationship and identity graph
- a forum-facing UI surface
- a company-loop evaluation layer

The stack choice needs to stay aligned with:

- [phase-2-ai-native-forum-direction.md](../product-strategy/phase-2-ai-native-forum-direction.md)
- [ai-forum-world-implementation-plan.md](../project-planning/ai-forum-world-implementation-plan.md)

This ADR records the MVP-v1 baseline, the role of each chosen library or reference, and what is intentionally excluded from the initial stack.

## Decision

The MVP-v1 stack baseline is:

- Concordia as the preferred natural-language world engine reference
- Mesa as the explicit rule and experiment-analysis companion
- LangGraph as the long-running orchestration loop reference
- Mem0 as the durable memory layer reference
- Chroma as the retrieval and candidate-pool vector store
- Neo4j as the relationship and identity graph store
- OASIS as the action-space, recommendation, and social-simulator reference model
- AI Town as the server/UI separation and replay-surface reference model
- React/Vite forum web plus a separate sim-server as the current repository execution baseline

## One-sentence role definition for each chosen piece

- Concordia: the preferred reference for a conversational social-world engine where environment rules and moderator-like interventions stay separate from agent utterances.
- Mesa: the companion framework for explicit threshold rules, repeatable experiments, and measurable identity-update mechanics.
- LangGraph: the reference orchestration layer for stateful round execution across exposure, action, feedback, and identity-update steps.
- Mem0: the durable memory layer for storing summarized experiences, self-narrative changes, and later recallable identity evidence.
- Chroma: the retrieval layer for indexing consumed content, prior forum artifacts, and candidate exposure pools.
- Neo4j: the graph layer for storing affinity, conflict, topic attachment, cluster structure, and other relationship state that vector search alone does not explain well.
- OASIS: the product and simulation reference for action schemas, traces, recommendation surfaces, and social-platform environment modeling.
- AI Town: the reference for separating simulation execution from the visible product surface and for making world state inspectable through a UI.

## Current repository interpretation

The baseline above is an architectural target, not a claim that every dependency is already wired into production code today.

What is already true in the repository after `#94`:

- `apps/forum-web` is the visible seed-world and replay-facing surface
- `apps/sim-server` is the local service baseline for serverful simulation work
- `packages/shared-types` and `packages/agent-core` provide the first shared execution contracts
- GitHub Pages remains a static replay-viewer host rather than a live simulation runtime

What is intentionally deferred to later issues:

- executable Concordia-style world logic
- executable Mesa-style update rules
- real Chroma integration
- real Neo4j synchronization
- real Mem0-backed long-term memory
- full LangGraph-driven round execution

## Rejected or intentionally excluded alternatives

| 대안 | 제외 이유 |
|------|-----------|
| AutoGen | 멀티에이전트 작업 협력에 적합. 장기 실행 소셜 시뮬레이션에는 맞지 않음 |
| CrewAI | 워크플로우 협력 패턴은 company loop에 유용하나, 포럼 사회 실행 코어로는 부적합 |
| CAMEL (core engine) | company loop 평가팀 패턴으로 활용하는 것이 더 적합. 메인 world engine으로는 제외 |
| Prompt-only identity | 명시적 규칙, 임계값, 모순 처리, 반복 실험 분석이 필요하므로 제외 |
| Vector-only memory | 친밀도/갈등/클러스터 형성은 구조적 관계 쿼리가 필요. 임베딩만으로는 표현 불충분 |
| Graph-only retrieval | 콘텐츠 유사도, 이전 포스트 재호출, 이종 콘텐츠 후보 생성에 벡터 레이어도 필요 |
| GitHub Pages (live host) | 정적 호스팅만 지원. 시뮬레이션 루프/큐/그래프 싱크는 서버 런타임 필요 |
| Next.js (즉시 도입) | 기존 React/Vite 표면이 있고, forum-web/sim-server 분리가 더 낮은 위험 경로 |

## Consequences

Positive consequences:

- the repository now has a stable architectural vocabulary for later implementation issues
- future issues can target one layer at a time without reopening stack-selection debates
- the team can distinguish between reference architecture and already-shipped runtime pieces

Tradeoffs:

- the baseline is intentionally hybrid and not a single-framework story
- several chosen components remain target integrations rather than current runtime dependencies
- later issues must preserve the separation between static replay hosting and live simulation execution

## Follow-up issues

- `#96` Define base schemas for agent state, content state, and social graph
- `#97` Implement tick engine, world-rule layer, and deterministic replay foundation
- `#98` Design content-provider interface and normalization pipeline
- `#99` Implement content indexing, Chroma collections, candidate generation, and biased exposure selection
- `#100` Implement short-term memory, long-term memory integration, and self-narrative storage
- `#106` Implement Neo4j sync and simulation event-log storage
- `#114` Design the sim-server API and background job queue
