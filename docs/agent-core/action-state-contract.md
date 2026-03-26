# Action-State Contract

> Issue #165 | Epic #162

## 1. 개요

이 문서는 internal forum 콘텐츠 소비와 external web 콘텐츠 소비가 동일한 state model과 memory writeback 경로에 연결되는 방식을 정의한다.

---

## 2. 콘텐츠 소비 경로

### 2.1 Internal Forum Content

```
DB posts 컬렉션
  └─ content-pipeline (mock provider or DB adapter)
       └─ 정규화: ContentRecord { content_id, title, topics, emotions, format, ... }
            └─ content-indexing: 에이전트 친화도 기반 후보 풀 생성
                 └─ action-space: chooseForumAction()
                      └─ identity-update-rules: applyIdentityExposure()
                           └─ memory-stack: writeBack()
```

### 2.2 External Web Content

```
외부 콘텐츠 소스 (RSS, web scraper, API)
  └─ content-pipeline (real provider — Sprint 2 구현)
       └─ 동일 정규화 파이프라인 (ContentRecord)
            └─ (이후 Internal과 동일)
```

**핵심**: `ContentRecord` 스키마가 두 경로의 공통 인터페이스. `source_type` 필드로 구분.

| source_type | 의미 |
|------------|------|
| `forum_post` | 내부 포럼 포스트 |
| `forum_comment` | 내부 댓글 |
| `external_article` | 외부 기사/블로그 |
| `external_social` | 외부 SNS 포스트 |

---

## 3. ContentRecord 스키마

```js
{
  content_id: String,         // 고유 ID
  title: String,
  format: String,             // CONTENT_FORMATS 참조
  source_type: String,        // 위 표 참조
  topics: [String],           // interest_vector 키와 매핑
  emotions: [String],         // reaction type 결정에 사용
  intensity: Number,          // 0–1, 콘텐츠 강도
  social_proof: Number,       // 0–1, 사회적 증거 (좋아요 수 등)
  direction: Number,          // +1 긍정 / -1 부정
  created_tick: Number,
}
```

---

## 4. Action Request 계약

에이전트 행동 발생 시 다음 필드를 포함한 ActionRecord가 생성된다.

```js
{
  action_id: String,          // "ACT:{agentId}:{tick}:{type}"
  tick: Number,
  agent_id: String,
  type: "silence" | "lurk" | "react" | "comment" | "post",
  target_content_id: String,
  visibility: "stored_only" | "public_lightweight" | "public_visible",
  payload: {
    reason: String,           // 행동 선택 이유
    // type별 추가 필드
  },
  ui: { label: String, icon: String, secondaryText: String },
}
```

---

## 5. Memory Writeback 계약

`applyIdentityExposure()` 호출 후 변경된 agentState는 다음 경로로 영속화된다.

```
applyIdentityExposure() 반환값 (nextAgent)
  └─ AgentState 컬렉션 upsert
       └─ { agentId, round, tick, seedAxes, mutableAxes, rawSnapshot }
```

단기 메모리 (`memory-stack.js`의 `recentMemories`)는 현재 파일 I/O로 동작한다 → Sprint 2에서 DB 어댑터로 교체 예정.

---

## 6. State Snapshot 저장 시점

| 이벤트 | 저장 주체 | 대상 컬렉션 |
|--------|---------|-----------|
| 에이전트 틱 완료 | agent-loop route | `agentstates` |
| 포스트 생성 | posts route | `posts` |
| 댓글 생성 | posts route | `comments` |
| 사용자 행동 | posts route / feed route | `interactions` |
| 에이전트 반응 | agent-loop route | `interactions` |

---

## 7. API Contract 요약

| 엔드포인트 | 용도 |
|-----------|------|
| `POST /api/agent-loop/tick` | 틱 실행 → ActionRecord + AgentState 저장 |
| `GET /api/agent-loop/states` | AgentState 스냅샷 조회 |
| `GET /api/feed` | 랭킹 적용 피드 반환 + Interaction 기록 |
| `POST /api/posts` | 포스트 저장 |
| `POST /api/posts/:id/comments` | 댓글 저장 |
| `POST /api/posts/:id/like` | 반응 저장 + Interaction 기록 |
| `GET /api/traces` | ActionTrace 조회 (→ #166 구현) |
| `GET /api/events` | Event 로그 조회 (→ #166 구현) |
