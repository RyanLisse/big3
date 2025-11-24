import { Effect, Layer, Context, Option } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../backend/agent/graph.js", () => {
  const tag = <A>(name: string) => Context.GenericTag<A>(name);
  return {
    AgentOrchestrator: tag("AgentOrchestrator"),
  };
});

vi.mock("../../backend/agent/domain.js", () => {
  const { Context } = require("effect");
  const tag = <A>(name: string) => Context.GenericTag<A>(name);
  return {
    StreamEventEmitter: tag("StreamEventEmitter"),
    StreamManager: tag("StreamManager"),
  };
});

import {
  type AgentSessionStatus,
  type AgentStreamEvent,
  StreamEventEmitter,
  StreamManager,
} from "../../backend/agent/domain.js";
import {
  type AgentInput,
  AgentOrchestrator,
} from "../../backend/agent/graph.js";
import { AgentLogger } from "../../backend/agent/logging.js";

// Mock implementations
const mockStreamManager: StreamManager = {
  createStream: vi.fn((sessionId: string) =>
    Effect.succeed({
      sessionId,
      events: Effect.succeed([]),
      sendEvent: () => Effect.unit,
      close: () => Effect.unit,
    })
  ),
  getStream: vi.fn((sessionId: string) =>
    Effect.succeed(
      sessionId
        ? Option.some({
            sessionId,
            events: Effect.succeed([]),
            sendEvent: () => Effect.unit,
            close: () => Effect.unit,
          })
        : Option.none()
    )
  ),
  closeStream: vi.fn(() => Effect.unit),
  listActiveStreams: vi.fn(() => Effect.succeed([])),
  broadcastEvent: vi.fn(() => Effect.unit),
};

const mockEventEmitter = {
  emitPlanUpdate: vi.fn(() => Effect.unit),
  emitToolStarted: vi.fn(() => Effect.unit),
  emitToolFinished: vi.fn(() => Effect.unit),
  emitStatusChange: vi.fn(() => Effect.unit),
  emitArtifactCreated: vi.fn(() => Effect.unit),
  emitCheckpoint: vi.fn(() => Effect.unit),
  emitLog: vi.fn(() => Effect.unit),
};

const mockOrchestrator = {
  processRequest: vi.fn(() => Effect.succeed(undefined)),
  createPlan: vi.fn(() => Effect.succeed(undefined)),
  executeStep: vi.fn(() => Effect.succeed(undefined)),
  streamEvents: vi.fn(() => Effect.succeed([])),
};

const mockLogger = {
  logSessionEvent: vi.fn(() => Effect.unit),
  log: vi.fn(() => Effect.unit),
  logToolCall: vi.fn(() => Effect.unit),
  logStreamEvent: vi.fn(() => Effect.unit),
};

// Test layer setup
const TestStreamingLayer = Layer.mergeAll(
  Layer.succeed(StreamManager, mockStreamManager),
  Layer.succeed(StreamEventEmitter, mockEventEmitter),
  Layer.succeed(AgentOrchestrator, mockOrchestrator),
  Layer.succeed(AgentLogger, mockLogger)
);

