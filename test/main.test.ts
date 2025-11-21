import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer, Queue, Console, Context, Exit } from "effect"
import { VoiceService } from "../src/services/VoiceService.js"
import { CoderService } from "../src/services/CoderService.js"
import { BrowserService } from "../src/services/BrowserService.js"
import type { RealtimeEvent, FunctionCallEvent } from "../src/domain.js"

// Mock Layer Factory
const createMockVoiceLayer = (events: RealtimeEvent[], capturedMessages: RealtimeEvent[]) => {
  return Layer.effect(
    VoiceService,
    Effect.gen(function* () {
      const eventQueue = yield* Queue.unbounded<RealtimeEvent>()

      // Populate queue with events
      for (const event of events) {
        yield* Queue.offer(eventQueue, event)
      }

      return VoiceService.of({
        connect: Effect.void,
        eventStream: eventQueue,
        send: (event: RealtimeEvent) =>
          Effect.sync(() => {
            capturedMessages.push(event)
          }),
      })
    })
  )
}

const createMockCoderLayer = (responses: Map<string, string>) => {
  return Layer.succeed(
    CoderService,
    CoderService.of({
      createSession: (name: string) => Effect.succeed(`✅ Created Claude Session: ${name}`),
      execute: (sessionId: string, instruction: string) =>
        Effect.succeed(responses.get(instruction) || `Mock response for: ${instruction}`),
    })
  )
}

const createMockBrowserLayer = (actionResponses: Map<string, string>) => {
  let currentUrl = ""

  return Layer.succeed(
    BrowserService,
    BrowserService.of({
      navigate: (url: string) =>
        Effect.sync(() => {
          currentUrl = url
        }),
      act: (instruction: string) =>
        Effect.succeed(actionResponses.get(instruction) || `Mock action: ${instruction} on ${currentUrl}`),
    })
  )
}

// Testable MainProgram that stops after N iterations
const createTestableMainProgram = (maxIterations: number) => {
  return Effect.gen(function* () {
    const voice = yield* VoiceService
    const coder = yield* CoderService
    const browser = yield* BrowserService

    yield* Console.log("🤖 Big 3 Super Agent Started...")

    yield* voice.send({
      type: "session.update",
      session: {
        instructions:
          "You are a Super Agent Orchestrator. Dispatch tasks to Claude (coding) or Gemini (browser).",
        tools: [
          {
            type: "function",
            name: "command_agent",
            description: "Send a command to the coding agent",
            parameters: {
              type: "object",
              properties: {
                instruction: { type: "string" },
              },
              required: ["instruction"],
            },
          },
          {
            type: "function",
            name: "browser_use",
            description: "Control the browser",
            parameters: {
              type: "object",
              properties: {
                url: { type: "string" },
                task: { type: "string" },
              },
              required: ["task"],
            },
          },
        ],
      },
    })

    let iterations = 0
    while (iterations < maxIterations) {
      const event = yield* Queue.take(voice.eventStream)

      if (event.type === "response.function_call_arguments.done") {
        const functionEvent = event as FunctionCallEvent
        const functionName = functionEvent.name
        const args = JSON.parse(functionEvent.arguments)

        yield* Console.log(`🛠️ Tool Call: ${functionName}`)

        if (functionName === "command_agent") {
          const result = yield* coder.execute("default-session", args.instruction)
          yield* voice.send({
            type: "conversation.item.create",
            item: {
              type: "function_call_output",
              call_id: functionEvent.call_id,
              output: result,
            },
          })
        } else if (functionName === "browser_use") {
          if (args.url) yield* browser.navigate(args.url)
          const result = yield* browser.act(args.task)
          yield* voice.send({
            type: "conversation.item.create",
            item: {
              type: "function_call_output",
              call_id: functionEvent.call_id,
              output: result,
            },
          })
        }

        yield* voice.send({ type: "response.create" })
      }

      iterations++
    }
  })
}

