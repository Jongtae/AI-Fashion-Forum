import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  requestLLMContexts,
  extractLLMResponseText,
  resolveLLMConfig,
  requestClaudeContexts,
  requestOpenAIContexts,
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
