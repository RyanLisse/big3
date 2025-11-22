# Quickstart: Big 3 Super-Agent V2

**Feature**: 001-big3-super-agent-v2  
**Audience**: Developers/operators working on this repo

## Prerequisites

- Node.js 20+ and `pnpm` installed.  
- Access to required provider keys via environment variables:
  - `OPENAI_API_KEY`
  - `ANTHROPIC_API_KEY`
  - `GEMINI_API_KEY`
- Redis instance reachable from the backend (for checkpointer + workspace).  
- Encore CLI installed (for backend services) if using Encore in this repo.

## 1. Install Dependencies

```bash
pnpm install
```

## 2. Configure Environment

Create a `.env` file (or use the existing one) with provider keys and Redis URL:

```bash
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
GEMINI_API_KEY=...
REDIS_URL=redis://localhost:6379
```

## 3. Run Tests

```bash
pnpm test
```

Ensure baseline services compile and tests pass before changing orchestration or persistence.

## 4. Start the Backend (V2 Target)

Depending on how Encore is wired in this repo, use the appropriate command (example):

```bash
# Example only; adjust to actual Encore dev command
encore run
```

This should start the backend service that exposes Agent Registry and streaming endpoints.

## 5. Interact with the Agent

At a high level, interaction flows as follows (actual paths may vary):

1. `POST /agents/spawn` to create a new agent session and obtain a session ID.  
2. Connect a client (CLI, UI, or script) to a streaming endpoint (e.g., `/agent/stream`) using the
   session ID to send inputs and receive events.  
3. Observe Skeleton-of-Thought plan updates, tool calls, and outputs in real time.  
4. Use a stop/cancel control if a task should be aborted; verify resources are cleaned up.

## 6. Local CLI Experiments

The legacy CLI entrypoint (`src/main.ts`) can still be used for focused experiments with Voice,
Coder, and Browser services. Run it with:

```bash
pnpm tsx src/main.ts
```

This path is not the primary V2 deployment target but remains useful for quick manual checks.

## 7. Next Steps

- Implement and wire the Redis checkpointer and composite filesystem (`backend/agent/persistence.ts`).  
- Implement Agent Registry and streaming endpoints in Encore (`backend/agent/encore.service.ts`).  
- Add a minimal frontend dashboard in `frontend/` to visualize SoT plans and logs.  
- Expand tests and observability per the constitution and spec success criteria.
