# Implementation Plan: AI Agent SDK (Updated)

**Branch**: `002-ai-agent-sdk` | **Date**: 2025-11-22 | **Spec**: specs/002-ai-agent-sdk/spec.md

**Input**: Feature specification from `/specs/002-ai-agent-sdk/spec.md`

**Note**: This plan is updated to reflect governance gates and concrete structure.

## Summary

Design and implement a robust AI Agent SDK with multi-model support, autonomous workflows, real-time communication, and governance-aligned configuration management.

## Technical Context

- Language/Version: TypeScript 4.x, Node.js 18.x
- Primary Dependencies: LangGraph, ws (WebSocket), JSON Schema Validator, OAuth2 client, SOC 2 logging
- Storage: In-memory with optional persistence
- Testing: Vitest
- Target Platform: server-side Node.js; client bindings via browser API
- Project Type: library with potential web bindings
- Performance Goals: sub-200ms latency for real-time messaging; 100+ concurrent agents
- Constraints: Must satisfy constitution gates and FR/SC mapping
- Scale/Scope: 1–100 concurrent agents per process; scalable plan

## Constitution & Governance

Gate alignment enforced: Constitution content provides gating points for milestones. See specs/002-ai-agent-sdk/constitution (now amended) and mapping in specs/002-ai-agent-sdk/mapping.md

## Project Structure

### Documentation (this feature)

```
specs/002-ai-agent-sdk/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

### Source Code (repository root)

```
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/
```

## Phases

- Phase 0: Research (informed by updated constitution)
- Phase 1: Setup (project initialization)
- Phase 2: Foundational (blockers)
- Phase 3+: User Story Phases (US1-US5 by priority)
- Phase 4: Polish & Cross-Cutting

## Phase 1: Setup

- [ ] T001 Phase 1 Setup: Initialize project scaffolding per updated plan
- [ ] T002 Phase 1 Setup: Create repository structure (src/, contracts/, tests/ per plan)
- [ ] T003 Phase 1 Setup: Bootstrap package.json, tsconfig.json, lint/test tooling

## Phase 2: Foundational

- [ ] T004 SDK core scaffolding (src/sdk/index.ts) to support initialization and agent creation
- [ ] T005 Model registry skeleton (src/models/registry.ts) with type definitions
- [ ] T006 Real-time communication scaffold (src/communication/ws.ts) interface
- [ ] T007 Basic error handling framework (src/core/errors.ts)
- [ ] T008 Workflow engine skeleton (src/workflow/engine.ts)
- [ ] T009 Contracts scaffolding for endpoints mapping (contracts/)

## Phase 3: User Stories

### US1 — SDK Initialization and Configuration (Priority: P1)

- [ ] T010 Create agent initialization flow (src/sdk/initialize.ts)
- [ ] T011 Implement config types for API credentials and model selection (src/config/types.ts) [P]
- [ ] T012 Expose MVP agent creation API in SDK (src/sdk/agents.ts)
- [ ] T013 Add basic validation and error messaging for initialization (src/core/validation.ts)

### US2 — Multi-Model Agent Creation (Priority: P1)

- [ ] T014 Implement multi-model agent creation API (src/sdk/models.ts) [P]
- [ ] T015 Implement dynamic model switching logic (src/sdk/model-switch.ts) [P]
- [ ] T016 Validate model compatibility against registry (src/models/registry.ts)
- [ ] T017 Update quickstart/docs with multi-model usage (docs/quickstart.md)

### US3 — Autonomous Workflow Execution (Priority: P2)

- [ ] T018 Implement workflow step runner (src/workflow/runner.ts) [P]
- [ ] T019 Define workflow plan format and execution semantics (src/workflow/plan.ts)
- [ ] T020 Implement checkpointing and recovery hooks (src/workflow/recovery.ts)

### US4 — Real-time Communication (Priority: P2)

- [ ] T021 Integrate WebSocket server for real-time agents (src/communication/ws-server.ts) [P]
- [ ] T022 Implement latency-aware batching (src/communication/batching.ts) [P]
- [ ] T023 Implement WebSocket client integration with batching (src/communication/ws-client.ts)

### US5 — Code Modernization Support (Priority: P3)

- [ ] T024 Build code modernization tooling scaffold (src/modernize/index.ts) [P]
- [ ] T025 Document modernization usage and upgrade paths (docs/upgrade.md)
- [ ] T026 Expose results in a contracts/docs section (docs/contracts-usage.md)

## Final Phase: Polish & Cross-Cutting

- [ ] T027 Documentation polish and cross-cutting concerns (docs/, README.md)
- [ ] T028 Linting/formatting and CI hooks (lint) and CI
- [ ] T029 Validation checklist generation and summary report (specs/002-ai-agent-sdk/tasks.md)

## Dependencies & Execution Order

- Phase 1 -> Phase 2 -> Phase 3 (US1-US5) -> Phase 4
- US1 precedes US2; US2 precedes US3-US4-US5; US3-US4-US5 parallel where possible
- Final Polish depends on all prior phases

## Parallel Execution Opportunities

- Phase 2: T004–T009 can run in parallel
- US2: T014, T015 can run in parallel with T016
- US3/US4: US3 (T018–T020) and US4 (T021–T023) can overlap where non-dependent
- US5: T024–T026 can run in parallel with other US phases once dependencies permit

## MVP Scope
- Phase 3 US1 tasks cover MVP: SDK initialization and configuration.
