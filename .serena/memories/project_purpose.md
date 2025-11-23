# Project Purpose
- Big 3 Super-Agent in TypeScript using Effect for structured concurrency.
- Orchestrates three specialized services: OpenAI Realtime voice (VoiceService), Anthropic Claude coding (CoderService), and Gemini browser control with Playwright (BrowserService).
- CLI entrypoint (`src/main.ts`) wires services via Effect layers to route tool calls from voice to coder/browser.
- Docs in `ai_docs/` outline architecture roadmap and persistence/audio/frontend plans.
- Built as template to replace prior Python monolith with typed, composable services.