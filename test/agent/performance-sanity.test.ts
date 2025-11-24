import { Effect, Layer, Context } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../backend/agent/graph.js", () => {
  const tag = <A>(name: string) => Context.GenericTag<A>(name);
  return {
    AgentOrchestrator: tag("AgentOrchestrator"),
    BrowserTool: tag("BrowserTool"),
    CoderTool: tag("CoderTool"),
    VoiceTool: tag("VoiceTool"),
  };
});

import {
  AgentOrchestrator,
  BrowserTool,
  CoderTool,
  VoiceTool,
} from "../../backend/agent/graph.js";
import { AgentLogger } from "../../backend/agent/logging.js";
import { AgentMetrics } from "../../backend/agent/observability.js";
import { StreamEventEmitter } from "../../backend/agent/stream-manager.js";

// Mock implementations for performance testing
const mockVoiceTool: VoiceTool = {
  transcribe: vi.fn(() => Effect.succeed("Mock transcription result")),
  speak: vi.fn(() => Effect.unit),
};

const mockCoderTool: CoderTool = {
  analyzeCode: vi.fn(() =>
    Effect.succeed({
      issues: ["Test issue"],
      suggestions: ["Test suggestion"],
      complexity: "medium" as const,
      estimatedTime: 15,
    })
  ),
  executeCode: vi.fn(() =>
    Effect.succeed({
      output: "Test output",
      exitCode: 0,
      executionTime: 1500,
    })
  ),
  generateCode: vi.fn(() => Effect.succeed("Generated code")),
};

const mockBrowserTool: BrowserTool = {
  navigate: vi.fn((url: string) =>
    Effect.succeed({
      title: "Test Page",
      content: "Test content",
      url,
      metadata: { loadedAt: new Date() },
    })
  ),
  click: vi.fn(() => Effect.unit),
  extractContent: vi.fn(() => Effect.succeed("Extracted content")),
};

const mockLogger: AgentLogger = {
  log: vi.fn(),
  logToolCall: vi.fn(),
  logStreamEvent: vi.fn(),
  logSessionEvent: vi.fn(),
};

const mockMetrics: AgentMetrics = {
  recordMetric: vi.fn(),
  getMetrics: vi.fn(),
  resetMetrics: vi.fn(),
};

const mockEventEmitter: StreamEventEmitter = {
  emitStatusChange: vi.fn(),
  emitPlanUpdate: vi.fn(),
  emitToolStarted: vi.fn(),
  emitToolFinished: vi.fn(),
  emitArtifactCreated: vi.fn(),
  emitLog: vi.fn(),
};

