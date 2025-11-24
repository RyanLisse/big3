import { Context, Effect, Layer, pipe } from "effect";
import {
  validateCreateSharedMemoryRequest,
  validateCreateTeamRequest,
  validateUpdateSharedMemoryRequest,
  validateUpdateTeamRequest,
} from "../core/validation.js";
import type {
  ApiResponse,
  BroadcastMessageRequest,
  CreateSharedMemoryRequest,
  CreateTeamRequest,
  CreateToolRuleRequest,
  SendMessageRequest,
} from "../domain.js";
import {
  type MessagePriority,
  type MessageStatus,
  type MessageType,
  MultiAgentError,
  type TeamStatus,
} from "../domain.js";
import { MultiAgentService } from "./MultiAgentService.js";

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  readonly pagination?: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
  };
}

// Request validation
export type ValidationErrors = {
  readonly field: string;
  readonly message: string;
};

export class ApiValidationError extends MultiAgentError {
  readonly _tag = "ApiValidationError";
  constructor(readonly errors: readonly ValidationErrors[]) {
    super("Validation failed");
  }
}

// Constants for validation
const ValidTeamStatuses: readonly TeamStatus[] = [
  "active",
  "paused",
  "archived",
];
const ValidMessageStatuses: readonly MessageStatus[] = [
  "pending",
  "delivered",
  "read",
  "failed",
];

const ValidMessageTypes: readonly MessageType[] = [
  "request",
  "response",
  "notification",
  "broadcast",
];
const ValidMessagePriorities: readonly MessagePriority[] = [
  "low",
  "normal",
  "high",
  "urgent",
];

// API Service Interface
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
    ApiResponse<{ readonly status: string; readonly timestamp: Date }>,
    never
  >;
};

export const MultiAgentApiServiceTag = Context.GenericTag<MultiAgentApiService>(
  "MultiAgentApiService"
);

// Implementation
class MultiAgentApiServiceImpl implements MultiAgentApiService {
  constructor(private readonly multiAgentService: MultiAgentService) {}

  // Helper methods
  private successResponse<T>(data: T): ApiResponse<T> {
    return { success: true, data };
  }

  private errorResponse(error: MultiAgentError): ApiResponse<never> {
    return {
      success: false,
      error: {
        code: error._tag,
        message: error.message,
        details: error.cause,
      },
    };
  }

