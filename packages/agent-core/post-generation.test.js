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
  assert.notStrictEqual(draftOne.content, draftTwo.content);
  assert.ok(draftOne.generationContext.selectedContextLabel);
});

test("createRunPostDraft uses OpenAI contexts and selects by seed", async () => {
  const localApiKey = "local-test-key";
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({
      id: "resp_123",
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
    variationSeed: 3,
    apiKey: localApiKey,
    fetchImpl,
  });

  assert.strictEqual(draft.generationContext.source, "openai");
  assert.strictEqual(draft.generationContext.contextPoolSize, 4);
  assert.strictEqual(draft.generationContext.selectedContextLabel, "커뮤니티 반응");
  assert.match(draft.content, /대화형 톤의 한국어 글입니다/);
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
            context_label: "답장 이어가기",
            angle: "흐름을 잇는 반응",
            content: "대화를 이어가는 한국어 댓글입니다.",
            tone: "대화형",
          },
          {
            context_id: "comment-b",
            context_label: "질문 던지기",
            angle: "한 번 더 묻는 반응",
            content: "질문을 남기는 한국어 댓글입니다.",
            tone: "호기심 있는",
          },
          {
            context_id: "comment-c",
            context_label: "보완 의견",
            angle: "조심스럽게 다른 시각을 보태는 반응",
            content: "보완 의견을 남기는 한국어 댓글입니다.",
            tone: "조심스러운",
          },
          {
            context_id: "comment-d",
            context_label: "스레드 연결",
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
  assert.strictEqual(draft.generationContext.selectedContextLabel, "질문 던지기");
  assert.match(draft.content, /질문을 남기는 한국어 댓글입니다/);
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
  assert.match(draft.content, /brandreceipt|최근 패션 흐름|생활|신호|손익|커뮤니티/);
});
