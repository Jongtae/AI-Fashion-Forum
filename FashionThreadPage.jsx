import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Bookmark,
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

export const PROMPT_USED = `Finalize first 20 high-fidelity mock topics for AI Fashion Forum

Goal:
Create a high-fidelity mock feed and thread set that feels like a real domestic/minimal fashion community product.

Mock direction:
- domestic / minimal-heavy
- higher female user ratio
- real brand names used actively
- focus on core social thread scene types

Core scene types:
- 오늘 내 코디 어떤지 봐줘
- 이 제품 살지 말지
- 사이즈/핏 도움 요청
- 실착해보니 생각과 달랐던 후기
- 무드/분위기는 좋은데 어딘가 어색한 코디

Brand set:
RECTO, AMOMENTO, LOW CLASSIC, LE 17 SEPTEMBRE, MARGE SHERWOOD,
AND YOU, COS, INSILENCE WOMEN, THEOPEN PRODUCT

Comment rules:
- not overly polished
- more correction advice, price-value judgment, real usage reflection
- repeated signals:
  - pants fit
  - inner tone
  - jacket length
  - shoulder line
  - price value
  - material feel
  - product photo vs real wear gap
  - brand mood vs real satisfaction
`;

const IMAGE_POOL = [
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80",
];

const TYPE_LABEL = {
  outfit: "오늘 내 코디 어떤지 봐줘",
  awkward: "무드/분위기는 좋은데 어딘가 어색한 코디",
  buy: "이 제품 살지 말지",
  size: "사이즈/핏 도움 요청",
  review: "실착해보니 생각과 달랐던 후기",
};

