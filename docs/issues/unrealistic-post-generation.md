# Unrealistic Post Generation — Root Cause Analysis

## Problem Statement

시뮬레이션이 생성하는 글이 실제 커뮤니티 글과 전혀 다르다.

**현재 출력 예시:**
- 제목: "스타일을 먼저 붙든 글", "오피스를 두고 체크한 글"
- 본문: "이번 신호가 붙는 순간 어디서 먼저 눈길이 가는지 궁금해져요"
- 본문에 시스템 텍스트 노출: "0틱: 눈에 보이는 글을 남겼다"

**실제 커뮤니티 글:**
- 제목: "봄 아우터 추천 좀 해주세요ㅠ", "유니클로 브이~~~"
- 본문: 개인 경험, 질문, 후기 등 자연스러운 대화체
- 닉네임: "옷장뚝딱", "Buy Now Cry Later" (실명 아님)

---

## Root Causes (5개)

### 1. post-generation.js의 fallback은 LLM 프롬프트용이다

`buildFallbackContexts()`는 원래 LLM에게 보낼 "컨텍스트 후보"를 생성하는 함수다.
LLM이 이 후보들을 읽고 자연스러운 글을 작성하는 것이 의도된 동작이다.
API 키가 없으면 이 내부용 후보 텍스트가 그대로 글 본문으로 노출된다.

**파일:** `packages/agent-core/post-generation.js`
- `buildFallbackContexts()` (line 1505) — 내부 분석용 텍스트 생성
- `resolvePostDraftOnce()` (line 2459) — API 키 없으면 fallback을 그대로 return

**핵심:** 이 함수의 출력은 "에이전트가 어떻게 정보를 처리하는가"를 설명하는 메타 텍스트이지, "커뮤니티 유저가 쓰는 글"이 아니다.

### 2. 시스템 내부 상태가 글 본문에 누출된다

tick-engine이 에이전트 행동을 기록할 때 시스템 로그성 텍스트를 생성하고,
이것이 `agent.self_narrative`와 `mutable_state.drift_log`에 저장된다.
이 텍스트가 `buildMemoryContext()` → `buildMemoryReferenceLine()` → 글 본문으로 흘러간다.

**데이터 흐름:**
```
tick-engine.js (line 131)
  → agent.self_narrative에 "N틱: 눈에 보이는 글을 남겼다" 추가

memory-stack.js (line 419)
  → drift_log에 "N틱: 제목 글을 읽고 관찰 쪽으로 조금 이동했다" 추가

post-generation.js (line 338)
  → buildMemoryContext()가 self_narrative 텍스트 추출

post-generation.js (line 412-444)
  → buildMemoryReferenceLine()가 이 텍스트를 글 본문에 삽입

post-generation.js (line 447)
  → composeReadableBody()가 최종 조합
```

### 3. 제목 생성이 분석적/메타적이다

`buildReadablePostTitle()` (line 944)이 생성하는 제목 패턴:
- `"X를 먼저 붙든 글"`
- `"X를 두고 체크한 글"`
- `"X보다 먼저 들어온 부분"`

이것은 "에이전트가 무엇에 주목했는가"를 설명하는 분석적 제목이다.
실제 커뮤니티 제목은 "봄 아우터 추천 좀", "이 가격이면 괜찮은가요?" 같은 질문/공유형이다.

### 4. 에이전트 닉네임이 실명이다

`scripts/expand-agent-candidates.mjs`의 `KO_NAMES` 배열이 "김서연", "이준혁" 같은 실명이다.
실제 커뮤니티는 "윷이랑 밍구랑", "Buy Now Cry Later" 같은 닉네임을 사용한다.

**상태:** 이미 수정 완료 (현재 브랜치에서 커뮤니티 닉네임으로 교체됨)

### 5. 글 유형 다양성이 없다

실제 커뮤니티에는 다양한 글 유형이 있다:
- 추천 요청 ("봄 자켓 추천 좀요")
- 내돈내산 후기 ("자라 블레이저 한 달 입어봤는데")
- 코디 공유 ("오늘 출근룩 이거 괜찮나요?")
- 가격 비교/세일 정보 ("무신사 봄 세일 뭐 건졌어요?")
- 일상/여행 ("괌 바다는 이렇군요")
- 질문 ("면접 때 뭐 입고 가세요?")

현재 시스템은 항상 같은 유형(분석적 관찰)의 글만 생성한다.

---

## Architecture Problem

현재 `post-generation.js`가 두 가지 전혀 다른 역할을 겸한다:

1. **LLM 프롬프트 컨텍스트 생성** — 에이전트가 정보를 어떻게 처리하는지 LLM에게 설명
2. **최종 글 본문 생성** — API 키 없을 때 fallback으로 글 본문 직접 생성

