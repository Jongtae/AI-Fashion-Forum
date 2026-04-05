#!/usr/bin/env node
/**
 * crawl-korean-signals.mjs
 *
 * Fetches public Korean content sources and produces "discussion seeds"
 * that simulation agents can react to.
 *
 * Sources:
 *   1. Google Trends Korea (RSS)
 *   2. Mastodon Korean fashion tags (public JSON API)
 *   3. Fashionbiz Korea (RSS / HTML fallback)
 *   4. Seoul weather via wttr.in (JSON)
 *
 * Output: data/crawled-documents/korean-signals-raw.json
 *
 * Usage:
 *   node scripts/crawl-korean-signals.mjs
 *   node scripts/crawl-korean-signals.mjs --output data/custom-path.json
 *   node scripts/crawl-korean-signals.mjs --limit 30
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  STRUCTURED_SOURCES,
  RSS_SOURCES,
  SOCIAL_SOURCES,
  CURATED_SEEDS,
  classifyReaction,
  hasKorean,
} from "./korean-signal-source-registry.mjs";

// Backward compat: merge all sources into a flat SOURCES object
const SOURCES = {
  ...STRUCTURED_SOURCES,
  ...RSS_SOURCES,
  ...SOCIAL_SOURCES,
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_OUTPUT = path.resolve(
  __dirname,
  "../data/crawled-documents/korean-signals-raw.json",
);
const DEFAULT_LIMIT = 50;
const USER_AGENT =
  process.env.CRAWL_USER_AGENT ||
  "AI-Fashion-Forum/1.0 (korean-signal-crawler)";

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { output: DEFAULT_OUTPUT, limit: DEFAULT_LIMIT };
  for (let i = 2; i < argv.length; i += 1) {
    const v = argv[i];
    const next = argv[i + 1];
    if (v === "--output" && next) {
      args.output = path.resolve(process.cwd(), next);
      i += 1;
    } else if (v === "--limit" && next) {
      const n = Number.parseInt(next, 10);
      if (!Number.isNaN(n) && n > 0) args.limit = n;
      i += 1;
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripHtml(html = "") {
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Minimal RSS/XML tag extractor using regex.
 * Returns an array of strings matching the inner text of `<tagName>...</tagName>`.
 */
function extractXmlTag(xml, tagName) {
  const re = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, "gi");
  const results = [];
  let m;
  while ((m = re.exec(xml)) !== null) {
    results.push(stripHtml(m[1]));
  }
  return results;
}

/**
 * Extract RSS <item> blocks and return an array of { title, description, link }.
 */
function parseRssItems(xml) {
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  const items = [];
  let m;
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];
    const title = extractXmlTag(block, "title")[0] || "";
    const description = extractXmlTag(block, "description")[0] || "";
    const link = extractXmlTag(block, "link")[0] || "";
    items.push({ title, description, link });
  }
  return items;
}

