import { SAMPLE_AGENT_STATES, serializeSnapshot } from "@ai-fashion-forum/shared-types";

function clampUnit(value) {
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

function cloneAgent(agentState) {
  return serializeSnapshot(agentState);
}

const TOPIC_TO_BELIEF = Object.freeze({
  pricing: "most-hype-is-overpriced",
  office_style: "fit-before-brand",
  fit: "fit-before-brand",
  empathy: "gentle-feedback-works",
  self_doubt: "gentle-feedback-works",
  utility: "daily-utility",
  jacket: "consistency-over-experiment",
  outerwear: "consistency-over-experiment",
});

function getBeliefKey(exposure) {
  return exposure.belief_key || exposure.topics.map((topic) => TOPIC_TO_BELIEF[topic]).find(Boolean);
}

function getExposureDirection(exposure) {
  if (typeof exposure.direction === "number") {
    return exposure.direction >= 0 ? 1 : -1;
  }

  return exposure.emotions?.includes("frustration") || exposure.emotions?.includes("hesitation")
    ? -1
    : 1;
}

function getPreferenceSignal(agentState, exposure) {
  const topicAffinity =
    exposure.topics.reduce(
      (sum, topic) => sum + (agentState.interest_vector[topic] || 0),
      0,
    ) / Math.max(exposure.topics.length, 1);

  return clampUnit(
    topicAffinity * 0.55 +
      (exposure.intensity || 0.6) * 0.25 +
      (exposure.social_proof || 0.4) * 0.2,
  );
}

export function determineContradictionPath(agentState, exposure) {
  const beliefKey = getBeliefKey(exposure);
  const currentBelief = agentState.belief_vector[beliefKey] || 0.5;
  const direction = getExposureDirection(exposure);
  const contradictionStrength = currentBelief * (direction < 0 ? 1 : 0);

  if (direction >= 0 || contradictionStrength < 0.45) {
    return "reinforce";
  }

  if (agentState.conflict_tolerance >= 0.7 && agentState.openness <= 0.55) {
    return "backlash";
  }

  if (agentState.openness >= 0.65) {
    return "reconsideration";
  }

  return "ignore";
}

export function applyIdentityExposure({
  agentState,
  exposure,
  tick = 0,
} = {}) {
  const nextAgent = cloneAgent(agentState);
  const beliefKey = getBeliefKey(exposure);
  const direction = getExposureDirection(exposure);
  const preferenceSignal = getPreferenceSignal(nextAgent, exposure);
  const contradictionPath = determineContradictionPath(nextAgent, exposure);
  const dominantTopic = exposure.topics[0];
  const previousInterest = nextAgent.interest_vector[dominantTopic] || 0;
  const previousBelief = nextAgent.belief_vector[beliefKey] || 0.5;

  let interestDelta = preferenceSignal * 0.18 * direction;
  let beliefDelta = preferenceSignal * 0.14 * direction;

  if (contradictionPath === "ignore") {
    interestDelta *= 0.08;
    beliefDelta *= 0.04;
  }

  if (contradictionPath === "backlash") {
    interestDelta = Math.abs(interestDelta) * 0.35;
    beliefDelta = Math.abs(beliefDelta) * 0.32;
  }

  if (contradictionPath === "reconsideration") {
    interestDelta *= 0.55;
    beliefDelta *= 0.72;
  }

  nextAgent.interest_vector[dominantTopic] = clampUnit(previousInterest + interestDelta);
  nextAgent.belief_vector[beliefKey] = clampUnit(previousBelief + beliefDelta);

  const beliefAfter = nextAgent.belief_vector[beliefKey];
  const beliefDeltaLogged = Number((beliefAfter - previousBelief).toFixed(4));
  const trajectory =
    beliefAfter >= 0.9
      ? "radicalizing"
      : beliefDeltaLogged <= -0.05 || beliefAfter <= Math.max(0.35, previousBelief - 0.1)
        ? "softening"
        : "stable_shift";

  return {
    agent: nextAgent,
    deltaLog: {
      tick,
      agent_id: nextAgent.agent_id,
      dominant_topic: dominantTopic,
      belief_key: beliefKey,
      preference_signal: preferenceSignal,
      interest_before: previousInterest,
      interest_after: nextAgent.interest_vector[dominantTopic],
      interest_delta: Number((nextAgent.interest_vector[dominantTopic] - previousInterest).toFixed(4)),
      belief_before: previousBelief,
      belief_after: beliefAfter,
      belief_delta: beliefDeltaLogged,
      contradiction_path: contradictionPath,
      trajectory,
      exposure_summary: exposure.summary,
    },
  };
}

export function runIdentityTrajectory({
  agentState,
  exposures = [],
} = {}) {
  let nextAgent = cloneAgent(agentState);
  const deltaLogs = [];

  exposures.forEach((exposure, index) => {
    const update = applyIdentityExposure({
      agentState: nextAgent,
      exposure,
      tick: exposure.tick ?? index,
    });
    nextAgent = update.agent;
    deltaLogs.push(update.deltaLog);
  });

  return {
    agent_id: nextAgent.agent_id,
    initial_agent: cloneAgent(agentState),
    final_agent: nextAgent,
    deltaLogs,
  };
}

function getScenarioAgent(agentId) {
  return cloneAgent(
    SAMPLE_AGENT_STATES.find((agent) => agent.agent_id === agentId) || SAMPLE_AGENT_STATES[0],
  );
}

export function createIdentityScenarioSuite() {
  const radicalization = runIdentityTrajectory({
    agentState: getScenarioAgent("A06"),
    exposures: [
      {
        tick: 0,
        topics: ["pricing", "fit"],
        emotions: ["frustration"],
        intensity: 0.92,
        social_proof: 0.84,
        direction: 1,
        summary: "Repeated anti-hype pricing threads reinforce distrust of trend pricing.",
        belief_key: "most-hype-is-overpriced",
      },
      {
        tick: 1,
        topics: ["pricing", "trend_fatigue"],
        emotions: ["frustration"],
        intensity: 0.95,
        social_proof: 0.79,
        direction: 1,
        summary: "A second wave of backlash-heavy threads pushes the same belief harder.",
        belief_key: "most-hype-is-overpriced",
      },
    ],
  });

  const softening = runIdentityTrajectory({
    agentState: getScenarioAgent("A04"),
    exposures: [
      {
        tick: 0,
        topics: ["empathy", "self_doubt"],
        emotions: ["criticism"],
        intensity: 0.88,
        social_proof: 0.71,
        direction: -1,
        summary: "A harsh reply wave challenges the belief that gentle feedback is what helps people stay engaged.",
        belief_key: "gentle-feedback-works",
      },
      {
        tick: 1,
        topics: ["empathy", "self_doubt"],
        emotions: ["criticism"],
        intensity: 0.84,
        social_proof: 0.69,
        direction: -1,
        summary: "Repeated dismissive exposure pushes the agent into a reconsideration path instead of instant rejection.",
        belief_key: "gentle-feedback-works",
      },
    ],
  });

  return {
    scenarios: [
      { name: "radicalization", result: radicalization },
      { name: "softening", result: softening },
    ],
  };
}
