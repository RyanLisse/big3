import { Context, Effect, Layer } from "effect";
import type { ApiResponse } from "../domain.js";
import { MultiAgentError } from "../domain.js";
import { MultiAgentService } from "./MultiAgentService.js";
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  readonly pagination?: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
  };
}
export type ValidationErrors = {
  readonly field: string;
  readonly message: string;
};
export declare class ApiValidationError extends MultiAgentError {
  readonly errors: readonly ValidationErrors[];
  readonly _tag = "ApiValidationError";
  constructor(errors: readonly ValidationErrors[]);
}
export type MultiAgentApiService = {
  createTeam(request: unknown): Effect.Effect<ApiResponse<unknown>, never>;
  getTeam(id: string): Effect.Effect<ApiResponse<unknown>, never>;
  updateTeam(
    id: string,
    request: unknown
  ): Effect.Effect<ApiResponse<unknown>, never>;
  deleteTeam(id: string): Effect.Effect<ApiResponse<void>, never>;
  listTeams(status?: string): Effect.Effect<ApiResponse<unknown>, never>;
  addAgentToTeam(
    teamId: string,
    agentId: string,
    role?: string
  ): Effect.Effect<ApiResponse<void>, never>;
  removeAgentFromTeam(
    teamId: string,
    agentId: string
  ): Effect.Effect<ApiResponse<void>, never>;
  getTeamAgents(teamId: string): Effect.Effect<ApiResponse<unknown>, never>;
  createSharedMemory(
    request: unknown
  ): Effect.Effect<ApiResponse<unknown>, never>;
  getSharedMemory(
    id: string,
    agentId: string
  ): Effect.Effect<ApiResponse<unknown>, never>;
  updateSharedMemory(
    id: string,
    request: unknown,
    agentId: string
  ): Effect.Effect<ApiResponse<unknown>, never>;
  deleteSharedMemory(
    id: string,
    agentId: string
  ): Effect.Effect<ApiResponse<void>, never>;
  listSharedMemoryByTeam(
    teamId: string,
    agentId: string
  ): Effect.Effect<ApiResponse<unknown>, never>;
  sendMessage(
    fromAgentId: string,
    request: unknown
  ): Effect.Effect<ApiResponse<unknown>, never>;
  broadcastToTeam(
    fromAgentId: string,
    teamId: string,
    request: unknown
  ): Effect.Effect<ApiResponse<unknown>, never>;
  getAgentMessages(
    agentId: string,
    status?: string
  ): Effect.Effect<ApiResponse<unknown>, never>;
  getTeamMessages(
    teamId: string,
    status?: string
  ): Effect.Effect<ApiResponse<unknown>, never>;
  markMessageAsRead(
    messageId: string,
    agentId: string
  ): Effect.Effect<ApiResponse<void>, never>;
  createToolRule(request: unknown): Effect.Effect<ApiResponse<unknown>, never>;
  getToolRules(
    teamId: string,
    agentId: string
  ): Effect.Effect<ApiResponse<unknown>, never>;
  healthCheck(): Effect.Effect<
    ApiResponse<{
      readonly status: string;
      readonly timestamp: Date;
    }>,
    never
  >;
};
export declare const MultiAgentApiServiceTag: Context.Tag<
  MultiAgentApiService,
  MultiAgentApiService
>;
declare class MultiAgentApiServiceImpl implements MultiAgentApiService {
  private readonly multiAgentService;
  constructor(multiAgentService: MultiAgentService);
  private successResponse;
  private errorResponse;
  private readonly validateCreateTeamRequest;
  private readonly validateCreateSharedMemoryRequest;
  private readonly validateSendMessageRequest;
  createTeam: (request: unknown) => Effect.Effect<ApiResponse<unknown>, never>;
  getTeam: (id: string) => Effect.Effect<ApiResponse<unknown>, never>;
  updateTeam: (
    id: string,
    request: unknown
  ) => Effect.Effect<ApiResponse<unknown>, never>;
  deleteTeam: (id: string) => Effect.Effect<ApiResponse<void>, never>;
  listTeams: (status?: string) => Effect.Effect<ApiResponse<unknown>, never>;
  addAgentToTeam: (
    teamId: string,
    agentId: string,
    role?: string
  ) => Effect.Effect<ApiResponse<void>, never>;
  removeAgentFromTeam: (
    teamId: string,
    agentId: string
  ) => Effect.Effect<ApiResponse<void>, never>;
  getTeamAgents: (teamId: string) => Effect.Effect<ApiResponse<unknown>, never>;
  createSharedMemory: (
    request: unknown
  ) => Effect.Effect<ApiResponse<unknown>, never>;
  getSharedMemory: (
    id: string,
    agentId: string
  ) => Effect.Effect<ApiResponse<unknown>, never>;
  updateSharedMemory: (
    id: string,
    request: unknown,
    agentId: string
  ) => Effect.Effect<ApiResponse<unknown>, never>;
  deleteSharedMemory: (
    id: string,
    agentId: string
  ) => Effect.Effect<ApiResponse<void>, never>;
  listSharedMemoryByTeam: (
    teamId: string,
    agentId: string
  ) => Effect.Effect<ApiResponse<unknown>, never>;
  sendMessage: (
    fromAgentId: string,
    request: unknown
  ) => Effect.Effect<ApiResponse<unknown>, never>;
  broadcastToTeam: (
    fromAgentId: string,
    teamId: string,
    request: unknown
  ) => Effect.Effect<ApiResponse<unknown>, never>;
  getAgentMessages: (
    agentId: string,
    status?: string
  ) => Effect.Effect<ApiResponse<unknown>, never>;
  getTeamMessages: (
    teamId: string,
    status?: string
  ) => Effect.Effect<ApiResponse<unknown>, never>;
  markMessageAsRead: (
    messageId: string,
    agentId: string
  ) => Effect.Effect<ApiResponse<void>, never>;
  createToolRule: (
    request: unknown
  ) => Effect.Effect<ApiResponse<unknown>, never>;
  getToolRules: (
    teamId: string,
    agentId: string
  ) => Effect.Effect<ApiResponse<unknown>, never>;
  healthCheck: () => Effect.Effect<
    ApiResponse<{
      readonly status: string;
      readonly timestamp: Date;
    }>,
    never
  >;
}
export { MultiAgentApiServiceImpl };
export declare const MultiAgentApiServiceLive: Layer.Layer<
  MultiAgentApiService,
  never,
  MultiAgentService
>;
export declare const MultiAgentApiLayers: Layer.Layer<
  MultiAgentApiService,
  never,
  MultiAgentService
>;
