import { describe, expect, it, beforeEach, afterEach } from "@effect/vitest"
import { vi } from "vitest"
import { Effect, Layer } from "effect"
import { writeFile, mkdir, rm } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import {
  ProjectManagerService,
  ProjectManagerServiceLive,
} from "../src/services/ProjectManagerService.js"
import { CoderService } from "../src/services/CoderService.js"
import { BrowserService } from "../src/services/BrowserService.js"
import type { AgentTool, WorkflowResult } from "../src/domain.js"

describe("ProjectManagerService", () => {
  // Mock service layers
  const mockCoderService = Layer.succeed(CoderService, {
    createSession: (name) => Effect.succeed(`Session: ${name}`),
    execute: (sessionId, instruction) =>
      Effect.succeed(`Executed: ${instruction}`),
  })

  const mockBrowserService = Layer.succeed(BrowserService, {
    navigate: (url) => Effect.succeed(undefined),
    act: (task) => Effect.succeed(`Browser action: ${task}`),
  })

  const testLayer = ProjectManagerServiceLive.pipe(
    Layer.provide(mockCoderService),
    Layer.provide(mockBrowserService)
  )

  describe("delegate - ExecutionPlan creation", () => {
    it("should create plan from CommandAgent tool", async () => {
      const tool: AgentTool = {
        tag: "CommandAgent",
        name: "test-agent",
        instruction: "Write tests",
      }

      const program = Effect.gen(function* () {
        const service = yield* ProjectManagerService
        return yield* service.delegate(tool)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      )

      expect(result.id).toMatch(/^plan-[0-9a-f-]+$/)
      expect(Object.keys(result.nodes)).toHaveLength(1)

      const nodeId = Object.keys(result.nodes)[0]!
      const node = result.nodes[nodeId]!

      expect(node.id).toMatch(/^node-[0-9a-f-]+$/)
      expect(node.tool).toEqual(tool)
      expect(node.dependencies).toEqual([])
      expect(node.status).toBe("pending")
    })

    it("should create plan from BrowserUse tool", async () => {
      const tool: AgentTool = {
        tag: "BrowserUse",
        task: "Click submit button",
        url: "https://example.com",
      }

      const program = Effect.gen(function* () {
        const service = yield* ProjectManagerService
        return yield* service.delegate(tool)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      )

      expect(result.id).toMatch(/^plan-[0-9a-f-]+$/)
      expect(Object.keys(result.nodes)).toHaveLength(1)

      const nodeId = Object.keys(result.nodes)[0]!
      const node = result.nodes[nodeId]!

      expect(node.tool).toEqual(tool)
      expect(node.dependencies).toEqual([])
      expect(node.status).toBe("pending")
    })

    it("should create plan from CreateAgent tool", async () => {
      const tool: AgentTool = {
        tag: "CreateAgent",
        agentType: "coder",
        name: "test-coder",
      }

      const program = Effect.gen(function* () {
        const service = yield* ProjectManagerService
        return yield* service.delegate(tool)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      )

      expect(result.id).toMatch(/^plan-[0-9a-f-]+$/)
      expect(Object.keys(result.nodes)).toHaveLength(1)

      const nodeId = Object.keys(result.nodes)[0]!
      const node = result.nodes[nodeId]!

      expect(node.tool).toEqual(tool)
      expect(node.dependencies).toEqual([])
      expect(node.status).toBe("pending")
    })

    it("should create parallel batch structure with single node", async () => {
      const tool: AgentTool = {
        tag: "CommandAgent",
        name: "agent-1",
        instruction: "Task 1",
      }

      const program = Effect.gen(function* () {
        const service = yield* ProjectManagerService
        return yield* service.delegate(tool)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      )

      expect(result.parallelBatches).toHaveLength(1)
      expect(result.parallelBatches[0]).toHaveLength(1)

      const nodeId = result.parallelBatches[0]![0]!
      expect(result.nodes[nodeId]).toBeDefined()
    })

    it("should generate unique node IDs for multiple delegations", async () => {
      const tool1: AgentTool = {
        tag: "CommandAgent",
        name: "agent-1",
        instruction: "Task 1",
      }
      const tool2: AgentTool = {
        tag: "CommandAgent",
        name: "agent-2",
        instruction: "Task 2",
      }

      const program = Effect.gen(function* () {
        const service = yield* ProjectManagerService
        const plan1 = yield* service.delegate(tool1)
        const plan2 = yield* service.delegate(tool2)
        return { plan1, plan2 }
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      )

      const nodeId1 = Object.keys(result.plan1.nodes)[0]!
      const nodeId2 = Object.keys(result.plan2.nodes)[0]!

      expect(nodeId1).not.toBe(nodeId2)
      expect(result.plan1.id).not.toBe(result.plan2.id)
    })

    it("should create nodes with pending status by default", async () => {
      const tool: AgentTool = {
        tag: "BrowserUse",
        task: "Navigate to page",
      }

      const program = Effect.gen(function* () {
        const service = yield* ProjectManagerService
        return yield* service.delegate(tool)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      )

      const nodeId = Object.keys(result.nodes)[0]!
      expect(result.nodes[nodeId]!.status).toBe("pending")
    })

    it("should create nodes with empty dependencies array", async () => {
      const tool: AgentTool = {
        tag: "CommandAgent",
        name: "test",
        instruction: "Do something",
      }

      const program = Effect.gen(function* () {
        const service = yield* ProjectManagerService
        return yield* service.delegate(tool)
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      )

      const nodeId = Object.keys(result.nodes)[0]!
      expect(result.nodes[nodeId]!.dependencies).toEqual([])
      expect(Array.isArray(result.nodes[nodeId]!.dependencies)).toBe(true)
    })
  })

  describe("validate - WorkflowResult validation", () => {
    let testDir: string

    beforeEach(async () => {
      testDir = join(tmpdir(), `pm-test-${Date.now()}`)
      await mkdir(testDir, { recursive: true })
    })

    afterEach(async () => {
      await rm(testDir, { recursive: true, force: true })
    })

    it("should return false when failedNodes is not empty", async () => {
      const result: WorkflowResult = {
        planId: "plan-123",
        completedNodes: ["node-1"],
        failedNodes: ["node-2"],
        outputs: { "node-1": "success" },
      }

      const program = Effect.gen(function* () {
        const service = yield* ProjectManagerService
        return yield* service.validate(result)
      })

      const isValid = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      )

      expect(isValid).toBe(false)
    })

    it("should return false when outputs is empty", async () => {
      const result: WorkflowResult = {
        planId: "plan-123",
        completedNodes: ["node-1"],
        failedNodes: [],
        outputs: {},
      }

      const program = Effect.gen(function* () {
        const service = yield* ProjectManagerService
        return yield* service.validate(result)
      })

      const isValid = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      )

      expect(isValid).toBe(false)
    })

    it("should return true for non-file-path outputs", async () => {
      const result: WorkflowResult = {
        planId: "plan-123",
        completedNodes: ["node-1"],
        failedNodes: [],
        outputs: {
          "node-1": "Created test agent",
          "node-2": 42,
          "node-3": true,
        },
      }

      const program = Effect.gen(function* () {
        const service = yield* ProjectManagerService
        return yield* service.validate(result)
      })

      const isValid = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      )

      expect(isValid).toBe(true)
    })

    it("should return true when all file paths exist", async () => {
      const file1 = join(testDir, "test1.ts")
      const file2 = join(testDir, "test2.ts")

      await writeFile(file1, "console.log('test1')")
      await writeFile(file2, "console.log('test2')")

      const result: WorkflowResult = {
        planId: "plan-123",
        completedNodes: ["node-1", "node-2"],
        failedNodes: [],
        outputs: {
          "node-1": file1,
          "node-2": file2,
        },
      }

      const program = Effect.gen(function* () {
        const service = yield* ProjectManagerService
        return yield* service.validate(result)
      })

      const isValid = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      )

      expect(isValid).toBe(true)
    })

    it("should return false when any file path does not exist", async () => {
      const file1 = join(testDir, "exists.ts")
      const file2 = join(testDir, "does-not-exist.ts")

      await writeFile(file1, "console.log('exists')")

      const result: WorkflowResult = {
        planId: "plan-123",
        completedNodes: ["node-1", "node-2"],
        failedNodes: [],
        outputs: {
          "node-1": file1,
          "node-2": file2,
        },
      }

      const program = Effect.gen(function* () {
        const service = yield* ProjectManagerService
        return yield* service.validate(result)
      })

      const isValid = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      )

      expect(isValid).toBe(false)
    })

    it("should detect file paths using forward slashes", async () => {
      const filePath = join(testDir, "unix-style.ts")
      await writeFile(filePath, "console.log('unix')")

      const result: WorkflowResult = {
        planId: "plan-123",
        completedNodes: ["node-1"],
        failedNodes: [],
        outputs: {
          "node-1": filePath,
        },
      }

      const program = Effect.gen(function* () {
        const service = yield* ProjectManagerService
        return yield* service.validate(result)
      })

      const isValid = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      )

      expect(isValid).toBe(true)
    })

    it("should handle mixed output types correctly", async () => {
      const filePath = join(testDir, "mixed.ts")
      await writeFile(filePath, "console.log('mixed')")

      const result: WorkflowResult = {
        planId: "plan-123",
        completedNodes: ["node-1", "node-2", "node-3"],
        failedNodes: [],
        outputs: {
          "node-1": "Plain text output",
          "node-2": filePath,
          "node-3": 123,
        },
      }

      const program = Effect.gen(function* () {
        const service = yield* ProjectManagerService
        return yield* service.validate(result)
      })

      const isValid = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      )

      expect(isValid).toBe(true)
    })

    it("should return false when validation throws error", async () => {
      const result: WorkflowResult = {
        planId: "plan-123",
        completedNodes: ["node-1"],
        failedNodes: [],
        outputs: {
          "node-1": "/invalid/path/that/does/not/exist.ts",
        },
      }

      const program = Effect.gen(function* () {
        const service = yield* ProjectManagerService
        return yield* service.validate(result)
      })

      const isValid = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      )

      expect(isValid).toBe(false)
    })

    it("should handle both failed nodes and missing files", async () => {
      const result: WorkflowResult = {
        planId: "plan-123",
        completedNodes: ["node-1"],
        failedNodes: ["node-2"],
        outputs: {
          "node-1": "/nonexistent/file.ts",
        },
      }

      const program = Effect.gen(function* () {
        const service = yield* ProjectManagerService
        return yield* service.validate(result)
      })

      const isValid = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      )

      expect(isValid).toBe(false)
    })

    it("should return true for successful result with no file outputs", async () => {
      const result: WorkflowResult = {
        planId: "plan-123",
        completedNodes: ["node-1", "node-2"],
        failedNodes: [],
        outputs: {
          "node-1": "Created browser agent",
          "node-2": "Navigation complete",
        },
      }

      const program = Effect.gen(function* () {
        const service = yield* ProjectManagerService
        return yield* service.validate(result)
      })

      const isValid = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      )

      expect(isValid).toBe(true)
    })
  })

  describe("Layer integration", () => {
    it("should work with custom Layer composition", async () => {
      const customLayer = Layer.succeed(ProjectManagerService, {
        delegate: (tool) =>
          Effect.succeed({
            id: "custom-plan",
            nodes: { "custom-node": { id: "custom-node", tool, dependencies: [], status: "pending" } },
            parallelBatches: [["custom-node"]],
          }),
        validate: (result) => Effect.succeed(result.failedNodes.length === 0),
      })

      const tool: AgentTool = {
        tag: "CommandAgent",
        name: "custom",
        instruction: "test",
      }

      const program = Effect.gen(function* () {
        const service = yield* ProjectManagerService
        const plan = yield* service.delegate(tool)
        return plan
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(customLayer))
      )

      expect(result.id).toBe("custom-plan")
    })

    it("should allow multiple service calls in same Effect program", async () => {
      const tool: AgentTool = {
        tag: "CommandAgent",
        name: "multi",
        instruction: "test",
      }

      const program = Effect.gen(function* () {
        const service = yield* ProjectManagerService
        const plan1 = yield* service.delegate(tool)
        const plan2 = yield* service.delegate(tool)

        const result: WorkflowResult = {
          planId: plan1.id,
          completedNodes: ["node-1"],
          failedNodes: [],
          outputs: { "node-1": "success" },
        }

        const isValid = yield* service.validate(result)

        return { plan1, plan2, isValid }
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      )

      expect(result.plan1.id).not.toBe(result.plan2.id)
      expect(result.isValid).toBe(true)
    })
  })

  describe("E2E - Full delegate and validate workflow", () => {
    let testDir: string

    beforeEach(async () => {
      testDir = join(tmpdir(), `pm-e2e-test-${Date.now()}`)
      await mkdir(testDir, { recursive: true })
    })

    afterEach(async () => {
      await rm(testDir, { recursive: true, force: true })
    })

    it("should delegate tool and validate successful result with file outputs", async () => {
      const outputFile = join(testDir, "output.ts")
      await writeFile(outputFile, "export const test = true")

      const tool: AgentTool = {
        tag: "CommandAgent",
        name: "file-creator",
        instruction: "Create test file",
      }

      const program = Effect.gen(function* () {
        const service = yield* ProjectManagerService

        // Delegate to create plan
        const plan = yield* service.delegate(tool)

        // Simulate successful execution
        const result: WorkflowResult = {
          planId: plan.id,
          completedNodes: [Object.keys(plan.nodes)[0]!],
          failedNodes: [],
          outputs: {
            [Object.keys(plan.nodes)[0]!]: outputFile,
          },
        }

        // Validate result
        const isValid = yield* service.validate(result)

        return { plan, result, isValid }
      })

      const { plan, result, isValid } = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      )

      expect(Object.keys(plan.nodes)).toHaveLength(1)
      expect(result.failedNodes).toHaveLength(0)
      expect(isValid).toBe(true)
    })

    it("should detect failed workflow with missing files", async () => {
      const missingFile = join(testDir, "does-not-exist.ts")

      const tool: AgentTool = {
        tag: "CommandAgent",
        name: "file-creator",
        instruction: "Create test file",
      }

      const program = Effect.gen(function* () {
        const service = yield* ProjectManagerService

        const plan = yield* service.delegate(tool)

        const result: WorkflowResult = {
          planId: plan.id,
          completedNodes: [Object.keys(plan.nodes)[0]!],
          failedNodes: [],
          outputs: {
            [Object.keys(plan.nodes)[0]!]: missingFile,
          },
        }

        const isValid = yield* service.validate(result)

        return { plan, result, isValid }
      })

      const { isValid } = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      )

      expect(isValid).toBe(false)
    })

    it("should handle complete workflow with multiple output types", async () => {
      const validFile = join(testDir, "valid.ts")
      await writeFile(validFile, "export const valid = true")

      const tool: AgentTool = {
        tag: "BrowserUse",
        task: "Click and create file",
        url: "https://example.com",
      }

      const program = Effect.gen(function* () {
        const service = yield* ProjectManagerService

        const plan = yield* service.delegate(tool)

        const result: WorkflowResult = {
          planId: plan.id,
          completedNodes: [Object.keys(plan.nodes)[0]!],
          failedNodes: [],
          outputs: {
            [Object.keys(plan.nodes)[0]!]: validFile,
            metadata: "Browser task completed",
            count: 1,
          },
        }

        const isValid = yield* service.validate(result)

        return isValid
      })

      const isValid = await Effect.runPromise(
        program.pipe(Effect.provide(testLayer))
      )

      expect(isValid).toBe(true)
    })
  })
})
