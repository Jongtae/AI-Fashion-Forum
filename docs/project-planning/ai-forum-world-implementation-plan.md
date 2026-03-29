# AI-네이티브 패션 포럼을 위한 정체성 분화형 사회 시뮬레이션 구현 계획

이 문서는 phase-2 방향을 설명하는 작업용 한국어 companion 문서입니다.

저장소의 현재 공식 방향 문서는 아래를 우선합니다.

- [`/Users/jongtaelee/Documents/camel-ai-study/docs/phase-2-ai-native-forum-direction.md`](/Users/jongtaelee/Documents/camel-ai-study/docs/phase-2-ai-native-forum-direction.md)
- [`/Users/jongtaelee/Documents/camel-ai-study/docs/product-identity.md`](/Users/jongtaelee/Documents/camel-ai-study/docs/product-identity.md)
- [`/Users/jongtaelee/Documents/camel-ai-study/docs/current-product-state.md`](/Users/jongtaelee/Documents/camel-ai-study/docs/current-product-state.md)

## Proposed implementation issue

### Title

UI/UX에서 소비, 선택, 반응, 관계 누적이 캐릭터를 만드는 흐름을 드러내기

### Summary

현재 UI는 글쓰기와 포럼 액션을 보여주고 있지만, 사용자가 본 글, 고른 글, 좋아요나 싫어요를 한 글, 댓글과 그에 대한 반응, 외부 콘텐츠 소비 결과가 하나의 정체성 루프로 읽히는 구조는 약합니다.

이 이슈는 포럼 화면, 피드, 프로필, 댓글, replay, 운영 화면, 작성 진입점이 모두 같은 언어로 동작하도록 정리해서, "무엇을 소비했고 어떻게 반응했는가"가 agent와 사람의 캐릭터를 발전시키는 핵심 축이 되도록 만드는 것을 목표로 합니다.

### Completion criteria

- [x] Feed, discovery, detail, profile, replay, comments, operator/admin, and composer entry points all describe identity as an accumulation of consumption and reaction
- [x] UI copy distinguishes passive exposure, deliberate selection, lightweight reaction, authored response, and shared consumption
- [x] The same identity-loop framing is visible across replay and operational surfaces
- [x] The project documents reference the consumption-first UI/UX direction
- [x] The implementation remains buildable in the forum web app

### Expected branch name

`codex/ui-ux-consumption-identity-loop`

### Primary layer

`digital twin / productization`

### Data Engineering review

Not required.

### Verification

- Run the forum web build
- Confirm the updated UI copy on feed, detail, profile, comments, replay, and operator surfaces
- Confirm no layout or import errors are introduced

### Non-goals

- Do not turn the UI into a generic social feed with a new label layer
- Do not make posting volume the primary measure of identity growth
- Do not hide the difference between passive exposure and deliberate selection
- Do not collapse comments, reactions, and consumption into a single event type

### Review gates

- Can a reviewer trace a character change from exposure to selection to reaction to writeback?
- Can a reviewer tell whether the UI is consumption-first rather than write-first?
- Can a reviewer see the same framing across feed, detail, profile, comments, replay, and operator surfaces?
- Can the build run cleanly after these changes?

## GitHub issue copy

### Title

UI/UX에서 소비, 선택, 반응, 관계 누적이 캐릭터를 만드는 흐름을 드러내기

### Body

현재 UI는 글쓰기와 포럼 액션을 보여주지만, 캐릭터가 실제로는 “무엇을 봤는지, 무엇을 골랐는지, 무엇에 반응했는지, 그 반응이 관계와 자기서사에 어떻게 남았는지”로 형성된다는 점이 충분히 드러나지 않습니다.

이 이슈의 목표는 feed, discovery, detail, profile, comments, replay, operator/admin, composer가 모두 같은 identity-loop 언어를 쓰도록 맞추는 것입니다.

### Scope

- Feed와 discovery에서 deliberate selection이 보이게 한다
- Detail에서 reaction과 relationship effect가 보이게 한다
- Profile에서 consumption history와 response history가 보이게 한다
- Comments에서 social feedback loop가 보이게 한다
- Replay와 operator/admin에서 state accumulation과 writeback이 보이게 한다
- Composer에서 writing이 broader loop의 output임이 보이게 한다

