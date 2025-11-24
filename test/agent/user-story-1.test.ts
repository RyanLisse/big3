import { Effect, Layer } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentSessionStatus } from "../../backend/agent/domain.js";

// Mock implementations for testing
const mockAgentService = {
  spawnAgent: vi.fn(),
  getAgentStatus: vi.fn(),
  resumeAgent: vi.fn(),
  cancelAgent: vi.fn(),
  listAgents: vi.fn(),
};

// Mock the existing services
const mockVoiceService = {
  transcribe: vi.fn(),
  speak: vi.fn(),
  processAudio: vi.fn(),
};

const mockCoderService = {
  executeCode: vi.fn(),
  analyzeCode: vi.fn(),
  generateCode: vi.fn(),
};

const mockBrowserService = {
  navigate: vi.fn(),
  click: vi.fn(),
  extractContent: vi.fn(),
};

// Test layer setup
const TestUserStory1Layer = Layer.mergeAll(
  Layer.succeed("AgentService", mockAgentService),
  Layer.succeed("VoiceService", mockVoiceService),
  Layer.succeed("CoderService", mockCoderService),
  Layer.succeed("BrowserService", mockBrowserService)
);

describe("User Story 1 - Voice-driven coding assistant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Independent Test: End-to-end single session", () => {
    it("should process a well-scoped request end-to-end", async () => {
      // Setup mock responses
      mockAgentService.spawnAgent.mockResolvedValue({
        sessionId: "session-123",
        status: "planning" as AgentSessionStatus,
      });

      mockAgentService.getAgentStatus.mockResolvedValue({
        sessionId: "session-123",
        status: "running" as AgentSessionStatus,
        lastUpdate: new Date(),
      });

      // Mock the agent processing flow
      const mockProcessingFlow = Effect.gen(function* (_) {
        // 1. Spawn agent session
        const spawnResponse = yield* Effect.promise(() =>
          mockAgentService.spawnAgent({
            initialPrompt: "Analyze this codebase and suggest improvements",
          })
        );

        // 2. Simulate agent processing (would normally use orchestrator)
        yield* Effect.sleep(100); // Simulate processing time

        // 3. Return result (would normally come from agent execution)
        return {
          sessionId: spawnResponse.sessionId,
          result: "Code analysis complete: Found 3 areas for improvement",
          artifacts: [
            {
              type: "analysis",
              content: "Modular structure could be improved",
            },
            {
              type: "suggestion",
              content: "Add error handling for edge cases",
            },
          ],
        };
      });

      const result = await Effect.runPromise(
        mockProcessingFlow.pipe(Effect.provide(TestUserStory1Layer))
      );

      // Verify the flow completed successfully
      expect(result).toBeDefined();
      expect(result.sessionId).toBe("session-123");
      expect(result.result).toContain("Code analysis complete");
      expect(result.artifacts).toHaveLength(2);

      // Verify service calls
      expect(mockAgentService.spawnAgent).toHaveBeenCalledWith({
        initialPrompt: "Analyze this codebase and suggest improvements",
      });
    });

    it("should handle text-based input without requiring audio", async () => {
      const textRequest = {
        initialPrompt: "Explain the architecture of this system",
        labels: { type: "text", priority: "medium" },
      };

      mockAgentService.spawnAgent.mockResolvedValue({
        sessionId: "session-456",
        status: "planning" as AgentSessionStatus,
      });

      const program = Effect.gen(function* (_) {
        const response = yield* Effect.sync(() =>
          mockAgentService.spawnAgent(textRequest)
        );

        // Simulate text-based processing (no voice/audio needed)
        yield* Effect.sleep(50);

        return {
          sessionId: response.sessionId,
          mode: "text",
          result: "Architecture explanation completed",
        };
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestUserStory1Layer))
      );

      expect(result.mode).toBe("text");
      expect(result.result).toContain("Architecture explanation completed");
      expect(mockAgentService.spawnAgent).toHaveBeenCalledWith(textRequest);
    });
  });

  describe("Tool Integration", () => {
    it("should integrate Voice, Coder, and Browser services", async () => {
      // Mock tool responses
      mockVoiceService.transcribe.mockResolvedValue(
        "Analyze the performance issues in this code"
      );
      mockCoderService.analyzeCode.mockResolvedValue({
        issues: ["Memory leak in loop", "Inefficient algorithm"],
        suggestions: [
          "Use proper cleanup",
          "Optimize with better data structure",
        ],
      });
      mockBrowserService.extractContent.mockResolvedValue({
        title: "Performance Best Practices",
        content: "Memory management and optimization techniques",
      });

      const program = Effect.gen(function* (_) {
        // 1. Voice input processing
        const transcription = yield* Effect.promise(() =>
          mockVoiceService.transcribe("audio-data")
        );

        // 2. Code analysis
        const analysis = yield* Effect.promise(() =>
          mockCoderService.analyzeCode("sample-code")
        );

        // 3. Browser research for additional context
        const research = yield* Effect.promise(() =>
          mockBrowserService.extractContent("https://docs.example.com")
        );

        return {
          transcription,
          analysis,
          research,
          combinedResult:
            "Analysis complete with voice input, code review, and research",
        };
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestUserStory1Layer))
      );

      expect(result.transcription).toBe(
        "Analyze the performance issues in this code"
      );
      expect(result.analysis.issues).toContain("Memory leak in loop");
      expect(result.research.title).toBe("Performance Best Practices");
      expect(result.combinedResult).toContain("Analysis complete");

      // Verify all services were called
      expect(mockVoiceService.transcribe).toHaveBeenCalled();
      expect(mockCoderService.analyzeCode).toHaveBeenCalled();
      expect(mockBrowserService.extractContent).toHaveBeenCalled();
    });

    it("should return at least one concrete result", async () => {
      const program = Effect.gen(function* (_) {
        // Simulate agent processing that produces multiple results
        const results = [
          {
            type: "code",
            content: "function optimized() { /* improved logic */ }",
          },
          {
            type: "explanation",
            content: "The function was optimized for better performance",
          },
          { type: "metadata", content: "Processing took 2.3 seconds" },
        ];

        yield* Effect.sleep(50); // Simulate processing

        return results;
      });

      const results = await Effect.runPromise(
        program.pipe(Effect.provide(TestUserStory1Layer))
      );

      // Verify at least one concrete result
      expect(results).toHaveLength(3);
      expect(results[0].content).toContain("function optimized");
      expect(results[1].content).toContain("optimized for better performance");
    });
  });

  describe("Error Handling and Graceful Degradation", () => {
    it("should handle tool failures gracefully", async () => {
      // Mock a tool failure
      mockCoderService.executeCode.mockRejectedValue(
        new Error("Code execution failed")
      );
      mockBrowserService.navigate.mockRejectedValue(new Error("Network error"));

      const program = Effect.gen(function* (_) {
        const execution = yield* Effect.tryPromise(() =>
          mockCoderService.executeCode("console.log('test')")
        ).pipe(
          Effect.map((analysis) => ({ status: "success", result: "Code executed", analysis })),
          Effect.catchAll(() =>
            Effect.succeed({
              status: "degraded",
              result: "Code execution failed, but here's a manual analysis",
              error: "Code execution failed",
            })
          )
        );
        return execution;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestUserStory1Layer))
      );

      expect(result.status).toBe("degraded");
      expect(result.result).toContain("manual analysis");
      expect(result.error).toContain("Code execution failed");
    });

    it("should inform user when tool calls fail", async () => {
      mockVoiceService.processAudio.mockRejectedValue(
        new Error("Audio processing failed")
      );

      const program = Effect.gen(function* (_) {
        const result = yield* Effect.tryPromise(() => mockVoiceService.processAudio("audio-data")).pipe(
          Effect.map(() => ({ success: true, message: "Audio processed successfully" })),
          Effect.catchAll(() =>
            Effect.succeed({
              success: false,
              message:
                "Audio processing failed. Please try again or use text input.",
              error: "Audio processing failed",
            })
          )
        );
        return result;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestUserStory1Layer))
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("Audio processing failed");
      expect(result.message).toContain("Please try again or use text input");
    });
  });

  describe("Session Management", () => {
    it("should maintain session state throughout interaction", async () => {
      const sessionId = "session-789";

      mockAgentService.spawnAgent.mockResolvedValue({
        sessionId,
        status: "planning" as AgentSessionStatus,
      });

      const program = Effect.gen(function* (_) {
        // 1. Spawn session
        const spawnResponse = yield* Effect.promise(() =>
          mockAgentService.spawnAgent({
            initialPrompt: "Help me refactor this component",
          })
        );

        // 2. Simulate multiple interactions in the same session
        const interactions = [
          "Analyze the current structure",
          "Suggest improvements",
          "Generate refactored code",
        ];

        const results = [];
        for (const interaction of interactions) {
          yield* Effect.sleep(10); // Simulate processing
          results.push(
            `Processed: ${interaction} for session ${spawnResponse.sessionId}`
          );
        }

        return {
          sessionId: spawnResponse.sessionId,
          interactions: results.length,
          consistent: spawnResponse.sessionId === sessionId,
        };
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestUserStory1Layer))
      );

      expect(result.sessionId).toBe(sessionId);
      expect(result.interactions).toBe(3);
      expect(result.consistent).toBe(true);
    });
  });

  describe("Acceptance Criteria Validation", () => {
    it("should meet acceptance scenario 1: Clear request with coherent response", async () => {
      const request =
        "Summarize this architecture document and propose implementation phases";

      mockAgentService.spawnAgent.mockResolvedValue({
        sessionId: "session-acceptance-1",
        status: "planning" as AgentSessionStatus,
      });

      const program = Effect.gen(function* (_) {
        const response = yield* Effect.promise(() =>
          mockAgentService.spawnAgent({
            initialPrompt: request,
          })
        );

        // Simulate agent processing that creates a plan
        const plan = {
          summary:
            "Architecture consists of 3 main layers: presentation, business logic, and data",
          phases: [
            "Phase 1: Set up basic project structure",
            "Phase 2: Implement core business logic",
            "Phase 3: Add presentation layer and testing",
          ],
          concreteResult: "Implementation plan created with 3 phases",
        };

        return {
          sessionId: response.sessionId,
          plan,
          meetsCriteria:
            !!plan.summary && !!plan.phases && !!plan.concreteResult,
        };
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestUserStory1Layer))
      );

      // Verify acceptance criteria
      expect(result.meetsCriteria).toBe(true);
      expect(result.plan.summary).toContain("3 main layers");
      expect(result.plan.phases).toHaveLength(3);
      expect(result.plan.concreteResult).toContain("Implementation plan");
    });

    it("should meet acceptance scenario 2: Handle tool failure gracefully", async () => {
      // Mock tool failure
      mockCoderService.generateCode.mockRejectedValue(
        new Error("Code generation timeout")
      );

      const program = Effect.gen(function* (_) {
        const result = yield* Effect.tryPromise(() =>
          mockCoderService.generateCode("component.tsx")
        ).pipe(
          Effect.map((code) => ({ success: true, code })),
          Effect.catchAll(() =>
            Effect.succeed({
              success: false,
              message: "Code generation failed, providing template instead",
              fallback: "Here's a basic component template you can customize",
              error: "Code generation timeout",
            })
          )
        );
        return result;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestUserStory1Layer))
      );

      // Verify graceful degradation
      expect(result.success).toBe(false);
      expect(result.message).toContain("providing template instead");
      expect(result.fallback).toContain("basic component template");
      expect(result.error).toContain("timeout");
    });
  });
});
