export type AgentSession = {
  readonly id: string;
  readonly type: "coder" | "browser";
  readonly status: "idle" | "running" | "error";
};
export type AgentTool =
  | {
      readonly tag: "CreateAgent";
      readonly agentType: "coder" | "browser";
      readonly name: string;
    }
  | {
      readonly tag: "CommandAgent";
      readonly name: string;
      readonly instruction: string;
    }
  | {
      readonly tag: "BrowserUse";
      readonly task: string;
      readonly url?: string;
    };
export declare class AgentError {
  readonly message: string;
  readonly cause?: unknown | undefined;
  readonly code?: string | undefined;
  readonly details?: unknown | undefined;
  readonly _tag = "AgentError";
  constructor(
    message: string,
    cause?: unknown | undefined,
    code?: string | undefined,
    details?: unknown | undefined
  );
}
export type SessionUpdateEvent = {
  readonly type: "session.update";
  readonly session: {
    readonly instructions: string;
    readonly tools?: readonly ToolDefinition[];
    readonly voice?: string;
    readonly input_audio_format?: string;
    readonly output_audio_format?: string;
    readonly turn_detection?: {
      readonly type: string;
      readonly threshold?: number;
    };
  };
};
export type ToolDefinition = {
  readonly type: "function";
  readonly name: string;
  readonly description: string;
  readonly parameters: {
    readonly type: "object";
    readonly properties: Record<string, unknown>;
    readonly required?: readonly string[];
  };
};
export type FunctionCallEvent = {
  readonly type: "response.function_call_arguments.done";
  readonly name: string;
  readonly call_id: string;
  readonly arguments: string;
};
export type ConversationItemEvent = {
  readonly type: "conversation.item.create";
  readonly item: {
    readonly type: "function_call_output";
    readonly call_id: string;
    readonly output: string;
  };
};
export type ResponseCreateEvent = {
  readonly type: "response.create";
};
export type RealtimeEvent =
  | SessionUpdateEvent
  | FunctionCallEvent
  | ConversationItemEvent
  | ResponseCreateEvent
  | {
      readonly type: string;
      readonly [key: string]: unknown;
    };
export type WorkflowState =
  | "planning"
  | "executing"
  | "validating"
  | "complete"
  | "failed";
export type ExecutionNode = {
  readonly id: string;
  readonly tool: AgentTool;
  readonly dependencies: readonly string[];
  readonly status: "pending" | "running" | "complete" | "failed";
};
export type ExecutionPlan = {
  readonly id: string;
  readonly nodes: Record<string, ExecutionNode>;
  readonly parallelBatches: readonly (readonly string[])[];
};
export type WorkflowResult = {
  readonly planId: string;
  readonly completedNodes: readonly string[];
  readonly failedNodes: readonly string[];
  readonly outputs: Record<string, unknown>;
};
export type FeedbackLoop = {
  readonly tag: "FeedbackLoop";
  readonly validationErrors: readonly string[];
  readonly retryStrategy: "immediate" | "backoff" | "manual";
  readonly maxRetries: number;
};
export type TeamStatus = "active" | "paused" | "archived";
export type MultiAgentTeam = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly status: TeamStatus;
  readonly configuration: Record<string, unknown>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};
export type TeamMembership = {
  readonly id: string;
  readonly teamId: string;
  readonly agentId: string;
  readonly role: string;
  readonly joinedAt: Date;
  readonly isActive: boolean;
};
export type MemoryType =
  | "project_context"
  | "shared_knowledge"
  | "workflow_state"
  | "custom";
export type MemoryAccessLevel = "read" | "read_write" | "admin";
export type SharedMemoryBlock = {
  readonly id: string;
  readonly teamId: string;
  readonly label: string;
  readonly value: string;
  readonly description: string;
  readonly type: MemoryType;
  readonly accessLevel: MemoryAccessLevel;
  readonly version: number;
  readonly lastModifiedBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};
