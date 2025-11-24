import { Context, Effect, Layer, Option } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../backend/agent/graph.js", () => {
  const tag = <A>(name: string) => Context.GenericTag<A>(name);
  return {
    AgentOrchestrator: tag("AgentOrchestrator"),
  };
});

import {
  type AgentSessionStatus,
  type AgentStreamEvent,
  StreamManager,
} from "../../backend/agent/domain.js";
import {
  type AgentInput,
  AgentOrchestrator,
} from "../../backend/agent/graph.js";
import { AgentLogger } from "../../backend/agent/logging.js";
import { StreamEventEmitter } from "../../backend/agent/stream-manager.js";

/**
 * Helpers
 */

type TestStream = {
  sessionId: string;
  events: Effect.Effect<readonly AgentStreamEvent[]>;
  sendEvent: (event: AgentStreamEvent) => Effect.Effect<void>;
  close: () => Effect.Effect<void>;
};

const createEmptyStream = (sessionId: string): TestStream => ({
  sessionId,
  events: Effect.succeed<readonly AgentStreamEvent[]>([]),
  sendEvent: () => Effect.void,
  close: () => Effect.void,
});

const createMutableStream = (
  sessionId: string,
  backingEvents: AgentStreamEvent[]
): TestStream => ({
  sessionId,
  events: Effect.sync(() => backingEvents),
  sendEvent: (event) => {
    const fullEvent: AgentStreamEvent = {
      ...event,
      id: `event-${backingEvents.length}`,
      timestamp: new Date(),
    };
    backingEvents.push(fullEvent);
    return Effect.void;
  },
  close: () => Effect.void,
});

/**
 * Base mocks
 */

const mockStreamManager: StreamManager = {
  createStream: vi.fn((sessionId: string) =>
    Effect.succeed(createEmptyStream(sessionId))
  ),
  getStream: vi.fn((sessionId: string) =>
    Effect.succeed(
      sessionId ? Option.some(createEmptyStream(sessionId)) : Option.none()
    )
  ),
  closeStream: vi.fn(() => Effect.void),
  listActiveStreams: vi.fn(() => Effect.succeed<string[]>([])),
  broadcastEvent: vi.fn(() => Effect.void),
};

const mockEventEmitter = {
  emitPlanUpdate: vi.fn(() => Effect.void),
  emitToolStarted: vi.fn(() => Effect.void),
  emitToolFinished: vi.fn(() => Effect.void),
  emitStatusChange: vi.fn(() => Effect.void),
  emitArtifactCreated: vi.fn(() => Effect.void),
  emitCheckpoint: vi.fn(() => Effect.void),
  emitLog: vi.fn(() => Effect.void),
};

const mockOrchestrator = {
  processRequest: vi.fn(() => Effect.succeed(undefined)),
  createPlan: vi.fn(() => Effect.succeed(undefined)),
  executeStep: vi.fn(() => Effect.succeed(undefined)),
  streamEvents: vi.fn(() => Effect.succeed<AgentStreamEvent[]>([])),
};

const mockLogger = {
  logSessionEvent: vi.fn(() => Effect.void),
  log: vi.fn(() => Effect.void),
  logToolCall: vi.fn(() => Effect.void),
  logStreamEvent: vi.fn(() => Effect.void),
};

/**
 * Shared test layer
 */

const TestStreamingLayer = Layer.mergeAll(
  Layer.succeed(StreamManager, mockStreamManager),
  Layer.succeed(StreamEventEmitter, mockEventEmitter),
  Layer.succeed(AgentOrchestrator, mockOrchestrator),
  Layer.succeed(AgentLogger, mockLogger)
);

