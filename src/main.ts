import * as dotenv from "dotenv"
import { Console, Effect, Layer, Queue } from "effect"
import { BrowserService, BrowserServiceLive } from "./services/BrowserService.js"
import { CoderService, CoderServiceLive } from "./services/CoderService.js"
import { VoiceService, VoiceServiceLive } from "./services/VoiceService.js"

dotenv.config()

const MainProgram = Effect.gen(function*(_) {
  const voice = yield* _(VoiceService)
  const coder = yield* _(CoderService)
  const browser = yield* _(BrowserService)

  yield* _(Console.log("🤖 Big 3 Super Agent Started..."))

  // Configure OpenAI Session
  yield* _(
    voice.send({
      type: "session.update",
      session: {
        instructions: "You are a Super Agent Orchestrator. Dispatch tasks to Claude (coding) or Gemini (browser).",
        tools: [
          {
            type: "function",
            name: "command_agent",
            description: "Send a command to the coding agent",
            parameters: {
              type: "object",
              properties: { instruction: { type: "string" } }
            }
          },
          {
            type: "function",
            name: "browser_use",
            description: "Control the browser",
            parameters: {
              type: "object",
              properties: { url: { type: "string" }, task: { type: "string" } }
            }
          }
        ]
      }
    })
  )

  // Main Event Loop
  while (true) {
    const event = yield* _(Queue.take(voice.eventStream))

    if (event.type === "response.function_call_arguments.done") {
      const functionName = event.name
      const args = JSON.parse(event.arguments)

      yield* _(Console.log(`🛠️ Tool Call: ${functionName}`))

      if (functionName === "command_agent") {
        const result = yield* _(
          coder.execute("default-session", args.instruction)
        )
        yield* _(
          voice.send({
            type: "conversation.item.create",
            item: { type: "function_call_output", output: result }
          })
        )
      } else if (functionName === "browser_use") {
        if (args.url) yield* _(browser.navigate(args.url))
        const result = yield* _(browser.act(args.task))
        yield* _(
          voice.send({
            type: "conversation.item.create",
            item: { type: "function_call_output", output: result }
          })
        )
      }

      // Trigger response generation after tool output
      yield* _(voice.send({ type: "response.create" }))
    }
  }
})

// Dependency Injection
const SuperAgentLayer = Layer.mergeAll(
  VoiceServiceLive,
  CoderServiceLive,
  BrowserServiceLive
)

// Run the Program
Effect.runPromise(MainProgram.pipe(Effect.provide(SuperAgentLayer))).catch(
  console.error
)
