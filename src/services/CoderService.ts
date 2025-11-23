import Anthropic from "@anthropic-ai/sdk"
import { Console, Context, Duration, Effect, Layer } from "effect"

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
    const timeoutMs = 60_000

    return {
      createSession: (name) => Effect.succeed(`✅ Created Claude Session: ${name}`),

      execute: (sessionId, instruction) =>
        Effect.raceFirst(
          Effect.tryPromise({
            try: async () => {
              const start = Date.now()
              const msg = await client.messages.create({
                model: "claude-3-5-sonnet-20241022",
                max_tokens: 1024,
                messages: [{ role: "user", content: instruction }],
              })

              const textBlock = msg.content.find((block) => block.type === "text")
              const response =
                textBlock && textBlock.type === "text" ? textBlock.text : "No response"
              await Effect.runPromise(
                Console.log(
                  `Claude execute(${sessionId}) completed in ${Date.now() - start}ms`
                )
              )
              return response
            },
            catch: (error) => new Error(`Claude execution failed: ${error}`)
          }),
          Effect.flatMap(Effect.sleep(Duration.millis(timeoutMs)), () =>
            Effect.fail(new Error("Claude execution timed out"))
          )
        )
    }
  })
)
