import { GoogleGenerativeAI } from "@google/generative-ai"
import { Context, Effect, Layer } from "effect"
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

    return {
      navigate: (url) => Effect.tryPromise(() => page.goto(url)).pipe(Effect.asVoid),

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
