import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  createBaselineWorldRules,
  createSeededWorld,
  runSingleTick,
} from "../../packages/agent-core/tick-engine.js";
import {
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  Hash,
  Heart,
  Home,
  MessageCircle,
  Pause,
  PenSquare,
  Play,
  Repeat2,
  Search,
  Send,
  SkipForward,
  SlidersHorizontal,
  User,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import crawledImageManifest from "./src/data/crawledImageManifest.json";
import openaiOutfitPreviewManifest from "./src/data/openaiOutfitPreviewManifest.json";
import resolvedPostImageManifest from "./src/data/resolvedPostImageManifest.json";

const APPROVED_CRAWLED_IMAGE_POOL = crawledImageManifest
  .filter((image) => image.audit_status === "approved")
  .map((image) => ({
    ...image,
    src: `${import.meta.env.BASE_URL}${image.assetPath}`,
  }));

const APPROVED_OUTFIT_PREVIEW_MAP = Object.fromEntries(
  (openaiOutfitPreviewManifest.posts || [])
    .filter((entry) => entry.ui_attachment?.approved && entry.ui_attachment?.assetPath)
    .map((entry) => [
      entry.post_id,
      {
        ...entry,
        src: `${import.meta.env.BASE_URL}${entry.ui_attachment.assetPath}`,
      },
    ]),
);

const APPROVED_SUPPORTING_SCENE_MAP = Object.fromEntries(
  (openaiOutfitPreviewManifest.posts || [])
    .filter((entry) => entry.scene_attachment?.approved && entry.scene_attachment?.assetPath)
    .map((entry) => [
      entry.post_id,
      {
        ...entry,
        src: `${import.meta.env.BASE_URL}${entry.scene_attachment.assetPath}`,
      },
    ]),
);

const PRIMARY_OUTFIT_SHOT_TYPES = new Set(["outfit", "awkward", "size"]);

const TYPE_LABEL = {
  outfit: "오늘 내 코디 어떤지 봐줘",
  awkward: "무드/분위기는 좋은데 어딘가 어색한 코디",
  buy: "이 제품 살지 말지",
  size: "사이즈/핏 도움 요청",
  review: "실착해보니 생각과 달랐던 후기",
};

const POST_FORMAT_LABEL = {
  style_question: "스타일 질문",
  daily_snapshot: "데일리 스냅샷",
  pet_episode: "펫 에피소드",
  empathy_post: "가벼운 공감글",
};

const POST_FORMAT_BADGE_STYLE = {
  style_question: "border-slate-200 bg-white text-slate-600",
  daily_snapshot: "border-sky-200 bg-sky-50 text-sky-700",
  pet_episode: "border-amber-200 bg-amber-50 text-amber-700",
  empathy_post: "border-rose-200 bg-rose-50 text-rose-700",
};

const TOPIC_TYPE_MAP = {
  outfit: "outfit_check",
  awkward: "awkward_fit_check",
  buy: "buy_decision",
  size: "size_help",
  review: "real_wear_review",
};

const ALIGNMENT_BLUEPRINTS = {
  outfit: {
    imageEvidenceType: "mirror_selfie",
    imageEvidenceRole: "commute_outfit_balance_check",
    validationStatus: "review_required",
    visibleEvidenceNote: (topic) =>
      `${topic.tone} 맥락에서 전신 비율, 상하 밸런스, 신발과 하의 연결감이 보여야 한다.`,
  },
  awkward: {
    imageEvidenceType: "fit_comparison",
    imageEvidenceRole: "fit_delta_comparison",
    validationStatus: "review_required",
    visibleEvidenceNote: (topic) =>
      `${topic.debate.split(",")[0]}처럼 어색한 지점이 이미지 안에서 직접 비교 가능해야 한다.`,
  },
  buy: {
    imageEvidenceType: "product_photo",
    imageEvidenceRole: "product_shape_reference",
    validationStatus: "review_required",
    visibleEvidenceNote: () =>
      "제품 실루엣, 가격값 판단 근거, 대체 가능성을 읽을 수 있는 제품 또는 착용 맥락이 필요하다.",
  },
  size: {
    imageEvidenceType: "mirror_selfie",
    imageEvidenceRole: "full_body_proportion_check",
    validationStatus: "review_required",
    visibleEvidenceNote: () =>
      "허리, 힙, 기장, 어깨선처럼 실제 사이즈 판단에 필요한 신체 비율이 보여야 한다.",
  },
  review: {
    imageEvidenceType: "review_snapshot",
    imageEvidenceRole: "wear_and_texture_review",
    validationStatus: "review_required",
    visibleEvidenceNote: () =>
      "실사용 흔적, 착용 후 만족도, 소재 변화나 수납/불편 포인트 같은 lived context가 보여야 한다.",
  },
};

const SEARCH_RECENTS = [
  "출근룩 과한지",
  "팬츠 기장 수선",
  "회사용 가방",
  "니트 보풀",
  "셔츠 부해보임",
];

const SEARCH_TRENDING = [
  "지하철에서 불편한 가방",
  "팬츠 수선 어디까지",
  "회사에 입기 괜찮은 자켓",
  "29CM 장바구니 고민",
  "세탁 후 니트 핏",
];

const SEARCH_SUGGESTED_BRANDS = [
  { name: "RECTO", note: "팬츠 핏 / 사이즈 업다운 / 출근용 슬랙스 고민" },
  { name: "AMOMENTO", note: "셔츠 / 니트 / 몇 번 입고 느끼는 실물 체감" },
  { name: "LOW CLASSIC", note: "블레이저 / 셔츠 / 옷장 활용도 점검" },
  { name: "MARGE SHERWOOD", note: "가방 / 지하철 출근 / 실사용 만족도" },
];

const SEARCH_COLLECTIONS = [
  { title: "출근 전에 많이 저장된 글", subtitle: "핏 수정 조언형 스레드 중심" },
  { title: "회사 가기 전 다시 보는 글", subtitle: "가방, 팬츠 길이, 셔츠 핏처럼 바로 판단 필요한 주제" },
  { title: "실물 만족도 갈리는 아이템", subtitle: "제품컷 기대치와 실제 출근/주말 착용감 비교" },
];

const TOPICS = [
  {
    id: "T01",
    type: "outfit",
    title: "출근 전에 보니 팬츠 밑단이 로퍼에서 끊겨 보임",
    hook: "엘베 거울에서 찍었는데 오늘 회의룩으로 무난한지보다 밑단이 더 신경 쓰여",
    brands: ["LE 17 SEPTEMBRE", "COS"],
    description: "cropped blazer, straight slacks, black loafers, compact work bag",
    debate: "팬츠 길이, 로퍼 조합, 출근룩 비율",
    expected: "전체 무드는 괜찮은데 밑단이 애매해서 더 짧아 보인다는 반응",
    sourceMix: "C+B",
    tone: "출근 전 체크",
  },
  {
    id: "T02",
    type: "outfit",
    title: "오늘 외근 있는데 이 스커트까지 입으면 너무 힘준 사람 같을지",
    hook: "자켓은 괜찮은데 플리츠 스커트까지 가니까 평일 오전룩치곤 과한가 싶음",
    brands: ["AND YOU", "AMOMENTO"],
    description: "structured blazer, pleated midi skirt, low heels, mini shoulder bag",
    debate: "포멀 과함, 상하 밸런스, 외근룩 톤",
    expected: "예쁘긴 한데 출근룩보단 약속 있는 날 느낌이라는 반응",
    sourceMix: "C+B",
    tone: "회의 있는 날",
  },
  {
    id: "T03",
    type: "outfit",
    title: "올블랙 출근룩인데 그냥 무난한지 깔끔한지",
    hook: "검정 니트에 와이드 팬츠 입었는데 바빠서 입은 사람처럼 보일까 걱정",
    brands: ["AMOMENTO"],
    description: "black knit, wide pants, black belt, silver earrings",
    debate: "무채색 무드, 포인트 부족, 출근룩 완성도",
    expected: "심심하진 않은데 가방이나 귀걸이 하나 있으면 더 산다는 반응",
    sourceMix: "C+B",
    tone: "바쁜 아침 코디",
  },
  {
    id: "T04",
    type: "outfit",
    format: "daily_snapshot",
    title: "사무실 도착해서 다시 보니 오늘 셔츠 자켓 무드가 생각보다 괜찮아서 기록",
    hook: "아침엔 상체가 커 보인다고 고민했는데 막상 회사 거울에선 이 정도 힘 있는 실루엣이 제일 현실적이라 한 장 남김",
    brands: ["LOW CLASSIC", "Lemaire mood"],
    description: "boxy shirt jacket, wide trousers, soft leather flats",
    debate: "사무실 거울 기록, 오버핏 셔츠 자켓, 출근 후 무드",
    expected: "이런 담백한 출근 기록이 제일 자주 보게 된다는 반응",
    sourceMix: "C+B",
    tone: "사무실 도착 기록",
  },
  {
    id: "T05",
    type: "awkward",
    title: "치마는 괜찮은데 로퍼 때문에 출근길에 갑자기 답답해 보이는지",
    hook: "저장해둔 룩대로 입었는데 현관 거울에서 보니 발끝 쪽이 무거워 보여",
    brands: ["RECTO", "MARGE SHERWOOD"],
    description: "cotton shirt, long skirt, glossy loafers, sculptural bag",
    debate: "슈즈 미스, 하체 무게감, 출근길 실루엣",
    expected: "로퍼보다 가벼운 신발이었으면 덜 답답했겠다는 반응",
    sourceMix: "C+B",
    tone: "현관 앞 재검토",
  },
  {
    id: "T06",
    type: "awkward",
    format: "daily_snapshot",
    title: "점심 약속 있는 날이라 셔츠 청바지에 니트만 걸치고 나옴",
    hook: "회사 사람처럼만 보일까 걱정했는데 막상 나가려니 이런 담백한 조합이 제일 자주 손이 가서 그냥 기록해둠",
    brands: ["LOW CLASSIC", "MUSINSA STANDARD WOMAN"],
    description: "pale blue shirt, straight denim, white flats, black shoulder bag",
    debate: "점심 약속룩 기록, 셔츠 청바지 조합, 담백한 출근 무드",
    expected: "꾸민 듯 안 꾸민 듯한 평일 기록이라 좋다는 반응",
    sourceMix: "C+B",
    tone: "점심 전 기록",
  },
  {
    id: "T07",
    type: "awkward",
    title: "자켓은 괜찮은데 이너가 너무 튀어서 바로 촌스러워 보이는지",
    hook: "퇴근 후 약속 가려고 입었는데 자켓보다 이너가 먼저 보여서 망한 느낌",
    brands: ["THEOPEN PRODUCT"],
    description: "cropped jacket, printed inner top, straight skirt, ankle boots",
    debate: "이너 톤, 넥라인, 자켓 길이",
    expected: "이너만 바꿔도 훨씬 정리될 거라는 반응",
    sourceMix: "C+B",
    tone: "퇴근 후 약속",
  },
  {
    id: "T08",
    type: "buy",
    title: "셔츠 하나에 20만원 넘게 쓰는 게 맞는지 계속 장바구니만 봄",
    hook: "출근할 때나 주말 카페 갈 때 둘 다 입을 수 있으면 살까 싶은데 아직도 고민",
    brands: ["AMOMENTO"],
    description: "oversized shirt, crisp cotton, boxy shoulder line",
    debate: "가격값, 활용도, 원단 체감",
    expected: "핏은 좋지만 데일리 셔츠로는 브랜드값도 꽤 있다는 반응",
    sourceMix: "A+E+B",
    tone: "쇼핑 고민",
  },
  {
    id: "T09",
    type: "buy",
    format: "daily_snapshot",
    title: "비 오는 날에도 결국 제일 자주 손이 가는 건 차콜 팬츠 쪽이라 또 입음",
    hook: "새로 더 살지 고민은 많은데 막상 출근하려고 보면 오늘도 이런 톤 팬츠가 제일 현실적이라 한 장 남김",
    brands: ["RECTO", "COS", "INSILENCE WOMEN"],
    description: "straight slacks, slight flare, muted charcoal tone",
    debate: "출근 팬츠 기록, 비 오는 날 실루엣, 차콜 톤",
    expected: "결국 손이 자주 가는 건 이런 톤이라는 공감 반응",
    sourceMix: "A+E+B",
    tone: "비 오는 날 출근",
  },
  {
    id: "T10",
    type: "buy",
    format: "pet_episode",
    title: "출근 가방 들어보려는데 강아지가 현관에서 먼저 자리 잡아서 또 사진 망함",
    hook: "오늘은 가방 쉐입 한 번 보려고 했는데 리드줄 냄새 맡더니 문 앞을 막아서 결국 강아지 있는 버전만 남김",
    brands: ["MARGE SHERWOOD"],
    description: "mini shoulder bag, glossy leather, curved shape",
    debate: "현관 출근 준비, 강아지 방해, 가방 쉐입 기록",
    expected: "결국 망한 사진이 더 현실적이라 좋다는 반응",
    sourceMix: "A+E+B",
    tone: "강아지랑 나가기 직전",
  },
  {
    id: "T11",
    type: "buy",
    format: "daily_snapshot",
    title: "첫 블레이저 고민만 하다가 오늘도 결국 기본 자켓으로 출근",
    hook: "회사에도 주말에도 입을 수 있는 자켓 찾는 중인데 막상 나가려면 이런 무난한 결이 제일 손이 가서 기록만 늘어남",
    brands: ["LOW CLASSIC"],
    description: "single blazer, sharp shoulder, neutral taupe",
    debate: "기본 자켓 기록, 무난한 출근 셋업, 데일리 활용",
    expected: "이런 무난한 자켓이 제일 자주 입힌다는 반응",
    sourceMix: "A+E+B",
    tone: "평일 출근 기록",
  },
  {
    id: "T12",
    type: "buy",
    format: "pet_episode",
    title: "원피스 펼쳐두고 거울샷 찍으려는데 고양이가 먼저 자리를 차지함",
    hook: "주말 약속룩 후보 보려고 침대에 펼쳐뒀더니 고양이가 제일 비싼 원피스 위에 먼저 올라가서 결국 그 장면만 저장됨",
    brands: ["AND YOU"],
    description: "slim dress, soft drape, narrow straps",
    debate: "주말 약속 준비, 고양이 방해, 원피스 후보",
    expected: "결국 이런 생활감 있는 장면이 더 기억난다는 반응",
    sourceMix: "A+D+B",
    tone: "고양이랑 주말 준비",
  },
  {
    id: "T13",
    type: "size",
    title: "팬츠 사이즈 올리면 편할 것 같은데 핏 망가질까",
    hook: "허리는 맞는데 앉을 때 힙이랑 허벅지가 불안해서 1이냐 2냐 못 정함",
    brands: ["RECTO"],
    description: "tailored pants, low crease, long hem",
    debate: "허리-힙 괴리, 기장감, 사이즈 업",
    expected: "허리 수선 감수하고 한 사이즈 업이 낫다는 반응",
    sourceMix: "B+A+D",
    tone: "수선 전 고민",
  },
  {
    id: "T14",
    type: "size",
    format: "empathy_post",
    title: "매장에선 괜찮았는데 집 와서 다시 입으면 갑자기 다른 옷처럼 보이는 거 나만 그런지",
    hook: "셔츠도 그렇고 자켓도 그렇고 거울 바뀌는 순간 확신이 사라져서 결국 집 와서 다시 찍은 사진만 쌓임",
    brands: ["COS"],
    description: "drop shoulder shirt, dense cotton, crisp cuff",
    debate: "집 거울 착시, 다시 입어보기, 상체 부피 체감",
    expected: "다들 매장 조명이랑 집 조명이 너무 다르다고 공감하는 반응",
    sourceMix: "B+A+D",
    tone: "집 와서 다시 봄",
  },
  {
    id: "T15",
    type: "size",
    format: "empathy_post",
    title: "유행 팬츠보다 결국 내 다리에 맞는 핏이 따로 있는 거 다들 인정하는지",
    hook: "와이드가 예뻐 보여도 막상 출근 전에 거울 보면 또 익숙한 부츠컷 쪽이 제일 정리돼 보여서 늘 같은 고민 반복함",
    brands: ["LOW CLASSIC", "RECTO"],
    description: "slim bootcut pants, fitted knit, pointed shoes",
    debate: "체형 우선 공감, 팬츠 유행 피로, 결국 손 가는 핏",
    expected: "트렌드보다 자기 비율 맞는 옷이 제일 중요하다는 공감 반응",
    sourceMix: "B+A",
    tone: "다들 그런지 묻는 밤",
  },
  {
    id: "T16",
    type: "size",
    title: "코트 큰 사이즈가 예쁘다는데 나는 정핏이 나을지 계속 고민",
    hook: "44/55 사이인데 오버핏 가면 멋있을 것 같다가도 출근길엔 너무 부해 보일까 걱정",
    brands: ["LE 17 SEPTEMBRE"],
    description: "long wool coat, strong shoulder, narrow lapel",
    debate: "오버핏 미학, 체형 한계, 출근용 실루엣",
    expected: "애매한 체형이면 이 브랜드는 정핏이 더 낫다는 반응",
    sourceMix: "B+A+D",
    tone: "겨울 출근 코트",
  },
  {
    id: "T17",
    type: "review",
    format: "pet_episode",
    title: "니트 잠깐 내려놨는데 고양이가 바로 차지해서 오늘도 사진 망함",
    hook: "보풀 얘기하려고 펼쳐뒀더니 우리 고양이가 제일 먼저 올라가서 결국 니트보다 고양이 표정만 또렷하게 남음",
    brands: ["AMOMENTO"],
    description: "soft knit, brushed texture, loose sleeve",
    debate: "고양이 사고, 니트 생활감, 집에서 찍는 후기",
    expected: "비싼 니트일수록 고양이가 먼저 알아본다는 농담 섞인 반응",
    sourceMix: "D+A+B",
    tone: "고양이랑 집에서",
  },
  {
    id: "T18",
    type: "review",
    format: "pet_episode",
    title: "출근 가방 메고 있으니 강아지가 산책 가는 줄 알고 현관에서 난리 남",
    hook: "가방 리뷰 남기려던 건데 리드줄 물고 계속 돌진해서 결국 오늘 사진은 강아지 발만 제일 열심히 찍힘",
    brands: ["MARGE SHERWOOD"],
    description: "compact bag, glossy leather, narrow opening",
    debate: "현관 소동, 강아지 산책 오해, 출근 가방 기록",
    expected: "이런 생활 소동이 오히려 더 커뮤니티 같다는 반응",
    sourceMix: "D+A+B",
    tone: "현관 앞 소동",
  },
  {
    id: "T19",
    type: "review",
    format: "daily_snapshot",
    title: "오늘은 셔츠 하나만 바꿨는데 옷장 궁합이 조금 풀린 날이라 기록",
    hook: "평소엔 손이 잘 안 갔는데 데님 대신 슬랙스에 입으니 갑자기 오늘은 괜찮아 보여서 그냥 남겨둠",
    brands: ["LOW CLASSIC"],
    description: "structured shirt, slightly wide sleeve, ivory tone",
    debate: "옷장 궁합 기록, 셔츠 재발견, 오늘만 괜찮은 조합",
    expected: "이런 날 한 번씩 오면 다시 손이 간다는 반응",
    sourceMix: "D+A+B",
    tone: "평일 기록",
  },
  {
    id: "T20",
    type: "review",
    format: "empathy_post",
    title: "후기 믿고 산 니트가 맨살엔 까슬한 거 매번 나만 당하는 건지",
    hook: "급하게 입고 나가려다 결국 한 번 갈아입고 나오는 날이 너무 많아서 요즘은 후기보다 내 피부가 먼저 떠오름",
    brands: ["COS"],
    description: "wool blend knit, dry texture, clean neckline",
    debate: "후기 공감, 맨살 촉감, 결국 이너 찾게 되는 옷",
    expected: "후기 믿었다가 결국 이너 찾는 사람 많다는 공감 반응",
    sourceMix: "D+A+B",
    tone: "다들 그런지 궁금",
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

function getPostFormat(post) {
  return post?.format || "style_question";
}

function PostFormatBadge({ format, className = "" }) {
  const resolvedFormat = format || "style_question";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${POST_FORMAT_BADGE_STYLE[resolvedFormat]} ${className}`.trim()}
    >
      {POST_FORMAT_LABEL[resolvedFormat]}
    </span>
  );
}

function buildPriorityThreadRewrite(post) {
  if (getPostFormat(post) !== "style_question") {
    return null;
  }

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

function buildAlignmentMeta(topic, sources, imageAsset) {
  const blueprint = ALIGNMENT_BLUEPRINTS[topic.type];
  const expectedCommentAngle = topic.debate.split(",").map((item) => item.trim());
  const imageEvidenceType = imageAsset?.image_evidence_type || "product_photo";
  const imageMatchScore = imageEvidenceType === blueprint.imageEvidenceType ? 4 : 2;

  return {
    topic_type: TOPIC_TYPE_MAP[topic.type],
    text_intent: topic.hook,
    expected_comment_angle: expectedCommentAngle,
    image_evidence_type: blueprint.imageEvidenceType,
    image_evidence_role: blueprint.imageEvidenceRole,
    visible_evidence_note: blueprint.visibleEvidenceNote(topic),
    validation_status: blueprint.validationStatus,
    image_match_score: imageMatchScore,
  };
}

function buildProductEvidenceMeta(sources, imageAsset) {
  const bindings = sources.map((source, index) => ({
    sourceKey: source.key,
    id: `${source.source}-${source.title}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    title: source.title,
    source: source.source,
    url: source.url,
    price: source.price,
    note: source.note,
    role: index === 0 ? "대표 근거" : "보조 근거",
  }));

  return {
    has_named_product_refs: bindings.length > 0,
    representative_mode: bindings.length > 1 ? "product_tile_gallery" : "single_product_tile",
    fallback_mode: "product_reference_cards_only",
    blocked_generic_image_id: imageAsset?.audit_status === "rejected" ? imageAsset.image_id : null,
    bindings,
  };
}

