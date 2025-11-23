# Multi-Agent Workflow Orchestration System
**Feature 001 - Big 3 V2 Enhancement**

## Executive Summary

Build a hierarchical multi-agent workflow orchestration system integrating OpenAI cookbook patterns (MCP coordination, execution planning, self-evolution) into the existing Effect-TS Big 3 codebase.

**Implementation Approach**: 3-phase incremental build (MVP → Enhanced → Advanced)
**Timeline**: Phase 1 MVP = 8 working days
**Risk**: MEDIUM (62/100 feasibility score)

---

## Phase 1: MVP - Core Orchestration (SHIP THIS FIRST)

### 1.1 Project Manager Service
**File**: `src/services/ProjectManagerService.ts`

```typescript
export interface ProjectManagerService {
  readonly delegate: (tool: AgentTool) => Effect.Effect<ExecutionPlan, Error>
  readonly validate: (result: WorkflowResult) => Effect.Effect<boolean, Error>
}
```

**Capabilities**:
- Task routing: `CommandAgent` → CoderService, `BrowserUse` → BrowserService
- Validation gates: File existence checks before handoff approval
- Parallel batching: Group independent tools using `Effect.all`

### 1.2 Execution Plan Framework (File-Based)
**Location**: `plans/*.md` (YAGNI - no database)

**Structure**:
```markdown
# Plan: feature-xyz
Status: executing | Timestamp: 2025-11-22T10:30:00Z

## Milestones
- [x] M1: Create auth flow (completed: 10:45)
- [ ] M2: Add error handling (assigned: CoderService)

## Decisions
- Use JWT over sessions (faster for API-first design)
```

**Implementation**:
- `fs.writeFile` via `Effect.tryPromise`
- Append-only updates (no complex versioning)
- Human-readable markdown

### 1.3 Parallel Execution Engine
**File**: `src/services/ExecutionService.ts`

**Pattern**:
```typescript
// Replace sequential Queue.take with parallel spawning
const executeParallel = (plan: ExecutionPlan) =>
  Effect.all(
    plan.parallelBatches.map(batch =>
      Effect.all(batch.map(nodeId => dispatchTool(plan.nodes[nodeId])))
    ),
    { concurrency: "unbounded" }
  )
```

### 1.4 Integration Points

**Modify**: `src/main.ts:47-80`
```typescript
const pm = yield* _(ProjectManagerService)
const executor = yield* _(ExecutionService)

while (true) {
  const event = yield* _(Queue.take(voice.eventStream))
  if (event.type === "response.function_call_arguments.done") {
    const tool = parseAgentTool(event)
    const plan = yield* _(pm.delegate(tool))
    const result = yield* _(executor.executeParallel(plan))
    const isValid = yield* _(pm.validate(result))

    yield* _(voice.send({ type: "conversation.item.create", ... }))
    yield* _(voice.send({ type: "response.create" }))
  }
}
```

### 1.5 Testing Requirements
**File**: `test/ProjectManagerService.test.ts`

- Unit: DAG construction from AgentTool arrays
- Integration: PM → CoderService/BrowserService dispatch with mock layers
- E2E: Full plan execution with validation gates
- Target: 70% coverage (relaxed for MVP)

---

## Phase 2: Enhanced Coordination (SHIP AFTER MVP VALIDATED)

### 2.1 Specialist Agent Layers
**Files**:
- `src/services/DesignerService.ts`
- `src/services/FrontendService.ts`
- `src/services/BackendService.ts`

**Pattern**: Reuse existing `Layer.effect` structure from CoderService
**Handoff Protocol**: Zod schemas for artifact validation

### 2.2 Structured Handoff Gates
```typescript
const validateHandoff = (artifact: unknown) =>
  Effect.gen(function*(_) {
    const schema = ArtifactSchema.parse(artifact)
    const fileExists = yield* _(Effect.tryPromise(() => fs.access(schema.path)))
    return fileExists ? Effect.succeed(true) : Effect.fail(...)
  })
```

### 2.3 Plan Persistence Layer
- **Storage**: Redis via `@effect/platform-node`
- **Pattern**: Effect Stream for real-time plan updates
- **Schema**: Versioned PLANS.md serialization

---

## Phase 3: Advanced Features (DEFER UNTIL PHASE 2 PROVEN)

### 3.1 MCP Server Integration
```bash
npx codex mcp
```

**Integration**:
```typescript
import { MCPServerStdio } from '@modelcontextprotocol/sdk/server/stdio.js'

const codexMCP = await MCPServerStdio({
  name: "Codex CLI",
  params: { command: "npx", args: ["-y", "codex", "mcp"] }
})
```

### 3.2 Self-Evolving Feedback Loop
- **Meta-Prompting**: LLM-as-judge evaluates execution traces
- **Prompt Versioning**: Store in Redis with performance metrics
- **Autonomous Refinement**: Trigger when success rate < 75%

### 3.3 Observability
- Replace `Console.log` with `Effect.Stream`
- Structured logging to `/logs/*.json`
- Execution trace capture for meta-analysis

---

## Type Definitions (Add to `src/domain.ts`)

