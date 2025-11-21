Refactoring the **Big 3 Super Agent** (originally a 3000+ line Python monolith) to TypeScript is a significant architectural upgrade.

Given the complexity of orchestrating **OpenAI Realtime** (WebSockets), **Gemini** (Browser Automation), and **Claude** (File/Code Ops), the best way to "use effects" in TypeScript is to use **Effect-TS** (the `effect` library). It provides the robust concurrency, error handling, and resource management (like managing WebSocket connections and browser contexts) that a "Super Agent" requires.

Below is the refactored architecture and core implementation using **Effect-TS**.

### **Architecture Overview**

We will break the monolithic Python classes (`OpenAIRealtimeVoiceAgent`, `ClaudeCodeAgenticCoder`, `GeminiBrowserAgent`) into Composable Services (Layers) in Effect.

- **`VoiceService`**: Manages the OpenAI Realtime WebSocket connection.
- **`BrowserService`**: Manages the Playwright instance controlled by Gemini.
- **`CoderService`**: Manages file operations and Claude API interactions.
- **`Orchestrator`**: The main program that wires them together.

### **Prerequisites**

```bash
npm install effect @anthropic-ai/sdk google-generative-ai ws playwright dotenv
npm install --save-dev typescript @types/ws @types/node
```

### **1. Define the Domain Models**

Create a file `src/domain.ts` to define the events and tools.

```typescript
// src/domain.ts
import { Schema } from "@effect/schema"

export interface AgentSession {
  readonly id: string
  readonly type: "coder" | "browser"
  readonly status: "idle" | "running" | "error"
}

// Tool definitions for the Voice Agent to call
export type AgentTool =
  | {
      readonly tag: "CreateAgent"
      readonly agentType: "coder" | "browser"
      readonly name: string
    }
  | {
      readonly tag: "CommandAgent"
      readonly name: string
      readonly instruction: string
    }
  | { readonly tag: "BrowserUse"; readonly task: string; readonly url?: string }

export class AgentError {
  readonly _tag = "AgentError"
  constructor(readonly message: string, readonly cause?: unknown) {}
}
```

### **2. The Coder Service (Claude)**

Refactoring `ClaudeCodeAgenticCoder`.

```typescript
// src/services/CoderService.ts
import { Effect, Context, Layer } from "effect"
import Anthropic from "@anthropic-ai/sdk"

export interface CoderService {
  readonly createSession: (name: string) => Effect.Effect<string, Error>
  readonly execute: (
    sessionId: string,
    instruction: string
  ) => Effect.Effect<string, Error>
}

export const CoderService = Context.GenericTag<CoderService>("CoderService")

// Implementation using Anthropic SDK
export const CoderServiceLive = Layer.effect(
  CoderService,
  Effect.gen(function* (_) {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    return {
      createSession: (name) =>
        Effect.succeed(`Created Claude Session: ${name}`), // In reality, setup working dir here

      execute: (sessionId, instruction) =>
        Effect.tryPromise({
          try: async () => {
            // Simulate Claude Code interaction
            const msg = await client.messages.create({
              model: "claude-3-5-sonnet-20240620",
              max_tokens: 1024,
              messages: [{ role: "user", content: instruction }]
            })
            return (msg.content[0] as any).text
          },
          catch: (error) => new Error(`Claude execution failed: ${error}`)
        })
    }
  })
)
```

### **3. The Browser Service (Gemini)**

Refactoring `GeminiBrowserAgent` using Playwright.

```typescript
// src/services/BrowserService.ts
import { Effect, Context, Layer } from "effect"
import { chromium, Browser, Page } from "playwright"
import { GoogleGenerativeAI } from "@google/generative-ai"

export interface BrowserService {
  readonly navigate: (url: string) => Effect.Effect<void, Error>
  readonly act: (instruction: string) => Effect.Effect<string, Error>
}

export const BrowserService =
  Context.GenericTag<BrowserService>("BrowserService")

export const BrowserServiceLive = Layer.scoped(
  BrowserService,
  Effect.gen(function* (_) {
    // Manage Browser Resource Scope
    const browser = yield* _(
      Effect.acquireRelease(
        Effect.tryPromise(() => chromium.launch({ headless: false })),
        (b) => Effect.promise(() => b.close())
      )
    )

    const context = yield* _(Effect.tryPromise(() => browser.newContext()))
    const page = yield* _(Effect.tryPromise(() => context.newPage()))
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })

    return {
      navigate: (url) =>
        Effect.tryPromise(() => page.goto(url)).pipe(Effect.asVoid),

      act: (instruction) =>
        Effect.tryPromise(async () => {
          // Take screenshot for Gemini Computer Use
          const screenshot = await page.screenshot()
          const prompt = `Act on this page: ${instruction}`

          // Send to Gemini (Simplified)
          const result = await model.generateContent([
            prompt,
            {
              inlineData: {
                data: screenshot.toString("base64"),
                mimeType: "image/png"
              }
            }
          ])

          return result.response.text()
        })
    }
  })
)
```

