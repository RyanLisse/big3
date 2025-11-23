import { Context, Effect, Layer } from "effect"
import { access } from "node:fs/promises"
import { randomUUID } from "node:crypto"
import type {
  AgentTool,
  ExecutionNode,
  ExecutionPlan,
  WorkflowResult
} from "../domain.js"
import { BrowserService } from "./BrowserService.js"
import { CoderService } from "./CoderService.js"

/**
 * ProjectManagerService - Phase 1.1 MVP Implementation
 *
 * Orchestrates task delegation and validation for multi-agent workflows.
 * Routes tools to appropriate services and creates parallel execution plans.
 */
export interface ProjectManagerService {
  /**
   * Delegate tool execution by routing to appropriate service
   * and creating an execution plan with parallel batching.
   *
   * Routing logic:
   * - CommandAgent → CoderService
   * - BrowserUse → BrowserService
   * - CreateAgent → No-op (handled elsewhere)
   */
  readonly delegate: (tool: AgentTool) => Effect.Effect<ExecutionPlan, Error>

  /**
   * Validate workflow results using file existence checks.
   * Gate mechanism prevents bad handoffs between agents.
   */
  readonly validate: (result: WorkflowResult) => Effect.Effect<boolean, Error>
}

export const ProjectManagerService = Context.GenericTag<ProjectManagerService>(
  "ProjectManagerService"
)

/**
 * Live implementation using Effect.gen pattern.
 * Dependencies injected via Context: CoderService, BrowserService
 */
export const ProjectManagerServiceLive = Layer.effect(
  ProjectManagerService,
  Effect.gen(function*(_) {
    const coderService = yield* _(CoderService)
    const browserService = yield* _(BrowserService)

    return {
      /**
       * Creates execution plan from single tool.
       *
       * PARALLEL BATCHING LOGIC:
       * - Single tool = single node = single batch (no parallelization needed)
       * - For multiple tools (future): group independent tools (no shared dependencies)
       *   into same batch for concurrent execution via Effect.all
       *
       * Example with multiple tools:
       *   Tools: [CommandAgent, BrowserUse, CommandAgent]
       *   Dependencies: none between them
       *   Result: parallelBatches = [["node1", "node2", "node3"]]
       *   Execution: Effect.all([...]) runs all concurrently
       */
      delegate: (tool) =>
        Effect.gen(function*(_) {
          // Generate unique node ID using crypto.randomUUID
          const nodeId = `node-${randomUUID()}`

          // Create execution node with no dependencies (single tool)
          const node: ExecutionNode = {
            id: nodeId,
            tool,
            dependencies: [], // No dependencies for single-tool plans
            status: "pending"
          }

          // Single batch containing single node (no parallelization needed)
          const parallelBatches: ReadonlyArray<ReadonlyArray<string>> = [[nodeId]]

          // Create execution plan with nodes as Record (keyed by nodeId)
          const plan: ExecutionPlan = {
            id: `plan-${randomUUID()}`,
            nodes: { [nodeId]: node },
            parallelBatches
          }

          return plan
        }),

      /**
       * Validate workflow result by checking outputs.
       *
       * VALIDATION STRATEGY:
       * - File paths in outputs: verify existence via fs.access
       * - Non-file outputs: consider valid (truthy check)
       * - Empty outputs: fail validation
       *
       * This prevents handoffs when expected artifacts are missing.
       */
      validate: (result) =>
        Effect.gen(function*(_) {
          // Check for failed nodes first
          if (result.failedNodes.length > 0) {
            return false
          }

          // Validate outputs contain data
          const outputKeys = Object.keys(result.outputs)
          if (outputKeys.length === 0) {
            return false
          }

          // Validate file paths if present in outputs
          // Pattern: check for string values that look like file paths
          const filePaths = outputKeys
            .map(key => result.outputs[key])
            .filter((value): value is string =>
              typeof value === "string" &&
              (value.includes("/") || value.includes("\\"))
            )

          // If no file paths to validate, consider valid
          if (filePaths.length === 0) {
            return true
          }

          // Validate all file paths exist
          // Use Effect.forEach to check all paths
          const validationResults = yield* _(
            Effect.forEach(
              filePaths,
              (filePath) =>
                Effect.tryPromise({
                  try: () => access(filePath),
                  catch: () => new Error(`File not found: ${filePath}`)
                }).pipe(
                  Effect.map(() => true),
                  Effect.catchAll(() => Effect.succeed(false))
                )
            )
          )

          // Check if all validations succeeded
          return validationResults.every((isValid) => isValid)
        }).pipe(
          Effect.catchAll(() => Effect.succeed(false))
        )
    }
  })
)
