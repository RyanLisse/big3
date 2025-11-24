/**
 * Test Layers for Agent Service Tests
 * Provides mock implementations of AgentOrchestrator, AgentSessionRepo, and WorkspaceArtifactRepo
 */

import { Effect, Layer, Option } from "effect";
import {
  type AgentSession,
  AgentSessionRepo,
  type AgentStream,
  StreamManager,
  type WorkspaceArtifact,
  WorkspaceArtifactRepo,
} from "../../backend/agent/domain.js";
import {
  type AgentInput,
  AgentOrchestrator,
  type AgentOutput,
} from "../../backend/agent/graph.js";

// ============================================================================
// Mock AgentOrchestrator
// ============================================================================

const MockAgentOrchestratorLive = Layer.succeed(
  AgentOrchestrator,
  AgentOrchestrator.of({
    processRequest: (sessionId: string, input: AgentInput) =>
      Effect.succeed({
        sessionId,
        status: "completed" as const,
        plan: {
          id: `plan-${Date.now()}`,
          sessionId,
          title: "Mock Plan",
          goal: input.content,
          steps: [
            {
              id: "step-1",
              description: "Mock step",
              status: "completed" as const,
            },
          ],
          status: "completed" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        artifacts: [],
        messages: [],
      } as AgentOutput),

    createPlan: (sessionId: string, goal: string) =>
      Effect.succeed({
        id: `plan-${Date.now()}`,
        sessionId,
        title: "Mock Plan",
        goal,
        steps: [
          {
            id: "step-1",
            description: "Mock step",
            status: "pending" as const,
          },
        ],
        status: "planning" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),

    executeStep: (plan, stepId) =>
      Effect.succeed({
        ...plan,
        steps: plan.steps.map((s) =>
          s.id === stepId ? { ...s, status: "completed" as const } : s
        ),
        updatedAt: new Date(),
      }),

    updatePlan: (_sessionId, planId, updates) =>
      Effect.succeed({
        id: planId,
        sessionId: _sessionId,
        title: updates.title || "Mock Plan",
        goal: updates.goal || "Mock goal",
        steps: updates.steps || [],
        status: updates.status || "planning",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),

    getPlanStatus: (_sessionId, planId) =>
      Effect.succeed({
        planId,
        status: "completed" as const,
        completedSteps: 1,
        totalSteps: 1,
        currentStep: undefined,
      }),
  })
);

// ============================================================================
// Mock AgentSessionRepo
// ============================================================================

const sessionStore = new Map<string, AgentSession>();

const MockAgentSessionRepoLive = Layer.succeed(
  AgentSessionRepo,
  AgentSessionRepo.of({
    create: (session: AgentSession) =>
      Effect.sync(() => {
        sessionStore.set(session.id, session);
        return session;
      }),

    findById: (id: string) =>
      Effect.sync(() => {
        const session = sessionStore.get(id);
        return session ? Option.some(session) : Option.none();
      }),

    update: (id: string, updates: Partial<AgentSession>) =>
      Effect.sync(() => {
        const existing = sessionStore.get(id);
        if (!existing) {
          throw new Error(`Session ${id} not found`);
        }
        const updated = { ...existing, ...updates };
        sessionStore.set(id, updated);
        return updated;
      }),

    delete: (id: string) =>
      Effect.sync(() => {
        sessionStore.delete(id);
      }),

    listActive: () =>
      Effect.sync(() =>
        Array.from(sessionStore.values()).filter(
          (s) => s.status === "planning" || s.status === "running"
        )
      ),

    get: (id: string) =>
      Effect.sync(() => {
        const session = sessionStore.get(id);
        return session ? Option.some(session) : Option.none();
      }),
  })
);

// ============================================================================
// Mock WorkspaceArtifactRepo
// ============================================================================

const artifactStore = new Map<string, WorkspaceArtifact>();

const MockWorkspaceArtifactRepoLive = Layer.succeed(
  WorkspaceArtifactRepo,
  WorkspaceArtifactRepo.of({
    create: (artifact: WorkspaceArtifact) =>
      Effect.sync(() => {
        artifactStore.set(artifact.id, artifact);
        return artifact;
      }),

    findBySessionId: (sessionId: string) =>
      Effect.sync(() =>
        Array.from(artifactStore.values()).filter(
          (a) => a.sessionId === sessionId
        )
      ),

    get: (id: string) =>
      Effect.sync(() => {
        const artifact = artifactStore.get(id);
        return artifact ? Option.some(artifact) : Option.none();
      }),

    update: (artifact: WorkspaceArtifact) =>
      Effect.sync(() => {
        artifactStore.set(artifact.id, artifact);
        return artifact;
      }),

    delete: (id: string) =>
      Effect.sync(() => {
        artifactStore.delete(id);
      }),

    findByKind: (sessionId: string, kind) =>
      Effect.sync(() =>
        Array.from(artifactStore.values()).filter(
          (a) => a.sessionId === sessionId && a.kind === kind
        )
      ),

    listBySession: (sessionId: string) =>
      Effect.sync(() =>
        Array.from(artifactStore.values()).filter(
          (a) => a.sessionId === sessionId
        )
      ),
  })
);

// ============================================================================
// Mock StreamManager
// ============================================================================

const streamStore = new Map<string, AgentStream>();

const MockStreamManagerLive = Layer.succeed(
  StreamManager,
  StreamManager.of({
    createStream: (sessionId: string) =>
      Effect.sync(() => {
        const stream: AgentStream = {
          sessionId,
          events: Effect.succeed([]),
          sendEvent: (_event) => Effect.unit,
          close: () => Effect.unit,
        };
        streamStore.set(sessionId, stream);
        return stream;
      }),

    getStream: (sessionId: string) =>
      Effect.sync(() => {
        const stream = streamStore.get(sessionId);
        return stream ? Option.some(stream) : Option.none();
      }),

    closeStream: (sessionId: string) =>
      Effect.sync(() => {
        streamStore.delete(sessionId);
      }),

    listActiveStreams: () => Effect.sync(() => Array.from(streamStore.keys())),

    broadcastEvent: (_event) => Effect.unit,
  })
);

// ============================================================================
// Combined Test Layer
// ============================================================================

/**
 * Complete test layer with all mocked dependencies
 * Use this for agent service tests
 */
export const TestAgentLayers = Layer.mergeAll(
  MockAgentOrchestratorLive,
  MockAgentSessionRepoLive,
  MockWorkspaceArtifactRepoLive,
  MockStreamManagerLive
);

/**
 * Helper to clear all mock stores between tests
 */
export function clearTestStores() {
  sessionStore.clear();
  artifactStore.clear();
  streamStore.clear();
}
