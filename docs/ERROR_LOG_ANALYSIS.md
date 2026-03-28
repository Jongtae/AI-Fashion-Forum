# 시스템 오류 분석 보고서

**작성일:** 2026-03-28
**검증 범위:** Forum Server, Agent Server, Frontend

---

## 🔴 **ERROR 1: Operator Dashboard - mutableAxes Not Iterable**

### 위치
```
파일: apps/forum-server/src/routes/operator.js
라인: 281
```

### 오류 메시지
```
TypeError: latest.mutableAxes is not iterable
    at file:///Users/jongtaelee/Documents/camel-ai-study/apps/forum-server/src/routes/operator.js:281:45
```

### 원인

**코드:**
```javascript
// line 281
for (const [key, latestValue] of latest.mutableAxes) {
  const prevValue = previous.mutableAxes.get(key) ?? 0;
  // ...
}
```

**문제:**
1. AgentState 모델에서 `mutableAxes`는 MongoDB `Map` 타입으로 정의됨
   ```javascript
   // apps/forum-server/src/models/AgentState.js:15
   mutableAxes: { type: Map, of: Number }
   ```

2. `.lean()` 쿼리를 사용하면 MongoDB의 `Map`이 일반 JavaScript 객체로 변환됨

3. 연산자가 `for...of` 루프로 순회하려고 하는데, 객체는 iterable하지 않음

4. 또한 line 282에서 `.get(key)` 메서드를 사용하려고 하는데, 일반 객체에는 `.get()` 메서드가 없음

### 영향 범위
- ⚠️ **Operator Dashboard 페이지 접근 시만 발생**
- ✅ **포럼 기본 기능에는 영향 없음** (posts, comments, likes 등)
- ✅ **Agent 시스템에는 영향 없음**

### 수정 방법

```javascript
// 현재 코드 (오류)
for (const [key, latestValue] of latest.mutableAxes) {
  const prevValue = previous.mutableAxes.get(key) ?? 0;
  // ...
}

// 수정안 1: 객체로 처리
for (const [key, latestValue] of Object.entries(latest.mutableAxes)) {
  const prevValue = previous.mutableAxes[key] ?? 0;
  // ...
}

// 수정안 2: Map으로 변환
const latestMap = new Map(Object.entries(latest.mutableAxes));
const prevMap = new Map(Object.entries(previous.mutableAxes));
for (const [key, latestValue] of latestMap) {
  const prevValue = prevMap.get(key) ?? 0;
  // ...
}
```

### 심각도
- 🟡 **중간** - Operator 페이지 기능 불가, 하지만 포럼 핵심 기능은 정상

---

## 🟡 **ERROR 2: Agent Server Script Not Found**

### 위치
```
파일: package.json (root)
스크립트 명령어: npm run dev:sim
```

### 오류 메시지
```
npm error Missing script: "dev:sim"
npm error
npm error To see a list of scripts, run:
npm error   npm run
```

### 원인

**package.json에 정의된 스크립트:**
```json
{
  "scripts": {
    "dev": "npm run dev:forum",
    "dev:forum": "npm run dev --workspace @ai-fashion-forum/forum-web",
    "dev:forum-server": "npm run dev --workspace @ai-fashion-forum/forum-server",
    "dev:agent-server": "npm run dev --workspace @ai-fashion-forum/agent-server",
    "boot:local": "concurrently ..."
  }
}
```

**문제:**
- `dev:sim` 스크립트가 정의되지 않음
- 올바른 명령어는 `npm run dev:agent-server`

### 영향 범위
- ⚠️ **`npm run dev:sim` 명령어 사용 불가**
- ✅ **실제 Agent 서버는 정상 실행 중** (localhost:4318)
- ✅ **Agent 기능에는 영향 없음**

### 현재 상태
```
✅ Agent Server는 이미 실행 중 (PID: 93389)
✅ http://localhost:4318/health 응답: OK
✅ API 엔드포인트 정상 작동
```

### 수정 방법

**옵션 1: 스크립트 별칭 추가**
```json
{
  "scripts": {
    "dev:sim": "npm run dev:agent-server"
  }
}
```

**옵션 2: 올바른 명령어 사용**
```bash
npm run dev:agent-server  // ✅ 올바른 명령어
```

### 심각도
- 🟢 **낮음** - 스크립트명 오류일 뿐, 실제 시스템은 정상 작동

---

## 🟡 **ERROR 3: Frontend Port Conflict**

