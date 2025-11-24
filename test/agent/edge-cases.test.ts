import { Effect, Either } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  generateId,
  safeJsonParse,
  safeJsonStringify,
  startTimer,
  validateSessionId,
  withTiming,
} from "../../backend/agent/shared/utils.js";

describe("Edge Case Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Timing Utilities Edge Cases", () => {
    it("should handle rapid timer operations", () => {
      const timers = [];

      // Create multiple timers rapidly
      for (let i = 0; i < 100; i++) {
        const timer = startTimer();
        timers.push(timer);

        // Advance time slightly
        vi.advanceTimersByTime(1);

        const elapsed = timer.elapsed();
        expect(elapsed).toBeGreaterThanOrEqual(1);
        expect(elapsed).toBeLessThan(100); // Should be reasonable
      }

      // All timers should be independent
      const elapsedTimes = timers.map((t) => t.elapsed());
      expect(new Set(elapsedTimes).size).toBeGreaterThan(50); // Most should be different
    });

    it("should handle withTiming with failing effects", async () => {
      const mockEffect = Effect.fail(new Error("Test error"));
      const timingCallback = vi.fn();

      const result = await Effect.runPromise(
        Effect.either(withTiming(mockEffect, timingCallback))
      );

      expect(Either.isLeft(result)).toBe(true);
      expect(timingCallback).not.toHaveBeenCalled();
    });

    it("should handle withTiming with zero duration", async () => {
      const mockEffect = Effect.succeed("test");
      const timingCallback = vi.fn();

      const result = await Effect.runPromise(
        withTiming(mockEffect, timingCallback)
      );

      expect(result).toBe("test");
      expect(timingCallback).toHaveBeenCalledWith(0); // Should be called with 0 or very small duration
    });

    it("should handle concurrent timing operations", async () => {
      const mockEffect = Effect.succeed("test");
      const timingCallbacks = Array.from({ length: 10 }, () => vi.fn());

      // Run multiple timing operations concurrently
      const promises = timingCallbacks.map((callback) =>
        Effect.runPromise(withTiming(mockEffect, callback))
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(results.every((r) => r === "test")).toBe(true);
      expect(timingCallbacks.every((cb) => cb.mock.calls.length > 0)).toBe(
        true
      );
    });
  });

  describe("ID Generation Edge Cases", () => {
    it("should handle large number of ID generations", () => {
      const ids = new Set<string>();
      const numIds = 10_000;

      for (let i = 0; i < numIds; i++) {
        const id = generateId("test");
        expect(ids.has(id)).toBe(false);
        ids.add(id);
      }

      expect(ids.size).toBe(numIds);
    });

    it("should handle different prefix types", () => {
      const prefixes = [
        "",
        "a",
        "test-123",
        "very_long_prefix_with_numbers_123",
      ];

      for (const prefix of prefixes) {
        const id = generateId(prefix);
        expect(id).toBeTruthy();
        expect(typeof id).toBe("string");
        expect(id.length).toBeGreaterThan(0);

        if (prefix) {
          expect(id.startsWith(`${prefix}_`)).toBe(true);
        }
  }
    });

    it("should generate IDs with consistent length", () => {
      const ids = Array.from({ length: 100 }, () => generateId("test"));
      const lengths = ids.map((id) => id.length);

      // All IDs should have similar length (within reasonable variance)
      const minLength = Math.min(...lengths);
      const maxLength = Math.max(...lengths);
      expect(maxLength - minLength).toBeLessThan(5); // Less than 5 characters difference
    });
  });

  describe("Validation Edge Cases", () => {
    it("should handle extreme session ID values", () => {
      const validIds = [
        "a",
        "a".repeat(1000),
        "1234567890",
        "abcdefghijklmnopqrstuvwxyz",
        "ABC-def_123",
        "test-with-many-dashes-and-underscores-and-numbers-123",
      ];

      for (const id of validIds) {
        const result = Effect.runSync(validateSessionId(id));
        expect(result).toBe(id);
  }
    });

    it("should reject invalid session IDs", () => {
      const invalidIds = [
        "",
        " ",
        "test@domain",
        "test#123",
        "test space",
        "test\nnewline",
        "test\ttab",
        "test\x00null",
      ];

      for (const id of invalidIds) {
        const result = Effect.runSync(Effect.either(validateSessionId(id)));
        expect(Either.isLeft(result)).toBe(true);
  }
    });

    it("should handle JSON parsing edge cases", async () => {
      const testCases = [
        { input: "{}", expected: {} },
        { input: "[]", expected: [] },
        { input: '{"key":"value"}', expected: { key: "value" } },
        { input: '"string"', expected: "string" },
        { input: "123", expected: 123 },
        { input: "true", expected: true },
        { input: "false", expected: false },
        { input: "null", expected: null },
      ];

      for (const testCase of testCases) {
        const result = await Effect.runPromise(
          safeJsonParse(testCase.input, "test")
        );
        expect(result).toEqual(testCase.expected);
      }
    });

    it("should handle JSON parsing failures gracefully", async () => {
      const invalidInputs = ["", "{", "[", "invalid", '{"key": "value"'];

      for (const input of invalidInputs) {
        const result = await Effect.runPromise(
          Effect.either(safeJsonParse(input, "test"))
        );
        expect(Either.isLeft(result)).toBe(true);
      }
    });
  });

  describe("Concurrent Operations Edge Cases", () => {
    it("should handle concurrent ID generation without collisions", async () => {
      const promises = Array.from({ length: 1000 }, () =>
        Effect.runPromise(Effect.sync(() => generateId("concurrent")))
      );

      const ids = await Promise.all(promises);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should handle concurrent validation operations", async () => {
      const testId = "test-session-123";
      const promises = Array.from({ length: 100 }, () =>
        Effect.runPromise(validateSessionId(testId))
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(100);
      expect(results.every((r) => r === testId)).toBe(true);
    });
  });

  describe("Memory and Performance Edge Cases", () => {
    it("should not leak memory with repeated operations", () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many operations
      for (let i = 0; i < 10_000; i++) {
        generateId("memory-test");
        const timer = startTimer();
        timer.elapsed();

        // Force garbage collection if available
        if (typeof globalThis !== "undefined" && (globalThis as any).gc) {
          (globalThis as any).gc();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it("should handle large JSON payloads", async () => {
      const largeObject = {
        data: Array.from({ length: 10_000 }, (_, i) => ({
          id: i,
          name: `item-${i}`,
          description: "A".repeat(100),
          metadata: {
            created: new Date(),
            tags: [`tag-${i}`, `category-${i % 10}`],
          },
        })),
      };

      const jsonString = await Effect.runPromise(
        safeJsonStringify(largeObject, "large-object")
      );

      expect(jsonString).toBeTruthy();
      expect(typeof jsonString).toBe("string");
      expect(jsonString.length).toBeGreaterThan(1_000_000); // Should be > 1MB

      const parsed = await Effect.runPromise(
        safeJsonParse(jsonString, "large-object")
      );

      expect(parsed.data).toHaveLength(10_000);
      expect(parsed.data[0].id).toBe(0);
    });
  });
});
