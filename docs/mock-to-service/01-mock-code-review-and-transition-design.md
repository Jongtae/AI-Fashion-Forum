# Mock 코드 리뷰 및 서비스 전환 설계

> Issue #151 | Epic #150

## 1. 개요

이 문서는 AI Fashion Forum의 3개 핵심 패키지(`forum-web`, `sim-server`, `agent-core`)의 현재 mock 구현을 리뷰하고, 실제 서비스로 전환하기 위한 설계 방향을 정리한다.

---

## 2. 현재 아키텍처 (As-Is)

```
Static Seed Data (shared-types)
  ├── SAMPLE_AGENT_STATES
  ├── SAMPLE_STATE_SNAPSHOT
  ├── SPRINT1_AGENT_STATES / SPRINT1_ROUND_SNAPSHOTS / SPRINT1_FORUM_POSTS_BY_ROUND
  └── SAMPLE_CONTENT_RECORDS

         ↓ 직접 import

sim-server (server.js, 515줄)
  ├── /api/sprint1-* 계열 — SPRINT1_* 하드코딩 반환
  ├── /api/run-sample     — 실 엔진 실행 (Mock 입력)
  ├── /api/jobs/*         — 실 잡 큐 (In-memory Map, 비영속)
  └── [20+ 기타 mock 엔드포인트]

         ↓ 없음 (직접 import)

forum-web (React)
  ├── Sprint1ReplayApp.jsx — SPRINT1_* 직접 import, 완전 정적
  └── FashionThreadPage.jsx — FEED_POSTS, AUTHOR_PROFILES 하드코딩, API 호출 없음
```

---

## 3. 패키지별 리뷰 결과

### 3.1 forum-web

| 컴포넌트 | 상태 | 데이터 소스 | 전환 필요 작업 |
|---------|------|------------|--------------|
| `Sprint1ReplayApp.jsx` | 완전 정적 | shared-types import | `/api/replay` 기반 동적 로딩으로 전환 |
| `FashionThreadPage.jsx` | 완전 정적 | 파일 내 하드코딩 | API 호출 기반으로 전환 (포스트/댓글/프로필) |
| `main.jsx` | 진입점 | MVP_DEMO_SCENARIO import | API 초기화 레이어 추가 |
| 이미지 JSON 파일들 | 정적 에셋 | 로컬 JSON | 그대로 유지 가능 |

**네트워크 레이어:** `fetch`, `axios` 호출 전무. API 연동 레이어를 신규 구성해야 한다.

**추천 데이터 페칭 라이브러리:** TanStack Query (React Query) — SWR 대비 캐싱 전략이 유연하고, 이 프로젝트의 피드 갱신 패턴에 적합.

---

### 3.2 sim-server

| 엔드포인트 분류 | 수량 | 현재 방식 | 전환 방향 |
|--------------|-----|---------|---------|
| `/api/sprint1-*` 샘플 반환 | 8개 | SPRINT1_* 하드코딩 | DB 조회로 교체 |
| `/api/*-sample` 일반 | 15개 | SAMPLE_* 하드코딩 | DB 조회 또는 제거 |
| `/api/jobs/*` | 5개 | In-memory Map + 파일 I/O | DB 기반 영속 저장소로 교체 |
| `/api/run-sample`, `/api/demo-run-package` | 2개 | 실 엔진 실행 | 유지 (입력 소스만 DB로 교체) |

**기술 부채:**
- In-memory 잡 저장소: 서버 재시작 시 데이터 소실
- `durableMemoryStorePath`, `eventLogStorePath`: 파일 기반 → DB 트랜잭션으로 교체 필요
- 에러 핸들링: try-catch 불일관 (일부 엔드포인트 누락)

---

### 3.3 agent-core

| 모듈 | 서비스 준비도 | 전환 필요 이유 |
|------|------------|-------------|
| `tick-engine.js` | ✅ 즉시 사용 가능 | 외부 의존성 없음 |
| `forum-generation.js` | ✅ 즉시 사용 가능 | 순수 로직 |
| `identity-update-rules.js` | ✅ 즉시 사용 가능 | 순수 로직 |
| `ranking-core.js` | ✅ 즉시 사용 가능 | 순수 로직 |
| `action-space.js` | ✅ 즉시 사용 가능 | 순수 로직 |
| `meta-policy.js` | ✅ 즉시 사용 가능 | 순수 로직 |
| `evaluation-metrics.js` | ✅ 즉시 사용 가능 | 순수 로직 |
| `social-dynamics.js` | ✅ 즉시 사용 가능 | 순수 로직 |
| `debug-console.js` | ✅ 즉시 사용 가능 | 상위 모듈 조합 |
| `content-pipeline.js` | ⚠️ 부분 전환 필요 | mock provider → 실 provider로 교체 |
| `content-indexing.js` | ⚠️ 부분 전환 필요 | mock 벡터 검색 → 실 Vector DB 연동 |
| `memory-stack.js` | ⚠️ 전환 필요 | 파일 I/O → DB 교체 |
| `graph-storage.js` | ⚠️ 전환 필요 | 파일 기반 이벤트 로그 → DB 교체 |

