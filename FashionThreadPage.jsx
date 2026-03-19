import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  ChevronDown,
  Compass,
  Heart,
  Home,
  MessageCircle,
  PenSquare,
  Repeat2,
  Search,
  Send,
  User,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export const PROMPT_USED = `---
You are simulating a fashion community discussion system around an SNS influencer outfit post.

Goal:
Generate a realistic social thread where random community users discuss the outfit naturally.

Community setup:
A fashion influencer uploads an outfit post.
Multiple random users react with short comments, practical fit analysis, taste-based opinions, criticism, personal experience, and outfit recommendations.

User behavior groups:
- Reactor (8)
- Practical Reviewer (5)
- Taste Commenter (4)
- Critic (3)
- Experience Sharer (2)
- Recommender (2)

Generation rules:
- Total comments: 22 to 28
- Each user speaks no more than 2 times
- Comment length distribution:
  - short reactions: 50%
  - 2-3 sentence opinions: 35%
  - direct styling suggestions: 15%
- Must include:
  - praise
  - disagreement
  - reply chains
  - experience sharing
  - styling recommendations
- Tone should feel like a real fashion forum, not formal AI output

Post:
Seoul Seongsu cafe street outfit photo

Outfit:
black cropped jacket
white t-shirt
wide denim
white sneakers
black crossbody bag

Caption:
"오늘 성수 나들이 룩 ☕
요즘 이런 미니멀 코디 자주 입는데
너무 심심해 보일까?"

Output sections:
1. Original Post
2. Comment Thread
3. Thread Summary
---`;

