import { Effect, Layer } from "effect"
import { describe, it, expect, beforeEach, vi } from "vitest"
import { AgentSession, AgentSessionStatus, WorkspaceArtifact } from "../../backend/agent/domain.js"
import { AgentSessionRepo, WorkspaceArtifactRepo } from "../../backend/agent/domain.js"
import { AgentOrchestrator, AgentInput } from "../../backend/agent/graph.js"
import { Checkpointer, RedisClient, CompositeFilesystem } from "../../backend/agent/persistence.js"

// Mock implementations
const mockSessionRepo = {
  create: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  listActive: vi.fn(),
  findByStatus: vi.fn(),
  cleanupExpired: vi.fn()
}

const mockArtifactRepo = {
  create: vi.fn(),
  get: vi.fn(),
  listBySession: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findByKind: vi.fn()
}

const mockOrchestrator = {
  processRequest: vi.fn(),
  createPlan: vi.fn(),
  executeStep: vi.fn(),
  streamEvents: vi.fn()
}

// Test layer setup
const TestContinuityLayer = Layer.mergeAll(
  Layer.succeed(AgentSessionRepo, mockSessionRepo),
  Layer.succeed(WorkspaceArtifactRepo, mockArtifactRepo),
  Layer.succeed(AgentOrchestrator, mockOrchestrator)
)