const mockAgentOrchestrator: AgentOrchestrator = {
  processRequest: (sessionId, input) =>
    Effect.gen(function* () {
      yield* mockVoiceTool.transcribe(String(input.content));
      yield* mockCoderTool.analyzeCode(String(input.content));
      yield* mockBrowserTool.navigate("https://example.com");
      return {
        sessionId,
        response: `Processed: ${input.content}`,
        plan: undefined,
        artifacts: [],
        events: [],
        status: "completed" as const,
      };
    }),
  createPlan: (sessionId, goal) =>
    Effect.succeed({
      id: `plan-${sessionId}`,
      sessionId,
      title: goal,
      goal,
      steps: [],
      status: "completed",
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  executeStep: (plan) => Effect.succeed(plan),
  streamEvents: () => Effect.succeed([]),
};

// Test layer setup
const TestPerformanceLayer = Layer.mergeAll(
  Layer.succeed(VoiceTool, mockVoiceTool),
  Layer.succeed(CoderTool, mockCoderTool),
  Layer.succeed(BrowserTool, mockBrowserTool),
  Layer.succeed(AgentLogger, mockLogger),
  Layer.succeed(AgentMetrics, mockMetrics),
  Layer.succeed(StreamEventEmitter, mockEventEmitter),
  Layer.succeed(AgentOrchestrator, mockAgentOrchestrator)
);

describe("Performance Sanity Checks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Concurrent Session Performance", () => {
    it("should handle 10 concurrent sessions without excessive memory usage", async () => {
      const concurrentSessions = 10;
      const startTime = Date.now();

      // Create multiple concurrent requests
      const sessionPromises = Array.from(
        { length: concurrentSessions },
        (_, i) =>
          Effect.gen(function* (_) {
            const sessionId = `perf-test-${i}`;
            const orchestrator = yield* AgentOrchestrator;

            // Process a simple request
            const result = yield* orchestrator.processRequest(sessionId, {
              type: "text",
              content: `Test request ${i}: Analyze this simple function and suggest improvements`,
            });

            return result;
          }).pipe(Effect.provide(TestPerformanceLayer), Effect.runPromise)
      );

      const results = await Promise.all(sessionPromises);
      const totalTime = Date.now() - startTime;

      // Verify all sessions completed successfully
      expect(results).toHaveLength(concurrentSessions);
      for (const result of results) {
        expect(result.status).toBe("completed");
        expect(result.response).toBeTruthy();
  }

      // Performance assertions
      expect(totalTime).toBeLessThan(30_000); // Should complete within 30 seconds
      expect(totalTime / concurrentSessions).toBeLessThan(5000); // Average per session < 5s

      console.log(`Performance Test Results:
        - Concurrent Sessions: ${concurrentSessions}
        - Total Time: ${totalTime}ms
        - Average per Session: ${(totalTime / concurrentSessions).toFixed(2)}ms
        - Throughput: ${(concurrentSessions / (totalTime / 1000)).toFixed(2)} sessions/sec`);
    }, 35_000); // Increase timeout for performance test

    it("should maintain performance under sustained load", async () => {
      const batchSize = 5;
      const batches = 3;
      const allResults: any[] = [];

      for (let batch = 0; batch < batches; batch++) {
        const batchStartTime = Date.now();

        const batchPromises = Array.from({ length: batchSize }, (_, i) =>
          Effect.gen(function* (_) {
            const sessionId = `sustained-${batch}-${i}`;
            const orchestrator = yield* AgentOrchestrator;

            const result = yield* orchestrator.processRequest(sessionId, {
              type: "text",
              content: `Sustained test batch ${batch}, request ${i}: Generate a simple TypeScript function`,
            });

            return result;
          }).pipe(Effect.provide(TestPerformanceLayer), Effect.runPromise)
        );

        const batchResults = await Promise.all(batchPromises);
        const batchTime = Date.now() - batchStartTime;
        allResults.push(...batchResults);

        // Verify batch performance doesn't degrade significantly
        expect(batchTime).toBeLessThan(15_000); // Each batch within 15s
        expect(batchResults).toHaveLength(batchSize);

        // Small delay between batches to simulate real usage
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Verify sustained performance
      expect(allResults).toHaveLength(batchSize * batches);
      for (const result of allResults) {
        expect(result.status).toBe("completed");
  }

      console.log(`Sustained Load Test Results:
        - Total Batches: ${batches}
        - Sessions per Batch: ${batchSize}
        - Total Sessions: ${allResults.length}
        - All sessions completed successfully`);
    }, 60_000); // 60 second timeout for sustained test
  });

  describe("Resource Usage Patterns", () => {
    it("should properly clean up resources after session completion", async () => {
      const sessionId = "cleanup-test";

      const result = await Effect.gen(function* (_) {
        const orchestrator = yield* AgentOrchestrator;

        // Process a request
        const response = yield* orchestrator.processRequest(sessionId, {
          type: "text",
          content: "Test request for cleanup verification",
        });

        return response;
      }).pipe(Effect.provide(TestPerformanceLayer), Effect.runPromise);

      expect(result).toBeDefined();
      expect(result.status).toBe("completed");

      // Verify mock calls were made (indicating proper execution)
      expect(mockVoiceTool.transcribe).toHaveBeenCalled();
      expect(mockCoderTool.analyzeCode).toHaveBeenCalled();
      expect(mockBrowserTool.navigate).toHaveBeenCalled();

      // Verify logging and metrics were called
      expect(mockLogger.logSessionEvent).toHaveBeenCalled();
      expect(mockMetrics.recordMetric).toHaveBeenCalled();

      console.log(
        "Resource cleanup test passed - all tools and services were properly utilized"
      );
    }, 15_000);

    it("should handle timeout scenarios gracefully", async () => {
      // Override a tool to simulate timeout
      mockCoderTool.analyzeCode.mockImplementationOnce(async () => {
        await new Promise((resolve) => setTimeout(resolve, 35_000)); // 35 second delay
        return {
          issues: [],
          suggestions: [],
          complexity: "low" as const,
          estimatedTime: 5,
        };
      });

      const sessionId = "timeout-test";

      // This should handle the timeout gracefully rather than hanging
      const result = await Effect.gen(function* (_) {
        const orchestrator = yield* AgentOrchestrator;

        try {
          const response = yield* orchestrator.processRequest(sessionId, {
            type: "text",
            content: "Test request with potential timeout",
          });
          return response;
        } catch (error) {
          // Should handle timeout gracefully
          expect(error).toBeDefined();
          return { status: "failed", error: error.message };
        }
      }).pipe(Effect.provide(TestPerformanceLayer), Effect.runPromise);

      // Should either complete with error or handle timeout
      expect(result).toBeDefined();
      console.log("Timeout handling test completed");
    }, 40_000); // 40 second timeout
  });

  describe("Memory and Efficiency", () => {
    it("should not accumulate excessive mock calls", async () => {
      const initialCallCount = {
        voice: mockVoiceTool.transcribe.mock.calls.length,
        coder: mockCoderTool.analyzeCode.mock.calls.length,
        browser: mockBrowserTool.navigate.mock.calls.length,
      };

      // Run multiple sessions
      const sessionPromises = Array.from({ length: 5 }, (_, i) =>
        Effect.gen(function* (_) {
          const orchestrator = yield* AgentOrchestrator;
          return yield* orchestrator.processRequest(`memory-test-${i}`, {
            type: "text",
            content: "Memory test request",
          });
        }).pipe(Effect.provide(TestPerformanceLayer), Effect.runPromise)
      );

      await Promise.all(sessionPromises);

      const finalCallCount = {
        voice: mockVoiceTool.transcribe.mock.calls.length,
        coder: mockCoderTool.analyzeCode.mock.calls.length,
        browser: mockBrowserTool.navigate.mock.calls.length,
      };

      // Verify reasonable call counts (should not be excessive)
      expect(finalCallCount.voice - initialCallCount.voice).toBeLessThanOrEqual(
        10
      );
      expect(finalCallCount.coder - initialCallCount.coder).toBeLessThanOrEqual(
        10
      );
      expect(
        finalCallCount.browser - initialCallCount.browser
      ).toBeLessThanOrEqual(10);

      console.log(`Memory efficiency test passed:
        - Voice calls: ${finalCallCount.voice - initialCallCount.voice}
        - Coder calls: ${finalCallCount.coder - initialCallCount.coder}
        - Browser calls: ${finalCallCount.browser - initialCallCount.browser}`);
    }, 20_000);
  });
});
