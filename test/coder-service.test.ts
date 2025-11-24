import Anthropic from "@anthropic-ai/sdk";
import { afterEach, beforeEach, describe, expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { vi } from "vitest";
import { CoderServiceTag, CoderServiceLive } from "../src/services/CoderService";

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => ({
    messages: {
      create: vi.fn(),
    },
  })),
}));

describe("CoderService", () => {
  const mockApiKey = "sk-ant-test-key-12345";
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = mockApiKey;
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = originalEnv;
  });

  describe("createSession", () => {
    it("should return formatted session string", async () => {
      const program = Effect.gen(function* () {
        const service = yield* CoderServiceTag;
        return yield* service.createSession("test-session");
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(CoderServiceLive))
      );

      expect(result).toBe("✅ Created Claude Session: test-session");
    });

    it("should handle different session names", async () => {
      const program = Effect.gen(function* () {
        const service = yield* CoderServiceTag;
        return yield* service.createSession("production-session");
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(CoderServiceLive))
      );

      expect(result).toBe("✅ Created Claude Session: production-session");
    });

    it("should handle empty session names", async () => {
      const program = Effect.gen(function* () {
        const service = yield* CoderServiceTag;
        return yield* service.createSession("");
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(CoderServiceLive))
      );

      expect(result).toBe("✅ Created Claude Session: ");
    });
  });

  describe("execute", () => {
    it("should successfully execute instruction and return text response", async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        content: [
          {
            type: "text",
            text: "Hello from Claude!",
          },
        ],
      });

      const MockAnthropicConstructor = Anthropic as unknown as vi.Mock;
      MockAnthropicConstructor.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      }));

      const program = Effect.gen(function* () {
        const service = yield* CoderServiceTag;
        return yield* service.execute("session-123", "Say hello");
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(CoderServiceLive))
      );

      expect(result).toBe("Hello from Claude!");
      expect(mockCreate).toHaveBeenCalledWith({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [{ role: "user", content: "Say hello" }],
      });
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it("should return 'No response' when content has no text block", async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        content: [
          {
            type: "image",
            source: { type: "base64", data: "..." },
          },
        ],
      });

      const MockAnthropicConstructor = Anthropic as unknown as vi.Mock;
      MockAnthropicConstructor.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      }));

      const program = Effect.gen(function* () {
        const service = yield* CoderServiceTag;
        return yield* service.execute("session-123", "Generate image");
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(CoderServiceLive))
      );

      expect(result).toBe("No response");
    });

    it("should return 'No response' when content is empty", async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        content: [],
      });

      const MockAnthropicConstructor = Anthropic as unknown as vi.Mock;
      MockAnthropicConstructor.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      }));

      const program = Effect.gen(function* () {
        const service = yield* CoderServiceTag;
        return yield* service.execute("session-123", "Empty response test");
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(CoderServiceLive))
      );

      expect(result).toBe("No response");
    });

    it("should handle multiple content blocks and return first text", async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        content: [
          {
            type: "thinking",
            thinking: "Let me think...",
          },
          {
            type: "text",
            text: "First text response",
          },
          {
            type: "text",
            text: "Second text response",
          },
        ],
      });

      const MockAnthropicConstructor = Anthropic as unknown as vi.Mock;
      MockAnthropicConstructor.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      }));

      const program = Effect.gen(function* () {
        const service = yield* CoderServiceTag;
        return yield* service.execute("session-123", "Multiple blocks");
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(CoderServiceLive))
      );

      expect(result).toBe("First text response");
    });
  });

  describe("error handling", () => {
    it("should handle API network errors", async () => {
      const mockCreate = vi
        .fn()
        .mockRejectedValue(new Error("Network timeout"));

      const MockAnthropicConstructor = Anthropic as unknown as vi.Mock;
      MockAnthropicConstructor.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      }));

      const program = Effect.gen(function* () {
        const service = yield* CoderServiceTag;
        return yield* service.execute("session-123", "Test network error");
      });

      await expect(
        Effect.runPromise(program.pipe(Effect.provide(CoderServiceLive)))
      ).rejects.toThrow("Claude execution failed: Error: Network timeout");
    });

    it("should handle API authentication errors", async () => {
      const mockCreate = vi
        .fn()
        .mockRejectedValue(new Error("Invalid API key"));

      const MockAnthropicConstructor = Anthropic as unknown as vi.Mock;
      MockAnthropicConstructor.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      }));

      const program = Effect.gen(function* () {
        const service = yield* CoderServiceTag;
        return yield* service.execute("session-123", "Test auth error");
      });

      await expect(
        Effect.runPromise(program.pipe(Effect.provide(CoderServiceLive)))
      ).rejects.toThrow("Claude execution failed: Error: Invalid API key");
    });

    it("should handle API rate limit errors", async () => {
      const mockCreate = vi
        .fn()
        .mockRejectedValue(new Error("Rate limit exceeded"));

      const MockAnthropicConstructor = Anthropic as unknown as vi.Mock;
      MockAnthropicConstructor.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      }));

      const program = Effect.gen(function* () {
        const service = yield* CoderServiceTag;
        return yield* service.execute("session-123", "Test rate limit");
      });

      await expect(
        Effect.runPromise(program.pipe(Effect.provide(CoderServiceLive)))
      ).rejects.toThrow("Claude execution failed: Error: Rate limit exceeded");
    });

    it("should handle malformed API responses", async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        content: null,
      });

      const MockAnthropicConstructor = Anthropic as unknown as vi.Mock;
      MockAnthropicConstructor.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      }));

      const program = Effect.gen(function* () {
        const service = yield* CoderServiceTag;
        return yield* service.execute("session-123", "Malformed response");
      });

      await expect(
        Effect.runPromise(program.pipe(Effect.provide(CoderServiceLive)))
      ).rejects.toThrow();
    });

    it("should handle API returning undefined content", async () => {
      const mockCreate = vi.fn().mockResolvedValue({});

      const MockAnthropicConstructor = Anthropic as unknown as vi.Mock;
      MockAnthropicConstructor.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      }));

      const program = Effect.gen(function* () {
        const service = yield* CoderServiceTag;
        return yield* service.execute("session-123", "Undefined content");
      });

      await expect(
        Effect.runPromise(program.pipe(Effect.provide(CoderServiceLive)))
      ).rejects.toThrow();
    });
  });

  describe("Layer integration", () => {
    it("should create service with environment variables", async () => {
      const program = Effect.gen(function* () {
        const service = yield* CoderServiceTag;
        const result1 = yield* service.createSession("layer-test");
        return result1;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(CoderServiceLive))
      );

      expect(result).toBe("✅ Created Claude Session: layer-test");
      expect(Anthropic).toHaveBeenCalledWith({
        apiKey: mockApiKey,
      });
    });

    it("should allow multiple service calls in same Effect program", async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "Response" }],
      });

      const MockAnthropicConstructor = Anthropic as unknown as vi.Mock;
      MockAnthropicConstructor.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      }));

      const program = Effect.gen(function* () {
        const service = yield* CoderServiceTag;
        const session = yield* service.createSession("multi-call");
        const result1 = yield* service.execute("session-1", "First call");
        const result2 = yield* service.execute("session-2", "Second call");
        return { session, result1, result2 };
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(CoderServiceLive))
      );

      expect(result.session).toBe("✅ Created Claude Session: multi-call");
      expect(result.result1).toBe("Response");
      expect(result.result2).toBe("Response");
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it("should work with custom Layer composition", async () => {
      const customLayer = Layer.succeed(CoderServiceTag, {
        createSession: (name) => Effect.succeed(`Custom session: ${name}`),
        execute: (_sessionId, instruction) =>
          Effect.succeed(`Custom response for: ${instruction}`),
      });

      const program = Effect.gen(function* () {
        const service = yield* CoderServiceTag;
        const session = yield* service.createSession("custom");
        const result = yield* service.execute("id", "test");
        return { session, result };
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(customLayer))
      );

      expect(result.session).toBe("Custom session: custom");
      expect(result.result).toBe("Custom response for: test");
    });
  });
});