describe("MainProgram Integration Tests", () => {
  it.effect("should initialize and send session.update with tools", () =>
    Effect.gen(function* () {
      // Arrange
      const capturedMessages: RealtimeEvent[] = []
      const mockEvents: RealtimeEvent[] = []

      const testLayer = Layer.mergeAll(
        createMockVoiceLayer(mockEvents, capturedMessages),
        createMockCoderLayer(new Map()),
        createMockBrowserLayer(new Map())
      )

      // Act
      const program = createTestableMainProgram(0)
      yield* program.pipe(Effect.provide(testLayer))

      // Assert
      expect(capturedMessages).toHaveLength(1)
      expect(capturedMessages[0].type).toBe("session.update")
      expect((capturedMessages[0] as any).session.tools).toHaveLength(2)
      expect((capturedMessages[0] as any).session.tools[0].name).toBe("command_agent")
      expect((capturedMessages[0] as any).session.tools[1].name).toBe("browser_use")
    })
  )

  it.effect("should handle command_agent function call", () =>
    Effect.gen(function* () {
      // Arrange
      const capturedMessages: RealtimeEvent[] = []
      const functionCallEvent: FunctionCallEvent = {
        type: "response.function_call_arguments.done",
        name: "command_agent",
        call_id: "call_123",
        arguments: JSON.stringify({ instruction: "Write a hello world function" }),
      }

      const coderResponses = new Map([
        ["Write a hello world function", "function hello() { console.log('Hello World'); }"],
      ])

      const testLayer = Layer.mergeAll(
        createMockVoiceLayer([functionCallEvent], capturedMessages),
        createMockCoderLayer(coderResponses),
        createMockBrowserLayer(new Map())
      )

      // Act
      const program = createTestableMainProgram(1)
      yield* program.pipe(Effect.provide(testLayer))

      // Assert - session.update + conversation.item.create + response.create
      expect(capturedMessages).toHaveLength(3)
      expect(capturedMessages[0].type).toBe("session.update")
      expect(capturedMessages[1].type).toBe("conversation.item.create")
      expect((capturedMessages[1] as any).item.call_id).toBe("call_123")
      expect((capturedMessages[1] as any).item.output).toContain("Hello World")
      expect(capturedMessages[2].type).toBe("response.create")
    })
  )

  it.effect("should handle browser_use function call with navigation", () =>
    Effect.gen(function* () {
      // Arrange
      const capturedMessages: RealtimeEvent[] = []
      const functionCallEvent: FunctionCallEvent = {
        type: "response.function_call_arguments.done",
        name: "browser_use",
        call_id: "call_456",
        arguments: JSON.stringify({
          url: "https://example.com",
          task: "Click the login button",
        }),
      }

      const browserResponses = new Map([
        ["Click the login button", "✅ Clicked login button successfully"],
      ])

      const testLayer = Layer.mergeAll(
        createMockVoiceLayer([functionCallEvent], capturedMessages),
        createMockCoderLayer(new Map()),
        createMockBrowserLayer(browserResponses)
      )

      // Act
      const program = createTestableMainProgram(1)
      yield* program.pipe(Effect.provide(testLayer))

      // Assert
      expect(capturedMessages).toHaveLength(3)
      expect(capturedMessages[1].type).toBe("conversation.item.create")
      expect((capturedMessages[1] as any).item.call_id).toBe("call_456")
      expect((capturedMessages[1] as any).item.output).toContain("Clicked login button")
      expect(capturedMessages[2].type).toBe("response.create")
    })
  )

  it.effect("should handle browser_use function call without url", () =>
    Effect.gen(function* () {
      // Arrange
      const capturedMessages: RealtimeEvent[] = []
      const functionCallEvent: FunctionCallEvent = {
        type: "response.function_call_arguments.done",
        name: "browser_use",
        call_id: "call_789",
        arguments: JSON.stringify({
          task: "Read the page title",
        }),
      }

      const browserResponses = new Map([
        ["Read the page title", "Page title: Example Domain"],
      ])

      const testLayer = Layer.mergeAll(
        createMockVoiceLayer([functionCallEvent], capturedMessages),
        createMockCoderLayer(new Map()),
        createMockBrowserLayer(browserResponses)
      )

      // Act
      const program = createTestableMainProgram(1)
      yield* program.pipe(Effect.provide(testLayer))

      // Assert
      expect(capturedMessages).toHaveLength(3)
      expect((capturedMessages[1] as any).item.output).toContain("Page title")
    })
  )

  it.effect("should process multiple function calls in sequence", () =>
    Effect.gen(function* () {
      // Arrange
      const capturedMessages: RealtimeEvent[] = []
      const events: RealtimeEvent[] = [
        {
          type: "response.function_call_arguments.done",
          name: "command_agent",
          call_id: "call_1",
          arguments: JSON.stringify({ instruction: "Create a function" }),
        } as FunctionCallEvent,
        {
          type: "response.function_call_arguments.done",
          name: "browser_use",
          call_id: "call_2",
          arguments: JSON.stringify({ url: "https://test.com", task: "Test it" }),
        } as FunctionCallEvent,
        {
          type: "response.function_call_arguments.done",
          name: "command_agent",
          call_id: "call_3",
          arguments: JSON.stringify({ instruction: "Add tests" }),
        } as FunctionCallEvent,
      ]

      const coderResponses = new Map([
        ["Create a function", "function created"],
        ["Add tests", "tests added"],
      ])
      const browserResponses = new Map([["Test it", "test passed"]])

      const testLayer = Layer.mergeAll(
        createMockVoiceLayer(events, capturedMessages),
        createMockCoderLayer(coderResponses),
        createMockBrowserLayer(browserResponses)
      )

      // Act - Process 3 events
      const program = createTestableMainProgram(3)
      yield* program.pipe(Effect.provide(testLayer))

      // Assert - session.update + (3 × conversation.item.create + 3 × response.create) = 7
      expect(capturedMessages).toHaveLength(7)
      expect(capturedMessages.filter((m) => m.type === "conversation.item.create")).toHaveLength(3)
      expect(capturedMessages.filter((m) => m.type === "response.create")).toHaveLength(3)
    })
  )

  it.effect("should ignore non-function-call events", () =>
    Effect.gen(function* () {
      // Arrange
      const capturedMessages: RealtimeEvent[] = []
      const events: RealtimeEvent[] = [
        { type: "session.created", id: "session_123" },
        { type: "response.audio_transcript.delta", delta: "..." },
        {
          type: "response.function_call_arguments.done",
          name: "command_agent",
          call_id: "call_1",
          arguments: JSON.stringify({ instruction: "test" }),
        } as FunctionCallEvent,
      ]

      const coderResponses = new Map([["test", "ok"]])

      const testLayer = Layer.mergeAll(
        createMockVoiceLayer(events, capturedMessages),
        createMockCoderLayer(coderResponses),
        createMockBrowserLayer(new Map())
      )

      // Act - Process all 3 events
      const program = createTestableMainProgram(3)
      yield* program.pipe(Effect.provide(testLayer))

      // Assert - Only 1 function call processed: session.update + conversation.item.create + response.create
      expect(capturedMessages.filter((m) => m.type === "conversation.item.create")).toHaveLength(1)
      expect(capturedMessages.filter((m) => m.type === "response.create")).toHaveLength(1)
    })
  )

  it.effect("should handle coder service errors", () =>
    Effect.gen(function* () {
      // Arrange
      const capturedMessages: RealtimeEvent[] = []
      const functionCallEvent: FunctionCallEvent = {
        type: "response.function_call_arguments.done",
        name: "command_agent",
        call_id: "call_error",
        arguments: JSON.stringify({ instruction: "cause error" }),
      }

      const failingCoderLayer = Layer.succeed(
        CoderService,
        CoderService.of({
          createSession: (name: string) => Effect.succeed(`Session: ${name}`),
          execute: (sessionId: string, instruction: string) =>
            Effect.fail(new Error("Coder service unavailable")),
        })
      )

      const testLayer = Layer.mergeAll(
        createMockVoiceLayer([functionCallEvent], capturedMessages),
        failingCoderLayer,
        createMockBrowserLayer(new Map())
      )

      // Act
      const program = createTestableMainProgram(1)
      const result = yield* Effect.either(program.pipe(Effect.provide(testLayer)))

      // Assert
      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left.message).toContain("Coder service unavailable")
      }
    })
  )

  it.effect("should handle browser service navigation errors", () =>
    Effect.gen(function* () {
      // Arrange
      const capturedMessages: RealtimeEvent[] = []
      const functionCallEvent: FunctionCallEvent = {
        type: "response.function_call_arguments.done",
        name: "browser_use",
        call_id: "call_browser_error",
        arguments: JSON.stringify({ url: "invalid://url", task: "navigate" }),
      }

      const failingBrowserLayer = Layer.succeed(
        BrowserService,
        BrowserService.of({
          navigate: (url: string) => Effect.fail(new Error("Navigation failed: invalid URL")),
          act: (instruction: string) => Effect.succeed("ok"),
        })
      )

      const testLayer = Layer.mergeAll(
        createMockVoiceLayer([functionCallEvent], capturedMessages),
        createMockCoderLayer(new Map()),
        failingBrowserLayer
      )

      // Act
      const program = createTestableMainProgram(1)
      const result = yield* Effect.either(program.pipe(Effect.provide(testLayer)))

      // Assert
      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left.message).toContain("Navigation failed")
      }
    })
  )

  it.effect("should handle browser service action errors", () =>
    Effect.gen(function* () {
      // Arrange
      const capturedMessages: RealtimeEvent[] = []
      const functionCallEvent: FunctionCallEvent = {
        type: "response.function_call_arguments.done",
        name: "browser_use",
        call_id: "call_act_error",
        arguments: JSON.stringify({ task: "invalid action" }),
      }

      const failingBrowserLayer = Layer.succeed(
        BrowserService,
        BrowserService.of({
          navigate: (url: string) => Effect.void,
          act: (instruction: string) => Effect.fail(new Error("Action failed: element not found")),
        })
      )

      const testLayer = Layer.mergeAll(
        createMockVoiceLayer([functionCallEvent], capturedMessages),
        createMockCoderLayer(new Map()),
        failingBrowserLayer
      )

      // Act
      const program = createTestableMainProgram(1)
      const result = yield* Effect.either(program.pipe(Effect.provide(testLayer)))

      // Assert
      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left.message).toContain("Action failed")
      }
    })
  )

  it.effect("should route function calls correctly based on function name", () =>
    Effect.gen(function* () {
      // Arrange
      const capturedMessages: RealtimeEvent[] = []
      let coderCalled = false
      let browserCalled = false

      const trackingCoderLayer = Layer.succeed(
        CoderService,
        CoderService.of({
          createSession: (name: string) => Effect.succeed(name),
          execute: (sessionId: string, instruction: string) =>
            Effect.sync(() => {
              coderCalled = true
              return "coder response"
            }),
        })
      )

      const trackingBrowserLayer = Layer.succeed(
        BrowserService,
        BrowserService.of({
          navigate: (url: string) => Effect.void,
          act: (instruction: string) =>
            Effect.sync(() => {
              browserCalled = true
              return "browser response"
            }),
        })
      )

      const events: RealtimeEvent[] = [
        {
          type: "response.function_call_arguments.done",
          name: "command_agent",
          call_id: "call_1",
          arguments: JSON.stringify({ instruction: "test" }),
        } as FunctionCallEvent,
        {
          type: "response.function_call_arguments.done",
          name: "browser_use",
          call_id: "call_2",
          arguments: JSON.stringify({ task: "test" }),
        } as FunctionCallEvent,
      ]

      const testLayer = Layer.mergeAll(
        createMockVoiceLayer(events, capturedMessages),
        trackingCoderLayer,
        trackingBrowserLayer
      )

      // Act
      const program = createTestableMainProgram(2)
      yield* program.pipe(Effect.provide(testLayer))

      // Assert
      expect(coderCalled).toBe(true)
      expect(browserCalled).toBe(true)
    })
  )

  it.effect("should handle unknown function names gracefully", () =>
    Effect.gen(function* () {
      // Arrange
      const capturedMessages: RealtimeEvent[] = []
      const functionCallEvent: FunctionCallEvent = {
        type: "response.function_call_arguments.done",
        name: "unknown_function",
        call_id: "call_unknown",
        arguments: JSON.stringify({ data: "test" }),
      }

      const testLayer = Layer.mergeAll(
        createMockVoiceLayer([functionCallEvent], capturedMessages),
        createMockCoderLayer(new Map()),
        createMockBrowserLayer(new Map())
      )

      // Act
      const program = createTestableMainProgram(1)
      yield* program.pipe(Effect.provide(testLayer))

      // Assert - Unknown function is ignored, session.update + response.create (no conversation.item.create)
      expect(capturedMessages).toHaveLength(2)
      expect(capturedMessages[0].type).toBe("session.update")
      expect(capturedMessages[1].type).toBe("response.create")
      expect(capturedMessages.filter((m) => m.type === "conversation.item.create")).toHaveLength(0)
    })
  )
})
