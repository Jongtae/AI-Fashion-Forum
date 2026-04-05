import { test } from "node:test";
import * as assert from "node:assert";
import {
  buildReadablePostTitle,
  createLiveCommentDraft,
  createLivePostDraft,
  createRunPostDraft,
} from "./post-generation.js";

test("createRunPostDraft falls back to Korean draft contexts when OpenAI is unavailable", async () => {
  const draftOne = await createRunPostDraft({
    updatedAgent: {
      handle: "officemirror",
    },
    reactionRecord: {
      meaning_frame: "care_context",
      stance_signal: "empathetic",
      dominant_feeling: "curious",
    },
    contentRecord: {
      title: "quiet office outfit",
      body: "A small look at weekday layering and commute comfort.",
      topics: ["office", "layering"],
    },
    variationSeed: 1,
    apiKey: "",
  });

  const draftTwo = await createRunPostDraft({
    updatedAgent: {
      handle: "officemirror",
    },
    reactionRecord: {
      meaning_frame: "care_context",
      stance_signal: "empathetic",
      dominant_feeling: "curious",
    },
    contentRecord: {
      title: "quiet office outfit",
      body: "A small look at weekday layering and commute comfort.",
      topics: ["office", "layering"],
    },
    variationSeed: 2,
    apiKey: "",
  });

  assert.strictEqual(draftOne.generationContext.source, "community-fallback");
  assert.strictEqual(draftTwo.generationContext.source, "community-fallback");
  assert.match(draftOne.content, /오피스|레이어링|출근|입을 수|코디|손이 가는/);
  assert.match(draftTwo.content, /오피스|레이어링|출근|입을 수|코디|손이 가는/);
  assert.doesNotMatch(draftOne.content, /quiet office outfit/i);
  assert.doesNotMatch(draftTwo.content, /quiet office outfit/i);
  assert.doesNotMatch(draftOne.content, /officemirror/i);
  assert.doesNotMatch(draftTwo.content, /officemirror/i);
  assert.doesNotMatch(draftOne.content, /생활감|장면|됩니다|실용적인 기준|읽히는 느낌|다시 읽어보니|더 현실적으로 보여요/);
  assert.doesNotMatch(draftTwo.content, /생활감|장면|됩니다|실용적인 기준|읽히는 느낌|다시 읽어보니|더 현실적으로 보여요/);
  assert.doesNotMatch(draftOne.content, /이 글가|글가/);
  assert.doesNotMatch(draftTwo.content, /이 글가|글가/);
  assert.notStrictEqual(draftOne.content, draftTwo.content);
  assert.ok(draftOne.title);
  assert.ok(draftTwo.title);
  assert.notStrictEqual(draftOne.title, draftOne.content);
  assert.notStrictEqual(draftTwo.title, draftTwo.content);
  assert.doesNotMatch(draftOne.title, /quiet office outfit/i);
  assert.doesNotMatch(draftTwo.title, /quiet office outfit/i);
  assert.match(draftOne.title, /이거|어떻게 보세요|뭐가 더 나을까|후기|궁금해요|얘기 좀 해요|얘기$|생각|어디가 걸렸어요|어디가 걸려요|다들 어떻게 봐요|반응은 어때요|느낌이 달라요|어디서 갈려요|중 어디가 더 세게 남아요|먼저 보인 이유|추천|괜찮나요|코디|출근룩|뭐가 제일|입어본 분/);
  assert.match(draftTwo.title, /이거|어떻게 보세요|뭐가 더 나을까|후기|궁금해요|얘기 좀 해요|얘기$|생각|어디가 걸렸어요|어디가 걸려요|다들 어떻게 봐요|반응은 어때요|느낌이 달라요|어디서 갈려요|중 어디가 더 세게 남아요|먼저 보인 이유|추천|괜찮나요|코디|출근룩|뭐가 제일|입어본 분/);
  assert.doesNotMatch(draftOne.title, /붙든|체크한|멈춘|메모한|스크롤/);
  assert.doesNotMatch(draftTwo.title, /붙든|체크한|멈춘|메모한|스크롤/);
  assert.ok((draftOne.content.match(/[.!?]/g) || []).length >= 2);
  assert.ok((draftTwo.content.match(/[.!?]/g) || []).length >= 2);
  assert.doesNotMatch(draftOne.content, /\b(보여요|같아요|네요|맞아요|있어요)$/);
  assert.doesNotMatch(draftTwo.content, /\b(보여요|같아요|네요|맞아요|있어요)$/);
  assert.match(draftOne.generationContext.selectedContextLabel, /커뮤니티형/);
});

test("createRunPostDraft preserves question anchors under the quality gate", async () => {
  const draft = await createRunPostDraft({
    updatedAgent: {
      handle: "officemirror",
    },
    reactionRecord: {
      meaning_frame: "care_context",
      stance_signal: "empathetic",
      dominant_feeling: "curious",
    },
    contentRecord: {
      title: "What do you all think?",
      body: "Need advice on a pastel shirt pairing and whether it works for office wear.",
      topics: ["color", "office_style"],
    },
    variationSeed: 3,
    apiKey: "",
    qualityGate: {
      enabled: true,
      minScore: 0.55,
      maxAttempts: 4,
    },
  });

  assert.ok(draft.qualityGate);
  assert.equal(draft.qualityGate.enabled, true);
  assert.equal(draft.qualityGate.met, true);
  assert.ok(draft.qualityScore >= 0.55, String(draft.qualityScore));
  assert.match(draft.title, /색감|셔츠|오피스|추천|괜찮나요|뭐가 제일|중 뭐가 더 나을까/);
  assert.match(draft.content, /색감|셔츠|오피스|추천|조언|입을 수|손이 가는/);
  assert.doesNotMatch(draft.content, /패션과 일상|기준만|포인트만/);
});

