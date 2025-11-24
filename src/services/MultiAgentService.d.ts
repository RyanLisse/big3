import { Context, Effect, Layer, Option } from "effect";
import type {
  AgentMessage,
  AgentNotFoundError,
  BroadcastMessageRequest,
  CreateSharedMemoryRequest,
  CreateTeamRequest,
  CreateToolRuleRequest,
  MemoryAccessLog,
  MessageStatus,
  MultiAgentTeam,
  SendMessageRequest,
  SharedMemoryBlock,
  TeamMembership,
  TeamStatus,
  ToolRule,
  UpdateSharedMemoryRequest,
  UpdateTeamRequest,
} from "../domain.js";
import {
  MemoryAccessDeniedError,
  MessageDeliveryError,
  MultiAgentError,
  TeamNotFoundError,
  ToolRuleViolationError,
} from "../domain.js";
export type TeamRepository = {
  create(
    request: CreateTeamRequest
  ): Effect.Effect<MultiAgentTeam, MultiAgentError>;
  findById(
    id: string
  ): Effect.Effect<Option.Option<MultiAgentTeam>, MultiAgentError>;
  update(
    id: string,
    request: UpdateTeamRequest
  ): Effect.Effect<MultiAgentError, MultiAgentError>;
  delete(id: string): Effect.Effect<void, MultiAgentError>;
  list(filters?: {
    status?: TeamStatus;
  }): Effect.Effect<MultiAgentTeam[], MultiAgentError>;
};
export type TeamMembershipRepository = {
  addAgent(
    teamId: string,
    agentId: string,
    role?: string
  ): Effect.Effect<void, MultiAgentError>;
  removeAgent(
    teamId: string,
    agentId: string
  ): Effect.Effect<void, MultiAgentError>;
  getTeamAgents(
    teamId: string
  ): Effect.Effect<TeamMembership[], MultiAgentError>;
  getAgentTeams(
    agentId: string
  ): Effect.Effect<TeamMembership[], MultiAgentError>;
};
export type SharedMemoryRepository = {
  create(
    request: CreateSharedMemoryRequest
  ): Effect.Effect<SharedMemoryBlock, MultiAgentError>;
  findById(
    id: string
  ): Effect.Effect<Option.Option<SharedMemoryBlock>, MultiAgentError>;
  update(
    id: string,
    request: UpdateSharedMemoryRequest,
    agentId: string
  ): Effect.Effect<SharedMemoryBlock, MultiAgentError>;
  delete(id: string): Effect.Effect<void, MultiAgentError>;
  listByTeam(
    teamId: string
  ): Effect.Effect<SharedMemoryBlock[], MultiAgentError>;
  checkAccess(
    agentId: string,
    blockId: string,
    action: "read" | "write"
  ): Effect.Effect<boolean, MultiAgentError>;
  logAccess(log: MemoryAccessLog): Effect.Effect<void, MultiAgentError>;
};
export type MessageRepository = {
  create(message: AgentMessage): Effect.Effect<AgentMessage, MultiAgentError>;
  findById(
    id: string
  ): Effect.Effect<Option.Option<AgentMessage>, MultiAgentError>;
  updateStatus(
    id: string,
    status: MessageStatus
  ): Effect.Effect<void, MultiAgentError>;
  getAgentMessages(
    agentId: string,
    filters?: {
      status?: MessageStatus;
    }
  ): Effect.Effect<AgentMessage[], MultiAgentError>;
  getTeamMessages(
    teamId: string,
    filters?: {
      status?: MessageStatus;
    }
  ): Effect.Effect<AgentMessage[], MultiAgentError>;
  markAsRead(id: string): Effect.Effect<void, MultiAgentError>;
};
export type ToolRuleRepository = {
  create(
    request: CreateToolRuleRequest
  ): Effect.Effect<ToolRule, MultiAgentError>;
  findById(id: string): Effect.Effect<Option.Option<ToolRule>, MultiAgentError>;
  update(
    id: string,
    updates: Partial<ToolRule>
  ): Effect.Effect<ToolRule, MultiAgentError>;
  delete(id: string): Effect.Effect<void, MultiAgentError>;
  listByTeam(teamId: string): Effect.Effect<ToolRule[], MultiAgentError>;
  getActiveRulesForTool(
    teamId: string,
    toolName: string
  ): Effect.Effect<ToolRule[], MultiAgentError>;
};
export type MessageQueue = {
  enqueue(message: AgentMessage): Effect.Effect<void, MultiAgentError>;
  dequeue(
    agentId: string
  ): Effect.Effect<Option.Option<AgentMessage>, MultiAgentError>;
  broadcast(
    teamId: string,
    message: Omit<AgentMessage, "id" | "createdAt" | "status">
  ): Effect.Effect<AgentMessage[], MultiAgentError>;
};
export declare const TeamRepository: Context.Tag<
  TeamRepository,
  TeamRepository
>;
export declare const TeamMembershipRepository: Context.Tag<
  TeamMembershipRepository,
  TeamMembershipRepository
>;
export declare const SharedMemoryRepository: Context.Tag<
  SharedMemoryRepository,
  SharedMemoryRepository
>;
export declare const MessageRepository: Context.Tag<
  MessageRepository,
  MessageRepository
>;
export declare const ToolRuleRepository: Context.Tag<
  ToolRuleRepository,
  ToolRuleRepository
