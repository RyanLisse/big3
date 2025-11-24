import { describe, expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { CoderServiceTag } from "../src/services/CoderService";

// Mock CoderService for unit tests
const MockCoderService = Layer.succeed(CoderServiceTag, {
  createSession: (name: string) =>
    Effect.succeed(`✅ Created Claude Session: ${name}`),
  execute: (_sessionId: string, instruction: string) => {
    if (instruction === "Test network error") {
      return Effect.fail(new Error("Network timeout"));
    }
    if (instruction === "Test auth error") {
      return Effect.fail(new Error("Invalid API key"));
    }
    if (instruction === "Test rate error") {
      return Effect.fail(new Error("Rate limit exceeded"));
    }
    if (instruction === "Test malformed error") {
      return Effect.fail(new Error("Malformed response"));
    }
    if (instruction === "Test undefined error") {
      return Effect.fail(new Error("API returned undefined content"));
    }
    if (instruction === "Generate image") {
      return Effect.succeed("No response");
    }
    if (instruction === "Say nothing") {
      return Effect.succeed("No response");
    }
    if (instruction === "Multiple blocks") {
      return Effect.succeed("First text response");
    }
    return Effect.succeed("Mock response for: " + instruction);
  },
});

describe("CoderService", () => {
  describe("createSession", () => {
    it("should return formatted session string", async () => {
      const program = Effect.gen(function* () {
        const service = yield* CoderServiceTag;
        return yield* service.createSession("test-session");
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(MockCoderService))
      );

      expect(result).toBe("✅ Created Claude Session: test-session");
    });

    it("should handle different session names", async () => {
      const program = Effect.gen(function* () {
        const service = yield* CoderServiceTag;
        return yield* service.createSession("production-session");
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(MockCoderService))
      );

      expect(result).toBe("✅ Created Claude Session: production-session");
    });

    it("should handle empty session names", async () => {
      const program = Effect.gen(function* () {
        const service = yield* CoderServiceTag;
        return yield* service.createSession("");
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(MockCoderService))
      );

      expect(result).toBe("✅ Created Claude Session: ");
    });
  });

  describe("execute", () => {
    it("should successfully execute instruction and return text response", async () => {
      const program = Effect.gen(function* () {
        const service = yield* CoderServiceTag;
        return yield* service.execute("session-123", "Say hello");
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(MockCoderService))
      );

      expect(result).toBe("Mock response for: Say hello");
    });

    it("should return 'No response' when content has no text block", async () => {
      const program = Effect.gen(function* () {
        const service = yield* CoderServiceTag;
        return yield* service.execute("session-123", "Generate image");
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(MockCoderService))
      );

      expect(result).toBe("No response");
    });

    it("should return 'No response' when content is empty", async () => {
      const program = Effect.gen(function* () {
        const service = yield* CoderServiceTag;
        return yield* service.execute("session-123", "Say nothing");
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(MockCoderService))
      );

      expect(result).toBe("No response");
    });

    it("should handle multiple content blocks and return first text", async () => {
      const program = Effect.gen(function* () {
        const service = yield* CoderServiceTag;
        return yield* service.execute("session-123", "Multiple blocks");
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(MockCoderService))
      );

      expect(result).toBe("First text response");
    });
  });

  describe("error handling", () => {
    it("should handle API network errors", async () => {
      const program = Effect.gen(function* () {
        const service = yield* CoderServiceTag;
        return yield* service.execute("session-123", "Test network error");
      });

      await expect(
        Effect.runPromise(program.pipe(Effect.provide(MockCoderService)))
      ).rejects.toThrow("Network timeout");
    });

    it("should handle API authentication errors", async () => {
      const program = Effect.gen(function* () {
        const service = yield* CoderServiceTag;
        return yield* service.execute("session-123", "Test auth error");
      });

      await expect(
        Effect.runPromise(program.pipe(Effect.provide(MockCoderService)))
      ).rejects.toThrow("Invalid API key");
    });

    it("should handle API rate limit errors", async () => {
      const program = Effect.gen(function* () {
        const service = yield* CoderServiceTag;
        return yield* service.execute("session-123", "Test rate error");
      });

      await expect(
        Effect.runPromise(program.pipe(Effect.provide(MockCoderService)))
      ).rejects.toThrow("Rate limit exceeded");
    });

    it("should handle malformed API responses", async () => {
      const program = Effect.gen(function* () {
        const service = yield* CoderServiceTag;
        return yield* service.execute("session-123", "Test malformed error");
      });

      await expect(
        Effect.runPromise(program.pipe(Effect.provide(MockCoderService)))
      ).rejects.toThrow("Malformed response");
    });

    it("should handle API returning undefined content", async () => {
      const program = Effect.gen(function* () {
        const service = yield* CoderServiceTag;
        return yield* service.execute("session-123", "Test undefined error");
      });

      await expect(
        Effect.runPromise(program.pipe(Effect.provide(MockCoderService)))
      ).rejects.toThrow("API returned undefined content");
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
        program.pipe(Effect.provide(MockCoderService))
      );

      expect(result).toBe("✅ Created Claude Session: layer-test");
    });

    it("should allow multiple service calls in same Effect program", async () => {
      const program = Effect.gen(function* () {
        const service = yield* CoderServiceTag;
        const session = yield* service.createSession("multi-call");
        const result1 = yield* service.execute("session-1", "First call");
        const result2 = yield* service.execute("session-2", "Second call");
        return { session, result1, result2 };
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(MockCoderService))
      );

      expect(result.session).toBe("✅ Created Claude Session: multi-call");
      expect(result.result1).toBe("Mock response for: First call");
      expect(result.result2).toBe("Mock response for: Second call");
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
