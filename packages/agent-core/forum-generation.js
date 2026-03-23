import {
  SAMPLE_AGENT_STATES,
  SAMPLE_CONTENT_RECORDS,
} from "@ai-fashion-forum/shared-types";

function clamp(value) {
  return Math.max(0, Math.min(1, Number(value.toFixed(3))));
}

function deriveRelationshipState(author, targetAgent) {
  const baseTrust = Math.min(0.9, 0.2 + (author.relationship_summary.trust_circle_size || 0) * 0.08);
  const hostility = clamp((author.relationship_summary.rivalry_edges || 0) * 0.12);
  const alignment = clamp(
    Object.keys(author.belief_vector).some((key) => key in targetAgent.belief_vector) ? 0.62 : 0.38,
  );

  return {
    trust: clamp(baseTrust),
    hostility,
    alignment,
    fatigue: clamp((author.relationship_summary.repeated_repliers || 0) * 0.07),
  };
}

function getTone(relationshipState) {
  if (relationshipState.hostility >= 0.55) {
    return "sharp";
  }

  if (relationshipState.trust >= 0.65) {
    return "warm";
  }

  if (relationshipState.alignment >= 0.6) {
    return "steady";
  }

  return "guarded";
}

function buildRecentContext(agentState) {
  return agentState.self_narrative.slice(-2).join(" ");
}

export function generateForumArtifact({
  actionRecord,
  author,
  targetContent,
  targetAgent,
} = {}) {
  const relationshipState = deriveRelationshipState(author, targetAgent);
  const tone = getTone(relationshipState);
  const recentContext = buildRecentContext(author);
  const identityAnchor = Object.keys(author.belief_vector)[0] || "style-choice";

  const bodyTemplates = {
    comment: `${author.handle} replies in a ${tone} tone, grounding the response in ${identityAnchor} while referring back to ${recentContext || "recent forum memory"}.`,
    quote: `${author.handle} quote-posts the thread in a ${tone} tone, reframing it through ${identityAnchor}.`,
    post: `${author.handle} starts a fresh thread in a ${tone} tone after recent exposure around ${targetContent.topics.join(", ")}.`,
  };

  const artifactType = ["comment", "quote", "post"].includes(actionRecord.type)
    ? actionRecord.type
    : "comment";

  return {
    artifact_id: `GEN:${author.agent_id}:${actionRecord.tick}:${artifactType}`,
    source_action_id: actionRecord.action_id,
    type: artifactType,
    tone,
    title: `${targetContent.title} / ${artifactType}`,
    body: bodyTemplates[artifactType],
    relationship_context: relationshipState,
    ui: {
      label: `${artifactType} in ${tone} tone`,
      secondaryText: targetContent.title,
    },
  };
}

export function applyRelationshipUpdate({
  relationshipState,
  artifact,
} = {}) {
  const trustDelta = artifact.tone === "warm" ? 0.08 : artifact.tone === "sharp" ? -0.06 : 0.02;
  const hostilityDelta = artifact.tone === "sharp" ? 0.09 : -0.02;
  const alignmentDelta = artifact.tone === "steady" || artifact.tone === "warm" ? 0.05 : -0.01;
  const fatigueDelta = artifact.type === "quote" ? 0.07 : 0.03;

  return {
    before: relationshipState,
    after: {
      trust: clamp(relationshipState.trust + trustDelta),
      hostility: clamp(relationshipState.hostility + hostilityDelta),
      alignment: clamp(relationshipState.alignment + alignmentDelta),
      fatigue: clamp(relationshipState.fatigue + fatigueDelta),
    },
    deltas: {
      trust: trustDelta,
      hostility: hostilityDelta,
      alignment: alignmentDelta,
      fatigue: fatigueDelta,
    },
  };
}

export function createForumGenerationSample() {
  const author = SAMPLE_AGENT_STATES[1];
  const targetAgent = SAMPLE_AGENT_STATES[3];
  const targetContent = SAMPLE_CONTENT_RECORDS[13];
  const actionRecord = {
    action_id: "ACT:A02:30:comment",
    tick: 30,
    agent_id: author.agent_id,
    type: "comment",
    target_content_id: targetContent.content_id,
  };

  const artifact = generateForumArtifact({
    actionRecord,
    author,
    targetContent,
    targetAgent,
  });

  return {
    artifact,
    relationshipUpdate: applyRelationshipUpdate({
      relationshipState: artifact.relationship_context,
      artifact,
    }),
    neo4jSyncReady: true,
  };
}
