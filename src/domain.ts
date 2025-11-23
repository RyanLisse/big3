export interface AgentSession {
  readonly id: string
  readonly type: "coder" | "browser"
  readonly status: "idle" | "running" | "error"
}

export type AgentTool =
  | {
    readonly tag: "CreateAgent"
    readonly agentType: "coder" | "browser"
    readonly name: string
  }
  | {
    readonly tag: "CommandAgent"
    readonly name: string
    readonly instruction: string
  }
  | { readonly tag: "BrowserUse"; readonly task: string; readonly url?: string }

export class AgentError {
  readonly _tag = "AgentError"
  constructor(
    readonly message: string, 
    readonly cause?: unknown,
    readonly code?: string,
    readonly details?: unknown
  ) {}
}

// OpenAI Realtime WebSocket Events
export interface SessionUpdateEvent {
  readonly type: "session.update"
  readonly session: {
    readonly instructions: string
    readonly tools?: ReadonlyArray<ToolDefinition>
    readonly voice?: string
    readonly input_audio_format?: string
    readonly output_audio_format?: string
    readonly turn_detection?: {
      readonly type: string
      readonly threshold?: number
    }
  }
}

export interface ToolDefinition {
  readonly type: "function"
  readonly name: string
  readonly description: string
  readonly parameters: {
    readonly type: "object"
    readonly properties: Record<string, unknown>
    readonly required?: ReadonlyArray<string>
  }
}

export interface FunctionCallEvent {
  readonly type: "response.function_call_arguments.done"
  readonly name: string
  readonly call_id: string
  readonly arguments: string
}

export interface ConversationItemEvent {
  readonly type: "conversation.item.create"
  readonly item: {
    readonly type: "function_call_output"
    readonly call_id: string
    readonly output: string
  }
}

export interface ResponseCreateEvent {
  readonly type: "response.create"
}

export type RealtimeEvent =
  | SessionUpdateEvent
  | FunctionCallEvent
  | ConversationItemEvent
  | ResponseCreateEvent
  | { readonly type: string; readonly [key: string]: unknown }

// Multi-Agent Workflow Orchestration Types
export type WorkflowState = "planning" | "executing" | "validating" | "complete" | "failed"

export interface ExecutionNode {
  readonly id: string
  readonly tool: AgentTool
  readonly dependencies: ReadonlyArray<string>
  readonly status: "pending" | "running" | "complete" | "failed"
}

