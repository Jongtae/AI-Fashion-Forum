# Sprint 1: Identity-Loop Vertical Slice

7개의 이슈로 구성된 하나의 연속 루프. 에이전트가 콘텐츠를 보고, 반응하고, 기억하고, 포스트를 쓰고, 발산하는 전 과정을 구현.

```
1. Agent Seed Schema (#140)     — 에이전트 상태 계약 정의
   ↓
2. Content Starter Pack (#141)  — 외부 입력 콘텐츠 정의
   ↓
3. Biased Exposure Loop (#142)  — 에이전트가 콘텐츠를 선택·해석
   ↓
4. Memory Write-Back (#143)     — 반응이 메모리로 저장됨
   ↓
5. State-Driven Posts (#144)    — 메모리 변화가 포럼 포스트로 출력됨
   ↓
6. Replay Drift UI (#145)       — 루프 결과를 시각화
   ↓
7. Divergence Evaluation (#146) — 발산이 비무작위·추적 가능한지 검증
```

각 문서는 이전 단계를 이해한다고 가정하고 작성되었습니다.

## 파일 목록

| 파일 | 이슈 | 내용 |
|------|------|------|
| [sprint1-agent-seed-schema.md](./sprint1-agent-seed-schema.md) | #140 | 에이전트 상태 계약 |
| [sprint1-content-starter-pack.md](./sprint1-content-starter-pack.md) | #141 | 시드 콘텐츠 팩 |
| [sprint1-biased-exposure-loop.md](./sprint1-biased-exposure-loop.md) | #142 | 편향 노출 루프 |
| [sprint1-memory-writeback.md](./sprint1-memory-writeback.md) | #143 | 메모리 writeback |
| [sprint1-state-driven-posts.md](./sprint1-state-driven-posts.md) | #144 | 상태 기반 포스트 생성 |
| [sprint1-replay-drift-ui.md](./sprint1-replay-drift-ui.md) | #145 | Replay Drift UI |
| [sprint1-divergence-evaluation.md](./sprint1-divergence-evaluation.md) | #146 | 발산도 평가 |