```typescript
export type WorkflowState = "planning" | "executing" | "validating" | "complete" | "failed"

export interface ExecutionNode {
  readonly id: string
  readonly tool: AgentTool
  readonly dependencies: ReadonlyArray<string>
  readonly status: "pending" | "running" | "complete" | "failed"
}

export interface ExecutionPlan {
  readonly id: string
  readonly nodes: ReadonlyArray<ExecutionNode>
  readonly parallelBatches: ReadonlyArray<ReadonlyArray<string>>
}

export interface WorkflowResult {
  readonly planId: string
  readonly completedNodes: ReadonlyArray<string>
  readonly failedNodes: ReadonlyArray<string>
  readonly outputs: Record<string, unknown>
}

export interface FeedbackLoop {
  readonly tag: "FeedbackLoop"
  readonly validationErrors: ReadonlyArray<string>
  readonly retryStrategy: "immediate" | "backoff" | "manual"
  readonly maxRetries: number
}
```

---

## Dependencies

### Phase 1 (NO NEW DEPENDENCIES)
- `effect@3.17.7` ✅
- `vitest@3.2.4` ✅
- `@effect/vitest@0.27.0` ✅

### Phase 2
- `zod@4.1.12` (already in deps)
- `redis@5.10.0` (already in deps)

### Phase 3
- `@modelcontextprotocol/sdk@1.22.0`

---

## Success Criteria

### Phase 1 MVP
- ✅ PM service delegates to coder/browser in parallel
- ✅ PLANS.md files created/updated automatically
- ✅ Basic validation gates prevent bad handoffs
- ✅ 70% test coverage
- ✅ Zero warnings, console.logs removed

### Phase 2
- ✅ Specialist agents (Designer/Frontend/Backend) operational
- ✅ Zod-validated handoff artifacts
- ✅ Redis-backed plan persistence with real-time updates

### Phase 3
- ✅ MCP Codex CLI integration working
- ✅ Meta-prompting improves success rate by 20%+
- ✅ Structured logging enables observability

---

## Architecture Diagram

```
┌─────────────────────────────────────────┐
│         VoiceService (WebSocket)        │
│   OpenAI Realtime API Event Stream     │
└──────────────┬──────────────────────────┘
               │ Queue.take
               ▼
┌─────────────────────────────────────────┐
│      ProjectManagerService (NEW)        │
│  - delegate(tool) → ExecutionPlan       │
│  - validate(result) → boolean           │
└──────────────┬──────────────────────────┘
               │ ExecutionPlan
               ▼
┌─────────────────────────────────────────┐
│       ExecutionService (NEW)            │
│  - executeParallel(plan)                │
│    └─> Effect.all([...])                │
└───┬──────────────────────┬──────────────┘
    │                      │
    ▼                      ▼
┌──────────────┐   ┌──────────────┐
│ CoderService │   │BrowserService│
│  (Existing)  │   │  (Existing)  │
└──────────────┘   └──────────────┘
```

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Effect-TS learning curve | MEDIUM | Reuse existing patterns (Layer.effect, Queue) |
| Parallel execution bugs | MEDIUM | Extensive integration tests with mock layers |
| MCP integration complexity | HIGH | Defer to Phase 3, validate need first |
| Self-evolution instability | HIGH | Manual prompt iteration in Phase 1/2 |
| Scope creep | HIGH | Hard stop after each phase, validate value |

---

## Files to Modify

### Phase 1
- **NEW**: `src/services/ProjectManagerService.ts`
- **NEW**: `src/services/ExecutionService.ts`
- **NEW**: `test/ProjectManagerService.test.ts`
- **NEW**: `test/ExecutionService.test.ts`
- **MODIFY**: `src/domain.ts` (add ExecutionPlan types)
- **MODIFY**: `src/main.ts` (integrate PM + ExecutionService)

### Phase 2
- **NEW**: `src/services/DesignerService.ts`
- **NEW**: `src/services/FrontendService.ts`
- **NEW**: `src/services/BackendService.ts`
- **MODIFY**: `src/services/ProjectManagerService.ts` (add Redis persistence)

### Phase 3
- **NEW**: `src/services/MCPCoordinatorService.ts`
- **NEW**: `src/services/MetaPromptService.ts`

---

## OpenAI Cookbook Patterns Applied

1. **MCP Coordination**: WebSocket transport for agent handoffs (Phase 3)
2. **Execution Plans**: Living PLANS.md documents (Phase 1)
3. **Self-Evolution**: Meta-prompting with LLM-as-judge (Phase 3)
4. **Real-Time API**: Existing VoiceService already implements pattern ✅
5. **Hierarchical Handoffs**: PM → Specialist delegation (Phase 1)
6. **Parallel Orchestration**: Effect.all for concurrent execution (Phase 1)

---

## Next Steps

1. ✅ Complete this spec (DONE)
2. Spawn implementation agents for Phase 1:
   - `typegod`: Build ProjectManagerService.ts
   - `typegod`: Build ExecutionService.ts
   - `typegod`: Modify domain.ts
   - `tester`: Write comprehensive test suite
3. Validation agent verifies Phase 1 MVP
4. Decision gate: Phase 2 GO/NO-GO based on MVP value
