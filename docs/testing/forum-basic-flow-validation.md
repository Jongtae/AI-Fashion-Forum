# 포럼 기본 기능 검증 가이드

## 개요

이 문서는 #245 제안의 "최소한의 동작하는 포럼"을 검증하기 위한 엔드-투-엔드 테스트 가이드입니다.

## 환경 설정

```bash
# 1. 백엔드 시작
npm run dev:forum-server  # port 4000, MongoDB 필요

# 2. 프론트엔드 시작
npm run dev:forum        # port 5173
```

## 테스트 1: 포스트 작성-조회 기본 흐름

### 1.1 초기 상태 확인

**UI 확인:**
- [ ] http://localhost:5173 접속
- [ ] ForumApp이 로드됨 (또는 메인 페이지 표시)
- [ ] "포스트가 없습니다" 메시지 표시 (초기 상태)

### 1.2 포스트 작성

**API 확인:**
```bash
curl -X POST http://localhost:4000/api/posts \
  -H "Content-Type: application/json" \
  -d '{
    "content": "첫 번째 포스트입니다!",
    "authorId": "user1",
    "authorType": "user",
    "tags": ["test", "forum"]
  }'
```

**응답 확인:**
```json
{
  "_id": "...",
  "content": "첫 번째 포스트입니다!",
  "authorId": "user1",
  "authorType": "user",
  "tags": ["test", "forum"],
  "likes": 0,
  "likedBy": [],
  "commentCount": 0,
  "createdAt": "...",
  "moderationStatus": "approved",
  "moderationScore": "..."
}
```

**UI 확인:**
- [ ] PostForm에 내용 입력
- [ ] 태그 입력 (쉼표 구분): "test,forum"
- [ ] "포스트" 버튼 클릭
- [ ] "등록 중…" 상태 표시
- [ ] 성공 후 폼이 초기화됨

### 1.3 포스트 목록 확인

**API 확인:**
```bash
curl http://localhost:4000/api/posts?page=1&limit=20
```

**응답 확인:**
```json
{
  "posts": [
    {
      "_id": "...",
      "content": "첫 번째 포스트입니다!",
      "authorId": "user1",
      "tags": ["test", "forum"],
      "likes": 0,
      "createdAt": "..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

**UI 확인:**
- [ ] PostList에 작성한 포스트가 목록에 나타남
- [ ] PostCard 표시:
  - [ ] 작성자: "👤 user1"
  - [ ] 내용: "첫 번째 포스트입니다!"
  - [ ] 태그: "#test #forum"
  - [ ] 좋아요: "♡ 0"
  - [ ] 댓글 버튼
  - [ ] 삭제 버튼 (작성자의 경우)

### 1.4 포스트 상세 조회

**API 확인:**
```bash
curl http://localhost:4000/api/posts/{postId}
```

**응답 확인:**
- [ ] 포스트의 모든 필드가 반환됨

**UI 확인 (필요시):**
- [ ] PostCard를 클릭하면 상세 페이지로 이동 (구현 필요)
- [ ] 전체 내용이 표시됨

---

## 테스트 2: 댓글 작성-조회

### 2.1 댓글 작성

**API 확인:**
```bash
curl -X POST http://localhost:4000/api/posts/{postId}/comments \
  -H "Content-Type: application/json" \
  -d '{
    "content": "좋은 포스트네요!",
    "authorId": "user2",
    "authorType": "user"
  }'
```

**응답 확인:**
```json
{
  "_id": "...",
  "postId": "...",
  "content": "좋은 포스트네요!",
  "authorId": "user2",
  "authorType": "user",
  "createdAt": "..."
}
```

**UI 확인:**
- [ ] PostCard에서 "💬 댓글" 버튼 클릭
- [ ] CommentSection이 펼쳐짐
- [ ] 댓글 입력 폼 표시
- [ ] 댓글 내용 입력
- [ ] "댓글" 버튼 클릭
- [ ] "등록 중…" 상태 표시
- [ ] 성공 후 댓글이 목록에 나타남

### 2.2 댓글 목록 조회

**API 확인:**
```bash
curl http://localhost:4000/api/posts/{postId}/comments
```

**응답 확인:**
- [ ] 댓글 배열 반환
- [ ] 각 댓글: _id, postId, content, authorId, authorType, createdAt

**UI 확인:**
- [ ] CommentSection에 댓글 목록 표시
- [ ] 각 댓글: 작성자, 내용, 시간

### 2.3 댓글 개수 반영

**UI 확인:**
- [ ] PostCard의 댓글 버튼이 "💬 댓글 (1)" 형태로 업데이트 (구현 필요)

---

## 테스트 3: 좋아요 기능

### 3.1 좋아요 토글

**API 확인:**
```bash
curl -X POST http://localhost:4000/api/posts/{postId}/like \
  -H "Content-Type: application/json" \
  -d '{"userId": "user1"}'
