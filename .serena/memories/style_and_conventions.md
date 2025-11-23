# Style and Conventions
- Language: TypeScript (ESM). Uses Effect library for functional style: `Layer`, `Context.GenericTag`, `Effect.gen`, scoped resources.
- Services implemented as Effect layers under `src/services/*`; dependency injection via `Layer.mergeAll` in `src/main.ts`.
- API clients: Anthropic SDK, GoogleGenerativeAI, Playwright, ws for OpenAI Realtime.
- Error handling: Effect.tryPromise with custom errors; resources closed via acquireRelease in scoped layers.
- Env configuration via dotenv; API keys expected in env vars (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`).
- No formatter configured; linting via ESLint rules in `eslint.config.mjs` (imports, destructure sort, effect plugin).