export interface ExecutionPlan {
  readonly id: string
  readonly nodes: Record<string, ExecutionNode>
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

// Letta Multi-Agent System Types
export type TeamStatus = "active" | "paused" | "archived"

export interface MultiAgentTeam {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly status: TeamStatus
  readonly configuration: Record<string, unknown>
  readonly createdAt: Date
  readonly updatedAt: Date
}

export interface TeamMembership {
  readonly id: string
  readonly teamId: string
  readonly agentId: string
  readonly role: string
  readonly joinedAt: Date
  readonly isActive: boolean
}

export type MemoryType = "project_context" | "shared_knowledge" | "workflow_state" | "custom"
export type MemoryAccessLevel = "read" | "read_write" | "admin"

export interface SharedMemoryBlock {
  readonly id: string
  readonly teamId: string
  readonly label: string
  readonly value: string
  readonly description: string
  readonly type: MemoryType
  readonly accessLevel: MemoryAccessLevel
  readonly version: number
  readonly lastModifiedBy: string
  readonly createdAt: Date
  readonly updatedAt: Date
}

export interface MemoryAccessLog {
  readonly id: string
  readonly memoryBlockId: string
  readonly agentId: string
  readonly action: "read" | "write" | "delete"
  readonly timestamp: Date
  readonly metadata?: Record<string, unknown>
}

export type MessageType = "request" | "response" | "notification" | "broadcast"
export type MessageStatus = "pending" | "delivered" | "read" | "failed"
export type MessagePriority = "low" | "normal" | "high" | "urgent"

export interface AgentMessage {
  readonly id: string
  readonly fromAgentId: string
  readonly toAgentId: string
  readonly teamId: string
  readonly messageType: MessageType
  readonly content: string
  readonly metadata: Record<string, unknown>
  readonly status: MessageStatus
  readonly priority: MessagePriority
  readonly createdAt: Date
  readonly deliveredAt?: Date
  readonly readAt?: Date
}

export type ToolRuleType = "TerminalToolRule" | "ConditionalToolRule" | "RateLimitRule"

export interface ToolRule {
  readonly id: string
  readonly teamId: string
  readonly name: string
  readonly type: ToolRuleType
  readonly configuration: Record<string, unknown>
  readonly toolNames: ReadonlyArray<string>
  readonly isActive: boolean
  readonly createdAt: Date
  readonly updatedAt: Date
}

export interface AgentTemplate {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly capabilities: ReadonlyArray<string>
  readonly defaultConfiguration: Record<string, unknown>
  readonly createdAt: Date
  readonly updatedAt: Date
}

// API Request/Response Types
export interface CreateTeamRequest {
  readonly name: string
  readonly description?: string
  readonly configuration?: Record<string, unknown>
}

export interface UpdateTeamRequest {
  readonly name?: string
  readonly description?: string
  readonly status?: TeamStatus
  readonly configuration?: Record<string, unknown>
}

export interface CreateSharedMemoryRequest {
  readonly teamId: string
  readonly label: string
  readonly value: string
  readonly description?: string
  readonly type: MemoryType
  readonly accessLevel: MemoryAccessLevel
}

export interface UpdateSharedMemoryRequest {
  readonly value?: string
  readonly description?: string
  readonly accessLevel?: MemoryAccessLevel
  readonly expectedVersion?: number
}

export interface SendMessageRequest {
  readonly toAgentId: string
  readonly content: string
  readonly messageType?: MessageType
  readonly priority?: MessagePriority
  readonly metadata?: Record<string, unknown>
}

export interface BroadcastMessageRequest {
  readonly content: string
  readonly messageType?: MessageType
  readonly priority?: MessagePriority
  readonly metadata?: Record<string, unknown>
}

export interface CreateToolRuleRequest {
  readonly teamId: string
  readonly name: string
  readonly type: ToolRuleType
  readonly configuration: Record<string, unknown>
  readonly toolNames: ReadonlyArray<string>
}

// Error Classes
export class MultiAgentError extends Error {
  readonly _tag: string = "MultiAgentError"
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = "MultiAgentError"
  }
}

export class TeamNotFoundError extends MultiAgentError {
  readonly _tag = "TeamNotFoundError" as const
  constructor(teamId: string) {
    super(`Team not found: ${teamId}`)
    this.name = "TeamNotFoundError"
  }
}

export class AgentNotFoundError extends MultiAgentError {
  readonly _tag = "AgentNotFoundError" as const
  constructor(agentId: string) {
    super(`Agent not found: ${agentId}`)
    this.name = "AgentNotFoundError"
  }
}

export class MemoryAccessDeniedError extends MultiAgentError {
  readonly _tag = "MemoryAccessDeniedError" as const
  constructor(agentId: string, memoryId: string) {
    super(`Access denied for agent ${agentId} to memory ${memoryId}`)
    this.name = "MemoryAccessDeniedError"
  }
}

export class MessageDeliveryError extends MultiAgentError {
  readonly _tag = "MessageDeliveryError" as const
  constructor(messageId: string, reason: string) {
    super(`Message delivery failed for ${messageId}: ${reason}`)
    this.name = "MessageDeliveryError"
  }
}

export class ToolRuleViolationError extends MultiAgentError {
  readonly _tag = "ToolRuleViolationError" as const
  constructor(toolName: string, ruleName: string) {
    super(`Tool ${toolName} violates rule ${ruleName}`)
    this.name = "ToolRuleViolationError"
  }
}

// API Response types
export interface ApiResponse<T> {
  readonly success: boolean
  readonly data?: T
  readonly error?: {
    readonly code: string
    readonly message: string
    readonly details?: unknown
  }
}

export class ValidationError extends MultiAgentError {
  readonly _tag = "ValidationError" as const
  readonly errors: ReadonlyArray<string>
  constructor(message: string, errors: ReadonlyArray<string> = []) {
    super(message)
    this.name = "ValidationError"
    this.errors = errors
  }
}
