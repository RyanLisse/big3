#!/usr/bin/env node

import { Context, Effect, Layer } from "effect";
import {
  type AgentSessionStatus,
  type AgentStreamEvent,
  StreamManager,
} from "../backend/agent/domain.js";
import { AgentLogger } from "../backend/agent/logging.js";

// CLI visualization interfaces
type StreamVisualization = {
  sessionId: string;
  events: AgentStreamEvent[];
  currentStatus: AgentSessionStatus;
  activeStep?: string;
  completedSteps: string[];
  failedSteps: string[];
  artifacts: Array<{
    id: string;
    path: string;
    kind: string;
    size: number;
  }>;
  logs: Array<{
    level: string;
    message: string;
    timestamp: Date;
  }>;
};

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
};

// CLI visualization service
export type StreamVisualizer = {
  readonly startVisualization: (
    sessionId: string
  ) => Effect.Effect<void, never>;
  readonly renderEvent: (event: AgentStreamEvent) => Effect.Effect<void, never>;
  readonly renderSummary: (sessionId: string) => Effect.Effect<void, never>;
  readonly stopVisualization: (sessionId: string) => Effect.Effect<void, never>;
};

export const StreamVisualizer =
  Context.GenericTag<StreamVisualizer>("StreamVisualizer");

// Live implementation
export const StreamVisualizerLive = Layer.effect(
  StreamVisualizer,
  Effect.gen(function* (_) {
    const streamManager = yield* StreamManager
    const _logger = yield* AgentLogger
    
    // Active visualizations
    const activeVisualizations = new Map<string, StreamVisualization>()

    return {
      startVisualization: (sessionId: string) =>
        Effect.gen(function* (_) {
          const visualization: StreamVisualization = {
            sessionId,
            events: [],
            currentStatus: "planning",
            completedSteps: [],
            failedSteps: [],
            artifacts: [],
            logs: []
          }

          activeVisualizations.set(sessionId, visualization)

          // Clear screen and show header
          console.clear()
          console.log(`${colors.cyan}${colors.bright}🤖 Big 3 Super-Agent V2 - Live Stream Visualization${colors.reset}`)
          console.log(`${colors.gray}Session ID: ${sessionId}${colors.reset}`)
          console.log(`${colors.gray}Started at: ${new Date().toISOString()}${colors.reset}`)
          console.log('─'.repeat(80))

          // Start event listening loop
          yield* Effect.fork(
            Effect.gen(function* (_) {
              const stream = yield* streamManager.getStream(sessionId)
              
              if (stream._tag === "Some") {
                while (true) {
                  const events = yield* stream.value.events
                  
                  for (const event of events) {
                    yield* renderEventInTerminal(event)
                    
                    // Update visualization state
                    const viz = activeVisualizations.get(sessionId)
                    if (viz) {
                      viz.events.push(event)
                      updateVisualizationState(viz, event)
                    }
                  }
                  
                  yield* Effect.sleep(100) // Poll every 100ms
                }
              }
            })
          )
        }),

      renderEvent: (event: AgentStreamEvent) =>
        Effect.sync(() => {
          renderEventInTerminal(event)
        }),

      renderSummary: (sessionId: string) =>
        Effect.gen(function* (_) {
          const viz = activeVisualizations.get(sessionId)
          if (!viz) { return }

          console.clear()
          console.log(`${colors.cyan}${colors.bright}📊 Session Summary${colors.reset}`)
          console.log(`${colors.gray}Session ID: ${sessionId}${colors.reset}`)
          console.log(`${colors.gray}Final Status: ${getStatusColor(viz.currentStatus)}${viz.currentStatus}${colors.reset}`)
          console.log('─'.repeat(80))

          // Plan summary
          if (viz.events.some(e => e.type === "plan_update")) {
            console.log(`\n${colors.yellow}📋 Plan Execution${colors.reset}`)
            console.log(`✅ Completed: ${viz.completedSteps.length}`)
            console.log(`❌ Failed: ${viz.failedSteps.length}`)
            
            if (viz.completedSteps.length > 0) {
              console.log(`\n${colors.green}Completed Steps:${colors.reset}`)
              viz.completedSteps.forEach(step => {
                console.log(`  ✅ ${step}`)
              })
            }
            
            if (viz.failedSteps.length > 0) {
              console.log(`\n${colors.red}Failed Steps:${colors.reset}`)
              viz.failedSteps.forEach(step => {
                console.log(`  ❌ ${step}`)
              })
            }
          }

          // Artifacts summary
          if (viz.artifacts.length > 0) {
            console.log(`\n${colors.blue}📁 Generated Artifacts (${viz.artifacts.length})${colors.reset}`)
            viz.artifacts.forEach(artifact => {
              const icon = getArtifactIcon(artifact.kind)
              console.log(`  ${icon} ${artifact.path} (${artifact.size} bytes)`)
            })
          }

          // Recent logs
          if (viz.logs.length > 0) {
            console.log(`\n${colors.magenta}📝 Recent Logs${colors.reset}`)
            viz.logs.slice(-5).forEach(log => {
              const levelColor = getLogLevelColor(log.level)
              console.log(`  ${levelColor}${log.level.toUpperCase()}${colors.reset}: ${log.message}`)
            })
          }

          console.log(`\n${'─'.repeat(80)}`)
          console.log(`${colors.gray}Session completed at: ${new Date().toISOString()}${colors.reset}`)
        }),

      stopVisualization: (sessionId: string) =>
        Effect.sync(() => {
          activeVisualizations.delete(sessionId)
          console.log(`\n${colors.yellow}📡 Stream visualization stopped for session: ${sessionId}${colors.reset}`)
        })
    })
)

// Helper functions
function renderEventInTerminal(event: AgentStreamEvent): void {
  const timestamp = event.timestamp.toLocaleTimeString()
  const prefix = `${colors.gray}[${timestamp}]${colors.reset}`

  switch (event.type) {
    case "status_change": {
      const fromStatus = getStatusColor(event.content.status_change?.fromStatus || "") + (event.content.status_change?.fromStatus || "")
      const toStatus = getStatusColor(event.content.status_change?.toStatus || "") + (event.content.status_change?.toStatus || "")
      console.log(`${prefix} 🔄 Status: ${fromStatus} → ${toStatus}`)
      if (event.content.status_change?.reason) {
        console.log(`   ${colors.dim}${event.content.status_change.reason}${colors.reset}`)
      }
      break
    }

    case "plan_update": {
      const plan = event.content.plan_update
      console.log(`${prefix} 📋 Plan: ${plan?.title} (${plan?.status})`)
      if (plan?.currentStep) {
        console.log(`   ${colors.cyan}▶️ Currently: ${plan.currentStep}${colors.reset}`)
      }
      if (plan?.steps) {
        plan.steps.forEach(step => {
          const stepIcon = getStepIcon(step.status)
          const stepColor = getStepColor(step.status)
          console.log(`   ${stepIcon} ${stepColor}${step.instruction}${colors.reset}`)
        })
      }
      break
    }

    case "tool_started": {
      const toolStarted = event.content.tool_started
      console.log(`${prefix} 🔧 Starting: ${toolStarted?.toolName} - ${toolStarted?.instruction}`)
      break
    }

    case "tool_finished": {
      const toolFinished = event.content.tool_finished
      const status = toolFinished?.success ? "✅" : "❌"
      const resultColor = toolFinished?.success ? colors.green : colors.red
      const duration = toolFinished?.duration ? ` (${toolFinished.duration}ms)` : ""
      console.log(`${prefix} ${status} Tool finished: ${toolFinished?.toolName}${duration}`)
      if (toolFinished?.result) {
        console.log(`   ${colors.dim}${toolFinished.result}${colors.reset}`)
      }
      if (toolFinished?.error) {
        console.log(`   ${resultColor}Error: ${toolFinished.error}${colors.reset}`)
      }
      break
    }

    case "artifact_created": {
      const artifact = event.content.artifact_created
      const artifactIcon = getArtifactIcon(artifact?.kind || "")
      console.log(`${prefix} ${artifactIcon} Created: ${artifact?.path} (${artifact?.size} bytes)`)
      break
    }

    case "checkpoint": {
      const checkpoint = event.content.checkpoint
      console.log(`${prefix} 💾 Checkpoint: ${checkpoint?.type} (${checkpoint?.checkpointId})`)
      break
    }

    case "log": {
      const log = event.content.log
      const levelColor = getLogLevelColor(log?.level || "")
      console.log(`${prefix} ${levelColor}${log?.level?.toUpperCase()}${colors.reset}: ${log?.message}`)
      break
    }

    default:
      console.log(`${prefix} 📡 Event: ${event.type}`)
  }
}

function updateVisualizationState(viz: StreamVisualization, event: AgentStreamEvent): void {
  switch (event.type) {
    case "status_change":
      if (event.content.status_change?.toStatus) {
        viz.currentStatus = event.content.status_change.toStatus
      }
      break

    case "plan_update": {
      const plan = event.content.plan_update
      if (plan?.steps) {
        plan.steps.forEach(step => {
          if (step.status === "completed" && !viz.completedSteps.includes(step.id)) {
            viz.completedSteps.push(step.id)
          } else if (step.status === "failed" && !viz.failedSteps.includes(step.id)) {
            viz.failedSteps.push(step.id)
          }
        })
      }
      break
    }

    case "artifact_created": {
      const artifact = event.content.artifact_created
      if (artifact) {
        viz.artifacts.push({
          id: artifact.artifactId,
          path: artifact.path,
          kind: artifact.kind,
          size: artifact.size
        })
      }
      break
    }

    case "log": {
      const log = event.content.log
      if (log) {
        viz.logs.push({
          level: log.level,
          message: log.message,
          timestamp: event.timestamp
        })
      }
      break
    }
  }
}

function getStatusColor(status: AgentSessionStatus): string {
  switch (status) {
    case "planning": return colors.yellow
    case "running": return colors.blue
    case "waiting_for_input": return colors.magenta
    case "completed": return colors.green
    case "failed": return colors.red
    case "cancelled": return colors.gray
    default: return colors.white
  }
}

function getStepIcon(status: string): string {
  switch (status) {
    case "pending": return "⏳"
    case "running": return "🔄"
    case "completed": return "✅"
    case "failed": return "❌"
    default: return "❓"
  }
}

function getStepColor(status: string): string {
  switch (status) {
    case "pending": return colors.gray
    case "running": return colors.blue
    case "completed": return colors.green
    case "failed": return colors.red
    default: return colors.white
  }
}

function getArtifactIcon(kind: string): string {
  switch (kind) {
    case "code": return "📄"
    case "note": return "📝"
    case "log": return "📋"
    case "attachment": return "📎"
    default: return "📁"
  }
}

function getLogLevelColor(level: string): string {
  switch (level) {
    case "debug": return colors.gray
    case "info": return colors.blue
    case "warn": return colors.yellow
    case "error": return colors.red
    default: return colors.white
  }
}

// CLI command implementation
export const visualizeStreamCommand = (sessionId: string) =>
  Effect.gen(function* (_) {
    const visualizer = yield* StreamVisualizer
    
    console.log(`${colors.cyan}🚀 Starting live stream visualization for session: ${sessionId}${colors.reset}`)
    console.log(`${colors.gray}Press Ctrl+C to stop${colors.reset}\n`)
    
    yield* visualizer.startVisualization(sessionId)
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      await Effect.runPromise(
        visualizer.stopVisualization(sessionId).pipe(
          Effect.catchAll(() => Effect.succeed(undefined))
        )
      )
      process.exit(0)
    })
    
    // Keep process alive
    yield* Effect.forever(Effect.sleep(1000))
  })

// Composite layers
export const StreamVisualizationLayers = Layer.mergeAll(
  StreamVisualizerLive
)

// CLI entry point
if (require.main === module) {
  const sessionId = process.argv[2]
  
  if (!sessionId) {
    console.error(`${colors.red}Error: Session ID required${colors.reset}`)
    console.error(`${colors.gray}Usage: npm run visualize-stream <session-id>${colors.reset}`)
    process.exit(1)
  }
  
  Effect.runPromise(
    visualizeStreamCommand(sessionId).pipe(
      Layer.provide(StreamVisualizationLayers)
    )
  ).catch(error => {
    console.error(`${colors.red}Error:${colors.reset}`, error)
    process.exit(1)
  })
}
