import { test } from "node:test";
import * as assert from "node:assert";
import { getForumArtifactText, generateForumArtifact } from "./forum-generation.js";

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
  assert.match(artifact.body, /officemirror replies in a steady tone/i);
  assert.ok(!artifact.body.includes("artifact_id"));
  assert.ok(!artifact.body.includes("relationship_context"));
});
