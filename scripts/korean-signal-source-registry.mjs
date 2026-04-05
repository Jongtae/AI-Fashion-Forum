#!/usr/bin/env node
/**
 * korean-signal-source-registry.mjs
 *
 * Defines public Korean content sources for generating discussion seeds.
 *
 * Strategy: We don't need full articles — just FACTS (headlines, product names,
 * prices, dates). The compositional generator turns these facts into unique
 * community-style posts. Copyright-safe because we extract factual data only.
 *
 * Source tiers:
 *   Tier 1 — Structured APIs (most reliable, richest data)
 *   Tier 2 — RSS feeds (headlines + summaries)
 *   Tier 3 — Social/community (lower quality, supplementary)
 */

// ── Tier 1: Structured APIs ────────────────────────────────────────────────

export const STRUCTURED_SOURCES = {
  weather_seoul: {
    key: "weather_seoul",
    name: "Seoul Weather",
    url: "https://wttr.in/Seoul?format=j1",
    platform: "weather",
    format: "json",
    description: "Current Seoul weather → seasonal/outfit posts",
    // → "서울 12°C 비" → "비 오는 날 코디 어떻게 하세요?"
  },
  exchange_rate: {
    key: "exchange_rate",
    name: "USD/KRW Exchange Rate",
    // exchangerate-api.com free tier: 1500 req/month
    url: "https://open.er-api.com/v6/latest/USD",
    platform: "exchange_rate",
    format: "json",
    description: "USD/KRW rate → 직구/여행 posts",
    // → "1달러 = 1,380원" → "환율 이러면 직구 포기해야 하나요ㅠ"
  },
  musinsa_ranking: {
    key: "musinsa_ranking",
    name: "Musinsa Popular Items",
    // Musinsa ranking page exposes the current API URL via __NEXT_DATA__
    url: "https://www.musinsa.com/main/musinsa/ranking",
    platform: "musinsa",
    format: "html",
    description: "무신사 인기 상품 → 제품 리뷰/비교 posts",
    fallbackUrl: "https://api.musinsa.com/api2/hm/web/v5/pans/ranking?storeCode=musinsa&subPan=product",
  },
};

// ── Tier 2: RSS News Feeds ─────────────────────────────────────────────────

export const RSS_SOURCES = {
  google_trends_kr: {
    key: "google_trends_kr",
    name: "Google Trends Korea",
    url: "https://trends.google.co.kr/trending/rss?geo=KR",
    platform: "google_trends",
    format: "rss",
    description: "한국 실시간 검색 트렌드 → 트렌드 반응 posts",
    // Note: URL may change; fallback below
    fallbackUrl: "https://trends.google.com/trending/rss?geo=KR",
  },
  naver_news_fashion: {
    key: "naver_news_fashion",
    name: "Naver News Fashion/Beauty",
    // Naver news RSS for 패션/뷰티 section
    url: "https://news.naver.com/main/list.naver?mode=LS2D&mid=shm&sid1=103&sid2=317",
    platform: "naver_news",
    format: "html",
    description: "네이버 패션/뷰티 뉴스 헤드라인",
    // Parse as HTML list → extract headline text
  },
  hankyung_trend: {
    key: "hankyung_trend",
    name: "Hankyung Trend/Lifestyle",
    url: "https://www.hankyung.com/feed/life",
    platform: "hankyung",
    format: "rss",
    description: "한경 라이프스타일 뉴스",
  },
  fashionbiz: {
    key: "fashionbiz",
    name: "Fashionbiz Korea",
    url: "https://www.fashionbiz.co.kr/RD/?cate=2&idx=0&SC=RD",
    platform: "fashionbiz",
    format: "rss",
    description: "패션비즈 산업 뉴스",
  },
};

// ── Tier 3: Social/Community ───────────────────────────────────────────────

export const SOCIAL_SOURCES = {
  mastodon_kr: {
    key: "mastodon_kr",
    name: "Mastodon Korean Fashion",
    urlTemplate: (tag, limit = 20) =>
      `https://mastodon.social/api/v1/timelines/tag/${encodeURIComponent(tag)}?limit=${limit}`,
    platform: "mastodon",
    format: "json",
    tags: ["데일리룩", "코디", "패션"],
    description: "마스토돈 한국어 패션 태그 (보조 소스)",
  },
};

// ── Manually curated Korean fashion seed topics ────────────────────────────
// When API/RSS sources fail, these provide a baseline of realistic discussion
// topics. These are generic fashion facts, not copyrighted content.