test("createRunPostDraft uses world-event pricing hints before generic question framing", async () => {
  const draft = await createRunPostDraft({
    updatedAgent: {
      handle: "dealwatcher",
    },
    reactionRecord: {
      meaning_frame: "value_check",
      stance_signal: "practical",
      dominant_feeling: "curious",
    },
    contentRecord: {
      title: "What do you all think?",
      body: "",
      topics: ["fashion"],
      source_metadata: {
        origin: "world_event_signal",
        event_type: "question_prompt",
        primary_category: "retail",
        agent_hooks: {
          suggestedPostModes: ["react_with_context", "value_check_post", "ask_the_feed_to_choose"],
        },
        anchor_payload: {
          questionAnchors: ["이 가격이면 괜찮은 건가요?"],
          factAnchors: ["무신사 봄 세일 시작"],
          comparisonAnchors: [],
          claimAnchors: [],
          discussionHooks: ["가격 대비 괜찮은지 물어보기"],
        },
      },
    },
    variationSeed: 31,
    apiKey: "",
    qualityGate: {
      enabled: true,
      minScore: 0.55,
      maxAttempts: 4,
    },
  });

  assert.match(draft.title, /가격|세일|가성비|사도 될까요|괜찮나요/);
  assert.match(draft.content, /가격|세일|가성비|후기|추천|사본 분/);
  assert.doesNotMatch(draft.title, /패션 얘기|어디서 갈려요/);
  assert.doesNotMatch(draft.content, /날씨가 슬슬 따뜻해지는데|트위드 vs 가죽|오늘 이렇게 입고 나갔는데/);
});

test("createRunPostDraft preserves fact anchors instead of flattening them", async () => {
  const draft = await createRunPostDraft({
    updatedAgent: {
      handle: "officemirror",
    },
    reactionRecord: {
      meaning_frame: "signal_check",
      stance_signal: "observant",
      dominant_feeling: "curious",
    },
    contentRecord: {
      title: "Sofia Coppola’s ELLE cover looks define effortless style",
      body: "A cover look article with clear fashion and styling details that should stay concrete.",
      topics: ["fashion", "style"],
    },
    variationSeed: 4,
    apiKey: "",
    qualityGate: {
      enabled: true,
      minScore: 0.55,
      maxAttempts: 4,
    },
  });

  assert.ok(draft.qualityGate);
  assert.equal(draft.qualityGate.met, true);
  assert.match(draft.title, /커버|스타일|이거 보셨어요|얘기|반응/);
  assert.match(draft.content, /커버|스타일|반응|저장|댓글|보게 되네요/);
  assert.doesNotMatch(draft.content, /패션과 일상|포인트만/);
});

test("createRunPostDraft uses world-event celebrity hints for event-style posts", async () => {
  const draft = await createRunPostDraft({
    updatedAgent: {
      handle: "coverwatch",
    },
    reactionRecord: {
      meaning_frame: "signal_check",
      stance_signal: "observant",
      dominant_feeling: "curious",
    },
    contentRecord: {
      title: "This cover is everywhere today",
      body: "",
      topics: ["fashion"],
      source_metadata: {
        origin: "world_event_signal",
        event_type: "celebrity_signal",
        primary_category: "celebrity",
        agent_hooks: {
          suggestedPostModes: ["react_with_context", "signal_boost_with_take"],
        },
        anchor_payload: {
          factAnchors: ["소피아 코폴라 ELLE 커버"],
          questionAnchors: [],
          comparisonAnchors: [],
          claimAnchors: ["커버 반응이 빠르게 퍼지는 중"],
          discussionHooks: ["이 커버에서 뭐가 먼저 보였는지 얘기하기"],
          entities: [{ value: "ELLE", type: "uppercase_term" }],
        },
      },
    },
    variationSeed: 35,
    apiKey: "",
    qualityGate: {
      enabled: true,
      minScore: 0.55,
      maxAttempts: 4,
    },
  });

  assert.match(draft.title, /커버|공항패션|드레스코드|보셨어요|반응/);
  assert.match(draft.content, /커버|반응|댓글|보게 되네요|먼저 걸린/);
  assert.doesNotMatch(draft.title, /패션 얘기|어디서 갈려요/);
  assert.doesNotMatch(draft.content, /오늘 이렇게 입고 나갔는데|날씨가 슬슬 따뜻해지는데|트위드 vs 가죽/);
});

test("createRunPostDraft preserves comparison anchors instead of flattening them", async () => {
  const draft = await createRunPostDraft({
    updatedAgent: {
      handle: "officemirror",
    },
    reactionRecord: {
      meaning_frame: "comparison_frame",
      stance_signal: "observant",
      dominant_feeling: "curious",
    },
    contentRecord: {
      title: "Which is better for office wear, pastel aqua or cream?",
      body: "I am comparing the two because the office setting makes the fit and color read differently.",
      topics: ["color", "office_style"],
    },
    variationSeed: 6,
    apiKey: "",
    qualityGate: {
      enabled: true,
      minScore: 0.55,
      maxAttempts: 4,
    },
  });

  assert.ok(draft.qualityGate);
  assert.equal(draft.qualityGate.met, true);
  assert.match(draft.title, /비교|둘 중|어느 쪽|더 나을까|고르세요/);
  assert.match(draft.content, /비교|둘 중|오피스|크림|파스텔|고르셨는지|손이 더 자주/);
  assert.doesNotMatch(draft.content, /패션과 일상|포인트만/);
});