const threadData = {
  "seongsu-minimal": {
    post: {
      id: "seongsu-minimal",
      author: "outfit.daily.kr",
      handle: "@outfit.daily.kr",
      time: "2m",
      caption:
        "오늘 성수 나들이 룩 ☕\n요즘 이런 미니멀 코디 자주 입는데\n너무 심심해 보일까?",
      image:
        "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80",
      description:
        "black cropped jacket, white t-shirt, wide denim, white sneakers, black crossbody bag",
      vibe: "minimal street style",
      likes: 842,
      replies: 28,
      reposts: 14,
      summary: "가방이 조금 캐주얼하다는 의견이 많고, 전체 밸런스는 좋다는 반응.",
      sampleReplies: ["가방만 바꾸면 더 정리될 듯", "흰 스니커즈라 안 답답해 보여"],
    },
    comments: [
      { id: 1, user: "Mina", handle: "@miiina", avatar: "MN", time: "1m", text: "오 이건 진짜 깔끔하다. 성수 무드랑도 잘 맞음.", likes: 91, type: "Reactor", replyTo: null, liked: false },
      { id: 2, user: "Jisoo", handle: "@fitnote", avatar: "JS", time: "1m", text: "자켓 크롭 길이랑 와이드 데님 밸런스가 좋아 보여. 전신 찍으면 비율 괜찮게 나올 조합임.", likes: 74, type: "Practical Reviewer", replyTo: null, liked: true },
      { id: 3, user: "Rin", handle: "@rin.archive", avatar: "RN", time: "1m", text: "심심하다기보단 정리된 느낌. 가방만 지금보다 덜 캐주얼하면 더 예쁠 듯.", likes: 53, type: "Taste Commenter", replyTo: null, liked: false },
      { id: 4, user: "hae", handle: "@haeday", avatar: "HD", time: "58s", text: "신발 하얀 거라 답답하진 않네", likes: 37, type: "Reactor", replyTo: null, liked: false },
      { id: 5, user: "sena", handle: "@wearlog", avatar: "SE", time: "55s", text: "근데 바지가 너무 넓으면 사진에서 하체가 먼저 보여서 조금 둔해질 수도 있음. 핏만 잘 떨어지면 괜찮아.", likes: 62, type: "Critic", replyTo: null, liked: false },
      { id: 6, user: "Aram", handle: "@aram.jpg", avatar: "AR", time: "51s", text: "나 비슷하게 입고 성수 갔었는데 가방 끈 짧게 올리니까 훨씬 덜 밋밋했음.", likes: 66, type: "Experience Sharer", replyTo: null, liked: false },
      { id: 7, user: "Nayeon", handle: "@graytone", avatar: "NY", time: "49s", text: "맞아 가방이 포인트라기보단 그냥 일상템 느낌이라 살짝 아쉬운 듯", likes: 31, type: "Reactor", replyTo: 3, liked: false },
      { id: 8, user: "d0ri", handle: "@mood_zip", avatar: "DR", time: "47s", text: "나는 오히려 이 정도가 좋아. 액세서리 더하면 바로 힘준 느낌 날 것 같음.", likes: 58, type: "Taste Commenter", replyTo: null, liked: true },
      { id: 9, user: "Ivy", handle: "@ivywears", avatar: "IV", time: "43s", text: "성수 카페 거리 기준이면 무난하게 잘 먹힐 룩. 대신 앉아서 찍을 거면 자켓이랑 가방 겹쳐 보여서 상체가 조금 답답해 보일 수는 있어.", likes: 49, type: "Practical Reviewer", replyTo: null, liked: false },
      { id: 10, user: "Leo", handle: "@leoscloset", avatar: "LE", time: "40s", text: "흰 티가 중간에서 숨통 틔워줘서 괜찮다", likes: 28, type: "Reactor", replyTo: null, liked: false },
      { id: 11, user: "yuu", handle: "@yuu.review", avatar: "YU", time: "37s", text: "심심한 건 아닌데 인상은 좀 안전한 편이긴 함. 사진 남길 거면 귀걸이 하나 정도는 있어도 괜찮을 듯.", likes: 57, type: "Critic", replyTo: null, liked: false },
      { id: 12, user: "Bomi", handle: "@closerlook", avatar: "BO", time: "34s", text: "검정 크롭 자켓이면 상체 라인 정리돼서 사진은 잘 나올 듯. 데님 밑단만 너무 접히지 않으면 됨.", likes: 44, type: "Practical Reviewer", replyTo: null, liked: false },
      { id: 13, user: "Tae", handle: "@tae.zip", avatar: "TA", time: "31s", text: "이거 신발만 회색 계열로 내려도 더 차분하게 붙을 것 같긴 함.", likes: 33, type: "Recommender", replyTo: null, liked: false },
      { id: 14, user: "Mina", handle: "@miiina", avatar: "MN", time: "27s", text: "근데 흰 스니커즈라 사진에서 덜 칙칙할 걸? 난 이건 유지할 듯.", likes: 52, type: "Reactor", replyTo: 13, liked: false },
      { id: 15, user: "Sori", handle: "@soripick", avatar: "SO", time: "26s", text: "나도 위에 동의. 신발까지 어두우면 전체가 너무 잠길 수 있음.", likes: 41, type: "Experience Sharer", replyTo: 13, liked: true },
      { id: 16, user: "Noah", handle: "@marginsfit", avatar: "NO", time: "24s", text: "가방만 바꾸면 훨씬 완성도 있어 보일 조합. 반달형이나 좀 더 플랫한 가죽백이면 결이 맞을 듯.", likes: 39, type: "Recommender", replyTo: null, liked: false },
      { id: 17, user: "Ella", handle: "@ellatone", avatar: "EL", time: "22s", text: "전체적으로 미니멀 스트릿인데 가방만 살짝 캠퍼스 느낌이야. 그래서 조금 덜 세련돼 보이는 듯.", likes: 36, type: "Taste Commenter", replyTo: null, liked: false },
      { id: 18, user: "hoon", handle: "@fithoon", avatar: "HO", time: "20s", text: "다 괜찮은데 바지 폭이 많이 넓으면 신발이 묻힐 수 있음. 그럼 생각보다 다리 짧아 보여.", likes: 42, type: "Practical Reviewer", replyTo: null, liked: false },
      { id: 19, user: "Rin", handle: "@rin.archive", avatar: "RN", time: "18s", text: "맞아 근데 성수 쪽 사진은 배경이 복잡해서 이 정도로 정리된 룩이 오히려 잘 남더라.", likes: 34, type: "Taste Commenter", replyTo: 17, liked: false },
      { id: 20, user: "June", handle: "@juneframe", avatar: "JU", time: "16s", text: "오 예쁨. 딱 꾸안꾸 느낌.", likes: 29, type: "Reactor", replyTo: null, liked: false },
      { id: 21, user: "Yena", handle: "@yenafit", avatar: "YE", time: "14s", text: "사진 잘 나오게만 보면 목선 쪽 포인트 하나 추가하는 게 제일 쉬움. 얇은 실버 목걸이 하나면 충분할 듯.", likes: 46, type: "Recommender", replyTo: 11, liked: false },
      { id: 22, user: "Kai", handle: "@kai.notes", avatar: "KA", time: "12s", text: "이너가 너무 새하얗지만 않으면 좋겠다. 화이트가 튀면 자켓이랑 따로 노는 느낌 날 수도 있음.", likes: 32, type: "Critic", replyTo: null, liked: false },
      { id: 23, user: "d0ri", handle: "@mood_zip", avatar: "DR", time: "10s", text: "결론적으로 심심하진 않고 그냥 안정적임. 사진용으로만 살짝 손보면 되는 정도.", likes: 27, type: "Taste Commenter", replyTo: null, liked: false },
      { id: 24, user: "Haru", handle: "@harulooks", avatar: "HA", time: "8s", text: "나였으면 가방 끈 올리고 데님 밑단 정리하고 끝. 그 정도면 충분히 예쁨.", likes: 35, type: "Recommender", replyTo: null, liked: true },
    ],
    summary: [
      { title: "Overall sentiment", content: "Mostly positive. The thread reads the outfit as clean, safe, and very Seongsu-friendly, with small tweaks suggested for photos." },
      { title: "Top repeated opinions", content: "1. The crossbody bag feels a little too casual.\n2. The wide denim works if the hem stays clean.\n3. White sneakers keep the look from feeling too flat." },
      { title: "Actionable styling suggestions", content: "1. Shorten the bag strap or swap to a sleeker leather shape.\n2. Clean up the denim hem to protect the silhouette.\n3. Add one subtle silver accessory if the goal is better photos without looking overdressed." },
    ],
    collapsedReplyParents: { 13: false },
  },
  "layered-campus": {
    post: {
      id: "layered-campus",
      author: "seoul.fit.memo",
      handle: "@seoul.fit.memo",
      time: "11m",
      caption: "개강룩으로 셔츠 레이어드 자주 입는데\n너무 학생 느낌만 나나 싶음",
      image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80",
      description: "striped shirt, navy knit vest, loose khaki pants, black sneakers",
      vibe: "clean campus layering",
      likes: 516,
      replies: 19,
      reposts: 7,
      summary: "셔츠 길이와 조끼 무드 때문에 학생 느낌이 얼마나 강한지가 쟁점.",
      sampleReplies: ["니트 조끼 없이 가도 될 듯", "팬츠 핏은 진짜 괜찮음"],
    },
    comments: [
      { id: 101, user: "Rae", handle: "@raefits", avatar: "RA", time: "9m", text: "학생 느낌이긴 한데 나쁘진 않음. 그냥 너무 교과서적이라서 그렇지.", likes: 42, type: "Reactor", replyTo: null, liked: false },
      { id: 102, user: "Min", handle: "@fitmin", avatar: "MI", time: "9m", text: "셔츠 밑단 길이만 조금 더 정리되면 훨씬 깔끔할 듯. 지금은 레이어드가 살짝 길게 남아서 비율이 내려가 보여.", likes: 57, type: "Practical Reviewer", replyTo: null, liked: true },
      { id: 103, user: "Lia", handle: "@tonearchive", avatar: "LI", time: "8m", text: "컬러 조합은 괜찮은데 니트 조끼가 너무 모범생 톤으로 가는 느낌 있음.", likes: 39, type: "Taste Commenter", replyTo: null, liked: false },
      { id: 104, user: "Hoon", handle: "@wearhoon", avatar: "HO", time: "8m", text: "신발은 오히려 잘 골랐네", likes: 21, type: "Reactor", replyTo: null, liked: false },
      { id: 105, user: "Nari", handle: "@closetnari", avatar: "NA", time: "7m", text: "나도 비슷하게 입는데 조끼 빼면 훨씬 덜 학생처럼 보임. 셔츠 하나만으로도 충분히 살아.", likes: 48, type: "Experience Sharer", replyTo: null, liked: false },
      { id: 106, user: "Theo", handle: "@theostyle", avatar: "TH", time: "7m", text: "팬츠 핏은 좋은데 상체 정보량이 좀 많아. 위만 살짝 덜어내면 사진에서도 덜 답답할 듯.", likes: 43, type: "Critic", replyTo: null, liked: false },
      { id: 107, user: "Sia", handle: "@siapick", avatar: "SI", time: "6m", text: "ㄴ 맞아 조끼가 핵심인데 동시에 제일 무거운 포인트 같음", likes: 24, type: "Reactor", replyTo: 103, liked: false },
      { id: 108, user: "Bora", handle: "@boraframe", avatar: "BO", time: "6m", text: "셔츠만 남기고 목걸이 추가하면 훨씬 요즘 느낌 날 듯.", likes: 36, type: "Recommender", replyTo: null, liked: true },
      { id: 109, user: "June", handle: "@junememo", avatar: "JU", time: "5m", text: "근데 개강룩이면 좀 학생 느낌 나는 게 오히려 자연스럽지 않나. 너무 뺄 필요는 없어 보임.", likes: 33, type: "Taste Commenter", replyTo: null, liked: false },
      { id: 110, user: "Eun", handle: "@eunwear", avatar: "EU", time: "5m", text: "셔츠 소매 롤업하면 분위기 훨씬 달라질 듯", likes: 27, type: "Recommender", replyTo: null, liked: false },
    ],
    summary: [
      { title: "Overall sentiment", content: "반응은 호의적이지만 조끼 때문에 학생 느낌이 강해진다는 의견이 가장 자주 나왔다." },
      { title: "Top repeated opinions", content: "1. 셔츠와 팬츠 비율은 괜찮다.\n2. 니트 조끼가 너무 모범생 무드로 간다.\n3. 신발은 현재 조합에 잘 맞는다." },
      { title: "Actionable styling suggestions", content: "1. 니트 조끼를 빼거나 얇은 아우터로 교체하기.\n2. 셔츠 밑단 길이를 정리하기.\n3. 소매 롤업이나 얇은 액세서리로 무드 조정하기." },
    ],
    collapsedReplyParents: { 103: false },
  },
  "black-blazer-date": {
    post: {
      id: "black-blazer-date",
      author: "closet.weather",
      handle: "@closet.weather",
      time: "24m",
      caption: "검정 블레이저에 버뮤다 팬츠 조합\n데이트룩으로 무난한지 의견 좀",
      image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=80",
      description: "black blazer, ivory tee, bermuda pants, loafers",
      vibe: "sharp casual",
      likes: 291,
      replies: 23,
      reposts: 4,
      summary: "상의는 호평인데 버뮤다 팬츠 때문에 호불호가 갈리는 데이트룩 토론.",
      sampleReplies: ["로퍼면 훨씬 정리될 듯", "지금도 나쁘진 않은데 조금 애매"],
    },
    comments: [
      { id: 201, user: "Moe", handle: "@moereview", avatar: "MO", time: "21m", text: "상의는 진짜 깔끔한데 하의 길이가 제일 애매함.", likes: 51, type: "Critic", replyTo: null, liked: false },
      { id: 202, user: "Yul", handle: "@yulnote", avatar: "YU", time: "21m", text: "데이트룩으로는 충분히 괜찮은 편. 버뮤다가 조금만 더 슬림하면 훨씬 정리될 듯.", likes: 44, type: "Practical Reviewer", replyTo: null, liked: true },
      { id: 203, user: "Nina", handle: "@nina.archive", avatar: "NI", time: "20m", text: "로퍼라서 겨우 균형 잡히는 느낌. 스니커즈였으면 훨씬 애매했을 듯.", likes: 38, type: "Taste Commenter", replyTo: null, liked: false },
      { id: 204, user: "J", handle: "@jfit", avatar: "JF", time: "20m", text: "오히려 버뮤다 재밌는데", likes: 22, type: "Reactor", replyTo: null, liked: false },
      { id: 205, user: "Dain", handle: "@dainwear", avatar: "DA", time: "18m", text: "나 비슷하게 입었을 때 하의 폭 줄이니까 훨씬 반응 좋았음. 블레이저가 이미 포멀해서 하의까지 넓으면 힘이 분산되더라.", likes: 46, type: "Experience Sharer", replyTo: null, liked: false },
      { id: 206, user: "Kyo", handle: "@kyo.style", avatar: "KY", time: "17m", text: "버뮤다 유지할 거면 양말 노출을 좀 더 의도적으로 가야 할 듯. 지금은 중간이 비어 보여.", likes: 34, type: "Recommender", replyTo: null, liked: false },
      { id: 207, user: "Rin", handle: "@rinframe", avatar: "RI", time: "16m", text: "데이트룩 기준으론 살짝 실험적인 편이긴 해", likes: 25, type: "Reactor", replyTo: null, liked: false },
      { id: 208, user: "Suu", handle: "@suucloset", avatar: "SU", time: "16m", text: "ㄴ 맞긴 한데 성수 쪽이면 이 정도는 충분히 소화되는 범위 같음", likes: 29, type: "Taste Commenter", replyTo: 207, liked: false },
      { id: 209, user: "Roa", handle: "@roapick", avatar: "RO", time: "15m", text: "하의를 롱 슬랙스로 바꾸면 훨씬 안정적이고, 지금 버전은 취향 타는 쪽.", likes: 41, type: "Recommender", replyTo: null, liked: true },
    ],
    summary: [
      { title: "Overall sentiment", content: "블레이저 상의는 호평이지만 버뮤다 팬츠 때문에 호불호가 갈린 스레드다." },
      { title: "Top repeated opinions", content: "1. 상의와 로퍼 조합은 좋다.\n2. 버뮤다 길이와 폭이 가장 애매하다.\n3. 데이트룩으로는 약간 실험적이라는 반응이 있다." },
      { title: "Actionable styling suggestions", content: "1. 버뮤다 폭을 줄이거나 롱 슬랙스로 교체하기.\n2. 양말 노출을 의도적으로 조정하기.\n3. 포멀 무드를 유지하려면 신발은 로퍼 계열 유지하기." },
    ],
    collapsedReplyParents: {},
  },
  "vintage-hoodie": {
    post: {
      id: "vintage-hoodie",
      author: "vibe.archive",
      handle: "@vibe.archive",
      time: "39m",
      caption: "빈티지 후드에 카고 팬츠 입었는데\n힙한 건지 그냥 복잡한 건지 모르겠음",
      image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80",
      description: "vintage hoodie, cargo pants, cap, chunky sneakers",
      vibe: "vintage utilitarian",
      likes: 403,
      replies: 26,
      reposts: 9,
      summary: "컬러는 재밌지만 실루엣과 디테일이 너무 많다는 반응이 섞여 있음.",
      sampleReplies: ["후드 색은 예쁜데 하의가 센 듯", "모자 빼면 더 낫겠는데"],
    },
    comments: [
      { id: 301, user: "Luna", handle: "@lunafit", avatar: "LU", time: "35m", text: "힙하긴 한데 요소가 좀 많긴 함", likes: 47, type: "Reactor", replyTo: null, liked: false },
      { id: 302, user: "Ben", handle: "@benreview", avatar: "BE", time: "34m", text: "후드 색은 예쁜데 카고 포켓이랑 모자까지 겹치니까 시선이 분산됨. 실루엣보다 디테일이 먼저 보여.", likes: 52, type: "Critic", replyTo: null, liked: true },
      { id: 303, user: "Yuri", handle: "@yuritone", avatar: "YU", time: "34m", text: "빈티지 무드는 살아 있는데 한 벌 안에서 서로 경쟁하는 느낌은 있음.", likes: 35, type: "Taste Commenter", replyTo: null, liked: false },
      { id: 304, user: "Chan", handle: "@chanlog", avatar: "CH", time: "33m", text: "카고만 조금 덜 부하면 괜찮아질 듯", likes: 24, type: "Reactor", replyTo: null, liked: false },
      { id: 305, user: "Mira", handle: "@miraarchive", avatar: "MR", time: "32m", text: "나도 이런 식으로 입다가 모자 빼니까 훨씬 정리됐었음. 하나만 덜어내도 분위기 유지되더라.", likes: 43, type: "Experience Sharer", replyTo: null, liked: false },
      { id: 306, user: "Sion", handle: "@sionfit", avatar: "SN", time: "31m", text: "신발도 청키해서 전체 부피감이 더 커 보이는 듯. 실루엣만 보면 아래가 꽤 무거워.", likes: 39, type: "Practical Reviewer", replyTo: null, liked: false },
      { id: 307, user: "Ona", handle: "@ona.pick", avatar: "ON", time: "30m", text: "모자 빼고 신발만 얇은 거로 바꾸면 훨씬 덜 복잡할 것 같아.", likes: 37, type: "Recommender", replyTo: null, liked: true },
      { id: 308, user: "Jun", handle: "@junvibe", avatar: "JN", time: "29m", text: "근데 복잡해서 재밌는 코디이기도 함. 너무 정리하면 맛이 빠질 수도 있음.", likes: 28, type: "Taste Commenter", replyTo: null, liked: false },
      { id: 309, user: "Ari", handle: "@arireacts", avatar: "AR", time: "28m", text: "ㄴ 이건 맞음. 다만 사진 기준이면 조금 덜어내는 게 낫긴 할 듯", likes: 26, type: "Reactor", replyTo: 308, liked: false },
    ],
    summary: [
      { title: "Overall sentiment", content: "재미있는 코디라는 반응과 복잡하다는 반응이 동시에 나오는 편이다." },
      { title: "Top repeated opinions", content: "1. 후드 컬러 자체는 좋다.\n2. 모자, 카고, 신발까지 겹치며 복잡해진다.\n3. 한두 요소만 덜어내면 더 보기 좋아질 수 있다." },
      { title: "Actionable styling suggestions", content: "1. 모자를 빼서 상단 정보를 줄이기.\n2. 청키한 신발 대신 더 얇은 실루엣 선택하기.\n3. 카고 팬츠 볼륨을 낮춰 전체 균형 맞추기." },
    ],
    collapsedReplyParents: {},
  },
};