### **4. The Voice Service (OpenAI Realtime)**

Refactoring `OpenAIRealtimeVoiceAgent`. This is where "Effects" shine by managing the WebSocket stream.

```typescript
// src/services/VoiceService.ts
import { Effect, Context, Layer, Queue, Console } from "effect"
import WebSocket from "ws"

export interface VoiceService {
  readonly connect: Effect.Effect<void, Error>
  readonly eventStream: Queue.Dequeue<any> // Stream of events from OpenAI
  readonly send: (event: any) => Effect.Effect<void, Error>
}

export const VoiceService = Context.GenericTag<VoiceService>("VoiceService")

export const VoiceServiceLive = Layer.scoped(
  VoiceService,
  Effect.gen(function* (_) {
    const eventQueue = yield* _(Queue.unbounded<any>())

    // Managed WebSocket Connection
    const ws = yield* _(
      Effect.acquireRelease(
        Effect.tryPromise(() => {
          const url =
            "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01"
          return new Promise<WebSocket>((resolve, reject) => {
            const socket = new WebSocket(url, {
              headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                "OpenAI-Beta": "realtime=v1"
              }
            })
            socket.on("open", () => resolve(socket))
            socket.on("error", reject)
          })
        }),
        (socket) => Effect.sync(() => socket.close())
      )
    )

    // Listen to messages and push to queue
    yield* _(
      Effect.sync(() => {
        ws.on("message", (data) => {
          const event = JSON.parse(data.toString())
          Queue.offer(eventQueue, event).pipe(Effect.runSync)
        })
      })
    )

    return {
      connect: Console.log("Voice Service Connected"),
      eventStream: eventQueue,
      send: (event) => Effect.try(() => ws.send(JSON.stringify(event)))
    }
  })
)
```

### **5. The Main Orchestrator (Refactored `big_three_realtime_agents.py`)**

This "Program" composes all services.

```typescript
// src/main.ts
import { Effect, Layer, Console, Queue } from "effect"
import { BrowserService, BrowserServiceLive } from "./services/BrowserService"
import { CoderService, CoderServiceLive } from "./services/CoderService"
import { VoiceService, VoiceServiceLive } from "./services/VoiceService"

const MainProgram = Effect.gen(function* (_) {
  const voice = yield* _(VoiceService)
  const coder = yield* _(CoderService)
  const browser = yield* _(BrowserService)

  yield* _(Console.log("🤖 Big 3 Super Agent Started..."))

  // Configure OpenAI Session
  yield* _(
    voice.send({
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
```

### **Alternative: Did you mean React `useEffect`?**

If you actually wanted a frontend implementation (e.g., a React app that talks to this agent), the concept is completely different. You would use `useEffect` to manage the WebSocket connection on the client side.

```typescript
// React Example (Frontend Only)
import { useEffect, useRef } from "react"

export const useVoiceAgent = () => {
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    // Connect to Relay Server (Backend)
    wsRef.current = new WebSocket("ws://localhost:8080")

    wsRef.current.onmessage = (event) => {
      console.log("Agent says:", JSON.parse(event.data))
    }

    return () => {
      wsRef.current?.close() // Cleanup effect
    }
  }, [])

  const speak = (text: string) => {
    wsRef.current?.send(JSON.stringify({ type: "user_input", text }))
  }

  return { speak }
}
```

### **Why use Effect-TS for this refactor?**

1.  **Resource Management**: The Python script relies on `try/finally` blocks or manual cleanup. Effect's `Scope` automatically closes the Playwright browser and WebSocket connection when the agent shuts down or crashes.
2.  **Concurrency**: The original Python script likely orchestrates agents sequentially or with complex `asyncio`. Effect's fiber-based concurrency allows the Browser and Coder agents to run in parallel easily without blocking the Voice listener.
3.  **Retry Logic**: If OpenAI disconnects or Gemini times out, Effect has built-in retry policies (`Effect.retry`) which are essential for a "Super Agent" that needs to be always-on.
