import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  requestLLMContexts,
  extractLLMResponseText,
  resolveLLMConfig,
  requestClaudeContexts,
  requestOpenAIContexts,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_MAX_RETRIES,
} from "./llm-gateway.js";

describe("llm-gateway", () => {
  describe("resolveLLMConfig", () => {
    it("defaults to openai provider", () => {
      const config = resolveLLMConfig();
      assert.strictEqual(config.provider, process.env.LLM_PROVIDER || "openai");
    });
  });

  describe("extractLLMResponseText", () => {
    it("extracts text from Claude response shape", () => {
      const result = {
        id: "msg_test",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: '{"contexts":[]}' }],
      };
      assert.strictEqual(extractLLMResponseText(result, "claude"), '{"contexts":[]}');
    });

    it("extracts text from OpenAI response shape (output_text)", () => {
      const result = { output_text: '{"contexts":[]}' };
      assert.strictEqual(extractLLMResponseText(result, "openai"), '{"contexts":[]}');
    });

    it("extracts text from OpenAI nested output shape", () => {
      const result = {
        output: [
          {
            content: [{ type: "output_text", text: '{"contexts":[{"a":1}]}' }],
          },
        ],
      };
      assert.strictEqual(
        extractLLMResponseText(result, "openai"),
        '{"contexts":[{"a":1}]}'
      );
    });

    it("returns empty string for null/undefined input", () => {
      assert.strictEqual(extractLLMResponseText(null, "claude"), "");
      assert.strictEqual(extractLLMResponseText(undefined, "openai"), "");
    });

    it("returns empty string when content blocks have no text", () => {
      const result = { content: [{ type: "image", source: {} }] };
      assert.strictEqual(extractLLMResponseText(result, "claude"), "");
    });
  });

  describe("requestLLMContexts", () => {
    it("dispatches to Claude when provider is claude", async () => {
      let calledUrl = "";
      const mockFetch = async (url, opts) => {
        calledUrl = url;
        return {
          ok: true,
          json: async () => ({
            content: [{ type: "text", text: '{"contexts":[]}' }],
          }),
        };
      };

      await requestLLMContexts({
        provider: "claude",
        apiKey: "test-key",
        model: "claude-sonnet-4-20250514",
        prompt: "test",
        fetchImpl: mockFetch,
      });

      assert.ok(calledUrl.includes("anthropic.com"), `expected Anthropic URL, got ${calledUrl}`);
    });

    it("dispatches to OpenAI when provider is openai", async () => {
      let calledUrl = "";
      const mockFetch = async (url, opts) => {
        calledUrl = url;
        return {
          ok: true,
          json: async () => ({ output_text: '{"contexts":[]}' }),
        };
      };

      await requestLLMContexts({
        provider: "openai",
        apiKey: "test-key",
        model: "gpt-4o",
        prompt: "test",
        fetchImpl: mockFetch,
      });

      assert.ok(calledUrl.includes("openai.com"), `expected OpenAI URL, got ${calledUrl}`);
    });
  });

  describe("requestClaudeContexts", () => {
    it("sends correct headers and body", async () => {
      let capturedOpts;
      const mockFetch = async (url, opts) => {
        capturedOpts = opts;
        return {
          ok: true,
          json: async () => ({
            content: [{ type: "text", text: "{}" }],
          }),
        };
      };

      await requestClaudeContexts({
        apiKey: "sk-ant-test",
        model: "claude-sonnet-4-20250514",
        prompt: "Generate contexts",
        fetchImpl: mockFetch,
      });

      assert.strictEqual(capturedOpts.method, "POST");
      assert.strictEqual(capturedOpts.headers["x-api-key"], "sk-ant-test");
      assert.strictEqual(capturedOpts.headers["anthropic-version"], "2023-06-01");

      const body = JSON.parse(capturedOpts.body);
      assert.strictEqual(body.model, "claude-sonnet-4-20250514");
      assert.strictEqual(body.max_tokens, 2048);
      assert.strictEqual(body.messages[0].role, "user");
      assert.strictEqual(body.messages[0].content, "Generate contexts");
    });

    it("throws on non-ok response", async () => {
      const mockFetch = async () => ({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: "Invalid API key" } }),
      });

      await assert.rejects(
        () => requestClaudeContexts({ apiKey: "bad", prompt: "test", fetchImpl: mockFetch }),
        { message: "Invalid API key" }
      );
    });
  });

  describe("timeout and retry", () => {
    it("exports timeout and retry constants", () => {
      assert.strictEqual(typeof DEFAULT_TIMEOUT_MS, "number");
      assert.ok(DEFAULT_TIMEOUT_MS > 0);
      assert.strictEqual(typeof DEFAULT_MAX_RETRIES, "number");
      assert.ok(DEFAULT_MAX_RETRIES >= 1);
    });

    it("retries on 429 and succeeds", async () => {
      let attempts = 0;
      const mockFetch = async (url, opts) => {
        attempts++;
        if (attempts <= 2) {
          return {
            ok: false,
            status: 429,
            headers: { get: () => "0" },
            json: async () => ({ error: { message: "rate limited" } }),
          };
        }
        return {
          ok: true,
          json: async () => ({ output_text: "success" }),
        };
      };

      const result = await requestOpenAIContexts({
        apiKey: "test",
        prompt: "test",
        fetchImpl: mockFetch,
        timeoutMs: 5000,
        maxRetries: 3,
      });
      assert.strictEqual(result.output_text, "success");
      assert.strictEqual(attempts, 3);
    });

    it("retries on 500 and eventually throws", async () => {
      let attempts = 0;
      const mockFetch = async () => {
        attempts++;
        return {
          ok: false,
          status: 500,
          headers: { get: () => null },
          json: async () => ({ error: { message: "server error" } }),
        };
      };

      await assert.rejects(
        () => requestOpenAIContexts({
          apiKey: "test",
          prompt: "test",
          fetchImpl: mockFetch,
          timeoutMs: 5000,
          maxRetries: 2,
        }),
      );
      assert.strictEqual(attempts, 3); // initial + 2 retries
    });

    it("throws on timeout", async () => {
      const mockFetch = async (url, opts) => {
        return new Promise((resolve, reject) => {
          const onAbort = () => {
            const err = new Error("aborted");
            err.name = "AbortError";
            reject(err);
          };
          if (opts.signal) {
            opts.signal.addEventListener("abort", onAbort);
          }
        });
      };

      await assert.rejects(
        () => requestOpenAIContexts({
          apiKey: "test",
          prompt: "test",
          fetchImpl: mockFetch,
          timeoutMs: 100,
          maxRetries: 0,
        }),
        (err) => err.message.includes("timed out"),
      );
    });

    it("does not retry on 401 (non-retryable)", async () => {
      let attempts = 0;
      const mockFetch = async () => {
        attempts++;
        return {
          ok: false,
          status: 401,
          headers: { get: () => null },
          json: async () => ({ error: { message: "Invalid API key" } }),
        };
      };

      await assert.rejects(
        () => requestOpenAIContexts({
          apiKey: "bad",
          prompt: "test",
          fetchImpl: mockFetch,
          timeoutMs: 5000,
          maxRetries: 3,
        }),
        { message: "Invalid API key" },
      );
      assert.strictEqual(attempts, 1); // no retry for 401
    });
  });

  describe("requestOpenAIContexts", () => {
    it("sends correct headers and body", async () => {
      let capturedOpts;
      const mockFetch = async (url, opts) => {
        capturedOpts = opts;
        return {
          ok: true,
          json: async () => ({ output_text: "{}" }),
        };
      };

      await requestOpenAIContexts({
        apiKey: "sk-openai-test",
        model: "gpt-4o",
        prompt: "Generate contexts",
        fetchImpl: mockFetch,
      });

      assert.strictEqual(capturedOpts.headers.authorization, "Bearer sk-openai-test");

      const body = JSON.parse(capturedOpts.body);
      assert.strictEqual(body.model, "gpt-4o");
      assert.strictEqual(body.input[0].role, "user");
      assert.strictEqual(body.input[0].content[0].text, "Generate contexts");
    });
  });
});