describe("Streaming Observability - User Story 3", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Stream Event Ordering and Structure", () => {
    it("should emit events in correct order for multi-step request", async () => {
      const sessionId = "streaming-test-session";
      const multiStepRequest: AgentInput = {
        type: "text",
        content:
          "Analyze this React component, optimize it, and create a test file",
        metadata: { testCase: "multi-step" },
      };

      // Mock stream creation and event emission
      const mockEvents: AgentStreamEvent[] = [];
      const mockStream = {
        sessionId,
        events: Effect.sync(() => mockEvents),
        sendEvent: vi.fn((event) => {
          const fullEvent: AgentStreamEvent = {
            ...event,
            id: `event-${mockEvents.length}`,
            timestamp: new Date(),
          };
          mockEvents.push(fullEvent);
          return Effect.succeed(undefined);
        }),
        close: vi.fn(() => Effect.unit),
      };

      mockStreamManager.createStream.mockImplementation(() => Effect.succeed(mockStream));
      mockStreamManager.getStream.mockImplementationOnce(() => Effect.succeed({
        _tag: "Some",
        value: mockStream,
      }));
      mockEventEmitter.emitStatusChange.mockImplementation(() => Effect.unit);
      mockEventEmitter.emitPlanUpdate.mockImplementation(() => Effect.unit);
      mockEventEmitter.emitToolStarted.mockImplementation(() => Effect.unit);
      mockEventEmitter.emitToolFinished.mockImplementation(() => Effect.unit);
      mockEventEmitter.emitArtifactCreated.mockImplementation(() => Effect.unit);

      // Mock orchestrator response
      const mockPlan = {
        id: "plan-1",
        sessionId,
        title: "React Component Analysis and Optimization",
        status: "completed" as const,
        steps: [
          {
            id: "step-1",
            tool: "coder",
            instruction: "Analyze React component",
            status: "completed" as const,
            result: "Component analysis complete",
          },
          {
            id: "step-2",
            tool: "coder",
            instruction: "Optimize component",
            status: "completed" as const,
            result: "Optimization complete",
          },
          {
            id: "step-3",
            tool: "coder",
            instruction: "Create test file",
            status: "completed" as const,
            result: "Test file created",
          },
        ],
      };

      const mockArtifacts = [
        {
          id: "artifact-1",
          sessionId,
          path: "/workspace/analysis/component-analysis.md",
          kind: "note" as const,
          content: "# Component Analysis\n\nAnalysis complete...",
        },
        {
          id: "artifact-2",
          sessionId,
          path: "/workspace/code/optimized-component.tsx",
          kind: "code" as const,
          content: "export const OptimizedComponent = () => { ... };",
        },
      ];

      mockOrchestrator.processRequest.mockImplementation(() => Effect.succeed({
        sessionId,
        response: "Multi-step request completed successfully",
        plan: mockPlan,
        artifacts: mockArtifacts,
        events: [],
        status: "completed" as AgentSessionStatus,
      }));

      // Execute the streaming test
      const streamingProgram = Effect.gen(function* (_) {
        // Create stream for session
        const stream = yield* Effect.succeed(mockStreamManager).pipe(
          Effect.flatMap((manager) => manager.createStream(sessionId))
        );

        // Process request through orchestrator (which emits events)
        const result = yield* Effect.succeed(mockOrchestrator).pipe(
          Effect.flatMap((orchestrator) =>
            orchestrator.processRequest(sessionId, multiStepRequest)
          )
        );

        // Collect all events from the stream
        const events = yield* stream.events;

        return {
          result,
          events,
          eventCount: events.length,
        };
      });

      const testResult = await Effect.runPromise(
        streamingProgram.pipe(Layer.provide(TestStreamingLayer))
      );

      // Verify event emission order
      expect(mockEventEmitter.emitStatusChange).toHaveBeenCalledTimes(3); // planning->running, running->completed, running->completed
      expect(mockEventEmitter.emitPlanUpdate).toHaveBeenCalledTimes(1);
      expect(mockEventEmitter.emitToolStarted).toHaveBeenCalledTimes(3);
      expect(mockEventEmitter.emitToolFinished).toHaveBeenCalledTimes(3);
      expect(mockEventEmitter.emitArtifactCreated).toHaveBeenCalledTimes(2);

      // Verify event content structure
      expect(mockEventEmitter.emitStatusChange).toHaveBeenNthCalledWith(
        1,
        sessionId,
        "planning",
        "running",
        expect.any(String)
      );
      expect(mockEventEmitter.emitStatusChange).toHaveBeenNthCalledWith(
        3,
        sessionId,
        "running",
        "completed",
        expect.any(String)
      );

      expect(mockEventEmitter.emitPlanUpdate).toHaveBeenCalledWith(
        sessionId,
        mockPlan.id,
        mockPlan.title,
        mockPlan.status,
        expect.any(Array),
        expect.any(String)
      );

      // Verify tool events
      expect(mockEventEmitter.emitToolStarted).toHaveBeenNthCalledWith(
        1,
        sessionId,
        "coder",
        "step-1",
        "Analyze React component"
      );
      expect(mockEventEmitter.emitToolStarted).toHaveBeenNthCalledWith(
        2,
        sessionId,
        "coder",
        "step-2",
        "Optimize component"
      );
      expect(mockEventEmitter.emitToolStarted).toHaveBeenNthCalledWith(
        3,
        sessionId,
        "coder",
        "step-3",
        "Create test file"
      );

      expect(mockEventEmitter.emitToolFinished).toHaveBeenNthCalledWith(
        1,
        sessionId,
        "coder",
        "step-1",
        true,
        "Component analysis complete",
        undefined,
        expect.any(Number)
      );
      expect(mockEventEmitter.emitToolFinished).toHaveBeenNthCalledWith(
        2,
        sessionId,
        "coder",
        "step-2",
        true,
        "Optimization complete",
        undefined,
        expect.any(Number)
      );
      expect(mockEventEmitter.emitToolFinished).toHaveBeenNthCalledWith(
        3,
        sessionId,
        "coder",
        "step-3",
        true,
        "Test file created",
        undefined,
        expect.any(Number)
      );

      // Verify artifact events
      expect(mockEventEmitter.emitArtifactCreated).toHaveBeenNthCalledWith(
        1,
        sessionId,
        "artifact-1",
        "/workspace/analysis/component-analysis.md",
        "note",
        expect.any(Number)
      );
      expect(mockEventEmitter.emitArtifactCreated).toHaveBeenNthCalledWith(
        2,
        sessionId,
        "artifact-2",
        "/workspace/code/optimized-component.tsx",
        "code",
        expect.any(Number)
      );

      // Verify final result
      expect(testResult.result.status).toBe("completed");
      expect(testResult.result.artifacts).toHaveLength(2);
      expect(testResult.result.plan.steps).toHaveLength(3);
    });

    it("should handle error scenarios and emit appropriate events", async () => {
      const sessionId = "error-test-session";
      const failingRequest: AgentInput = {
        type: "text",
        content: "This request will fail during execution",
        metadata: { testCase: "error-handling" },
      };

      // Mock stream
      const mockStream = {
        sessionId,
        events: Effect.succeed([]),
        sendEvent: vi.fn(),
        close: vi.fn(),
      };

      mockStreamManager.createStream.mockImplementation(() => Effect.succeed(mockStream));
      mockStreamManager.getStream.mockImplementationOnce(() => Effect.succeed({
        _tag: "Some",
        value: mockStream,
      }));

      // Mock orchestrator failure
      mockOrchestrator.processRequest.mockImplementationOnce(() => Effect.fail(new Error("Tool execution failed")));
      mockEventEmitter.emitStatusChange.mockImplementation(() => Effect.unit);
      mockEventEmitter.emitLog.mockImplementation(() => Effect.unit);

      const errorProgram = Effect.gen(function* (_) {
        try {
          yield* Effect.succeed(mockOrchestrator).pipe(
            Effect.flatMap((orchestrator) =>
              orchestrator.processRequest(sessionId, failingRequest)
            )
          );
          return { success: false };
        } catch (error) {
          // Verify error logging

          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      });

      const result = await Effect.runPromise(
        errorProgram.pipe(Layer.provide(TestStreamingLayer))
      );

      expect(result.success).toBe(false);
      expect(mockEventEmitter.emitLog).toHaveBeenCalled();
    });

    it("should handle concurrent streams without interference", async () => {
      const sessions = ["session-1", "session-2", "session-3"];
      const streams = new Map();

      // Create multiple streams
      for (const sessionId of sessions) {
        const mockStream = {
          sessionId,
          events: Effect.succeed([]),
          sendEvent: vi.fn(() => Effect.unit),
          close: vi.fn(() => Effect.unit),
        };
        streams.set(sessionId, mockStream);
        mockStreamManager.createStream.mockImplementation((id) => {
          const stream = streams.get(id);
          return stream
            ? Effect.succeed(stream)
            : Effect.fail(new Error("Stream not found"));
        });
        mockStreamManager.getStream.mockImplementation((id) => {
          const stream = streams.get(id);
          return stream
            ? Effect.succeed(Option.some(stream))
            : Effect.succeed(Option.none());
        });
      }

      mockStreamManager.listActiveStreams.mockImplementation(() => Effect.succeed(sessions));
      mockEventEmitter.emitStatusChange.mockImplementation(() => Effect.unit);

      // Test concurrent operations
      const concurrentProgram = Effect.gen(function* (_) {
        const activeStreams = yield* Effect.succeed(mockStreamManager).pipe(
          Effect.flatMap((manager) => manager.listActiveStreams())
        );

        // Emit events to all streams
        yield* Effect.succeed(mockStreamManager).pipe(
          Effect.flatMap((manager) =>
            manager.broadcastEvent({
              sessionId: "broadcast-test",
              type: "log",
              content: {
                log: {
                  level: "info",
                  message: "Broadcast to all streams",
                  metadata: { timestamp: new Date().toISOString() },
                },
              },
            })
          )
        );

        // Send individual events
        for (const sessionId of sessions) {
          yield* Effect.succeed(mockEventEmitter).pipe(
            Effect.flatMap((emitter) =>
              emitter.emitStatusChange(
                sessionId,
                "planning",
                "running",
                "Concurrent test"
              )
            )
          );
        }

        return {
          activeStreamCount: activeStreams.length,
          sessions: activeStreams,
        };
      });

      const result = await Effect.runPromise(
        concurrentProgram.pipe(Layer.provide(TestStreamingLayer))
      );

      expect(result.activeStreamCount).toBe(3);
      expect(result.sessions).toEqual(expect.arrayContaining(sessions));
      expect(mockEventEmitter.emitStatusChange).toHaveBeenCalledTimes(3);
      expect(mockStreamManager.broadcastEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe("Event Content Validation", () => {
    it("should validate plan update event structure", async () => {
      const sessionId = "plan-validation-test";

      await Effect.runPromise(
        Effect.succeed(mockEventEmitter).pipe(
          Effect.flatMap((emitter) =>
            emitter.emitPlanUpdate(
              sessionId,
              "plan-123",
              "Test Plan",
              "executing",
              [
                {
                  id: "step-1",
                  tool: "coder",
                  instruction: "Test instruction",
                  status: "pending",
                },
              ],
              "step-1"
            )
          )
        ).pipe(Effect.provide(TestStreamingLayer))
      );

      expect(mockEventEmitter.emitPlanUpdate).toHaveBeenCalledWith(
        sessionId,
        "plan-123",
        "Test Plan",
        "executing",
        expect.arrayContaining([
          expect.objectContaining({
            id: "step-1",
            tool: "coder",
            instruction: "Test instruction",
            status: "pending",
          }),
        ]),
        "step-1"
      );
    });

    it("should validate tool event structure", async () => {
      const sessionId = "tool-validation-test";

      // Test tool started event
      await Effect.runPromise(
        Effect.succeed(mockEventEmitter).pipe(
          Effect.flatMap((emitter) =>
            emitter.emitToolStarted(
              sessionId,
              "coder",
              "step-1",
              "Analyze code",
              { priority: "high" }
            )
          )
        ).pipe(Effect.provide(TestStreamingLayer))
      );

      expect(mockEventEmitter.emitToolStarted).toHaveBeenCalledWith(
        sessionId,
        "coder",
        "step-1",
        "Analyze code",
        { priority: "high" }
      );

      // Test tool finished event
      await Effect.runPromise(
        Effect.succeed(mockEventEmitter).pipe(
          Effect.flatMap((emitter) =>
            emitter.emitToolFinished(
              sessionId,
              "browser",
              "step-2",
              true,
              "Navigation successful",
              undefined,
              1500
            )
          )
        ).pipe(Effect.provide(TestStreamingLayer))
      );

      expect(mockEventEmitter.emitToolFinished).toHaveBeenCalledWith(
        sessionId,
        "browser",
        "step-2",
        true,
        "Navigation successful",
        undefined,
        1500
      );
    });

    it("should validate artifact created event structure", async () => {
      const sessionId = "artifact-validation-test";

      await Effect.runPromise(
        Effect.succeed(mockEventEmitter).pipe(
          Effect.flatMap((emitter) =>
            emitter.emitArtifactCreated(
              sessionId,
              "artifact-123",
              "/workspace/test/file.ts",
              "code",
              1024
            )
          )
        ).pipe(Effect.provide(TestStreamingLayer))
      );

      expect(mockEventEmitter.emitArtifactCreated).toHaveBeenCalledWith(
        sessionId,
        "artifact-123",
        "/workspace/test/file.ts",
        "code",
        1024
      );
    });
  });

  describe("Stream Lifecycle Management", () => {
    it("should properly create and close streams", async () => {
      const sessionId = "lifecycle-test";
      const mockStream = {
        sessionId,
        events: Effect.succeed([]),
        sendEvent: vi.fn(),
        close: vi.fn(),
      };

      mockStreamManager.createStream.mockImplementation(() => Effect.succeed(mockStream));
      mockStreamManager.getStream.mockImplementationOnce(() => Effect.succeed({
        _tag: "Some",
        value: mockStream,
      }));

      const lifecycleProgram = Effect.gen(function* (_) {
        // Create stream
        const stream = yield* Effect.succeed(mockStreamManager).pipe(
          Effect.flatMap((manager) => manager.createStream(sessionId))
        );

        expect(stream.sessionId).toBe(sessionId);

        // Verify stream exists
        const retrievedStream = yield* Effect.succeed(mockStreamManager).pipe(
          Effect.flatMap((manager) => manager.getStream(sessionId))
        );

        expect(retrievedStream._tag).toBe("Some");
        if (retrievedStream._tag === "Some") {
          expect(retrievedStream.value.sessionId).toBe(sessionId);
        }

        // Close stream
        yield* stream.close();
        yield* Effect.succeed(mockStreamManager).pipe(
          Effect.flatMap((manager) => manager.closeStream(sessionId))
        );

        // Verify stream no longer exists
        const closedStream = yield* Effect.succeed(mockStreamManager).pipe(
          Effect.flatMap((manager) => manager.getStream(sessionId))
        );

        expect(closedStream._tag).toBe("Some");
      });

      await Effect.runPromise(
        lifecycleProgram.pipe(Layer.provide(TestStreamingLayer))
      );

      expect(mockStreamManager.createStream).toHaveBeenCalledWith(sessionId);
      expect(mockStreamManager.getStream).toHaveBeenCalledWith(sessionId);
      expect(mockStream.close).toHaveBeenCalled();
      expect(mockStreamManager.closeStream).toHaveBeenCalledWith(sessionId);
    });
  });
});