function buildGeneratedThumbnail(title, source) {
  const safeTitle = title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeSource = source.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#27272a" />
          <stop offset="55%" stop-color="#18181b" />
          <stop offset="100%" stop-color="#09090b" />
        </linearGradient>
      </defs>
      <rect width="900" height="900" fill="url(#g)" rx="56" />
      <rect x="56" y="56" width="788" height="788" rx="44" fill="none" stroke="#3f3f46" stroke-width="3" />
      <rect x="88" y="104" width="210" height="44" rx="22" fill="rgba(24,24,27,0.9)" stroke="#52525b" />
      <text x="116" y="133" fill="#d4d4d8" font-size="20" font-family="Arial, sans-serif">제품 미리보기</text>
      <foreignObject x="88" y="196" width="724" height="472">
        <div xmlns="http://www.w3.org/1999/xhtml" style="color:#fafafa;font-family:Arial,sans-serif;font-size:54px;line-height:1.22;font-weight:700;">
          ${safeTitle}
        </div>
      </foreignObject>
      <text x="88" y="776" fill="#d4d4d8" font-size="32" font-family="Arial, sans-serif">${safeSource}</text>
      <text x="88" y="822" fill="#71717a" font-size="24" font-family="Arial, sans-serif">${safeSource}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function resolveBindingAsset(binding) {
  const sourceAsset = resolvedPostImageManifest.sources[binding.sourceKey] || null;
  const thumbnailUrl = sourceAsset?.thumbnail_url || buildGeneratedThumbnail(binding.title, binding.source);

  return {
    thumbnailUrl,
    assetSourceType: sourceAsset?.asset_source_type || "generated",
    assetStatus: sourceAsset?.asset_status || "resolved",
  };
}

function resolvePrimaryVisual(topic, sources, resolution, index) {
  const approvedOutfitPreview =
    PRIMARY_OUTFIT_SHOT_TYPES.has(topic.type) ? APPROVED_OUTFIT_PREVIEW_MAP[topic.id] || null : null;
  const approvedSupportingScene =
    !PRIMARY_OUTFIT_SHOT_TYPES.has(topic.type) ? APPROVED_SUPPORTING_SCENE_MAP[topic.id] || null : null;

  if (approvedOutfitPreview?.src) {
    return {
      image: approvedOutfitPreview.src,
      imageAsset: {
        image_id: `outfit-preview-${topic.id}`,
        image_evidence_type: ALIGNMENT_BLUEPRINTS[topic.type].imageEvidenceType,
        image_evidence_role: ALIGNMENT_BLUEPRINTS[topic.type].imageEvidenceRole,
        visible_evidence_note: "Approved outfit preview attachment is serving as the primary visual.",
        audit_status: "approved",
      },
    };
  }

  if (approvedSupportingScene?.src) {
    return {
      image: approvedSupportingScene.src,
      imageAsset: {
        image_id: `supporting-scene-${topic.id}`,
        image_evidence_type: "lifestyle_scene",
        image_evidence_role: "supporting_daily_life_context",
        visible_evidence_note:
          "Approved supporting lifestyle scene is serving as the primary visual for a non-primary discussion format.",
        audit_status: "approved",
      },
    };
  }

  if (PRIMARY_OUTFIT_SHOT_TYPES.has(topic.type)) {
    return {
      image: null,
      imageAsset: {
        image_id: `missing-outfit-preview-${topic.id}`,
        image_evidence_type: ALIGNMENT_BLUEPRINTS[topic.type].imageEvidenceType,
        image_evidence_role: ALIGNMENT_BLUEPRINTS[topic.type].imageEvidenceRole,
        visible_evidence_note:
          "No approved outfit preview is available yet, so the UI intentionally withholds unrelated product imagery.",
        audit_status: "withheld_until_approved_preview",
      },
    };
  }

  const primarySourceKey = resolution?.resolved_image_assets?.[0] || sources[0]?.key;
  const primarySource = sources.find((source) => source.key === primarySourceKey) || sources[0] || null;

  if (primarySource) {
    const resolved = resolveBindingAsset({
      sourceKey: primarySource.key,
      title: primarySource.title,
      source: primarySource.source,
    });

    return {
      image: resolved.thumbnailUrl,
      imageAsset: {
        image_id: `resolved-source-${primarySource.key}`,
        image_evidence_type: "product_photo",
        image_evidence_role: "product_shape_reference",
        visible_evidence_note:
          "Resolved product thumbnail is serving as the primary visual because no approved crawl asset exists for this post.",
        audit_status: "approved",
      },
    };
  }

  const approvedCrawlAsset =
    APPROVED_CRAWLED_IMAGE_POOL.length > 0
      ? APPROVED_CRAWLED_IMAGE_POOL[index % APPROVED_CRAWLED_IMAGE_POOL.length]
      : null;

  if (approvedCrawlAsset) {
    return {
      image: approvedCrawlAsset.src,
      imageAsset: approvedCrawlAsset,
    };
  }

  return {
    image: buildGeneratedThumbnail(topic.title, topic.brands[0] || "Fashion forum"),
    imageAsset: {
      image_id: `generated-fallback-${topic.id}`,
      image_evidence_type: "product_photo",
      image_evidence_role: "product_shape_reference",
      visible_evidence_note:
        "Generated thumbnail fallback is serving as the primary visual because no approved crawl or resolved product asset was available.",
      audit_status: "generated_fallback",
    },
  };
}

function ResolvedProductThumbnail({ binding, className, alt }) {
  const resolved = resolveBindingAsset(binding);
  const generatedThumbnail = buildGeneratedThumbnail(binding.title, binding.source);
  const [src, setSrc] = useState(resolved.thumbnailUrl);

  useEffect(() => {
    setSrc(resolved.thumbnailUrl);
  }, [resolved.thumbnailUrl]);

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setSrc(generatedThumbnail)}
      className={className}
    />
  );
}