const feedPosts = Object.values(threadData).map((thread) => thread.post);

const typeStyle = {
  Reactor: "text-zinc-400",
  "Practical Reviewer": "text-zinc-300",
  "Taste Commenter": "text-zinc-300",
  Critic: "text-zinc-300",
  "Experience Sharer": "text-zinc-300",
  Recommender: "text-zinc-200",
};

function formatCount(value) {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return `${value}`;
}

function authorInitials(author) {
  return author
    .split(".")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 2);
}

function Avatar({ initials, accent = "from-zinc-400 to-zinc-600" }) {
  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${accent} text-xs font-semibold tracking-wide text-white`}
    >
      {initials}
    </div>
  );
}

function ActionButton({ icon: Icon, label, active, onClick }) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 text-sm transition ${
        active ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
      }`}
      type="button"
    >
      <Icon className={`h-[18px] w-[18px] ${active ? "fill-current" : ""}`} />
      <span className="hidden sm:inline">{label}</span>
    </motion.button>
  );
}

function ThreadItem({
  comment,
  replies,
  depth = 0,
  expandedReplies,
  onToggleReplies,
  onToggleLike,
  replyOpenId,
  onToggleReply,
}) {
  const hasHiddenReplies = replies.length > 1 && !expandedReplies[comment.id];
  const visibleReplies =
    replies.length > 1 && !expandedReplies[comment.id] ? replies.slice(0, 1) : replies;

  return (
    <div className={`${depth > 0 ? "ml-7 border-l border-zinc-800 pl-5" : ""}`}>
      <div className="flex gap-3">
        <div className="relative flex flex-col items-center">
          <Avatar initials={comment.avatar} />
          {((replies.length > 0 && depth === 0) || depth > 0) && (
            <div className="mt-2 h-full min-h-6 w-px bg-zinc-800" />
          )}
        </div>
        <div className="min-w-0 flex-1 pb-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-zinc-100">{comment.user}</span>
              <span className="truncate text-sm text-zinc-500">{comment.handle}</span>
              <span className="text-sm text-zinc-600">{comment.time}</span>
            </div>
            <p className="mt-1 text-[15px] leading-6 text-zinc-200">{comment.text}</p>
            <p className={`mt-2 text-xs ${typeStyle[comment.type]}`}>{comment.type}</p>
          </div>

          <div className="mt-3 flex items-center gap-1 text-zinc-400">
            <ActionButton
              icon={Heart}
              label={formatCount(comment.likes)}
              active={comment.liked}
              onClick={() => onToggleLike(comment.id)}
            />
            <ActionButton
              icon={MessageCircle}
              label="Reply"
              active={replyOpenId === comment.id}
              onClick={() => onToggleReply(comment.id)}
            />
            <ActionButton icon={Repeat2} label="Repost" />
            <ActionButton icon={Send} label="Share" />
          </div>

          <AnimatePresence initial={false}>
            {replyOpenId === comment.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3">
                  <div className="flex items-start gap-3">
                    <Avatar initials="YU" accent="from-zinc-600 to-zinc-800" />
                    <div className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-500">
                      Reply to {comment.user}...
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-black transition hover:bg-zinc-200"
                    >
                      Post
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {visibleReplies.length > 0 && (
            <div className="mt-4 space-y-0">
              {visibleReplies.map((reply) => (
                <ThreadItem
                  key={reply.id}
                  comment={reply}
                  replies={[]}
                  depth={depth + 1}
                  expandedReplies={expandedReplies}
                  onToggleReplies={onToggleReplies}
                  onToggleLike={onToggleLike}
                  replyOpenId={replyOpenId}
                  onToggleReply={onToggleReply}
                />
              ))}
            </div>
          )}

          {hasHiddenReplies && (
            <button
              type="button"
              onClick={() => onToggleReplies(comment.id)}
              className="mt-1 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-300"
            >
              <span className="ml-1 h-px w-6 bg-zinc-700" />
              Show more replies ({replies.length - 1})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FashionThreadPage() {
  const [selectedThreadId, setSelectedThreadId] = useState("seongsu-minimal");
  const [commentsByThread, setCommentsByThread] = useState(
    Object.fromEntries(Object.entries(threadData).map(([id, thread]) => [id, thread.comments])),
  );
  const [postLiked, setPostLiked] = useState(false);
  const [postReplyOpen, setPostReplyOpen] = useState(false);
  const [replyOpenId, setReplyOpenId] = useState(null);
  const [expandedReplies, setExpandedReplies] = useState({ 13: false });
  const [promptOpen, setPromptOpen] = useState(false);
  const [view, setView] = useState("feed");

  const activeThread = threadData[selectedThreadId];
  const activePost = activeThread.post;
  const comments = commentsByThread[selectedThreadId];

  const { roots, repliesByParent } = useMemo(() => {
    const rootsList = comments.filter((comment) => comment.replyTo === null);
    const replyMap = comments
      .filter((comment) => comment.replyTo !== null)
      .reduce((acc, comment) => {
        acc[comment.replyTo] = acc[comment.replyTo] || [];
        acc[comment.replyTo].push(comment);
        return acc;
      }, {});

    return { roots: rootsList, repliesByParent: replyMap };
  }, [comments]);

  const openThread = (threadId) => {
    setSelectedThreadId(threadId);
    setView("thread");
    setReplyOpenId(null);
    setPostReplyOpen(false);
    setPromptOpen(false);
    setPostLiked(false);
    setExpandedReplies(threadData[threadId].collapsedReplyParents);
  };

  const toggleCommentLike = (id) => {
    setCommentsByThread((current) => ({
      ...current,
      [selectedThreadId]: current[selectedThreadId].map((comment) =>
        comment.id === id
          ? {
              ...comment,
              liked: !comment.liked,
              likes: comment.liked ? comment.likes - 1 : comment.likes + 1,
            }
          : comment,
      ),
    }));
  };

  const toggleReplyBox = (id) => {
    setReplyOpenId((current) => (current === id ? null : id));
  };

  const showPrompt = selectedThreadId === "seongsu-minimal";

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="sticky top-0 z-20 border-b border-zinc-800/80 bg-black/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {view === "thread" ? (
              <button
                type="button"
                onClick={() => setView("feed")}
                className="rounded-full border border-zinc-800 bg-zinc-900 p-2 transition hover:bg-zinc-800"
              >
                <ArrowLeft className="h-4 w-4 text-zinc-300" />
              </button>
            ) : (
              <div className="rounded-full border border-zinc-800 bg-zinc-900 p-2">
                <Search className="h-4 w-4 text-zinc-500" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold tracking-tight text-zinc-100">AI Fashion Forum</p>
              <p className="text-xs text-zinc-500">{view === "feed" ? "For you" : "Thread view"}</p>
            </div>
          </div>
          <div className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400">
            {view === "feed" ? `${feedPosts.length} live threads` : `${activePost.replies} replies`}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-3 pb-16 pt-4 sm:px-4">
        {view === "feed" && (
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-4"
          >
            <div className="overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-950/80">
              <div className="border-b border-zinc-800 px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">Today’s outfit threads</p>
                    <p className="mt-1 text-sm leading-6 text-zinc-500">
                      실제 커뮤니티처럼 짧은 반응, 핏 분석, 취향 충돌이 쌓이는 패션 토론 피드.
                    </p>
                  </div>
                  <div className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
                    Threads-inspired
                  </div>
                </div>
              </div>

              <div className="px-2 py-2">
                {feedPosts.map((post, index) => (
                  <motion.button
                    key={post.id}
                    type="button"
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.995 }}
                    onClick={() => openThread(post.id)}
                    className="flex w-full gap-3 rounded-[24px] px-3 py-4 text-left transition hover:bg-white/[0.03]"
                  >
                    <div className="relative flex flex-col items-center">
                      <Avatar
                        initials={authorInitials(post.author)}
                        accent={index % 2 === 0 ? "from-zinc-500 to-zinc-700" : "from-zinc-600 to-zinc-800"}
                      />
                      {index !== feedPosts.length - 1 && <div className="mt-2 h-full w-px bg-zinc-800" />}
                    </div>

                    <div className="min-w-0 flex-1 border-b border-zinc-900 pb-4">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-zinc-100">{post.author}</span>
                        {post.id === "seongsu-minimal" && (
                          <BadgeCheck className="h-4 w-4 fill-sky-400 text-sky-300" />
                        )}
                        <span className="truncate text-sm text-zinc-500">{post.handle}</span>
                        <span className="text-sm text-zinc-600">{post.time}</span>
                      </div>

                      <p className="mt-2 line-clamp-3 whitespace-pre-line text-[15px] leading-6 text-zinc-100">
                        {post.caption}
                      </p>

                      <div className="mt-3 grid grid-cols-[1fr_auto] gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap gap-2">
                            {post.sampleReplies.map((reply) => (
                              <span
                                key={reply}
                                className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-300"
                              >
                                {reply}
                              </span>
                            ))}
                          </div>
                          <p className="mt-3 text-sm leading-6 text-zinc-500">{post.summary}</p>
                          <div className="mt-3 flex items-center gap-4 text-sm text-zinc-500">
                            <span>{formatCount(post.likes)} likes</span>
                            <span>{post.replies} replies</span>
                            <span>{post.reposts} reposts</span>
                          </div>
                        </div>
                        <img
                          src={post.image}
                          alt={post.vibe}
                          className="h-24 w-24 rounded-2xl border border-zinc-800 object-cover sm:h-28 sm:w-28"
                        />
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-zinc-800 bg-zinc-950/80 px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-zinc-100">Why people come back</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    짧은 반응으로 들어오고, 요약 카드 때문에 나중에 다시 참고할 수 있게 설계.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openThread("seongsu-minimal")}
                  className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200"
                >
                  Open featured thread
                </button>
              </div>
            </div>
          </motion.section>
        )}

        {view === "thread" && (
          <>
            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-950/80 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]"
            >
              <div className="border-b border-zinc-800 px-4 py-4 sm:px-5">
                <div className="flex items-start gap-3">
                  <Avatar initials={authorInitials(activePost.author)} accent="from-zinc-500 to-zinc-700" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-zinc-100">{activePost.author}</span>
                      {selectedThreadId === "seongsu-minimal" && (
                        <BadgeCheck className="h-4 w-4 fill-sky-400 text-sky-300" />
                      )}
                      <span className="truncate text-sm text-zinc-500">{activePost.handle}</span>
                      <span className="text-sm text-zinc-600">{activePost.time}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-[15px] leading-6 text-zinc-100">
                      {activePost.caption}
                    </p>

                    <div className="mt-4 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">
                      <div className="relative">
                        <img
                          src={activePost.image}
                          alt={activePost.vibe}
                          className="h-[420px] w-full object-cover sm:h-[560px]"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/50 to-transparent p-4">
                          <div className="flex flex-wrap gap-2">
                            {activePost.description.split(",").map((tag) => (
                              <span
                                key={tag.trim()}
                                className="rounded-full border border-white/10 bg-black/50 px-3 py-1 text-xs text-zinc-200 backdrop-blur-sm"
                              >
                                {tag.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-1 text-zinc-400">
                      <ActionButton
                        icon={Heart}
                        label={formatCount(postLiked ? activePost.likes + 1 : activePost.likes)}
                        active={postLiked}
                        onClick={() => setPostLiked((current) => !current)}
                      />
                      <ActionButton
                        icon={MessageCircle}
                        label={formatCount(activePost.replies)}
                        active={postReplyOpen}
                        onClick={() => setPostReplyOpen((current) => !current)}
                      />
                      <ActionButton icon={Repeat2} label={formatCount(activePost.reposts)} />
                      <ActionButton icon={Send} label="Share" />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-zinc-500">
                      <span>{activePost.likes} likes</span>
                      <span>{activePost.replies} replies</span>
                      <span>{activePost.reposts} reposts</span>
                      <span className="text-zinc-600">Vibe: {activePost.vibe}</span>
                    </div>

                    <AnimatePresence initial={false}>
                      {postReplyOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 rounded-3xl border border-zinc-800 bg-black/60 p-3">
                            <div className="flex items-start gap-3">
                              <Avatar initials="ME" accent="from-zinc-700 to-zinc-900" />
                              <div className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-500">
                                Add a reply about fit, vibe, or styling...
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              <div className="px-4 py-2 sm:px-5">
                <div className="border-b border-zinc-900 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Conversation</p>
                </div>

                <motion.div
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: { opacity: 0 },
                    show: { opacity: 1, transition: { staggerChildren: 0.03 } },
                  }}
                  className="pt-3"
                >
                  {roots.map((comment) => (
                    <motion.div
                      key={comment.id}
                      variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                    >
                      <ThreadItem
                        comment={comment}
                        replies={repliesByParent[comment.id] || []}
                        expandedReplies={expandedReplies}
                        onToggleReplies={(id) =>
                          setExpandedReplies((current) => ({ ...current, [id]: !current[id] }))
                        }
                        onToggleLike={toggleCommentLike}
                        replyOpenId={replyOpenId}
                        onToggleReply={toggleReplyBox}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.35 }}
              className="mt-4 rounded-[28px] border border-zinc-800 bg-zinc-950/80 p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-zinc-100">Thread Summary</p>
                  <p className="text-sm text-zinc-500">AI digest of the discussion</p>
                </div>
                <div className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400">
                  {comments.length} comments
                </div>
              </div>

              <div className="grid gap-3">
                {activeThread.summary.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                    <p className="text-sm font-medium text-zinc-100">{item.title}</p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-400">
                      {item.content}
                    </p>
                  </div>
                ))}
              </div>
            </motion.section>

            {showPrompt && (
              <section className="mt-4 rounded-[28px] border border-zinc-800 bg-zinc-950/80">
                <button
                  type="button"
                  onClick={() => setPromptOpen((current) => !current)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-white/[0.02]"
                >
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">View generation prompt</p>
                    <p className="text-sm text-zinc-500">Source prompt used to simulate the thread</p>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-zinc-500 transition ${promptOpen ? "rotate-180" : ""}`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {promptOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden border-t border-zinc-800"
                    >
                      <div className="p-5">
                        <pre className="overflow-x-auto rounded-3xl border border-zinc-800 bg-black p-4 text-xs leading-6 text-zinc-400">
                          <code>{PROMPT_USED}</code>
                        </pre>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            )}
          </>
        )}
      </main>

      <div className="sticky bottom-0 z-20 border-t border-zinc-800/80 bg-black/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-around px-6 py-3">
          <button
            type="button"
            onClick={() => setView("feed")}
            className={`rounded-full p-2 transition ${view === "feed" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-200"}`}
          >
            <Home className="h-5 w-5" />
          </button>
          <button type="button" className="rounded-full p-2 text-zinc-500 transition hover:text-zinc-200">
            <Compass className="h-5 w-5" />
          </button>
          <button type="button" className="rounded-full bg-white p-3 text-black transition hover:bg-zinc-200">
            <PenSquare className="h-5 w-5" />
          </button>
          <button type="button" className="rounded-full p-2 text-zinc-500 transition hover:text-zinc-200">
            <Heart className="h-5 w-5" />
          </button>
          <button type="button" className="rounded-full p-2 text-zinc-500 transition hover:text-zinc-200">
            <User className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
