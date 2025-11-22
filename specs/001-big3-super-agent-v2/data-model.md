# Data Model: Big 3 Super-Agent V2

**Feature**: 001-big3-super-agent-v2  
**Date**: 2025-11-22

## Overview

The V2 system centers around long-lived agent sessions that orchestrate tools, persist artifacts, and
stream events to clients. This document outlines the core entities and their relationships.

## Entities

### AgentSession

Represents a logical conversation/task between a user and the Super-Agent.

- **Fields (conceptual)**:
  - `id` (string): Stable session identifier (`thread_id` / registry ID).
  - `status` (enum): `planning | running | waiting_for_input | completed | failed | cancelled`.
  - `createdAt` / `updatedAt` (timestamps).
  - `metadata` (object): High-level info (origin, labels, feature flags).

- **Relationships**:
  - Has many `WorkspaceArtifact` records.  
  - Has many `ToolInvocation` records.  
  - Has many `AgentStreamEvent` records.

### WorkspaceArtifact

Any persistent output produced during a session that should survive restarts.

- **Fields (conceptual)**:
  - `id` (string).
  - `sessionId` (string) → `AgentSession.id`.
  - `path` (string): Logical path in composite filesystem (e.g., `/workspace/notes/plan.md`).
  - `kind` (enum): `code | note | log | attachment | other`.
  - `createdAt` / `updatedAt`.

- **Relationships**:
  - Belongs to a single `AgentSession`.

### ToolInvocation

Represents a single call to a tool/provider (Claude, Gemini/Playwright, OpenAI Realtime, Redis,
internal functions).

- **Fields (conceptual)**:
  - `id` (string).
  - `sessionId` (string) → `AgentSession.id`.
  - `toolName` (string): Logical name (e.g., `coder.execute`, `browser.act`).
  - `inputSummary` (string): Sanitized/hashed summary of request.
  - `outputSummary` (string): Sanitized summary of response.
  - `startedAt` / `finishedAt` (timestamps).
  - `status` (enum): `success | failure | cancelled`.

- **Relationships**:
  - Belongs to a single `AgentSession`.

### AgentStreamEvent

A stream event emitted over the Encore streaming API.

- **Fields (conceptual)**:
  - `id` (string).
  - `sessionId` (string) → `AgentSession.id`.
  - `type` (enum): `log | plan_update | tool_started | tool_finished | diff | status_change`.
  - `payload` (object): JSON payload appropriate for `type`.
  - `timestamp`.

- **Relationships**:
  - Belongs to a single `AgentSession`.

### AgentRegistryEntry

Represents a registered agent instance in the Agent Registry.

- **Fields (conceptual)**:
  - `id` (string): Registry identifier, often equal to `AgentSession.id`.
  - `status` (enum): `active | paused | completed | error`.
  - `lastHeartbeatAt` (timestamp).

- **Relationships**:
  - One-to-one or one-to-many mapping to `AgentSession` depending on implementation.

## State Transitions (High-Level)

- `AgentSession` lifecycle:  
  `planning → running → (waiting_for_input)* → completed` or `failed` or `cancelled`.

- `AgentRegistryEntry` mirrors `AgentSession` status but is optimized for quick lookups and listing
  active tasks.

These conceptual models will be refined into concrete TypeScript interfaces/types and, where
necessary, persisted representations in Redis or other storage as implementation proceeds.
