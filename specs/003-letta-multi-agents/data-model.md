# Data Model: Letta Multi-Agent System

**Feature**: 003-letta-multi-agents  
**Date**: 2025-11-22

## Overview

The Letta Multi-Agent System extends the core agent model to support teams of collaborating agents with shared memory, cross-agent communication, and workflow orchestration through tool rules. This document outlines the core entities and their relationships.

## Implementation Strategy

All entities defined in this data model will be implemented using **Effect Schema** (`@effect/schema`). This ensures:

- **Runtime Validation**: Automatic validation of data entering and leaving the system.
- **Static Type Generation**: TypeScript types are derived directly from the schemas, ensuring a single source of truth.
- **Transformation**: Easy transformation between wire formats (JSON) and domain objects.

## Core Entities

### MultiAgentTeam

Represents a logical grouping of agents that work together on shared objectives.

- **Fields**:

  - `id` (string): Unique team identifier.
  - `name` (string): Human-readable team name.
  - `description` (string): Team purpose and scope.
  - `status` (enum): `active | paused | archived`.
  - `createdAt` / `updatedAt` (timestamps).
  - `configuration` (object): Team-wide settings and policies.

- **Relationships**:
  - Has many `Agent` records.
  - Has many `SharedMemoryBlock` records.
  - Has many `ToolRule` records.

### Agent

Extended agent entity that participates in multi-agent systems.

- **Fields**:

  - `id` (string): Unique agent identifier.
  - `teamId` (string) → `MultiAgentTeam.id`.
  - `name` (string): Agent name/role.
  - `type` (enum): `memgpt_agent | custom_agent`.
  - `model` (string): Model configuration.
  - `embedding` (string): Embedding model.
  - `status` (enum): `active | paused | error | offline`.
  - `capabilities` (array): List of agent capabilities.
  - `createdAt` / `updatedAt` (timestamps).

- **Relationships**:
  - Belongs to a `MultiAgentTeam`.
  - Has many `AgentMemoryBlock` records.
  - Has many `AgentMessage` records.
  - Has many `ToolExecution` records.

### SharedMemoryBlock

Memory blocks that can be accessed by multiple agents within a team.

- **Fields**:

  - `id` (string): Unique memory block identifier.
  - `teamId` (string) → `MultiAgentTeam.id`.
  - `label` (string): Memory block label (e.g., "project_requirements", "architecture_decisions").
  - `value` (string): Memory content.
  - `description` (string): Purpose and usage guidelines.
  - `type` (enum): `project_context | shared_knowledge | workflow_state | custom`.
  - `accessLevel` (enum): `read | read_write | admin`.
  - `version` (integer): Version number for optimistic locking.
  - `lastModifiedBy` (string) → `Agent.id`.
  - `createdAt` / `updatedAt` (timestamps).

- **Relationships**:
  - Belongs to a `MultiAgentTeam`.
  - Has many `MemoryAccessLog` records.

### AgentMemoryBlock

Individual agent's private memory blocks.

- **Fields**:

  - `id` (string): Unique memory block identifier.
  - `agentId` (string) → `Agent.id`.
  - `label` (string): Memory block label (human, persona, project, custom).
  - `value` (string): Memory content.
  - `description` (string): Purpose and usage guidelines.
  - `isShared` (boolean): Whether this is a reference to a shared block.
  - `sharedBlockId` (string) → `SharedMemoryBlock.id` (if isShared is true).
  - `createdAt` / `updatedAt` (timestamps).

- **Relationships**:
  - Belongs to an `Agent`.
  - Optionally references a `SharedMemoryBlock`.

### AgentMessage

Cross-agent communication messages.

- **Fields**:

  - `id` (string): Unique message identifier.
  - `fromAgentId` (string) → `Agent.id`.
  - `toAgentId` (string) → `Agent.id`.
  - `teamId` (string) → `MultiAgentTeam.id`.
  - `messageType` (enum): `request | response | notification | broadcast`.
  - `content` (string): Message content.
  - `metadata` (object): Additional message metadata.
  - `status` (enum): `pending | delivered | read | failed`.
  - `priority` (enum): `low | normal | high | urgent`.
  - `expiresAt` (timestamp): Message expiration time.
  - `createdAt` / `deliveredAt` / `readAt` (timestamps).

- **Relationships**:
  - From Agent and to Agent references.
  - Belongs to a `MultiAgentTeam`.
  - Has many `MessageAttachment` records.

### ToolRule

Rules governing tool execution order and constraints.

- **Fields**:

  - `id` (string): Unique rule identifier.
  - `teamId` (string) → `MultiAgentTeam.id`.
  - `name` (string): Rule name.
  - `type` (enum): `TerminalToolRule | ChildToolRule | InitToolRule | ConditionalRule`.
  - `configuration` (object): Rule-specific configuration.
  - `toolNames` (array): Tools this rule applies to.
  - `isActive` (boolean): Whether the rule is currently enforced.
  - `createdAt` / `updatedAt` (timestamps).

