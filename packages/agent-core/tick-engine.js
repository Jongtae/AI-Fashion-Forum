import {
  SAMPLE_STATE_SNAPSHOT,
  createActionRecord,
  getActionVisibility,
  serializeSnapshot,
} from "@ai-fashion-forum/shared-types";

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cloneState(state) {
  return serializeSnapshot(state);
}

function createReplayEntry({ tick, actor_id, action, reason, world_effects, target_content_id = null }) {
  const actionRecord = createActionRecord({
    action_id: `ACT:${actor_id}:${tick}:${action}`,
    tick,
    agent_id: actor_id,
    type: action,
    target_content_id,
    visibility: getActionVisibility(action),
    payload: {
      reason,
      world_effects,
    },
  });

  return {
    tick,
    actor_id,
    action,
    action_id: actionRecord.action_id,
    visibility: actionRecord.visibility,
    target_content_id: actionRecord.target_content_id,
    reason,
    world_effects,
  };
}

export function createSeededWorld({
  seed = 42,
  initialState = SAMPLE_STATE_SNAPSHOT,
  worldRules = [],
} = {}) {
  return {
    seed,
    random: mulberry32(seed),
    tick: 0,
    state: cloneState(initialState),
    replay: {
      seed,
      entries: [],
      snapshots: [cloneState(initialState)],
    },
    worldRules,
  };
}

function runWorldRules(world, phase) {
  const effects = [];

  for (const rule of world.worldRules) {
    const effect = rule({
      phase,
      tick: world.tick,
      state: world.state,
      random: world.random,
    });

    if (effect) {
      effects.push(effect);
    }
  }

  return effects;
}

function pickActor(world) {
  const agents = world.state.agents;
  const index = Math.floor(world.random() * agents.length);
  return agents[index];
}

function generateTickAction(world, actor) {
  const roll = world.random();

  if (roll < 0.2) {
    return {
      type: "lurk",
      reason: "이번 틱에는 조용히 관찰만 이어갔다.",
    };
  }

  if (roll < 0.5) {
    return {
      type: "react",
      reason: "본문 대신 짧은 반응으로 존재감을 남겼다.",
    };
  }

  if (roll < 0.8) {
    return {
      type: "comment",
      reason: "현재 주제 흐름에 맞춰 답글을 남겼다.",
    };
  }

  return {
    type: "post",
    reason: "활동성과 새로움 신호가 맞아 새 글을 올렸다.",
  };
}

function applyTickOutcome(world, actor, action) {
  const agent = world.state.agents.find((entry) => entry.agent_id === actor.agent_id);

  agent.activity_level = Number(Math.min(1, agent.activity_level + 0.01).toFixed(3));

  if (action.type === "post") {
    agent.self_narrative = [
      ...agent.self_narrative,
      `${world.tick}틱: 눈에 보이는 글을 남겼다.`,
    ].slice(-5);
  }

  if (action.type === "comment") {
    agent.relationship_summary = {
      ...agent.relationship_summary,
      repeated_repliers: (agent.relationship_summary.repeated_repliers || 0) + 1,
    };
  }
}

export function runSingleTick(world) {
  const preTickEffects = runWorldRules(world, "pre_tick");
  const actor = pickActor(world);
  const action = generateTickAction(world, actor);

  applyTickOutcome(world, actor, action);

  const entry = createReplayEntry({
    tick: world.tick,
    actor_id: actor.agent_id,
    action: action.type,
    reason: action.reason,
    world_effects: preTickEffects,
  });

  world.replay.entries.push(entry);
  world.tick += 1;
  world.replay.snapshots.push(cloneState(world.state));

  return entry;
}

export function runTicks(options = {}) {
  const {
    seed = 42,
    tickCount = 1,
    initialState = SAMPLE_STATE_SNAPSHOT,
    worldRules = [],
    spawnAgent = null,
  } = options;

  const world = createSeededWorld({
    seed,
    initialState,
    worldRules,
  });

  for (let index = 0; index < tickCount; index += 1) {
    if (typeof spawnAgent === "function") {
      const spawnedAgent = spawnAgent({
        world,
        tickIndex: index,
        tick: world.tick,
        remainingTicks: tickCount - index,
      });

      if (spawnedAgent && spawnedAgent.agent_id) {
        world.state.agents.push(cloneState(spawnedAgent));
        world.replay.snapshots.push(cloneState(world.state));
      }
    }

    runSingleTick(world);
  }

  return {
    seed,
    tickCount,
    finalTick: world.tick,
    entries: world.replay.entries,
    snapshots: world.replay.snapshots,
    finalState: cloneState(world.state),
  };
}

export function createBaselineWorldRules() {
  return [
    ({ phase, tick }) => {
      if (phase !== "pre_tick") {
        return null;
      }

      return {
        rule_id: "baseline-topic-pulse",
        tick,
        note: tick % 3 === 0 ? "틱 전 사무실 스타일 신호가 잠시 올라왔다." : "주요 주제 개입은 없었다.",
      };
    },
  ];
}
