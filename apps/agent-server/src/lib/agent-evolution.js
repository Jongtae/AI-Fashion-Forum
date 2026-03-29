function getDriftTail(agent) {
  const driftLog = agent?.mutable_state?.drift_log;
  return Array.isArray(driftLog) ? driftLog.slice(-2) : [];
}

function getNarrativeCount(agent) {
  return Array.isArray(agent?.self_narrative) ? agent.self_narrative.length : 0;
}

export function buildAgentEvolutionTimeline({ snapshots = [], maxPoints = 4 } = {}) {
  const perAgent = new Map();

  snapshots.forEach((snapshot, snapshotIndex) => {
    const tick = typeof snapshot?.tick === "number" ? snapshot.tick : snapshotIndex;
    const round = typeof snapshot?.round === "number" ? snapshot.round : null;
    const agents = Array.isArray(snapshot?.agents) ? snapshot.agents : [];

    for (const agent of agents) {
      const agentId = agent.agent_id;
      const nextItem = perAgent.get(agentId) || {
        agentId,
        handle: agent.handle || agentId,
        displayName: agent.display_name || agent.handle || agentId,
        joinedTick: agent.joined_tick ?? null,
        timeline: [],
      };

      nextItem.handle = agent.handle || nextItem.handle;
      nextItem.displayName = agent.display_name || nextItem.displayName;
      nextItem.joinedTick = nextItem.joinedTick ?? agent.joined_tick ?? null;
      nextItem.timeline.push({
        tick,
        round,
        joinedTick: agent.joined_tick ?? null,
        archetype: agent.archetype || null,
        recentArc: agent.mutable_state?.recent_arc || "stable",
        narrativeCount: getNarrativeCount(agent),
        driftTail: getDriftTail(agent),
        selfNarrativeSummary:
          agent.mutable_state?.self_narrative_summary ||
          (Array.isArray(agent.self_narrative) && agent.self_narrative.length
            ? agent.self_narrative[agent.self_narrative.length - 1]
            : null),
        activityLevel: agent.activity_level ?? null,
      });
      nextItem.timeline = nextItem.timeline.slice(-maxPoints);
      perAgent.set(agentId, nextItem);
    }
  });

  return [...perAgent.values()].map((item) => ({
    ...item,
    latestStep: item.timeline[item.timeline.length - 1] || null,
  }));
}

