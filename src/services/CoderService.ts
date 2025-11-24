import Anthropic from "@anthropic-ai/sdk";
import { Console, Context, Duration, Effect, Layer } from "effect";

export type CoderService = {
  readonly createSession: (name: string) => Effect.Effect<string, Error>;
  readonly execute: (
    sessionId: string,
    instruction: string
  ) => Effect.Effect<string, Error>;
};

export const CoderServiceTag = Context.GenericTag<CoderService>("CoderService");

// Implementation using Anthropic SDK
export const CoderServiceLive = Layer.effect(
  CoderServiceTag,
  Effect.sync(() => {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY ?? "test-api-key",
    });
    const timeoutMs = 60_000;

    const runClaude = (sessionId: string, instruction: string) =>
      Effect.gen(function* () {
        const start = Date.now();

        const response = yield* Effect.tryPromise({
          try: async () => {
            const message = await client.messages.create({
              model: "claude-3-5-sonnet-20241022",
              max_tokens: 1024,
              messages: [{ role: "user", content: instruction }],
            });

            const content = message?.content;
            if (!Array.isArray(content)) {
              throw new Error("Invalid Claude response format");
            }

            const textBlock = content.find((block) => block?.type === "text") as
              | { type: string; text?: string }
              | undefined;

            return textBlock?.text ?? "No response";
          },
          catch: (error) => new Error(`Claude execution failed: ${error}`),
        });

        yield* Console.log(
          `Claude execute(${sessionId}) completed in ${Date.now() - start}ms`
        );

        return response;
      });

    return {
      createSession: (name) =>
        Effect.succeed(`✅ Created Claude Session: ${name}`),

      execute: (sessionId, instruction) =>
        Effect.raceFirst(
          runClaude(sessionId, instruction),
          Effect.flatMap(Effect.sleep(Duration.millis(timeoutMs)), () =>
            Effect.fail(new Error("Claude execution timed out"))
          )
        ),
    };
  })
);
