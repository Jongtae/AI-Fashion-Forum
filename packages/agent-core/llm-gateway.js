/**
 * LLM Gateway — provider-agnostic dispatch for context generation.
 *
 * Supports Claude (Anthropic Messages API) and OpenAI (Responses API).
 * Uses raw fetch only — no SDK dependency.
 */

export const DEFAULT_PROVIDER = "openai";
export const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-20250514";
export const DEFAULT_OPENAI_MODEL = "gpt-4o";
export const DEFAULT_TIMEOUT_MS = 30_000;
export const DEFAULT_MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

/**
 * Wrap a fetch call with an AbortController timeout.
 */
function fetchWithTimeout(fetchImpl, url, opts, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetchImpl(url, { ...opts, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}

/**
 * Retry-aware fetch: retries on 429 (rate limit) and 5xx with exponential backoff.
 */
async function fetchWithRetry(fetchImpl, url, opts, { timeoutMs = DEFAULT_TIMEOUT_MS, maxRetries = DEFAULT_MAX_RETRIES } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(fetchImpl, url, opts, timeoutMs);
      if (response.ok || (response.status < 500 && response.status !== 429)) {
        return response;
      }
      // Retryable status
      lastError = new Error(`HTTP ${response.status}`);
      lastError.status = response.status;
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers?.get?.("retry-after") || "0", 10);
        const delayMs = retryAfter > 0 ? retryAfter * 1000 : RETRY_BASE_MS * 2 ** attempt;
        await sleep(Math.min(delayMs, 30_000));
        continue;
      }
      // 5xx — backoff
      await sleep(RETRY_BASE_MS * 2 ** attempt);
    } catch (err) {
      lastError = err;
      if (err.name === "AbortError") {
        lastError = new Error(`LLM request timed out after ${timeoutMs}ms`);
      }
      if (attempt < maxRetries) {
        await sleep(RETRY_BASE_MS * 2 ** attempt);
      }
    }
  }
  throw lastError;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resolve LLM configuration from environment variables.
 */
export function resolveLLMConfig() {
  const provider = process.env.LLM_PROVIDER || DEFAULT_PROVIDER;
  const simulationEnabled =
    process.env.LLM_SIMULATION_ENABLED === "true" ||
    process.env.OPENAI_SIMULATION_ENABLED === "true";

  let apiKey = "";
  let model = "";

  if (provider === "claude") {
    apiKey = simulationEnabled ? process.env.ANTHROPIC_API_KEY || "" : "";
    model = process.env.LLM_MODEL || DEFAULT_CLAUDE_MODEL;
  } else {
    apiKey = simulationEnabled ? process.env.OPENAI_API_KEY || "" : "";
    model = process.env.LLM_MODEL || process.env.OPENAI_POST_CONTEXT_MODEL || DEFAULT_OPENAI_MODEL;
  }

  return { provider, apiKey, model, simulationEnabled };
}

/**
 * Dispatch to the appropriate provider.
 */
export async function requestLLMContexts({
  provider = DEFAULT_PROVIDER,
  apiKey,
  model,
  prompt,
  fetchImpl = globalThis.fetch,
}) {
  if (provider === "claude") {
    return requestClaudeContexts({
      apiKey,
      model: model || DEFAULT_CLAUDE_MODEL,
      prompt,
      fetchImpl,
    });
  }
  return requestOpenAIContexts({
    apiKey,
    model: model || DEFAULT_OPENAI_MODEL,
    prompt,
    fetchImpl,
  });
}

/**
 * Call Anthropic Messages API.
 */
export async function requestClaudeContexts({
  apiKey,
  model = DEFAULT_CLAUDE_MODEL,
  prompt,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxRetries = DEFAULT_MAX_RETRIES,
}) {
  const url = "https://api.anthropic.com/v1/messages";
  const opts = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
  };

  const response = await fetchWithRetry(fetchImpl, url, opts, { timeoutMs, maxRetries });
  const result = await response.json();
  if (!response.ok) {
    const message =
      result?.error?.message || `Claude request failed (${response.status})`;
    throw new Error(message);
  }

  return result;
}

/**
 * Call OpenAI Responses API. Moved from post-generation.js.
 */
export async function requestOpenAIContexts({
  apiKey,
  model = DEFAULT_OPENAI_MODEL,
  prompt,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxRetries = DEFAULT_MAX_RETRIES,
}) {
  const url = "https://api.openai.com/v1/responses";
  const opts = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "user",
          content: [{ type: "input_text", text: prompt }],
        },
      ],
    }),
  };

  const response = await fetchWithRetry(fetchImpl, url, opts, { timeoutMs, maxRetries });
  const result = await response.json();
  if (!response.ok) {
    const message =
      result?.error?.message ||
      `OpenAI request failed (${response.status})`;
    throw new Error(message);
  }

  return result;
}

/**
 * Extract the text payload from a provider-specific response shape.
 *
 * Claude: { content: [{ type: "text", text: "..." }] }
 * OpenAI: { output_text: "..." } or nested output array
 */
export function extractLLMResponseText(result, provider = DEFAULT_PROVIDER) {
  if (!result || typeof result !== "object") {
    return "";
  }

  if (provider === "claude") {
    return extractClaudeResponseText(result);
  }
  return extractOpenAIResponseText(result);
}

function extractClaudeResponseText(result) {
  const content = Array.isArray(result.content) ? result.content : [];
  for (const block of content) {
    if (block?.type === "text" && typeof block.text === "string" && block.text.trim()) {
      return block.text.trim();
    }
  }
  return "";
}

function extractOpenAIResponseText(result) {
  if (typeof result.output_text === "string" && result.output_text.trim()) {
    return result.output_text.trim();
  }

  const output = Array.isArray(result.output) ? result.output : [];
  for (const item of output) {
    if (typeof item?.content === "string" && item.content.trim()) {
      return item.content.trim();
    }

    if (Array.isArray(item?.content)) {
      for (const contentItem of item.content) {
        if (typeof contentItem?.text === "string" && contentItem.text.trim()) {
          return contentItem.text.trim();
        }
        if (
          typeof contentItem?.output_text === "string" &&
          contentItem.output_text.trim()
        ) {
          return contentItem.output_text.trim();
        }
      }
    }
  }

  return "";
}
