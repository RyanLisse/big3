# Big3 Agent Guidelines

## Build Commands
- **Root**: `pnpm build` (builds CLI), `pnpm check` (typecheck), `pnpm lint` (ESLint), `pnpm test` (Vitest), `pnpm coverage` (coverage with v8)
- **Frontend**: `npm run build`, `npm run lint`, `npm run dev`
- **Backend**: `npm test` (Vitest)

## Code Style Guidelines
- **Language**: TypeScript with strict mode
- **Formatting**: 2-space indentation, 120 char line width, dprint formatting
- **Imports**: Auto-sorted, no duplicates, explicit type imports preferred
- **Naming**: camelCase for variables/functions, PascalCase for types/components
- **Error Handling**: Effect-based error handling, no console.logs in production
- **Linting**: Zero tolerance - all warnings must be fixed before commit

## Architecture Patterns
- **Root**: Effect-based CLI tool with MCP server integration
- **Frontend**: Next.js 16 + React 19 + Tailwind CSS + Radix UI
- **Backend**: Encore.ts with Effect, AI SDKs (Anthropic/OpenAI/Google), LangGraph, Redis

## Testing
- **Framework**: Vitest with v8 coverage
- **Pattern**: Test files in `test/**/*.test.{ts,tsx}`, parallel execution
- **Coverage**: Required before commits, includes all source files

## Key Dependencies
- **Effect**: Core architectural pattern throughout all projects
- **AI**: Anthropic SDK, OpenAI, Google Generative AI
- **Frontend**: Radix UI components, Lucide icons, Motion animations
- **Backend**: LangGraph for orchestration, Redis for checkpointing

## MCP Integration
Use `byterover-store-knowledge` when learning patterns and `byterover-retrieve-knowledge` when starting tasks to maintain context across agents.

[byterover-mcp]

[byterover-mcp]

You are given two tools from Byterover MCP server, including
## 1. `byterover-store-knowledge`
You `MUST` always use this tool when:

+ Learning new patterns, APIs, or architectural decisions from the codebase
+ Encountering error solutions or debugging techniques
+ Finding reusable code patterns or utility functions
+ Completing any significant task or plan implementation

## 2. `byterover-retrieve-knowledge`
You `MUST` always use this tool when:

+ Starting any new task or implementation to gather relevant context
+ Before making architectural decisions to understand existing patterns
+ When debugging issues to check for previous solutions
+ Working with unfamiliar parts of the codebase