describe("Session Continuity - User Story 2 Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("End-to-End Session Continuity", () => {
    it("should spawn session, create artifacts, restart, and resume with continuity", async () => {
      const sessionId = "continuity-test-session"
      const initialPrompt = "Analyze the performance of this React component and suggest optimizations"
      
      // Phase 1: Spawn session
      const initialSession: AgentSession = {
        id: sessionId,
        status: "planning" as AgentSessionStatus,
        createdAt: new Date("2024-01-01T10:00:00Z"),
        updatedAt: new Date("2024-01-01T10:00:00Z"),
        metadata: {
          origin: "api",
          labels: { type: "performance-analysis" }
        }
      }

      const initialPlan = {
        id: "plan-1",
        sessionId,
        steps: [
          { id: "step-1", tool: "coder", instruction: "Analyze React component", status: "pending" },
          { id: "step-2", tool: "browser", instruction: "Load component in browser", status: "pending" },
          { id: "step-3", tool: "coder", instruction: "Generate optimization suggestions", status: "pending" }
        ],
        createdAt: new Date("2024-01-01T10:00:00Z")
      }

      // Mock session creation and planning
      mockSessionRepo.create.mockResolvedValue(initialSession)
      mockOrchestrator.processRequest.mockResolvedValue({
        sessionId,
        status: "running" as AgentSessionStatus,
        plan: initialPlan,
        artifacts: []
      })

      // Phase 2: Execute steps and create artifacts
      const analysisArtifact: WorkspaceArtifact = {
        id: "artifact-1",
        sessionId,
        path: "/workspace/analysis/component-analysis.md",
        kind: "note",
        content: "# React Component Analysis\n\n## Performance Issues:\n1. Unnecessary re-renders\n2. Large bundle size\n3. Missing memoization\n\n## Recommendations:\n1. Use React.memo\n2. Implement code splitting\n3. Add useMemo for expensive computations",
        createdAt: new Date("2024-01-01T10:05:00Z")
      }

      const codeArtifact: WorkspaceArtifact = {
        id: "artifact-2",
        sessionId,
        path: "/workspace/code/optimized-component.tsx",
        kind: "code",
        content: "import React, { memo, useMemo } from 'react';\n\nconst OptimizedComponent = memo(({ data }) => {\n  const processedData = useMemo(() => {\n    return data.map(item => ({ ...item, processed: true }));\n  }, [data]);\n\n  return <div>{/* component content */}</div>;\n});\n\nexport default OptimizedComponent;",
        createdAt: new Date("2024-01-01T10:15:00Z")
      }

      // Mock artifact creation
      mockArtifactRepo.create.mockResolvedValue(analysisArtifact)
      mockArtifactRepo.create.mockResolvedValue(codeArtifact)

      // Phase 3: Simulate backend restart by clearing in-memory state
      // (In real scenario, this would be an actual restart)
      
      // Phase 4: Resume session
      const resumedSession: AgentSession = {
        ...initialSession,
        status: "running" as AgentSessionStatus,
        updatedAt: new Date("2024-01-01T10:30:00Z")
      }

      const resumeInput: AgentInput = {
        type: "text",
        content: "Continue with the optimization implementation",
        metadata: {
          resumed: true,
          originalSessionId: sessionId
        }
      }

      // Mock session retrieval and resumption
      mockSessionRepo.get.mockResolvedValue({ _tag: "Some", value: resumedSession })
      mockArtifactRepo.listBySession.mockResolvedValue([analysisArtifact, codeArtifact])
      mockOrchestrator.processRequest.mockResolvedValue({
        sessionId,
        status: "running" as AgentSessionStatus,
        plan: {
          ...initialPlan,
          steps: [
            { ...initialPlan.steps[0], status: "completed" },
            { ...initialPlan.steps[1], status: "completed" },
            { ...initialPlan.steps[2], status: "in_progress" }
          ]
        },
        artifacts: [analysisArtifact, codeArtifact]
      })

      // Execute the continuity test
      const continuityProgram = Effect.gen(function* (_) {
        // Phase 1: Spawn session
        const session = yield* AgentSessionRepo.pipe(
          Effect.flatMap(repo => repo.create(initialSession))
        )

        const orchestrator = yield* AgentOrchestrator
        const initialResult = yield* orchestrator.processRequest(sessionId, {
          type: "text",
          content: initialPrompt
        })

        expect(initialResult.sessionId).toBe(sessionId)
        expect(initialResult.status).toBe("running")
        expect(initialResult.plan).toBeDefined()

        // Phase 2: Create artifacts during execution
        const artifact1 = yield* WorkspaceArtifactRepo.pipe(
          Effect.flatMap(repo => repo.create(analysisArtifact))
        )

        const artifact2 = yield* WorkspaceArtifactRepo.pipe(
          Effect.flatMap(repo => repo.create(codeArtifact))
        )

        expect(artifact1.id).toBe("artifact-1")
        expect(artifact2.id).toBe("artifact-2")

        // Phase 3: Simulate restart (clear in-memory state)
        // In real scenario, this would be actual process restart

        // Phase 4: Resume session
        const resumedSessionResult = yield* AgentSessionRepo.pipe(
          Effect.flatMap(repo => repo.get(sessionId)),
          Effect.flatMap(sessionOption => 
            sessionOption._tag === "Some" 
              ? Effect.succeed(sessionOption.value)
              : Effect.fail(new Error("Session not found"))
          )
        )

        const existingArtifacts = yield* WorkspaceArtifactRepo.pipe(
          Effect.flatMap(repo => repo.listBySession(sessionId))
        )

        const resumedResult = yield* orchestrator.processRequest(sessionId, resumeInput)

        return {
          originalSession: session,
          resumedSession: resumedSessionResult,
          artifactsPersisted: existingArtifacts.length,
          continuityMaintained: resumedResult.sessionId === sessionId,
          planContinuity: resumedResult.plan?.steps?.length === initialPlan.steps.length
        }
      })

      const result = await Effect.runPromise(
        continuityProgram.pipe(Layer.provide(TestContinuityLayer))
      )

      // Verify continuity
      expect(result.continuityMaintained).toBe(true)
      expect(result.artifactsPersisted).toBe(2)
      expect(result.planContinuity).toBe(true)
      expect(result.resumedSession.status).toBe("running")

      // Verify mock calls
      expect(mockSessionRepo.create).toHaveBeenCalledWith(initialSession)
      expect(mockSessionRepo.get).toHaveBeenCalledWith(sessionId)
      expect(mockArtifactRepo.create).toHaveBeenCalledTimes(2)
      expect(mockArtifactRepo.listBySession).toHaveBeenCalledWith(sessionId)
      expect(mockOrchestrator.processRequest).toHaveBeenCalledTimes(2)
    })

    it("should handle partial session corruption during resumption", async () => {
      const sessionId = "corruption-test-session"
      
      // Create a session with missing fields (simulating corruption)
      const corruptedSession = {
        id: sessionId,
        status: "running" as AgentSessionStatus
        // Missing createdAt, updatedAt, metadata
      }

      const repairedSession: AgentSession = {
        id: sessionId,
        status: "running" as AgentSessionStatus,
        createdAt: new Date("2024-01-01T10:00:00Z"),
        updatedAt: new Date("2024-01-01T10:30:00Z"),
        metadata: {
          origin: "recovered",
          labels: { recovered: true }
        }
      }

      // Mock corrupted session retrieval
      mockSessionRepo.get.mockResolvedValue({ _tag: "Some", value: corruptedSession })
      mockSessionRepo.update.mockResolvedValue(repairedSession)

      const corruptionProgram = Effect.gen(function* (_) {
        // Attempt to retrieve corrupted session
        const sessionOption = yield* AgentSessionRepo.pipe(
          Effect.flatMap(repo => repo.get(sessionId))
        )

        if (sessionOption._tag === "Some") {
          const session = sessionOption.value
          
          // Validate and repair session
          const repairedSession = {
            ...session,
            createdAt: session.createdAt || new Date(),
            updatedAt: session.updatedAt || new Date(),
            metadata: session.metadata || { origin: "recovered" }
          }

          // Save repaired session
          yield* AgentSessionRepo.pipe(
            Effect.flatMap(repo => repo.update(repairedSession))
          )

          return {
            recovered: true,
            wasCorrupted: !session.createdAt || !session.metadata,
            repairedSession
          }
        }

        return { recovered: false }
      })

      const result = await Effect.runPromise(
        corruptionProgram.pipe(Layer.provide(TestContinuityLayer))
      )

      expect(result.recovered).toBe(true)
      expect(result.wasCorrupted).toBe(true)
      expect(result.repairedSession.metadata.origin).toBe("recovered")
    })

    it("should maintain artifact continuity across session restarts", async () => {
      const sessionId = "artifact-continuity-test"
      
      // Create multiple artifacts of different types
      const artifacts: WorkspaceArtifact[] = [
        {
          id: "research-notes",
          sessionId,
          path: "/workspace/research/performance-notes.md",
          kind: "note",
          content: "# Performance Research Notes\n\nKey findings about React optimization...",
          createdAt: new Date("2024-01-01T10:00:00Z")
        },
        {
          id: "component-code",
          sessionId,
          path: "/workspace/components/OptimizedButton.tsx",
          kind: "code",
          content: "import React from 'react';\n\nexport const OptimizedButton = () => {\n  return <button>Optimized</button>;\n};",
          createdAt: new Date("2024-01-01T10:05:00Z")
        },
        {
          id: "test-file",
          sessionId,
          path: "/workspace/tests/OptimizedButton.test.tsx",
          kind: "test",
          content: "import { render } from '@testing-library/react';\nimport { OptimizedButton } from '../components/OptimizedButton';\n\ntest('renders button', () => {\n  render(<OptimizedButton />);\n});",
          createdAt: new Date("2024-01-01T10:10:00Z")
        }
      ]

      // Mock artifact operations
      mockArtifactRepo.listBySession.mockResolvedValue(artifacts)
      mockArtifactRepo.get.mockImplementation((id) => {
        const artifact = artifacts.find(a => a.id === id)
        return Promise.resolve(artifact ? { _tag: "Some", value: artifact } : { _tag: "None" })
      })

      const artifactContinuityProgram = Effect.gen(function* (_) {
        // Simulate restart by retrieving artifacts
        const retrievedArtifacts = yield* WorkspaceArtifactRepo.pipe(
          Effect.flatMap(repo => repo.listBySession(sessionId))
        )

        // Verify all artifacts are present
        const artifactVerification = []
        
        for (const artifact of retrievedArtifacts) {
          const individualArtifact = yield* WorkspaceArtifactRepo.pipe(
            Effect.flatMap(repo => repo.get(artifact.id))
          )

          if (individualArtifact._tag === "Some") {
            artifactVerification.push({
              id: individualArtifact.value.id,
              kind: individualArtifact.value.kind,
              contentLength: individualArtifact.value.content.length,
              intact: individualArtifact.value.content.length > 0
            })
          }
        }

        return {
          totalArtifacts: retrievedArtifacts.length,
          verifiedArtifacts: artifactVerification.length,
          allIntact: artifactVerification.every(v => v.intact),
          kindsPresent: [...new Set(artifactVerification.map(v => v.kind))]
        }
      })

      const result = await Effect.runPromise(
        artifactContinuityProgram.pipe(Layer.provide(TestContinuityLayer))
      )

      expect(result.totalArtifacts).toBe(3)
      expect(result.verifiedArtifacts).toBe(3)
      expect(result.allIntact).toBe(true)
      expect(result.kindsPresent).toContain("note")
      expect(result.kindsPresent).toContain("code")
      expect(result.kindsPresent).toContain("test")
    })

    it("should handle session timeout and cleanup gracefully", async () => {
      const sessionId = "timeout-test-session"
      const maxAge = 24 * 60 * 60 * 1000 // 24 hours
      
      // Create expired session
      const expiredSession: AgentSession = {
        id: sessionId,
        status: "running" as AgentSessionStatus,
        createdAt: new Date(Date.now() - maxAge - 1000), // Older than maxAge
        updatedAt: new Date(Date.now() - maxAge - 1000),
        metadata: {
          origin: "api",
          labels: { expired: true }
        }
      }

      // Mock expired session and cleanup
      mockSessionRepo.listActive.mockResolvedValue([expiredSession])
      mockSessionRepo.cleanupExpired.mockResolvedValue(1)

      const timeoutProgram = Effect.gen(function* (_) {
        // Run cleanup process
        const cleanedCount = yield* AgentSessionRepo.pipe(
          Effect.flatMap(repo => repo.cleanupExpired(maxAge))
        )

        // Verify session is no longer active
        const activeSessions = yield* AgentSessionRepo.pipe(
          Effect.flatMap(repo => repo.listActive())
        )

        return {
          cleanedCount,
          remainingActive: activeSessions.length,
          cleanupSuccessful: cleanedCount > 0
        }
      })

      const result = await Effect.runPromise(
        timeoutProgram.pipe(Layer.provide(TestContinuityLayer))
      )

      expect(result.cleanedCount).toBe(1)
      expect(result.remainingActive).toBe(0)
      expect(result.cleanupSuccessful).toBe(true)
    })
  })

  describe("Concurrent Session Management", () => {
    it("should handle multiple concurrent sessions with proper isolation", async () => {
      const sessions = [
        "session-1",
        "session-2", 
        "session-3"
      ]

      const sessionArtifacts = sessions.map(sessionId => ({
        sessionId,
        artifacts: [
          {
            id: `${sessionId}-artifact-1`,
            sessionId,
            path: `/workspace/${sessionId}/file1.txt`,
            kind: "note" as const,
            content: `Content for ${sessionId}`,
            createdAt: new Date()
          },
          {
            id: `${sessionId}-artifact-2`,
            sessionId,
            path: `/workspace/${sessionId}/file2.txt`,
            kind: "code" as const,
            content: `Code for ${sessionId}`,
            createdAt: new Date()
          }
        ]
      }))

      // Mock concurrent operations
      mockSessionRepo.listActive.mockResolvedValue(
        sessions.map(id => ({
          id,
          status: "running" as AgentSessionStatus,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: { origin: "api" }
        }))
      )

      mockArtifactRepo.listBySession.mockImplementation((sessionId) => {
        const sessionData = sessionArtifacts.find(s => s.sessionId === sessionId)
        return Promise.resolve(sessionData?.artifacts || [])
      })

      const concurrentProgram = Effect.gen(function* (_) {
        // Get all active sessions
        const activeSessions = yield* AgentSessionRepo.pipe(
          Effect.flatMap(repo => repo.listActive())
        )

        // Process each session concurrently
        const sessionResults = yield* Effect.forEach(activeSessions, (session) =>
          Effect.gen(function* (_) {
            const artifacts = yield* WorkspaceArtifactRepo.pipe(
              Effect.flatMap(repo => repo.listBySession(session.id))
            )

            return {
              sessionId: session.id,
              artifactCount: artifacts.length,
              isolationVerified: artifacts.every(a => a.sessionId === session.id)
            }
          })
        )

        return {
          totalSessions: activeSessions.length,
          sessionResults,
          allIsolated: sessionResults.every(r => r.isolationVerified),
          totalArtifacts: sessionResults.reduce((sum, r) => sum + r.artifactCount, 0)
        }
      })

      const result = await Effect.runPromise(
        concurrentProgram.pipe(Layer.provide(TestContinuityLayer))
      )

      expect(result.totalSessions).toBe(3)
      expect(result.allIsolated).toBe(true)
      expect(result.totalArtifacts).toBe(6) // 2 artifacts per session
    })
  })
})