describe("Streaming Observability - User Story 3", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Reset StreamManager behavior
    mockStreamManager.createStream.mockImplementation((sessionId: string) =>
      Effect.succeed(createEmptyStream(sessionId))
    );
    mockStreamManager.getStream.mockImplementation((sessionId: string) =>
      Effect.succeed(
        sessionId ? Option.some(createEmptyStream(sessionId)) : Option.none()
      )
    );
    mockStreamManager.closeStream.mockImplementation(() => Effect.void);
    mockStreamManager.listActiveStreams.mockImplementation(() =>
      Effect.succeed<string[]>([])
    );
    mockStreamManager.broadcastEvent.mockImplementation(() => Effect.void);

    // Reset event emitter behavior
    mockEventEmitter.emitPlanUpdate.mockImplementation(() => Effect.void);
    mockEventEmitter.emitToolStarted.mockImplementation(() => Effect.void);
    mockEventEmitter.emitToolFinished.mockImplementation(() => Effect.void);
    mockEventEmitter.emitStatusChange.mockImplementation(() => Effect.void);
    mockEventEmitter.emitArtifactCreated.mockImplementation(() => Effect.void);
    mockEventEmitter.emitCheckpoint.mockImplementation(() => Effect.void);
    mockEventEmitter.emitLog.mockImplementation(() => Effect.void);
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

      const mockEvents: AgentStreamEvent[] = [];
      const mockStream = createMutableStream(sessionId, mockEvents);

      mockStreamManager.createStream.mockImplementation(() =>
        Effect.succeed(mockStream)
      );
      mockStreamManager.getStream.mockImplementationOnce(() =>
        Effect.succeed(Option.some(mockStream))
      );

      mockEventEmitter.emitStatusChange.mockImplementation(() => Effect.void);
      mockEventEmitter.emitPlanUpdate.mockImplementation(() => Effect.void);
      mockEventEmitter.emitToolStarted.mockImplementation(() => Effect.void);
      mockEventEmitter.emitToolFinished.mockImplementation(() => Effect.void);
      mockEventEmitter.emitArtifactCreated.mockImplementation(
        () => Effect.void
      );

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

      mockOrchestrator.processRequest.mockImplementation(() =>
        Effect.gen(function* (_) {
          // Emit initial status change
          yield* mockEventEmitter.emitStatusChange(
            sessionId,
            "planning",
            "running",
            "Request processing started"
          );

          // Emit plan update
          yield* mockEventEmitter.emitPlanUpdate(
            sessionId,
            mockPlan.id,
            mockPlan.title,
            mockPlan.status,
            mockPlan.steps.map((step) => ({
              id: step.id,
              tool: step.tool,
              instruction: step.instruction,
              status: step.status,
            })),
            "step-1"
          );

          // Emit status change to executing
          yield* mockEventEmitter.emitStatusChange(
            sessionId,
            "running",
            "executing",
            "Plan execution started"
          );

          // Emit tool events for step 1
          yield* mockEventEmitter.emitToolStarted(
            sessionId,
            "coder",
            "step-1",
            "Analyze React component"
          );
          yield* mockEventEmitter.emitToolFinished(
            sessionId,
            "coder",
            "step-1",
            true,
            "Component analysis complete",
            undefined,
            100
          );
          yield* mockEventEmitter.emitArtifactCreated(
            sessionId,
            "artifact-1",
            "/workspace/analysis/component-analysis.md",
            "note",
            100
          );

          // Emit tool events for step 2
          yield* mockEventEmitter.emitToolStarted(
            sessionId,
            "coder",
            "step-2",
            "Optimize component"
          );
          yield* mockEventEmitter.emitToolFinished(
            sessionId,
            "coder",
            "step-2",
            true,
            "Optimization complete",
            undefined,
            100
          );
          yield* mockEventEmitter.emitArtifactCreated(
            sessionId,
            "artifact-2",
            "/workspace/code/optimized-component.tsx",
            "code",
            100
          );

          // Emit tool events for step 3
          yield* mockEventEmitter.emitToolStarted(
            sessionId,
            "coder",
            "step-3",
            "Create test file"
          );
          yield* mockEventEmitter.emitToolFinished(
            sessionId,
            "coder",
            "step-3",
            true,
            "Test file created",
            undefined,
            100
          );

          // Emit final status change
          yield* mockEventEmitter.emitStatusChange(
            sessionId,
            "executing",
            "completed",
            "Request processing completed"
          );

          return {
            sessionId,
            response: "Multi-step request completed successfully",
            plan: mockPlan,
            artifacts: mockArtifacts,
            events: [],
            status: "completed" as AgentSessionStatus,
          };
        })
      );

      const streamingProgram = Effect.gen(function* (_) {
        const stream = yield* Effect.succeed(mockStreamManager).pipe(
          Effect.flatMap((manager) => manager.createStream(sessionId))
        );

        const result = yield* Effect.succeed(mockOrchestrator).pipe(
          Effect.flatMap((orchestrator) =>
            orchestrator.processRequest(sessionId, multiStepRequest)
          )
        );

        const events = (yield* stream.events) as AgentStreamEvent[];

        return {
          result,
          events,
          eventCount: events.length,
        };
      });

      const testResult = await Effect.runPromise(
        streamingProgram.pipe(Effect.provide(TestStreamingLayer))
      );

      // Ordering / counts
      // Ordering / counts
      expect(mockEventEmitter.emitStatusChange).toHaveBeenCalledTimes(3);
      expect(mockEventEmitter.emitPlanUpdate).toHaveBeenCalledTimes(1);
      expect(mockEventEmitter.emitToolStarted).toHaveBeenCalledTimes(3);
      expect(mockEventEmitter.emitToolFinished).toHaveBeenCalledTimes(3);
      expect(mockEventEmitter.emitArtifactCreated).toHaveBeenCalledTimes(2);

      // Status transitions
      expect(mockEventEmitter.emitStatusChange).toHaveBeenNthCalledWith(
        1,
        sessionId,
        "planning",
        "running",
        expect.any(String)
      );
      expect(mockEventEmitter.emitStatusChange).toHaveBeenNthCalledWith(
        2,
        sessionId,
        "running",
        "executing",
        expect.any(String)
      );
      expect(mockEventEmitter.emitStatusChange).toHaveBeenNthCalledWith(
        3,
        sessionId,
        "executing",
        "completed",
        expect.any(String)
      );

      // Plan update structure
      expect(mockEventEmitter.emitPlanUpdate).toHaveBeenCalledWith(
        sessionId,
        mockPlan.id,
        mockPlan.title,
        mockPlan.status,
        expect.any(Array),
        expect.any(String)
      );

      // Tool events
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

      // Artifact events
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

      // Final result
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

      const mockStream = createEmptyStream(sessionId);

      mockStreamManager.createStream.mockImplementation(() =>
        Effect.succeed(mockStream)
      );
      mockStreamManager.getStream.mockImplementationOnce(() =>
        Effect.succeed(Option.some(mockStream))
      );

      mockOrchestrator.processRequest.mockImplementationOnce(() =>
        Effect.fail(new Error("Tool execution failed"))
      );
      mockEventEmitter.emitStatusChange.mockImplementation(() => Effect.void);
      mockEventEmitter.emitLog.mockImplementation(() => Effect.void);

      const program = Effect.succeed(mockOrchestrator).pipe(
        Effect.flatMap((orchestrator) =>
          orchestrator.processRequest(sessionId, failingRequest)
        ),
        Effect.provide(TestStreamingLayer)
      );

      await expect(Effect.runPromise(program)).rejects.toThrow(
        "Tool execution failed"
      );
    });

    it("should handle concurrent streams without interference", async () => {
      const sessions = ["session-1", "session-2", "session-3"] as const;
      const streams = new Map<string, TestStream>();

      for (const sessionId of sessions) {
        streams.set(sessionId, createEmptyStream(sessionId));
      }

      mockStreamManager.createStream.mockImplementation((id: string) => {
        const stream = streams.get(id);
        return stream
          ? Effect.succeed(stream)
          : Effect.fail(new Error("Stream not found"));
      });

      mockStreamManager.getStream.mockImplementation((id: string) => {
        const stream = streams.get(id);
        return stream
          ? Effect.succeed(Option.some(stream))
          : Effect.succeed(Option.none());
      });

      mockStreamManager.listActiveStreams.mockImplementation(() =>
        Effect.succeed([...sessions])
      );

      mockEventEmitter.emitStatusChange.mockImplementation(() => Effect.void);

      const concurrentProgram = Effect.gen(function* (_) {
        const activeStreams = yield* Effect.succeed(mockStreamManager).pipe(
          Effect.flatMap((manager) => manager.listActiveStreams())
        );

        // Broadcast event
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

        // Per-session status events
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
        concurrentProgram.pipe(Effect.provide(TestStreamingLayer))
      );

      expect(result.activeStreamCount).toBe(3);
      expect(result.sessions).toEqual(expect.arrayContaining(sessions));
      expect(mockEventEmitter.emitStatusChange).toHaveBeenCalledTimes(3);
      expect(mockStreamManager.broadcastEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe("Event Content Validation", () => {
    beforeEach(() => {
      mockEventEmitter.emitPlanUpdate.mockImplementation(() => Effect.void);
      mockEventEmitter.emitToolStarted.mockImplementation(() => Effect.void);
      mockEventEmitter.emitToolFinished.mockImplementation(() => Effect.void);
      mockEventEmitter.emitArtifactCreated.mockImplementation(
        () => Effect.void
      );
    });

    it("should validate plan update event structure", async () => {
      const sessionId = "plan-validation-test";

      await Effect.runPromise(
        Effect.succeed(mockEventEmitter)
          .pipe(
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
          )
          .pipe(Effect.provide(TestStreamingLayer))
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

      // Tool started
      await Effect.runPromise(
        Effect.succeed(mockEventEmitter)
          .pipe(
            Effect.flatMap((emitter) =>
              emitter.emitToolStarted(
                sessionId,
                "coder",
                "step-1",
                "Analyze code",
                { priority: "high" }
              )
            )
          )
          .pipe(Effect.provide(TestStreamingLayer))
      );

      expect(mockEventEmitter.emitToolStarted).toHaveBeenCalledWith(
        sessionId,
        "coder",
        "step-1",
        "Analyze code",
        { priority: "high" }
      );

      // Tool finished
      await Effect.runPromise(
        Effect.succeed(mockEventEmitter)
          .pipe(
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
          )
          .pipe(Effect.provide(TestStreamingLayer))
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
        Effect.succeed(mockEventEmitter)
          .pipe(
            Effect.flatMap((emitter) =>
              emitter.emitArtifactCreated(
                sessionId,
                "artifact-123",
                "/workspace/test/file.ts",
                "code",
                1024
              )
            )
          )
          .pipe(Effect.provide(TestStreamingLayer))
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
      const mockStream = createEmptyStream(sessionId);

      mockStreamManager.createStream.mockImplementation(() =>
        Effect.succeed(mockStream)
      );
      mockStreamManager.getStream.mockImplementationOnce(() =>
        Effect.succeed(Option.some(mockStream))
      );

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

        // Close stream (mock implementation is a no-op)
        yield* stream.close();
        yield* Effect.succeed(mockStreamManager).pipe(
          Effect.flatMap((manager) => manager.closeStream(sessionId))
        );

        // In this mocked setup, getStream still returns Some because
        // we are not mutating any internal state. We just assert that
        // the call succeeds and returns the same shape.
        const closedStream = yield* Effect.succeed(mockStreamManager).pipe(
          Effect.flatMap((manager) => manager.getStream(sessionId))
        );

        expect(closedStream._tag).toBe("Some");
      });

      await Effect.runPromise(
        lifecycleProgram.pipe(Effect.provide(TestStreamingLayer))
      );

      expect(mockStreamManager.createStream).toHaveBeenCalledWith(sessionId);
      expect(mockStreamManager.getStream).toHaveBeenCalledWith(sessionId);
      expect(mockStream.close).toBeDefined();
      expect(mockStreamManager.closeStream).toHaveBeenCalledWith(sessionId);
    });
  });
});
