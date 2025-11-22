<!--
Sync Impact Report
- Version change: N/A → 1.0.0
- Modified principles: initialized all five guiding principles
- Added sections: System Constraints & Infrastructure; Delivery Workflow & Quality Gates
- Removed sections: none
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md – Constitution Check gates reference these principles implicitly
  - ✅ .specify/templates/spec-template.md – Requirements and success criteria already align
  - ✅ .specify/templates/tasks-template.md – Story-first organization and optional tests remain valid
- Follow-up TODOs: none
-->

# Big 3 Super-Agent Constitution

## Core Principles

### I. Structured Concurrency & Reliability
Every runtime change MUST preserve Effect-TS structured concurrency guarantees: layers expose scoped resources, all external handles (WebSocket, browser, sandbox) are acquired via `Layer` + `Effect.acquireRelease`, and failure paths return typed errors. Code that bypasses these guards (e.g., naked `new WebSocket`, unmanaged timers) is rejected until wrapped in Effect scopes with retries, timeouts, and shutdown hooks.

### II. Specialized Big 3 Service Boundaries
Voice (OpenAI Realtime), Coder (Claude), and Browser (Gemini + Playwright) are autonomous services with crisp contracts. Each feature must declare which service executes it, define the tool payload(s) exchanged, and document fallback/timeout behavior before implementation. Cross-service orchestration occurs only inside the Solomon controller; direct coupling between services is prohibited to keep replacements and upgrades reversible.

### III. Persistence-First Autonomy
No user-visible capability ships unless the underlying persistence story (Redis checkpointer + composite filesystem) exists or is explicitly scheduled in the same milestone. Threads MUST be restartable via `thread_id`, `/workspace` writes MUST survive restarts, and long-running agents go through the Encore Agent Registry. If persistence is missing, the work item is deferred—even UI or audio features—until the memory layer lands.

### IV. Testable Automation & Observability
Every tool path needs measurable tests (unit, integration, or contract) plus structured logging. Tests MUST run before the tool is exposed through Voice. Logging MUST capture duration, payload size, and cost hints for each external call. If deterministic tests are impossible (e.g., live browsing), engineers MUST provide record/replay harnesses or synthetic fixtures referenced from the plan/tasks templates.

### V. Transparent Orchestration & User Trust
Solomon’s Skeleton-of-Thought plan, agent status, and major tool outputs MUST be streamable to the frontend and readable via docs or CLI logs. Any new automation path includes a UI/log artifact clarifying what the agent is doing and how to interrupt/resume it. Hidden work is disallowed; every long task must expose progress events and support graceful stop/resume semantics.

## System Constraints & Infrastructure

- **Effect-TS + Encore as the control plane:** All backend modules load through Effect layers and Encore services. Adding new runtimes requires documenting how cancellation, retries, and secrets are handled.
- **Persistence stack:** Redis (or compatible) checkpointer plus composite filesystem are mandatory dependencies; local memory savers are allowed only for unit tests.
- **Audio pipeline:** OpenAI Realtime handles ingestion; outbound narration defaults to the cheaper Vercel `generateSpeech` flow unless latency requirements are documented and approved.
- **Security & sandboxing:** Any executable code goes through VibeKit (or successor) isolation with captured stdout/stderr; direct host execution is forbidden.

## Delivery Workflow & Quality Gates

- **Research & plan:** `/speckit.plan` outputs MUST include a Constitution Check showing how each principle is satisfied. Missing answers block downstream specs/tasks.
- **Specs:** `/speckit.specify` files enumerate independently testable user stories that map to service boundaries. Stories lacking persistence guarantees or observability hooks fail review.
- **Tasks:** `/speckit.tasks` groups work by story and tags test efforts explicitly. Tasks referencing external APIs must cite the associated logging metric.
- **Reviews:** PR reviewers confirm structured concurrency usage, persistence conformance, and SoT transparency before approving. Violations require documented remediation tasks.

## Governance

- **Supremacy:** This constitution overrides other process docs. Conflicts are resolved by updating specs/tasks to comply or by amending the constitution.
- **Amendments:** Proposals document motivation, affected principles, and propagation steps across templates. Semantic versioning applies (MAJOR for breaking governance, MINOR for new principles/sections, PATCH for clarifications). Amendments require reviewer consensus plus confirmation that plan/spec/tasks templates remain aligned.
- **Compliance reviews:** Every release cycle or major feature includes a checklist referencing the five principles. Non-compliance is logged with a remediation timeline and owner.

**Version**: 1.0.0 | **Ratified**: 2025-11-22 | **Last Amended**: 2025-11-22