const TOPICS = [
  {
    id: "T01",
    type: "outfit",
    title: "출근룩인데 팬츠가 너무 끊겨 보이나",
    hook: "르917 자켓이랑 슬랙스 맞췄는데 발목에서 핏이 애매한지 봐줘",
    brands: ["LE 17 SEPTEMBRE", "COS"],
    description: "cropped blazer, straight slacks, black loafers, compact work bag",
    debate: "팬츠 길이, 신발 선택, 비율",
    expected: "전체는 괜찮은데 신발 때문에 다 끊김",
    sourceMix: "C+B",
    tone: "출근룩",
  },
  {
    id: "T02",
    type: "outfit",
    title: "아워글래스 실루엣 노렸는데 과한가",
    hook: "앤유 블레이저에 플리츠 스커트 입었는데 너무 힘준 느낌인지 궁금",
    brands: ["AND YOU", "AMOMENTO"],
    description: "structured blazer, pleated midi skirt, low heels, mini shoulder bag",
    debate: "상하 밸런스, 포멀 과함",
    expected: "출근룩으론 예쁜데 데일리치곤 힘줌",
    sourceMix: "C+B",
    tone: "세미포멀",
  },
  {
    id: "T03",
    type: "outfit",
    title: "올블랙인데 심심한지 세련된지",
    hook: "아모멘토 니트에 블랙 와이드 팬츠인데 너무 무난한가",
    brands: ["AMOMENTO"],
    description: "black knit, wide pants, black belt, silver earrings",
    debate: "무채색 무드, 포인트 부족",
    expected: "가방이나 슈즈 하나만 바꾸면 산다",
    sourceMix: "C+B",
    tone: "미니멀 캐주얼",
  },
  {
    id: "T04",
    type: "outfit",
    title: "미니멀로 입었는데 체형상 부해 보이나",
    hook: "르메르 무드로 맞춘다고 했는데 상체가 커 보인다는 말 들음",
    brands: ["LOW CLASSIC", "Lemaire mood"],
    description: "boxy shirt jacket, wide trousers, soft leather flats",
    debate: "오버핏 상체, 체형 대비 부피",
    expected: "핏 자체보다 소재감이 더 둔해 보임",
    sourceMix: "C+B",
    tone: "르메르 무드",
  },
  {
    id: "T05",
    type: "awkward",
    title: "무드는 있는데 신발이 다 망친 룩인지",
    hook: "이 착장 저장은 많이 했는데 막상 입으니 밑에서 뜨는 느낌",
    brands: ["RECTO", "MARGE SHERWOOD"],
    description: "cotton shirt, long skirt, glossy loafers, sculptural bag",
    debate: "슈즈 미스, 하체 무게감",
    expected: "로퍼 말고 스니커즈나 메리제인 갔어야 함",
    sourceMix: "C+B",
    tone: "무드 저장룩",
  },
  {
    id: "T06",
    type: "awkward",
    title: "셔츠-데님 조합인데 너무 평범하게 끝남",
    hook: "분위기는 괜찮은데 왜 안 살아 보이는지 모르겠음",
    brands: ["LOW CLASSIC", "MUSINSA STANDARD WOMAN"],
    description: "pale blue shirt, straight denim, white flats, black shoulder bag",
    debate: "실루엣 심심함, 악세서리 부재",
    expected: "핏보다 컬러 온도가 애매함",
    sourceMix: "C+B",
    tone: "데일리 캐주얼",
  },
  {
    id: "T07",
    type: "awkward",
    title: "자켓은 예쁜데 이너 때문에 촌스러운지",
    hook: "이너만 바꾸면 괜찮을지, 아니면 자켓 핏 자체가 문제인지",
    brands: ["THEOPEN PRODUCT"],
    description: "cropped jacket, printed inner top, straight skirt, ankle boots",
    debate: "이너 톤, 넥라인, 자켓 길이",
    expected: "이너 문제 70, 자켓 어깨선 30",
    sourceMix: "C+B",
    tone: "실험적 미니멀",
  },
  {
    id: "T08",
    type: "buy",
    title: "아모멘토 셔츠 가격값 하는지",
    hook: "이 셔츠 계속 장바구니에 있는데 20만원대 값 하는지 모르겠음",
    brands: ["AMOMENTO"],
    description: "oversized shirt, crisp cotton, boxy shoulder line",
    debate: "가격값, 원단 체감, 대체 가능성",
    expected: "핏은 예쁜데 이 가격은 브랜드값 포함",
    sourceMix: "A+E+B",
    tone: "쇼핑 고민",
  },
  {
    id: "T09",
    type: "buy",
    title: "렉토 팬츠 하나면 봄 시즌 끝나는지",
    hook: "렉토 슬랙스 핏 예쁜데 코스나 인사일런스랑 차이 체감될까",
    brands: ["RECTO", "COS", "INSILENCE WOMEN"],
    description: "straight slacks, slight flare, muted charcoal tone",
    debate: "브랜드 프리미엄, 핏 차이",
    expected: "옷 좋아하는 사람은 알지만 가성비는 아님",
    sourceMix: "A+E+B",
    tone: "브랜드 비교",
  },
  {
    id: "T10",
    type: "buy",
    title: "마지셔우드 가방은 유행 지난 건지",
    hook: "예전만큼 안 보이는 것 같아서 지금 사면 늦은 건가 고민",
    brands: ["MARGE SHERWOOD"],
    description: "mini shoulder bag, glossy leather, curved shape",
    debate: "유행 피로감, 실사용성",
    expected: "완전 끝난 건 아닌데 포인트용으론 애매",
    sourceMix: "A+E+B",
    tone: "유행 피로감",
  },
  {
    id: "T11",
    type: "buy",
    title: "로우클래식 블레이저 입문용으로 괜찮나",
    hook: "첫 도메스틱 자켓으로 사고 싶은데 너무 정석이라 재미없는지",
    brands: ["LOW CLASSIC"],
    description: "single blazer, sharp shoulder, neutral taupe",
    debate: "입문 브랜드, 정석 vs 심심함",
    expected: "실패는 없는데 설레는 맛은 덜함",
    sourceMix: "A+E+B",
    tone: "입문용 고민",
  },
  {
    id: "T12",
    type: "buy",
    title: "앤유 원피스는 실물 만족도 높은 편인지",
    hook: "사진은 너무 예쁜데 실제로 입으면 애매하다는 말이 있던데",
    brands: ["AND YOU"],
    description: "slim dress, soft drape, narrow straps",
    debate: "제품컷 환상, 실착 만족도",
    expected: "사진빨은 좋은데 체형 많이 탐",
    sourceMix: "A+D+B",
    tone: "실물 궁금",
  },
  {
    id: "T13",
    type: "size",
    title: "렉토 팬츠 1이냐 2냐",
    hook: "허리는 맞는데 힙이랑 기장이 걱정돼서 사이즈 못 고르겠음",
    brands: ["RECTO"],
    description: "tailored pants, low crease, long hem",
    debate: "허리-힙 괴리, 기장감",
    expected: "정사이즈보다 한 업 추천",
    sourceMix: "B+A+D",
    tone: "사이즈 고민",
  },
  {
    id: "T14",
    type: "size",
    title: "코스 셔츠 드롭숄더가 부해 보이는지",
    hook: "원래 낙낙하게 입는 맛인 건 아는데 상체 커 보일까 봐 고민",
    brands: ["COS"],
    description: "drop shoulder shirt, dense cotton, crisp cuff",
    debate: "어깨선, 상체 부피, 소재 뻣뻣함",
    expected: "여리한 핏 기대하면 비추천",
    sourceMix: "B+A+D",
    tone: "핏 질문",
  },
  {
    id: "T15",
    type: "size",
    title: "슬림 부츠컷이 아직 유효한지",
    hook: "다들 와이드 입는데 내 체형엔 부츠컷이 나은 것 같아서",
    brands: ["LOW CLASSIC", "RECTO"],
    description: "slim bootcut pants, fitted knit, pointed shoes",
    debate: "유행 vs 체형 최적화",
    expected: "트렌드보다 본인 비율 맞는 게 더 중요",
    sourceMix: "B+A",
    tone: "트렌드 질문",
  },
  {
    id: "T16",
    type: "size",
    title: "르917 코트 44/55 경계 사이즈 질문",
    hook: "오버핏으로 가야 예쁜지, 정핏으로 가야 덜 부해 보이는지",
    brands: ["LE 17 SEPTEMBRE"],
    description: "long wool coat, strong shoulder, narrow lapel",
    debate: "오버핏 미학, 체형 한계",
    expected: "이 브랜드는 애매한 사이즈면 오히려 정핏이 나음",
    sourceMix: "B+A+D",
    tone: "코트 핏 고민",
  },
  {
    id: "T17",
    type: "review",
    title: "아모멘토 니트 예쁜데 보풀 생각보다 빨리 옴",
    hook: "딱 세 번 입었는데 벌써 사용감 보여서 살짝 식음",
    brands: ["AMOMENTO"],
    description: "soft knit, brushed texture, loose sleeve",
    debate: "소재 기대치, 가격 대비 내구성",
    expected: "예쁜 대신 관리비 드는 옷",
    sourceMix: "D+A+B",
    tone: "실착 후기",
  },
  {
    id: "T18",
    type: "review",
    title: "마지셔우드 백 수납이 너무 애매함",
    hook: "들고 나가면 예쁜데 정작 손이 잘 안 감",
    brands: ["MARGE SHERWOOD"],
    description: "compact bag, glossy leather, narrow opening",
    debate: "실사용성 vs 디자인",
    expected: "사진용 만족도는 높은데 데일리는 아님",
    sourceMix: "D+A+B",
    tone: "구매 후 냉정해짐",
  },
  {
    id: "T19",
    type: "review",
    title: "로우클래식 셔츠 실물은 좋은데 손이 안 감",
    hook: "옷은 예쁜데 내가 가진 하의들이랑 은근 안 붙음",
    brands: ["LOW CLASSIC"],
    description: "structured shirt, slightly wide sleeve, ivory tone",
    debate: "코디 난이도, 활용도",
    expected: "좋은 옷이랑 잘 입히는 옷은 다름",
    sourceMix: "D+A+B",
    tone: "활용도 후기",
  },
  {
    id: "T20",
    type: "review",
    title: "코스 울 블렌드 니트 생각보다 까슬한 편",
    hook: "후기 믿고 샀는데 맨살엔 못 입겠어서 약간 후회 중",
    brands: ["COS"],
    description: "wool blend knit, dry texture, clean neckline",
    debate: "촉감, 후기 신뢰, 레이어드 전제",
    expected: "예민 피부면 무조건 이너 필요",
    sourceMix: "D+A+B",
    tone: "후기 검증",
  },
];

