# Agent API Contracts (Conceptual)

**Feature**: 001-big3-super-agent-v2  
**Scope**: Agent Registry + streaming interaction for Big 3 Super-Agent V2

> NOTE: This file captures conceptual contracts; concrete OpenAPI/GraphQL schemas should be derived
> from these during implementation.

## 1. Spawn Agent

- **Endpoint**: `POST /agents/spawn`
- **Purpose**: Create a new agent session and associated registry entry.
- **Request (JSON)**:
  - `initialPrompt` (string, optional): Initial user intent.
  - `labels` (object, optional): Key-value labels for filtering/observability.
- **Response (JSON)**:
  - `sessionId` (string): Stable identifier for the new session.
  - `status` (string): Initial status (e.g., `planning` or `waiting_for_input`).

## 2. Get Agent Status

- **Endpoint**: `GET /agents/{id}/status`
- **Purpose**: Retrieve high-level status for an existing session.
- **Response (JSON)**:
  - `sessionId` (string).
  - `status` (string): `planning | running | waiting_for_input | completed | failed | cancelled`.
  - `lastUpdate` (timestamp).

## 3. Resume Agent

- **Endpoint**: `POST /agents/{id}/resume`
- **Purpose**: Reconnect to an existing session after a disconnect/restart.
- **Request (JSON)**:
  - `input` (object, optional): Optional user message or control signal.
- **Response (JSON)**:
  - `sessionId` (string).
  - `status` (string).

## 4. Agent Stream (Bi-Directional)

- **Endpoint**: `/agent/stream` (implemented via Encore streaming primitive)
- **Purpose**: Stream user inputs to the agent and receive outputs/events in real time.

### Stream Input (example schema)

```json
{
  "sessionId": "...",
  "type": "audio" | "text" | "control",
  "data": "..." // base64 audio, text, or control payload
}
```

### Stream Output (example schema)

```json
{
  "sessionId": "...",
  "type": "log" | "plan_update" | "tool_started" | "tool_finished" | "diff" | "status_change",
  "content": {}
}
```

These shapes should be refined during implementation to match Encore type definitions and frontend
needs while remaining aligned with the spec and constitution.
