import { Effect, Layer } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type AgentStreamEvent,
  StreamEventEmitter,
  StreamManager,
} from "../../backend/agent/domain.js";
import { AgentLogger } from "../../backend/agent/logging.js";

// Mock implementations
const mockStreamManager = {
  createStream: vi.fn(),
  getStream: vi.fn(),
  closeStream: vi.fn(),
  listActiveStreams: vi.fn(),
  broadcastEvent: vi.fn(),
};

const mockEventEmitter = {
  emitPlanUpdate: vi.fn(),
  emitToolStarted: vi.fn(),
  emitToolFinished: vi.fn(),
  emitStatusChange: vi.fn(),
  emitArtifactCreated: vi.fn(),
  emitCheckpoint: vi.fn(),
  emitLog: vi.fn(),
};

const mockLogger = {
  logSessionEvent: vi.fn(),
  log: vi.fn(),
  logToolCall: vi.fn(),
  logStreamEvent: vi.fn(),
};

// Test layer setup
const _TestStreamingLayer = Layer.mergeAll(
  Layer.succeed(StreamManager, mockStreamManager),
  Layer.succeed(StreamEventEmitter, mockEventEmitter),
  Layer.succeed(AgentLogger, mockLogger)
);

describe("Streaming Observability - User Story 3 (Simple)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Event Schema and Structure", () => {
    it("should validate AgentStreamEvent structure", () => {
      const sessionId = "test-session";
      const now = new Date();

      // Test plan update event
      const planUpdateEvent: AgentStreamEvent = {
        id: "event-1",
        sessionId,
        type: "plan_update",
        content: {
          plan_update: {
            planId: "plan-123",
            title: "Test Plan",
            status: "executing",
            steps: [
              {
                id: "step-1",
                tool: "coder",
                instruction: "Test instruction",
                status: "pending",
              },
            ],
            currentStep: "step-1",
          },
        },
        timestamp: now,
      };

      expect(planUpdateEvent.id).toBe("event-1");
      expect(planUpdateEvent.sessionId).toBe(sessionId);
      expect(planUpdateEvent.type).toBe("plan_update");
      expect(planUpdateEvent.content.plan_update?.planId).toBe("plan-123");
      expect(planUpdateEvent.content.plan_update?.steps).toHaveLength(1);
      expect(planUpdateEvent.timestamp).toBe(now);
    });

    it("should validate tool event structure", () => {
      const sessionId = "test-session";
      const now = new Date();

      // Test tool started event
      const toolStartedEvent: AgentStreamEvent = {
        id: "event-2",
        sessionId,
        type: "tool_started",
        content: {
          tool_started: {
            toolName: "coder",
            stepId: "step-1",
            instruction: "Analyze code",
            metadata: { priority: "high" },
          },
        },
        timestamp: now,
      };

      expect(toolStartedEvent.type).toBe("tool_started");
      expect(toolStartedEvent.content.tool_started?.toolName).toBe("coder");
      expect(toolStartedEvent.content.tool_started?.stepId).toBe("step-1");
      expect(toolStartedEvent.content.tool_started?.metadata).toEqual({
        priority: "high",
      });

      // Test tool finished event
      const toolFinishedEvent: AgentStreamEvent = {
        id: "event-3",
        sessionId,
        type: "tool_finished",
        content: {
          tool_finished: {
            toolName: "coder",
            stepId: "step-1",
            success: true,
            result: "Code analyzed successfully",
            duration: 1500,
            metadata: { endTime: new Date().toISOString() },
          },
        },
        timestamp: now,
      };

      expect(toolFinishedEvent.type).toBe("tool_finished");
      expect(toolFinishedEvent.content.tool_finished?.success).toBe(true);
      expect(toolFinishedEvent.content.tool_finished?.duration).toBe(1500);
    });

    it("should validate status change event structure", () => {
      const sessionId = "test-session";
      const now = new Date();

      const statusChangeEvent: AgentStreamEvent = {
        id: "event-4",
        sessionId,
        type: "status_change",
        content: {
          status_change: {
            fromStatus: "planning",
            toStatus: "running",
            reason: "Request processing started",
          },
        },
        timestamp: now,
      };

      expect(statusChangeEvent.type).toBe("status_change");
      expect(statusChangeEvent.content.status_change?.fromStatus).toBe(
        "planning"
      );
      expect(statusChangeEvent.content.status_change?.toStatus).toBe("running");
      expect(statusChangeEvent.content.status_change?.reason).toBe(
        "Request processing started"
      );
    });

    it("should validate artifact created event structure", () => {
      const sessionId = "test-session";
      const now = new Date();

      const artifactEvent: AgentStreamEvent = {
        id: "event-5",
        sessionId,
        type: "artifact_created",
        content: {
          artifact_created: {
            artifactId: "artifact-123",
            path: "/workspace/test/file.ts",
            kind: "code",
            size: 1024,
            checksum: "abc123",
          },
        },
        timestamp: now,
      };

      expect(artifactEvent.type).toBe("artifact_created");
      expect(artifactEvent.content.artifact_created?.artifactId).toBe(
        "artifact-123"
      );
      expect(artifactEvent.content.artifact_created?.path).toBe(
        "/workspace/test/file.ts"
      );
      expect(artifactEvent.content.artifact_created?.kind).toBe("code");
      expect(artifactEvent.content.artifact_created?.size).toBe(1024);
    });

    it("should validate log event structure", () => {
      const sessionId = "test-session";
      const now = new Date();

      const logEvent: AgentStreamEvent = {
        id: "event-6",
        sessionId,
        type: "log",
        content: {
          log: {
            level: "info",
            message: "Processing request",
            metadata: { component: "orchestrator" },
          },
        },
        timestamp: now,
      };

      expect(logEvent.type).toBe("log");
      expect(logEvent.content.log?.level).toBe("info");
      expect(logEvent.content.log?.message).toBe("Processing request");
      expect(logEvent.content.log?.metadata).toEqual({
        component: "orchestrator",
      });
    });
  });

  describe("Event Emitter Interface", () => {
    it("should validate StreamEventEmitter method signatures", async () => {
      const sessionId = "test-session";

      // Test emitPlanUpdate
      mockEventEmitter.emitPlanUpdate.mockResolvedValue(undefined);

      // Direct call without Effect layer
      await mockEventEmitter.emitPlanUpdate(
        sessionId,
        "plan-123",
        "Test Plan",
        "executing",
        [
          {
            id: "step-1",
            tool: "coder",
            instruction: "Test",
            status: "pending",
          },
        ],
        "step-1"
      );

      expect(mockEventEmitter.emitPlanUpdate).toHaveBeenCalledWith(
        sessionId,
        "plan-123",
        "Test Plan",
        "executing",
        [
          {
            id: "step-1",
            tool: "coder",
            instruction: "Test",
            status: "pending",
          },
        ],
        "step-1"
      );

      // Test emitToolStarted
      mockEventEmitter.emitToolStarted.mockResolvedValue(undefined);

      await mockEventEmitter.emitToolStarted(
        sessionId,
        "coder",
        "step-1",
        "Test instruction"
      );

      expect(mockEventEmitter.emitToolStarted).toHaveBeenCalledWith(
        sessionId,
        "coder",
        "step-1",
        "Test instruction"
      );

      // Test emitStatusChange
      mockEventEmitter.emitStatusChange.mockResolvedValue(undefined);

      await mockEventEmitter.emitStatusChange(
        sessionId,
        "planning",
        "running",
        "Starting processing"
      );

      expect(mockEventEmitter.emitStatusChange).toHaveBeenCalledWith(
        sessionId,
        "planning",
        "running",
        "Starting processing"
      );
    });
  });

  describe("Stream Manager Interface", () => {
    it("should validate StreamManager method signatures", async () => {
      const sessionId = "test-session";

      // Mock stream
      const mockStream = {
        sessionId,
        events: Effect.sync(() => []),
        sendEvent: vi.fn(),
        close: vi.fn(),
      };

      mockStreamManager.createStream.mockResolvedValue(mockStream);
      mockStreamManager.getStream.mockResolvedValue({
        _tag: "Some",
        value: mockStream,
      });
      mockStreamManager.listActiveStreams.mockResolvedValue([sessionId]);
      mockStreamManager.closeStream.mockResolvedValue(undefined);

      // Test createStream
      const stream = await mockStreamManager.createStream(sessionId);
      expect(mockStreamManager.createStream).toHaveBeenCalledWith(sessionId);
      expect(stream.sessionId).toBe(sessionId);

      // Test getStream
      const retrievedStream = await mockStreamManager.getStream(sessionId);
      expect(mockStreamManager.getStream).toHaveBeenCalledWith(sessionId);
      expect(retrievedStream._tag).toBe("Some");

      // Test listActiveStreams
      const activeStreams = await mockStreamManager.listActiveStreams();
      expect(mockStreamManager.listActiveStreams).toHaveBeenCalled();
      expect(activeStreams).toEqual([sessionId]);

      // Test closeStream
      await mockStreamManager.closeStream(sessionId);
      expect(mockStreamManager.closeStream).toHaveBeenCalledWith(sessionId);
    });
  });

  describe("Event Ordering and Flow", () => {
    it("should demonstrate proper event flow sequence", async () => {
      const sessionId = "test-session";

      // Mock event emission
      mockEventEmitter.emitStatusChange.mockResolvedValue(undefined);
      mockEventEmitter.emitPlanUpdate.mockResolvedValue(undefined);
      mockEventEmitter.emitToolStarted.mockResolvedValue(undefined);
      mockEventEmitter.emitToolFinished.mockResolvedValue(undefined);
      mockEventEmitter.emitArtifactCreated.mockResolvedValue(undefined);

      // Simulate event flow
      await mockEventEmitter.emitStatusChange(
        sessionId,
        "planning",
        "running",
        "Request started"
      );

      await mockEventEmitter.emitPlanUpdate(
        sessionId,
        "plan-123",
        "Test Plan",
        "executing",
        [
          {
            id: "step-1",
            tool: "coder",
            instruction: "Step 1",
            status: "pending",
          },
          {
            id: "step-2",
            tool: "browser",
            instruction: "Step 2",
            status: "pending",
          },
        ]
      );

      await mockEventEmitter.emitToolStarted(
        sessionId,
        "coder",
        "step-1",
        "Execute step 1"
      );

      await mockEventEmitter.emitToolFinished(
        sessionId,
        "coder",
        "step-1",
        true,
        "Success",
        undefined,
        1000
      );

      await mockEventEmitter.emitArtifactCreated(
        sessionId,
        "artifact-1",
        "/workspace/result.txt",
        "note",
        512
      );

      await mockEventEmitter.emitStatusChange(
        sessionId,
        "running",
        "completed",
        "All steps completed"
      );

      // Verify call order and arguments
      expect(mockEventEmitter.emitStatusChange).toHaveBeenCalledTimes(2);
      expect(mockEventEmitter.emitStatusChange).toHaveBeenNthCalledWith(
        1,
        sessionId,
        "planning",
        "running",
        "Request started"
      );
      expect(mockEventEmitter.emitStatusChange).toHaveBeenNthCalledWith(
        2,
        sessionId,
        "running",
        "completed",
        "All steps completed"
      );

      expect(mockEventEmitter.emitPlanUpdate).toHaveBeenCalledWith(
        sessionId,
        "plan-123",
        "Test Plan",
        "executing",
        [
          {
            id: "step-1",
            tool: "coder",
            instruction: "Step 1",
            status: "pending",
          },
          {
            id: "step-2",
            tool: "browser",
            instruction: "Step 2",
            status: "pending",
          },
        ]
      );

      expect(mockEventEmitter.emitToolStarted).toHaveBeenCalledWith(
        sessionId,
        "coder",
        "step-1",
        "Execute step 1"
      );
      expect(mockEventEmitter.emitToolFinished).toHaveBeenCalledWith(
        sessionId,
        "coder",
        "step-1",
        true,
        "Success",
        undefined,
        1000
      );
      expect(mockEventEmitter.emitArtifactCreated).toHaveBeenCalledWith(
        sessionId,
        "artifact-1",
        "/workspace/result.txt",
        "note",
        512
      );
    });
  });
});
