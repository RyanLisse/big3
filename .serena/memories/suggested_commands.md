# Suggested Commands
- Install deps: `pnpm install`
- Run CLI: `pnpm start` (runs `tsx src/main.ts`)
- Build library: `pnpm build` (tsup + copy-package-json)
- Type-check: `pnpm check` (tsc -b tsconfig.json)
- Lint: `pnpm lint` | auto-fix `pnpm lint-fix`
- Tests: `pnpm test` | Coverage: `pnpm coverage`
- Clean dist: `pnpm clean`
- Changeset release flow: `pnpm changeset-version` then `pnpm changeset-publish`