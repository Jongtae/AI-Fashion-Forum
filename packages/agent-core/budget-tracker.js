/**
 * budget-tracker.js
 *
 * Tracks estimated LLM API cost per simulation run and enforces a hard cap.
 * Default cap: $2.00 per simulation.
 *
 * Cost model (gpt-4o, 2025 pricing):
 *   Input:  ~$2.50 / 1M tokens
 *   Output: ~$10.00 / 1M tokens
 *   Per generation call: ~500 input + ~200 output ≈ $0.003
 */

const DEFAULT_BUDGET_CAP_USD = 2.0;

const COST_PER_MILLION_INPUT = 2.5;
const COST_PER_MILLION_OUTPUT = 10.0;
const ESTIMATED_INPUT_TOKENS_PER_CALL = 500;
const ESTIMATED_OUTPUT_TOKENS_PER_CALL = 200;
const ESTIMATED_COST_PER_CALL =
  (ESTIMATED_INPUT_TOKENS_PER_CALL * COST_PER_MILLION_INPUT +
    ESTIMATED_OUTPUT_TOKENS_PER_CALL * COST_PER_MILLION_OUTPUT) /
  1_000_000;

export function createBudgetTracker({ budgetCapUsd } = {}) {
  const cap = Math.max(0.01, Number(budgetCapUsd) || DEFAULT_BUDGET_CAP_USD);
  let totalCalls = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  function estimatedCostUsd() {
    return (
      (totalInputTokens * COST_PER_MILLION_INPUT +
        totalOutputTokens * COST_PER_MILLION_OUTPUT) /
      1_000_000
    );
  }

  return {
    get budgetCapUsd() {
      return cap;
    },

    get totalCalls() {
      return totalCalls;
    },

    get spentUsd() {
      return Math.round(estimatedCostUsd() * 10000) / 10000;
    },

    get remainingUsd() {
      return Math.round(Math.max(0, cap - estimatedCostUsd()) * 10000) / 10000;
    },

    get exhausted() {
      return estimatedCostUsd() >= cap;
    },

    /** Check if there's budget for at least N more LLM calls. */
    canAfford(calls = 1) {
      return estimatedCostUsd() + calls * ESTIMATED_COST_PER_CALL <= cap;
    },

    /** Record an LLM call. Pass actual token counts if available. */
    record({ inputTokens, outputTokens } = {}) {
      totalCalls += 1;
      totalInputTokens += inputTokens || ESTIMATED_INPUT_TOKENS_PER_CALL;
      totalOutputTokens += outputTokens || ESTIMATED_OUTPUT_TOKENS_PER_CALL;
    },

    /** Get a snapshot for logging/response. */
    snapshot() {
      return {
        budgetCapUsd: cap,
        spentUsd: this.spentUsd,
        remainingUsd: this.remainingUsd,
        totalCalls,
        exhausted: this.exhausted,
        estimatedCostPerCall: Math.round(ESTIMATED_COST_PER_CALL * 10000) / 10000,
      };
    },
  };
}

export { DEFAULT_BUDGET_CAP_USD, ESTIMATED_COST_PER_CALL };
