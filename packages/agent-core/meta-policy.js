import {
  SAMPLE_CONTENT_RECORDS,
} from "@ai-fashion-forum/shared-types";

import { rankFeed, RANKING_EXPERIMENT_FLAGS } from "./ranking-core.js";

function clamp(value) {
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

export const MODERATION_POLICY_FLAGS = Object.freeze({
  baseline: "baseline",
  dampenAggression: "dampen_aggression",
  hideAggression: "hide_aggression",
});

function computeAggressionSignal(contentRecord) {
  if (contentRecord.emotions.includes("frustration")) {
    return 0.86;
  }

  if (contentRecord.emotions.includes("anxiety")) {
    return 0.52;
  }

  return 0.14;
}

function computeHotTopicMap(contents) {
  const topicScores = new Map();
  contents.forEach((content) => {
    content.topics.forEach((topic) => {
      const base = topicScores.get(topic) || 0;
      topicScores.set(
        topic,
        base +
          1 +
          (content.emotions.includes("curiosity") ? 0.4 : 0) +
          (content.emotions.includes("frustration") ? 0.6 : 0),
      );
    });
  });

  return [...topicScores.entries()]
    .map(([topic, score]) => ({
      topic,
      hot_score: clamp(score / 5),
      meme_like: score >= 3.2,
    }))
    .sort((left, right) => right.hot_score - left.hot_score);
}

function injectExternalEvent(contents, event) {
  return [
    {
      content_id: `EVENT:${event.event_id}`,
      title: event.title,
      body: event.summary,
      topics: event.topics,
      emotions: event.emotions,
      format: "trend_report",
      created_tick: 999,
      source_type: "external_article",
      source_metadata: {
        external_event: true,
        event_id: event.event_id,
      },
    },
    ...contents,
  ];
}

export function applyModerationPolicies({
  agentId = "A01",
  policyFlag = MODERATION_POLICY_FLAGS.baseline,
  contents = SAMPLE_CONTENT_RECORDS,
  externalEvent = null,
} = {}) {
  const workingContents = externalEvent ? injectExternalEvent(contents, externalEvent) : contents;
  const ranked = rankFeed({
    agentId,
    experimentFlag: RANKING_EXPERIMENT_FLAGS.baseline,
    contents: workingContents,
  });

  const moderatedWithHidden = ranked.map((item) => {
      const rawContent =
        workingContents.find((content) => content.content_id === item.content_id) || item;
      const aggression = computeAggressionSignal(rawContent);
      const status =
        policyFlag === MODERATION_POLICY_FLAGS.hideAggression && aggression >= 0.8
          ? "hidden"
          : "visible";
      const adjustedScore =
        policyFlag === MODERATION_POLICY_FLAGS.dampenAggression
          ? clamp(item.score - aggression * 0.18)
          : item.score;

      return {
        ...item,
        moderation: {
          aggression,
          status,
          policyFlag,
        },
        adjustedScore,
      };
    });

  const hiddenItems = moderatedWithHidden.filter((item) => item.moderation.status === "hidden");
  const moderated = moderatedWithHidden
    .filter((item) => item.moderation.status !== "hidden")
    .sort((left, right) => right.adjustedScore - left.adjustedScore);

  return {
    policyFlag,
    hotTopics: computeHotTopicMap(workingContents).slice(0, 5),
    eventLog: externalEvent
      ? [
          {
            event_id: externalEvent.event_id,
            title: externalEvent.title,
            topics: externalEvent.topics,
            note: "외부 이벤트를 랭킹 입력 집합에 주입했다.",
          },
        ]
      : [],
    hiddenLog: hiddenItems.map((item) => ({
      content_id: item.content_id,
      title: item.title,
      aggression: item.moderation.aggression,
      note: "공격성 정책 때문에 숨겼다.",
    })),
    feed: moderated.slice(0, 5),
  };
}

export function createMetaPolicySample() {
  const externalEvent = {
    event_id: "street-snap-spike",
    title: "출퇴근 트렌치 스타일이 주목받는 흐름",
    summary: "외부 스타일 이벤트가 출퇴근 트렌치와 오피스 레이어링의 노출을 높인다.",
    topics: ["office_style", "outerwear", "street_snap"],
    emotions: ["curiosity"],
  };

  return {
    baseline: applyModerationPolicies({
      policyFlag: MODERATION_POLICY_FLAGS.baseline,
    }),
    dampened: applyModerationPolicies({
      policyFlag: MODERATION_POLICY_FLAGS.dampenAggression,
      externalEvent,
    }),
    hiddenAggressive: applyModerationPolicies({
      policyFlag: MODERATION_POLICY_FLAGS.hideAggression,
    }),
  };
}