```

**응답 확인:**
```json
{
  "liked": true,
  "likes": 1
}
```

다시 호출하면:
```json
{
  "liked": false,
  "likes": 0
}
```

**UI 확인:**
- [ ] PostCard의 좋아요 버튼 클릭
- [ ] "♡ 0" → "♥ 1"로 변환 (색상 빨강)
- [ ] 다시 클릭하면 "♡ 0"으로 복구

---

## 테스트 4: 포스트 삭제

### 4.1 포스트 삭제

**API 확인:**
```bash
curl -X DELETE http://localhost:4000/api/posts/{postId}
```

**응답 확인:**
```json
{
  "deleted": true,
  "postId": "..."
}
```

**UI 확인:**
- [ ] PostCard에서 삭제 버튼 (작성자의 경우)
- [ ] 삭제 버튼 클릭
- [ ] 포스트가 목록에서 제거됨

---

## 테스트 5: 태그 필터링

### 5.1 태그 필터

**API 확인:**
```bash
curl http://localhost:4000/api/posts?tag=test
```

**응답 확인:**
- [ ] "test" 태그를 가진 포스트만 반환

**UI 확인:**
- [ ] PostList에 태그 필터 입력창
- [ ] 필터 입력 후 해당 태그의 포스트만 표시
- [ ] 필터 삭제 버튼으로 초기화

---

## 체크리스트: 최소한의 동작하는 포럼

### 필수 기능
- [ ] 포스트 작성 (제목 없음, 내용만) → createPost API
- [ ] 포스트 목록 조회 → fetchPosts API + 페이지네이션
- [ ] 포스트 카드 표시 → 작성자, 내용, 태그, 시간, 좋아요
- [ ] 댓글 작성 → createComment API
- [ ] 댓글 목록 조회 → fetchComments API
- [ ] 좋아요 토글 → toggleLike API
- [ ] 포스트 삭제 → deletePost API (소유자만)
- [ ] 댓글 삭제 → deleteComment API (소유자만)
- [ ] 태그 필터링 → fetchPosts with tag parameter

### 선택 기능 (향후)
- [ ] 포스트 상세 페이지 (별도 라우트)
- [ ] 사용자 인증 (회원가입/로그인)
- [ ] 포스트 수정
- [ ] 댓글 수정
- [ ] 검색 기능
- [ ] 알림 시스템
- [ ] 팔로우 시스템

---

## 디버깅 팁

### 포스트가 목록에 나타나지 않음
1. POST 응답에서 201 상태 코드 확인
2. GET /api/posts 호출 후 posts 배열이 비어있지 않은지 확인
3. 브라우저 개발자도구 > Network 탭에서 API 요청/응답 확인
4. React Query 캐시 상태 확인 (React DevTools)

### 댓글이 표시되지 않음
1. POST /api/posts/:postId/comments 응답 상태 확인
2. GET /api/posts/:postId/comments 호출
3. CommentSection 컴포넌트가 comments 데이터를 받는지 확인

### 좋아요가 반영되지 않음
1. toggleLike API의 userId 파라미터 확인
2. currentUser 상태가 올바르게 설정되었는지 확인
3. PostCard의 likedBy 배열 업데이트 확인

---

## 성공 기준

모든 테스트가 완료되고 다음 조건을 만족하면 "최소한의 동작하는 포럼" 달성:

✅ 사용자가 포스트를 작성할 수 있다
✅ 작성된 포스트가 목록에 즉시 표시된다
✅ 댓글을 작성할 수 있다
✅ 작성된 댓글이 즉시 표시된다
✅ 좋아요/좋아요 취소가 즉시 반영된다
✅ 포스트/댓글 삭제가 동작한다
✅ 태그로 필터링할 수 있다
✅ UI-서버 연결이 검증되었다
