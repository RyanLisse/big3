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
  constructor(readonly message: string, readonly cause?: unknown) {}
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
