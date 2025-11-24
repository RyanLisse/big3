import { Context, Effect, Layer, pipe } from "effect";
import {
  validateCreateSharedMemoryRequest,
  validateCreateTeamRequest,
  validateUpdateSharedMemoryRequest,
  validateUpdateTeamRequest,
} from "../core/validation.js";
import { MultiAgentError } from "../domain.js";
import { MultiAgentService } from "./MultiAgentService.js";

// Validation helper
const _validateRequest = (request, errors) => {
  if (errors.length > 0) {
    return Effect.fail(
      new ApiValidationError(
        errors.map((e) => ({ field: "general", message: e }))
      )
    );
  }
  return Effect.succeed(request);
};
export class ApiValidationError extends MultiAgentError {
  errors;
  _tag = "ApiValidationError";
  constructor(errors) {
    super("Validation failed");
    this.errors = errors;
  }
}
// Constants for validation
const ValidTeamStatuses = ["active", "paused", "archived"];
const ValidMessageStatuses = ["pending", "delivered", "read", "failed"];
const ValidMemoryTypes = [
  "project_context",
  "shared_knowledge",
  "workflow_state",
  "custom",
];
const ValidMemoryAccessLevels = ["read", "read_write", "admin"];
const ValidMessageTypes = ["request", "response", "notification", "broadcast"];
const ValidMessagePriorities = ["low", "normal", "high", "urgent"];
export const MultiAgentApiServiceTag = Context.GenericTag(
  "MultiAgentApiService"
);
// Implementation
class MultiAgentApiServiceImpl {
  multiAgentService;
  constructor(multiAgentService) {
    this.multiAgentService = multiAgentService;
  }
  // Helper methods
  successResponse(data) {
    return { success: true, data };
  }
  errorResponse(error) {
    return {
      success: false,
      error: {
        code: error._tag,
        message: error.message,
        details: error.cause,
      },
    };
  }
  validateCreateTeamRequest = (request) =>
    Effect.try({
      try: () => {
        const result = validateCreateTeamRequest(request);
        if (!result.success) {
          throw result.error;
        }
        return result.data;
      },
      catch: (error) =>
        new ApiValidationError(
          (error.issues ?? []).map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          }))
        ),
    });
  validateCreateSharedMemoryRequest = (request) =>
    Effect.try({
      try: () => {
        const result = validateCreateSharedMemoryRequest(request);
        if (!result.success) {
          throw result.error;
        }
        return result.data;
      },
      catch: (error) =>
        new ApiValidationError(
          (error.issues ?? []).map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          }))
        ),
    });
  validateSendMessageRequest = (request) =>
    pipe(
      Effect.try({
        try: () => request,
        catch: () =>
          new ApiValidationError([
            { field: "request", message: "Invalid request format" },
          ]),
      }),
      Effect.flatMap((req) => {
        const errors = [];
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
  createTeam = (request) =>
    pipe(
      this.validateCreateTeamRequest(request),
      Effect.flatMap((validatedRequest) =>
        this.multiAgentService.createTeam(validatedRequest)
      ),
      Effect.map((team) => this.successResponse(team)),
      Effect.catchAll((error) => Effect.succeed(this.errorResponse(error)))
    );
  getTeam = (id) =>
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
      Effect.catchAll((error) => Effect.succeed(this.errorResponse(error)))
    );
  updateTeam = (id, request) =>
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
      Effect.flatMap((_teamId) =>
        Effect.try({
          try: () => {
            const result = validateUpdateTeamRequest(request);
            if (!result.success) {
              throw result.error;
            }
            return result.data;
          },
          catch: (error) =>
            new ApiValidationError(
              (error.issues ?? []).map((issue) => ({
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
      Effect.catchAll((error) => Effect.succeed(this.errorResponse(error)))
    );
  deleteTeam = (id) =>
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
      Effect.catchAll((error) => Effect.succeed(this.errorResponse(error)))
    );
  listTeams = (status) =>
    pipe(
      Effect.succeed(status),
      Effect.map((statusFilter) => {
        if (statusFilter && !ValidTeamStatuses.includes(statusFilter)) {
          return;
        }
        return statusFilter;
      }),
      Effect.flatMap((statusFilter) =>
        this.multiAgentService.listTeams(
          statusFilter ? { status: statusFilter } : undefined
        )
      ),
      Effect.map((teams) => this.successResponse(teams)),
      Effect.catchAll((error) => Effect.succeed(this.errorResponse(error)))
    );
  // Team Membership API endpoints
  addAgentToTeam = (teamId, agentId, role = "member") =>
    pipe(
      Effect.all([
        Effect.succeed(teamId.trim()),
        Effect.succeed(agentId.trim()),
        Effect.succeed(role),
      ]),
      Effect.flatMap(([tid, aid, r]) => {
        const errors = [];
        if (tid.length === 0) {
          errors.push({ field: "teamId", message: "Team ID is required" });
        }
        if (aid.length === 0) {
          errors.push({ field: "agentId", message: "Agent ID is required" });
        }
        return errors.length > 0
          ? Effect.fail(new ApiValidationError(errors))
          : Effect.succeed([tid, aid, r]);
      }),
      Effect.flatMap(([tid, aid, r]) =>
        this.multiAgentService.addAgentToTeam(tid, aid, r)
      ),
      Effect.map(() => this.successResponse(undefined)),
      Effect.catchAll((error) => Effect.succeed(this.errorResponse(error)))
    );
  removeAgentFromTeam = (teamId, agentId) =>
    pipe(
      Effect.all([
        Effect.succeed(teamId.trim()),
        Effect.succeed(agentId.trim()),
      ]),
      Effect.flatMap(([tid, aid]) => {
        const errors = [];
        if (tid.length === 0) {
          errors.push({ field: "teamId", message: "Team ID is required" });
        }
        if (aid.length === 0) {
          errors.push({ field: "agentId", message: "Agent ID is required" });
        }
        return errors.length > 0
          ? Effect.fail(new ApiValidationError(errors))
          : Effect.succeed([tid, aid]);
      }),
      Effect.flatMap(([tid, aid]) =>
        this.multiAgentService.removeAgentFromTeam(tid, aid)
      ),
      Effect.map(() => this.successResponse(undefined)),
      Effect.catchAll((error) => Effect.succeed(this.errorResponse(error)))
    );
  getTeamAgents = (teamId) =>
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
      Effect.catchAll((error) => Effect.succeed(this.errorResponse(error)))
    );
  // Shared Memory API endpoints
  createSharedMemory = (request) =>
    pipe(
      this.validateCreateSharedMemoryRequest(request),
      Effect.flatMap((validatedRequest) =>
        this.multiAgentService.createSharedMemory(validatedRequest)
      ),
      Effect.map((memory) => this.successResponse(memory)),
      Effect.catchAll((error) => Effect.succeed(this.errorResponse(error)))
    );
  getSharedMemory = (id, agentId) =>
    pipe(
      Effect.all([Effect.succeed(id.trim()), Effect.succeed(agentId.trim())]),
      Effect.flatMap(([mid, aid]) => {
        const errors = [];
        if (mid.length === 0) {
          errors.push({ field: "id", message: "Memory ID is required" });
        }
        if (aid.length === 0) {
          errors.push({ field: "agentId", message: "Agent ID is required" });
        }
        return errors.length > 0
          ? Effect.fail(new ApiValidationError(errors))
          : Effect.succeed([mid, aid]);
      }),
      Effect.flatMap(([mid, aid]) =>
        this.multiAgentService.getSharedMemory(mid, aid)
      ),
      Effect.map((memory) => this.successResponse(memory)),
      Effect.catchAll((error) => Effect.succeed(this.errorResponse(error)))
    );
  updateSharedMemory = (id, request, agentId) =>
    pipe(
      Effect.all([Effect.succeed(id.trim()), Effect.succeed(agentId.trim())]),
      Effect.flatMap(([mid, aid]) => {
        const errors = [];
        if (mid.length === 0) {
          errors.push({ field: "id", message: "Memory ID is required" });
        }
        if (aid.length === 0) {
          errors.push({ field: "agentId", message: "Agent ID is required" });
        }
        return errors.length > 0
          ? Effect.fail(new ApiValidationError(errors))
          : Effect.succeed([mid, aid]);
      }),
      Effect.flatMap(([mid, aid]) =>
        Effect.try({
          try: () => {
            const result = validateUpdateSharedMemoryRequest(request);
            if (!result.success) {
              throw result.error;
            }
            return [mid, aid, result.data];
          },
          catch: (error) =>
            new ApiValidationError(
              (error.issues ?? []).map((issue) => ({
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
      Effect.catchAll((error) => Effect.succeed(this.errorResponse(error)))
    );
  deleteSharedMemory = (id, agentId) =>
    pipe(
      Effect.all([Effect.succeed(id.trim()), Effect.succeed(agentId.trim())]),
      Effect.flatMap(([mid, aid]) => {
        const errors = [];
        if (mid.length === 0) {
          errors.push({ field: "id", message: "Memory ID is required" });
        }
        if (aid.length === 0) {
          errors.push({ field: "agentId", message: "Agent ID is required" });
        }
        return errors.length > 0
          ? Effect.fail(new ApiValidationError(errors))
          : Effect.succeed([mid, aid]);
      }),
      Effect.flatMap(([mid, aid]) =>
        this.multiAgentService.deleteSharedMemory(mid, aid)
      ),
      Effect.map(() => this.successResponse(undefined)),
      Effect.catchAll((error) => Effect.succeed(this.errorResponse(error)))
    );
  listSharedMemoryByTeam = (teamId, agentId) =>
    pipe(
      Effect.all([
        Effect.succeed(teamId.trim()),
        Effect.succeed(agentId.trim()),
      ]),
      Effect.flatMap(([tid, aid]) => {
        const errors = [];
        if (tid.length === 0) {
          errors.push({ field: "teamId", message: "Team ID is required" });
        }
        if (aid.length === 0) {
          errors.push({ field: "agentId", message: "Agent ID is required" });
        }
        return errors.length > 0
          ? Effect.fail(new ApiValidationError(errors))
          : Effect.succeed([tid, aid]);
      }),
      Effect.flatMap(([tid, aid]) =>
        this.multiAgentService.listSharedMemoryByTeam(tid, aid)
      ),
      Effect.map((memories) => this.successResponse(memories)),
      Effect.catchAll((error) => Effect.succeed(this.errorResponse(error)))
    );
  // Message API endpoints
  sendMessage = (fromAgentId, request) =>
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
      Effect.catchAll((error) => Effect.succeed(this.errorResponse(error)))
    );
  broadcastToTeam = (fromAgentId, teamId, request) =>
    pipe(
      Effect.all([
        Effect.succeed(fromAgentId.trim()),
        Effect.succeed(teamId.trim()),
      ]),
      Effect.flatMap(([aid, tid]) => {
        const errors = [];
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
          : Effect.succeed([aid, tid]);
      }),
      Effect.flatMap(([aid, tid]) =>
        Effect.try({
          try: () => request,
          catch: () =>
            new ApiValidationError([
              { field: "request", message: "Invalid request format" },
            ]),
        }).pipe(Effect.map((validatedRequest) => [aid, tid, validatedRequest]))
      ),
      Effect.flatMap(([aid, tid, validatedRequest]) =>
        this.multiAgentService.broadcastToTeam(aid, tid, validatedRequest)
      ),
      Effect.map((messages) => this.successResponse(messages)),
      Effect.catchAll((error) => Effect.succeed(this.errorResponse(error)))
    );
  getAgentMessages = (agentId, status) =>
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
          statusFilter && ValidMessageStatuses.includes(statusFilter)
            ? statusFilter
            : undefined;
        return this.multiAgentService.getAgentMessages(
          aid,
          messageStatus ? { status: messageStatus } : undefined
        );
      }),
      Effect.map((messages) => this.successResponse(messages)),
      Effect.catchAll((error) => Effect.succeed(this.errorResponse(error)))
    );
  getTeamMessages = (teamId, status) =>
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
          statusFilter && ValidMessageStatuses.includes(statusFilter)
            ? statusFilter
            : undefined;
        return this.multiAgentService.getTeamMessages(
          tid,
          messageStatus ? { status: messageStatus } : undefined
        );
      }),
      Effect.map((messages) => this.successResponse(messages)),
      Effect.catchAll((error) => Effect.succeed(this.errorResponse(error)))
    );
  markMessageAsRead = (messageId, agentId) =>
    pipe(
      Effect.all([
        Effect.succeed(messageId.trim()),
        Effect.succeed(agentId.trim()),
      ]),
      Effect.flatMap(([mid, aid]) => {
        const errors = [];
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
          : Effect.succeed([mid, aid]);
      }),
      Effect.flatMap(([mid, aid]) =>
        this.multiAgentService.markMessageAsRead(mid, aid)
      ),
      Effect.map(() => this.successResponse(undefined)),
      Effect.catchAll((error) => Effect.succeed(this.errorResponse(error)))
    );
  // Tool Rules API endpoints
  createToolRule = (request) =>
    pipe(
      Effect.try({
        try: () => request,
        catch: () =>
          new ApiValidationError([
            { field: "request", message: "Invalid request format" },
          ]),
      }),
      Effect.flatMap((req) => {
        const errors = [];
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
      Effect.catchAll((error) => Effect.succeed(this.errorResponse(error)))
    );
  getToolRules = (teamId, agentId) =>
    pipe(
      Effect.all([
        Effect.succeed(teamId.trim()),
        Effect.succeed(agentId.trim()),
      ]),
      Effect.flatMap(([tid, aid]) => {
        const errors = [];
        if (tid.length === 0) {
          errors.push({ field: "teamId", message: "Team ID is required" });
        }
        if (aid.length === 0) {
          errors.push({ field: "agentId", message: "Agent ID is required" });
        }
        return errors.length > 0
          ? Effect.fail(new ApiValidationError(errors))
          : Effect.succeed([tid, aid]);
      }),
      Effect.flatMap(([tid, aid]) =>
        this.multiAgentService.getToolRules(tid, aid)
      ),
      Effect.map((rules) => this.successResponse(rules)),
      Effect.catchAll((error) => Effect.succeed(this.errorResponse(error)))
    );
  // Health check endpoint
  healthCheck = () =>
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
//# sourceMappingURL=MultiAgentApiService.js.map
