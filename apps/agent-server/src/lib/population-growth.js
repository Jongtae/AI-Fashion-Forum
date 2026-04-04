import { SAMPLE_STATE_SNAPSHOT } from "@ai-fashion-forum/shared-types";
import { loadAgentStartupStateSnapshot } from "./agent-startup-state.js";

const STARTUP_STATE_SNAPSHOT = loadAgentStartupStateSnapshot();

export const DEFAULT_INITIAL_AGENT_COUNT =
  STARTUP_STATE_SNAPSHOT.agents.length || SAMPLE_STATE_SNAPSHOT.agents.length;
export const DEFAULT_AGENT_GROWTH_INTERVAL = 4;
export const DEFAULT_AGENT_MAX_COUNT =
  Math.max(10, Number(process.env.AGENT_MAX_COUNT) || 10);

export function buildPopulationGrowthPlan({
  currentCount = DEFAULT_INITIAL_AGENT_COUNT,
  elapsedTicks = 0,
  initialCount = DEFAULT_INITIAL_AGENT_COUNT,
  growthInterval = DEFAULT_AGENT_GROWTH_INTERVAL,
  maxCount = DEFAULT_AGENT_MAX_COUNT,
} = {}) {
  const safeCurrentCount = Math.max(0, Number(currentCount) || 0);
  const safeElapsedTicks = Math.max(0, Number(elapsedTicks) || 0);
  const safeInitialCount = Math.max(0, Number(initialCount) || DEFAULT_INITIAL_AGENT_COUNT);
  const safeInterval = Math.max(1, Number(growthInterval) || DEFAULT_AGENT_GROWTH_INTERVAL);
  const safeMaxCount = Math.max(safeInitialCount, Number(maxCount) || DEFAULT_AGENT_MAX_COUNT);

  const desiredCount = Math.min(
    safeMaxCount,
    safeInitialCount + Math.floor(safeElapsedTicks / safeInterval),
  );
  const shouldSpawn = safeCurrentCount < desiredCount;
  const completedSteps = Math.floor(safeElapsedTicks / safeInterval);
  const nextSpawnAtTick =
    desiredCount >= safeMaxCount ? null : (completedSteps + 1) * safeInterval;
  const ticksUntilNextSpawn =
    nextSpawnAtTick == null ? null : Math.max(0, nextSpawnAtTick - safeElapsedTicks);

  return {
    initialCount: safeInitialCount,
    currentCount: safeCurrentCount,
    elapsedTicks: safeElapsedTicks,
    growthInterval: safeInterval,
    maxCount: safeMaxCount,
    desiredCount,
    shouldSpawn,
    nextSpawnAtTick,
    ticksUntilNextSpawn,
    growthStage:
      safeCurrentCount >= safeMaxCount
        ? "saturated"
        : safeElapsedTicks < safeInterval
          ? "seed"
          : shouldSpawn
            ? "catching_up"
            : "expanding",
    grownCount: Math.max(0, safeCurrentCount - safeInitialCount),
  };
}