test("createRunPostDraft avoids stacked question hooks in fallback titles", async () => {
  const draft = await createRunPostDraft({
    updatedAgent: {
      handle: "signalwatch",
    },
    reactionRecord: {
      meaning_frame: "comparison_frame",
      stance_signal: "observant",
      dominant_feeling: "curious",
    },
    contentRecord: {
      title: "Which is better for office wear, pastel aqua or cream?",
      body: "People are split between pastel aqua and cream for office looks.",
      topics: ["color", "office_style"],
    },
    variationSeed: 14,
    apiKey: "",
  });

  assert.doesNotMatch(draft.title, /\?.*(뭐가 제일 나아요|이거 괜찮나요|다들 어느 쪽 고르세요|후기 있으세요)/);
  assert.doesNotMatch(draft.title, /(중 뭐가 더 나을까).*(중 뭐가 더 나을까|다들 어느 쪽 고르세요)/);
});

test("createRunPostDraft prefers concrete anchors over broad fashion hooks in community titles", async () => {
  const draft = await createRunPostDraft({
    updatedAgent: {
      handle: "salewatch",
    },
    reactionRecord: {
      meaning_frame: "value_check",
      stance_signal: "practical",
      dominant_feeling: "curious",
    },
    contentRecord: {
      title: "Musinsa spring sale starts now",
      body: "Sale coverage focuses on Crocs and Polo Ralph Lauren ranking movement.",
      topics: ["fashion", "pricing"],
      source_metadata: {
        origin: "world_event_signal",
        event_type: "question_prompt",
        primary_category: "retail",
        agent_hooks: {
          suggestedPostModes: ["value_check_post"],
        },
        anchor_payload: {
          factAnchors: ["무신사 봄 세일"],
          questionAnchors: ["지금 사도 될까요?"],
          comparisonAnchors: [],
          claimAnchors: ["크록스랑 폴로 랭킹이 같이 움직이는 중"],
          discussionHooks: ["세일 가격이 진짜 괜찮은지 물어보기"],
        },
      },
    },
    variationSeed: 22,
    apiKey: "",
  });

  assert.match(draft.title, /무신사|세일|크록스|폴로|가격/);
  assert.doesNotMatch(draft.title, /^패션( |$)/);
  assert.doesNotMatch(draft.title, /패션 얘기|패션 쪽 후기/);
});

test("createRunPostDraft preserves concrete Korean reason anchors instead of flattening them", async () => {
  const draft = await createRunPostDraft({
    updatedAgent: {
      handle: "officemirror",
    },
    reactionRecord: {
      meaning_frame: "practicality_filter",
      stance_signal: "practical",
      dominant_feeling: "curious",
    },
    contentRecord: {
      title: "자주 입는 출근룩이 새 신상보다 더 오래 남는 이유",
      body: "출근 전 반복해서 손이 가는 옷이 결국 남는다는 관찰.",
      topics: ["office_style", "utility"],
    },
    variationSeed: 9,
    apiKey: "",
    qualityGate: {
      enabled: true,
      minScore: 0.55,
      maxAttempts: 4,
    },
  });

  assert.ok(draft.qualityGate);
  assert.equal(draft.qualityGate.met, true);
  assert.match(draft.title, /출근룩|신상|후기|이거 괜찮나요|출근룩으로 어때요|오피스 스타일|입어본 분/);
  assert.match(draft.content, /출근룩|신상|출근|손이 가는|입을 수|궁금해요/);
  assert.doesNotMatch(draft.content, /패션과 일상|포인트만/);
});

test("createRunPostDraft tracks novelty against recent drafts", async () => {
  const draft = await createRunPostDraft({
    updatedAgent: {
      handle: "officemirror",
    },
    reactionRecord: {
      meaning_frame: "comparison_frame",
      stance_signal: "observant",
      dominant_feeling: "curious",
    },
    contentRecord: {
      title: "Which is better for office wear, pastel aqua or cream?",
      body: "I am comparing the two because the office setting makes the colors read differently.",
      topics: ["color", "office_style"],
    },
    comparisonTexts: [
      "파스텔 아쿠아와 셔츠 중 뭐가 더 나을까 색감엔 뭐가 잘 맞을까는 먼저 궁금해져요.",
      "색감과 일상 비교에서 갈리는 지점 비교해보면 색감과 일상을 같이 보면 어느 쪽이 더 나은지 바로 보여요.",
    ],
    comparisonTitles: [
      "파스텔 아쿠아와 셔츠 중 뭐가 더 나을까",
      "색감과 일상 비교에서 갈리는 지점",
    ],
    variationSeed: 11,
    apiKey: "",
    qualityGate: {
      enabled: true,
      minScore: 0.55,
      maxAttempts: 4,
    },
  });

  assert.ok(draft.novelty);
  assert.equal(draft.qualityGate.enabled, true);
  assert.ok(typeof draft.novelty.maxCombinedSimilarity === "number");
  assert.ok(typeof draft.novelty.noveltyScore === "number");
  assert.ok(draft.novelty.noveltyScore < 1, JSON.stringify(draft.novelty));
});

test("createRunPostDraft penalizes overused run-level title and opener frames", async () => {
  const baseInput = {
    updatedAgent: {
      handle: "officemirror",
    },
    reactionRecord: {
      meaning_frame: "comparison_frame",
      stance_signal: "observant",
      dominant_feeling: "curious",
    },
    contentRecord: {
      title: "Which is better for office wear, pastel aqua or cream?",
      body: "I am comparing the two because the office setting makes the colors read differently.",
      topics: ["color", "office_style"],
    },
    comparisonTexts: [],
    comparisonTitles: [],
    variationSeed: 11,
    apiKey: "",
    qualityGate: {
      enabled: true,
      minScore: 0.55,
      maxAttempts: 2,
    },
  };
  const firstDraft = await createRunPostDraft(baseInput);
  const firstLead = (firstDraft.content || "").split(/[.!?。！？\n]/)[0]?.trim()?.replace(/\s+/g, " ");
  const draft = await createRunPostDraft({
    ...baseInput,
    populationSignals: {
      titleCounts: new Map([[firstDraft.title.trim().replace(/\s+/g, " "), 4]]),
      leadCounts: new Map(firstLead ? [[firstLead, 3]] : []),
      frameCounts: new Map([[`${firstDraft.generationContext?.sourceIntent}:${firstDraft.generationContext?.selectedContextLabel}`, 7]]),
    },
  });

  assert.ok(draft.novelty.titleCount >= 0);
  assert.ok(draft.novelty.leadCount >= 0);
  assert.ok(draft.novelty.frameCount >= 0);
  assert.ok(draft.novelty.repetitionPenalty > 0, JSON.stringify(draft.novelty));
  assert.ok(
    draft.novelty.titleFrequencyPenalty > 0 || draft.novelty.leadFrequencyPenalty > 0,
    JSON.stringify(draft.novelty),
  );
});

