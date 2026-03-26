import test from "node:test";
import assert from "node:assert/strict";

import {
  applyCharacterOverridesToState,
  createCharacterContractFromAgent,
  createCharacterOverride,
} from "./character-contract.js";

test("createCharacterOverride validates and records applied fields", () => {
  const override = createCharacterOverride({
    agent_id: "A02",
    display_name: "Office Mirror",
    self_narrative: ["Practical first."],
    seed_profile: {
      seed_id: "office-mirror-v2",
      archetype_hint: "community_regular",
      baseline_traits: { practicality: 0.9 },
      interest_seeds: { office_style: 0.9 },
      value_seeds: { "fit-before-brand": 0.9 },
      emotional_bias: { care: 0.5 },
      voice_notes: ["short", "practical"],
    },
  });

  assert.equal(override.agent_id, "A02");
  assert.deepEqual(override.fields_applied, ["display_name", "self_narrative", "seed_profile"]);
});

test("createCharacterContractFromAgent derives a stable contract id and summary", () => {
  const contract = createCharacterContractFromAgent({
    agent_id: "A02",
    handle: "officemirror",
    display_name: "Office Mirror",
    archetype: "community_regular",
    interest_vector: { office_style: 0.9, trousers: 0.7 },
    belief_vector: { "fit-before-brand": 0.9 },
    self_narrative: ["Practical first."],
    seed_profile: {
      seed_id: "office-mirror-v2",
      voice_notes: ["short", "practical"],
    },
  });

  assert.equal(contract.character_contract_id, "CHAR:A02:office-mirror-v2");
  assert.equal(contract.summary.voice_notes.length, 2);
});

test("applyCharacterOverridesToState merges override into state and preserves untouched agents", () => {
  const { state, appliedOverrides } = applyCharacterOverridesToState(
    {
      agents: [
        {
          agent_id: "A01",
          handle: "softweekend",
          display_name: "Soft Weekend",
          archetype: "quiet_observer",
          interest_vector: { cats: 0.8 },
          belief_vector: { "texture-matters": 0.7 },
          self_narrative: ["Quiet details first."],
        },
        {
          agent_id: "A02",
          handle: "officemirror",
          display_name: "Office Mirror",
          archetype: "community_regular",
          interest_vector: { office_style: 0.9 },
          belief_vector: { "fit-before-brand": 0.9 },
          self_narrative: ["Practical weekday feedback."],
        },
      ],
    },
    [
      {
        agent_id: "A02",
        self_narrative: ["Short and practical."],
        interest_vector: { trousers: 0.82 },
      },
    ]
  );

  assert.equal(state.agents[0].character_contract.source, "state_seed");
  assert.equal(state.agents[1].character_contract.source, "invoke_override");
  assert.deepEqual(state.agents[1].self_narrative, ["Short and practical."]);
  assert.equal(state.agents[1].interest_vector.office_style, 0.9);
  assert.equal(state.agents[1].interest_vector.trousers, 0.82);
  assert.equal(appliedOverrides.length, 1);
  assert.equal(appliedOverrides[0].agent_id, "A02");
});
