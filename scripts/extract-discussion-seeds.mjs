#!/usr/bin/env node
/**
 * extract-discussion-seeds.mjs
 *
 * Transforms raw crawled signals (korean-signals-raw.json OR world-event-signals.json)
 * into structured "discussion seeds" that the compositional post generator can consume.
 *
 * Each seed provides: subjectKo, contextKo, tensionPoint, possibleAngles, reactionType
 * — enough for agents to write infinite unique posts about the same event.
 *
 * Usage:
 *   node scripts/extract-discussion-seeds.mjs
 *   node scripts/extract-discussion-seeds.mjs --input data/crawled-documents/korean-signals-raw.json
 *   node scripts/extract-discussion-seeds.mjs --output data/crawled-documents/discussion-seeds.json
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_INPUT_KOREAN = path.resolve(__dirname, "../data/crawled-documents/korean-signals-raw.json");
const DEFAULT_INPUT_WORLD = path.resolve(__dirname, "../data/crawled-documents/world-event-signals.json");
const DEFAULT_OUTPUT = path.resolve(__dirname, "../data/crawled-documents/discussion-seeds.json");

function parseArgs(argv) {
  const args = { input: null, output: DEFAULT_OUTPUT };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--input" && argv[i + 1]) args.input = path.resolve(process.cwd(), argv[++i]);
    if (argv[i] === "--output" && argv[i + 1]) args.output = path.resolve(process.cwd(), argv[++i]);
  }
  return args;
}

// ── Korean detection ──────────────────────────────────────────────────────

function hasKorean(text) {
  if (!text) return false;
  let count = 0;
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code >= 0xAC00 && code <= 0xD7AF) count++;
    if (count >= 2) return true;
  }
  return false;
}

// ── Reaction type classification ──────────────────────────────────────────

const REACTION_RULES = [
  { type: "price_reaction",     pattern: /가격|세일|할인|원$|쿠폰|최저가|무료배송|프로모션|sale|discount|coupon|price/i },
  { type: "product_reaction",   pattern: /출시|신상|런칭|한정|리뉴얼|컬렉션|시즌|발매|새로 나|launch|release|new drop|restock/i },
  { type: "celebrity_reaction",  pattern: /연예인|공항|화보|드라마|배우|아이돌|착용|셀럽|airport|celeb|red carpet|cover/i },
  { type: "season_reaction",    pattern: /날씨|비|맑음|기온|도$|봄|여름|가을|겨울|장마|벚꽃|눈|weather|spring|summer|fall|winter/i },
  { type: "comparison_reaction", pattern: /비교|versus|vs |차이|고민|뭐가 나|which|better/i },
  { type: "event_reaction",     pattern: /팝업|전시|행사|축제|페스티벌|개막|오픈|pop.?up|exhibition|event|festival/i },
  { type: "trend_reaction",     pattern: /트렌드|유행|핫|급상승|인기|바이럴|trend|hot|viral|trending/i },
];

function classifyReactionType(text) {
  const combined = String(text || "");
  for (const rule of REACTION_RULES) {
    if (rule.pattern.test(combined)) return rule.type;
  }
  return "general_reaction";
}

// ── Tension point generation ──────────────────────────────────────────────
// Creates a natural "논쟁 포인트" from the raw content

const TENSION_TEMPLATES = {
  price_reaction: [
    "이 가격이면 괜찮은 건지 좀 고민이 되네요",
    "다른 데서 더 싸게 살 수 있는 건 아닌지",
    "가격이 좀 오른 것 같은데",
    "세일이라지만 원래 가격이 비싼 거 아닌가",
    "가성비가 진짜 좋은 건지 모르겠어요",
  ],
  product_reaction: [
    "전작이랑 뭐가 달라진 건지 잘 모르겠어요",
    "실물이 사진이랑 다르다는 말이 있어서",
    "가격 대비 퀄리티가 궁금해요",
    "사야 하나 말아야 하나 고민중ㅋ",
    "후기가 아직 별로 없어서 불안한데",
  ],
  celebrity_reaction: [
    "이거 따라하면 현실은 다를 것 같은데ㅋ",
    "비슷한 느낌 내려면 얼마나 들까요",
    "꾸안꾸라지만 결국 비싼 옷인 것 같고",
    "대체템이 있을까요",
    "얼굴이 해야 할 일이 큰 것 같은데ㅋㅋ",
  ],
  season_reaction: [
    "아침이랑 낮 온도차가 너무 커서",
    "갑자기 바뀐 날씨에 입을 게 없어요",
    "이 날씨에 뭘 입어야 할지 모르겠어요",
    "작년에 뭘 입었는지 기억도 안 나고",
    "옷장에 계절에 맞는 게 하나도 없는 것 같아서",
  ],
  trend_reaction: [
    "유행이라는데 진짜 해야 하는 건지",
    "잘못하면 애매해질 것 같아서 좀 무서움",
    "호불호 갈릴 것 같은데 다들 어때요",
    "저한테도 어울릴지 모르겠어요",
    "이미 유행 지난 거 아닌가 싶기도 하고",
  ],
  comparison_reaction: [
    "둘 다 장단이 있어서 고민이에요",
    "써본 사람 의견이 진짜 궁금해요",
    "가격 차이만큼 퀄리티 차이가 있는 건지",
    "결국 뭘로 가야 할지 모르겠어요",
    "인터넷 후기가 너무 갈려서",
  ],
  event_reaction: [
    "뭐 입고 가야 할지 모르겠어요",
    "사람 많다는데 괜찮을까요",
    "기대만큼인지 모르겠어요",
    "가본 사람 후기가 궁금해요",
    "같이 갈 사람 있으면 좋겠는데",
  ],
  general_reaction: [
    "좀 고민이 되네요",
    "다들 어떻게 생각하시는지 궁금해요",
    "저만 이런 건가요ㅋ",
    "의견 좀 들어보고 싶어서요",
    "경험 있는 분 있으면 알려주세요",
  ],
};

function generateTension(reactionType, rng) {
  const pool = TENSION_TEMPLATES[reactionType] || TENSION_TEMPLATES.general_reaction;
  return pool[Math.floor(rng() * pool.length)];
}

// ── Possible angles generation ────────────────────────────────────────────

const ANGLE_POOLS = {
  price_reaction:     ["가성비 분석", "최저가 찾기", "대체 상품", "구매 시기", "실사용 후기", "쿠폰/할인코드"],
  product_reaction:   ["실착 후기", "사이즈 정보", "전작 비교", "컬러 추천", "내구성", "소재감"],
  celebrity_reaction:  ["대체템 찾기", "비슷한 코디법", "컬러 조합 참고", "가격대별 대안", "꾸안꾸 연출법"],
  season_reaction:    ["레이어링 팁", "날씨별 아우터", "소재 추천", "환절기 필수템", "가벼운 코디"],
  trend_reaction:     ["체형별 핏", "브랜드 추천", "코디 방법", "호불호 포인트", "유행 기간 예측"],
  comparison_reaction: ["핏 비교", "소재 비교", "가격 대비 가치", "내구성 비교", "코디 활용도"],
  event_reaction:     ["드레스코드", "교통 팁", "사진 스팟", "추천 동선", "코디 참고"],
  general_reaction:   ["개인 경험", "추천", "주의점", "꿀팁", "비슷한 사례"],
};

function pickAngles(reactionType, rng, count = 3) {
  const pool = ANGLE_POOLS[reactionType] || ANGLE_POOLS.general_reaction;
  const shuffled = [...pool].sort(() => rng() - 0.5);
  return shuffled.slice(0, count);
}

// ── Category tag extraction ───────────────────────────────────────────────

const CATEGORY_KEYWORDS = {
  sneakers:      /스니커즈|운동화|에어맥스|덩크|조던|뉴발|나이키|아디다스|sneaker/i,
  outerwear:     /자켓|코트|블루종|바람막이|아우터|패딩|jacket|coat/i,
  denim:         /데님|청바지|진|jean|denim/i,
  accessory:     /시계|가방|모자|선글라스|안경|반지|목걸이|watch|bag/i,
  beauty:        /화장품|뷰티|향수|립|스킨|beauty|perfume/i,
  streetwear:    /스트릿|후디|카고|오버핏|street/i,
  office:        /오피스|출근|정장|슬랙스|비즈니스|office|work/i,
  sustainable:   /중고|리폼|빈티지|지속가능|secondhand|vintage/i,
  travel:        /여행|공항|호텔|리조트|travel|airport/i,
  pet:           /반려|강아지|고양이|댕댕|산책|pet|dog/i,
};

function extractCategoryTags(text) {
  const tags = [];
  for (const [tag, pattern] of Object.entries(CATEGORY_KEYWORDS)) {
    if (pattern.test(text)) tags.push(tag);
  }
  return tags.length > 0 ? tags : ["fashion"];
}

// ── Freshness score ───────────────────────────────────────────────────────

function computeFreshness(dateStr) {
  if (!dateStr) return 0.5;
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return 0.5;
  const daysOld = (now - then) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.min(1, 1 - daysOld * 0.1));
}

// ── Seeded random ─────────────────────────────────────────────────────────

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Seed extraction from different source formats ─────────────────────────

function extractFromKoreanSignal(record, rng) {
  const subject = record.subjectKo || record.rawTitle || "";
  const context = record.contextKo || record.rawExcerpt || "";
  const combined = subject + " " + context;
  const reactionType = record.reactionType || classifyReactionType(combined);

  return {
    seedId: record.signalId || `seed-${Date.now()}-${Math.floor(rng() * 10000)}`,
    reactionType,
    subjectKo: subject,
    contextKo: context,
    tensionPoint: generateTension(reactionType, rng),
    possibleAngles: pickAngles(reactionType, rng),
    categoryTags: record.categoryTags || extractCategoryTags(combined),
    freshnessScore: computeFreshness(record.source?.crawledAt),
    sourceUrl: record.source?.url || "",
    rawTitle: record.rawTitle || subject,
  };
}

function extractFromWorldEventRecord(record, rng) {
  // world-event-signals.json format
  const raw = record.raw || {};
  const title = raw.title || record.normalizedSummary || "";
  const body = raw.body || raw.excerpt || "";
  const combined = title + " " + body;

  // Skip non-Korean content unless it has clear fashion relevance
  const isKorean = hasKorean(combined);
  const hasFashionKeywords = /fashion|패션|style|outfit|스타일|코디/i.test(combined);
  if (!isKorean && !hasFashionKeywords) return null;

  // Extract a Korean subject if possible, otherwise transliterate key terms
  let subjectKo = "";
  if (isKorean) {
    // Extract first meaningful Korean phrase
    const koreanMatch = combined.match(/[가-힣][가-힣\s]{2,20}/);
    subjectKo = koreanMatch ? koreanMatch[0].trim() : title.slice(0, 30);
  } else {
    // For English/Japanese: extract brand/product names and use as-is
    const brandMatch = combined.match(/\b(Nike|Adidas|Zara|Uniqlo|Musinsa|H&M|Gucci|Prada|Miu Miu|New Balance|Jordan|Dunk|Air Max)\b/i);
    subjectKo = brandMatch ? brandMatch[0] : title.slice(0, 30);
  }

  const reactionType = record.eventType
    ? mapEventType(record.eventType)
    : classifyReactionType(combined);

  const anchorPayload = record.anchorPayload || {};
  const agentHooks = record.agentHooks || {};

  return {
    seedId: record.signalId || `world-seed-${Math.floor(rng() * 100000)}`,
    reactionType,
    subjectKo,
    contextKo: record.normalizedSummary?.slice(0, 100) || "",
    tensionPoint: generateTension(reactionType, rng),
    possibleAngles: pickAngles(reactionType, rng),
    categoryTags: extractCategoryTags(combined),
    freshnessScore: computeFreshness(record.source?.createdAt),
    sourceUrl: record.source?.sourceUrl || "",
    rawTitle: title.slice(0, 80),
  };
}

function mapEventType(eventType) {
  const map = {
    fact_or_claim_signal: "general_reaction",
    comparison_question: "comparison_reaction",
    question_prompt: "trend_reaction",
    culture_signal: "celebrity_reaction",
    celebrity_signal: "celebrity_reaction",
    pricing_signal: "price_reaction",
    product_launch: "product_reaction",
    seasonal_signal: "season_reaction",
    event_signal: "event_reaction",
  };
  return map[eventType] || "general_reaction";
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const { input, output } = parseArgs(process.argv);
  const rng = seededRandom(42);
  const seeds = [];

  // Try Korean signals first (primary source)
  const koreanPath = input || DEFAULT_INPUT_KOREAN;
  try {
    const raw = JSON.parse(await fs.readFile(koreanPath, "utf8"));
    const records = raw.records || [];
    console.log(`[extract-seeds] Loading ${records.length} records from ${path.basename(koreanPath)}`);
    for (const record of records) {
      const seed = extractFromKoreanSignal(record, rng);
      if (seed && seed.subjectKo) seeds.push(seed);
    }
  } catch (err) {
    if (err.code !== "ENOENT") console.warn(`[extract-seeds] Warning: ${err.message}`);
    else console.log(`[extract-seeds] ${path.basename(koreanPath)} not found, skipping`);
  }

  // Also process world-event signals as secondary source
  if (!input || input !== DEFAULT_INPUT_WORLD) {
    try {
      const raw = JSON.parse(await fs.readFile(DEFAULT_INPUT_WORLD, "utf8"));
      const records = raw.records || [];
      console.log(`[extract-seeds] Loading ${records.length} records from world-event-signals.json`);
      for (const record of records) {
        const seed = extractFromWorldEventRecord(record, rng);
        if (seed && seed.subjectKo) seeds.push(seed);
      }
    } catch (err) {
      if (err.code !== "ENOENT") console.warn(`[extract-seeds] Warning: ${err.message}`);
      else console.log("[extract-seeds] world-event-signals.json not found, skipping");
    }
  }

  // Sort by freshness
  seeds.sort((a, b) => b.freshnessScore - a.freshnessScore);

  const result = {
    extractedAt: new Date().toISOString(),
    source: "extract-discussion-seeds.mjs",
    seedCount: seeds.length,
    reactionTypeDistribution: {},
    seeds,
  };

  for (const s of seeds) {
    result.reactionTypeDistribution[s.reactionType] =
      (result.reactionTypeDistribution[s.reactionType] || 0) + 1;
  }

  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, JSON.stringify(result, null, 2) + "\n", "utf8");

  console.log(`[extract-seeds] Extracted ${seeds.length} discussion seeds → ${output}`);
  console.log("[extract-seeds] Distribution:", result.reactionTypeDistribution);
}

main().catch((err) => { console.error(err); process.exit(1); });