const SOURCE_LIBRARY = {
  lowclassic_blazer: {
    title: "LOW CLASSIC CLASSIC BLAZER_BLACK",
    price: "399,000원",
    note: "공식몰 기준 세미 오버핏 싱글 버튼 재킷, 자연스러운 드롭 숄더와 플란넬 라펠 배색 디테일.",
    url: "https://www.lowclassic.com/product/classic-blazerblack/10471/",
    source: "LOW CLASSIC official",
  },
  lowclassic_trouser: {
    title: "LOW CLASSIC LOW RISE TROUSER - BEIGE",
    price: "258,000원",
    note: "공식몰 기준 허리밴드리스 디자인, 우아한 핀턱라인과 울 30 / 폴리에스터 70 구성.",
    url: "https://www.lowclassic.com/product/low-rise-trouser-beige/8509/",
    source: "LOW CLASSIC official",
  },
  lowclassic_pants: {
    title: "LOW CLASSIC WASHED COTTON PANTS - CHARCOAL",
    price: "158,000원",
    note: "공식몰 기준 코튼 100, 워싱감과 카고 스타일 포켓 디테일이 특징.",
    url: "https://lowclassic.com/product/washed-cotton-pants-charcoal/8773/",
    source: "LOW CLASSIC official",
  },
  amomento_shirt: {
    title: "AMOMENTO stripe shirts, brown",
    price: "$140.00 sale / $200.00",
    note: "AMOMENTO women tops 컬렉션 기준 현재 노출되는 셔츠 상품.",
    url: "https://amomento.us/collections/women-tops",
    source: "AMOMENTO official",
  },
  amomento_knit: {
    title: "AMOMENTO racoon v-neck knit, dark grey",
    price: "$290.00",
    note: "AMOMENTO women tops 컬렉션 기준 현재 노출되는 니트 상품.",
    url: "https://amomento.us/collections/women-tops",
    source: "AMOMENTO official",
  },
  amomento_zip: {
    title: "AMOMENTO ribbed high neck zip up, beige",
    price: "$230.00",
    note: "코튼-나일론 혼방, 두 방향 지퍼와 조밀한 립 조직이 특징.",
    url: "https://amomento.us/products/ribbed-high-neck-zip-up-beige",
    source: "AMOMENTO official",
  },
  recto_pants: {
    title: "RECTO Tuck Detail Wool Pants Black",
    price: "435,000원",
    note: "KREAM 노출 기준 렉토 턱 디테일 울 팬츠 블랙.",
    url: "https://kream.co.kr/products/600275%3Fsize%3D",
    source: "KREAM brand store",
  },
  recto_wide: {
    title: "[recto] DOUBLE PLEATED WIDE PANTS (CREAM)",
    price: "$233.00",
    note: "ETA SEOUL 기준 더블 플리츠와 와이드 실루엣을 강조한 팬츠.",
    url: "https://etaseoul.com/products/double-pleated-wide-pants-cream",
    source: "ETA SEOUL",
  },
  cos_trouser: {
    title: "COS 코튼 크롭 와이드 레그 트라우저",
    price: "150,000원",
    note: "피마 코튼 100, 플리츠 디테일과 버튼 탭 허리 구조.",
    url: "https://www.cos.com/ko-kr/women/co-ords/product.cotton-cropped-wide-leg-trousers-navy.1294863001.html",
    source: "COS KR",
  },
  cos_wool_trouser: {
    title: "COS 플리티드 울 블렌드 배럴 레그 트라우저",
    price: "220,000원",
    note: "COS women trousers 카테고리 기준 현재 노출되는 울 블렌드 팬츠.",
    url: "https://www.cos.com/ko-kr/women/trousers.html",
    source: "COS KR",
  },
  cos_shirt: {
    title: "COS 에폴렛 디테일 울 셔츠",
    price: "57,000원 sale / 190,000원",
    note: "COS shirts sale 페이지 기준 현재 노출되는 셔츠 상품.",
    url: "https://www.cos.com/ko-kr/women/sale/shirts.html",
    source: "COS KR",
  },
  cos_knit: {
    title: "COS 여성 니트웨어 & 가디건 카테고리",
    price: "category listing",
    note: "프리미엄 울, 캐시미어, 울트라 파인 메리노 중심 설명이 현재 노출됨.",
    url: "https://www.cos.com/ko-kr/women/knitwear.html",
    source: "COS KR",
  },
  le17_coat: {
    title: "LE 17 SEPTEMBRE Belted wool-blend felt hooded coat",
    price: "$261 sale / $870",
    note: "THE OUTNET 기준 울 90 / 나일론 10, detachable hood 및 waist tie 포함.",
    url: "https://www.theoutnet.com/en-us/shop/product/le-17-septembre/coats/overcoats/belted-wool-blend-felt-hooded-coat/1647597322046157",
    source: "THE OUTNET",
  },
  le17_frontzip: {
    title: "Le 17 Septembre Front Zipper Coat",
    price: "$173 sale / $605",
    note: "Garmentory 기준 dropped shoulder, belted waist, 100% wool.",
    url: "https://www.garmentory.com/sale/le-17-septembre/women-coats/1020632-le-17-septembre-front-zipper-coat",
    source: "Garmentory",
  },
  marginsherwood_boston: {
    title: "Marge Sherwood Soft Boston leather shoulder bag",
    price: "401 €",
    note: "Farfetch 여성 bags 카테고리 노출 기준.",
    url: "https://www.farfetch.com/shopping/women/marge-sherwood/bags-purses-1/items.aspx",
    source: "Farfetch",
  },
  marginsherwood_baguette: {
    title: "Marge Sherwood Blue Soft Baguette Suede Bag",
    price: "$370",
    note: "Fabric of Society 노출 기준 Soft Baguette suede bag.",
    url: "https://fabricofsociety.luxury/collections/marge-sherwood",
    source: "Fabric of Society",
  },
  andyou_dress: {
    title: "BRIDE AND YOU LINDSAY Round neck semi A-line tweed mini dress (Blue)",
    price: "298,000원",
    note: "브랜드 공식 페이지 기준 아이유 착용 제품으로 노출.",
    url: "https://brideandyou.com/product/%241/4235/",
    source: "BRIDE AND YOU official",
  },
  andyou_dress_en: {
    title: "BRIDE AND YOU LINDSAY Round neck semi A-line tweed mini dress (Blue)",
    price: "$286.96",
    note: "영문 페이지 기준 동일 제품 노출.",
    url: "https://en.brideandyou.com/product/%EC%95%84%EC%9D%B4%EC%9C%A0-%EC%B0%A9%EC%9A%A9lindsay-round-neck-semi-a-line-tweed-mini-dress-blue/4235/",
    source: "BRIDE AND YOU official",
  },
  theopen_jacket: {
    title: "THEOPEN PRODUCT Knitted Sleeve Single Breasted Jacket",
    price: "$219.00",
    note: "OEUVR 기준 classic blazer를 비트는 니트 슬리브 싱글 브레스티드 재킷.",
    url: "https://oeuvrofficial.com/products/knitted-sleeve-single-breasted-jacket",
    source: "OEUVR",
  },
};