function ProductMentionCard({ binding, variant = "feed" }) {
  const isFeed = variant === "feed";

  if (isFeed) {
    return (
      <a
        href={binding.url}
        target="_blank"
        rel="noreferrer"
        className="group relative block h-24 overflow-hidden rounded-[24px] border border-slate-200 bg-white text-left shadow-[0_14px_28px_rgba(15,23,42,0.06)] transition hover:border-slate-300 hover:bg-slate-50"
      >
        <ResolvedProductThumbnail
          binding={binding}
          alt={binding.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white/92 via-white/72 to-transparent px-2.5 pb-2 pt-6">
          <p className="line-clamp-2 text-[11px] font-medium leading-4 text-slate-900 transition group-hover:text-slate-950">
            {shortenTitle(binding.title)}
          </p>
        </div>
      </a>
    );
  }

  return (
    <a
      href={binding.url}
      target="_blank"
      rel="noreferrer"
      className="group block overflow-hidden rounded-[24px] border border-slate-200 bg-white text-left shadow-[0_14px_28px_rgba(15,23,42,0.06)] transition hover:border-slate-300 hover:bg-slate-50"
    >
      <ResolvedProductThumbnail
        binding={binding}
        alt={binding.title}
        className="h-36 w-full rounded-t-[24px] object-cover"
      />
      <div className="space-y-1 p-3">
        <p className="text-sm font-medium leading-5 text-slate-900 transition group-hover:text-slate-950">
          {binding.title}
        </p>
        <div className="flex items-center gap-2 text-xs">
          <p className="truncate text-slate-500">{binding.source}</p>
          {binding.price && <p className="truncate text-slate-400">{binding.price}</p>}
        </div>
      </div>
    </a>
  );
}

function buildFeedPost(topic, index) {
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
  const sources = (TOPIC_SOURCES[topic.id] || []).map((key) => ({ ...SOURCE_LIBRARY[key], key }));
  const rewrite = buildPriorityThreadRewrite({ ...topic, sources });
  const resolution = resolvedPostImageManifest.posts.find((entry) => entry.post_id === topic.id) || null;
  const primaryVisual = resolvePrimaryVisual(topic, sources, resolution, index);
  const alignment = buildAlignmentMeta(topic, sources, primaryVisual.imageAsset);
  const productEvidence = buildProductEvidenceMeta(sources, primaryVisual.imageAsset);

  return {
    ...topic,
    alignment,
    productEvidence,
    resolution,
    sources,
    detailLead: rewrite?.detailLead || topic.hook,
    sourceFeedLine: rewrite?.feedLine || null,
    isPriorityThread: PRIORITY_THREAD_IDS.has(topic.id),
    author,
    handle: `@${author}`,
    time,
    image: primaryVisual.image,
    imageAsset: primaryVisual.imageAsset,
    likes,
    replies,
    reposts,
    sampleReplies: [topic.expected, `${topic.debate.split(",")[0]} 얘기 많이 나올 듯`],
  };
}

const FEED_POSTS = TOPICS.map(buildFeedPost);

const SEARCH_RESULT_POST_IDS = ["T09", "T04", "T17", "T01", "T12", "T10", "T14", "T20"];

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
    keywords: [...keywords, post.alignment.topic_type],
    sourceLabel: primary ? `${shortenTitle(primary.title)} · ${primary.price}` : post.brands.join(" / "),
    productEvidence: post.productEvidence,
    format: getPostFormat(post),
  };
}

const SEARCH_RESULTS = SEARCH_RESULT_POST_IDS.map((id, index) =>
  buildSearchResult(FEED_POSTS.find((post) => post.id === id), index),
);

const TOPIC_CHANNEL_LABELS = {
  outfit_check: "outfit check",
  awkward_fit_check: "awkward fit",
  buy_decision: "buy decision",
  size_help: "size help",
  real_wear_review: "real wear review",
};

function countBy(items) {
  return items.reduce((accumulator, item) => {
    accumulator[item] = (accumulator[item] || 0) + 1;
    return accumulator;
  }, {});
}

function topEntries(items, limit = 4) {
  return Object.entries(countBy(items))
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([value]) => value);
}

