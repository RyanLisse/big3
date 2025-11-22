---

description: "Tasks for Big 3 Super-Agent V2 (feature 001)"
---

# Tasks: Big 3 Super-Agent V2

**Input**: Design documents from `specs/001-big3-super-agent-v2/`  
**Prerequisites**: plan.md (ready), spec.md (ready for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are REQUIRED for core tool paths and persistence per constitution Principle IV
(structured concurrency, persistence-first, observability).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Backend service code: `backend/agent/` and related Encore files
- Frontend streaming UI (later): `frontend/src/`
- Legacy CLI utilities: `src/`
- Tests: `test/` and `frontend/tests/` as appropriate

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Ensure the repo layout and tooling support V2 development with structured concurrency
and observability.

- [ ] T001 [P] [-] Confirm Node/TypeScript toolchain and Effect/Encore versions in `README.md` and
      `quickstart.md` are accurate; update if needed.
- [ ] T002 [P] [-] Ensure `backend/agent/` directory exists with placeholder files from plan
      (`domain.ts`, `persistence.ts`, `graph.ts`, `coder.ts`, `browser.ts`, `voice.ts`,
      `encore.service.ts`).
- [ ] T003 [P] [-] Add or update `package.json` scripts for running backend tests and (future)
      Encore dev server; document in `quickstart.md`.
- [ ] T004 [P] [-] Verify Vitest configuration in `vitest.config.ts` supports tests in
      `backend/agent/` and update paths/globs if required.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be fully
implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T010 [US2] Implement Redis checkpointer and composite filesystem in
      `backend/agent/persistence.ts` (persistent `/workspace`, ephemeral `/tmp`).
- [ ] T011 [P] [US2] Add unit tests for persistence layer behavior (save/load session state,
      workspace file operations) in `test/agent/persistence.test.ts`.
- [ ] T012 [US2] Implement basic Agent Registry domain types and interfaces in
      `backend/agent/domain.ts` (AgentSession, AgentRegistryEntry, etc.) based on `data-model.md`.
- [ ] T013 [US2] Implement initial Encore endpoints skeleton in `backend/agent/encore.service.ts`
      for `/agents/spawn`, `/agents/{id}/status`, `/agents/{id}/resume`, and streaming stub.
- [ ] T014 [P] [US2] Add integration tests for Agent Registry endpoints in
      `test/agent/encore.service.test.ts` (spawn + status + resume happy paths).
- [ ] T015 [US2] Wire Redis client creation and configuration (using `REDIS_URL`) into an Effect
      layer that is reused across persistence and orchestration.
- [ ] T016 [US2] Implement structured logging utilities (duration, payload size, provider, cost
      bucket) in a shared module (e.g., `backend/agent/logging.ts`) and integrate with Encore
      handlers.
- [ ] T017 [P] [-] Add minimal observability configuration (log format, basic metrics hooks) so
      that key agent events can be traced in local dev.

**Checkpoint**: Persistence, Agent Registry, and baseline logging are in place with tests; user
stories may now layer on top.

---

## Phase 3: User Story 1 - Voice-driven coding assistant (Priority: P1) 🎯 MVP

**Goal**: End-to-end single-session interaction using Big 3 services (Voice, Coder, Browser) with
structured concurrency and basic error handling.

**Independent Test**: Start a session, send a well-scoped request, see SoT plan + at least one
concrete result (summary or code) without relying on resumption.

### Tests for User Story 1 (REQUIRED)

- [ ] T020 [P] [US1] Add integration test that exercises a minimal request flow
      (e.g., text-based input instead of real audio) from a simulated client through
      `encore.service.ts` into the orchestrator, verifying at least one tool call and response.
- [ ] T021 [P] [US1] Add failure-path test that forces a tool error (e.g., mocked Claude failure)
      and checks that user receives a clear error message and the system remains stable.

### Implementation for User Story 1

- [ ] T022 [P] [US1] Implement orchestrator entrypoint in `backend/agent/graph.ts` that wires
      together Voice, Coder, and Browser services with Effect structured concurrency.
- [ ] T023 [P] [US1] Implement Effect layers for Coder and Browser integrations in
      `backend/agent/coder.ts` and `backend/agent/browser.ts`, reusing the existing logic from
      `src/services/*` while enforcing `acquireRelease` and timeouts.
- [ ] T024 [US1] Refactor `src/main.ts` orchestration logic into shared, testable functions used by
      both CLI and Encore orchestrator where appropriate.
- [ ] T025 [US1] Integrate SoT planning (Solomon skeleton-of-thought) at a minimal level in
      `graph.ts` to break a request into internal steps, even if they are executed sequentially at
      first.
- [ ] T026 [US1] Ensure all Voice/Coder/Browser calls are logged via the shared logging utilities
      with duration, payload size approximation, and provider information.

**Checkpoint**: A single session can process one request end-to-end via the backend, using Big 3
services with logs and tests.

---

## Phase 4: User Story 2 - Long-running research and coding sessions with resumption (Priority: P2)

**Goal**: Support sessions that survive backend restarts and client disconnects using the Redis
checkpointer and composite filesystem.

**Independent Test**: Start a long-running session, create artifacts, restart backend, and resume
session using the same ID with state restored.

### Tests for User Story 2 (REQUIRED)

- [ ] T030 [P] [US2] Add integration test that spawns a session, writes at least one
      `WorkspaceArtifact` (e.g., a note file), simulates a backend restart, and then resumes the
      session, verifying artifact availability.
- [ ] T031 [P] [US2] Add test that verifies cancel/stop cleans up external resources (e.g.,
      browser contexts) and leaves session in a stable `cancelled` status.

### Implementation for User Story 2

- [ ] T032 [US2] Connect orchestrator state machine in `graph.ts` to the Redis checkpointer so that
      all session progress is keyed by `sessionId` (thread_id).
- [ ] T033 [US2] Implement composite filesystem middleware that routes `/workspace` and `/tmp`
      appropriately and is used by tools that read/write files.
- [ ] T034 [US2] Wire Agent Registry endpoints to redis-backed state so `/agents/spawn` and
      `/agents/{id}/resume` operate on real session state instead of in-memory placeholders.
- [ ] T035 [US2] Implement cancel/stop logic that sends interruption signals through Effect scopes
      and ensures all fibers and external resources are terminated cleanly.

**Checkpoint**: Sessions can be paused, resumed, and cancelled reliably with persisted state.

---

## Phase 5: User Story 3 - Streaming observability and SoT visualization (Priority: P3)

**Goal**: Provide a streaming view of SoT plan, tool calls, and status that can be rendered by a
frontend or CLI client.

**Independent Test**: Connect a client to the stream, trigger a multi-step request, and observe plan
updates and tool events in order.

### Tests for User Story 3 (REQUIRED)

- [ ] T040 [P] [US3] Add test or harness that consumes the streaming endpoint and validates event
      ordering and structure for a representative multi-step request.

### Implementation for User Story 3

- [ ] T041 [US3] Define a concrete event schema for `AgentStreamEvent` and implement it in
      `backend/agent/domain.ts` and `backend/agent/encore.service.ts`.
- [ ] T042 [US3] Emit `plan_update`, `tool_started`, `tool_finished`, `status_change`, and `log`
      events from orchestrator and tool integration points.
- [ ] T043 [P] [US3] Create a minimal frontend or CLI visualization (e.g., in `frontend/src/` or a
      dev-only CLI script) that renders the stream as a live checklist/timeline.

**Checkpoint**: Users can see what the agent is doing in real time and correlate this with logs.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories, with emphasis on reliability,
observability, and developer ergonomics.

- [ ] T050 [P] [-] Documentation updates in `specs/001-big3-super-agent-v2/quickstart.md` and
      `README.md` to match actual commands and flows.
- [ ] T051 [-] Code cleanup and refactoring across `backend/agent/` to reduce duplication and
      enforce clear boundaries between Voice, Coder, Browser, and orchestrator.
- [ ] T052 [P] [-] Performance sanity checks under ~10–20 concurrent sessions; capture findings in
      `research.md`.
- [ ] T053 [P] [-] Additional unit tests and property-based tests (where useful) in `test/agent/`
      to harden persistence and streaming logic.
- [ ] T054 [-] Security review for environment/network access assumptions and logging (ensure
      secrets are never logged).
- [ ] T055 [-] Run quickstart.md end-to-end validation and fix any gaps.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational phase completion.
  - User stories can then proceed in parallel (if staffed), but US1 is the primary MVP.
- **Polish (Final Phase)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - no dependencies on other stories.
- **User Story 2 (P2)**: Depends on Foundational (Phase 2) and reuses US1 orchestrator patterns.
- **User Story 3 (P3)**: Depends on Foundational (Phase 2) and US1 orchestrator; can be built in
  parallel with US2 after persistence is in place.

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel.
- Several Foundational tasks marked [P] can run in parallel once Redis and basic structure exist.
- Once Foundational completes, user stories can be staffed in parallel (US1 prioritized).
- Tests marked [P] can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.  
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories).  
3. Complete Phase 3: User Story 1.  
4. **STOP and VALIDATE**: Test User Story 1 independently using the defined tests.  
5. Decide whether to proceed to US2 (persistence) and US3 (observability UI).

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready.  
2. Add User Story 1 → Test independently → Optionally demo as a local-only MVP.  
3. Add User Story 2 → Test independently (resumption flows).  
4. Add User Story 3 → Test independently (streaming events + visualization).

### Parallel Team Strategy

With multiple developers:

- Developer A: Focus on persistence and Agent Registry (US2, Phase 2).  
- Developer B: Focus on orchestrator and tool wiring (US1, Phase 3).  
- Developer C: Focus on streaming events and visualization (US3, Phase 5).

---

## Notes

- Tasks explicitly reference the constitution: persistence-first, structured concurrency, observability,
  and transparent SoT orchestration.
- Each story aims to be independently testable and demonstrable.
- Adjust IDs or add more tasks as detail emerges from implementation.