### Completion criteria

- [ ] Feed, discovery, detail, profile, replay, comments, operator/admin, and composer entry points all describe identity as an accumulation of consumption and reaction
- [ ] UI copy distinguishes passive exposure, deliberate selection, lightweight reaction, authored response, and shared consumption
- [ ] The same identity-loop framing is visible across replay and operational surfaces
- [ ] The project documents reference the consumption-first UI/UX direction
- [ ] The implementation remains buildable in the forum web app

### Non-goals

- Do not turn the UI into a generic social feed with a new label layer
- Do not make posting volume the primary measure of identity growth
- Do not hide the difference between passive exposure and deliberate selection
- Do not collapse comments, reactions, and consumption into a single event type

### Verification

- Run `npm run build`
- Manually verify feed, detail, profile, comments, replay, operator/admin, and composer copy
- Confirm no layout or import errors are introduced

### Branch

`codex/ui-ux-consumption-identity-loop`

### Layer

`digital twin / productization`

### Data Engineering review

Not required

## Proposed pull request draft

### Title

Make the forum UI read as a consumption-driven identity loop

### Summary

This change reframes the product UI so that identity is read from what an agent or user sees, chooses, reacts to, comments on, and shares, rather than from writing alone.

The work updates the main reading and action surfaces:

- discovery and feed emphasize deliberate selection
- detail view emphasizes reaction and relationship effects
- profile emphasizes consumption history and response history
- comments emphasize social feedback loops
- replay and operator views emphasize state accumulation and writeback
- composer emphasizes that writing is the output of a broader loop

### What changed

- Added a shared `IdentityLoopSummary` component to present consumption, selection, reaction, and writeback in a consistent language
- Updated feed, discovery, detail, profile, comments, replay, operator, admin, and composer surfaces to use that framing
- Added a sprint replay summary that highlights shared stimulus, divergence legibility, and traceability
- Linked the new product direction docs from the docs index

### Verification

- `npm run build`
- Manual walkthrough of feed, discovery, detail, profile, comments, replay, operator, admin, and composer surfaces

### Follow-ups

- Expand the same framing into any remaining copy that still reads as write-first rather than consumption-first
- Decide whether the new language should also be reflected in user-facing onboarding text or help text

## 요약

이 프로젝트가 만들려는 것은 단순 멀티에이전트 채팅이 아닙니다.

핵심 목표는:

- 에이전트가 외부 콘텐츠를 편향적으로 소비하고
- 그 소비 이력과 감정 반응이 누적되며
- 관계와 자기서사가 형성되고
- 그 결과 포럼 안에서 정체성이 분화되는 사회를 만드는 것

즉 검색이 목적이 아닙니다.
검색과 탐색은 정체성 형성의 입력일 뿐입니다.

이 목적에는 범용 협업 프레임워크 하나만으로는 부족합니다.
사회 시뮬레이션 엔진, 장기 기억, 관계 그래프, 포럼 UI를 분리해서 조합하는 아키텍처가 더 적합합니다.

제가 추천하는 구현 방향은 한 줄로 요약하면 아래와 같습니다.

`Concordia 또는 Mesa를 시뮬레이션 코어로 두고, LangGraph로 실행 흐름을 관리하고, Mem0 + Chroma로 장기 기억을 저장하고, Neo4j로 관계/성향 그래프를 관리하고, OASIS와 AI Town을 참고해 포럼 피드/반응/UI를 붙인다.`

## 왜 기존 계획을 더 발전시켜야 하는가

기존 phase-2 문서는 MiroFish와 OASIS를 중심으로 잘 정리되어 있지만, 여전히 다음 위험이 남아 있습니다.

- 포럼 사회 엔진보다 도구 체인 설명이 앞서는 문제
- 협업형 멀티에이전트 프레임워크와 사회 시뮬레이션 엔진의 역할이 섞이는 문제
- 장기 기억, 관계 그래프, 자기서사가 어떻게 정체성 분화를 만든다는 것인지가 약한 문제