export const CURATED_SEEDS = [
  // Product/brand facts
  { subjectKo: "나이키 에어맥스", contextKo: "시즌 신상 컬러 출시", reactionType: "product_reaction", categoryTags: ["sneakers"] },
  { subjectKo: "유니클로 에어리즘", contextKo: "여름 기본템으로 매년 인기", reactionType: "product_reaction", categoryTags: ["fashion"] },
  { subjectKo: "무신사 시즌오프", contextKo: "시즌 교체기 대규모 할인", reactionType: "price_reaction", categoryTags: ["fashion", "sale"] },
  { subjectKo: "자라 봄 신상", contextKo: "봄 컬렉션 입고 시작", reactionType: "product_reaction", categoryTags: ["fashion"] },
  { subjectKo: "뉴발란스 530", contextKo: "꾸준히 인기 있는 스니커즈", reactionType: "trend_reaction", categoryTags: ["sneakers"] },
  { subjectKo: "크림 리셀가", contextKo: "운동화 리셀 시세 변동", reactionType: "price_reaction", categoryTags: ["sneakers"] },
  { subjectKo: "스파오 슬랙스", contextKo: "가성비 출근룩 슬랙스", reactionType: "price_reaction", categoryTags: ["office"] },
  { subjectKo: "올리브영 세일", contextKo: "정기 할인 행사", reactionType: "price_reaction", categoryTags: ["beauty"] },
  // Celebrity/culture
  { subjectKo: "연예인 공항패션", contextKo: "출국 공항에서 포착된 스타일", reactionType: "celebrity_reaction", categoryTags: ["celebrity"] },
  { subjectKo: "드라마 속 패션", contextKo: "인기 드라마 등장인물 코디", reactionType: "celebrity_reaction", categoryTags: ["celebrity"] },
  { subjectKo: "매거진 화보", contextKo: "패션 잡지 커버 촬영", reactionType: "celebrity_reaction", categoryTags: ["celebrity"] },
  { subjectKo: "K-pop 아이돌 코디", contextKo: "무대 의상과 사복 스타일", reactionType: "celebrity_reaction", categoryTags: ["celebrity"] },
  // Seasonal
  { subjectKo: "봄 자켓 시즌", contextKo: "봄 환절기 아우터 필요 시점", reactionType: "season_reaction", categoryTags: ["outerwear"], includeByDefault: false },
  { subjectKo: "벚꽃 나들이", contextKo: "벚꽃 시즌 나들이 코디", reactionType: "season_reaction", categoryTags: ["fashion"], includeByDefault: false },
  { subjectKo: "장마철 코디", contextKo: "비 오는 날 스타일링", reactionType: "season_reaction", categoryTags: ["fashion"], includeByDefault: false },
  { subjectKo: "여름 반팔", contextKo: "여름 데일리 기본템", reactionType: "season_reaction", categoryTags: ["fashion"], includeByDefault: false },
  { subjectKo: "겨울 패딩", contextKo: "겨울 아우터 선택", reactionType: "season_reaction", categoryTags: ["outerwear"], includeByDefault: false },
  // Comparison
  { subjectKo: "유니클로 vs 자라", contextKo: "SPA 브랜드 기본템 비교", reactionType: "comparison_reaction", categoryTags: ["fashion"] },
  { subjectKo: "나이키 vs 아디다스", contextKo: "스니커즈 브랜드 비교", reactionType: "comparison_reaction", categoryTags: ["sneakers"] },
  { subjectKo: "온라인 vs 오프라인", contextKo: "의류 구매 채널 비교", reactionType: "comparison_reaction", categoryTags: ["fashion"] },
  // Event
  { subjectKo: "서울패션위크", contextKo: "시즌 패션위크 행사", reactionType: "event_reaction", categoryTags: ["fashion"], includeByDefault: false },
  { subjectKo: "팝업스토어", contextKo: "브랜드 팝업 매장 오픈", reactionType: "event_reaction", categoryTags: ["fashion"], includeByDefault: false },
  { subjectKo: "플리마켓", contextKo: "주말 빈티지/핸드메이드 마켓", reactionType: "event_reaction", categoryTags: ["fashion", "vintage"], includeByDefault: false },
  // Trend
  { subjectKo: "와이드팬츠", contextKo: "실루엣 트렌드 변화", reactionType: "trend_reaction", categoryTags: ["fashion"] },
  { subjectKo: "레트로 패션", contextKo: "복고 스타일 재유행", reactionType: "trend_reaction", categoryTags: ["fashion"] },
  { subjectKo: "미니멀 코디", contextKo: "심플한 스타일링 트렌드", reactionType: "trend_reaction", categoryTags: ["fashion"] },
  { subjectKo: "오버핏 트렌드", contextKo: "루즈핏 실루엣 유행", reactionType: "trend_reaction", categoryTags: ["fashion"] },
  // General/lifestyle
  { subjectKo: "직구 관세", contextKo: "해외직구 관세 기준", reactionType: "general_reaction", categoryTags: ["fashion"] },
  { subjectKo: "옷장 정리", contextKo: "계절 교체기 옷장 정리법", reactionType: "general_reaction", categoryTags: ["fashion"] },
  { subjectKo: "세탁 꿀팁", contextKo: "소재별 세탁 방법", reactionType: "general_reaction", categoryTags: ["fashion"] },
  { subjectKo: "반려동물 산책룩", contextKo: "강아지 산책할 때 편한 옷", reactionType: "general_reaction", categoryTags: ["pet"] },
];

// ── Reaction-type keyword mappings ─────────────────────────────────────────

export const REACTION_KEYWORDS = {
  price_reaction: ["가격", "세일", "할인", "원", "쿠폰", "최저가", "무료배송", "프로모션", "sale", "discount"],
  product_reaction: ["출시", "신상", "런칭", "한정", "리뉴얼", "컬렉션", "발매", "새로 나", "launch", "release"],
  celebrity_reaction: ["연예인", "공항", "화보", "드라마", "배우", "아이돌", "셀럽", "착용", "airport", "celeb"],
  season_reaction: ["날씨", "비", "맑음", "기온", "봄", "여름", "가을", "겨울", "장마", "벚꽃", "weather"],
  comparison_reaction: ["비교", "vs", "차이", "고민", "뭐가 나", "versus", "better"],
  event_reaction: ["팝업", "전시", "행사", "축제", "오픈", "pop-up", "exhibition", "event"],
  trend_reaction: ["트렌드", "유행", "핫", "급상승", "인기", "바이럴", "trending"],
};

export function classifyReaction(text = "") {
  for (const [reactionType, keywords] of Object.entries(REACTION_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) {
      return reactionType;
    }
  }
  return "trend_reaction";
}

export function hasKorean(text = "", minChars = 2) {
  let count = 0;
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7af) {
      count += 1;
      if (count >= minChars) return true;
    }
  }
  return false;
}