- **Relationships**:
  - Belongs to a `MultiAgentTeam`.
  - Has many `ToolExecution` records for enforcement.

### ToolExecution

Record of tool execution with rule enforcement.

- **Fields**:

  - `id` (string): Unique execution identifier.
  - `agentId` (string) → `Agent.id`.
  - `toolName` (string): Name of the tool executed.
  - `arguments` (object): Tool arguments.
  - `result` (object): Tool execution result.
  - `status` (enum): `pending | running | completed | failed | blocked`.
  - `ruleViolations` (array): Any tool rules that were violated.
  - `executionTime` (integer): Time taken in milliseconds.
  - `startedAt` / `completedAt` (timestamps).

- **Relationships**:
  - Belongs to an `Agent`.
  - References applicable `ToolRule` records.

### AgentTemplate

Reusable agent configuration templates.

- **Fields**:

  - `id` (string): Unique template identifier.
  - `name` (string): Template name.
  - `description` (string): Template description and use case.
  - `version` (string): Template version.
  - `configuration` (object): Agent configuration (memory blocks, tools, model).
  - `isPublic` (boolean): Whether template is publicly available.
  - `usageCount` (integer): Number of times template has been used.
  - `createdBy` (string) → User reference.
  - `createdAt` / `updatedAt` (timestamps).

- **Relationships**:
  - Has many `Agent` records created from this template.
  - Has many `TemplateReview` records.

### MemoryAccessLog

Audit log for shared memory access.

- **Fields**:

  - `id` (string): Unique log entry identifier.
  - `sharedBlockId` (string) → `SharedMemoryBlock.id`.
  - `agentId` (string) → `Agent.id`.
  - `action` (enum): `read | write | create | delete | access_denied`.
  - `previousValue` (string): Previous value for write operations.
  - `newValue` (string): New value for write operations.
  - `accessReason` (string): Reason for access (agent communication, tool execution, etc.).
  - `timestamp` (timestamp): When the access occurred.

- **Relationships**:
  - References the `SharedMemoryBlock` and `Agent`.

## Supporting Entities

### AgentCapability

Defines specific capabilities an agent can perform.

- **Fields**:
  - `id` (string): Unique capability identifier.
  - `name` (string): Capability name (e.g., "web_search", "code_execution", "file_management").
  - `description` (string): What the capability enables.
  - `requiredTools` (array): Tools needed for this capability.
  - `requiredMemoryBlocks` (array): Memory blocks needed for this capability.

### WorkflowDefinition

Predefined workflows that agents can follow.

- **Fields**:
  - `id` (string): Unique workflow identifier.
  - `teamId` (string) → `MultiAgentTeam.id`.
  - `name` (string): Workflow name.
  - `description` (string): Workflow purpose.
  - `steps` (array): Ordered workflow steps.
  - `requiredRoles` (array): Agent roles needed for this workflow.
  - `isActive` (boolean): Whether workflow is currently available.

### AgentRole

Predefined roles that agents can fulfill within a team.

- **Fields**:
  - `id` (string): Unique role identifier.
  - `name` (string): Role name (e.g., "frontend_developer", "backend_developer", "qa_tester").
  - `description` (string): Role responsibilities.
  - `defaultTools` (array): Tools typically needed for this role.
  - `defaultMemoryBlocks` (array): Memory blocks typically needed for this role.
  - `permissions` (object): Role-specific permissions.

## State Transitions

### Agent Lifecycle

```
created → active → (paused ↔ active) → error/offline → archived
```

### Message Lifecycle

```
pending → delivered → read → (optional: failed)
```

### Tool Execution with Rules

```
requested → (rule_check) → (blocked | running) → completed/failed
```

### Shared Memory Updates

```
requested → (access_check) → (denied | in_progress) → completed/failed
```

## Performance Considerations

### Indexing Strategy

- `Agent.teamId`, `Agent.status` for team-based queries
- `AgentMessage.toAgentId`, `AgentMessage.status` for message routing
- `SharedMemoryBlock.teamId`, `SharedMemoryBlock.type` for memory access
- `ToolExecution.agentId`, `ToolExecution.status` for execution monitoring

### Caching Strategy

- Frequently accessed shared memory blocks
- Agent capability and role definitions
- Active tool rules for teams
- Message routing information

### Scaling Patterns

- Horizontal scaling for agent execution
- Message queues for cross-agent communication
- Distributed locking for shared memory updates
- Event-driven updates for team state changes

## Security Model

### Access Control

- Team-based isolation
- Role-based permissions for memory access
- Tool execution restrictions based on agent capabilities
- Message routing controls

### Audit Trail

- Complete audit log for shared memory access
- Message history for compliance
- Tool execution logs for debugging
- Agent lifecycle events

## Integration Points

### Letta Core Integration

- Extends core `Agent` model with team relationships
- Leverages existing `MemoryBlock` infrastructure
- Integrates with tool execution system
- Uses existing authentication and authorization

### External Systems

- Message queuing systems for cross-agent communication
- Distributed caching for shared memory
- Monitoring and logging systems
- External tool integrations (MCP servers, Composio)