export type MemoryAccessLog = {
  readonly id: string;
  readonly memoryBlockId: string;
  readonly agentId: string;
  readonly action: "read" | "write" | "delete";
  readonly timestamp: Date;
  readonly metadata?: Record<string, unknown>;
};
export type MessageType = "request" | "response" | "notification" | "broadcast";
export type MessageStatus = "pending" | "delivered" | "read" | "failed";
export type MessagePriority = "low" | "normal" | "high" | "urgent";
export type AgentMessage = {
  readonly id: string;
  readonly fromAgentId: string;
  readonly toAgentId: string;
  readonly teamId: string;
  readonly messageType: MessageType;
  readonly content: string;
  readonly metadata: Record<string, unknown>;
  readonly status: MessageStatus;
  readonly priority: MessagePriority;
  readonly createdAt: Date;
  readonly deliveredAt?: Date;
  readonly readAt?: Date;
};
export type ToolRuleType =
  | "TerminalToolRule"
  | "ConditionalToolRule"
  | "RateLimitRule";
export type ToolRule = {
  readonly id: string;
  readonly teamId: string;
  readonly name: string;
  readonly type: ToolRuleType;
  readonly configuration: Record<string, unknown>;
  readonly toolNames: readonly string[];
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};
export type AgentTemplate = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly capabilities: readonly string[];
  readonly defaultConfiguration: Record<string, unknown>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};
export type CreateTeamRequest = {
  readonly name: string;
  readonly description?: string;
  readonly configuration?: Record<string, unknown>;
};
export type UpdateTeamRequest = {
  readonly name?: string;
  readonly description?: string;
  readonly status?: TeamStatus;
  readonly configuration?: Record<string, unknown>;
};
export type CreateSharedMemoryRequest = {
  readonly teamId: string;
  readonly label: string;
  readonly value: string;
  readonly description?: string;
  readonly type: MemoryType;
  readonly accessLevel: MemoryAccessLevel;
};
export type UpdateSharedMemoryRequest = {
  readonly value?: string;
  readonly description?: string;
  readonly accessLevel?: MemoryAccessLevel;
  readonly expectedVersion?: number;
};
export type SendMessageRequest = {
  readonly toAgentId: string;
  readonly content: string;
  readonly messageType?: MessageType;
  readonly priority?: MessagePriority;
  readonly metadata?: Record<string, unknown>;
};
export type BroadcastMessageRequest = {
  readonly content: string;
  readonly messageType?: MessageType;
  readonly priority?: MessagePriority;
  readonly metadata?: Record<string, unknown>;
};
export type CreateToolRuleRequest = {
  readonly teamId: string;
  readonly name: string;
  readonly type: ToolRuleType;
  readonly configuration: Record<string, unknown>;
  readonly toolNames: readonly string[];
};
export declare class MultiAgentError extends Error {
  readonly cause?: unknown | undefined;
  readonly _tag: string;
  constructor(message: string, cause?: unknown | undefined);
}
export declare class TeamNotFoundError extends MultiAgentError {
  readonly _tag: "TeamNotFoundError";
  constructor(teamId: string);
}
export declare class AgentNotFoundError extends MultiAgentError {
  readonly _tag: "AgentNotFoundError";
  constructor(agentId: string);
}
export declare class MemoryAccessDeniedError extends MultiAgentError {
  readonly _tag: "MemoryAccessDeniedError";
  constructor(agentId: string, memoryId: string);
}
export declare class MessageDeliveryError extends MultiAgentError {
  readonly _tag: "MessageDeliveryError";
  constructor(messageId: string, reason: string);
}
export declare class ToolRuleViolationError extends MultiAgentError {
  readonly _tag: "ToolRuleViolationError";
  constructor(toolName: string, ruleName: string);
}
export type ApiResponse<T> = {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
};
export declare class ValidationError extends MultiAgentError {
  readonly _tag: "ValidationError";
  readonly errors: readonly string[];
  constructor(message: string, errors?: readonly string[]);
}
