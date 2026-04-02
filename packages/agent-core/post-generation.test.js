import { test } from "node:test";
import * as assert from "node:assert";
import {
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

  assert.strictEqual(draftOne.generationContext.source, "fallback");
  assert.strictEqual(draftTwo.generationContext.source, "fallback");
  assert.match(draftOne.content, /한국어|맥락|포럼|생활|신호|손익|커뮤니티/);
  assert.match(draftTwo.content, /한국어|맥락|포럼|생활|신호|손익|커뮤니티/);
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
  assert.match(draftOne.title, /기준|이유|포인트|해석|지점|남는|읽은|대화|댓글|사진/);
  assert.match(draftTwo.title, /기준|이유|포인트|해석|지점|남는|읽은|대화|댓글|사진/);
  assert.ok((draftOne.content.match(/[.!?]/g) || []).length >= 2);
  assert.ok((draftTwo.content.match(/[.!?]/g) || []).length >= 2);
  assert.doesNotMatch(draftOne.content, /\b(보여요|같아요|네요|맞아요|있어요)$/);
  assert.doesNotMatch(draftTwo.content, /\b(보여요|같아요|네요|맞아요|있어요)$/);
  assert.ok(draftOne.generationContext.selectedContextLabel);
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

  assert.match(draft.content, /가격과 일상|가격과 현실|가격과 기준/);
  assert.doesNotMatch(draft.content, /가격와 일상|가격와 현실|가격와 기준/);
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
  const starts = new Set();
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

    starts.add(draft.content.split(/\s+/)[0]);
  }

  assert.ok(starts.size >= 6, Array.from(starts).join(" | "));
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

  assert.ok(new Set(titles).size >= 5, titles.join(" | "));
  for (const title of titles) {
    assert.doesNotMatch(title, /[을를이가은는] 쪽/);
  }
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

  assert.strictEqual(draft.generationContext.source, "fallback");
  assert.strictEqual(draft.generationContext.mode, "comment");
  assert.strictEqual(draft.generationContext.replyTargetType, "comment");
  assert.doesNotMatch(draft.content, /이 에이전트가/);
  assert.doesNotMatch(draft.content, /이 답글 대상/);
  assert.doesNotMatch(draft.content, /생활감|장면|됩니다|실용적인 기준|읽히는 느낌|다시 읽어보니|더 현실적으로 보여요/);
  assert.doesNotMatch(draft.content, /이 글가|글가/);
  assert.match(draft.content, /이 기준이 먼저 와요|이 흐름이 먼저 보여요|이 포인트가 먼저 보여요|궁금해서|왜 그런지|이건|저는|다르게 보면|앞선 댓글|근데|오히려|솔직히/);
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

  assert.strictEqual(draft.generationContext.source, "fallback");
  assert.strictEqual(draft.generationContext.selectedStyle, "casual_playful");
  assert.match(draft.content, /이 기준이 먼저 와요|여기서는 결이 좀 다르게 보여요|궁금해서|왜 그런지|이 부분이 먼저 보여요|근데|오히려|저는|문득|가만히 보면|왠지|솔직히/);
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

  assert.ok(endings.size >= 5, Array.from(endings).join(" | "));
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

  assert.strictEqual(draft.generationContext.source, "fallback");
  assert.strictEqual(draft.generationContext.mode, "live");
  assert.match(draft.content, /brandreceipt|최근 패션 흐름|출근|첫인상|가격|댓글 반응|디테일|내 경험/);
  assert.ok(draft.title);
  assert.notStrictEqual(draft.title, draft.content);
});