이 문서의 목적은 그 빈칸을 메우는 것입니다.

## 핵심 설계 원칙

이 프로젝트에서 가장 중요한 것은 아래 6가지입니다.

1. 초기 성향은 약하게 시작할 것
- 완성된 캐릭터를 프롬프트로 고정하지 않는다.

2. 노출은 편향적일 것
- 모든 에이전트가 같은 것을 랜덤하게 보지 않는다.

3. 반응은 감정적으로 차등화할 것
- 같은 콘텐츠도 에이전트마다 다르게 꽂혀야 한다.

4. 변화는 누적적으로 일어날 것
- 한 번 본 콘텐츠로 세계관이 바뀌면 안 된다.

5. 기억이 미래 행동을 제한할 것
- 과거 반응과 관계가 이후 탐색, 글쓰기, 댓글, 팔로우에 영향을 줘야 한다.

6. 포럼 내부 보상이 정체성을 강화할 것
- 좋아요, 지지, 조롱, 무시, 팔로우, 뮤트가 정체성 강화 또는 완화에 작용해야 한다.

이 원칙이 없으면 단순 멀티에이전트 게시판이 되고, 이 원칙이 있으면 인물이 생기는 포럼이 됩니다.

## 라이브러리와 역할 분담

### 1. 사회 시뮬레이션 코어

#### Concordia

가장 우선 추천하는 코어입니다.

이유:

- 자연어 기반 사회 상호작용과 세계 진행에 잘 맞음
- Game Master 패턴으로 포럼 규칙, 운영 개입, 추천 로직, 사건 주입을 환경 레이어로 분리하기 좋음
- “사람처럼 말하는 포럼”을 만들려는 목적과 가까움

적합한 역할:

- 포럼 세계 엔진
- 장면 전환
- 사회적 사건 주입
- 운영자/시스템 개입 레이어

#### Mesa

실험 분석용 보조 코어로 강합니다.

이유:

- 규칙 기반 업데이트에 적합
- 성향 벡터 변화, 집단 분화, 극화, 반복 실험 분석에 유리
- threshold 기반 identity update를 명시적으로 구현하기 좋음

적합한 역할:

- 정체성 업데이트 규칙 엔진
- 반복 실험
- 수치 분석
- 메커니즘 검증

#### 권장 결론

- 자연어 사회성 중심의 월드 엔진은 `Concordia 우선`
- 명시적 업데이트 규칙과 실험 분석은 `Mesa 병행`

## 2. 멀티에이전트 오케스트레이션

#### LangGraph

메인 실행 흐름 관리자로 가장 적합합니다.

강점:

- 상태 있는 장기 실행
- persistence
- 디버깅과 노드 기반 순환 구조

이 프로젝트에서의 역할:

- `노출 -> 반응 -> 해석 -> 글작성 -> 피드백 -> 정체성 업데이트` 루프 관리
- supervisor 노드
- 라운드 실행 관리
- 장기 상태 복구

#### CAMEL

핵심 월드 엔진보다는 보조 시스템으로 적합합니다.

적합한 역할:

- judge agent
- moderator agent
- company-loop product team
- evaluation worker

#### AutoGen / CrewAI

협업형 task workflow에는 좋지만, 장기 포럼 사회 엔진의 메인 프레임으로는 2순위입니다.

## 3. 기억과 관계 저장소

#### Mem0

장기 기억 계층으로 적합합니다.

역할:

- 에이전트의 중요한 경험 요약
- 선호 변화 기록
- 자기서사 단위 기억 저장

#### Chroma

벡터 검색 계층으로 적합합니다.

역할:

- 소비한 외부 콘텐츠 저장
- 자신이 쓴 글, 남의 댓글, 읽었던 포스트 저장
- 유사한 기억이나 콘텐츠 재호출

#### Neo4j GraphRAG

관계와 성향 구조를 저장하는 핵심 그래프 계층입니다.

역할:

- Agent A -> topic 선호
- Agent A -> Agent B와 반복 충돌
- topic X -> 논쟁성 높음
- agent cluster -> 특정 가치 축 공유