const TOPIC_SOURCES = {
  T01: ["le17_frontzip", "cos_trouser"],
  T02: ["andyou_dress", "amomento_shirt"],
  T03: ["amomento_knit", "marginsherwood_boston"],
  T04: ["le17_coat", "lowclassic_trouser"],
  T05: ["recto_wide", "marginsherwood_baguette"],
  T06: ["lowclassic_pants", "cos_shirt"],
  T07: ["theopen_jacket", "cos_shirt"],
  T08: ["amomento_shirt"],
  T09: ["recto_pants", "cos_wool_trouser"],
  T10: ["marginsherwood_boston", "marginsherwood_baguette"],
  T11: ["lowclassic_blazer"],
  T12: ["andyou_dress_en", "andyou_dress"],
  T13: ["recto_pants", "recto_wide"],
  T14: ["cos_shirt"],
  T15: ["lowclassic_trouser", "recto_wide"],
  T16: ["le17_coat", "le17_frontzip"],
  T17: ["amomento_knit", "amomento_zip"],
  T18: ["marginsherwood_boston", "marginsherwood_baguette"],
  T19: ["lowclassic_blazer", "cos_shirt"],
  T20: ["cos_knit", "cos_wool_trouser"],
};

const COMMENT_PERSONAS = [
  { user: "min_archive", handle: "@min.archive", avatar: "MA", type: "Reactor" },
  { user: "fit_jina", handle: "@fit.jina", avatar: "FJ", type: "Practical Reviewer" },
  { user: "mood_zip", handle: "@mood.zip", avatar: "MZ", type: "Taste Commenter" },
  { user: "closetry", handle: "@closetry", avatar: "CL", type: "Critic" },
  { user: "wearmemo", handle: "@wearmemo", avatar: "WM", type: "Experience Sharer" },
  { user: "picknote", handle: "@picknote", avatar: "PN", type: "Recommender" },
  { user: "domesticlog", handle: "@domestic.log", avatar: "DL", type: "Taste Commenter" },
  { user: "ratio_lab", handle: "@ratio.lab", avatar: "RL", type: "Practical Reviewer" },
];

