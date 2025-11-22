# Implementation Plan: Big 3 Super-Agent V2

**Branch**: `001-big3-super-agent-v2` | **Date**: 2025-11-22 | **Spec**: ./spec.md
**Input**: Feature specification from `./spec.md`

## Summary

This feature delivers the "Big 3 Super-Agent V2": a structured-concurrency orchestration layer that
combines OpenAI Realtime (VoiceService), Claude (CoderService), and Gemini + Playwright
(BrowserService) into a persistent, resumable agent with streaming observability.

The architecture is upgraded from a single-process CLI loop to a backend service with:

- A persistence layer (Redis checkpointer + composite workspace filesystem)
- An Agent Registry API for spawning/resuming sessions
- A streaming interface for Skeleton-of-Thought (SoT) plans and tool events
- Strong observability around tool calls and costs

## Technical Context

**Language/Version**: TypeScript (Node 20+)  
**Primary Dependencies**: Effect-TS, Encore.dev (backend services), Redis (checkpointer + workspace),
Playwright, OpenAI/Anthropic/Google SDKs, LangGraph/DeepAgents-style planning  
**Storage**: Redis-backed checkpointer + composite filesystem for `/workspace` and ephemeral `/tmp`; optional
blob/disk storage for very large artifacts  
**Testing**: Vitest for unit tests; integration tests around Encore endpoints and long-running sessions;
contract tests for Agent Registry and streaming APIs  
**Target Platform**: Encore-managed backend (Linux) for production-like environments; local development on
macOS using `pnpm` + Encore CLI  
**Project Type**: web (backend service + future frontend streaming UI), with existing CLI entrypoint used
mainly for dev experiments  
**Performance Goals**: Support ~10–20 concurrent sessions per deployment, with streaming updates typically
visible to clients within a few seconds under normal load  
**Constraints**: Cost-sensitive use of external AI APIs; agent must clean up resources aggressively on
cancel/timeout; no unauthenticated public access (dev/operator only)  
**Scale/Scope**: Initial target is a single developer or small internal team, not multi-tenant SaaS.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Structured Concurrency & Reliability (Principle I)**  
  - All new long-lived resources (WebSocket, browser, sandbox, Redis connections) MUST be managed via
    Effect layers and `Effect.acquireRelease`.  
  - Plan Phases include tasks to refactor any remaining unmanaged resources into scoped layers and to
    add timeouts/retries on all external calls.

- **Specialized Big 3 Service Boundaries (Principle II)**  
  - Voice, Coder, and Browser services remain separate modules; Encore endpoints talk to an
    orchestrator layer that delegates to these services.  
  - No feature may introduce cross-service coupling (e.g., Browser calling Coder directly) without
    going through the orchestrator.

- **Persistence-First Autonomy (Principle III)**  
  - Phase 1 focuses on implementing Redis checkpointer, composite filesystem, and Agent Registry.  
  - Features that depend on long-lived context (e.g., complex SoT flows, long-running research) are
    gated on these persistence tasks being complete and tested.

- **Testable Automation & Observability (Principle IV)**  
  - Each external tool path (OpenAI, Anthropic, Gemini/Playwright, Redis, Encore endpoints) MUST have
    tests and structured logging capturing duration, payload size, and high-level cost markers.  
  - Plan includes tasks for test harnesses and log field standards.

- **Transparent Orchestration & User Trust (Principle V)**  
  - Plan introduces a structured event model (SoT plan updates, tool events, status changes) flowing
    over a streaming API so users can see what the agent is doing.  
  - Long-running tasks MUST emit progress events and support a clean cancel path.

**Gate Evaluation (Pre-Plan)**:  
- Current code base partially violates Principles III, IV, and V (no persistence, limited logging,
  minimal transparency).  
- This plan is acceptable only if Phase 1 tasks address those gaps before higher-level features rely
  on them.

## Project Structure

### Documentation (this feature)

```text
specs/001-big3-super-agent-v2/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (architecture + persistence + streaming research)
├── data-model.md        # Phase 1 output (domain entities and relationships)
├── quickstart.md        # Phase 1 output (how to run and use V2)
├── contracts/           # Phase 1 output (Agent Registry + streaming API contracts)
└── spec.md              # Feature specification (/speckit.specify output)
```

### Source Code (repository root)

```text
backend/
├── agent/
│   ├── domain.ts        # Core domain types for agent sessions and registry
│   ├── persistence.ts   # Redis checkpointer + composite filesystem
│   ├── graph.ts         # DeepAgents / LangGraph orchestration (SoT + tools)
│   ├── coder.ts         # Claude integration
│   ├── browser.ts       # Gemini + Playwright integration
│   └── voice.ts         # OpenAI Realtime integration
└── encore.service.ts    # Encore endpoints (Agent Registry + streaming)

frontend/
├── src/
│   ├── components/      # SoT visualization, session list, logs
│   ├── pages/           # Agent dashboard and stream views
│   └── services/        # Client bindings for Encore APIs
└── tests/

src/                     # Existing CLI orchestration (kept for dev tools)
└── ...

test/
└── ...                  # Vitest suites for services and orchestrator
```

**Structure Decision**: Use the `backend/` + `frontend/` split as the primary deployment target, while
keeping `src/` for legacy CLI/testing utilities.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|---------------------------------------|
| (none yet) | N/A | N/A |