test("createRunPostDraft joins korean topic labels naturally", async () => {
  const draft = await createRunPostDraft({
    updatedAgent: {
      handle: "officemirror",
    },
    reactionRecord: {
      meaning_frame: "care_context",
      stance_signal: "empathetic",
      dominant_feeling: "curious",
    },
    contentRecord: {
      title: "quiet office outfit",
      body: "A small look at weekday layering and commute comfort.",
      topics: ["pricing", "care_context"],
    },
    variationSeed: 1,
    apiKey: "",
  });

  assert.match(draft.content, /가격표|레이어링과 오피스|오피스와 레이어링|가격과|오피스와 착장/);
  assert.doesNotMatch(draft.content, /가격와 일상|가격와 현실|가격와 기준|오피스와 착장와|오피스와 레이어링와|와 utility/);
});

test("createRunPostDraft avoids repetitive agreement openers", async () => {
  const draft = await createRunPostDraft({
    updatedAgent: {
      handle: "officemirror",
    },
    reactionRecord: {
      meaning_frame: "care_context",
      stance_signal: "empathetic",
      dominant_feeling: "curious",
    },
    contentRecord: {
      title: "quiet office outfit",
      body: "A small look at weekday layering and commute comfort.",
      topics: ["pricing", "care_context"],
    },
    variationSeed: 0,
    apiKey: "",
    styleProfile: {
      openers: ["맞아요", "근데", "저는"],
    },
  });

  assert.doesNotMatch(draft.content, /^맞아요\b/);
  assert.match(draft.content, /궁금해요|궁금합니다|보셨는지도|읽으셨는지|있나요|왜 이렇게 보이는지|이 부분이 먼저 보여요/);
});

test("createRunPostDraft avoids comma after short colloquial openers", async () => {
  const shortOpeners = ["저는", "근데", "솔직히", "궁금해서", "개인적으로", "오히려"];
  for (let seed = 0; seed < 6; seed += 1) {
    const draft = await createRunPostDraft({
      updatedAgent: {
        handle: "officemirror",
      },
      reactionRecord: {
        meaning_frame: "care_context",
        stance_signal: "empathetic",
        dominant_feeling: "curious",
      },
      contentRecord: {
        title: "quiet office outfit",
        body: "A small look at weekday layering and commute comfort.",
        topics: ["pricing", "care_context"],
      },
      variationSeed: seed,
      apiKey: "",
    });

    for (const opener of shortOpeners) {
      assert.doesNotMatch(draft.content, new RegExp(`^${opener},`));
    }
  }
});

test("createRunPostDraft spreads short opener starts across seeds", async () => {
  const openings = new Set();
  for (let seed = 0; seed < 12; seed += 1) {
    const draft = await createRunPostDraft({
      updatedAgent: {
        handle: "officemirror",
      },
      reactionRecord: {
        meaning_frame: "care_context",
        stance_signal: "empathetic",
        dominant_feeling: "curious",
      },
      contentRecord: {
        title: "quiet office outfit",
        body: "A small look at weekday layering and commute comfort.",
        topics: ["pricing", "care_context"],
      },
      variationSeed: seed,
      apiKey: "",
    });

    openings.add(draft.content.split(/(?<=[.!?…。])\s+/)[0]);
  }

  assert.ok(openings.size >= 3, Array.from(openings).join(" | "));
});

test("createRunPostDraft avoids first-person dominance in post openings", async () => {
  for (let seed = 0; seed < 12; seed += 1) {
    const draft = await createRunPostDraft({
      updatedAgent: {
        handle: "officemirror",
      },
      reactionRecord: {
        meaning_frame: "care_context",
        stance_signal: "empathetic",
        dominant_feeling: "curious",
      },
      contentRecord: {
        title: "quiet office outfit",
        body: "A small look at weekday layering and commute comfort.",
        topics: ["pricing", "care_context"],
      },
      variationSeed: seed,
      apiKey: "",
    });

    assert.doesNotMatch(draft.content, /^저는\b/);
  }
});

test("createRunPostDraft avoids broken joint topic grammar in titles", async () => {
  for (let seed = 0; seed < 12; seed += 1) {
    const draft = await createRunPostDraft({
      updatedAgent: {
        handle: "officemirror",
      },
      reactionRecord: {
        meaning_frame: "care_context",
        stance_signal: "empathetic",
        dominant_feeling: "curious",
      },
      contentRecord: {
        title: "quiet office outfit",
        body: "A small look at weekday layering and commute comfort.",
        topics: ["pricing", "care_context"],
      },
      variationSeed: seed,
      apiKey: "",
    });

    assert.doesNotMatch(draft.title, /[가-힣]를 같이 본/);
    assert.doesNotMatch(draft.title, /[가-힣]를과/);
    assert.doesNotMatch(draft.title, /(은|는)부터|(은|는)까지/);
  }
});

