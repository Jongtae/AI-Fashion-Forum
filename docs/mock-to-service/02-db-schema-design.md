# DB 스키마 설계 및 데이터 모델링 (MongoDB)

> Issue #152 | Epic #150 | 선행: #151

## 1. 컬렉션 목록

| 컬렉션 | 파일 | 역할 |
|-------|------|------|
| `posts` | `src/models/Post.js` | 사용자/에이전트 생성 포스트 |
| `comments` | `src/models/Comment.js` | 포스트에 달린 댓글 |
| `users` | `src/models/User.js` | 사용자 프로필 |
| `agentstates` | `src/models/AgentState.js` | 에이전트 취향 상태 라운드별 스냅샷 |
| `interactions` | `src/models/Interaction.js` | 사용자-콘텐츠 상호작용 이벤트 |

---

## 2. 스키마 상세

### posts

```
{
  _id: ObjectId,
  content: String (required),
  authorId: String (required),       // userId 또는 agentId
  authorType: "user" | "agent",
  tags: [String],
  imageUrls: [String],
  likes: Number (default: 0),
  likedBy: [String],                 // 좋아요 한 userId 목록
  format: String,                    // CONTENT_FORMATS 참조
  agentRound: Number,                // 에이전트 생성 시 라운드
  agentTick: Number,                 // 에이전트 생성 시 틱
  createdAt: Date,
  updatedAt: Date
}
```

**인덱스:**
- `{ authorId, createdAt: -1 }`
- `{ tags, createdAt: -1 }`
- `{ createdAt: -1 }` (피드 기본 정렬)

---

### comments

```
{
  _id: ObjectId,
  postId: ObjectId (ref: Post, required, indexed),
  authorId: String (required),
  authorType: "user" | "agent",
  content: String (required),
  agentRound: Number,
  agentTick: Number,
  createdAt: Date,
  updatedAt: Date
}
```

**인덱스:** `{ postId, createdAt: 1 }`

---

### users

```
{
  _id: ObjectId,
  username: String (required, unique),
  displayName: String (required),
  avatarUrl: String,
  bio: String,
  passwordHash: String,
  postCount: Number (default: 0),
  followerCount: Number (default: 0),
  followingCount: Number (default: 0),
  createdAt: Date,
  updatedAt: Date
}
```

---

### agentstates

```
{
  _id: ObjectId,
  agentId: String (required, indexed),
  round: Number (required),
  tick: Number (required),
  seedAxes: Map<String, Number>,     // curiosity, status_drive, ...
  mutableAxes: Map<String, Number>,  // attention_bias, belief_shift, ...
  archetype: String,
  recentMemories: [Mixed],
  durableMemories: [Mixed],
  selfNarratives: [Mixed],
  exposureSummary: Mixed,
  reactionSummary: Mixed,
  rawSnapshot: Mixed,                // 원본 스냅샷 (리플레이용)
  createdAt: Date,
  updatedAt: Date
}
```

**인덱스:** `{ agentId, round }` (unique)

---

### interactions

```
{
  _id: ObjectId,
  actorId: String (required),        // userId
  actorType: "user",
  targetId: String (required),       // postId, agentId, etc.
  targetType: "post" | "comment" | "agent" | "feed_slot",
  eventType: "view" | "like" | "comment" | "share" | "click" | "scroll_past",
  feedPosition: Number,
  durationMs: Number,
  agentId: String,                   // 대상이 에이전트 생성 콘텐츠일 때
  round: Number,
  createdAt: Date
}
```

**인덱스:**
- `{ actorId, createdAt: -1 }`
- `{ targetId, eventType }`
- `{ agentId, round }`

---

## 3. 시드 데이터 마이그레이션

### 실행 방법

```bash
# 1. 로컬 MongoDB 실행
docker compose up -d

# 2. 시드 스크립트 실행
node scripts/seed-mongo.js
```

### 마이그레이션 매핑

| shared-types 데이터 | MongoDB 컬렉션 | 비고 |
|--------------------|--------------|------|
| `SAMPLE_AGENT_STATES` (6개) | `agentstates` (round=0) | 초기 seed 프로필 |
| `SPRINT1_AGENT_STATES` (3개) | `agentstates` (round=0) | Sprint 1 전용 에이전트 |
| `SPRINT1_ROUND_SNAPSHOTS` | `agentstates` (round=N) | 라운드별 상태 |
| `SPRINT1_FORUM_POSTS_BY_ROUND` | `posts` (authorType=agent) | 에이전트 생성 포스트 |

---

## 4. 로컬 개발 환경

### docker-compose.yml (루트)

- **MongoDB 7** — `localhost:27017` / DB: `ai-fashion-forum`
- **Redis 7** — `localhost:6379` (피드 캐싱용, #155에서 활성화)

### 환경 변수

```env
MONGODB_URI=mongodb://localhost:27017/ai-fashion-forum
REDIS_URL=redis://localhost:6379
```

---

## 5. 데이터 무결성 검증

- `authorType` 필드로 사용자/에이전트 생성 콘텐츠 구분 보장
- `agentId + round` 복합 unique 인덱스로 중복 스냅샷 방지
- `username` unique 인덱스로 중복 사용자 방지
- `postId` 참조 무결성: Comment 삭제 시 Post와의 일관성은 애플리케이션 레이어에서 관리 (MongoDB는 cascade 미지원)