export function extractHtmlAnchors(html = "", {
  minLength = 12,
  hrefPattern = null,
  requireKorean = true,
} = {}) {
  const anchors = [];
  const anchorRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorRegex.exec(html)) !== null) {
    const href = (match[1] || "")
      .replace(/&amp;/g, "&")
      .replace(/&#x3D;/gi, "=")
      .replace(/&#61;/g, "=");
    const text = stripHtml(match[2] || "");
    if (text.length < minLength) continue;
    if (requireKorean && !hasKorean(text, 3)) continue;
    if (hrefPattern && !hrefPattern.test(href)) continue;
    anchors.push({ href, text });
  }

  const deduped = [];
  const seen = new Set();
  for (const item of anchors) {
    const key = `${item.href}|${item.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}

export function extractMusinsaRankingApiUrl(html = "") {
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/i);
  if (!nextDataMatch) {
    return null;
  }

  try {
    const nextData = JSON.parse(nextDataMatch[1]);
    const panels = nextData?.props?.pageProps?.data?.store?.[0]?.pan || [];
    const rankingPanel = panels.find((panel) => panel?.type === "ranking");
    return rankingPanel?.webApi || rankingPanel?.api || null;
  } catch {
    return null;
  }
}

export function extractMusinsaRankingItems(payload = {}) {
  const modules = Array.isArray(payload?.data?.modules) ? payload.data.modules : [];
  const productItems = [];

  for (const module of modules) {
    if (module?.type !== "MULTICOLUMN" || !Array.isArray(module.items)) continue;
    for (const item of module.items) {
      if (item?.type !== "PRODUCT_COLUMN") continue;
      const info = item.info || {};
      if (!info.productName || !info.brandName) continue;
      productItems.push({
        id: item.id || "",
        rank: item.image?.rank || null,
        brandName: info.brandName,
        productName: info.productName,
        finalPrice: info.finalPrice || null,
        discountRatio: info.discountRatio || 0,
        labels: Array.isArray(item.image?.labels) ? item.image.labels.map((label) => label?.text).filter(Boolean) : [],
        url: info.onClickBrandName?.url || item.onClick?.url || "",
      });
    }
  }

  const deduped = [];
  const seen = new Set();
  for (const item of productItems) {
    const key = `${item.brandName}|${item.productName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}

let _counter = 0;
function nextSignalId() {
  _counter += 1;
  return `kr-signal-${String(_counter).padStart(4, "0")}`;
}

function freshnessScore(dateStr) {
  if (!dateStr) return 0.5;
  const diff = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return 1.0;
  return Math.max(0, +(1.0 - diff * 0.1).toFixed(2));
}

export function selectBalancedRecords(records = [], limit = DEFAULT_LIMIT) {
  if (!Array.isArray(records) || records.length <= limit) {
    return Array.isArray(records) ? records : [];
  }

  const grouped = new Map();
  for (const record of records) {
    const key = record?.source?.platform || "unknown";
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(record);
  }

  const platforms = [...grouped.keys()].sort();
  const selected = [];

  for (const platform of platforms) {
    if (selected.length >= limit) break;
    const bucket = grouped.get(platform) || [];
    const next = bucket.shift();
    if (next) {
      selected.push(next);
    }
    if (bucket.length === 0) {
      grouped.delete(platform);
    }
  }

  const remainingPlatforms = [...grouped.keys()].sort();
  let cursor = 0;

  while (selected.length < limit && remainingPlatforms.length > 0) {
    const platform = remainingPlatforms[cursor % remainingPlatforms.length];
    const bucket = grouped.get(platform) || [];
    const next = bucket.shift();
    if (next) {
      selected.push(next);
    }
    if (bucket.length === 0) {
      grouped.delete(platform);
      remainingPlatforms.splice(remainingPlatforms.indexOf(platform), 1);
      cursor = 0;
      continue;
    }
    cursor += 1;
  }

  return selected;
}

function guessCategoryTags(text = "") {
  const tags = [];
  const lower = text.toLowerCase();
  const mapping = {
    sneakers: ["스니커즈", "에어맥스", "조던", "나이키", "아디다스", "뉴발란스", "sneaker", "nike", "adidas", "jordan"],
    brand: ["나이키", "구찌", "샤넬", "루이비통", "프라다", "무신사", "nike", "gucci", "chanel", "prada"],
    streetwear: ["스트릿", "힙합", "오버사이즈", "후디", "streetwear"],
    luxury: ["명품", "럭셔리", "하이엔드", "luxury"],
    celebrity: ["연예인", "아이돌", "셀럽", "공항패션", "화보"],
    weather: ["날씨", "기온", "비", "맑음", "weather"],
    retail: ["세일", "할인", "가격", "출시", "sale", "price"],
    beauty: ["뷰티", "메이크업", "화장", "스킨케어", "beauty"],
    daily: ["데일리", "데일리룩", "출근룩", "daily"],
  };
  for (const [tag, keywords] of Object.entries(mapping)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      tags.push(tag);
    }
  }
  if (tags.length === 0) tags.push("general");
  return tags;
}

// ---------------------------------------------------------------------------
// Source fetchers
// ---------------------------------------------------------------------------

async function fetchGoogleTrendsKR() {
  const now = new Date().toISOString();
  console.log("[crawl-kr] Fetching Google Trends Korea RSS...");
  const res = await fetch(SOURCES.google_trends_kr.url, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`Google Trends RSS: HTTP ${res.status}`);
  const xml = await res.text();
  const items = parseRssItems(xml);
  console.log(`[crawl-kr]   Google Trends: ${items.length} items`);

  return items.map((item) => {
    const text = `${item.title} ${item.description}`;
    return {
      signalId: nextSignalId(),
      source: {
        platform: "google_trends",
        url: item.link || SOURCES.google_trends_kr.url,
        crawledAt: now,
      },
      subjectKo: item.title,
      contextKo: item.description
        ? `실시간 검색 급상승, ${item.description}`
        : "실시간 검색 급상승",
      reactionType: classifyReaction(text),
      categoryTags: guessCategoryTags(text),
      freshnessScore: 1.0,
      rawTitle: item.title,
      rawExcerpt: (item.description || "").slice(0, 300),
    };
  });
}

async function fetchMastodonKR() {
  const now = new Date().toISOString();
  const allRecords = [];
  const { tags } = SOURCES.mastodon_kr;

  for (const tag of tags) {
    console.log(`[crawl-kr] Fetching Mastodon #${tag}...`);
    try {
      const url = SOURCES.mastodon_kr.urlTemplate(tag, 20);
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Mastodon #${tag}: HTTP ${res.status}`);
      const posts = await res.json();
      const arr = Array.isArray(posts) ? posts : [];

      const filtered = arr.filter((p) => {
        const content = stripHtml(p.content || "");
        return hasKorean(content) || hasKorean(tag);
      });

      console.log(`[crawl-kr]   Mastodon #${tag}: ${filtered.length}/${arr.length} Korean`);

      for (const post of filtered) {
        const rawContent = stripHtml(post.content || "");
        // Strip URLs, hashtags, and noise for cleaner subjects/context
        const content = rawContent
          .replace(/https?:\/\/\S+/g, "")
          .replace(/#\S+/g, "")           // remove all hashtags from body
          .replace(/\.\s*\.\s*\.*/g, "")  // remove ".  .  .  ." patterns
          .replace(/\s{2,}/g, " ")
          .trim();
        const postTags = Array.isArray(post.tags)
          ? post.tags.map((t) => t?.name).filter(Boolean)
          : [];
        const text = `${content} ${postTags.join(" ")}`;

        // Extract a clean Korean subject — first meaningful Korean phrase, capped at 30 chars
        const koreanPhraseMatch = content.match(/[가-힣][가-힣\s,!?.ㅋㅎㅠ]{3,28}/);
        let cleanSubject = koreanPhraseMatch
          ? koreanPhraseMatch[0].replace(/\s+/g, " ").trim()
          : content.slice(0, 30) || `#${tag} 포스트`;
        if (cleanSubject.length > 30) cleanSubject = cleanSubject.slice(0, 30);

        // Context: use cleaned content but keep it concise
        const cleanContext = content.length > 100
          ? content.slice(0, 100) + "..."
          : content || `마스토돈 #${tag}`;

        allRecords.push({
          signalId: nextSignalId(),
          source: {
            platform: "mastodon",
            url: post.url || "",
            crawledAt: now,
          },
          subjectKo: cleanSubject,
          contextKo: cleanContext,
          reactionType: classifyReaction(text),
          categoryTags: guessCategoryTags(text),
          freshnessScore: freshnessScore(post.created_at),
          rawTitle: content.slice(0, 120),
          rawExcerpt: content.slice(0, 300),
        });
      }
    } catch (err) {
      console.warn(`[crawl-kr]   Mastodon #${tag} failed: ${err.message}`);
    }
  }
  return allRecords;
}

async function fetchNaverNewsFashion() {
  const now = new Date().toISOString();
  console.log("[crawl-kr] Fetching Naver News lifestyle section...");
  const res = await fetch(SOURCES.naver_news_fashion.url, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`Naver News: HTTP ${res.status}`);
  const body = await res.text();

  const anchors = extractHtmlAnchors(body, {
    minLength: 18,
    hrefPattern: /\/mnews\/|article\/|ranking\/article/i,
    requireKorean: true,
  });
  console.log(`[crawl-kr]   Naver News: ${anchors.length} headlines`);

  return anchors.slice(0, 20).map((item) => {
    const title = item.text
      .replace(/\[[^\]]+\]\s*/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const text = `${title} 네이버 뉴스 생활문화`;
    return {
      signalId: nextSignalId(),
      source: {
        platform: "naver_news",
        url: item.href,
        crawledAt: now,
      },
      subjectKo: title,
      contextKo: `네이버 생활/문화 섹션에서 화제가 된 기사: ${title}`,
      reactionType: classifyReaction(text),
      categoryTags: guessCategoryTags(`${text} lifestyle culture celebrity travel`),
      freshnessScore: 0.95,
      rawTitle: title,
      rawExcerpt: title,
    };
  });
}

async function fetchHankyungTrend() {
  const now = new Date().toISOString();
  console.log("[crawl-kr] Fetching Hankyung life RSS...");
  const res = await fetch(SOURCES.hankyung_trend.url, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`Hankyung RSS: HTTP ${res.status}`);
  const xml = await res.text();
  const items = parseRssItems(xml);
  console.log(`[crawl-kr]   Hankyung: ${items.length} items`);

  return items.slice(0, 20).map((item) => {
    const title = stripHtml(item.title);
    const description = stripHtml(item.description || "");
    const text = `${title} ${description}`;
    return {
      signalId: nextSignalId(),
      source: {
        platform: "hankyung",
        url: item.link || SOURCES.hankyung_trend.url,
        crawledAt: now,
      },
      subjectKo: title,
      contextKo: description || `한경 라이프 기사: ${title}`,
      reactionType: classifyReaction(text),
      categoryTags: guessCategoryTags(`${text} culture celebrity lifestyle retail`),
      freshnessScore: 0.9,
      rawTitle: title,
      rawExcerpt: (description || title).slice(0, 300),
    };
  });
}

async function fetchMusinsaRanking() {
  const now = new Date().toISOString();
  console.log("[crawl-kr] Fetching Musinsa ranking...");
  const pageRes = await fetch(STRUCTURED_SOURCES.musinsa_ranking.url, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!pageRes.ok) throw new Error(`Musinsa ranking page: HTTP ${pageRes.status}`);
  const pageHtml = await pageRes.text();
  const discoveredApiUrl = extractMusinsaRankingApiUrl(pageHtml) || STRUCTURED_SOURCES.musinsa_ranking.fallbackUrl;
  if (!discoveredApiUrl) {
    throw new Error("Musinsa ranking API URL not found");
  }

  const apiRes = await fetch(discoveredApiUrl, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!apiRes.ok) throw new Error(`Musinsa ranking API: HTTP ${apiRes.status}`);
  const payload = await apiRes.json();
  const items = extractMusinsaRankingItems(payload);
  console.log(`[crawl-kr]   Musinsa: ${items.length} ranked products`);

  return items.slice(0, 20).map((item) => {
    const priceText = item.finalPrice ? `${Number(item.finalPrice).toLocaleString("ko-KR")}원` : "가격 확인";
    const badgeText = item.labels.length ? ` (${item.labels.join(", ")})` : "";
    const title = `${item.brandName} ${item.productName}`.replace(/\s+/g, " ").trim();
    const text = `${title} ${priceText} ${badgeText}`;
    return {
      signalId: nextSignalId(),
      source: {
        platform: "musinsa",
        url: item.url || discoveredApiUrl,
        crawledAt: now,
      },
      subjectKo: title,
      contextKo: `무신사 랭킹 ${item.rank || ""}위 · ${priceText}${badgeText}`.trim(),
      reactionType: classifyReaction(`${text} 가격 랭킹 후기`),
      categoryTags: guessCategoryTags(`${text} 무신사 랭킹 세일 가격 fashion retail`),
      freshnessScore: 0.92,
      rawTitle: title,
      rawExcerpt: `무신사 랭킹 ${item.rank || ""}위 · ${priceText}${badgeText}`.trim(),
    };
  });
}

async function fetchFashionbiz() {
  const now = new Date().toISOString();
  console.log("[crawl-kr] Fetching Fashionbiz Korea...");
  const res = await fetch(SOURCES.fashionbiz.url, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`Fashionbiz: HTTP ${res.status}`);
  const body = await res.text();

  // Try RSS item extraction first; fall back to headline-style extraction
  let items = parseRssItems(body);

  if (items.length === 0) {
    // Fallback: extract <a> tags with Korean text that look like headlines
    const aRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = aRegex.exec(body)) !== null) {
      const href = m[1] || "";
      const text = stripHtml(m[2]);
      if (text.length > 10 && hasKorean(text, 3)) {
        items.push({
          title: text,
          description: "",
          link: href.startsWith("http") ? href : `https://www.fashionbiz.co.kr${href}`,
        });
      }
    }
  }

  console.log(`[crawl-kr]   Fashionbiz: ${items.length} items`);

  return items.map((item) => {
    const text = `${item.title} ${item.description}`;
    return {
      signalId: nextSignalId(),
      source: {
        platform: "fashionbiz",
        url: item.link || SOURCES.fashionbiz.url,
        crawledAt: now,
      },
      subjectKo: item.title,
      contextKo: item.description || `패션비즈 뉴스: ${item.title}`,
      reactionType: classifyReaction(text),
      categoryTags: guessCategoryTags(text),
      freshnessScore: 1.0,
      rawTitle: item.title,
      rawExcerpt: (item.description || item.title).slice(0, 300),
    };
  });
}

async function fetchSeoulWeather() {
  const now = new Date().toISOString();
  console.log("[crawl-kr] Fetching Seoul weather...");
  const res = await fetch(SOURCES.weather_seoul.url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Weather: HTTP ${res.status}`);
  const data = await res.json();

  const current = data.current_condition?.[0] || {};
  const tempC = current.temp_C || "?";
  const desc = current.weatherDesc?.[0]?.value || current.weatherKo || "unknown";
  const humidity = current.humidity || "?";
  const precip = current.precipMM || "0";
  const feelsLike = current.FeelsLikeC || tempC;

  // Map weather to Korean description
  const descLower = (desc || "").toLowerCase();
  let conditionKo = "맑음";
  if (descLower.includes("rain") || descLower.includes("drizzle")) conditionKo = "비";
  else if (descLower.includes("snow")) conditionKo = "눈";
  else if (descLower.includes("cloud") || descLower.includes("overcast")) conditionKo = "흐림";
  else if (descLower.includes("fog") || descLower.includes("mist")) conditionKo = "안개";
  else if (descLower.includes("sunny") || descLower.includes("clear")) conditionKo = "맑음";

  const subjectKo = `서울 날씨: ${tempC}°C, ${conditionKo}`;
  const contextKo = `현재 서울 기온 ${tempC}°C (체감 ${feelsLike}°C), ${conditionKo}, 습도 ${humidity}%, 강수 ${precip}mm`;

  console.log(`[crawl-kr]   Weather: ${tempC}°C, ${conditionKo}`);

  return [
    {
      signalId: nextSignalId(),
      source: {
        platform: "weather",
        url: SOURCES.weather_seoul.url,
        crawledAt: now,
      },
      subjectKo,
      contextKo,
      reactionType: "season_reaction",
      categoryTags: ["weather"],
      freshnessScore: 1.0,
      rawTitle: subjectKo,
      rawExcerpt: contextKo,
    },
  ];
}

// ---------------------------------------------------------------------------
// Exchange rate (USD/KRW)
// ---------------------------------------------------------------------------

async function fetchExchangeRate() {
  const now = new Date().toISOString();
  console.log("[crawl-kr] Fetching exchange rate...");
  const res = await fetch(STRUCTURED_SOURCES.exchange_rate.url, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`Exchange rate: HTTP ${res.status}`);
  const data = await res.json();
  const krwRate = data.rates?.KRW;
  if (!krwRate) throw new Error("No KRW rate in response");

  const rateFormatted = Math.round(krwRate).toLocaleString("ko-KR");
  const subjectKo = `환율 1달러 ${rateFormatted}원`;
  const contextKo = `현재 USD/KRW 환율 ${rateFormatted}원 (${new Date().toLocaleDateString("ko-KR")} 기준)`;

  console.log(`[crawl-kr]   Exchange rate: $1 = ₩${rateFormatted}`);

  const records = [
    {
      signalId: nextSignalId(),
      source: { platform: "exchange_rate", url: STRUCTURED_SOURCES.exchange_rate.url, crawledAt: now },
      subjectKo,
      contextKo,
      reactionType: "price_reaction",
      categoryTags: ["fashion", "travel"],
      freshnessScore: 1.0,
      rawTitle: subjectKo,
      rawExcerpt: contextKo,
    },
  ];

  // Generate derived discussion angles
  if (krwRate > 1350) {
    records[0].contextKo += ". 환율이 높아서 직구/해외여행 부담 증가";
  } else if (krwRate < 1250) {
    records[0].contextKo += ". 환율이 낮아서 직구/해외여행 기회";
  }

  return records;
}

// ---------------------------------------------------------------------------
// Curated seed topics (always available, no network required)
// ---------------------------------------------------------------------------

function generateCuratedSeeds() {
  const now = new Date().toISOString();
  console.log("[crawl-kr] Adding curated fashion topics...");

  // Rotate through curated seeds based on day of year to avoid always using the same ones
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  const shuffled = [...CURATED_SEEDS].sort((a, b) => {
    const ha = (a.subjectKo.charCodeAt(0) * 31 + dayOfYear) % 100;
    const hb = (b.subjectKo.charCodeAt(0) * 31 + dayOfYear) % 100;
    return ha - hb;
  });

  // Pick 8-12 per run
  const count = Math.min(12, shuffled.length);
  const selected = shuffled.slice(0, count);

  console.log(`[crawl-kr]   Curated: ${selected.length} topics`);

  return selected.map((seed) => ({
    signalId: nextSignalId(),
    source: { platform: "curated", url: "", crawledAt: now },
    subjectKo: seed.subjectKo,
    contextKo: seed.contextKo,
    reactionType: seed.reactionType,
    categoryTags: seed.categoryTags,
    freshnessScore: 0.8, // slightly lower than live data
    rawTitle: seed.subjectKo,
    rawExcerpt: seed.contextKo,
  }));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { output, limit } = parseArgs(process.argv);
  const allRecords = [];
  const errors = [];

  // Each source is independent; if one fails others still run.
  const fetchers = [
    { name: "google_trends", fn: fetchGoogleTrendsKR },
    { name: "naver_news_fashion", fn: fetchNaverNewsFashion },
    { name: "hankyung_trend", fn: fetchHankyungTrend },
    { name: "musinsa_ranking", fn: fetchMusinsaRanking },
    { name: "mastodon_kr", fn: fetchMastodonKR },
    { name: "fashionbiz", fn: fetchFashionbiz },
    { name: "weather_seoul", fn: fetchSeoulWeather },
    { name: "exchange_rate", fn: fetchExchangeRate },
    { name: "curated", fn: async () => generateCuratedSeeds() },
  ];

  for (const { name, fn } of fetchers) {
    try {
      const records = await fn();
      allRecords.push(...records);
    } catch (err) {
      errors.push({ source: name, error: err.message });
      console.warn(`[crawl-kr] ${name} failed: ${err.message}`);
    }
  }

  // Dedupe by rawTitle
  const seen = new Set();
  const deduped = [];
  for (const r of allRecords) {
    const key = `${r.source.platform}|${r.rawTitle}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(r);
  }

  // Apply limit with light source balancing so later sources do not get starved.
  const selected = selectBalancedRecords(deduped, limit);

  // Re-number signalIds sequentially
  selected.forEach((r, i) => {
    r.signalId = `kr-signal-${String(i + 1).padStart(4, "0")}`;
  });

  const result = {
    crawledAt: new Date().toISOString(),
    source: "crawl-korean-signals.mjs",
    sourceSummary: {
      totalCandidates: deduped.length,
      totalSelected: selected.length,
      limit,
      errors,
    },
    records: selected,
  };

  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  console.log(`[crawl-kr] Done. ${selected.length}/${deduped.length} records written to ${output}`);
  if (errors.length > 0) {
    console.log(`[crawl-kr] ${errors.length} source(s) had errors: ${errors.map((e) => e.source).join(", ")}`);
  }
}

const isDirectRun =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((err) => {
    console.error("[crawl-kr] Fatal:", err);
    process.exit(1);
  });
}