test("createRunPostDraft produces varied titles across seeds", async () => {
  const titles = [];
  for (let seed = 0; seed < 6; seed += 1) {
    const draft = await createRunPostDraft({
      updatedAgent: {
        handle: "officemirror",
      },
      reactionRecord: {
        meaning_frame: "care_context",
        stance_signal: "empathetic",
        dominant_feeling: "curious",
      },
      contentRecord: {
        title: "quiet office outfit",
        body: "A small look at weekday layering and commute comfort.",
        topics: ["pricing", "care_context"],
      },
      variationSeed: seed,
      apiKey: "",
    });
    titles.push(draft.title);
  }

  assert.ok(new Set(titles).size >= 4, titles.join(" | "));
  for (const title of titles) {
    assert.doesNotMatch(title, /[을를이가은는] 쪽/);
    assert.doesNotMatch(title, /다들 이런 글 좋아하세요|보고 든 생각.*보고 든 생각|어떠세요를|걸려요를/);
  }
});

test("buildReadablePostTitle avoids broad malformed topic-only hooks", () => {
  const title = buildReadablePostTitle({
    mode: "run",
    sourceTitle: "♬ Forest of Eternal Return: https://example.com",
    sourceTopics: ["fashion", "office_style"],
    sourceIntent: "observation",
    selectedContextLabel: "출근 전",
    variationSeed: 7,
    sourceAnchorTerms: [
      "패션과 오피스 스타일 보고 어디가 걸렸어요",
      "패션과 오피스 스타일 쪽을 어떻게 읽을지부터 남아요",
      "패션과 오피스 스타일 관련 얘기예요",
      "패션과 오피스 스타일",
      "패션과 오피스 스타일 기준은 사람마다 다를 것 같아요",
      "패션",
      "오피스 스타일",
    ],
  });

  assert.doesNotMatch(title, /관련 글|관련 신호|기준은 사람마다 다를 것 같아요|얘기는 보는 포인트가 갈릴 수 있어요/);
  assert.doesNotMatch(title, /어때요를|보세요를|걸려요를|([가-힣]+)(은 어|와 [가-힣]+은 어)/);
  assert.doesNotMatch(title, /^패션과 오피스 스타일(?:을 어떻게 보세요| 얘기 요즘 어디서 갈려요| 같이 보면 뭐가 먼저 보여요| 보고 어디가 걸렸어요)?$/);
});

test("buildReadablePostTitle prefers concrete source anchors over broad topic hooks", () => {
  const titles = [];
  for (let seed = 0; seed < 6; seed += 1) {
    titles.push(buildReadablePostTitle({
      mode: "run",
      sourceTitle: "What pair with a pastel aqua green shirt?",
      sourceTopics: ["color", "tops"],
      sourceIntent: "question",
      variationSeed: seed,
      sourceAnchorTerms: ["파스텔 아쿠아 셔츠", "크림 팬츠", "색감 조합"],
    }));
  }

  assert.ok(titles.some((title) => /파스텔 아쿠아 셔츠|크림 팬츠/.test(title)), titles.join(" | "));
  for (const title of titles) {
    assert.doesNotMatch(title, /^일상/);
    assert.doesNotMatch(title, /(은|는)부터|(은|는)까지/);
    assert.doesNotMatch(title, /셔츠은|팬츠은/);
  }
});

test("createRunPostDraft avoids collapsing most titles into abstract framing", async () => {
  const titles = [];
  for (let seed = 0; seed < 12; seed += 1) {
    const draft = await createRunPostDraft({
      updatedAgent: {
        handle: "officemirror",
      },
      reactionRecord: {
        meaning_frame: "care_context",
        stance_signal: "empathetic",
        dominant_feeling: "curious",
      },
      contentRecord: {
        title: "quiet office outfit",
        body: "A small look at weekday layering and commute comfort.",
        topics: ["pricing", "care_context"],
      },
      variationSeed: seed,
      apiKey: "",
    });
    titles.push(draft.title);
  }

  const abstractHeavyTitles = titles.filter((title) => /일상|기준|이유|포인트/.test(title));
  assert.ok(abstractHeavyTitles.length <= 6, titles.join(" | "));
  assert.ok(titles.some((title) => /가격|레이어링|장바구니|출근길|소매|옷장|결제|후기|어떻게 보세요|궁금해요|생각/.test(title)), titles.join(" | "));
  assert.ok(!titles.some((title) => /붙든|체크한|멈춘|메모한|스크롤/.test(title)), titles.join(" | "));
});

test("createRunPostDraft carries emotion profile into generation context", async () => {
  const draft = await createRunPostDraft({
    updatedAgent: {
      handle: "officemirror",
      seed_profile: {
        emotional_bias: {
          curiosity: 0.84,
          empathy: 0.22,
          sadness: 0.12,
        },
        emotion_signature: {
          dominantEmotion: "curiosity",
          secondaryEmotion: "empathy",
        },
      },
      mutable_state: {
        affect_state: {
          emotional_bias: {
            curiosity: 0.76,
            empathy: 0.28,
          },
          emotion_signature: {
            dominantEmotion: "curiosity",
            secondaryEmotion: "empathy",
          },
        },
      },
    },
    reactionRecord: {
      meaning_frame: "care_context",
      stance_signal: "empathetic",
      dominant_feeling: "curious",
    },
    contentRecord: {
      title: "quiet office outfit",
      body: "A small look at weekday layering and commute comfort.",
      topics: ["office", "layering"],
      emotions: ["궁금"],
    },
    variationSeed: 4,
    apiKey: "",
    emotionProfile: {
      dominantEmotion: "curiosity",
      secondaryEmotion: "empathy",
    },
  });

  assert.strictEqual(draft.generationContext.dominantEmotion, "curiosity");
  assert.strictEqual(draft.generationContext.secondaryEmotion, "empathy");
  assert.ok(draft.content.length > 30);
  assert.ok((draft.content.match(/[.!?]/g) || []).length >= 2);
  assert.match(draft.content, /궁금|마음|의외|답답|안심|기대|웃음|아쉬움/);
  assert.match(draft.content, /오피스|레이어링|출퇴근|셔츠|가격|핏/);
});