function buildAuthorProfiles(posts) {
  const authors = [...new Set(posts.map((post) => post.author))];

  return authors.map((author, index) => {
    const authoredPosts = posts.filter((post) => post.author === author);
    const overlaps = posts
      .filter((post) => post.author !== author)
      .map((post) => ({
        author: post.author,
        overlap:
          post.brands.filter((brand) => authoredPosts.some((entry) => entry.brands.includes(brand))).length +
          post.type
            .split(" ")
            .filter(Boolean)
            .reduce(
              (sum, typeToken) =>
                sum + (authoredPosts.some((entry) => entry.type.includes(typeToken)) ? 1 : 0),
              0,
            ),
      }))
      .filter((entry) => entry.overlap > 0);
    const groupedOverlap = overlaps.reduce((accumulator, item) => {
      accumulator[item.author] = (accumulator[item.author] || 0) + item.overlap;
      return accumulator;
    }, {});
    const relatedAgents = Object.entries(groupedOverlap)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 4)
      .map(([relatedAuthor, score]) => ({
        id: relatedAuthor,
        author: relatedAuthor,
        score,
      }));

    return {
      id: author,
      author,
      handle: `@${author}`,
      initials: authorInitials(author),
      role: ["fit analyst", "community regular", "quiet observer", "taste logger", "repeat contributor"][
        index % 5
      ],
      accent: index % 2 === 0 ? "from-sky-300 to-indigo-400" : "from-emerald-300 to-teal-400",
      interestAreas: topEntries(
        authoredPosts.flatMap((post) => [
          ...post.brands,
          TOPIC_CHANNEL_LABELS[post.alignment.topic_type],
          post.debate.split(",")[0].trim(),
        ]),
      ),
      relationSummary: {
        trustCircleSize: relatedAgents.length + 2,
        repeatedNeighbors: relatedAgents.filter((item) => item.score > 1).length,
        activeThreads: authoredPosts.length,
        repliesReceived: authoredPosts.reduce((sum, post) => sum + post.replies, 0),
      },
      selfNarrativeHistory: authoredPosts.slice(0, 4).map((post, narrativeIndex) => ({
        id: `${author}-${post.id}`,
        tickLabel: `cycle ${narrativeIndex + 1}`,
        text: `${post.tone} 흐름에서 ${post.debate.split(",")[0].trim()} 쪽 감각을 더 자주 믿게 됐고, ${post.expected}`,
      })),
      representativePosts: authoredPosts.slice(0, 4),
      relatedAgents,
    };
  });
}

function buildTopicPages(posts) {
  return Object.values(
    posts.reduce((accumulator, post) => {
      const topicId = post.alignment.topic_type;

      if (!accumulator[topicId]) {
        accumulator[topicId] = {
          id: topicId,
          title: TOPIC_CHANNEL_LABELS[topicId] || topicId,
          description: post.alignment.visible_evidence_note,
          representativePosts: [],
          relatedAgentIds: new Set(),
          reactionSummary: {
            likes: 0,
            replies: 0,
            reposts: 0,
          },
          spotlightTags: new Set(),
        };
      }

      accumulator[topicId].representativePosts.push(post);
      accumulator[topicId].relatedAgentIds.add(post.author);
      accumulator[topicId].reactionSummary.likes += post.likes;
      accumulator[topicId].reactionSummary.replies += post.replies;
      accumulator[topicId].reactionSummary.reposts += post.reposts;
      post.debate.split(",").forEach((item) => accumulator[topicId].spotlightTags.add(item.trim()));

      return accumulator;
    }, {}),
  ).map((entry) => ({
    ...entry,
    representativePosts: entry.representativePosts.slice(0, 5),
    relatedAgents: [...entry.relatedAgentIds].slice(0, 4),
    spotlightTags: [...entry.spotlightTags].slice(0, 5),
  }));
}

const AUTHOR_PROFILES = buildAuthorProfiles(FEED_POSTS);
const AUTHOR_PROFILE_MAP = Object.fromEntries(AUTHOR_PROFILES.map((profile) => [profile.id, profile]));
const TOPIC_PAGES = buildTopicPages(FEED_POSTS);
const TOPIC_PAGE_MAP = Object.fromEntries(TOPIC_PAGES.map((topic) => [topic.id, topic]));

const SIM_POLICY_FLAGS = {
  baseline: "baseline",
  dampenAggression: "dampen_aggression",
  hideAggression: "hide_aggression",
};

const SIM_POLICY_OPTIONS = [
  SIM_POLICY_FLAGS.baseline,
  SIM_POLICY_FLAGS.dampenAggression,
  SIM_POLICY_FLAGS.hideAggression,
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildSimulationBookmark(entry, index) {
  const pulse = entry.world_effects?.find((effect) => effect.note?.includes("pulse")) || null;
  const isMajor = entry.action === "post" || entry.action === "comment" || Boolean(pulse);

  if (!isMajor) {
    return null;
  }

  return {
    id: `bookmark-${entry.tick}-${index}`,
    tick: entry.tick + 1,
    title: `Tick ${entry.tick + 1} · ${entry.action}`,
    note: pulse?.note || entry.reason,
  };
}

function buildSimulationRunView(world, policyFlag, runId = "live") {
  const entries = clone(world.replay.entries);
  const snapshots = clone(world.replay.snapshots);
  const bookmarks = entries
    .map((entry, index) => buildSimulationBookmark(entry, index))
    .filter(Boolean);
  const divergenceMoments = entries
    .map((entry, index) => {
      const previous = entries[index - 1];
      const actionShift = !previous || previous.action !== entry.action;

      if (!actionShift && entry.action !== "post") {
        return null;
      }

      return {
        id: `divergence-${entry.tick}`,
        tick: entry.tick + 1,
        title: actionShift ? `${entry.action} branch opened` : "identity drift checkpoint",
        note: entry.reason,
      };
    })
    .filter(Boolean)
    .slice(0, 6);

  return {
    id: runId,
    seed: world.seed,
    policyFlag,
    tick: world.tick,
    entries,
    snapshots,
    bookmarks,
    divergenceMoments,
    latestEntry: entries[entries.length - 1] || null,
  };
}

function buildSnapshotAgents(snapshot) {
  return snapshot.agents.slice(0, 5).map((agent) => ({
    id: agent.agent_id,
    handle: agent.handle,
    activity: agent.activity_level,
    repeatedRepliers: agent.relationship_summary.repeated_repliers || 0,
    narrative: agent.self_narrative.slice(-1)[0] || "No new visible narrative yet.",
  }));
}

function authorInitials(author) {
  return author
    .split(".")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 2);
}

