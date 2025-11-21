import Anthropic from "@anthropic-ai/sdk"
import { Context, Effect, Layer } from "effect"

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
  Effect.gen(function*(_) {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    return {
      createSession: (name) => Effect.succeed(`✅ Created Claude Session: ${name}`),

      execute: (sessionId, instruction) =>
        Effect.tryPromise({
          try: async () => {
            // Simulate Claude Code interaction
            const msg = await client.messages.create({
              model: "claude-3-5-sonnet-20241022",
              max_tokens: 1024,
              messages: [{ role: "user", content: instruction }],
            })

            const textBlock = msg.content.find((block) => block.type === "text")
            return textBlock && textBlock.type === "text"
              ? textBlock.text
              : "No response"
          },
          catch: (error) => new Error(`Claude execution failed: ${error}`)
        })
    }
  })
)