test("createLiveCommentDraft ties emotion to a concrete anchor", async () => {
  const draft = await createLiveCommentDraft({
    agent: {
      handle: "brandreceipt",
      seed_profile: {
        emotional_bias: {
          empathy: 0.88,
          curiosity: 0.24,
        },
        emotion_signature: {
          dominantEmotion: "empathy",
          secondaryEmotion: "curiosity",
        },
      },
      mutable_state: {
        affect_state: {
          emotional_bias: {
            empathy: 0.76,
          },
          emotion_signature: {
            dominantEmotion: "empathy",
            secondaryEmotion: "curiosity",
          },
        },
      },
    },
    targetContent: {
      title: "quiet office outfit",
      body: "A short live signal summary about office layering and shirt balance.",
      topics: ["office_style", "layering"],
      emotions: ["공감"],
    },
    targetComment: {
      content: "셔츠 핏이 생각보다 더 중요해 보여요.",
      emotions: ["공감"],
    },
    sourceSignal: "comment reply / tick 9",
    variationSeed: 4,
    apiKey: "",
  });

  assert.match(draft.content, /마음|공감|신경 쓰|괜찮|비슷하게 느꼈어요/);
  assert.match(draft.content, /오피스|레이어링|셔츠|핏/);
});

test("createRunPostDraft threads recent memories into generation context", async () => {
  const draft = await createRunPostDraft({
    updatedAgent: {
      handle: "officemirror",
      recentMemories: [
        {
          summary: "읽은 글에서 가격보다 핏을 먼저 보게 됐다.",
        },
      ],
      self_narrative: [
        "가격보다 핏을 먼저 보는 편으로 조금 더 기울었다.",
      ],
    },
    reactionRecord: {
      meaning_frame: "care_context",
      stance_signal: "empathetic",
      dominant_feeling: "curious",
    },
    contentRecord: {
      title: "quiet office outfit",
      body: "A small look at weekday layering and commute comfort.",
      topics: ["office", "layering"],
      emotions: ["궁금"],
    },
    variationSeed: 8,
    apiKey: "",
  });

  assert.match(draft.generationContext.recentMemorySummary, /가격보다 핏/);
  assert.match(draft.generationContext.selfNarrativeSummary, /가격보다 핏/);
  assert.match(draft.generationContext.memoryReferenceCue, /가격보다 핏|quiet office outfit|오피스/);
  assert.match(draft.generationContext.changeSummary, /가격보다 핏|기울었다/);
  assert.match(draft.content, /전에|읽은 뒤|기준이|다시|먼저/);
});

test("createRunPostDraft filters system-style memory text from generation context", async () => {
  const draft = await createRunPostDraft({
    updatedAgent: {
      handle: "officemirror",
      recentMemories: [
        { summary: "0틱: 눈에 보이는 글을 남겼다." },
        { summary: "오피스 셔츠 글을 읽은 뒤 핏을 먼저 보게 됐다." },
      ],
      self_narrative: [
        "이번 신호가 붙는 순간 기준이 보였다.",
        "셔츠 핏을 보고 나서 보는 기준이 달라졌다.",
      ],
    },
    reactionRecord: {
      meaning_frame: "care_context",
      stance_signal: "empathetic",
      dominant_feeling: "curious",
    },
    contentRecord: {
      title: "quiet office outfit",
      body: "A small look at weekday layering and commute comfort.",
      topics: ["office", "layering"],
    },
    variationSeed: 6,
    apiKey: "",
  });

  assert.doesNotMatch(draft.generationContext.recentMemorySummary || "", /0틱|이번 신호/);
  assert.doesNotMatch(draft.generationContext.selfNarrativeSummary || "", /0틱|이번 신호/);
  assert.match(draft.generationContext.recentMemorySummary || "", /핏을 먼저/);
});

test("createRunPostDraft makes feedback loop visible in later copy", async () => {
  const draft = await createRunPostDraft({
    updatedAgent: {
      handle: "officemirror",
      recentMemories: [
        {
          summary: "읽은 글 “office shirt pairing” 뒤로 가격보다 핏을 먼저 보게 됐다.",
          details: {
            title: "office shirt pairing",
            topics: ["office_style", "fit"],
            reason_clause: "가격보다 핏을 먼저 보게 됐다",
          },
        },
      ],
      self_narrative: [
        "나는 “office shirt pairing”을 읽은 뒤 가격보다 핏을 먼저 보는 편으로 조금 더 기울었다.",
      ],
    },
    reactionRecord: {
      meaning_frame: "tradeoff_filter",
      stance_signal: "observant",
      dominant_feeling: "curious",
    },
    contentRecord: {
      title: "quiet office outfit",
      body: "A small look at weekday layering and commute comfort.",
      topics: ["office", "layering"],
    },
    variationSeed: 5,
    apiKey: "",
  });

  assert.match(draft.content, /전에|읽은 뒤/);
  assert.match(draft.content, /가격보다 핏|office shirt pairing|오피스|핏/);
});

test("createRunPostDraft surfaces context-specific concrete body details", async () => {
  const outputs = [];
  for (let seed = 0; seed < 12; seed += 1) {
    const draft = await createRunPostDraft({
      updatedAgent: {
        handle: "officemirror",
      },
      reactionRecord: {
        meaning_frame: "care_context",
        stance_signal: "empathetic",
        dominant_feeling: "curious",
      },
      contentRecord: {
        title: "quiet office outfit",
        body: "A small look at weekday layering and commute comfort.",
        topics: ["pricing", "care_context"],
      },
      variationSeed: seed,
      apiKey: "",
    });
    outputs.push(draft.content);
  }

  const joined = outputs.join(" ");
  assert.match(joined, /세탁 주기|가격표|댓글|소매 끝|길이|옷장|장바구니/);
});