function buildThreadSummary(post) {
  const format = getPostFormat(post);
  const sourceLine =
    post.sources.length > 0
      ? `근거 출처는 ${post.sources.map((source) => `${shortenTitle(source.title)} (${source.price})`).join(" / ")}.`
      : "근거 출처 연결 없음.";

  if (format === "daily_snapshot") {
    return [
      {
        title: "포스트 성격",
        content: `${POST_FORMAT_LABEL[format]}으로 보이며, ${post.expected} 쪽의 공감 반응이 중심이다. ${sourceLine}`,
      },
      {
        title: "사람들이 같이 본 지점",
        content: `1. ${post.debate.split(",")[0]} 쪽의 생활감.\n2. ${post.brands.join(", ")} 무드가 실제 일상에 얼마나 자연스럽게 붙는지.\n3. 저장형 이미지보다 다시 보게 되는 현실 기록인지 여부.`,
      },
      {
        title: "이 포스트가 주는 감각",
        content: `패션 판단보다 "오늘은 이런 무드였다"는 기록성이 먼저 읽힌다. 그래서 피드 안에서 숨을 고르게 만드는 역할을 한다.`,
      },
    ];
  }

  if (format === "pet_episode") {
    return [
      {
        title: "포스트 성격",
        content: `${POST_FORMAT_LABEL[format]}이지만 패션/생활 맥락이 분명해서, 반려동물이 단독 주제가 아니라 착장 기록의 현실감으로 작동한다. ${sourceLine}`,
      },
      {
        title: "댓글에서 반복되는 반응",
        content: `1. ${post.debate.split(",")[0]} 장면이 너무 현실적이라는 반응.\n2. ${post.brands.join(", ")} 같은 패션 정보도 자연스럽게 같이 읽힌다는 반응.\n3. 커뮤니티 톤이 더 따뜻해졌다는 말.`,
      },
      {
        title: "제품/무드 연결",
        content: `반려동물 에피소드가 중심처럼 보여도 실제로는 ${post.brands[0]} 무드와 일상 착용 장면을 더 오래 기억하게 만드는 보조 장치로 읽힌다.`,
      },
    ];
  }

  if (format === "empathy_post") {
    return [
      {
        title: "포스트 성격",
        content: `${POST_FORMAT_LABEL[format]}으로, 정답 요청보다 공감대 확인이 중심이다. ${sourceLine}`,
      },
      {
        title: "사람들이 붙는 이유",
        content: `1. ${post.debate.split(",")[0]}처럼 누구나 한 번쯤 겪는 고민.\n2. 브랜드/제품보다 착용 경험 자체에 대한 이야기.\n3. 판단보다 "나도 그랬다"는 댓글이 붙기 쉬운 문장 구조.`,
      },
      {
        title: "피드 안에서의 역할",
        content: `패션을 둘러싼 생활 감정선을 짧게 공유하면서도, 여전히 옷과 핏의 문맥 안에서 대화를 이어주는 포스트다.`,
      },
    ];
  }

  return [
    {
      title: "대화 흐름",
      content: `${TYPE_LABEL[post.type]} / ${post.alignment.topic_type} 성격의 스레드로 읽히며, 전체 반응은 "${post.expected}" 쪽으로 수렴한다. ${sourceLine}`,
    },
    {
      title: "댓글에서 많이 나온 말",
      content: `1. ${post.alignment.expected_comment_angle[0]} 이 제일 많이 지적됨.\n2. ${post.brands.join(", ")} 특유의 무드 대비 실제 만족도를 따지는 반응이 많음.\n3. ${post.sources[0] ? `${shortenTitle(post.sources[0].title)} 기준 가격/정보가 댓글 판단 근거로 반복됨.` : "칭찬보다 수정 조언형 댓글 비중이 높음."}`,
    },
    {
      title: "같이 보는 기준",
      content: `1. ${post.alignment.expected_comment_angle[0]} 중심으로 다시 보정하기.\n2. ${post.alignment.expected_comment_angle[1] || "이너 톤"} 쪽을 한 단계 더 정리하기.\n3. 구매/착용 의사결정은 "${post.expected}" 기준으로 좁히고, ${post.sources[0] ? `${post.sources[0].source} 기준 정보까지 함께 보기.` : "추가 출처 확보하기."}`,
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
  const format = getPostFormat(post);

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

  if (format === "daily_snapshot") {
    return [
      {
        id: `${post.id}-1`,
        user: COMMENT_PERSONAS[0].user,
        handle: COMMENT_PERSONAS[0].handle,
        avatar: COMMENT_PERSONAS[0].avatar,
        time: "1m",
        text: `이런 글이 중간에 있어야 피드가 진짜 생활감 있어 보여. ${post.expected}`,
        likes: baseLikes + 15,
        type: COMMENT_PERSONAS[0].type,
        replyTo: null,
        liked: false,
      },
      {
        id: `${post.id}-2`,
        user: COMMENT_PERSONAS[1].user,
        handle: COMMENT_PERSONAS[1].handle,
        avatar: COMMENT_PERSONAS[1].avatar,
        time: "56s",
        text: `${p1} 얘기라기보다 오늘 무드 기록 같아서 더 자주 보게 됨.`,
        likes: baseLikes + 8,
        type: COMMENT_PERSONAS[1].type,
        replyTo: null,
        liked: true,
      },
      {
        id: `${post.id}-3`,
        user: COMMENT_PERSONAS[2].user,
        handle: COMMENT_PERSONAS[2].handle,
        avatar: COMMENT_PERSONAS[2].avatar,
        time: "52s",
        text: `${post.brands[0]} 쪽 감도 좋아하는 사람들한텐 이런 현실 기록이 더 참고됨.`,
        likes: baseLikes + 5,
        type: COMMENT_PERSONAS[2].type,
        replyTo: null,
        liked: false,
      },
      {
        id: `${post.id}-4`,
        user: COMMENT_PERSONAS[3].user,
        handle: COMMENT_PERSONAS[3].handle,
        avatar: COMMENT_PERSONAS[3].avatar,
        time: "47s",
        text: `꾸민 티보다 실제 출근 전에 손 가는 조합 같아서 좋음.`,
        likes: baseLikes + 6,
        type: COMMENT_PERSONAS[3].type,
        replyTo: null,
        liked: false,
      },
    ];
  }

  if (format === "pet_episode") {
    return [
      {
        id: `${post.id}-1`,
        user: COMMENT_PERSONAS[0].user,
        handle: COMMENT_PERSONAS[0].handle,
        avatar: COMMENT_PERSONAS[0].avatar,
        time: "1m",
        text: `반려동물 얘기인데도 ${post.brands[0]} 무드랑 오늘 상황이 같이 읽혀서 밸런스 좋다.`,
        likes: baseLikes + 14,
        type: COMMENT_PERSONAS[0].type,
        replyTo: null,
        liked: false,
      },
      {
        id: `${post.id}-2`,
        user: COMMENT_PERSONAS[1].user,
        handle: COMMENT_PERSONAS[1].handle,
        avatar: COMMENT_PERSONAS[1].avatar,
        time: "57s",
        text: `${p1} 장면이 너무 현실적이라 오히려 광고컷보다 기억 남음.`,
        likes: baseLikes + 9,
        type: COMMENT_PERSONAS[1].type,
        replyTo: null,
        liked: true,
      },
      {
        id: `${post.id}-3`,
        user: COMMENT_PERSONAS[4].user,
        handle: COMMENT_PERSONAS[4].handle,
        avatar: COMMENT_PERSONAS[4].avatar,
        time: "50s",
        text: `펫 이야기만 남는 게 아니라 가방이랑 룩 상황이 같이 남아서 지금 방향 괜찮아 보여.`,
        likes: baseLikes + 7,
        type: COMMENT_PERSONAS[4].type,
        replyTo: null,
        liked: false,
      },
      {
        id: `${post.id}-4`,
        user: COMMENT_PERSONAS[7].user,
        handle: COMMENT_PERSONAS[7].handle,
        avatar: COMMENT_PERSONAS[7].avatar,
        time: "43s",
        text: `ㄴ 맞아. 반려동물이 주인공이라기보다 오늘 착장 장면을 더 살려주는 쪽이라 안 과함.`,
        likes: baseLikes + 4,
        type: COMMENT_PERSONAS[7].type,
        replyTo: `${post.id}-3`,
        liked: false,
      },
    ];
  }

  if (format === "empathy_post") {
    return [
      {
        id: `${post.id}-1`,
        user: COMMENT_PERSONAS[0].user,
        handle: COMMENT_PERSONAS[0].handle,
        avatar: COMMENT_PERSONAS[0].avatar,
        time: "1m",
        text: `이건 정답 달아주는 글보다 "나도 그럼" 댓글이 먼저 붙는 주제네. ${post.expected}`,
        likes: baseLikes + 13,
        type: COMMENT_PERSONAS[0].type,
        replyTo: null,
        liked: false,
      },
      {
        id: `${post.id}-2`,
        user: COMMENT_PERSONAS[2].user,
        handle: COMMENT_PERSONAS[2].handle,
        avatar: COMMENT_PERSONAS[2].avatar,
        time: "55s",
        text: `${p1} 같은 포인트는 결국 사람마다 다른데, 이런 글이 있어서 커뮤니티가 더 사람 같아짐.`,
        likes: baseLikes + 8,
        type: COMMENT_PERSONAS[2].type,
        replyTo: null,
        liked: true,
      },
      {
        id: `${post.id}-3`,
        user: COMMENT_PERSONAS[4].user,
        handle: COMMENT_PERSONAS[4].handle,
        avatar: COMMENT_PERSONAS[4].avatar,
        time: "49s",
        text: `브랜드 추천보다 이런 경험담이 쌓여야 나중에 옷 살 때도 더 참고하게 되더라.`,
        likes: baseLikes + 6,
        type: COMMENT_PERSONAS[4].type,
        replyTo: null,
        liked: false,
      },
      {
        id: `${post.id}-4`,
        user: COMMENT_PERSONAS[6].user,
        handle: COMMENT_PERSONAS[6].handle,
        avatar: COMMENT_PERSONAS[6].avatar,
        time: "42s",
        text: `패션 얘기인데 감정선까지 같이 나와서 피드 온도가 좀 부드러워진 느낌.`,
        likes: baseLikes + 4,
        type: COMMENT_PERSONAS[6].type,
        replyTo: null,
        liked: false,
      },
    ];
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
  Reactor: "text-slate-500",
  "Practical Reviewer": "text-slate-500",
  "Taste Commenter": "text-slate-500",
  Critic: "text-slate-500",
  "Experience Sharer": "text-slate-500",
  Recommender: "text-slate-600",
};

function formatCount(value) {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return `${value}`;
}

function Avatar({ initials, accent = "from-sky-300 to-indigo-400" }) {
  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${accent} text-xs font-semibold tracking-wide text-slate-900 shadow-[0_4px_12px_rgba(15,23,42,0.08)]`}
    >
      {initials}
    </div>
  );
}

const IMAGE_FALLBACK_COPY = {
  outfit: {
    label: "Outfit check",
    title: "핏 판단용 이미지를 다시 불러오는 중",
    body: "전신 비율과 출근룩 밸런스를 읽을 수 있는 이미지를 준비 중이에요.",
  },
  awkward: {
    label: "Awkward fit",
    title: "어색한 지점을 보여줄 이미지를 준비 중",
    body: "상하 비율이나 이너/신발 미스를 확인할 수 있는 컷이 필요해요.",
  },
  buy: {
    label: "Buy decision",
    title: "제품 판단용 이미지를 다시 확인 중",
    body: "가격값, 실루엣, 제품 인상을 읽을 수 있는 이미지가 비어 있어요.",
  },
  size: {
    label: "Size help",
    title: "사이즈 비교용 이미지가 잠시 비어 있어요",
    body: "기장, 어깨선, 허리-힙 비율을 판단할 수 있는 컷이 필요해요.",
  },
  review: {
    label: "Real wear review",
    title: "실사용 맥락 이미지를 다시 불러오는 중",
    body: "착용감, 보풀, 수납 같은 후기를 뒷받침할 이미지가 필요해요.",
  },
};

function hasRenderablePrimaryImage(post) {
  return Boolean(post?.image);
}

function PostImage({
  src,
  alt,
  postType,
  title,
  wrapperClassName,
  imageClassName,
  fallbackClassName,
  compact = false,
  tags = [],
  children,
}) {
  const [hasError, setHasError] = useState(!src);

  useEffect(() => {
    setHasError(!src);
  }, [src]);

  const fallback = IMAGE_FALLBACK_COPY[postType] || IMAGE_FALLBACK_COPY.outfit;

  return (
    <div className={wrapperClassName}>
      {!hasError ? (
        <>
          <img
            src={src}
            alt={alt}
            loading="lazy"
            onError={() => setHasError(true)}
            className={imageClassName}
          />
          {children}
        </>
      ) : (
        <div
          role="img"
          aria-label={`${title} fallback`}
          className={fallbackClassName}
        >
          <div className="space-y-2">
            <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-500">
              {fallback.label}
            </span>
            <p className={`${compact ? "text-xs leading-5" : "text-sm leading-6"} font-medium text-slate-900`}>
              {fallback.title}
            </p>
            <p className={`${compact ? "text-[11px] leading-4" : "text-sm leading-6"} text-slate-500`}>
              {fallback.body}
            </p>
            {!compact && (
              <p className="text-sm font-medium leading-6 text-slate-600">
                {title}
              </p>
            )}
          </div>
          {tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {tags.slice(0, compact ? 2 : 4).map((tag) => (
                <span
                  key={`${title}-${tag}`}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] text-slate-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProductEvidencePreview({ post, compact = false, detail = false, className = "" }) {
  const evidence = post.productEvidence;
  const useAttachedReferenceTone = PRIMARY_OUTFIT_SHOT_TYPES.has(post.type);

  if (!evidence?.has_named_product_refs) return null;

  const visibleBindings = compact ? evidence.bindings.slice(0, 1) : evidence.bindings;

  if (useAttachedReferenceTone) {
    return (
      <div className={`${compact ? "mt-2" : "mt-1 space-y-2"} ${className}`}>
        {!compact && <p className="text-xs text-slate-500">같이 본 제품</p>}
        <div className="flex flex-wrap gap-2">
          {visibleBindings.map((binding) => (
            <a
              key={`${post.id}-${binding.id}`}
              href={binding.url}
              target="_blank"
              rel="noreferrer"
              className={`group inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white transition hover:border-slate-300 hover:bg-slate-50 ${
                compact ? "pr-3" : "pr-3.5"
              }`}
            >
              <ResolvedProductThumbnail
                binding={binding}
                alt={binding.title}
                className={`${compact ? "h-8 w-8" : "h-9 w-9"} rounded-full object-cover`}
              />
              <span className={`truncate text-slate-700 transition group-hover:text-slate-900 ${compact ? "max-w-[150px] text-[11px]" : "max-w-[260px] text-sm"}`}>
                {binding.title}
              </span>
            </a>
          ))}
        </div>
      </div>
    );
  }

  if (compact) {
    const primaryBinding = visibleBindings[0];

    if (!primaryBinding) return null;

    return (
      <div className={`mt-2 ${className}`}>
        <a
          href={primaryBinding.url}
          target="_blank"
          rel="noreferrer"
        className="group inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white pr-3 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <ResolvedProductThumbnail
            binding={primaryBinding}
            alt={primaryBinding.title}
            className="h-8 w-8 rounded-full object-cover"
          />
          <span className="max-w-[170px] truncate text-[11px] text-slate-700 transition group-hover:text-slate-900">
            {primaryBinding.title}
          </span>
        </a>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <p className="text-xs text-slate-500">참고한 제품</p>
      <div className="space-y-2">
        {visibleBindings.map((binding) => (
          <a
            key={`${post.id}-${binding.id}`}
            href={binding.url}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <ResolvedProductThumbnail
              binding={binding}
              alt={binding.title}
              className="h-12 w-12 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-slate-800 transition group-hover:text-slate-950">
                {binding.title}
              </p>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                <span className="truncate">{binding.source}</span>
                {binding.price && <span className="truncate text-slate-400">{binding.price}</span>}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function ThreadDetailBody({ post }) {
  const paragraphs = post.detailLead.split("\n").filter(Boolean);

  if (paragraphs.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 space-y-4">
      <p className="text-[15px] leading-6 text-slate-800">{paragraphs[0]}</p>
      {paragraphs.slice(1).map((paragraph) => (
        <p key={`${post.id}-${paragraph.slice(0, 24)}`} className="text-[15px] leading-6 text-slate-800">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

function postHasPrimaryOutfitShot(post) {
  return Boolean(post) && PRIMARY_OUTFIT_SHOT_TYPES.has(post.type);
}

function ActionButton({ icon: Icon, label, active, onClick }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      type="button"
      className={`inline-flex items-center gap-2 px-2 py-1 text-sm transition ${
        active ? "border-slate-900 bg-slate-900 text-white shadow-[0_4px_12px_rgba(15,23,42,0.12)]" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
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
    <div className={`${depth > 0 ? "ml-7 border-l border-slate-200 pl-5" : ""}`}>
      <div className="flex gap-3">
        <div className="relative flex flex-col items-center">
          <Avatar initials={comment.avatar} />
          {((replies.length > 0 && depth === 0) || depth > 0) && (
            <div className="mt-2 h-full min-h-6 w-px bg-slate-200" />
          )}
        </div>
        <div className="min-w-0 flex-1 pb-6">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-slate-900">{comment.user}</span>
            <span className="truncate text-sm text-slate-500">{comment.handle}</span>
            <span className="text-sm text-slate-400">{comment.time}</span>
          </div>
          <p className="mt-1 text-[15px] leading-6 text-slate-700">{comment.text}</p>
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
                <div className="mt-3 border border-slate-200 bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                  <div className="flex items-start gap-3">
                    <Avatar initials="ME" accent="from-sky-300 to-indigo-400" />
                    <div className="flex-1 border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
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
              className="mt-1 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-700"
            >
              <span className="ml-1 h-px w-6 bg-slate-300" />
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
  const [selectedProfileId, setSelectedProfileId] = useState(AUTHOR_PROFILES[0]?.id || null);
  const [selectedTopicId, setSelectedTopicId] = useState(TOPIC_PAGES[0]?.id || null);
  const worldRef = useRef(createSeededWorld({ seed: 42, worldRules: createBaselineWorldRules() }));
  const [commentsByPost, setCommentsByPost] = useState(INITIAL_COMMENTS);
  const [postLiked, setPostLiked] = useState(false);
  const [postSaved, setPostSaved] = useState(false);
  const [postReplyOpen, setPostReplyOpen] = useState(false);
  const [replyOpenId, setReplyOpenId] = useState(null);
  const [expandedReplies, setExpandedReplies] = useState({});
  const [activeSearchQuery, setActiveSearchQuery] = useState("렉토 팬츠");
  const [simSeedInput, setSimSeedInput] = useState("42");
  const [simPolicyFlag, setSimPolicyFlag] = useState(SIM_POLICY_FLAGS.baseline);
  const [liveRun, setLiveRun] = useState(() =>
    buildSimulationRunView(worldRef.current, SIM_POLICY_FLAGS.baseline),
  );
  const [savedRuns, setSavedRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState("live");
  const [replayCursor, setReplayCursor] = useState(0);
  const [isSimRunning, setIsSimRunning] = useState(false);
  const navigationStackRef = useRef([]);

  const activePost = FEED_POSTS.find((post) => post.id === selectedPostId) ?? FEED_POSTS[0];
  const activeProfile = AUTHOR_PROFILE_MAP[selectedProfileId] ?? AUTHOR_PROFILES[0];
  const activeTopic = TOPIC_PAGE_MAP[selectedTopicId] ?? TOPIC_PAGES[0];
  const selectedRun = selectedRunId === "live"
    ? liveRun
    : savedRuns.find((run) => run.id === selectedRunId) || liveRun;
  const replaySnapshot = selectedRun.snapshots[replayCursor] || selectedRun.snapshots[selectedRun.snapshots.length - 1];
  const replayAgents = replaySnapshot ? buildSnapshotAgents(replaySnapshot) : [];
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

  const resetThreadInteractions = () => {
    setPostLiked(false);
    setPostSaved(false);
    setPostReplyOpen(false);
    setReplyOpenId(null);
    setExpandedReplies({});
  };

  const snapshotNavigationState = () => ({
    view,
    selectedPostId,
    selectedProfileId,
    selectedTopicId,
    activeSearchQuery,
  });

  const scrollToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  };

  const restoreNavigationState = (snapshot) => {
    setView(snapshot.view);
    setSelectedPostId(snapshot.selectedPostId);
    setSelectedProfileId(snapshot.selectedProfileId);
    setSelectedTopicId(snapshot.selectedTopicId);
    setActiveSearchQuery(snapshot.activeSearchQuery);
    resetThreadInteractions();
    scrollToTop();
  };

  const navigateTo = (nextView, options = {}) => {
    const nextPostId = options.postId ?? selectedPostId;
    const nextProfileId = options.profileId ?? selectedProfileId;
    const nextTopicId = options.topicId ?? selectedTopicId;
    const nextSearchQuery = options.searchQuery ?? activeSearchQuery;
    const currentSnapshot = snapshotNavigationState();
    const nextSnapshot = {
      view: nextView,
      selectedPostId: nextPostId,
      selectedProfileId: nextProfileId,
      selectedTopicId: nextTopicId,
      activeSearchQuery: nextSearchQuery,
    };

    if (
      currentSnapshot.view === nextSnapshot.view &&
      currentSnapshot.selectedPostId === nextSnapshot.selectedPostId &&
      currentSnapshot.selectedProfileId === nextSnapshot.selectedProfileId &&
      currentSnapshot.selectedTopicId === nextSnapshot.selectedTopicId &&
      currentSnapshot.activeSearchQuery === nextSnapshot.activeSearchQuery
    ) {
      return;
    }

    if (options.pushHistory !== false) {
      navigationStackRef.current.push(currentSnapshot);
    }

    setView(nextView);
    setSelectedPostId(nextPostId);
    setSelectedProfileId(nextProfileId);
    setSelectedTopicId(nextTopicId);
    setActiveSearchQuery(nextSearchQuery);
    resetThreadInteractions();
    scrollToTop();
  };

  const goBack = () => {
    const previousSnapshot = navigationStackRef.current.pop();

    if (previousSnapshot) {
      restoreNavigationState(previousSnapshot);
      return;
    }

    navigateTo("feed", { pushHistory: false });
  };

  const openPost = (postId) => {
    navigateTo("thread", { postId });
  };

  const openProfile = (profileId) => {
    navigateTo("profile", { profileId });
  };

  const openTopic = (topicId) => {
    navigateTo("topic", { topicId });
  };

  const syncLiveRun = (world, nextPolicyFlag = simPolicyFlag) => {
    const nextRun = buildSimulationRunView(world, nextPolicyFlag);
    setLiveRun(nextRun);
    setSelectedRunId("live");
    setReplayCursor(nextRun.entries.length);
  };

  const resetSimulation = ({
    seed = Number(simSeedInput) || 42,
    policyFlag = simPolicyFlag,
  } = {}) => {
    const nextWorld = createSeededWorld({
      seed,
      worldRules: createBaselineWorldRules(),
    });
    worldRef.current = nextWorld;
    setIsSimRunning(false);
    syncLiveRun(nextWorld, policyFlag);
  };

  const stepSimulation = (stepCount = 1) => {
    for (let index = 0; index < stepCount; index += 1) {
      runSingleTick(worldRef.current);
    }

    syncLiveRun(worldRef.current, simPolicyFlag);
  };

  const saveCurrentRun = () => {
    const archivedRun = {
      ...clone(liveRun),
      id: `saved-${liveRun.seed}-${liveRun.tick}-${savedRuns.length + 1}`,
      label: `seed ${liveRun.seed} / ${liveRun.policyFlag} / tick ${liveRun.tick}`,
    };

    setSavedRuns((current) => [archivedRun, ...current].slice(0, 6));
    setSelectedRunId(archivedRun.id);
    setReplayCursor(archivedRun.entries.length);
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

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== "Backspace") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target;
      const tagName = target?.tagName;
      const isEditable =
        target?.isContentEditable ||
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT";

      if (isEditable) return;
      if (view === "feed" && navigationStackRef.current.length === 0) return;

      event.preventDefault();
      goBack();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [view, selectedPostId, activeSearchQuery]);

  useEffect(() => {
    if (!isSimRunning) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      runSingleTick(worldRef.current);
      syncLiveRun(worldRef.current, simPolicyFlag);
    }, 900);

    return () => window.clearInterval(timer);
  }, [isSimRunning, simPolicyFlag]);

  useEffect(() => {
    if (selectedRunId === "live") {
      setReplayCursor(liveRun.entries.length);
      return;
    }

    const archived = savedRuns.find((run) => run.id === selectedRunId);
    if (archived) {
      setReplayCursor(archived.entries.length);
    }
  }, [selectedRunId, liveRun.entries.length, savedRuns]);

  const openFeed = () => navigateTo("feed");
  const openSearch = () => navigateTo("search");
  const openTopicTab = () => openTopic(activePost?.alignment?.topic_type || TOPIC_PAGES[0]?.id);
  const openProfileTab = () => openProfile(activePost?.author || AUTHOR_PROFILES[0]?.id);
  const bottomPills = [
    { key: "feed", label: "피드", icon: Home, active: view === "feed", onClick: openFeed },
    { key: "search", label: "탐색", icon: Search, active: view === "search", onClick: openSearch },
    { key: "topic", label: "주제", icon: Hash, active: view === "topic", onClick: openTopicTab },
    { key: "profile", label: "프로필", icon: User, active: view === "profile", onClick: openProfileTab },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fbff,_#eff3f8_54%,_#eef2f7_100%)] text-slate-900">
      <div className="z-20 px-3 pt-3 sm:px-5">
        <div className="mx-auto max-w-6xl rounded-[24px] border border-slate-200/80 bg-white/90 px-3 py-2.5 shadow-[0_14px_42px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openSearch}
              aria-label="search"
              className="inline-flex h-10 w-10 items-center justify-center border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
            >
              <Search className="h-4 w-4" />
            </button>

            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-sm font-medium text-slate-500">
                {view === "feed"
                  ? "feed / postcard"
                  : view === "search"
                    ? "search / live index"
                    : view === "profile"
                      ? `profile / ${activeProfile.author}`
                      : view === "topic"
                        ? `topic / ${activeTopic.title}`
                        : activePost.title}
              </p>
            </div>

            <button
              type="button"
              onClick={openProfileTab}
              aria-label="profile"
              className="inline-flex h-10 w-10 items-center justify-center border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
            >
              <User className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-4 sm:px-5">
        {view === "feed" && (
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)]"
          >
            <div className="border-b border-slate-200/80 px-4 py-3 sm:px-5">
              <p className="text-sm font-semibold text-slate-900">fashion-life</p>
              <p className="mt-1 text-sm text-slate-500">패션 판단과 생활 기록이 섞인 메인 채널</p>
            </div>
            <div className="px-4 py-1 sm:px-5">
                {FEED_POSTS.map((post, index) => (
                  <motion.button
                    key={post.id}
                    type="button"
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.995 }}
                    onClick={() => openPost(post.id)}
                    className="flex w-full gap-3 border-b border-slate-100 px-0 py-4 text-left transition hover:bg-slate-50"
                  >
                    <div className="relative flex flex-col items-center">
                      <Avatar
                        initials={authorInitials(post.author)}
                        accent={index % 2 === 0 ? "from-sky-300 to-indigo-300" : "from-emerald-300 to-teal-300"}
                      />
                      {index !== FEED_POSTS.length - 1 && <div className="mt-2 h-full w-px bg-slate-200" />}
                    </div>

                    <div className="min-w-0 flex-1 pb-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openProfile(post.author);
                          }}
                          className="truncate text-sm font-semibold text-slate-900 transition hover:text-slate-950"
                        >
                          {post.author}
                        </button>
                        {index < 3 && <BadgeCheck className="h-4 w-4 fill-sky-400 text-sky-300" />}
                        <span className="truncate text-sm text-slate-500">{post.handle}</span>
                        <span className="text-sm text-slate-400">{post.time}</span>
                      </div>

                      <div className="mt-3 flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <PostFormatBadge format={getPostFormat(post)} />
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openTopic(post.alignment.topic_type);
                              }}
                              className="border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                            >
                              {TOPIC_CHANNEL_LABELS[post.alignment.topic_type]}
                            </button>
                          </div>
                          <p className="text-[15px] font-medium leading-6 text-slate-900">{post.title}</p>
                          <p className="mt-1 text-[15px] leading-6 text-slate-600">{post.hook}</p>
                          {post.productEvidence.has_named_product_refs && (
                            <ProductEvidencePreview post={post} compact />
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-4 text-sm text-slate-500">
                        <span>{formatCount(post.likes)} likes</span>
                        <span>{post.replies} replies</span>
                        <span>{post.reposts} reposts</span>
                      </div>
                    </div>
                  </motion.button>
                ))}
            </div>
          </motion.section>
        )}

        {view === "search" && (
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-0 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)]"
          >
            <div className="border-b border-slate-200/80 px-4 py-4 sm:px-5">
              <div className="border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <div className="flex items-center gap-3">
                  <Search className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-800">{activeSearchQuery}</span>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Recent searches</p>
              <div className="mt-3 flex flex-wrap gap-2">
                  {SEARCH_RECENTS.map((query) => (
                    <button
                      key={query}
                      type="button"
                      onClick={() => setActiveSearchQuery(query)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                        activeSearchQuery === query
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800"
                      }`}
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Trending now</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {SEARCH_TRENDING.map((query, index) => (
                    <button
                      key={query}
                      type="button"
                      onClick={() => setActiveSearchQuery(query)}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <div>
                        <p className="text-sm text-slate-900">{query}</p>
                        <p className="mt-1 text-xs text-slate-500">{24 + index * 7}분 전부터 반응 증가</p>
                      </div>
                      <span className="text-xs text-slate-400">{index + 1}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">추천 브랜드</p>
                  <p className="mt-1 text-sm text-slate-500">요즘 검색이 많이 붙는 국내 여성 패션 키워드</p>
                </div>
                <span className="border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">Brands</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {SEARCH_SUGGESTED_BRANDS.map((brand) => (
                  <button
                    key={brand.name}
                    type="button"
                    onClick={() => setActiveSearchQuery(brand.name)}
                    className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <p className="text-sm font-medium text-slate-900">{brand.name}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{brand.note}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">대화 목록</p>
                  <p className="mt-1 text-sm text-slate-500">
                    "{activeSearchQuery}" 관련 대화 {searchResults.length}개
                  </p>
                </div>
                <span className="border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">Top</span>
              </div>

              <div className="mt-4 space-y-3">
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openPost(item.postId)}
                    className="flex w-full gap-3 border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-900">{item.author}</span>
                        <span className="truncate text-sm text-slate-500">{item.handle}</span>
                        <span className="text-xs text-slate-400">{item.time}</span>
                      </div>
                      <div className="mt-2">
                        <PostFormatBadge format={item.format} />
                      </div>
                      <p className="mt-2 text-[15px] font-medium leading-6 text-slate-900">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">{item.hook}</p>
                      {item.productEvidence.has_named_product_refs && (
                        <ProductEvidencePreview
                          post={FEED_POSTS.find((post) => post.id === item.postId)}
                          compact
                        />
                      )}
                      <p className="mt-2 text-xs text-slate-500">{item.sourceLabel}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.keywords.map((keyword) => (
                          <span
                            key={`${item.id}-${keyword}`}
                            className="border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                        <span>{formatCount(item.likes)} likes</span>
                        <span>{item.replies} replies</span>
                        <span>{item.saves} saves</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="px-4 py-4 sm:px-5">
              <p className="text-sm font-semibold text-slate-900">컬렉션으로 보기</p>
              <div className="mt-4 grid gap-3">
                {SEARCH_COLLECTIONS.map((collection) => (
                  <div key={collection.title} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm text-slate-900">{collection.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{collection.subtitle}</p>
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
            className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)]"
          >
              <div className="border-b border-slate-200/80 px-4 py-4 sm:px-5">
                <div className="flex items-start gap-3">
                  <Avatar initials={authorInitials(activePost.author)} accent="from-sky-300 to-indigo-400" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openProfile(activePost.author)}
                          className="truncate text-sm font-semibold text-slate-900 transition hover:text-slate-950"
                      >
                        {activePost.author}
                      </button>
                      <BadgeCheck className="h-4 w-4 fill-sky-400 text-sky-300" />
                      <span className="truncate text-sm text-slate-500">{activePost.handle}</span>
                      <span className="text-sm text-slate-400">{activePost.time}</span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <PostFormatBadge format={getPostFormat(activePost)} />
                      <button
                        type="button"
                        onClick={() => openTopic(activePost.alignment.topic_type)}
                        className="border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                      >
                        {TOPIC_CHANNEL_LABELS[activePost.alignment.topic_type]}
                      </button>
                      <span className="border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-500">
                        {activePost.brands.join(" / ")}
                      </span>
                    </div>

                    <p className="mt-3 text-lg font-semibold leading-7 text-slate-900">{activePost.title}</p>
                    {postHasPrimaryOutfitShot(activePost) && hasRenderablePrimaryImage(activePost) && (
                      <div className="mt-4 overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50">
                        <PostImage
                          src={activePost.image}
                          alt={activePost.title}
                          postType={activePost.type}
                          title={activePost.title}
                          tags={activePost.description.split(",").map((tag) => tag.trim())}
                          wrapperClassName="relative"
                          imageClassName="h-[460px] w-full object-cover sm:h-[620px]"
                          fallbackClassName="flex min-h-[460px] w-full flex-col justify-end bg-[radial-gradient(circle_at_top,_rgba(241,245,249,0.98),_rgba(226,232,240,0.95)_58%)] p-5 sm:min-h-[620px]"
                        >
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white/92 via-white/60 to-transparent p-4">
                              <div className="flex flex-wrap gap-2">
                                {activePost.description.split(",").map((tag) => (
                                  <span
                                    key={tag.trim()}
                                    className="rounded-full border border-slate-200 bg-white/85 px-3 py-1 text-xs text-slate-700 backdrop-blur-sm"
                                  >
                                    {tag.trim()}
                                  </span>
                              ))}
                            </div>
                          </div>
                        </PostImage>
                      </div>
                    )}
                    <ThreadDetailBody post={activePost} />
                    {activePost.productEvidence.has_named_product_refs && (
                      <ProductEvidencePreview post={activePost} detail />
                    )}

                    {activePost.sources.length > 0 && !postHasPrimaryOutfitShot(activePost) && !activePost.productEvidence.has_named_product_refs && (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {activePost.sources.map((source) => (
                          <a
                            key={source.title}
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            <ResolvedProductThumbnail
                              binding={{ sourceKey: source.key, title: source.title, source: source.source }}
                              alt={source.title}
                              className="h-36 w-full object-cover"
                            />
                            <div className="space-y-1 p-4">
                              <p className="text-sm font-medium leading-6 text-slate-900 transition group-hover:text-slate-950">{source.title}</p>
                              <div className="flex items-center gap-2 text-xs">
                                <p className="truncate text-slate-500">{source.source}</p>
                                <p className="truncate text-slate-400">{source.price}</p>
                              </div>
                            </div>
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

                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
                      <span>{activePost.likes} likes</span>
                      <span>{activePost.replies} replies</span>
                      <span>{activePost.reposts} reposts</span>
                      <span className="text-slate-400">{activePost.tone}</span>
                    </div>

                    <AnimatePresence initial={false}>
                      {postReplyOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
                            <div className="flex items-start gap-3">
                              <Avatar initials="ME" accent="from-sky-300 to-indigo-400" />
                              <div className="flex-1 border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
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
                <div className="border-b border-slate-200 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Conversation</p>
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
            className="mt-4 overflow-hidden rounded-[28px] border border-slate-200 bg-white px-4 py-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:px-5"
          >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">같이 보는 글</p>
                  <p className="text-sm text-slate-500">비슷한 브랜드와 고민으로 저장된 스레드</p>
                </div>
                <div className="border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
                  {relatedThreads.length} threads
                </div>
              </div>

              <div className="grid gap-3">
                {relatedThreads.map((post) => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => openPost(post.id)}
                    className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <p className="text-sm font-medium text-slate-900">{post.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{post.hook}</p>
                    <p className="mt-2 text-xs text-slate-400">{post.brands.join(" / ")} · {post.expected}</p>
                  </button>
                ))}
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16, duration: 0.35 }}
            className="mt-4 overflow-hidden rounded-[28px] border border-slate-200 bg-white px-4 py-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:px-5"
          >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">읽는 포인트</p>
                  <p className="text-sm text-slate-500">댓글에서 반복되는 판단 기준</p>
                </div>
                <div className="border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
                  {comments.length} comments
                </div>
              </div>

              <div className="grid gap-3">
                {summary.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-medium text-slate-900">{item.title}</p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-500">{item.content}</p>
                  </div>
                ))}
              </div>
            </motion.section>
          </>
        )}

        {view === "profile" && activeProfile && (
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)]"
          >
            <div className="border-b border-slate-200/80 px-4 py-5 sm:px-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <Avatar initials={activeProfile.initials} accent={activeProfile.accent} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold text-slate-900">{activeProfile.author}</p>
                    <span className="text-sm text-slate-500">{activeProfile.handle}</span>
                    <span className="border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-500">
                      {activeProfile.role}
                    </span>
                  </div>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    생활형 패션 대화 안에서 반복적으로 남긴 스레드를 바탕으로 구성한 mock-backed agent profile입니다.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <div className="border border-slate-200 bg-white p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Trust circle</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{activeProfile.relationSummary.trustCircleSize}</p>
                    </div>
                    <div className="border border-slate-200 bg-white p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Repeat ties</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{activeProfile.relationSummary.repeatedNeighbors}</p>
                    </div>
                    <div className="border border-slate-200 bg-white p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Threads</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{activeProfile.relationSummary.activeThreads}</p>
                    </div>
                    <div className="border border-slate-200 bg-white p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Replies</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{activeProfile.relationSummary.repliesReceived}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 px-4 py-4 sm:grid-cols-[1.15fr_0.85fr] sm:px-5">
              <div className="space-y-4">
                <div className="border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">Interest areas</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {activeProfile.interestAreas.map((area) => (
                      <span key={`${activeProfile.id}-${area}`} className="border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">Self-narrative history</p>
                  <div className="mt-4 space-y-3">
                    {activeProfile.selfNarrativeHistory.map((entry) => (
                      <div key={entry.id} className="border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{entry.tickLabel}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{entry.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">Representative threads</p>
                    <span className="text-xs text-slate-500">{activeProfile.representativePosts.length} items</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {activeProfile.representativePosts.map((post) => (
                      <button
                        key={`${activeProfile.id}-${post.id}`}
                        type="button"
                        onClick={() => openPost(post.id)}
                        className="w-full border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <PostFormatBadge format={getPostFormat(post)} />
                          <span className="text-xs text-slate-500">{TOPIC_CHANNEL_LABELS[post.alignment.topic_type]}</span>
                        </div>
                        <p className="mt-2 text-sm font-medium text-slate-900">{post.title}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">{post.hook}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">Related agents</p>
                  <div className="mt-4 space-y-2">
                    {activeProfile.relatedAgents.map((agent) => (
                      <button
                        key={`${activeProfile.id}-${agent.id}`}
                        type="button"
                        onClick={() => openProfile(agent.id)}
                        className="flex w-full items-center justify-between border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        <div>
                          <p className="text-sm text-slate-900">{agent.author}</p>
                          <p className="mt-1 text-xs text-slate-500">shared thread overlap</p>
                        </div>
                        <span className="text-sm text-slate-600">{agent.score}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">Topic footprint</p>
                  <div className="mt-4 space-y-2">
                    {TOPIC_PAGES.filter((topic) =>
                      topic.representativePosts.some((post) => post.author === activeProfile.author),
                    ).map((topic) => (
                      <button
                        key={`${activeProfile.id}-${topic.id}`}
                        type="button"
                        onClick={() => openTopic(topic.id)}
                        className="flex w-full items-center justify-between border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        <div>
                          <p className="text-sm text-slate-900">{topic.title}</p>
                          <p className="mt-1 text-xs text-slate-500">{topic.spotlightTags.join(" / ")}</p>
                        </div>
                        <span className="text-xs text-slate-500">{topic.representativePosts.filter((post) => post.author === activeProfile.author).length} threads</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {view === "topic" && activeTopic && (
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)]"
          >
            <div className="border-b border-slate-200/80 px-4 py-5 sm:px-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  topic hub
                </span>
                <p className="text-lg font-semibold text-slate-900">{activeTopic.title}</p>
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">{activeTopic.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {activeTopic.spotlightTags.map((tag) => (
                  <span key={`${activeTopic.id}-${tag}`} className="border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-4 px-4 py-4 sm:grid-cols-[1.1fr_0.9fr] sm:px-5">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Likes</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{formatCount(activeTopic.reactionSummary.likes)}</p>
                  </div>
                  <div className="border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Replies</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{formatCount(activeTopic.reactionSummary.replies)}</p>
                  </div>
                  <div className="border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Reposts</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{formatCount(activeTopic.reactionSummary.reposts)}</p>
                  </div>
                </div>

                <div className="border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">Representative posts</p>
                    <span className="text-xs text-slate-500">{activeTopic.representativePosts.length} threads</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {activeTopic.representativePosts.map((post) => (
                      <button
                        key={`${activeTopic.id}-${post.id}`}
                        type="button"
                        onClick={() => openPost(post.id)}
                        className="w-full border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <PostFormatBadge format={getPostFormat(post)} />
                          <span className="text-xs text-slate-500">{post.author}</span>
                        </div>
                        <p className="mt-2 text-sm font-medium text-slate-900">{post.title}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">{post.hook}</p>
                        <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                          <span>{formatCount(post.likes)} likes</span>
                          <span>{post.replies} replies</span>
                          <span>{post.reposts} reposts</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">Related agents</p>
                  <div className="mt-4 space-y-2">
                    {activeTopic.relatedAgents.map((author) => (
                      <button
                        key={`${activeTopic.id}-${author}`}
                        type="button"
                        onClick={() => openProfile(author)}
                        className="flex w-full items-center justify-between border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        <div>
                          <p className="text-sm text-slate-900">{author}</p>
                          <p className="mt-1 text-xs text-slate-500">active in this topic cluster</p>
                        </div>
                        <span className="text-xs text-slate-500">@{author}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">Cross-topic neighbors</p>
                  <div className="mt-4 space-y-2">
                    {TOPIC_PAGES.filter((topic) => topic.id !== activeTopic.id)
                      .slice(0, 4)
                      .map((topic) => (
                        <button
                          key={`${activeTopic.id}-${topic.id}`}
                          type="button"
                          onClick={() => openTopic(topic.id)}
                          className="flex w-full items-center justify-between border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          <div>
                            <p className="text-sm text-slate-900">{topic.title}</p>
                            <p className="mt-1 text-xs text-slate-500">{topic.spotlightTags.join(" / ")}</p>
                          </div>
                          <span className="text-xs text-slate-500">{topic.relatedAgents.length} agents</span>
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {view === "sim" && (
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)]"
          >
            <div className="border-b border-slate-200/80 px-4 py-5 sm:px-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      operator surface
                    </span>
                    <p className="text-lg font-semibold text-slate-900">Simulation controls and replay timeline</p>
                  </div>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
                    deterministic local world를 브라우저에서 직접 실행하고, seed와 policy를 바꿔가며 identity divergence가 언제 생겼는지 북마크와 타임라인으로 다시 볼 수 있습니다.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:w-[420px]">
                  <div className="border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Seed</p>
                    <input
                      value={simSeedInput}
                      onChange={(event) => setSimSeedInput(event.target.value)}
                      className="mt-2 w-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none"
                    />
                  </div>
                  <div className="border border-slate-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Policy</p>
                    <select
                      value={simPolicyFlag}
                      onChange={(event) => {
                        const nextFlag = event.target.value;
                        setSimPolicyFlag(nextFlag);
                        setLiveRun((current) => ({ ...current, policyFlag: nextFlag }));
                      }}
                      className="mt-2 w-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none"
                    >
                      {SIM_POLICY_OPTIONS.map((flag) => (
                        <option key={flag} value={flag}>
                          {flag}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => resetSimulation()}
                  className="inline-flex items-center gap-2 border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Reset run
                </button>
                <button
                  type="button"
                  onClick={() => setIsSimRunning((current) => !current)}
                  className="inline-flex items-center gap-2 border border-slate-900 bg-slate-900 px-3 py-2 text-sm text-white transition hover:bg-slate-800"
                >
                  {isSimRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {isSimRunning ? "Pause" : "Start / Resume"}
                </button>
                <button
                  type="button"
                  onClick={() => stepSimulation(1)}
                  className="inline-flex items-center gap-2 border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <SkipForward className="h-4 w-4" />
                  Step tick
                </button>
                <button
                  type="button"
                  onClick={saveCurrentRun}
                  className="inline-flex items-center gap-2 border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <Bookmark className="h-4 w-4" />
                  Save run
                </button>
              </div>
            </div>

            <div className="grid gap-4 px-4 py-4 lg:grid-cols-[1.15fr_0.85fr] sm:px-5">
              <div className="space-y-4">
                <div className="border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Replay timeline</p>
                      <p className="mt-1 text-sm text-slate-500">saved run도 같은 scrubber로 다시 볼 수 있습니다.</p>
                    </div>
                    <select
                      value={selectedRunId}
                      onChange={(event) => setSelectedRunId(event.target.value)}
                      className="border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
                    >
                      <option value="live">live run</option>
                      {savedRuns.map((run) => (
                        <option key={run.id} value={run.id}>
                          {run.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-4 border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">tick cursor</span>
                      <span className="text-slate-900">{replayCursor} / {selectedRun.entries.length}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={Math.max(selectedRun.entries.length, 0)}
                      value={Math.min(replayCursor, selectedRun.entries.length)}
                      onChange={(event) => setReplayCursor(Number(event.target.value))}
                      className="mt-4 w-full accent-slate-900"
                    />
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="border border-slate-200 bg-white p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Seed</p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">{selectedRun.seed}</p>
                      </div>
                      <div className="border border-slate-200 bg-white p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Policy</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{selectedRun.policyFlag}</p>
                      </div>
                      <div className="border border-slate-200 bg-white p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Latest action</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{selectedRun.latestEntry?.action || "none yet"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">Snapshot at tick {replayCursor}</p>
                    <div className="mt-4 space-y-2">
                      {replayAgents.map((agent) => (
                        <div key={`${selectedRun.id}-${agent.id}-${replayCursor}`} className="border border-slate-200 bg-slate-50 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm text-slate-900">{agent.handle}</p>
                            <span className="text-xs text-slate-500">activity {agent.activity.toFixed(3)}</span>
                          </div>
                          <p className="mt-2 text-xs text-slate-500">repeated repliers {agent.repeatedRepliers}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{agent.narrative}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">Bookmarked events</p>
                  <div className="mt-4 space-y-2">
                    {selectedRun.bookmarks.length === 0 ? (
                      <p className="text-sm text-slate-500">북마크 가능한 큰 이벤트가 아직 없습니다.</p>
                    ) : (
                      selectedRun.bookmarks.map((bookmark) => (
                        <button
                          key={bookmark.id}
                          type="button"
                          onClick={() => setReplayCursor(bookmark.tick)}
                          className="w-full border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm text-slate-900">{bookmark.title}</p>
                            <span className="text-xs text-slate-500">jump</span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-500">{bookmark.note}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">Identity divergence checkpoints</p>
                  <div className="mt-4 space-y-2">
                    {selectedRun.divergenceMoments.map((moment) => (
                      <button
                        key={moment.id}
                        type="button"
                        onClick={() => setReplayCursor(moment.tick)}
                        className="w-full border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm text-slate-900">{moment.title}</p>
                          <span className="text-xs text-slate-500">tick {moment.tick}</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-500">{moment.note}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">Action log</p>
                  <div className="mt-4 space-y-2">
                    {selectedRun.entries.slice().reverse().slice(0, 8).map((entry) => (
                      <div key={`${selectedRun.id}-${entry.tick}`} className="border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm text-slate-900">Tick {entry.tick + 1} · {entry.action}</p>
                          <span className="text-xs text-slate-500">{entry.actor_id}</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-500">{entry.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-3 z-20 px-3 sm:px-5">
        <div className="mx-auto flex max-w-fit items-center gap-2 rounded-full border border-slate-200/80 bg-slate-100/95 px-2.5 py-2 shadow-[0_16px_42px_rgba(15,23,42,0.08)] backdrop-blur-md">
          {bottomPills.map((pill) => {
            const Icon = pill.icon;
            return (
              <button
                key={pill.key}
                type="button"
                onClick={pill.onClick}
                aria-label={pill.label}
                className={`inline-flex h-12 w-12 items-center justify-center rounded-full transition ${
                  pill.active
                    ? "bg-gradient-to-br from-sky-400 via-indigo-400 to-violet-500 text-white shadow-[0_10px_24px_rgba(79,70,229,0.24)]"
                    : "bg-slate-200/90 text-slate-600 hover:bg-slate-300/90 hover:text-slate-800"
                }`}
              >
                <Icon className="h-5 w-5" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