벡터 검색만으로는 설명하기 어려운 구조적 정체성 변화를 다루기 좋습니다.

## 4. 포럼 행동 및 환경 참고 프로젝트

#### OASIS

메인 코어를 그대로 복사하기보다 아래를 참고하는 것이 좋습니다.

- 행동공간 설계
- follow/comment/recommendation 구조
- traces와 recommendation 개념
- 포럼/소셜 플랫폼의 동적 환경 모델링

#### AI Town

다음을 참고하기 좋습니다.

- 시뮬레이션 서버와 UI 분리
- 상태 시각화 구조
- 실제 서비스처럼 보이는 프론트엔드 연결 방식

## 전체 아키텍처

이 시스템은 아래 6개 모듈로 쪼개는 것이 가장 현실적입니다.

### A. Seed Persona 모듈

에이전트를 완성된 캐릭터로 만들지 않고, 약한 초기 성향만 둡니다.

예:

- 동물 호감도
- 논쟁 회피도
- 공감 민감도
- 시각 콘텐츠 선호
- 가격 민감도
- 브랜드 충성도

저장 위치:

- Concordia/Mesa agent state
- LangGraph가 매 라운드 읽는 상태 객체

### B. Exposure 모듈

에이전트는 무작위로 콘텐츠를 보는 것이 아니라, 현재 성향과 가까운 것을 편향적으로 봅니다.

입력 예시:

- 실제 웹 검색 결과 요약
- 수집된 게시글
- 이미지 설명
- 기사 요약
- 포럼 내부 인기 글

저장 및 검색:

- Chroma에 콘텐츠와 임베딩 저장
- 메타데이터 태그와 함께 retrieval

중요 원칙:

- 검색은 목적이 아니라 정체성 형성 입력이다

### C. Affect / Interpretation 모듈

같은 콘텐츠를 봐도 다른 반응이 나와야 합니다.

각 라운드에서 계산할 항목:

- 관심도 변화
- 감정 반응 강도
- 자기 서사와의 연결 여부
- 토론으로 끌고 올 확률

저장:

- Mem0에는 기억 저장
- Neo4j에는 관계/성향 그래프 업데이트

### D. Identity Update 모듈

핵심 모듈입니다.

규칙:

- 단발성 반응으로는 변화하지 않는다
- 누적 반응이 threshold를 넘을 때만 분화가 일어난다
- 정체성이 바뀌면 이후 노출과 발언이 그 방향으로 더 편향된다

예:

- 고양이 사진 선호
- 구조 스토리 반복 노출
- 구조 옹호 댓글 작성 경험

이 세 축이 누적되면:

- `동물 애호가 -> 길고양이 보호 성향`

구현 원칙:

- 자연어 생성만으로 맡기지 않는다
- Mesa 스타일의 명시적 규칙 엔진으로 보강한다

### E. Forum Action 모듈

매 라운드에서 에이전트는 아래 중 하나를 수행합니다.

- 새 글 작성
- 댓글 작성
- 인용/반박
- 저장만 하고 침묵
- 팔로우/언팔로우
- 특정 주제 mute

이 행동공간은 OASIS 참고 구조와 잘 맞습니다.

### F. Meta System 모듈

포럼을 살아 있게 보이게 하는 메타 레이어입니다.

예:

- hot score 기반 노출
- 비슷한 성향 글 추천
- 논쟁성 높은 글 증폭
- 신규 에이전트 유입
- 운영자 경고/삭제

구현 위치:

- Concordia의 GM 패턴
- 또는 LangGraph supervisor 노드

## 시스템 레이어별 추천 스택

### 안 A: 가장 적합한 조합

- Concordia
- LangGraph
- Mem0
- Chroma
- Neo4j
- Next.js 프론트

장점:

- 정체성 진화형 포럼과 가장 잘 맞음
- 사회적 자연어 상호작용과 장기 기억, 관계 구조를 분리 가능

### 안 B: 빠른 검증 조합

- Mesa
- LangGraph
- Chroma
- 간단한 웹 UI

장점:

- 구현이 빠름
- 정체성 변화 규칙을 먼저 검증하기 좋음

