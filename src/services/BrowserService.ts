import { GoogleGenerativeAI } from "@google/generative-ai"
import { Console, Context, Duration, Effect, Layer } from "effect"
import { chromium } from "playwright"

export interface BrowserService {
  readonly navigate: (url: string) => Effect.Effect<void, Error>
  readonly act: (instruction: string) => Effect.Effect<string, Error>
}

export const BrowserService = Context.GenericTag<BrowserService>("BrowserService")

export const BrowserServiceLive = Layer.scoped(
  BrowserService,
  Effect.gen(function*(_) {
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
    const timeoutMs = 45_000

    return {
      navigate: (url) =>
        Effect.raceFirst(
          Effect.tryPromise(async () => {
            const start = Date.now()
            await page.goto(url)
            await Effect.runPromise(
              Console.log(`Browser navigate(${url}) in ${Date.now() - start}ms`)
            )
          }),
          Effect.flatMap(Effect.sleep(Duration.millis(timeoutMs)), () =>
            Effect.fail(new Error(`Browser navigation timed out for ${url}`))
          )
        ).pipe(Effect.asVoid),

      act: (instruction) =>
        Effect.raceFirst(
          Effect.tryPromise(async () => {
            const start = Date.now()
            const screenshot = await page.screenshot()
            const prompt = `Act on this page: ${instruction}`

            const result = await model.generateContent([
              prompt,
              {
                inlineData: {
                  data: screenshot.toString("base64"),
                  mimeType: "image/png"
                }
              }
            ])

            await Effect.runPromise(
              Console.log(`Browser act completed in ${Date.now() - start}ms`)
            )
            return result.response.text()
          }),
          Effect.flatMap(Effect.sleep(Duration.millis(timeoutMs)), () =>
            Effect.fail(new Error("Browser act timed out"))
          )
        )
    }
  })
)