>;
export declare const MessageQueue: Context.Tag<MessageQueue, MessageQueue>;
export type MultiAgentService = {
  createTeam(
    request: CreateTeamRequest
  ): Effect.Effect<MultiAgentTeam, MultiAgentError>;
  getTeam(
    id: string
  ): Effect.Effect<MultiAgentTeam, MultiAgentError | TeamNotFoundError>;
  updateTeam(
    id: string,
    request: UpdateTeamRequest
  ): Effect.Effect<MultiAgentError, MultiAgentError | TeamNotFoundError>;
  deleteTeam(
    id: string
  ): Effect.Effect<void, MultiAgentError | TeamNotFoundError>;
  listTeams(filters?: {
    status?: TeamStatus;
  }): Effect.Effect<MultiAgentTeam[], MultiAgentError>;
  addAgentToTeam(
    teamId: string,
    agentId: string,
    role?: string
  ): Effect.Effect<
    void,
    MultiAgentError | TeamNotFoundError | AgentNotFoundError
  >;
  removeAgentFromTeam(
    teamId: string,
    agentId: string
  ): Effect.Effect<
    void,
    MultiAgentError | TeamNotFoundError | AgentNotFoundError
  >;
  getTeamAgents(
    teamId: string
  ): Effect.Effect<TeamMembership[], MultiAgentError | TeamNotFoundError>;
  getAgentTeams(
    agentId: string
  ): Effect.Effect<TeamMembership[], MultiAgentError | AgentNotFoundError>;
  createSharedMemory(
    request: CreateSharedMemoryRequest
  ): Effect.Effect<SharedMemoryBlock, MultiAgentError | TeamNotFoundError>;
  getSharedMemory(
    id: string,
    agentId: string
  ): Effect.Effect<
    SharedMemoryBlock,
    MultiAgentError | MemoryAccessDeniedError
  >;
  updateSharedMemory(
    id: string,
    request: UpdateSharedMemoryRequest,
    agentId: string
  ): Effect.Effect<
    SharedMemoryBlock,
    MultiAgentError | MemoryAccessDeniedError
  >;
  deleteSharedMemory(
    id: string,
    agentId: string
  ): Effect.Effect<void, MultiAgentError | MemoryAccessDeniedError>;
  listSharedMemoryByTeam(
    teamId: string,
    agentId: string
  ): Effect.Effect<SharedMemoryBlock[], MultiAgentError | TeamNotFoundError>;
  sendMessage(
    fromAgentId: string,
    request: SendMessageRequest
  ): Effect.Effect<
    void,
    MultiAgentError | MessageDeliveryError | AgentNotFoundError
  >;
  broadcastToTeam(
    fromAgentId: string,
    teamId: string,
    request: BroadcastMessageRequest
  ): Effect.Effect<
    AgentMessage[],
    MultiAgentError | TeamNotFoundError | AgentNotFoundError
  >;
  getAgentMessages(
    agentId: string,
    filters?: {
      status?: MessageStatus;
    }
  ): Effect.Effect<AgentMessage[], MultiAgentError | AgentNotFoundError>;
  getTeamMessages(
    teamId: string,
    filters?: {
      status?: MessageStatus;
    }
  ): Effect.Effect<AgentMessage[], MultiAgentError | TeamNotFoundError>;
  markMessageAsRead(
    messageId: string,
    agentId: string
  ): Effect.Effect<void, MultiAgentError | AgentNotFoundError>;
  createToolRule(
    request: CreateToolRuleRequest
  ): Effect.Effect<ToolRule, MultiAgentError | TeamNotFoundError>;
  getToolRules(
    teamId: string,
    agentId: string
  ): Effect.Effect<ToolRule[], MultiAgentError | TeamNotFoundError>;
  updateToolRule(
    id: string,
    updates: Partial<ToolRule>,
    agentId: string
  ): Effect.Effect<ToolRule, MultiAgentError>;
  deleteToolRule(
    id: string,
    agentId: string
  ): Effect.Effect<void, MultiAgentError>;
  validateToolExecution(
    teamId: string,
    toolName: string,
    agentId: string
  ): Effect.Effect<
    boolean,
    MultiAgentError | ToolRuleViolationError | TeamNotFoundError
  >;
};
export declare const MultiAgentService: Context.Tag<
  MultiAgentService,
  MultiAgentService
>;
export declare const TeamRepositoryLive: Layer.Layer<
  TeamRepository,
  never,
  never
>;
export declare const TeamMembershipRepositoryLive: Layer.Layer<
  TeamMembershipRepository,
  never,
  never
>;
export declare const SharedMemoryRepositoryLive: Layer.Layer<
  SharedMemoryRepository,
  never,
  never
>;
export declare const MessageRepositoryLive: Layer.Layer<
  MessageRepository,
  never,
  never
>;
export declare const ToolRuleRepositoryLive: Layer.Layer<
  ToolRuleRepository,
  never,
  never
>;
export declare const MessageQueueLive: Layer.Layer<MessageQueue, never, never>;
export declare const MultiAgentServiceLive: Layer.Layer<
  MultiAgentService,
  never,
  | TeamRepository
  | TeamMembershipRepository
  | SharedMemoryRepository
  | MessageRepository
  | ToolRuleRepository
  | MessageQueue
>;
export declare const MultiAgentLayers: Layer.Layer<
  | TeamRepository
  | TeamMembershipRepository
  | SharedMemoryRepository
  | MessageRepository
  | ToolRuleRepository
  | MessageQueue
  | MultiAgentService,
  never,
  | TeamRepository
  | TeamMembershipRepository
  | SharedMemoryRepository
  | MessageRepository
  | ToolRuleRepository
  | MessageQueue
>;
