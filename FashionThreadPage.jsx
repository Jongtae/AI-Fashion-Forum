import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Bookmark,
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

const SEARCH_RECENTS = [
  "렉토 팬츠",
  "팬츠 기장",
  "아모멘토 셔츠",
  "출근룩",
  "실물 어때",
];

const SEARCH_TRENDING = [
  "성수에서 많이 보이는 가방",
  "가격값 하는 블레이저",
  "셔츠 부해보임",
  "29CM 저장 많은 원피스",
  "봄 출근룩",
];

const SEARCH_SUGGESTED_BRANDS = [
  { name: "RECTO", note: "팬츠 핏 / 가격값 / 출근룩" },
  { name: "AMOMENTO", note: "셔츠 / 니트 / 실물 체감" },
  { name: "LOW CLASSIC", note: "블레이저 / 셔츠 / 활용도" },
  { name: "MARGE SHERWOOD", note: "가방 / 유행 피로감 / 실사용성" },
];

const SEARCH_COLLECTIONS = [
  { title: "출근 전에 많이 저장된 글", subtitle: "핏 수정 조언형 스레드 중심" },
  { title: "성수에서 본 브랜드 얘기", subtitle: "도메스틱 / 가방 / 스니커즈 흐름" },
  { title: "실물 만족도 갈리는 아이템", subtitle: "제품컷 환상 vs 실제 착용" },
];

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

const PRIORITY_THREAD_IDS = new Set(["T01", "T03", "T05", "T08", "T09", "T10", "T12", "T13", "T14", "T16", "T17", "T18"]);

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

function shortenTitle(title) {
  return title
    .replace(/^BRIDE AND YOU\s+/i, "")
    .replace(/^Marge Sherwood\s+/i, "")
    .replace(/^LE 17 SEPTEMBRE\s+/i, "")
    .replace(/^Le 17 Septembre\s+/i, "")
    .replace(/^LOW CLASSIC\s+/i, "")
    .replace(/^AMOMENTO\s+/i, "")
    .replace(/^COS\s+/i, "")
    .trim();
}

