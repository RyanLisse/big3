# Task Completion Checklist
- Ensure env vars set (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`) if running services.
- Run `pnpm lint` and `pnpm test` before finishing changes.
- Add validation schemas for new features using existing Zod framework.
- Update existing API services to use new validation schemas for consistency.
- For build artifacts, run `pnpm build` if shipping distributable.
- Update documentation in `ai_docs/` when architecture changes or new services added.
- If deps change, regenerate lockfile via pnpm and note in docs.