이 두 역할은 완전히 다른 출력을 요구한다:
- (1)은 메타 분석 텍스트 ("이번 신호를 붙여 보면...")
- (2)는 자연스러운 커뮤니티 대화 ("이 가격이면 괜찮은건가요?")

---

## Solution Direction

### 단기: community-post-templates.js 활용 (현재 브랜치에 구현 시작)

API 키 없는 시뮬레이션에서는 `createLivePostDraft` 대신 `generateCommunityPost()`를 호출.
에이전트의 `interest_vector`와 `archetype`에 따라 사실적인 커뮤니티 글 템플릿을 선택.

**파일:** `packages/agent-core/community-post-templates.js` (신규)
- 6개 주제 카테고리 × 3~7개 템플릿 = 약 35개 글 템플릿
- 에이전트 성격에 따른 인트로/클로저 변형
- 중복 방지 로직

**파일:** `apps/agent-server/src/routes/simulation.js`
- API 키 없으면 `generateCommunityPost()` 호출하도록 이미 수정됨

### 중기: self_narrative에서 시스템 텍스트 분리

`tick-engine.js`와 `memory-stack.js`에서 시스템 로그 텍스트와 사용자 표시용 텍스트를 분리해야 한다.

**현재:** `agent.self_narrative`에 `"0틱: 눈에 보이는 글을 남겼다"` 같은 시스템 텍스트가 들어감
**개선:** 시스템 로그는 별도 필드 (예: `agent.system_log`)에 저장하고, `self_narrative`에는 커뮤니티 글에 적합한 텍스트만 저장

수정 위치:
- `tick-engine.js` line 131 — `self_narrative` 대신 별도 배열에 저장
- `memory-stack.js` line 419 — `drift_log` 내용이 글 생성에 혼입되지 않도록 분리
- `post-generation.js` `buildMemoryContext()` — 시스템 텍스트 필터링

### 장기: LLM 모드에서도 프롬프트 개선

LLM 프롬프트 자체도 "커뮤니티 유저처럼 글을 써라"는 명확한 지시가 필요하다.
현재 프롬프트는 분석적 컨텍스트 목록을 만들라는 지시이기 때문에,
LLM이 분석적 글을 생성하는 것이 당연하다.

---

## Files to Modify (for codex)

| Priority | File | What to do |
|----------|------|------------|
| P0 | `packages/agent-core/community-post-templates.js` | 템플릿 보강, 테스트 추가 |
| P0 | `apps/agent-server/src/routes/simulation.js` | 템플릿 모드에서 `generateCommunityPost` 사용 (완료) |
| P0 | `scripts/expand-agent-candidates.mjs` | 닉네임 교체 (완료), candidates 재생성 필요 |
| P1 | `packages/agent-core/tick-engine.js` line 131 | self_narrative에 시스템 텍스트 넣지 않기 |
| P1 | `packages/agent-core/memory-stack.js` line 419 | drift_log를 글 생성 경로에서 분리 |
| P1 | `packages/agent-core/post-generation.js` | `buildMemoryContext()`에서 시스템 텍스트 필터링 |
| P2 | `packages/agent-core/post-generation.js` | `buildReadablePostTitle()`의 제목 패턴을 커뮤니티형으로 변경 |
| P2 | `packages/agent-core/post-generation.js` | LLM 프롬프트에 "커뮤니티 유저처럼 글 써라" 지시 추가 |

---

## Validation

수정 후 확인 방법:
1. `AGENT_STATE_CANDIDATES_FILE=data/agent-state-candidates.json` 로 시뮬레이션 실행
2. forum-server의 글 목록에서:
   - 제목이 "X를 먼저 붙든 글" 형태가 아닌 자연스러운 제목인지
   - 본문에 "N틱:", "이번 신호", "먼저 붙든" 같은 시스템 텍스트가 없는지
   - 닉네임이 실명이 아닌 커뮤니티 닉네임인지
   - 글 유형이 다양한지 (추천, 후기, 질문, 코디 공유 등)
3. 오프라인 분기 검증이 여전히 verdict=diverging인지

## Reference

유저가 제공한 실제 커뮤니티 글 PDF:
- `~/Documents/여성 봄 자켓 노윤서 여행룩 어때 _ 네이버 카페.pdf`
- `~/Documents/유니클로 브이~~~ _ 네이버 카페.pdf`
- `~/Documents/22년전 일본 잡지에 실렸던 서울 스트릿 패션 jpg _ 네이버 카페.pdf`
- `~/Documents/괌 바다는 이렇군요 _ 네이버 카페.pdf`
- `~/Documents/나트랑.pdf`
- `~/Documents/부시시 댕댕이 🐶 _ 네이버 카페.pdf`

유저가 캡처한 개막전 드레스코드 레드 글 (스크린샷으로 제공)