function buildPriorityThreadRewrite(post) {
  const [primary, secondary] = post.sources;
  const primaryName = primary ? shortenTitle(primary.title) : post.brands[0];
  const secondaryName = secondary ? shortenTitle(secondary.title) : post.brands[0];

  switch (post.id) {
    case "T01":
      return {
        feedLine: `${primaryName} 무드로 자켓 비율을 잡고, ${secondaryName} (${secondary?.price}) 기준 팬츠 길이 체감을 붙인 출근룩 고민.`,
        detailLead: `${post.hook}\n지금은 ${primaryName} 쪽으로 어깨선이랑 상체 무드를 맞추고, 하의는 ${secondaryName} (${secondary?.price}) 같은 크롭 와이드 기준으로 보고 있어. 문제는 상체보다 팬츠 길이가 더 먼저 보여서 로퍼 위에서 발목이 끊겨 보인다는 점이고, 그래서 전체는 멀쩡한데 출근룩 비율만 살짝 아쉬운 상태.`,
        comments: [
          `${primaryName} 무드 자체는 맞는데 댓글 포인트가 왜 팬츠 길이에 몰리는지 알겠음. ${secondaryName}처럼 크롭감 있는 팬츠 기준이면 로퍼 위에서 더 끊겨 보여.`,
          `${secondaryName}가 ${secondary?.price}라 기본 핏 기대치는 있는데도 지금 착장에선 발목 노출이 애매해서 신발까지 같이 짧아 보여.`,
          `${primary?.source} 쪽 자켓 느낌은 잘 살아. 근데 하의가 그 무드를 못 받쳐줘서 출근룩 완성도가 덜 나오는 듯.`,
          `이런 건 상체보다 하단 비율이 먼저 읽혀서, 팬츠 2~3cm만 길어도 훨씬 정리될 것 같아.`,
          `나도 비슷하게 입었을 때 ${secondaryName}류 팬츠는 로퍼보다 스니커즈나 더 낮은 앞코 신발이 낫더라.`,
          `가격 생각하면 ${secondaryName} 쪽은 핏에서 본전 느낌이 있어야 하는데 지금은 길이 때문에 그 장점이 묻힘.`,
          `${post.brands.join(" / ")} 조합 자체는 되게 현실적인데, 댓글이 “전체는 괜찮은데 하단이 끊긴다”로 모일 만한 셋업임.`,
          `ㄴ 맞아. 자켓 문제보다 팬츠-슈즈 경계가 먼저 보여서 실착 만족도가 깎이는 타입.`,
        ],
      };
    case "T03":
      return {
        feedLine: `${primaryName} 니트 무드에 ${secondaryName} 같은 미니멀 액세서리 기준을 붙여서, 심심함 vs 세련됨을 따지는 올블랙 스레드.`,
        detailLead: `${post.hook}\n상체는 ${primaryName} (${primary?.price})처럼 텍스처가 있는 블랙 니트 쪽으로 보고 있고, 포인트는 ${secondaryName}처럼 작게 들어가는 쪽이 맞나 고민 중이야. 올블랙이라 정리는 되는데 막상 실착으로 보면 가방이나 벨트 하나 없이 끝나서 너무 안전하게만 보이는지, 아니면 이 정도가 제일 세련된지 의견 듣고 싶음.`,
        comments: [
          `${primaryName} 같은 니트는 소재감으로 먹는 타입이라 아예 심심하진 않은데, 지금은 포인트가 너무 안 보여서 “잘 입었다”보다 “안전하다” 쪽으로 읽힘.`,
          `${secondaryName} 같은 가방 하나만 들어가도 달라질 듯. 올블랙은 디테일 하나가 있고 없고 차이가 커.`,
          `${primary?.price} 생각하면 니트 존재감은 충분한 편인데, 하의까지 무광 블랙이면 힘이 다 눌려 보여.`,
          `무채색 미니멀 좋아하는 사람은 좋아할 룩인데 댓글에선 아마 “신발이나 가방 하나만 바꿔라” 얘기 반복될 듯.`,
          `나도 ${post.brands[0]} 니트류는 단독으로 예쁜데 실착 사진 보면 악세서리 없으면 바로 밋밋해지더라.`,
          `${secondary?.source} 쪽 백처럼 작게 반짝이는 포인트 하나 있으면 올블랙이 훨씬 산다.`,
          `브랜드 무드는 잘 맞췄는데 지금 상태는 너무 정답처럼만 입은 느낌. 그래서 호불호 없이 그냥 지나갈 수 있음.`,
          `ㄴ 맞음. 실패는 없는데 기억에 남는 포인트도 없는 쪽.`,
        ],
      };
    case "T05":
      return {
        feedLine: `${primaryName} 팬츠 무드와 ${secondaryName} 액세서리 감도는 맞는데, 신발 선택 때문에 저장룩과 실착이 갈리는 케이스.`,
        detailLead: `${post.hook}\n셔츠-롱스커트 쪽 무드는 계속 저장하던 결인데, 실제로 입어보니 ${primaryName}처럼 아래 볼륨이 있는 하체 라인을 가져갈수록 신발 영향이 더 크더라. 가방은 ${secondaryName} 쪽 무드로 잘 붙는데 로퍼가 들어오면서 밑에서 힘이 갑자기 무거워져서, 내가 생각한 미니멀한 흐름보다 더 답답하게 보이는지 궁금해.`,
        comments: [
          `이건 위보다 아래가 문제인 룩 같아. ${primaryName}처럼 하체 볼륨이 있는 무드일수록 로퍼가 들어오면 밑에서 확 막혀 보여.`,
          `${secondaryName} 같은 가방 포인트는 잘 붙는데, 신발까지 광택 있는 쪽이면 저장룩 느낌이 아니라 과하게 힘준 느낌 남.`,
          `실제로는 셔츠-롱스커트보다 신발이 제일 먼저 보여서 댓글이 다 거기로 몰릴 듯.`,
          `${primary?.source} 기준 팬츠류 무드는 좋은데 지금 착장 해석은 너무 무거워. 차라리 메리제인이나 스니커즈가 더 맞았을 것 같아.`,
          `나도 이런 룩 저장 많이 하는데 막상 입으면 밑에서 뜨는 이유가 거의 신발이더라.`,
          `${secondary?.price} 가방까지 들어간 룩이면 신발은 오히려 힘을 빼야 균형이 맞는 듯.`,
          `전체 무드는 있는데 실착 만족도가 떨어지는 전형적인 경우라 너무 현실적임.`,
          `ㄴ 맞아. 상의보다 하체 무게감이 과해져서 저장한 이미지랑 다른 느낌이 남.`,
        ],
      };
    case "T08":
      return {
        feedLine: `${primaryName} (${primary?.price}) 기준으로 원단/어깨선/브랜드값을 따지는 구매 고민 스레드.`,
        detailLead: `${post.hook}\n찾아본 기준은 ${primary?.title}이고 가격은 ${primary?.price}. 제품 설명만 보면 crisp cotton이랑 박시한 어깨선 때문에 “기본 셔츠인데 확실히 다르다” 쪽으로 읽히는데, 막상 실착 후기 쪽은 이 가격이면 브랜드값도 꽤 들어간다는 얘기가 많더라. 진짜로 오래 입을 셔츠인지, 아니면 첫 인상만 좋은 셔츠인지가 제일 궁금함.`,
        comments: [
          `${primaryName}가 예쁜 건 맞는데 ${primary?.price}면 다들 원단 체감부터 따질 수밖에 없음. 그냥 “예쁘다”로 끝내기엔 가격대가 높아.`,
          `${primary?.note} 이 설명만 보면 혹하는데, 실착 쪽은 어깨가 생각보다 과하게 박시해서 호불호 나뉠 듯.`,
          `AMOMENTO 셔츠류 좋아하면 사는 이유는 이해돼도 가성비로 설득되진 않음.`,
          `대체 가능한 셔츠 많아서 고민되는 거 완전 공감. 결국 핏 취향 맞는 사람이면 사고 아니면 브랜드값이라고 느낄 듯.`,
          `나도 이 브랜드 탑류 몇 개 봤는데 제품컷은 늘 예쁨. 근데 실제로는 어깨선 때문에 “생각보다 과하다”는 말 나올 만해.`,
          `${primary?.source} 기준 현재 노출 상품이면 시즌 지나도 비슷한 결 다시 나올 가능성 있어서, 급하게 살 이유는 또 애매함.`,
          `20만원대면 그냥 무난한 셔츠 말고 “이건 아모멘토라서 산다”가 있어야 하는데 그 지점이 사람마다 다를 듯.`,
          `ㄴ 맞음. 좋아하는 사람은 바로 알겠지만, 모르는 사람은 가격 보고 먼저 멈칫할 셔츠.`,
        ],
      };
    case "T09":
      return {
        feedLine: `${primaryName}와 ${secondaryName} 가격/핏 체감을 같이 놓고, 렉토 팬츠 프리미엄이 실제로 느껴지는지 비교하는 스레드.`,
        detailLead: `${post.hook}\n지금 비교 기준은 ${primaryName} (${primary?.price})랑 ${secondaryName} (${secondary?.price}) 쪽이야. 제품 정보만 보면 렉토 쪽이 확실히 더 정교해 보이는데, 결국 팬츠는 입었을 때 다리선이 어떻게 떨어지는지가 다라서 가격 차이가 체감될 정도인지 헷갈림. 옷 좋아하는 사람 눈에는 차이가 보이겠지만, 실착에서 그 차이가 확실한지 듣고 싶어.`,
        comments: [
          `${primaryName}가 확실히 정제된 느낌은 있는데 ${primary?.price}까지 감안하면 “한 벌로 시즌 끝난다”까지는 조금 과장 같아.`,
          `${secondaryName}랑 나란히 놓고 보면 핏 차이는 있는데, 가성비는 오히려 COS 쪽 손 들어줄 사람 많을 듯.`,
          `렉토 팬츠 좋아하는 사람은 턱이랑 떨어지는 선에서 돈값 느끼긴 함. 근데 일반적으로는 가격부터 장벽이 큼.`,
          `${primary?.source} 쪽 제품이면 도메스틱 팬츠 좋아하는 사람 눈엔 차이 보여도, 아닌 사람은 그냥 잘 만든 검정 슬랙스로 볼 가능성 큼.`,
          `나도 이런 류 팬츠 살 때 결국 실착 핏 때문에 사지 제품 설명 때문에 사지는 않더라.`,
          `${secondary?.price} 생각하면 비교군이 너무 만만하지 않아서, 렉토 프리미엄이 더 냉정하게 보이는 것 같아.`,
          `브랜드 만족도는 렉토가 높을 수 있는데 가성비 질문엔 다들 애매하다고 답할 듯.`,
          `ㄴ 맞아. 아는 사람은 아는데 모르는 사람한텐 설명하기 어려운 가격대.`,
        ],
      };
    case "T10":
      return {
        feedLine: `${primaryName}와 ${secondaryName}를 같이 보고, 마지셔우드 백이 지금 사기엔 늦었는지 실사용성까지 따지는 스레드.`,
        detailLead: `${post.hook}\n찾아본 건 ${primaryName} (${primary?.price})랑 ${secondaryName} (${secondary?.price}) 두 쪽인데, 둘 다 여전히 쉐입은 예뻐 보여. 문제는 한때 너무 많이 보여서 지금 사면 “좀 늦은 감”이 드는지, 아니면 오히려 유행 지나고 나서 더 담백하게 들 수 있는지야. 디자인 만족도랑 별개로 손이 자주 갈지도 고민 중.`,
        comments: [
          `${primaryName} 같은 보스턴 계열은 완전 끝난 느낌까진 아닌데, 확실히 예전처럼 신선하진 않음.`,
          `${secondaryName}까지 같이 보면 브랜드 시그니처는 알겠는데, 지금 사는 사람은 유행보다 그냥 취향으로 사야 할 듯.`,
          `${primary?.price}면 “트렌드템으로 한철”은 절대 아니고, 오히려 본인 옷장에 오래 붙는지부터 봐야 함.`,
          `예쁜 건 맞는데 실제로 자주 드냐고 물으면 다들 잠깐 멈출 것 같아.`,
          `나도 마지셔우드 백은 들면 예쁜데 손은 잘 안 가더라. 특히 포인트용이면 더 그래.`,
          `${primary?.source}나 ${secondary?.source}에서 보이는 제품컷은 여전히 예쁜데, 실생활 착장에선 존재감이 애매할 수 있음.`,
          `완전 지난 건 아닌데 “지금 이걸 꼭?”이라는 질문엔 답이 갈릴 듯.`,
          `ㄴ 맞음. 유행보다 취향이면 사도 되는데, 트렌드 기대하고 사면 늦었다고 느낄 수 있음.`,
        ],
      };
    case "T12":
      return {
        feedLine: `${primaryName} / ${secondaryName} 기준으로, 제품컷 환상과 실제 체형 만족도가 얼마나 다른지 묻는 원피스 구매 스레드.`,
        detailLead: `${post.hook}\n레퍼런스는 ${primaryName} (${primary?.price})랑 동일 제품 국내 페이지인 ${secondaryName} 쪽까지 같이 봤어. 제품컷에서는 드레이프랑 라인이 진짜 예쁜데, 실착 얘기 보면 허리나 어깨가 조금만 안 맞아도 갑자기 평범해진다는 말이 있더라. 그래서 이건 “사진 그대로 예쁜 옷”인지, 아니면 체형 맞는 사람만 만족도가 높은 옷인지가 궁금함.`,
        comments: [
          `${primaryName} 제품컷은 진짜 혹하게 생김. 근데 이런 건 체형 안 맞으면 바로 평범해져서 후기 갈리는 것도 이해돼.`,
          `${secondaryName} 국내 페이지까지 같이 봐도 연출은 너무 좋은데, 실착은 어깨랑 허리 맞는 사람만 산다는 느낌이야.`,
          `${primary?.price}면 원피스 한 벌에 기대치가 높아질 수밖에 없어서, 사진빨만 좋으면 더 실망 클 듯.`,
          `브라이드앤유 쪽 특유의 예쁜 연출은 있는데 데일리 만족도랑은 또 다른 문제 같아.`,
          `나도 이런 원피스류는 제품컷 보고 샀다가 내 몸에선 안 나온 적 많아서 조심하게 됨.`,
          `${primary?.source} 기준으로는 굉장히 매끈한데, 실제 후기는 체형 타는 옷이라는 말이 나올 만함.`,
          `사진 보고 기대한 만큼 실착이 안 나오면 “예쁜데 손 안 감”으로 가기 쉬운 가격대.`,
          `ㄴ 맞아. 만족하는 사람은 엄청 만족하겠지만, 평균적으로는 체형 조건을 좀 탐.`,
        ],
      };
    case "T13":
      return {
        feedLine: `${primaryName}와 ${secondaryName} 핏 기준으로, 렉토 팬츠 사이즈 1/2에서 허리보다 힙과 기장을 어떻게 볼지 묻는 스레드.`,
        detailLead: `${post.hook}\n보고 있는 건 ${primaryName} (${primary?.price}) 기준인데, 후기들 보면 허리는 맞아도 힙이나 뒷부분 여유 때문에 한 사이즈 업하라는 말이 꽤 있더라. 반대로 ${secondaryName} 같은 와이드 쪽은 넉넉한데 내가 원하는 건 그 정도까지는 아니어서 더 애매해. 결국 허리 하나만 보고 갈지, 힙과 기장 때문에 한 업할지 의견 듣고 싶어.`,
        comments: [
          `${primaryName}는 허리만 맞는다고 끝나는 팬츠가 아니라서 사이즈 고민 이해됨. 힙이랑 기장 때문에 한 업 추천하는 사람 많을 듯.`,
          `${secondaryName}까지 같이 보면 와이드 여유는 다른데, 네가 걱정하는 건 오히려 뒤에서 당기는 느낌 같아.`,
          `${primary?.price} 생각하면 수선 전제보다 처음부터 편한 쪽으로 가는 게 낫지 않나 싶음.`,
          `렉토 팬츠는 정면보다 옆/뒤에서 사이즈 티 나는 경우 많아서 허리만 믿고 가면 후회할 수도 있어.`,
          `나였으면 2 사고 허리 잡는 쪽. 힙 불편한 팬츠는 손이 진짜 안 감.`,
          `${primary?.source} 기준으로도 정교한 팬츠인 만큼 애매하면 작은 쪽보다 큰 쪽이 만족도 높을 것 같아.`,
          `기장도 생각보다 중요해서, 한 업했을 때 떨어지는 선이 더 예쁠 가능성 큼.`,
          `ㄴ 맞아. 허리는 고칠 수 있어도 힙이랑 여유 부족은 해결이 안 됨.`,
        ],
      };
    case "T14":
      return {
        feedLine: `${primaryName} (${primary?.price}) 기준으로, COS 드롭숄더 셔츠가 상체를 부하게 만드는지 따지는 핏 질문.`,
        detailLead: `${post.hook}\n지금 보는 기준은 ${primaryName} (${primary?.price})인데 설명상으로도 소재가 뻣뻣하고 어깨가 내려오는 타입이더라. 원래 COS 셔츠 특유의 낙낙함은 좋아하는데, 내가 원하는 건 “여리한 오버핏”이지 “상체가 커 보이는 셔츠”는 아니라서 고민됨. 드롭숄더 맛으로 입는 게 맞는지, 체형 따라 부해 보이는 쪽인지 궁금해.`,
        comments: [
          `${primaryName} 설명만 봐도 드롭숄더랑 밀도 있는 소재라 여리한 쪽보단 구조적인 핏에 가까워 보여.`,
          `${primary?.price} 대비 셔츠 퀄은 괜찮아 보여도, 상체 부피 걱정하는 사람한텐 핏 자체가 장벽일 듯.`,
          `COS 셔츠는 예쁘게 큰 게 아니라 진짜 커 보이는 경우가 있어서 질문 포인트가 너무 현실적임.`,
          `어깨선 내려오는 위치가 체형이랑 안 맞으면 바로 부해 보여. 특히 상체 있는 편이면 더.`,
          `나도 COS 셔츠 몇 번 입어봤는데 기대가 “여리한 오버핏”이면 보통 실망했어.`,
          `${primary?.source} 기준 제품도 소재가 힘 있는 편이라 부피감은 더 살아날 것 같아.`,
          `여리핏 기대하면 비추천이고, 아예 구조적인 셔츠로 입겠다면 괜찮은 타입.`,
          `ㄴ 맞음. 이건 여리함보다 쿨한 실루엣 쪽으로 받아들여야 만족도 높을 듯.`,
        ],
      };
    case "T16":
      return {
        feedLine: `${primaryName}` + ` / ${secondaryName} 기준으로, 르917 코트의 44/55 경계 사이즈에서 오버핏과 정핏 중 뭘 택할지 묻는 스레드.`,
        detailLead: `${post.hook}\n레퍼런스는 ${primaryName} (${primary?.price})랑 ${secondaryName} (${secondary?.price}) 두 쪽을 같이 보고 있어. 둘 다 어깨가 있는 코트라 오버핏으로 가면 브랜드 무드는 잘 살 것 같은데, 내 체형에서는 오히려 상체가 더 커 보일까 봐 걱정돼. 그래서 이 브랜드는 애매한 사이즈면 진짜 한 사이즈 크게 가야 예쁜지, 아니면 정핏이 더 낫는지 경험담이 필요함.`,
        comments: [
          `${primaryName} 같은 코트는 무드만 보면 크게 입고 싶어지는데, 실제론 애매한 체형에서 바로 부해질 수 있어.`,
          `${secondaryName} 설명처럼 드롭숄더 결이 있으면 오버핏 갔을 때 생각보다 상체가 더 넓어 보일 것 같아.`,
          `${primary?.price} / ${secondary?.price} 가격대면 코트는 만족도 오래 가야 해서, 무드보다 체형 맞는 쪽이 더 중요함.`,
          `르917는 애매하면 정핏 추천하는 후기 종종 본 것 같아. 큰 쪽이 무조건 예쁜 브랜드는 아닌 느낌.`,
          `나도 코트는 오버핏 고집하다가 사진보다 실착이 별로였던 적 많아서 이 고민 이해됨.`,
          `${secondary?.source} 기준 front zipper coat도 벨트나 어깨 때문에 체형 영향 꽤 받을 듯.`,
          `44/55 경계면 사이즈 하나 올리는 순간 갑자기 코트가 사람을 입는 느낌 날 수 있어.`,
          `ㄴ 맞아. 이 브랜드는 애매하면 정핏으로 정리하는 쪽이 더 고급스럽게 남을 것 같아.`,
        ],
      };
    case "T17":
      return {
        feedLine: `${primaryName}와 ${secondaryName} 정보 기준으로, 아모멘토 니트의 예쁨 대비 보풀/관리 이슈를 다루는 실착 후기 스레드.`,
        detailLead: `${post.hook}\n산 건 ${primaryName} (${primary?.price}) 계열로 보고 있고, 비교하면서 같이 본 게 ${secondaryName} (${secondary?.price})였어. 처음 받았을 때는 질감이 진짜 예뻐서 만족했는데, 막상 몇 번 입으니까 소매랑 몸판에 사용감이 금방 올라오더라. 그래서 이 브랜드 니트는 “예쁜 대신 관리비 드는 옷”으로 받아들이면 맞는지, 아니면 내가 기대치를 너무 높게 잡은 건지 궁금함.`,
        comments: [
          `${primaryName} 예쁜 건 인정인데 ${primary?.price}면 세 번 입고 보풀 오는 순간 체감 확 식을 것 같아.`,
          `${secondaryName} 같은 집업까지 같이 보면 브랜드가 전체적으로 텍스처는 잘 뽑는데 내구성 기대치는 조금 내려놔야 할 수도.`,
          `니트류는 실착 만족도가 관리 난이도에 바로 묶여서, 이 정도 가격이면 더 예민하게 보게 됨.`,
          `아모멘토는 “예쁜 대신 신경 써야 하는 옷”이라고 생각하면 맞는 것 같아.`,
          `나도 비슷한 결 니트 샀다가 팔 안쪽 보풀 빨리 올라와서 손 덜 가게 되더라.`,
          `${primary?.source} 기준 상품은 너무 예쁘게 보이는데, 실제론 마찰 많은 부위부터 바로 티 날 것 같음.`,
          `브랜드 무드값은 충분한데 내구성까지 기대하면 아쉬움 남을 타입.`,
          `ㄴ 맞아. 만족도는 높은데 관리비까지 같이 산 느낌.`,
        ],
      };
    case "T18":
      return {
        feedLine: `${primaryName}와 ${secondaryName}를 같이 보고, 마지셔우드 백의 수납/입구 구조가 실사용에서 얼마나 불편한지 짚는 후기 스레드.`,
        detailLead: `${post.hook}\n지금 기준으로 보는 건 ${primaryName} (${primary?.price})랑 ${secondaryName} (${secondary?.price})인데, 둘 다 들고 나가면 사진은 진짜 예뻐. 근데 실제로 써보면 입구가 좁고 안쪽이 생각보다 답답해서 카드지갑, 쿠션, 립 정도만 들어가도 손이 바빠지더라. 그래서 이건 디자인 만족도를 감수하고 들 만한지, 아니면 결국 데일리로는 멀어지는지 궁금함.`,
        comments: [
          `${primaryName}류가 딱 이런 타입 같아. 들었을 때는 예쁜데 입구 좁으면 바로 손 안 감.`,
          `${secondaryName}도 같이 보면 브랜드가 추구하는 쉐입은 확실한데, 그만큼 수납은 늘 타협해야 하는 느낌.`,
          `${primary?.price} / ${secondary?.price} 생각하면 디자인값은 충분하지만 실사용 질문엔 다들 조심스러울 듯.`,
          `가방은 예쁘기만 하면 안 되고 물건 꺼낼 때 안 짜증나야 손이 가는데, 이건 그 지점이 약해 보여.`,
          `나도 이런 미니백류는 초반 만족도 높다가도 결국 데일리에서 밀리더라.`,
          `${primary?.source} 제품컷만 보면 모르는데, 실제 후기는 내부 구조 얘기 꼭 나오게 되어 있음.`,
          `사진용 만족도는 높아도 데일리 질문엔 애매하다는 말 나올 만한 가방.`,
          `ㄴ 맞아. 예쁜데 자주 들지는 않는 대표 케이스.`,
        ],
      };
    default:
      return null;
  }
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
  const sources = (TOPIC_SOURCES[topic.id] || []).map((key) => SOURCE_LIBRARY[key]);
  const rewrite = buildPriorityThreadRewrite({ ...topic, sources });

  return {
    ...topic,
    sources,
    detailLead: rewrite?.detailLead || topic.hook,
    sourceFeedLine: rewrite?.feedLine || null,
    isPriorityThread: PRIORITY_THREAD_IDS.has(topic.id),
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

const SEARCH_RESULT_POST_IDS = ["T09", "T08", "T13", "T01", "T12", "T10", "T14", "T17"];

function buildSearchResult(post, index) {
  const primary = post.sources[0];
  const keywords = [post.brands[0], post.debate.split(",")[0]?.trim(), post.tone].filter(Boolean);

  return {
    id: post.id,
    postId: post.id,
    title: post.title,
    hook: post.hook,
    author: post.author,
    handle: post.handle,
    time: `${12 + index * 4}m`,
    image: post.image,
    likes: post.likes + 20,
    replies: post.replies,
    saves: 48 + seededNumber(`${post.id}-save`, 120),
    keywords,
    sourceLabel: primary ? `${shortenTitle(primary.title)} · ${primary.price}` : post.brands.join(" / "),
  };
}

const SEARCH_RESULTS = SEARCH_RESULT_POST_IDS.map((id, index) =>
  buildSearchResult(FEED_POSTS.find((post) => post.id === id), index),
);

function authorInitials(author) {
  return author
    .split(".")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 2);
}

function buildThreadSummary(post) {
  const sourceLine =
    post.sources.length > 0
      ? `근거 출처는 ${post.sources.map((source) => `${shortenTitle(source.title)} (${source.price})`).join(" / ")}.`
      : "근거 출처 연결 없음.";

  return [
    {
      title: "Overall sentiment",
      content: `${TYPE_LABEL[post.type]} 성격의 스레드로 읽히며, 전체 반응은 "${post.expected}" 쪽으로 수렴한다. ${sourceLine}`,
    },
    {
      title: "Top repeated opinions",
      content: `1. ${post.debate.split(",")[0]} 이 제일 많이 지적됨.\n2. ${post.brands.join(", ")} 특유의 무드 대비 실제 만족도를 따지는 반응이 많음.\n3. ${post.sources[0] ? `${shortenTitle(post.sources[0].title)} 기준 가격/정보가 댓글 판단 근거로 반복됨.` : "칭찬보다 수정 조언형 댓글 비중이 높음."}`,
    },
    {
      title: "Actionable styling suggestions",
      content: `1. ${post.debate.split(",")[0]} 중심으로 다시 보정하기.\n2. ${post.debate.split(",")[1] || "이너 톤"} 쪽을 한 단계 더 정리하기.\n3. 구매/착용 의사결정은 "${post.expected}" 기준으로 좁히고, ${post.sources[0] ? `${post.sources[0].source} 기준 정보까지 함께 보기.` : "추가 출처 확보하기."}`,
    },
  ];
}

function buildRelatedThreads(post) {
  return FEED_POSTS.filter(
    (candidate) =>
      candidate.id !== post.id &&
      candidate.brands.some((brand) => post.brands.includes(brand)),
  ).slice(0, 3);
}

function buildComments(post) {
  const baseLikes = seededNumber(post.id, 18, 6);
  const [p1, p2 = "가격값", p3 = "무드"] = post.debate.split(",").map((item) => item.trim());
  const rewrite = buildPriorityThreadRewrite(post);

  if (rewrite?.comments) {
    return rewrite.comments.map((text, index) => ({
      id: `${post.id}-${index + 1}`,
      user: COMMENT_PERSONAS[index].user,
      handle: COMMENT_PERSONAS[index].handle,
      avatar: COMMENT_PERSONAS[index].avatar,
      time: ["1m", "58s", "54s", "49s", "44s", "40s", "36s", "31s"][index],
      text,
      likes: [baseLikes + 16, baseLikes + 9, baseLikes + 4, baseLikes + 7, baseLikes + 12, baseLikes + 8, baseLikes + 3, baseLikes + 2][index],
      type: COMMENT_PERSONAS[index].type,
      replyTo: index === 7 ? `${post.id}-7` : null,
      liked: index === 1,
    }));
  }

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
  const [activeSearchQuery, setActiveSearchQuery] = useState("렉토 팬츠");

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
  const relatedThreads = buildRelatedThreads(activePost);

  const searchResults = useMemo(() => {
    const normalizedQuery = activeSearchQuery.toLowerCase();
    const filtered = SEARCH_RESULTS.filter((item) => {
      const haystack = [
        item.title,
        item.hook,
        item.sourceLabel,
        ...item.keywords,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
    return filtered.length > 0 ? filtered : SEARCH_RESULTS.slice(0, 4);
  }, [activeSearchQuery]);

  const openFeed = () => setView("feed");
  const openSearch = () => setView("search");

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="sticky top-0 z-20 border-b border-zinc-800/80 bg-black/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {view === "thread" ? (
              <button
                type="button"
                onClick={openFeed}
                className="rounded-full border border-zinc-800 bg-zinc-900 p-2 transition hover:bg-zinc-800"
              >
                <ArrowLeft className="h-4 w-4 text-zinc-300" />
              </button>
            ) : view === "search" ? (
              <button
                type="button"
                onClick={openFeed}
                className="rounded-full border border-zinc-800 bg-zinc-900 p-2 transition hover:bg-zinc-800"
              >
                <ArrowLeft className="h-4 w-4 text-zinc-300" />
              </button>
            ) : (
              <button
                type="button"
                onClick={openSearch}
                className="rounded-full border border-zinc-800 bg-zinc-900 p-2 transition hover:bg-zinc-800"
              >
                <Search className="h-4 w-4 text-zinc-500" />
              </button>
            )}
            <div>
              <p className="text-sm font-semibold tracking-tight text-zinc-100">AI Fashion Forum</p>
              <p className="text-xs text-zinc-500">
                {view === "feed"
                  ? "For you"
                  : view === "search"
                    ? "검색"
                    : activePost.title}
              </p>
            </div>
          </div>
          <div className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400">
            {view === "feed" ? "국내 여성 패션" : view === "search" ? "실시간 탐색" : `${activePost.replies} replies`}
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
                    <p className="text-sm font-semibold text-zinc-100">오늘 많이 저장된 토픽</p>
                    <p className="mt-1 text-sm leading-6 text-zinc-500">
                      출근룩, 실착 후기, 가격값 논쟁, 성수에서 자주 언급되는 도메스틱 브랜드 얘기가 함께 뜨는 흐름.
                    </p>
                  </div>
                  <div className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
                    저장 급상승
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-b border-zinc-800 px-4 py-3 text-xs text-zinc-500 sm:grid-cols-4">
                <div>출근룩 질문 많음</div>
                <div>실착 후기 반응 큼</div>
                <div>브랜드 실명 대화</div>
                <div>가격값 논쟁 상승</div>
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
                          {TYPE_LABEL[post.type]}
                        </span>
                        <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-400">
                          {post.brands.join(" / ")}
                        </span>
                      </div>

                      <p className="mt-3 text-[15px] font-medium leading-6 text-zinc-100">{post.title}</p>
                      <p className="mt-1 text-[15px] leading-6 text-zinc-300">{post.hook}</p>
                      {post.sourceFeedLine && <p className="mt-2 text-sm leading-6 text-zinc-500">{post.sourceFeedLine}</p>}

                      <div className="mt-3 grid grid-cols-[1fr_auto] gap-3">
                        <div className="min-w-0">
                          {post.sources.length > 0 && (
                            <div className="mb-3 flex flex-wrap gap-2">
                              {post.sources.map((source) => (
                                <span
                                  key={`${post.id}-${source.title}`}
                                  className="rounded-full border border-zinc-800 bg-black px-3 py-1 text-xs text-zinc-400"
                                >
                                  Ref: {shortenTitle(source.title)}
                                </span>
                              ))}
                            </div>
                          )}
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

        {view === "search" && (
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-4"
          >
            <div className="rounded-[28px] border border-zinc-800 bg-zinc-950/80 p-4">
              <div className="rounded-3xl border border-zinc-800 bg-black/50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Search className="h-4 w-4 text-zinc-500" />
                  <span className="text-sm text-zinc-200">{activeSearchQuery}</span>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">Recent searches</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SEARCH_RECENTS.map((query) => (
                    <button
                      key={query}
                      type="button"
                      onClick={() => setActiveSearchQuery(query)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                        activeSearchQuery === query
                          ? "border-zinc-600 bg-zinc-800 text-zinc-100"
                          : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                      }`}
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">Trending now</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {SEARCH_TRENDING.map((query, index) => (
                    <button
                      key={query}
                      type="button"
                      onClick={() => setActiveSearchQuery(query)}
                      className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-black/40 px-4 py-3 text-left transition hover:border-zinc-700 hover:bg-zinc-900"
                    >
                      <div>
                        <p className="text-sm text-zinc-100">{query}</p>
                        <p className="mt-1 text-xs text-zinc-500">{24 + index * 7}분 전부터 반응 증가</p>
                      </div>
                      <span className="text-xs text-zinc-500">{index + 1}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-zinc-800 bg-zinc-950/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-100">추천 브랜드</p>
                  <p className="mt-1 text-sm text-zinc-500">요즘 검색이 많이 붙는 국내 여성 패션 키워드</p>
                </div>
                <span className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400">Brands</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {SEARCH_SUGGESTED_BRANDS.map((brand) => (
                  <button
                    key={brand.name}
                    type="button"
                    onClick={() => setActiveSearchQuery(brand.name)}
                    className="rounded-2xl border border-zinc-800 bg-black/40 p-4 text-left transition hover:border-zinc-700 hover:bg-zinc-900"
                  >
                    <p className="text-sm font-medium text-zinc-100">{brand.name}</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">{brand.note}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-zinc-800 bg-zinc-950/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-100">Threads</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    "{activeSearchQuery}" 관련 대화 {searchResults.length}개
                  </p>
                </div>
                <span className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400">Top</span>
              </div>

              <div className="mt-4 space-y-3">
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openPost(item.postId)}
                    className="flex w-full gap-3 rounded-[24px] border border-zinc-800 bg-black/30 p-3 text-left transition hover:border-zinc-700 hover:bg-zinc-900"
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      className="h-24 w-24 rounded-2xl border border-zinc-800 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-zinc-100">{item.author}</span>
                        <span className="truncate text-sm text-zinc-500">{item.handle}</span>
                        <span className="text-xs text-zinc-600">{item.time}</span>
                      </div>
                      <p className="mt-2 text-[15px] font-medium leading-6 text-zinc-100">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-zinc-400">{item.hook}</p>
                      <p className="mt-2 text-xs text-zinc-500">{item.sourceLabel}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.keywords.map((keyword) => (
                          <span
                            key={`${item.id}-${keyword}`}
                            className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-300"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
                        <span>{formatCount(item.likes)} likes</span>
                        <span>{item.replies} replies</span>
                        <span>{item.saves} saves</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-zinc-800 bg-zinc-950/80 p-4">
              <p className="text-sm font-semibold text-zinc-100">컬렉션으로 보기</p>
              <div className="mt-4 grid gap-3">
                {SEARCH_COLLECTIONS.map((collection) => (
                  <div key={collection.title} className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                    <p className="text-sm text-zinc-100">{collection.title}</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">{collection.subtitle}</p>
                  </div>
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
                        {TYPE_LABEL[activePost.type]}
                      </span>
                      <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-400">
                        {activePost.brands.join(" / ")}
                      </span>
                    </div>

                    <p className="mt-3 text-lg font-semibold leading-7 text-zinc-100">{activePost.title}</p>
                    <p className="mt-2 whitespace-pre-line text-[15px] leading-6 text-zinc-100">
                      {activePost.detailLead}
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
                  <p className="text-sm font-semibold text-zinc-100">같이 보는 글</p>
                  <p className="text-sm text-zinc-500">비슷한 브랜드와 고민으로 저장된 스레드</p>
                </div>
                <div className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400">
                  {relatedThreads.length} threads
                </div>
              </div>

              <div className="grid gap-3">
                {relatedThreads.map((post) => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => openPost(post.id)}
                    className="rounded-2xl border border-zinc-800 bg-black/40 p-4 text-left transition hover:border-zinc-700 hover:bg-zinc-900"
                  >
                    <p className="text-sm font-medium text-zinc-100">{post.title}</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">{post.hook}</p>
                    <p className="mt-2 text-xs text-zinc-500">{post.brands.join(" / ")} · {post.expected}</p>
                  </button>
                ))}
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16, duration: 0.35 }}
              className="mt-4 rounded-[28px] border border-zinc-800 bg-zinc-950/80 p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-zinc-100">읽는 포인트</p>
                  <p className="text-sm text-zinc-500">댓글에서 반복되는 판단 기준</p>
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
          </>
        )}
      </main>

      <div className="sticky bottom-0 z-20 border-t border-zinc-800/80 bg-black/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-around px-6 py-3">
          <button
            type="button"
            onClick={openFeed}
            className={`rounded-full p-2 transition ${view === "feed" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-200"}`}
          >
            <Home className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={openSearch}
            className={`rounded-full p-2 transition ${view === "search" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-200"}`}
          >
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
