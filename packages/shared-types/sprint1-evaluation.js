import { SPRINT1_FORUM_POSTS_BY_ROUND, SPRINT1_ROUND_SNAPSHOTS } from "./sample-data.js";

function uniqueCount(values = []) {
  return new Set(values.filter(Boolean)).size;
}

function getRoundPostMap() {
  return new Map(SPRINT1_FORUM_POSTS_BY_ROUND.map((entry) => [entry.round_id, entry]));
}

function createTraceabilityRow(snapshot, posts = []) {
  const producedPosts = posts.filter((post) => snapshot.generated_post_ids.includes(post.post_id));

  return {
    agent_id: snapshot.agent_id,
    seen_content_ids: snapshot.exposure_summary.seen_content_ids,
    dominant_topic: snapshot.exposure_summary.dominant_topic,
    affect: snapshot.reaction_summary.affect,
    stance: snapshot.reaction_summary.stance,
    recent_arc: snapshot.memory_write_summary.recent_arc,
    self_narrative_summary: snapshot.self_narrative_summary,
    generated_post_ids: snapshot.generated_post_ids,
    resolved_post_titles: producedPosts.map((post) => post.title),
    trace_complete:
      snapshot.exposure_summary.seen_content_ids.length > 0 &&
      snapshot.memory_write_summary.self_narrative_written &&
      producedPosts.length === snapshot.generated_post_ids.length,
  };
}

function createRoundEvaluation(roundSnapshot, roundPosts = { posts: [], shared_content: null }) {
  const posts = roundPosts.posts || [];
  const traceability = roundSnapshot.agent_snapshots.map((snapshot) =>
    createTraceabilityRow(snapshot, posts),
  );
  const distinctMeaningFrames = uniqueCount(posts.map((post) => post.meaning_frame));
  const distinctStances = uniqueCount(posts.map((post) => post.stance_signal));
  const allUsingSharedStimulus = posts.every(
    (post) => post.source_content_id === (roundPosts.shared_content?.content_id || roundSnapshot.shared_content_ids[0]),
  );
  const traceabilityPass = traceability.every((row) => row.trace_complete);

  return {
    round_id: roundSnapshot.round_id,
    tick: roundSnapshot.tick,
    shared_content_id: roundPosts.shared_content?.content_id || roundSnapshot.shared_content_ids[0],
    checks: [
      {
        id: "divergence_legible",
        label: "Divergence is legible",
        passed: distinctMeaningFrames >= 2 && distinctStances >= 2,
        details: `${distinctMeaningFrames} meaning frames / ${distinctStances} stance signals`,
      },
      {
        id: "traceability_complete",
        label: "Traceability chain is complete",
        passed: traceabilityPass,
        details: traceabilityPass
          ? "Every agent maps seen content -> reaction -> narrative write -> post"
          : "One or more agents are missing a complete chain",
      },
      {
        id: "shared_stimulus_consistent",
        label: "Same external stimulus stays visible",
        passed: allUsingSharedStimulus,
        details: allUsingSharedStimulus
          ? "All posts still point back to the shared stimulus"
          : "A post drifted away from the shared stimulus trace",
      },
    ],
    divergence_summary: {
      distinct_meaning_frames: distinctMeaningFrames,
      distinct_stances: distinctStances,
      post_count: posts.length,
    },
    traceability,
  };
}

export function createSprint1EvaluationSnapshot() {
  const roundPostMap = getRoundPostMap();
  const rounds = SPRINT1_ROUND_SNAPSHOTS.map((round) =>
    createRoundEvaluation(round, roundPostMap.get(round.round_id)),
  );
  const passCount = rounds.flatMap((round) => round.checks).filter((check) => check.passed).length;
  const totalChecks = rounds.flatMap((round) => round.checks).length;

  return {
    summary: {
      goal: "Show that the same external content can create visible, traceable identity divergence across agents.",
      overall_pass: rounds.every((round) => round.checks.every((check) => check.passed)),
      pass_count: passCount,
      total_checks: totalChecks,
    },
    acceptance_checks: [
      {
        id: "divergence_not_random",
        label: "Different-looking posts are backed by different meaning frames and stance signals",
        passed: rounds.every((round) =>
          round.checks.find((check) => check.id === "divergence_legible")?.passed,
        ),
      },
      {
        id: "traceability_visible",
        label: "A reviewer can trace content -> reaction -> memory -> post for every agent",
        passed: rounds.every((round) =>
          round.checks.find((check) => check.id === "traceability_complete")?.passed,
        ),
      },
      {
        id: "replay_review_ready",
        label: "The replay surface can be used to review the checks side by side with posts",
        passed: rounds.length > 0,
      },
    ],
    rounds,
  };
}