---

### 3.4 shared-types

| 파일 | 전환 방향 |
|------|---------|
| `state-schema.js`, `action-schema.js`, `memory-schema.js`, `content-provider.js` | 변경 불필요 — 계약 정의는 재사용 |
| `sample-data.js` | DB 시드 스크립트로 이관 |
| `sprint1-evaluation.js` | 불변 레퍼런스 스냅샷으로 DB에 저장 |

---

## 4. 재사용 vs 재작성 분류

### 재사용 (수정 없이 또는 최소 수정으로 사용 가능)

| 항목 | 이유 |
|------|------|
| agent-core 순수 로직 모듈 9개 | 외부 의존성 없는 함수형 구현 |
| shared-types 스키마/계약 파일 | 이미 추상화된 팩토리/계약 |
| sim-server 잡 엔드포인트 로직 (비즈니스 로직) | 저장소만 교체하면 재사용 가능 |
| forum-web React 컴포넌트 구조 | API 연동 레이어 추가만 필요 |

### 재작성 또는 신규 구현 필요

| 항목 | 이유 |
|------|------|
| sim-server mock 샘플 엔드포인트 전체 | DB 연동으로 완전 교체 |
| agent-core memory-stack (저장소 레이어) | 파일 I/O → DB 트랜잭션 |
| agent-core content-pipeline mock provider | 실 데이터 소스 provider 구현 |
| forum-web 데이터 레이어 | fetch/React Query 기반 신규 구현 |
| DB 스키마 및 연결 모듈 | 신규 구현 (→ Issue #152) |

---

## 5. 목표 아키텍처 (To-Be)

```
사용자 브라우저
  ↕ HTTP (REST + WebSocket)
forum-web (React + React Query)
  ├── POST /api/posts          포스트 작성
  ├── GET  /api/posts          피드 조회 (랭킹 적용)
  ├── POST /api/posts/:id/comments   댓글 작성
  └── POST /api/posts/:id/like       좋아요

sim-server (Express.js + Mongoose)
  ├── CRUD API 라우터           (→ Issue #153)
  ├── 에이전트 자동화 루프        (→ Issue #155)
  └── Jobs API (DB 영속)

MongoDB
  ├── posts           포스트 + 에이전트 생성 포스트
  ├── comments        댓글
  ├── users           사용자 프로필
  ├── agent_states    에이전트 취향 상태 스냅샷
  └── interactions    사용자-에이전트 상호작용 로그

agent-core (내부 라이브러리)
  ├── 순수 로직 모듈 — 그대로 사용
  ├── memory-stack — DB adapter로 교체
  └── content-pipeline — 실 provider 연결
```

---

## 6. 기술 부채 및 리팩토링 우선순위

| 우선순위 | 항목 | 설명 |
|--------|------|------|
| P1 | In-memory 잡 저장소 교체 | 서버 재시작 시 데이터 소실 방지 |
| P1 | memory-stack 파일 I/O 제거 | 경쟁 조건(race condition) 위험 |
| P2 | mock 샘플 엔드포인트 정리 | 25개 중 상당수 제거 또는 DB 기반 교체 |
| P2 | FashionThreadPage.jsx 분리 | 3,404줄 단일 파일 → 기능별 컴포넌트 분리 |
| P3 | content-indexing mock 벡터 | Chroma 실 연동 (Sprint 2 이후 고려) |
| P3 | 일관성 있는 에러 핸들링 | sim-server 전 엔드포인트 표준화 |

---

## 7. 후속 이슈 참조

| 이슈 | 내용 | 이 문서와의 연결 |
|-----|------|--------------|
| #152 | MongoDB 스키마 설계 | 5절 To-Be 아키텍처 컬렉션 목록 참조 |
| #153 | CRUD API 구현 | 5절 API 엔드포인트 목록 참조 |
| #154 | 동적 UI 구현 | 3.1절 forum-web 전환 작업 참조 |
| #155 | 에이전트-서비스 연동 | 3.3절 agent-core 전환 방향 참조 |