test("createRunPostDraft uses OpenAI contexts and selects by seed", async () => {
  const localApiKey = "local-test-key";
  let requestBody = null;
  const fetchImpl = async (_url, options = {}) => {
    requestBody = options.body ? JSON.parse(options.body) : null;
    return {
      ok: true,
      json: async () => ({
        id: "resp_123",
        output_text: JSON.stringify({
          contexts: [
            {
              context_id: "ctx-a",
              context_label: "출근 전",
              angle: "일상 기준",
              content: "오피스 흐름을 생활 기준으로 다시 읽은 한국어 글입니다.",
              tone: "차분한",
            },
            {
              context_id: "ctx-b",
              context_label: "첫인상",
              angle: "새 신호",
              content: "새 신호를 중심으로 정리한 한국어 글입니다.",
              tone: "관찰적인",
            },
            {
              context_id: "ctx-c",
              context_label: "가격 체크",
              angle: "손익 기준",
              content: "손익을 따지는 한국어 글입니다.",
              tone: "신중한",
            },
            {
              context_id: "ctx-d",
              context_label: "댓글 반응",
              angle: "대화 흐름",
              content: "대화형 톤의 한국어 글입니다.",
              tone: "대화형",
            },
          ],
        }),
      }),
      text: async () => "",
    };
  };

  const draft = await createRunPostDraft({
    updatedAgent: {
      handle: "officemirror",
    },
    reactionRecord: {
      meaning_frame: "care_context",
      stance_signal: "empathetic",
      dominant_feeling: "curious",
    },
    contentRecord: {
      title: "quiet office outfit",
      body: "A small look at weekday layering and commute comfort.",
      topics: ["office", "layering"],
    },
    variationSeed: 3,
    provider: "openai",
    apiKey: localApiKey,
    fetchImpl,
  });

  assert.strictEqual(draft.generationContext.source, "openai");
  assert.strictEqual(draft.generationContext.contextPoolSize, 4);
  assert.strictEqual(draft.generationContext.selectedContextLabel, "댓글 반응");
  assert.match(draft.content, /대화형 톤의 한국어 글입니다/);
  assert.ok(draft.title);
  assert.notStrictEqual(draft.title, draft.content);
  assert.doesNotMatch(draft.title, /quiet office outfit/i);
  assert.strictEqual(requestBody?.model, "gpt-4o");
});

test("createRunPostDraft avoids overly similar contexts when comparison texts are provided", async () => {
  const localApiKey = "local-test-key";
  const fetchImpl = async (_url, options = {}) => ({
    ok: true,
    json: async () => ({
      id: "resp_456",
      output_text: JSON.stringify({
        contexts: [
          {
            context_id: "ctx-a",
            context_label: "생활 리듬",
            angle: "일상 기준",
            content: "오피스 흐름을 생활 기준으로 다시 읽은 한국어 글입니다.",
            tone: "차분한",
          },
          {
            context_id: "ctx-b",
            context_label: "신호 읽기",
            angle: "새 신호",
            content: "새 신호를 중심으로 정리한 한국어 글입니다.",
            tone: "관찰적인",
          },
          {
            context_id: "ctx-c",
            context_label: "손익 점검",
            angle: "손익 기준",
            content: "손익을 따지는 한국어 글입니다.",
            tone: "신중한",
          },
          {
            context_id: "ctx-d",
            context_label: "커뮤니티 반응",
            angle: "대화 흐름",
            content: "대화형 톤의 한국어 글입니다.",
            tone: "대화형",
          },
        ],
      }),
    }),
    text: async () => "",
  });

  const draft = await createRunPostDraft({
    updatedAgent: {
      handle: "officemirror",
    },
    reactionRecord: {
      meaning_frame: "care_context",
      stance_signal: "empathetic",
      dominant_feeling: "curious",
    },
    contentRecord: {
      title: "quiet office outfit",
      body: "A small look at weekday layering and commute comfort.",
      topics: ["office", "layering"],
    },
    comparisonTexts: ["대화형 톤의 한국어 글입니다."],
    variationSeed: 3,
    provider: "openai",
    apiKey: localApiKey,
    fetchImpl,
  });

  assert.strictEqual(draft.generationContext.source, "openai");
  assert.notStrictEqual(draft.generationContext.selectedContextLabel, "댓글 반응");
  assert.doesNotMatch(draft.content, /대화형 톤의 한국어 글입니다/);
  assert.ok(draft.title);
  assert.notStrictEqual(draft.title, draft.content);
});

test("createLiveCommentDraft uses local OpenAI mock contexts and targets comments", async () => {
  const localApiKey = "local-test-key";
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({
      id: "resp_comment_123",
      output_text: JSON.stringify({
        contexts: [
          {
            context_id: "comment-a",
            context_label: "대화 이어가기",
            angle: "흐름을 잇는 반응",
            content: "대화를 이어가는 한국어 댓글입니다.",
            tone: "대화형",
          },
          {
            context_id: "comment-b",
            context_label: "질문",
            angle: "한 번 더 묻는 반응",
            content: "질문을 남기는 한국어 댓글입니다.",
            tone: "호기심 있는",
          },
          {
            context_id: "comment-c",
            context_label: "보완",
            angle: "조심스럽게 다른 시각을 보태는 반응",
            content: "보완 의견을 남기는 한국어 댓글입니다.",
            tone: "조심스러운",
          },
          {
            context_id: "comment-d",
            context_label: "스레드",
            angle: "댓글과 본문을 다시 묶는 반응",
            content: "스레드를 다시 묶는 한국어 댓글입니다.",
            tone: "관찰적인",
          },
        ],
      }),
    }),
  });

  const draft = await createLiveCommentDraft({
    agent: {
      handle: "brandreceipt",
    },
    targetContent: {
      title: "quiet office outfit",
      body: "A short live signal summary.",
      topics: ["office", "layering"],
    },
    targetComment: {
      content: "I think the sleeve balance is the real story here.",
    },
    sourceSignal: "comment reply / tick 9",
    variationSeed: 1,
    provider: "openai",
    apiKey: localApiKey,
    fetchImpl,
  });

  assert.strictEqual(draft.generationContext.source, "openai");
  assert.strictEqual(draft.generationContext.mode, "comment");
  assert.strictEqual(draft.generationContext.replyTargetType, "comment");
  assert.strictEqual(draft.generationContext.selectedContextLabel, "질문");
  assert.match(draft.content, /질문을 남기는 한국어 댓글입니다/);
});