  private readonly validateCreateTeamRequest = (
    request: unknown
  ): Effect.Effect<CreateTeamRequest, ApiValidationError> =>
    Effect.try({
      try: () => {
        const result = validateCreateTeamRequest(request);
        if (!result.success) {
          throw result.error;
        }
        return result.data;
      },
      catch: (error: unknown) =>
        new ApiValidationError(
          (
            (error as { issues?: Array<{ path: string[]; message: string }> })
              .issues ?? []
          ).map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          }))
        ),
    });

  private readonly validateCreateSharedMemoryRequest = (
    request: unknown
  ): Effect.Effect<CreateSharedMemoryRequest, ApiValidationError> =>
    Effect.try({
      try: () => {
        const result = validateCreateSharedMemoryRequest(request);
        if (!result.success) {
          throw result.error;
        }
        return result.data;
      },
      catch: (error: unknown) =>
        new ApiValidationError(
          (
            (error as { issues?: Array<{ path: string[]; message: string }> })
              .issues ?? []
          ).map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          }))
        ),
    });

  private readonly validateSendMessageRequest = (
    request: unknown
  ): Effect.Effect<SendMessageRequest, ApiValidationError> =>
    pipe(
      Effect.try({
        try: () => request as SendMessageRequest,
        catch: () =>
          new ApiValidationError([
            { field: "request", message: "Invalid request format" },
          ]),
      }),
      Effect.flatMap((req) => {
        const errors: ValidationErrors[] = [];

        if (!req.toAgentId || req.toAgentId.trim().length === 0) {
          errors.push({
            field: "toAgentId",
            message: "To agent ID is required",
          });
        }

        if (!req.content || req.content.trim().length === 0) {
          errors.push({
            field: "content",
            message: "Content is required and must not be empty",
          });
        }

        if (req.messageType && !ValidMessageTypes.includes(req.messageType)) {
          errors.push({
            field: "messageType",
            message: "Invalid message type",
          });
        }

        if (req.priority && !ValidMessagePriorities.includes(req.priority)) {
          errors.push({ field: "priority", message: "Invalid priority level" });
        }

        return errors.length > 0
          ? Effect.fail(new ApiValidationError(errors))
          : Effect.succeed({
              ...req,
              toAgentId: req.toAgentId.trim(),
              content: req.content.trim(),
            });
      })
    );

  // Team API endpoints
  createTeam = (request: unknown): Effect.Effect<ApiResponse<unknown>, never> =>
    pipe(
      this.validateCreateTeamRequest(request),
      Effect.flatMap((validatedRequest) =>
        this.multiAgentService.createTeam(validatedRequest)
      ),
      Effect.map((team) => this.successResponse(team)),
      Effect.catchAll((error) =>
        Effect.succeed(this.errorResponse(error as MultiAgentError))
      )
    );

  getTeam = (id: string): Effect.Effect<ApiResponse<unknown>, never> =>
    pipe(
      Effect.succeed(id.trim()),
      Effect.flatMap((teamId) =>
        teamId.length > 0
          ? this.multiAgentService.getTeam(teamId)
          : Effect.fail(
              new ApiValidationError([
                { field: "id", message: "Team ID is required" },
              ])
            )
      ),
      Effect.map((team) => this.successResponse(team)),
      Effect.catchAll((error) =>
        Effect.succeed(this.errorResponse(error as MultiAgentError))
      )
    );

  updateTeam = (
    id: string,
    request: unknown
  ): Effect.Effect<ApiResponse<unknown>, never> =>
    pipe(
      Effect.succeed(id.trim()),
      Effect.flatMap((teamId) =>
        teamId.length > 0
          ? Effect.succeed(teamId)
          : Effect.fail(
              new ApiValidationError([
                { field: "id", message: "Team ID is required" },
              ])
            )
      ),
      Effect.flatMap(() =>
        Effect.try({
          try: () => {
            const result = validateUpdateTeamRequest(request);
            if (!result.success) {
              throw result.error;
            }
            return result.data;
          },
          catch: (error: unknown) =>
            new ApiValidationError(
              (
                (
                  error as {
                    issues?: Array<{ path: unknown[]; message: string }>;
                  }
                ).issues ?? []
              ).map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
              }))
            ),
        })
      ),
      Effect.flatMap((validatedRequest) =>
        this.multiAgentService.updateTeam(id, validatedRequest)
      ),
      Effect.map((team) => this.successResponse(team)),
      Effect.catchAll((error) =>
        Effect.succeed(this.errorResponse(error as MultiAgentError))
      )
    );

  deleteTeam = (id: string): Effect.Effect<ApiResponse<void>, never> =>
    pipe(
      Effect.succeed(id.trim()),
      Effect.flatMap((teamId) =>
        teamId.length > 0
          ? this.multiAgentService.deleteTeam(teamId)
          : Effect.fail(
              new ApiValidationError([
                { field: "id", message: "Team ID is required" },
              ])
            )
      ),
      Effect.map(() => this.successResponse(undefined)),
      Effect.catchAll((error) =>
        Effect.succeed(this.errorResponse(error as MultiAgentError))
      )
    );

  listTeams = (status?: string): Effect.Effect<ApiResponse<unknown>, never> =>
    pipe(
      Effect.succeed(status),
      Effect.map((statusFilter) => {
        if (
          statusFilter &&
          !ValidTeamStatuses.includes(statusFilter as TeamStatus)
        ) {
          return;
        }
        return statusFilter as TeamStatus | undefined;
      }),
      Effect.flatMap((statusFilter) =>
        this.multiAgentService.listTeams(
          statusFilter ? { status: statusFilter } : undefined
        )
      ),
      Effect.map((teams) => this.successResponse(teams)),
      Effect.catchAll((error) =>
        Effect.succeed(this.errorResponse(error as MultiAgentError))
      )
    );

  // Team Membership API endpoints
  addAgentToTeam = (
    teamId: string,
    agentId: string,
    role = "member"
  ): Effect.Effect<ApiResponse<void>, never> =>
    pipe(
      Effect.all([
        Effect.succeed(teamId.trim()),
        Effect.succeed(agentId.trim()),
        Effect.succeed(role),
      ]),
      Effect.flatMap(([tid, aid, r]) => {
        const errors: ValidationErrors[] = [];

        if (tid.length === 0) {
          errors.push({ field: "teamId", message: "Team ID is required" });
        }
        if (aid.length === 0) {
          errors.push({ field: "agentId", message: "Agent ID is required" });
        }

        return errors.length > 0
          ? Effect.fail(new ApiValidationError(errors))
          : Effect.succeed([tid, aid, r] as const);
      }),
      Effect.flatMap(([tid, aid, r]) =>
        this.multiAgentService.addAgentToTeam(tid, aid, r)
      ),
      Effect.map(() => this.successResponse(undefined)),
      Effect.catchAll((error) =>
        Effect.succeed(this.errorResponse(error as MultiAgentError))
      )
    );

  removeAgentFromTeam = (
    teamId: string,
    agentId: string
  ): Effect.Effect<ApiResponse<void>, never> =>
    pipe(
      Effect.all([
        Effect.succeed(teamId.trim()),
        Effect.succeed(agentId.trim()),
      ]),
      Effect.flatMap(([tid, aid]) => {
        const errors: ValidationErrors[] = [];

        if (tid.length === 0) {
          errors.push({ field: "teamId", message: "Team ID is required" });
        }
        if (aid.length === 0) {
          errors.push({ field: "agentId", message: "Agent ID is required" });
        }

        return errors.length > 0
          ? Effect.fail(new ApiValidationError(errors))
          : Effect.succeed([tid, aid] as const);
      }),
      Effect.flatMap(([tid, aid]) =>
        this.multiAgentService.removeAgentFromTeam(tid, aid)
      ),
      Effect.map(() => this.successResponse(undefined)),
      Effect.catchAll((error) =>
        Effect.succeed(this.errorResponse(error as MultiAgentError))
      )
    );

  getTeamAgents = (
    teamId: string
  ): Effect.Effect<ApiResponse<unknown>, never> =>
    pipe(
      Effect.succeed(teamId.trim()),
      Effect.flatMap((tid) =>
        tid.length > 0
          ? this.multiAgentService.getTeamAgents(tid)
          : Effect.fail(
              new ApiValidationError([
                { field: "teamId", message: "Team ID is required" },
              ])
            )
      ),
      Effect.map((agents) => this.successResponse(agents)),
      Effect.catchAll((error) =>
        Effect.succeed(this.errorResponse(error as MultiAgentError))
      )
    );

  // Shared Memory API endpoints
  createSharedMemory = (
    request: unknown
  ): Effect.Effect<ApiResponse<unknown>, never> =>
    pipe(
      this.validateCreateSharedMemoryRequest(request),
      Effect.flatMap((validatedRequest) =>
        this.multiAgentService.createSharedMemory(validatedRequest)
      ),
      Effect.map((memory) => this.successResponse(memory)),
      Effect.catchAll((error) =>
        Effect.succeed(this.errorResponse(error as MultiAgentError))
      )
    );

  getSharedMemory = (
    id: string,
    agentId: string
  ): Effect.Effect<ApiResponse<unknown>, never> =>
    pipe(
      Effect.all([Effect.succeed(id.trim()), Effect.succeed(agentId.trim())]),
      Effect.flatMap(([mid, aid]) => {
        const errors: ValidationErrors[] = [];

        if (mid.length === 0) {
          errors.push({ field: "id", message: "Memory ID is required" });
        }
        if (aid.length === 0) {
          errors.push({ field: "agentId", message: "Agent ID is required" });
        }

        return errors.length > 0
          ? Effect.fail(new ApiValidationError(errors))
          : Effect.succeed([mid, aid] as const);
      }),
      Effect.flatMap(([mid, aid]) =>
        this.multiAgentService.getSharedMemory(mid, aid)
      ),
      Effect.map((memory) => this.successResponse(memory)),
      Effect.catchAll((error) =>
        Effect.succeed(this.errorResponse(error as MultiAgentError))
      )
    );

  updateSharedMemory = (
    id: string,
    request: unknown,
    agentId: string
  ): Effect.Effect<ApiResponse<unknown>, never> =>
    pipe(
      Effect.all([Effect.succeed(id.trim()), Effect.succeed(agentId.trim())]),
      Effect.flatMap(([mid, aid]) => {
        const errors: ValidationErrors[] = [];

        if (mid.length === 0) {
          errors.push({ field: "id", message: "Memory ID is required" });
        }
        if (aid.length === 0) {
          errors.push({ field: "agentId", message: "Agent ID is required" });
        }

        return errors.length > 0
          ? Effect.fail(new ApiValidationError(errors))
          : Effect.succeed([mid, aid] as const);
      }),
      Effect.flatMap(([mid, aid]) =>
        Effect.try({
          try: () => {
            const result = validateUpdateSharedMemoryRequest(request);
            if (!result.success) {
              throw result.error;
            }
            return [mid, aid, result.data] as const;
          },
          catch: (error: unknown) =>
            new ApiValidationError(
              (
                (
                  error as {
                    issues?: Array<{ path: unknown[]; message: string }>;
                  }
                ).issues ?? []
              ).map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
              }))
            ),
        })
      ),
      Effect.flatMap(([mid, aid, validatedRequest]) =>
        this.multiAgentService.updateSharedMemory(mid, validatedRequest, aid)
      ),
      Effect.map((memory) => this.successResponse(memory)),
      Effect.catchAll((error) =>
        Effect.succeed(this.errorResponse(error as MultiAgentError))
      )
    );

  deleteSharedMemory = (
    id: string,
    agentId: string
  ): Effect.Effect<ApiResponse<void>, never> =>
    pipe(
      Effect.all([Effect.succeed(id.trim()), Effect.succeed(agentId.trim())]),
      Effect.flatMap(([mid, aid]) => {
        const errors: ValidationErrors[] = [];

        if (mid.length === 0) {
          errors.push({ field: "id", message: "Memory ID is required" });
        }
        if (aid.length === 0) {
          errors.push({ field: "agentId", message: "Agent ID is required" });
        }

        return errors.length > 0
          ? Effect.fail(new ApiValidationError(errors))
          : Effect.succeed([mid, aid] as const);
      }),
      Effect.flatMap(([mid, aid]) =>
        this.multiAgentService.deleteSharedMemory(mid, aid)
      ),
      Effect.map(() => this.successResponse(undefined)),
      Effect.catchAll((error) =>
        Effect.succeed(this.errorResponse(error as MultiAgentError))
      )
    );

  listSharedMemoryByTeam = (
    teamId: string,
    agentId: string
  ): Effect.Effect<ApiResponse<unknown>, never> =>
    pipe(
      Effect.all([
        Effect.succeed(teamId.trim()),
        Effect.succeed(agentId.trim()),
      ]),
      Effect.flatMap(([tid, aid]) => {
        const errors: ValidationErrors[] = [];

        if (tid.length === 0) {
          errors.push({ field: "teamId", message: "Team ID is required" });
        }
        if (aid.length === 0) {
          errors.push({ field: "agentId", message: "Agent ID is required" });
        }

        return errors.length > 0
          ? Effect.fail(new ApiValidationError(errors))
          : Effect.succeed([tid, aid] as const);
      }),
      Effect.flatMap(([tid, aid]) =>
        this.multiAgentService.listSharedMemoryByTeam(tid, aid)
      ),
      Effect.map((memories) => this.successResponse(memories)),
      Effect.catchAll((error) =>
        Effect.succeed(this.errorResponse(error as MultiAgentError))
      )
    );

  // Message API endpoints
  sendMessage = (
    fromAgentId: string,
    request: unknown
  ): Effect.Effect<ApiResponse<unknown>, never> =>
    pipe(
      Effect.all([
        Effect.succeed(fromAgentId.trim()),
        this.validateSendMessageRequest(request),
      ]),
      Effect.flatMap(([aid, validatedRequest]) => {
        if (aid.length === 0) {
          return Effect.fail(
            new ApiValidationError([
              { field: "fromAgentId", message: "From agent ID is required" },
            ])
          );
        }
        return this.multiAgentService.sendMessage(aid, validatedRequest);
      }),
      Effect.map((message) => this.successResponse(message)),
      Effect.catchAll((error) =>
        Effect.succeed(this.errorResponse(error as MultiAgentError))
      )
    );

  broadcastToTeam = (
    fromAgentId: string,
    teamId: string,
    request: unknown
  ): Effect.Effect<ApiResponse<unknown>, never> =>
    pipe(
      Effect.all([
        Effect.succeed(fromAgentId.trim()),
        Effect.succeed(teamId.trim()),
      ]),
      Effect.flatMap(([aid, tid]) => {
        const errors: ValidationErrors[] = [];

        if (aid.length === 0) {
          errors.push({
            field: "fromAgentId",
            message: "From agent ID is required",
          });
        }
        if (tid.length === 0) {
          errors.push({ field: "teamId", message: "Team ID is required" });
        }

        return errors.length > 0
          ? Effect.fail(new ApiValidationError(errors))
          : Effect.succeed([aid, tid] as const);
      }),
      Effect.flatMap(([aid, tid]) =>
        Effect.try({
          try: () => request as BroadcastMessageRequest,
          catch: () =>
            new ApiValidationError([
              { field: "request", message: "Invalid request format" },
            ]),
        }).pipe(
          Effect.map(
            (validatedRequest) => [aid, tid, validatedRequest] as const
          )
        )
      ),
      Effect.flatMap(([aid, tid, validatedRequest]) =>
        this.multiAgentService.broadcastToTeam(aid, tid, validatedRequest)
      ),
      Effect.map((messages) => this.successResponse(messages)),
      Effect.catchAll((error) =>
        Effect.succeed(this.errorResponse(error as MultiAgentError))
      )
    );

  getAgentMessages = (
    agentId: string,
    status?: string
  ): Effect.Effect<ApiResponse<unknown>, never> =>
    pipe(
      Effect.all([Effect.succeed(agentId.trim()), Effect.succeed(status)]),
      Effect.flatMap(([aid, statusFilter]) => {
        if (aid.length === 0) {
          return Effect.fail(
            new ApiValidationError([
              { field: "agentId", message: "Agent ID is required" },
            ])
          );
        }

        const messageStatus =
          statusFilter &&
          ValidMessageStatuses.includes(statusFilter as MessageStatus)
            ? (statusFilter as MessageStatus)
            : undefined;

        return this.multiAgentService.getAgentMessages(
          aid,
          messageStatus ? { status: messageStatus } : undefined
        );
      }),
      Effect.map((messages) => this.successResponse(messages)),
      Effect.catchAll((error) =>
        Effect.succeed(this.errorResponse(error as MultiAgentError))
      )
    );

  getTeamMessages = (
    teamId: string,
    status?: string
  ): Effect.Effect<ApiResponse<unknown>, never> =>
    pipe(
      Effect.all([Effect.succeed(teamId.trim()), Effect.succeed(status)]),
      Effect.flatMap(([tid, statusFilter]) => {
        if (tid.length === 0) {
          return Effect.fail(
            new ApiValidationError([
              { field: "teamId", message: "Team ID is required" },
            ])
          );
        }

        const messageStatus =
          statusFilter &&
          ValidMessageStatuses.includes(statusFilter as MessageStatus)
            ? (statusFilter as MessageStatus)
            : undefined;

        return this.multiAgentService.getTeamMessages(
          tid,
          messageStatus ? { status: messageStatus } : undefined
        );
      }),
      Effect.map((messages) => this.successResponse(messages)),
      Effect.catchAll((error) =>
        Effect.succeed(this.errorResponse(error as MultiAgentError))
      )
    );

  markMessageAsRead = (
    messageId: string,
    agentId: string
  ): Effect.Effect<ApiResponse<void>, never> =>
    pipe(
      Effect.all([
        Effect.succeed(messageId.trim()),
        Effect.succeed(agentId.trim()),
      ]),
      Effect.flatMap(([mid, aid]) => {
        const errors: ValidationErrors[] = [];

        if (mid.length === 0) {
          errors.push({
            field: "messageId",
            message: "Message ID is required",
          });
        }
        if (aid.length === 0) {
          errors.push({ field: "agentId", message: "Agent ID is required" });
        }

        return errors.length > 0
          ? Effect.fail(new ApiValidationError(errors))
          : Effect.succeed([mid, aid] as const);
      }),
      Effect.flatMap(([mid, aid]) =>
        this.multiAgentService.markMessageAsRead(mid, aid)
      ),
      Effect.map(() => this.successResponse(undefined)),
      Effect.catchAll((error) =>
        Effect.succeed(this.errorResponse(error as MultiAgentError))
      )
    );

  // Tool Rules API endpoints
  createToolRule = (
    request: unknown
  ): Effect.Effect<ApiResponse<unknown>, never> =>
    pipe(
      Effect.try({
        try: () => request as CreateToolRuleRequest,
        catch: () =>
          new ApiValidationError([
            { field: "request", message: "Invalid request format" },
          ]),
      }),
      Effect.flatMap((req) => {
        const errors: ValidationErrors[] = [];

        if (!req.teamId || req.teamId.trim().length === 0) {
          errors.push({ field: "teamId", message: "Team ID is required" });
        }

        if (!req.name || req.name.trim().length === 0) {
          errors.push({ field: "name", message: "Rule name is required" });
        }

        if (!req.toolNames || req.toolNames.length === 0) {
          errors.push({
            field: "toolNames",
            message: "At least one tool name is required",
          });
        }

        return errors.length > 0
          ? Effect.fail(new ApiValidationError(errors))
          : Effect.succeed({
              ...req,
              teamId: req.teamId.trim(),
              name: req.name.trim(),
            });
      }),
      Effect.flatMap((validatedRequest) =>
        this.multiAgentService.createToolRule(validatedRequest)
      ),
      Effect.map((rule) => this.successResponse(rule)),
      Effect.catchAll((error) =>
        Effect.succeed(this.errorResponse(error as MultiAgentError))
      )
    );

  getToolRules = (
    teamId: string,
    agentId: string
  ): Effect.Effect<ApiResponse<unknown>, never> =>
    pipe(
      Effect.all([
        Effect.succeed(teamId.trim()),
        Effect.succeed(agentId.trim()),
      ]),
      Effect.flatMap(([tid, aid]) => {
        const errors: ValidationErrors[] = [];

        if (tid.length === 0) {
          errors.push({ field: "teamId", message: "Team ID is required" });
        }
        if (aid.length === 0) {
          errors.push({ field: "agentId", message: "Agent ID is required" });
        }

        return errors.length > 0
          ? Effect.fail(new ApiValidationError(errors))
          : Effect.succeed([tid, aid] as const);
      }),
      Effect.flatMap(([tid, aid]) =>
        this.multiAgentService.getToolRules(tid, aid)
      ),
      Effect.map((rules) => this.successResponse(rules)),
      Effect.catchAll((error) =>
        Effect.succeed(this.errorResponse(error as MultiAgentError))
      )
    );

  // Health check endpoint
  healthCheck = (): Effect.Effect<
    ApiResponse<{ readonly status: string; readonly timestamp: Date }>,
    never
  > =>
    Effect.succeed(
      this.successResponse({
        status: "healthy",
        timestamp: new Date(),
      })
    );
}

// Service layer
export { MultiAgentApiServiceImpl };
export const MultiAgentApiServiceLive = Layer.effect(
  MultiAgentApiServiceTag,
  Effect.map(
    MultiAgentService,
    (service) => new MultiAgentApiServiceImpl(service)
  )
);

// Complete API layer
export const MultiAgentApiLayers = MultiAgentApiServiceLive;
