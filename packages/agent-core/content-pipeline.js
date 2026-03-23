import {
  CONTENT_PROVIDER_INTERFACE,
  createProviderRecord,
  normalizeProviderRecord,
} from "@ai-fashion-forum/shared-types";

function assertContentProvider(provider) {
  if (!provider || typeof provider.getRecords !== "function") {
    throw new Error("provider must implement ContentProvider.getRecords(context)");
  }
}

export function createMockContentProvider({
  providerId = "mock-signal-wire",
  authorId = "system:signal-wire",
} = {}) {
  return {
    provider_id: providerId,
    interface: CONTENT_PROVIDER_INTERFACE,
    async getRecords({ startTick = 0 } = {}) {
      return [
        createProviderRecord({
          provider_id: providerId,
          provider_item_id: "article-001",
          source_type: "external_article",
          format: "trend_report",
          author_id: authorId,
          created_tick: startTick,
          title: "가격 민감도가 큰 주간에도 실용성 태그가 더 오래 남는다는 기사 요약",
          body: "A mock article feed notes that practical officewear threads keep resurfacing after short hype cycles.",
          topics: ["pricing", "office_style", "utility"],
          emotions: ["curiosity", "caution"],
          source_metadata: {
            publisher: "Signal Wire Weekly",
            url: "https://example.com/articles/article-001",
            ingest_channel: "rss_mock",
          },
        }),
        createProviderRecord({
          provider_id: providerId,
          provider_item_id: "social-014",
          source_type: "social_post",
          format: "style_signal",
          author_id: authorId,
          created_tick: startTick + 1,
          title: "통근 거울샷이 갑자기 많이 저장되는 오전 패턴",
          body: "A mock social post reports a spike in saves around simple commute mirror looks with soft tailoring.",
          topics: ["commute", "mirror", "soft_tailoring"],
          emotions: ["interest", "aspiration"],
          source_metadata: {
            network: "mock-social",
            permalink: "https://example.com/social/social-014",
            engagement: { saves: 182, replies: 17 },
          },
        }),
        createProviderRecord({
          provider_id: providerId,
          provider_item_id: "image-021",
          source_type: "image_description",
          format: "scene_note",
          author_id: authorId,
          created_tick: startTick + 2,
          title: "현관 바닥에 놓인 가방과 강아지의 동선이 함께 보이는 장면 설명",
          body: "A mock image-description feed describes an entryway scene where a tote, loafers, and a waiting dog signal routine style habits.",
          topics: ["bags", "dogs", "entryway"],
          emotions: ["warmth", "amusement"],
          source_metadata: {
            detector: "vision-caption-mock",
            asset_id: "image-021",
            capture_mode: "scene_description",
          },
        }),
      ];
    },
  };
}

export async function collectNormalizedProviderContent({
  provider,
  startTick = 0,
} = {}) {
  assertContentProvider(provider);

  const rawRecords = await provider.getRecords({ startTick });
  const normalizedRecords = rawRecords.map((record, index) =>
    normalizeProviderRecord(record, {
      created_tick: startTick + index,
    }),
  );

  return {
    provider_id: provider.provider_id || "unknown-provider",
    raw_count: rawRecords.length,
    normalized_count: normalizedRecords.length,
    rawRecords,
    normalizedRecords,
  };
}

export async function createMockNormalizedContentBundle(options = {}) {
  return collectNormalizedProviderContent({
    provider: createMockContentProvider(options),
    startTick: options.startTick || 0,
  });
}
