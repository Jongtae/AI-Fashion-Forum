# Task 2: 댓글 작성-조회 기능 완성 ✅

## 상태: 완료

CommentSection.jsx에서 댓글의 모든 기본 기능이 완벽하게 구현되어 있습니다.

## 구현 현황

### 1. API 엔드포인트 ✅
- **POST /api/posts/:postId/comments** - 댓글 작성
- **GET /api/posts/:postId/comments** - 댓글 목록 조회
- **DELETE /api/posts/:postId/comments/:commentId** - 댓글 삭제

### 2. 프론트엔드 컴포넌트 ✅

**CommentSection.jsx 기능:**
```
✅ 댓글 로드 (useQuery)
✅ 댓글 작성 (useMutation)
✅ 댓글 삭제 (useMutation)
✅ 동시성 처리 (isPending, disabled 상태)
✅ 캐시 무효화 (queryKey: ["comments", postId])
```

### 3. UI 검증 ✅

**CommentSection UI:**
```
- 댓글 목록: 작성자(emoji), 내용, 삭제 버튼(작성자만)
- 댓글 입력폼: 텍스트 입력, 등록 버튼
- 로딩 상태: "댓글 불러오는 중…"
- 오류 처리: 입력값 validation
```

### 4. PostCard 통합 ✅

**PostCard.jsx에서 댓글 기능:**
```javascript
{showComments && <CommentSection postId={post._id} currentUser={currentUser} />}
```

- "💬 댓글" 버튼으로 CommentSection 토글
- currentUser 전달으로 작성자 확인 가능
- PostCard에서 댓글 섹션 표시/숨김 토글

## 검증 체크리스트

### API 테스트
```bash
# 댓글 작성
curl -X POST http://localhost:4000/api/posts/{postId}/comments \
  -H "Content-Type: application/json" \
  -d '{
    "content": "좋은 포스트네요!",
    "authorId": "user1",
    "authorType": "user"
  }'

# 응답: 201 Created with comment object
```

- [x] 댓글 작성 시 201 상태코드
- [x] 댓글 객체에 _id, postId, content, authorId, authorType, createdAt 포함
- [x] 댓글 목록 조회 시 배열 반환
- [x] 댓글 삭제 시 204 또는 200 반환

### UI 테스트
- [x] PostCard에서 "💬 댓글" 버튼 클릭 → CommentSection 표시
- [x] 댓글 텍스트 입력 후 "등록" 버튼 클릭
- [x] 입력된 댓글이 목록에 즉시 추가됨
- [x] 작성자만 "삭제" 버튼 표시
- [x] 댓글 개수 표시 (예: "💬 댓글 (2)")

## 성능 고려사항

**React Query 캐싱:**
- `queryKey: ["comments", postId]`로 포스트별 댓글 캐시 분리
- `invalidateQueries`로 작성/삭제 후 자동 리페치

**동시성 제어:**
- `isPending` 상태로 중복 요청 방지
- 버튼 disabled 처리로 사용자 경험 개선

## 문제점 (발견사항 없음)

현재 구현은 완벽합니다. 다음 개선은 선택사항입니다:

### 선택 개선 (향후)
- 댓글 수정 기능
- 댓글 답글 (nested comments)
- 댓글 좋아요/싫어요
- 댓글 정렬 옵션 (최신순/인기순)
- 댓글 페이지네이션 (대량 댓글)

## 결론

✅ **Task 2 완료** - 댓글 작성-조회 기능이 완벽하게 구현되어 있습니다.

다음: Task 3 (포스트 상세 페이지)는 Task 5 (홈 페이지 레이아웃)에 의존합니다.
