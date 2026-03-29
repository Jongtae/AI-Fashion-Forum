import test from "node:test";
import assert from "node:assert/strict";

import { runTicks } from "./tick-engine.js";
import { createMemorySample } from "./memory-stack.js";
import { createDebugConsoleSample } from "./debug-console.js";

test("tick engine reasons stay Korean-first", () => {
  const result = runTicks({ seed: 42, tickCount: 4 });

  assert.ok(result.entries.length > 0);
  for (const entry of result.entries) {
    assert.ok(!/Tick|authored|office_style|intervention|visible contribution/i.test(entry.reason));
    assert.match(entry.reason, /[가-힣]/);
  }
});

test("memory sample summaries and narratives stay Korean-first", () => {
  const sample = createMemorySample({ seed: 42, tickCount: 4, agentId: "A01" });

  assert.ok(sample.summaries.length > 0);
  for (const summary of sample.summaries) {
    assert.ok(!/Tick|Reaction|I am|I keep|Matched against/i.test(summary.summary));
    assert.match(summary.summary, /[가-힣]/);
  }

  assert.ok(sample.memory.recent.length > 0);
  for (const memory of sample.memory.recent) {
    assert.ok(!/Tick|Reaction|I am|I keep|Matched against/i.test(memory.summary));
    assert.match(memory.summary, /[가-힣]/);
  }

  assert.ok(sample.memory.selfNarrative.length > 0);
  for (const narrative of sample.memory.selfNarrative) {
    assert.ok(!/I am|I keep|Use repeated|hardening toward/i.test(narrative.text));
    assert.match(narrative.text, /[가-힣]/);
  }
});

test("debug console explanations and notes stay Korean-first", () => {
  const sample = createDebugConsoleSample({ agentId: "A02" });

  const writeSummary = sample.decisionCases.wroteOrEngaged.summary;
  const deferSummary = sample.decisionCases.ignoredOrDeferred.summary;

  for (const summary of [writeSummary, deferSummary]) {
    assert.ok(!/visible-action threshold|did not escalate|Retrieved|Policy/i.test(summary.explanation));
    assert.match(summary.explanation, /[가-힣]/);
    assert.ok(summary.why_now.every((item) => !/Retrieved|Policy|Matched against/i.test(item)));
    assert.ok(summary.why_now.some((item) => /[가-힣]/.test(item)));
  }

  assert.ok(!/Use repeated memory retrieval/i.test(sample.identityDriftDebug.note));
  assert.match(sample.identityDriftDebug.note, /[가-힣]/);
});