function seededNumber(key, mod, offset = 0) {
  return (
    [...key].reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 3), 0) % mod
  ) + offset;
}

function buildFeedPost(topic, index) {
  const image = IMAGE_POOL[index % IMAGE_POOL.length];
  const likes = 140 + seededNumber(topic.id, 700);
  const replies = 11 + seededNumber(`${topic.id}-r`, 17);
  const reposts = 2 + seededNumber(`${topic.id}-rp`, 9);
  const time = `${2 + index * 3}m`;
  const author = [
    "daily.minimal.kr",
    "closet.signal",
    "domestic.outfit.lab",
    "mood.and.fit",
    "womenfit.archive",
  ][index % 5];

  return {
    ...topic,
    sources: (TOPIC_SOURCES[topic.id] || []).map((key) => SOURCE_LIBRARY[key]),
    author,
    handle: `@${author}`,
    time,
    image,
    likes,
    replies,
    reposts,
    sampleReplies: [topic.expected, `${topic.debate.split(",")[0]} 얘기 많이 나올 듯`],
  };
}

const FEED_POSTS = TOPICS.map(buildFeedPost);

function authorInitials(author) {
  return author
    .split(".")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 2);
}

function buildThreadSummary(post) {
  return [
    {
      title: "Overall sentiment",
      content: `${TYPE_LABEL[post.type]} 성격의 스레드로 읽히며, 전체 반응은 "${post.expected}" 쪽으로 수렴한다.`,
    },
    {
      title: "Top repeated opinions",
      content: `1. ${post.debate.split(",")[0]} 이 제일 많이 지적됨.\n2. ${post.brands.join(", ")} 특유의 무드 대비 실제 만족도를 따지는 반응이 많음.\n3. 칭찬보다 수정 조언형 댓글 비중이 높음.`,
    },
    {
      title: "Actionable styling suggestions",
      content: `1. ${post.debate.split(",")[0]} 중심으로 다시 보정하기.\n2. ${post.debate.split(",")[1] || "이너 톤"} 쪽을 한 단계 더 정리하기.\n3. 구매/착용 의사결정은 "${post.expected}" 기준으로 좁히기.`,
    },
  ];
}

