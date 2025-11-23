import { Context, Effect, Layer } from "effect"
import type { AgentTool, ExecutionNode, ExecutionPlan, WorkflowResult } from "../domain.js"
import { BrowserService } from "./BrowserService.js"
import { CoderService } from "./CoderService.js"

export interface ExecutionService {
  readonly executeParallel: (plan: ExecutionPlan) => Effect.Effect<WorkflowResult, Error>
}

export const ExecutionService = Context.GenericTag<ExecutionService>("ExecutionService")

// Type-safe tool dispatcher using discriminated unions
const dispatchTool = (
  nodeId: string,
  tool: AgentTool,
  coder: CoderService,
  browser: BrowserService
): Effect.Effect<{ nodeId: string; output: unknown }, Error> =>
  Effect.gen(function*(_) {
    switch (tool.tag) {
      case "CreateAgent": {
        // CreateAgent is metadata-only, no execution needed
        return { nodeId, output: `Created ${tool.agentType} agent: ${tool.name}` }
      }

      case "CommandAgent": {
        const result = yield* _(coder.execute(tool.name, tool.instruction))
        return { nodeId, output: result }
      }

      case "BrowserUse": {
        if (tool.url) {
          yield* _(browser.navigate(tool.url))
        }
        const result = yield* _(browser.act(tool.task))
        return { nodeId, output: result }
      }

      default: {
        // Exhaustive check - TypeScript will error if we miss a case
        const _exhaustive: never = tool
        return _exhaustive
      }
    }
  })

// Execute a single batch of parallel nodes
const executeBatch = (
  batch: ReadonlyArray<string>,
  nodes: Record<string, ExecutionNode>,
  coder: CoderService,
  browser: BrowserService
): Effect.Effect<ReadonlyArray<{ nodeId: string; output: unknown }>, Error> =>
  Effect.gen(function*(_) {
    // Execute all nodes in batch concurrently with unbounded parallelism
    const results = yield* _(
      Effect.all(
        batch.map((nodeId) => {
          const node = nodes[nodeId]
          if (!node) {
            return Effect.fail(new Error(`Node not found: ${nodeId}`))
          }
          return dispatchTool(nodeId, node.tool, coder, browser)
        }),
        { concurrency: "unbounded" }
      )
    )

    return results
  })

export const ExecutionServiceLive = Layer.effect(
  ExecutionService,
  Effect.gen(function*(_) {
    const coder = yield* _(CoderService)
    const browser = yield* _(BrowserService)

    return {
      executeParallel: (plan) =>
        Effect.gen(function*(_) {
          const completedNodes: Array<string> = []
          const failedNodes: Array<string> = []
          const outputs: Record<string, unknown> = {}

          // Execute all batches sequentially (batches contain parallel nodes)
          for (const batch of plan.parallelBatches) {
            const batchResults = yield* _(
              Effect.tryPromise({
                try: async () => {
                  const effect = executeBatch(batch, plan.nodes, coder, browser)
                  return await Effect.runPromise(effect)
                },
                catch: (error) => {
                  // Mark all nodes in batch as failed
                  for (const nodeId of batch) {
                    failedNodes.push(nodeId)
                  }
                  return new Error(
                    `Batch execution failed: ${error instanceof Error ? error.message : String(error)}`
                  )
                }
              }).pipe(
                Effect.catchAll(() => {
                  // Continue to next batch on error
                  return Effect.succeed([] as ReadonlyArray<{ nodeId: string; output: unknown }>)
                })
              )
            )

            // Collect results
            for (const result of batchResults) {
              completedNodes.push(result.nodeId)
              outputs[result.nodeId] = result.output
            }
          }

          const workflowResult: WorkflowResult = {
            planId: plan.id,
            completedNodes,
            failedNodes,
            outputs
          }

          return workflowResult
        })
    }
  })
)
