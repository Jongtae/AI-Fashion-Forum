import { test } from "node:test";
import * as assert from "node:assert";
import {
  getForumArtifactText,
  generateForumArtifact,
  buildSprint1PostTitle,
  buildSprint1PostBody,
} from "./forum-generation.js";

test("getForumArtifactText prefers body text", () => {
  const artifact = {
    body: "A clear forum post body.",
    content: "fallback content",
    text: "fallback text",
  };

  assert.strictEqual(getForumArtifactText(artifact), "A clear forum post body.");
});

test("getForumArtifactText falls back to content or text", () => {
  assert.strictEqual(
    getForumArtifactText({ content: "content fallback" }),
    "content fallback"
  );
  assert.strictEqual(getForumArtifactText({ text: "text fallback" }), "text fallback");
});

test("getForumArtifactText uses fallback when artifact text is missing", () => {
  assert.strictEqual(getForumArtifactText(null, "fallback body"), "fallback body");
});

test("generateForumArtifact returns readable body text", () => {
  const artifact = generateForumArtifact({
    actionRecord: {
      action_id: "ACT:A02:0:comment",
      tick: 0,
      type: "comment",
    },
    author: {
      agent_id: "A02",
      handle: "officemirror",
      relationship_summary: {
        trust_circle_size: 4,
        rivalry_edges: 0,
        repeated_repliers: 1,
      },
      belief_vector: { fit: 0.8 },
      self_narrative: ["Tick 0: authored a visible contribution."],
    },
    targetContent: {
      title: "fashion topic",
      topics: ["style"],
    },
    targetAgent: {
      belief_vector: { fit: 0.6 },
    },
  });

  assert.strictEqual(artifact.type, "comment");
  assert.match(artifact.body, /게시글을 따라 officemirror가 차분한 톤으로 답글을 남기며/i);
  assert.ok(!artifact.body.includes("artifact_id"));
  assert.ok(!artifact.body.includes("relationship_context"));
});

test("generateForumArtifact writes a comment reply to the post body", () => {
  const artifact = generateForumArtifact({
    actionRecord: {
      action_id: "ACT:A03:1:comment",
      tick: 1,
      type: "comment",
    },
    author: {
      agent_id: "A03",
      handle: "trendwatcher",
      relationship_summary: {
        trust_circle_size: 2,
        rivalry_edges: 0,
        repeated_repliers: 0,
      },
      belief_vector: { practicality: 0.5 },
      self_narrative: ["Tick 1: still comparing fits."],
    },
    targetContent: {
      title: "weekday mirror check",
      body: "I think the jacket is doing more work than the shirt here.",
      topics: ["jacket", "shirt"],
    },
    targetAgent: {
      belief_vector: { practicality: 0.6 },
    },
  });

  assert.match(artifact.body, /weekday mirror check|jacket|shirt/i);
  assert.match(artifact.body, /게시글을 따라|응답하고|스레드에 차분한 톤으로 끼어들며/i);
});

test("generateForumArtifact writes a comment reply to another comment", () => {
  const artifact = generateForumArtifact({
    actionRecord: {
      action_id: "ACT:A04:2:comment",
      tick: 2,
      type: "comment",
    },
    author: {
      agent_id: "A04",
      handle: "detailloop",
      relationship_summary: {
        trust_circle_size: 3,
        rivalry_edges: 0,
        repeated_repliers: 1,
      },
      belief_vector: { care: 0.5 },
      self_narrative: ["Tick 2: following the thread more closely."],
    },
    targetContent: {
      title: "quiet office outfit",
      body: "The coat length is what makes this work for me.",
      topics: ["coat", "fit"],
    },
    targetAgent: {
      belief_vector: { care: 0.6 },
    },
    targetComment: {
      authorId: "A02",
      content: "I think the sleeve balance is the real story here.",
    },
  });

  assert.match(artifact.body, /A02|sleeve balance/i);
  assert.match(artifact.body, /@A02의 댓글을 따라|@A02의 말을 받아|덧답을 남기고/i);
});

test("sprint 1 post copy varies by seed", () => {
  const agent = {
    handle: "officemirror",
    mutable_state: {
      self_narrative_summary: "I keep reading fit before brand.",
    },
    self_narrative: ["Tick 0: authored a visible contribution."],
  };
  const reaction = {
    meaning_frame: "care_context",
    stance_signal: "empathetic",
  };
  const content = {
    title: "quiet office outfit",
    body: "A small look at weekday layering and commute comfort.",
    topics: ["office", "layering"],
  };

  const titleSeedOne = buildSprint1PostTitle(agent, reaction, 1);
  const titleSeedTwo = buildSprint1PostTitle(agent, reaction, 2);
  const bodySeedOne = buildSprint1PostBody(agent, reaction, content, 1);
  const bodySeedTwo = buildSprint1PostBody(agent, reaction, content, 2);

  assert.notStrictEqual(titleSeedOne, titleSeedTwo);
  assert.notStrictEqual(bodySeedOne, bodySeedTwo);
  assert.match(bodySeedOne, /quiet office outfit|생활 리듬/);
  assert.match(bodySeedTwo, /weekday layering|commute comfort/);
});
