import { Effect, Layer } from "effect"
import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  generateId,
  validateSessionId,
  validateNonEmpty,
  validateRequired,
  safeJsonParse,
  safeJsonStringify,
  withErrorHandling,
  safePromise,
  formatToolResult,
  validateToolInput,
  createSession,
  createPlan,
  createPlanStep,
  createArtifact,
  createEvent
} from "../../backend/agent/shared/utils.js"
import { TOOLS, SESSION_STATUSES, PLAN_STATUSES, STEP_STATUSES, ERRORS } from "../../backend/agent/shared/constants.js"
import {
  isSuccess,
  isCompleted,
  isFailed,
  isRunning,
  isPending
} from "../../backend/agent/shared/interfaces.js"

describe("Shared Utilities Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("ID Generation", () => {
    it("should generate unique IDs with correct format", () => {
      const ids = new Set<string>()
      const numIds = 100

      for (let i = 0; i < numIds; i++) {
        const id = generateId("test")
        expect(ids.has(id)).toBe(false)
        ids.add(id)
        expect(id).toMatch(/^test_\d+_[a-z0-9]+$/)
      }

      expect(ids.size).toBe(numIds)
    })

    it("should generate different IDs for different prefixes", () => {
      const sessionId = generateId("session")
      const planId = generateId("plan")
      const artifactId = generateId("artifact")

      expect(sessionId).toMatch(/^session_\d+_[a-z0-9]+$/)
      expect(planId).toMatch(/^plan_\d+_[a-z0-9]+$/)
      expect(artifactId).toMatch(/^artifact_\d+_[a-z0-9]+$/)

      expect(sessionId).not.toBe(planId)
      expect(planId).not.toBe(artifactId)
      expect(sessionId).not.toBe(artifactId)
    })
  })

  describe("Validation Functions", () => {
    it("should validate session IDs correctly", async () => {
      const validIds = [
        "session-123",
        "session_abc_123",
        "session123",
        "SESSION_ABC",
        "session-123-456"
      ]

      const invalidIds = [
        "",
        "session 123", // space
        "session/123", // slash
        "session@123", // special char
        "session.123.456.invalid", // too many dots
        "session#123" // hash
      ]

      for (const validId of validIds) {
        const result = await Effect.runPromise(validateSessionId(validId))
        expect(result).toBe(validId)
      }

      for (const invalidId of invalidIds) {
        await expect(
          Effect.runPromise(validateSessionId(invalidId))
        ).rejects.toThrow()
      }
    })

    it("should validate non-empty strings", async () => {
      const validStrings = ["test", "hello world", "123", "a"]
      const invalidStrings = ["", "   ", "\t", "\n"]

      for (const valid of validStrings) {
        const result = await Effect.runPromise(validateNonEmpty(valid, "test"))
        expect(result).toBe(valid.trim())
      }

      for (const invalid of invalidStrings) {
        const result = await Effect.runPromise(
          validateNonEmpty(invalid, "test").pipe(
            Effect.flip,
            Effect.map(error => error.message)
          )
        )
        expect(result).toContain("cannot be empty")
      }
    })

    it("should validate required values", async () => {
      const validValues = ["test", 123, {}, [], true]
      const invalidValues = [undefined, null]

      for (const valid of validValues) {
        const result = await Effect.runPromise(validateRequired(valid, "test"))
        expect(result).toBe(valid)
      }

      for (const invalid of invalidValues) {
        const result = await Effect.runPromise(
          validateRequired(invalid, "test").pipe(
            Effect.flip,
            Effect.map(error => error.message)
          )
        )
        expect(result).toContain("is required")
      }
    })

    it("should validate tool inputs", async () => {
      const validInput = {
        toolName: TOOLS.CODER,
        sessionId: "session-123",
        instruction: "Analyze this code"
      }

      const result = await Effect.runPromise(validateToolInput(
        validInput.toolName,
        validInput.sessionId,
        validInput.instruction
      ))

      expect(result).toEqual(validInput)

      // Test invalid inputs
      const invalidCases = [
        { toolName: "", sessionId: "session-123", instruction: "test" },
        { toolName: TOOLS.CODER, sessionId: "", instruction: "test" },
        { toolName: TOOLS.CODER, sessionId: "session-123", instruction: "" }
      ]

      for (const invalid of invalidCases) {
        const result = await Effect.runPromise(
          validateToolInput(invalid.toolName, invalid.sessionId, invalid.instruction).pipe(
            Effect.flip,
            Effect.map(error => error.message)
          )
        )
        expect(result).toContain("cannot be empty")
      }
    })
  })

  describe("JSON Utilities", () => {
    it("should handle JSON serialization/deserialization", async () => {
      const testData = [
        { string: "test", number: 42, boolean: true },
        { array: [1, 2, 3], object: { nested: "value" } },
        { date: new Date().toISOString(), null: null },
        { complex: { nested: { deep: { value: 42 } }, array: [{ item: "test" }] } }
      ]

      for (const data of testData) {
        const jsonString = await Effect.runPromise(safeJsonStringify(data, "test"))
        expect(jsonString).toBeDefined()
        expect(typeof jsonString).toBe("string")

        const parsedData = await Effect.runPromise(safeJsonParse(jsonString, "test"))
        expect(parsedData).toEqual(data)
      }
    })

    it("should handle malformed JSON", async () => {
      const malformedJsonStrings = [
        "",
        "{ invalid json",
        "undefined",
        '"unclosed string'
      ]

      for (const malformed of malformedJsonStrings) {
        await expect(
          Effect.runPromise(safeJsonParse(malformed, "test"))
        ).rejects.toThrow()
      }
    })

    it("should handle circular references", async () => {
      const circularData: any = { name: "test" }
      circularData.self = circularData

      await expect(
        Effect.runPromise(safeJsonStringify(circularData, "test"))
      ).rejects.toThrow()
    })
  })

  describe("Error Handling", () => {
    it("should wrap errors with context", async () => {
      const mockLogger = {
        log: vi.fn(() => Effect.succeed(undefined))
      }

      const errorEffect = Effect.fail(new Error("Original error"))

      await expect(
        Effect.runPromise(
          withErrorHandling(errorEffect, "TestContext", mockLogger as any)
        )
      ).rejects.toThrow("TestContext: Original error")
    })

    it("should handle promise errors safely", async () => {
      const mockLogger = {
        log: vi.fn(() => Effect.succeed(undefined))
      }

      const successPromise = Promise.resolve("success")
      const failPromise = Promise.reject(new Error("Promise failed"))

      const successResult = await Effect.runPromise(
        safePromise(successPromise, "TestOperation", mockLogger as any)
      )
      expect(successResult).toBe("success")

      await expect(
        Effect.runPromise(
          safePromise(failPromise, "TestOperation", mockLogger as any)
        )
      ).rejects.toThrow()
    })
  })

  describe("Entity Creation", () => {
    it("should create valid sessions", () => {
      const metadata = { userId: "user-123", project: "test" }
      const session = createSession("session-123", metadata)

      expect(session.id).toBe("session-123")
      expect(session.status).toBe(SESSION_STATUSES.PLANNING)
      expect(session.metadata).toMatchObject(metadata)
      expect(session.createdAt).toBeInstanceOf(Date)
      expect(session.updatedAt).toBeInstanceOf(Date)
    })

    it("should create valid plans", () => {
      const steps = [
        createPlanStep("step-1", TOOLS.CODER, "Analyze code"),
        createPlanStep("step-2", TOOLS.BROWSER, "Test functionality")
      ]

      const plan = createPlan("plan-123", "Test Plan", steps, { priority: "high" })

      expect(plan.id).toBe("plan-123")
      expect(plan.title).toBe("Test Plan")
      expect(plan.status).toBe(PLAN_STATUSES.DRAFT)
      expect(plan.steps).toHaveLength(2)
      expect(plan.metadata?.priority).toBe("high")
    })

    it("should create valid plan steps", () => {
      const step = createPlanStep("step-1", TOOLS.CODER, "Analyze this React component")

      expect(step.id).toBe("step-1")
      expect(step.tool).toBe(TOOLS.CODER)
      expect(step.instruction).toBe("Analyze this React component")
      expect(step.status).toBe(STEP_STATUSES.PENDING)
    })

    it("should create valid artifacts", () => {
      const content = "console.log('Hello, World!');"
      const artifact = createArtifact(
        "artifact-123",
        "session-123",
        "/workspace/index.ts",
        "code",
        content,
        { author: "system" }
      )

      expect(artifact.id).toBe("artifact-123")
      expect(artifact.sessionId).toBe("session-123")
      expect(artifact.path).toBe("/workspace/index.ts")
      expect(artifact.kind).toBe("code")
      expect(artifact.content).toBe(content)
      expect(artifact.size).toBe(content.length)
      expect(artifact.metadata?.author).toBe("system")
    })

    it("should create valid events", () => {
      const event = createEvent(
        "event-123",
        "session-123",
        "tool_started",
        {
          tool_started: {
            toolName: TOOLS.CODER,
            stepId: "step-1",
            instruction: "Analyze code"
          }
        },
        { source: "orchestrator" }
      )

      expect(event.id).toBe("event-123")
      expect(event.sessionId).toBe("session-123")
      expect(event.type).toBe("tool_started")
      expect(event.content.tool_started?.toolName).toBe(TOOLS.CODER)
      expect(event.metadata?.source).toBe("orchestrator")
      expect(event.timestamp).toBeInstanceOf(Date)
    })
  })

  describe("Result Formatting", () => {
    it("should format tool results correctly", () => {
      const result = formatToolResult(
        TOOLS.CODER,
        true,
        "Code analyzed successfully",
        undefined,
        1500
      )

      expect(result.toolName).toBe(TOOLS.CODER)
      expect(result.success).toBe(true)
      expect(result.result).toBe("Code analyzed successfully")
      expect(result.error).toBeUndefined()
      expect(result.duration).toBe(1500)
      expect(result.timestamp).toBeInstanceOf(Date)
    })

    it("should format failed tool results", () => {
      const result = formatToolResult(
        TOOLS.BROWSER,
        false,
        undefined,
        "Navigation failed",
        800
      )

      expect(result.toolName).toBe(TOOLS.BROWSER)
      expect(result.success).toBe(false)
      expect(result.result).toBeUndefined()
      expect(result.error).toBe("Navigation failed")
      expect(result.duration).toBe(800)
    })
  })

  describe("Type Guards", () => {
    it("should correctly identify success/failure", () => {
      const success = { success: true, result: "test" }
      const failure = { success: false, error: "failed" }

      expect(isSuccess(success as any)).toBe(true)
      expect(isSuccess(failure as any)).toBe(false)
    })

    it("should correctly identify completed status", () => {
      expect(isCompleted(PLAN_STATUSES.COMPLETED)).toBe(true)
      expect(isCompleted(STEP_STATUSES.COMPLETED)).toBe(true)
      expect(isCompleted(SESSION_STATUSES.COMPLETED)).toBe(true)
      expect(isCompleted(PLAN_STATUSES.DRAFT)).toBe(false)
      expect(isCompleted(STEP_STATUSES.PENDING)).toBe(false)
    })

    it("should correctly identify failed status", () => {
      expect(isFailed(PLAN_STATUSES.FAILED)).toBe(true)
      expect(isFailed(STEP_STATUSES.FAILED)).toBe(true)
      expect(isFailed(SESSION_STATUSES.FAILED)).toBe(true)
      expect(isFailed(PLAN_STATUSES.DRAFT)).toBe(false)
      expect(isFailed(STEP_STATUSES.PENDING)).toBe(false)
    })

    it("should correctly identify running status", () => {
      expect(isRunning(PLAN_STATUSES.EXECUTING)).toBe(true)
      expect(isRunning(STEP_STATUSES.RUNNING)).toBe(true)
      expect(isRunning(SESSION_STATUSES.RUNNING)).toBe(true)
      expect(isRunning(PLAN_STATUSES.DRAFT)).toBe(false)
      expect(isRunning(STEP_STATUSES.PENDING)).toBe(false)
    })

    it("should correctly identify pending status", () => {
      expect(isPending(PLAN_STATUSES.DRAFT)).toBe(false) // Plans don't have pending
      expect(isPending(STEP_STATUSES.PENDING)).toBe(true)
      expect(isPending(STEP_STATUSES.RUNNING)).toBe(false)
    })
  })

  describe("Performance Properties", () => {
    it("should handle large objects efficiently", async () => {
      const largeObject = {
        data: new Array(1000).fill(null).map((_, i) => ({
          id: i,
          content: "x".repeat(100),
          metadata: { index: i, timestamp: Date.now() }
        }))
      }

      const startTime = Date.now()
      const jsonString = await Effect.runPromise(safeJsonStringify(largeObject, "large_test"))
      const serializationTime = Date.now() - startTime

      expect(jsonString.length).toBeGreaterThan(100000)
      expect(serializationTime).toBeLessThan(1000)

      const deserializationStart = Date.now()
      const parsedData = await Effect.runPromise(safeJsonParse(jsonString, "large_test"))
      const deserializationTime = Date.now() - deserializationStart

      expect(parsedData).toEqual(largeObject)
      expect(deserializationTime).toBeLessThan(1000)
    })

    it("should maintain ID generation performance", () => {
      const startTime = Date.now()
      const numIds = 10000
      const ids = new Set<string>()

      for (let i = 0; i < numIds; i++) {
        const id = generateId("perf")
        ids.add(id)
      }

      const generationTime = Date.now() - startTime

      expect(ids.size).toBe(numIds)
      expect(generationTime).toBeLessThan(1000) // Should complete within 1 second
    })
  })
})