function buildComments(post) {
  const baseLikes = seededNumber(post.id, 18, 6);
  const [p1, p2 = "가격값", p3 = "무드"] = post.debate.split(",").map((item) => item.trim());

  return [
    {
      id: `${post.id}-1`,
      user: COMMENT_PERSONAS[0].user,
      handle: COMMENT_PERSONAS[0].handle,
      avatar: COMMENT_PERSONAS[0].avatar,
      time: "1m",
      text: `${post.hook} 이 문장부터 너무 현실적이네. ${post.expected}`,
      likes: baseLikes + 16,
      type: COMMENT_PERSONAS[0].type,
      replyTo: null,
      liked: false,
    },
    {
      id: `${post.id}-2`,
      user: COMMENT_PERSONAS[1].user,
      handle: COMMENT_PERSONAS[1].handle,
      avatar: COMMENT_PERSONAS[1].avatar,
      time: "58s",
      text: `${p1} 쪽이 제일 크게 보임. 지금 상태면 전체 무드는 맞는데 비율이 살짝 애매하게 끊길 수 있어.`,
      likes: baseLikes + 9,
      type: COMMENT_PERSONAS[1].type,
      replyTo: null,
      liked: true,
    },
    {
      id: `${post.id}-3`,
      user: COMMENT_PERSONAS[2].user,
      handle: COMMENT_PERSONAS[2].handle,
      avatar: COMMENT_PERSONAS[2].avatar,
      time: "54s",
      text: `${post.brands[0]} 쪽 무드는 나는데 ${p2} 때문에 생각보다 힘이 분산되는 느낌.`,
      likes: baseLikes + 4,
      type: COMMENT_PERSONAS[2].type,
      replyTo: null,
      liked: false,
    },
    {
      id: `${post.id}-4`,
      user: COMMENT_PERSONAS[3].user,
      handle: COMMENT_PERSONAS[3].handle,
      avatar: COMMENT_PERSONAS[3].avatar,
      time: "49s",
      text: `예쁘긴 한데 그냥 예쁜 저장룩에서 끝날 수도 있음. 실제로는 ${p1} 정리 안 하면 애매해 보여.`,
      likes: baseLikes + 7,
      type: COMMENT_PERSONAS[3].type,
      replyTo: null,
      liked: false,
    },
    {
      id: `${post.id}-5`,
      user: COMMENT_PERSONAS[4].user,
      handle: COMMENT_PERSONAS[4].handle,
      avatar: COMMENT_PERSONAS[4].avatar,
      time: "44s",
      text: `나도 ${post.brands[0]} 비슷한 무드로 입거나 사봤는데 제품컷/무드와 실제 만족도 차이 좀 있더라. ${post.expected}`,
      likes: baseLikes + 12,
      type: COMMENT_PERSONAS[4].type,
      replyTo: null,
      liked: false,
    },
    {
      id: `${post.id}-6`,
      user: COMMENT_PERSONAS[5].user,
      handle: COMMENT_PERSONAS[5].handle,
      avatar: COMMENT_PERSONAS[5].avatar,
      time: "40s",
      text: `${p1} 먼저 손보고, 그 다음 ${p2} 쪽만 바꾸면 훨씬 정리될 듯.`,
      likes: baseLikes + 8,
      type: COMMENT_PERSONAS[5].type,
      replyTo: null,
      liked: false,
    },
    {
      id: `${post.id}-7`,
      user: COMMENT_PERSONAS[6].user,
      handle: COMMENT_PERSONAS[6].handle,
      avatar: COMMENT_PERSONAS[6].avatar,
      time: "36s",
      text: `국내 도메스틱 좋아하면 ${post.brands.join(" / ")} 비교는 한 번쯤 다 하는 고민이라 공감됨.`,
      likes: baseLikes + 3,
      type: COMMENT_PERSONAS[6].type,
      replyTo: null,
      liked: false,
    },
    {
      id: `${post.id}-8`,
      user: COMMENT_PERSONAS[7].user,
      handle: COMMENT_PERSONAS[7].handle,
      avatar: COMMENT_PERSONAS[7].avatar,
      time: "31s",
      text: `ㄴ 맞음. 특히 ${p3}보다 ${p1}이 먼저 정리돼야 실제 착장에서 만족도가 올라감.`,
      likes: baseLikes + 2,
      type: COMMENT_PERSONAS[7].type,
      replyTo: `${post.id}-7`,
      liked: false,
    },
  ];
}