한계:

- 사회적 자연스러움은 더 약할 수 있음

## 단계별 구현 순서

### 1단계: 가장 작은 POC

범위:

- 에이전트 8~12명
- 주제 1개
- 글/댓글/좋아요만

스택:

- Concordia 또는 Mesa
- LangGraph
- Chroma

검증 질문:

- 시간이 지날수록 말투와 주장 축이 달라지는가
- 같은 외부 콘텐츠도 서로 다르게 해석하는가
- 과거 상호작용이 다음 토론에 반영되는가

### 2단계: 정체성 분화 엔진

추가:

- Mem0
- Neo4j

목표:

- “무엇을 좋아한다”를 넘어서
- “왜 그런 입장을 갖게 됐는가”가 설명되게 만들기

### 3단계: 포럼화

추가:

- OASIS 참고 행동공간
- feed ranking
- follow
- quote
- conflict amplification
- topic drift

목표:

- 인물이 사회 안에서 상호작용하며 집단 현상이 보이게 만들기

### 4단계: UI 붙이기

참고:

- AI Town의 서버 상태와 클라이언트 시각화 분리 구조

목표:

- Threads/Reddit 같은 피드 UI
- 실제 서비스처럼 보이는 검증 환경

## 12주 실행 로드맵 개정안

### 1–3주: 정체성 분화 POC

- Seed Persona 상태 정의
- Exposure 메타데이터 구조 정의
- LangGraph 라운드 루프 구성
- 작은 시뮬레이션 실행

### 4–6주: 기억/그래프 통합

- Mem0 장기 기억 붙이기
- Chroma retrieval 품질 보정
- Neo4j 관계 그래프 정의
- Identity Update threshold 튜닝

### 7–9주: 포럼 행동 및 메타 시스템

- follow/mute/quote/reply 도입
- hot score/recommendation 설계
- 운영 개입과 규칙 위반 처리
- 논쟁 증폭과 군집 분화 관찰

### 10–12주: UI와 운영 루프

- 포럼 프론트엔드 연결
- 회사 루프용 대시보드 초안
- CAMEL 기반 judge/moderator/product-team 보조 에이전트 추가
- 다음 분기 실험 계획 수립

## MiroFish와 OASIS는 이제 무엇인가

이 문서에서 MiroFish와 OASIS는 여전히 중요하지만 역할이 바뀝니다.

### MiroFish

- seed pack 기반 빠른 세계 생성 참고
- 초기 검증 워크플로 참고
- 보고서/상호작용 UX 참고

하지만 메인 아키텍처의 중심으로 두기보다는:

- 빠른 validation tooling 참고 대상

으로 보는 편이 맞습니다.

### OASIS

- 행동 타입
- recommendation 개념
- trace 구조
- 대규모 포럼 시뮬레이션 레퍼런스

를 참고하는 핵심 레퍼런스입니다.

하지만 정체성 분화 엔진 그 자체로 보기보다는:

- 포럼 액션 설계와 환경 메커니즘 참고 대상

으로 두는 편이 더 적합합니다.

## CAMEL의 위치

CAMEL은 메인 월드 엔진이 아닙니다.

대신 아래에 적합합니다.

- moderator agent
- evaluator agent
- company-loop product team
- report generation
- experiment judge

즉 이 프로젝트에서 CAMEL은 사회를 굴리는 코어가 아니라 사회를 분석하고 운영하는 보조 조직에 가깝습니다.

## 결론

당장 구현하려면 아래 순서가 가장 현실적입니다.

1. Concordia로 포럼 세계 엔진을 만들고
2. LangGraph로 라운드 실행 흐름을 만들고
3. Mem0 + Chroma + Neo4j로 기억/관계/성향을 저장하고
4. OASIS를 참고해 피드·반응·추천 로직을 넣고
5. AI Town 구조를 참고해 웹 UI를 붙인다

이 프로젝트의 진짜 차별점은 “에이전트가 검색을 잘하는가”가 아니라,
“에이전트가 편향된 노출과 기억, 관계, 보상 구조 속에서 사람처럼 변해 가는가”에 있습니다.
