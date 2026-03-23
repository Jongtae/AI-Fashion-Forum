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

export function createSprint1StarterContentProvider({
  providerId = "sprint1-curated-pack",
  authorId = "system:sprint1-curator",
} = {}) {
  return {
    provider_id: providerId,
    interface: CONTENT_PROVIDER_INTERFACE,
    async getRecords({ startTick = 0 } = {}) {
      return [
        createProviderRecord({
          provider_id: providerId,
          provider_item_id: "article-care-001",
          source_type: "external_article",
          format: "trend_report",
          author_id: authorId,
          created_tick: startTick,
          title: "길고양이 돌봄 계정과 조용한 일상복 계정의 팔로워가 겹친다는 분석",
          body: "A curated article notes that low-drama daily outfit readers often overlap with soft care and rescue-content audiences.",
          topics: ["care", "cats", "daily_life", "quiet_style"],
          emotions: ["curiosity", "warmth"],
          source_metadata: {
            publisher: "Forum Signals Review",
            url: "https://example.com/sprint1/article-care-001",
            exposure_tags: {
              value_axes: ["care", "soft_routine", "community"],
              tension_axes: ["care_vs_status"],
              audience_lenses: ["empathetic_reader", "quiet_observer"],
              novelty_level: "low",
            },
          },
        }),
        createProviderRecord({
          provider_id: providerId,
          provider_item_id: "social-office-001",
          source_type: "social_post",
          format: "style_signal",
          author_id: authorId,
          created_tick: startTick + 1,
          title: "과한 신상보다 반복 입는 출근룩이 더 저장되는 오전 패턴",
          body: "A curated social post observes that repeatable commute looks keep winning saves against louder trend drops on weekday mornings.",
          topics: ["office_style", "utility", "repeat_wear", "mirror"],
          emotions: ["interest", "calm"],
          source_metadata: {
            network: "signal-feed",
            permalink: "https://example.com/sprint1/social-office-001",
            engagement: { saves: 241, replies: 32 },
            exposure_tags: {
              value_axes: ["practicality", "repeatability"],
              tension_axes: ["utility_vs_novelty"],
              audience_lenses: ["community_regular", "practical_reviewer"],
              novelty_level: "steady",
            },
          },
        }),
        createProviderRecord({
          provider_id: providerId,
          provider_item_id: "article-pricing-001",
          source_type: "external_article",
          format: "trend_report",
          author_id: authorId,
          created_tick: startTick + 2,
          title: "이번 주엔 예쁜 것보다 가격 납득 가능성이 더 오래 이야기된다는 요약",
          body: "A curated article shows pricing skepticism outlasting pure hype in fashion-community discussions when the same products repeat across feeds.",
          topics: ["pricing", "hype", "tradeoffs", "brand_signal"],
          emotions: ["caution", "frustration"],
          source_metadata: {
            publisher: "Signal Wire Weekly",
            url: "https://example.com/sprint1/article-pricing-001",
            exposure_tags: {
              value_axes: ["fairness", "skepticism"],
              tension_axes: ["price_vs_hype", "signal_vs_value"],
              audience_lenses: ["contrarian_commenter", "value_checker"],
              novelty_level: "medium",
            },
          },
        }),
        createProviderRecord({
          provider_id: providerId,
          provider_item_id: "social-mirror-001",
          source_type: "social_post",
          format: "daily_snapshot",
          author_id: authorId,
          created_tick: startTick + 3,
          title: "현관 거울 앞에서 찍은 평일 기록이 댓글을 오래 끌고 가는 이유",
          body: "A curated social post reports that imperfect doorway and mirror shots keep attracting practical discussion because the context feels real.",
          topics: ["mirror", "entryway", "daily_life", "practical_feedback"],
          emotions: ["curiosity", "empathy"],
          source_metadata: {
            network: "signal-feed",
            permalink: "https://example.com/sprint1/social-mirror-001",
            engagement: { saves: 173, replies: 41 },
            exposure_tags: {
              value_axes: ["lived_context", "realism"],
              tension_axes: ["polish_vs_realness"],
              audience_lenses: ["empathetic_responder", "quiet_observer"],
              novelty_level: "steady",
            },
          },
        }),
        createProviderRecord({
          provider_id: providerId,
          provider_item_id: "image-cat-knit-001",
          source_type: "image_description",
          format: "pet_episode",
          author_id: authorId,
          created_tick: startTick + 4,
          title: "니트를 펼쳐두자 고양이가 먼저 올라앉은 주말 장면 설명",
          body: "A curated image description captures a cat interrupting a knitwear photo, turning a style post into a lived-in home episode.",
          topics: ["cats", "knitwear", "home", "pet_episode"],
          emotions: ["amusement", "warmth"],
          source_metadata: {
            detector: "human-curated-scene-note",
            asset_id: "sprint1-image-cat-knit-001",
            capture_mode: "episode_description",
            exposure_tags: {
              value_axes: ["warmth", "home_life", "care"],
              tension_axes: ["order_vs_interruptions"],
              audience_lenses: ["care_reader", "lifestyle_observer"],
              novelty_level: "low",
            },
          },
        }),
        createProviderRecord({
          provider_id: providerId,
          provider_item_id: "article-trend-001",
          source_type: "external_article",
          format: "trend_report",
          author_id: authorId,
          created_tick: startTick + 5,
          title: "새로운 실루엣이 등장하면 조용한 포럼도 빠르게 양분된다는 분석",
          body: "A curated article highlights how even practical communities split when a strong new silhouette creates taste-signaling pressure.",
          topics: ["novelty", "silhouette", "signal", "trend_shift"],
          emotions: ["interest", "anticipation"],
          source_metadata: {
            publisher: "Trend Pulse Briefing",
            url: "https://example.com/sprint1/article-trend-001",
            exposure_tags: {
              value_axes: ["novelty", "signal"],
              tension_axes: ["freshness_vs_safety"],
              audience_lenses: ["trend_seeker", "status_reader"],
              novelty_level: "high",
            },
          },
        }),
        createProviderRecord({
          provider_id: providerId,
          provider_item_id: "social-argument-001",
          source_type: "social_post",
          format: "empathy_post",
          author_id: authorId,
          created_tick: startTick + 6,
          title: "다들 예쁘다는데 나는 가격 때문에 계속 망설여진다는 글이 많이 공감받음",
          body: "A curated social post shows a thread where hesitation around price and practicality draws both empathy and irritation.",
          topics: ["pricing", "hesitation", "forum_discourse", "daily_utility"],
          emotions: ["empathy", "frustration"],
          source_metadata: {
            network: "signal-feed",
            permalink: "https://example.com/sprint1/social-argument-001",
            engagement: { saves: 98, replies: 57 },
            exposure_tags: {
              value_axes: ["fairness", "self_justification"],
              tension_axes: ["desire_vs_restraint"],
              audience_lenses: ["empathetic_responder", "contrarian_commenter"],
              novelty_level: "medium",
            },
          },
        }),
        createProviderRecord({
          provider_id: providerId,
          provider_item_id: "image-dog-entryway-001",
          source_type: "image_description",
          format: "pet_episode",
          author_id: authorId,
          created_tick: startTick + 7,
          title: "문 앞에서 리드줄을 기다리는 강아지와 가방, 로퍼가 같이 보이는 장면 설명",
          body: "A curated image description captures an outing-prep moment where a dog, a bag, and shoes all signal routine before the owner leaves.",
          topics: ["dogs", "entryway", "bags", "routine"],
          emotions: ["warmth", "anticipation"],
          source_metadata: {
            detector: "human-curated-scene-note",
            asset_id: "sprint1-image-dog-entryway-001",
            capture_mode: "episode_description",
            exposure_tags: {
              value_axes: ["routine", "companionship", "daily_life"],
              tension_axes: ["speed_vs_attention"],
              audience_lenses: ["care_reader", "practical_reviewer"],
              novelty_level: "low",
            },
          },
        }),
        createProviderRecord({
          provider_id: providerId,
          provider_item_id: "article-quality-001",
          source_type: "external_article",
          format: "trend_report",
          author_id: authorId,
          created_tick: startTick + 8,
          title: "작은 집과 반복된 착장이 품질 기준을 더 엄격하게 만든다는 기사 요약",
          body: "A curated article argues that compact daily routines push people toward stronger views about quality, comfort, and repeat-wear tradeoffs.",
          topics: ["quality", "repeat_wear", "comfort", "daily_life"],
          emotions: ["reflection", "curiosity"],
          source_metadata: {
            publisher: "Routine Objects Journal",
            url: "https://example.com/sprint1/article-quality-001",
            exposure_tags: {
              value_axes: ["comfort", "quality", "repeatability"],
              tension_axes: ["comfort_vs_signal"],
              audience_lenses: ["quiet_observer", "community_regular"],
              novelty_level: "low",
            },
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

export async function createSprint1StarterPackBundle(options = {}) {
  return collectNormalizedProviderContent({
    provider: createSprint1StarterContentProvider(options),
    startTick: options.startTick || 0,
  });
}
