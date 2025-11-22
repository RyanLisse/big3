# Research: Big 3 Super-Agent V2

**Feature**: 001-big3-super-agent-v2  
**Date**: 2025-11-22

## Decisions Already Made

### Usage Model (Q1)

- **Decision**: Focus on a single developer or small internal team in V2 (not a public multi-tenant
  SaaS).  
- **Rationale**: Simplifies isolation, quota management, and deployment while still exercising all
  critical agent capabilities (persistence, orchestration, streaming).  
- **Alternatives**:
  - Multi-tenant SaaS: deferred until after V2 proves out core architecture.

### Concurrency & Resource Targets (Q2)

- **Decision**: Design for ~10–20 concurrent sessions per deployment, with per-session budgets sized
  for development workloads.  
- **Rationale**: Matches expected usage for a small team; provides enough load to test concurrency and
  persistence without over-optimizing early.  
- **Alternatives**:
  - 5 sessions: too restrictive, may hide real concurrency issues.
  - 50+ sessions: premature optimization before architecture stabilizes.

### Authentication Strategy (Q3)

- **Decision**: V2 relies on environment- and network-level access control only (no end-user login
  flows). Only trusted developers/operators on controlled machines can reach the agent.  
- **Rationale**: Keeps security model simple while avoiding a full auth stack; acceptable for
  non-public internal tooling.  
- **Alternatives**:
  - Built-in accounts or SSO: useful later, but adds implementation overhead and additional failure
    modes not required for initial value.

## Open Research Topics

These topics should be explored and documented during early implementation:

1. **Redis Checkpointer Implementation Details**  
   - Evaluate the best TypeScript Redis client compatible with Encore.  
   - Confirm patterns for storing LangGraph/DeepAgents state, including message history and scratchpad
     data, under a `thread_id` keyspace.

2. **Composite Filesystem Backend Design**  
   - Clarify path routing rules (e.g., `/workspace` persistent, `/tmp` ephemeral).  
   - Investigate storage limits and cleanup policies for large artifacts.

3. **Encore Streaming Endpoints**  
   - Validate `api.streamInOut` ergonomics for agent input/output.  
   - Determine event schema for SoT plan updates, tool events, and logs.

4. **Observability & Cost Tracking**  
   - Survey logging/metrics approaches that work well with Encore and Effect-TS.  
   - Decide on standard log fields (duration, payload size, provider, high-level cost bucket).

5. **Playwright + Gemini Integration in Long-Running Sessions**  
   - Identify best practices for keeping browsers alive vs. recycling them between sessions.  
   - Document patterns to avoid memory leaks and zombie browsers under Effect-TS scopes.

## Next Steps

- Flesh out each topic above with concrete findings and decisions as implementation progresses.  
- Keep this document in sync with actual architecture choices; update the spec and plan if major
  decisions deviate from the initial assumptions.