test("createLiveCommentDraft falls back to conversational Korean reply contexts", async () => {
  const draft = await createLiveCommentDraft({
    agent: {
      handle: "brandreceipt",
    },
    targetContent: {
      title: "quiet office outfit",
      body: "A short live signal summary.",
      topics: ["office", "layering"],
    },
    targetComment: {
      content: "I think the sleeve balance is the real story here.",
    },
    sourceSignal: "comment reply / tick 9",
    variationSeed: 0,
    apiKey: "",
  });

  assert.strictEqual(draft.generationContext.source, "community-fallback");
  assert.strictEqual(draft.generationContext.mode, "comment");
  assert.strictEqual(draft.generationContext.replyTargetType, "comment");
  assert.doesNotMatch(draft.content, /이 에이전트가/);
  assert.doesNotMatch(draft.content, /이 답글 대상/);
  assert.doesNotMatch(draft.content, /생활감|장면|됩니다|실용적인 기준|읽히는 느낌|다시 읽어보니|더 현실적으로 보여요/);
  assert.doesNotMatch(draft.content, /이 글가|글가/);
  assert.match(
    draft.content,
    /비슷하게 느꼈어요|하나 더 묻게 돼요|다르게 보였어요|공감|궁금해요|오피스|레이어링|먼저 눈에 들어왔어요|판단이 좀 달라져요/
  );
});

test("createLiveCommentDraft uses comment style seed markers when provided", async () => {
  const draft = await createLiveCommentDraft({
    agent: {
      handle: "brandreceipt",
    },
    targetContent: {
      title: "quiet office outfit",
      body: "A short live signal summary.",
      topics: ["office", "layering"],
    },
    targetComment: {
      content: "I think the sleeve balance is the real story here.",
    },
    sourceSignal: "comment reply / tick 9",
    styleProfile: {
      register: "casual_playful",
      cadence: "short_reply",
      openerMarkers: ["근데", "오히려"],
      endingMarkers: ["같아요", "ㅎㅎ"],
      sampleComments: ["근데 이건 좀 다른 얘기 같아요 ㅎㅎ"],
    },
    variationSeed: 2,
    apiKey: "",
  });

  assert.strictEqual(draft.generationContext.source, "community-fallback");
  assert.strictEqual(draft.generationContext.selectedStyle, "casual_playful");
  assert.match(draft.content, /근데|오히려|궁금해요|공감|다르게 보였어요|먼저 눈에 들어왔어요|비슷하게 느꼈어요/);
  assert.match(draft.content, /같아요|ㅎㅎ|더라고요|보여요|네요/);
  assert.doesNotMatch(draft.content, /생활감|장면|됩니다|실용적인 기준|읽히는 느낌|다시 읽어보니|더 현실적으로 보여요|이 글가|글가/);
});

test("createLiveCommentDraft spreads reply endings across seeds", async () => {
  const endings = new Set();
  for (let seed = 0; seed < 8; seed += 1) {
    const draft = await createLiveCommentDraft({
      agent: {
        handle: "brandreceipt",
      },
      targetContent: {
        title: "quiet office outfit",
        body: "A short live signal summary.",
        topics: ["office", "layering"],
      },
      targetComment: {
        content: "I think the sleeve balance is the real story here.",
      },
      sourceSignal: "comment reply / tick 9",
      variationSeed: seed,
      apiKey: "",
    });

    const sentences = draft.content.split(/(?<=[.!?…。])\s+/).map((part) => part.trim()).filter(Boolean);
    endings.add(sentences.at(-1));
  }

  assert.ok(endings.size >= 3, Array.from(endings).join(" | "));
});

test("createLivePostDraft falls back to Korean live contexts", async () => {
  const draft = await createLivePostDraft({
    agent: {
      handle: "brandreceipt",
    },
    targetContent: {
      title: "최근 패션 흐름",
      body: "A short live signal summary.",
      topics: ["스타일", "가격"],
    },
    sourceSignal: "tick 5 / post action",
    variationSeed: 0,
    apiKey: "",
  });

  assert.strictEqual(draft.generationContext.source, "community-fallback");
  assert.strictEqual(draft.generationContext.mode, "live");
  assert.match(draft.content, /가격|사본 분|가성비|세일|궁금해요|손이 가는/);
  assert.ok(draft.title);
  assert.notStrictEqual(draft.title, draft.content);
});

test("createRunPostDraft spreads closing lines across seeds", async () => {
  const endings = new Set();
  for (let seed = 0; seed < 8; seed += 1) {
    const draft = await createRunPostDraft({
      updatedAgent: {
        handle: "officemirror",
      },
      reactionRecord: {
        meaning_frame: "care_context",
        stance_signal: "empathetic",
        dominant_feeling: "curious",
      },
      contentRecord: {
        title: "quiet office outfit",
        body: "A small look at weekday layering and commute comfort.",
        topics: ["pricing", "care_context"],
      },
      variationSeed: seed,
      apiKey: "",
    });

    const sentences = draft.content.split(/(?<=[.!?…。])\s+/).map((part) => part.trim()).filter(Boolean);
    endings.add(sentences.at(-1));
  }

  assert.ok(endings.size >= 3, Array.from(endings).join(" | "));
});