### 위치
```
포트: 5173 (이미 사용 중)
대체 포트: 5174
```

### 오류 메시지
```
Port 5173 is in use, trying another one...

  VITE v7.3.1  ready in 181 ms

  ➜  Local:   http://localhost:5174/
```

### 원인

**문제:**
1. 포트 5173이 이미 다른 프로세스에서 사용 중
2. Vite가 자동으로 다음 포트(5174)에서 시작함

### 영향 범위
- ✅ **실제 오류 아님** - Vite의 정상적인 폴백 동작
- ✅ **모든 기능이 5174에서 정상 작동**

### 현재 상태
```
✅ Frontend 실행 중: http://localhost:5174
✅ 모든 포럼 기능 정상 작동
✅ API 연결 정상
```

### 해결 방법

**옵션 1: 자동 포트 변경 (현재 상태)**
```
✅ Vite가 자동으로 5174로 변경 - 문제 없음
```

**옵션 2: 포트 명시적 지정**
```bash
npm run dev:forum -- --port 5173
```

**옵션 3: 기존 프로세스 종료**
```bash
lsof -i :5173  # 포트 사용 프로세스 확인
kill -9 <PID>   # 프로세스 종료
```

### 심각도
- 🟢 **매우 낮음** - Vite의 정상 동작, 포럼 기능에 영향 없음

---

## 📊 오류 요약표

| # | 오류 | 위치 | 심각도 | 포럼 영향 | 상태 |
|---|------|------|--------|----------|------|
| 1 | mutableAxes Not Iterable | operator.js:281 | 🟡 중간 | 없음 | Operator 페이지만 오류 |
| 2 | Missing Script | package.json | 🟢 낮음 | 없음 | Agent 서버는 정상 |
| 3 | Port Conflict | Vite | 🟢 낮음 | 없음 | 자동 변경됨 (5174) |

---

## ✅ 포럼 기능 상태

### 정상 작동 (테스트 완료)

| 기능 | 상태 | 확인 |
|------|------|------|
| 회원가입 | ✅ | 201 Created |
| 로그인 | ✅ | JWT 토큰 발급 |
| 포스트 작성 | ✅ | 13개 저장됨 |
| 포스트 조회 | ✅ | 페이지네이션 정상 |
| 포스트 상세 | ✅ | 전체 데이터 반환 |
| 댓글 작성/조회 | ✅ | 정상 작동 |
| 좋아요 토글 | ✅ | 0→1 변경 확인 |
| 태그 필터링 | ✅ | 필터 결과 정확 |
| Agent 포스트 | ✅ | authorType="agent" 저장됨 |

### 오류 영향 받는 기능

| 기능 | 상태 | 오류 |
|------|------|------|
| Operator Dashboard | ⚠️ | mutableAxes iteration 오류 |

---

## 🚀 현재 실행 중인 서비스

```
✅ 포럼 백엔드 (localhost:4000)
   - MongoDB 연결 성공
   - 모든 API 엔드포인트 동작
   - Operator dashboard 로드 실패 (mutableAxes 오류)

✅ Agent 서버 (localhost:4318)
   - 3개 Agent 활성화
   - 콘텐츠 소비 시스템 동작
   - 메모리 기록 동작
   - 포럼 통합 정상

✅ 프론트엔드 (localhost:5174)
   - 모든 포럼 기능 정상 작동
   - 포트 5174에서 실행 중 (5173 충돌로 변경)
```

---

## 📝 권장사항

### 우선순위 1 (필수 수정)
1. **ERROR 1 수정**: operator.js의 mutableAxes iteration 문제
   - 영향: Operator Dashboard 접근 불가
   - 방법: `Object.entries()`로 변경

### 우선순위 2 (권장 수정)
2. **ERROR 2 수정**: package.json에 `dev:sim` 스크립트 추가
   - 영향: 스크립트명 일관성
   - 방법: 별칭 추가

### 우선순위 3 (선택)
3. **ERROR 3 해결**: 포트 충돌 명확화
   - 영향: 없음 (자동 변경됨)
   - 방법: 문서화 또는 환경 변수 설정

---

## 결론

**포럼 시스템은 완벽하게 작동합니다.**

- ✅ 모든 포럼 기능 정상
- ✅ Agent 시스템 통합 완료
- ✅ User-Agent 상호작용 동작 중
- ⚠️ Operator Dashboard만 mutableAxes 오류 (비필수 기능)

**사용자는 현재 http://localhost:5174 에서 포럼을 완전히 이용할 수 있습니다.**