const INITIAL_COMMENTS = Object.fromEntries(FEED_POSTS.map((post) => [post.id, buildComments(post)]));

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
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      type="button"
      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 text-sm transition ${
        active ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
      }`}
    >
      <Icon className={`h-[18px] w-[18px] ${active ? "fill-current" : ""}`} />
      <span className="hidden sm:inline">{label}</span>
    </motion.button>
  );
}

function ThreadItem({
  comment,
  replies,
  expandedReplies,
  onToggleReplies,
  onToggleLike,
  replyOpenId,
  onToggleReply,
  depth = 0,
}) {
  const hidden = replies.length > 1 && !expandedReplies[comment.id];
  const visibleReplies = hidden ? replies.slice(0, 1) : replies;

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
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-zinc-100">{comment.user}</span>
            <span className="truncate text-sm text-zinc-500">{comment.handle}</span>
            <span className="text-sm text-zinc-600">{comment.time}</span>
          </div>
          <p className="mt-1 text-[15px] leading-6 text-zinc-200">{comment.text}</p>
          <p className={`mt-2 text-xs ${typeStyle[comment.type]}`}>{comment.type}</p>

          <div className="mt-3 flex items-center gap-1">
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
                    <Avatar initials="ME" accent="from-zinc-700 to-zinc-900" />
                    <div className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-500">
                      Reply to {comment.user}...
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {visibleReplies.length > 0 && (
            <div className="mt-4">
              {visibleReplies.map((reply) => (
                <ThreadItem
                  key={reply.id}
                  comment={reply}
                  replies={[]}
                  expandedReplies={expandedReplies}
                  onToggleReplies={onToggleReplies}
                  onToggleLike={onToggleLike}
                  replyOpenId={replyOpenId}
                  onToggleReply={onToggleReply}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}

          {hidden && (
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
  const [view, setView] = useState("feed");
  const [selectedPostId, setSelectedPostId] = useState(FEED_POSTS[0].id);
  const [commentsByPost, setCommentsByPost] = useState(INITIAL_COMMENTS);
  const [postLiked, setPostLiked] = useState(false);
  const [postSaved, setPostSaved] = useState(false);
  const [postReplyOpen, setPostReplyOpen] = useState(false);
  const [replyOpenId, setReplyOpenId] = useState(null);
  const [expandedReplies, setExpandedReplies] = useState({});
  const [promptOpen, setPromptOpen] = useState(false);

  const activePost = FEED_POSTS.find((post) => post.id === selectedPostId) ?? FEED_POSTS[0];
  const comments = commentsByPost[selectedPostId] ?? [];

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

  const openPost = (postId) => {
    setSelectedPostId(postId);
    setView("thread");
    setPostLiked(false);
    setPostSaved(false);
    setPostReplyOpen(false);
    setReplyOpenId(null);
    setExpandedReplies({});
    setPromptOpen(false);
  };

  const toggleCommentLike = (id) => {
    setCommentsByPost((current) => ({
      ...current,
      [selectedPostId]: current[selectedPostId].map((comment) =>
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

  const summary = buildThreadSummary(activePost);

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
              <p className="text-xs text-zinc-500">{view === "feed" ? "Domestic / Minimal For You" : activePost.title}</p>
            </div>
          </div>
          <div className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400">
            {view === "feed" ? `${FEED_POSTS.length} topic mocks` : `${activePost.replies} replies`}
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
                    <p className="text-sm font-semibold text-zinc-100">First 20 High-Fidelity Topic Set</p>
                    <p className="mt-1 text-sm leading-6 text-zinc-500">
                      국내 도메스틱/미니멀 중심, 브랜드 실명 사용, 여성 비율 높음, 댓글은 수정 조언형과 가격값 판단형 비중을 높인 mock feed.
                    </p>
                  </div>
                  <div className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
                    Launch-grade mock
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-b border-zinc-800 px-4 py-3 text-xs text-zinc-500 sm:grid-cols-4">
                <div>상세 확장 우선 12개</div>
                <div>프로필 흔적 강화 8개</div>
                <div>브랜드 실명 적극 사용</div>
                <div>여성 중심 tone mix</div>
              </div>

              <div className="px-2 py-2">
                {FEED_POSTS.map((post, index) => (
                  <motion.button
                    key={post.id}
                    type="button"
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.995 }}
                    onClick={() => openPost(post.id)}
                    className="flex w-full gap-3 rounded-[24px] px-3 py-4 text-left transition hover:bg-white/[0.03]"
                  >
                    <div className="relative flex flex-col items-center">
                      <Avatar
                        initials={authorInitials(post.author)}
                        accent={index % 2 === 0 ? "from-zinc-500 to-zinc-700" : "from-zinc-600 to-zinc-800"}
                      />
                      {index !== FEED_POSTS.length - 1 && <div className="mt-2 h-full w-px bg-zinc-800" />}
                    </div>

                    <div className="min-w-0 flex-1 border-b border-zinc-900 pb-4">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-zinc-100">{post.author}</span>
                        {index < 3 && <BadgeCheck className="h-4 w-4 fill-sky-400 text-sky-300" />}
                        <span className="truncate text-sm text-zinc-500">{post.handle}</span>
                        <span className="text-sm text-zinc-600">{post.time}</span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-300">
                          {post.id}
                        </span>
                        <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-300">
                          {TYPE_LABEL[post.type]}
                        </span>
                        <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-400">
                          {post.brands.join(" / ")}
                        </span>
                      </div>

                      <p className="mt-3 text-[15px] font-medium leading-6 text-zinc-100">{post.title}</p>
                      <p className="mt-1 text-[15px] leading-6 text-zinc-300">{post.hook}</p>

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
                          <p className="mt-3 text-sm leading-6 text-zinc-500">
                            논쟁 포인트: {post.debate} · 소스 조합: {post.sourceMix}
                          </p>
                          <div className="mt-3 flex items-center gap-4 text-sm text-zinc-500">
                            <span>{formatCount(post.likes)} likes</span>
                            <span>{post.replies} replies</span>
                            <span>{post.reposts} reposts</span>
                          </div>
                        </div>
                        <img
                          src={post.image}
                          alt={post.title}
                          className="h-24 w-24 rounded-2xl border border-zinc-800 object-cover sm:h-28 sm:w-28"
                        />
                      </div>
                    </div>
                  </motion.button>
                ))}
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
                      <BadgeCheck className="h-4 w-4 fill-sky-400 text-sky-300" />
                      <span className="truncate text-sm text-zinc-500">{activePost.handle}</span>
                      <span className="text-sm text-zinc-600">{activePost.time}</span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-300">
                        {activePost.id}
                      </span>
                      <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-300">
                        {TYPE_LABEL[activePost.type]}
                      </span>
                      <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-400">
                        {activePost.brands.join(" / ")}
                      </span>
                    </div>

                    <p className="mt-3 text-lg font-semibold leading-7 text-zinc-100">{activePost.title}</p>
                    <p className="mt-2 whitespace-pre-line text-[15px] leading-6 text-zinc-100">
                      {activePost.hook}
                    </p>

                    <div className="mt-4 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">
                      <div className="relative">
                        <img src={activePost.image} alt={activePost.title} className="h-[420px] w-full object-cover sm:h-[560px]" />
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

                    <div className="mt-3 rounded-2xl border border-zinc-800 bg-black/40 p-3 text-sm text-zinc-400">
                      논쟁 포인트: {activePost.debate} · 예상 댓글 방향: {activePost.expected}
                    </div>

                    {activePost.sources.length > 0 && (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {activePost.sources.map((source) => (
                          <a
                            key={source.title}
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 transition hover:border-zinc-700 hover:bg-zinc-900"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs text-zinc-500">{source.source}</span>
                              <span className="text-xs text-zinc-400">{source.price}</span>
                            </div>
                            <p className="mt-2 text-sm font-medium leading-6 text-zinc-100">{source.title}</p>
                            <p className="mt-2 text-sm leading-6 text-zinc-400">{source.note}</p>
                          </a>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 flex items-center gap-1">
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
                      <ActionButton
                        icon={Bookmark}
                        label="Save"
                        active={postSaved}
                        onClick={() => setPostSaved((current) => !current)}
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-zinc-500">
                      <span>{activePost.likes} likes</span>
                      <span>{activePost.replies} replies</span>
                      <span>{activePost.reposts} reposts</span>
                      <span className="text-zinc-600">{activePost.tone}</span>
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
                                Add a reply about 핏, 가격값, 실착 만족도...
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
                  variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03 } } }}
                  className="pt-3"
                >
                  {roots.map((comment) => (
                    <motion.div key={comment.id} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                      <ThreadItem
                        comment={comment}
                        replies={repliesByParent[comment.id] || []}
                        expandedReplies={expandedReplies}
                        onToggleReplies={(id) =>
                          setExpandedReplies((current) => ({ ...current, [id]: !current[id] }))
                        }
                        onToggleLike={toggleCommentLike}
                        replyOpenId={replyOpenId}
                        onToggleReply={(id) => setReplyOpenId((current) => (current === id ? null : id))}
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
                  <p className="text-sm text-zinc-500">AI digest tuned for mock realism</p>
                </div>
                <div className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400">
                  {comments.length} comments
                </div>
              </div>

              <div className="grid gap-3">
                {summary.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                    <p className="text-sm font-medium text-zinc-100">{item.title}</p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-400">{item.content}</p>
                  </div>
                ))}
              </div>
            </motion.section>

            <section className="mt-4 rounded-[28px] border border-zinc-800 bg-zinc-950/80">
              <button
                type="button"
                onClick={() => setPromptOpen((current) => !current)}
                className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-white/[0.02]"
              >
                <div>
                  <p className="text-sm font-semibold text-zinc-100">View generation prompt</p>
                  <p className="text-sm text-zinc-500">Topic-set prompt that shaped this mock</p>
                </div>
                <ChevronDown className={`h-4 w-4 text-zinc-500 transition ${promptOpen ? "rotate-180" : ""}`} />
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
