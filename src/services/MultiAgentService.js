import { randomUUID } from "node:crypto";
import { Array as A, Context, Effect, Layer, Option, pipe } from "effect";
import {
  MemoryAccessDeniedError,
  MessageDeliveryError,
  MultiAgentError,
  TeamNotFoundError,
  ToolRuleViolationError,
} from "../domain.js";
// Context tags
export const TeamRepository = Context.GenericTag("TeamRepository");
export const TeamMembershipRepository = Context.GenericTag(
  "TeamMembershipRepository"
);
export const SharedMemoryRepository = Context.GenericTag(
  "SharedMemoryRepository"
);
export const MessageRepository = Context.GenericTag("MessageRepository");
export const ToolRuleRepository = Context.GenericTag("ToolRuleRepository");
export const MessageQueue = Context.GenericTag("MessageQueue");
// MultiAgentService Tag
export const MultiAgentService = Context.GenericTag("MultiAgentService");
// Implementation
class MultiAgentServiceImpl {
  teamRepo;
  membershipRepo;
  memoryRepo;
  messageRepo;
  toolRuleRepo;
  messageQueue;
  constructor(
    teamRepo,
    membershipRepo,
    memoryRepo,
    messageRepo,
    toolRuleRepo,
    messageQueue
  ) {
    this.teamRepo = teamRepo;
    this.membershipRepo = membershipRepo;
    this.memoryRepo = memoryRepo;
    this.messageRepo = messageRepo;
    this.toolRuleRepo = toolRuleRepo;
    this.messageQueue = messageQueue;
  }
  // Team Management
  createTeam = (request) =>
    pipe(
      this.teamRepo.create(request),
      Effect.mapError((e) => new MultiAgentError("Failed to create team", e))
    );
  getTeam = (id) =>
    pipe(
      this.teamRepo.findById(id),
      Effect.flatMap(
        Option.match({
          onNone: () => Effect.fail(new TeamNotFoundError(id)),
          onSome: Effect.succeed,
        })
      )
    );
  updateTeam = (id, request) =>
    pipe(
      this.getTeam(id),
      Effect.flatMap(() => this.teamRepo.update(id, request)),
      Effect.mapError((e) => new MultiAgentError("Failed to update team", e))
    );
  deleteTeam = (id) =>
    pipe(
      this.getTeam(id),
      Effect.flatMap(() => this.teamRepo.delete(id)),
      Effect.mapError((e) => new MultiAgentError("Failed to delete team", e))
    );
  listTeams = (filters) =>
    pipe(
      this.teamRepo.list(filters),
      Effect.mapError((e) => new MultiAgentError("Failed to list teams", e))
    );
  // Team Membership Management
  addAgentToTeam = (teamId, agentId, role = "member") =>
    pipe(
      Effect.all([this.getTeam(teamId), this.validateAgentExists(agentId)]),
      Effect.flatMap(() => this.membershipRepo.addAgent(teamId, agentId, role)),
      Effect.mapError(
        (e) => new MultiAgentError("Failed to add agent to team", e)
      )
    );
  removeAgentFromTeam = (teamId, agentId) =>
    pipe(
      Effect.all([this.getTeam(teamId), this.validateAgentExists(agentId)]),
      Effect.flatMap(() => this.membershipRepo.removeAgent(teamId, agentId)),
      Effect.mapError(
        (e) => new MultiAgentError("Failed to remove agent from team", e)
      )
    );
  getTeamAgents = (teamId) =>
    pipe(
      this.getTeam(teamId),
      Effect.flatMap(() => this.membershipRepo.getTeamAgents(teamId)),
      Effect.mapError(
        (e) => new MultiAgentError("Failed to get team agents", e)
      )
    );
  getAgentTeams = (agentId) =>
    pipe(
      this.validateAgentExists(agentId),
      Effect.flatMap(() => this.membershipRepo.getAgentTeams(agentId)),
      Effect.mapError(
        (e) => new MultiAgentError("Failed to get agent teams", e)
      )
    );
  // Shared Memory Management
  createSharedMemory = (request) =>
    pipe(
      Effect.all([
        this.getTeam(request.teamId),
        this.validateAgentPermissions(request.teamId, "admin"),
      ]),
      Effect.flatMap(() => this.memoryRepo.create(request)),
      Effect.tap((block) =>
        this.memoryRepo.logAccess({
          id: randomUUID(),
          memoryBlockId: block.id,
          agentId: "system", // Would be actual user ID
          action: "read", // Changed to read/write/delete enum match
          timestamp: new Date(),
          metadata: { reason: "Initial creation", value: block.value },
        })
      ),
      Effect.mapError(
        (e) => new MultiAgentError("Failed to create shared memory", e)
      )
    );
  getSharedMemory = (id, agentId) =>
    pipe(
      Effect.all([
        this.memoryRepo.findById(id),
        this.memoryRepo.checkAccess(agentId, id, "read"),
      ]),
      Effect.flatMap(([blockOpt, hasAccess]) =>
        Option.match(blockOpt, {
          onNone: () =>
            Effect.fail(
              new MultiAgentError(`Shared memory block ${id} not found`)
            ),
          onSome: (block) =>
            hasAccess
              ? Effect.succeed(block)
              : Effect.fail(new MemoryAccessDeniedError(agentId, id)),
        })
      ),
      Effect.tap((_block) =>
        this.memoryRepo.logAccess({
          id: randomUUID(),
          memoryBlockId: id,
          agentId,
          action: "read",
          timestamp: new Date(),
          metadata: { reason: "Memory retrieval" },
        })
      ),
      Effect.mapError(
        (e) => new MultiAgentError("Failed to get shared memory", e)
      )
    );
  updateSharedMemory = (id, request, agentId) =>
    pipe(
      Effect.all([
        this.memoryRepo.findById(id),
        this.memoryRepo.checkAccess(agentId, id, "write"),
      ]),
      Effect.flatMap(([blockOpt, hasAccess]) =>
        Option.match(blockOpt, {
          onNone: () =>
            Effect.fail(
              new MultiAgentError(`Shared memory block ${id} not found`)
            ),
          onSome: (existingBlock) =>
            hasAccess
              ? pipe(
                  this.validateVersion(
                    existingBlock.version,
                    request.expectedVersion
                  ),
                  Effect.flatMap(() =>
                    this.memoryRepo.update(id, request, agentId)
                  ),
                  Effect.tap(() =>
                    this.memoryRepo.logAccess({
                      id: randomUUID(),
                      memoryBlockId: id,
                      agentId,
                      action: "write",
                      timestamp: new Date(),
                      metadata: {
                        reason: "Memory update",
                        previousValue: existingBlock.value,
                        newValue: request.value || existingBlock.value,
                      },
                    })
                  )
                )
              : Effect.fail(new MemoryAccessDeniedError(agentId, id)),
        })
      ),
      Effect.mapError(
        (e) => new MultiAgentError("Failed to update shared memory", e)
      )
    );
  deleteSharedMemory = (id, agentId) =>
    pipe(
      Effect.all([
        this.memoryRepo.findById(id),
        this.memoryRepo.checkAccess(agentId, id, "write"), // Assuming write permission is enough for delete, or add 'delete'
      ]),
      Effect.flatMap(([blockOpt, hasAccess]) =>
        Option.match(blockOpt, {
          onNone: () =>
            Effect.fail(
              new MultiAgentError(`Shared memory block ${id} not found`)
            ),
          onSome: () =>
            hasAccess
              ? pipe(
                  this.memoryRepo.delete(id),
                  Effect.tap(() =>
                    this.memoryRepo.logAccess({
                      id: randomUUID(),
                      memoryBlockId: id,
                      agentId,
                      action: "delete",
                      timestamp: new Date(),
                      metadata: { reason: "Memory deletion" },
                    })
                  )
                )
              : Effect.fail(new MemoryAccessDeniedError(agentId, id)),
        })
      ),
      Effect.mapError(
        (e) => new MultiAgentError("Failed to delete shared memory", e)
      )
    );
  listSharedMemoryByTeam = (teamId, _agentId) =>
    pipe(
      Effect.all([
        this.getTeam(teamId),
        this.validateAgentPermissions(teamId, "read"),
      ]),
      Effect.flatMap(() => this.memoryRepo.listByTeam(teamId)),
      Effect.mapError(
        (e) => new MultiAgentError("Failed to list shared memory", e)
      )
    );
  // Message Management
  sendMessage = (fromAgentId, request) =>
    pipe(
      Effect.all([
        this.validateAgentExists(fromAgentId),
        this.validateAgentExists(request.toAgentId),
        this.validateAgentsInSameTeam(fromAgentId, request.toAgentId),
      ]),
      Effect.flatMap(() =>
        this.messageRepo.create({
          id: randomUUID(),
          fromAgentId,
          toAgentId: request.toAgentId,
          teamId: "", // Would be determined from team membership
          messageType: request.messageType || "request",
          content: request.content,
          metadata: request.metadata || {},
          status: "pending",
          priority: request.priority || "normal",
          createdAt: new Date(),
        })
      ),
      Effect.tap((message) => this.messageQueue.enqueue(message)),
      Effect.tap((message) =>
        this.messageRepo
          .updateStatus(message.id, "delivered")
          .pipe(Effect.catchAll(() => Effect.void))
      ),
      Effect.mapError(
        (_e) => new MessageDeliveryError("", "Failed to send message")
      )
    );
  broadcastToTeam = (fromAgentId, teamId, request) =>
    pipe(
      Effect.all([
        this.validateAgentExists(fromAgentId),
        this.getTeam(teamId),
        this.validateAgentPermissions(teamId, "read"),
      ]),
      Effect.flatMap(() => this.getTeamAgents(teamId)),
      Effect.flatMap((memberships) =>
        pipe(
          memberships,
          A.filter((membership) => membership.agentId !== fromAgentId),
          (filteredMemberships) =>
            Effect.forEach(filteredMemberships, (membership) =>
              this.messageRepo.create({
                id: randomUUID(),
                fromAgentId,
                toAgentId: membership.agentId,
                teamId,
                messageType: request.messageType || "notification",
                content: request.content,
                metadata: request.metadata || {},
                status: "pending",
                priority: request.priority || "normal",
                createdAt: new Date(),
              })
            ),
          Effect.flatMap((messages) =>
            Effect.reduce(messages, [], (acc, message) =>
              pipe(
                this.messageQueue.enqueue(message),
                Effect.map(() => [...acc, message]),
                Effect.catchAll(() => Effect.succeed(acc))
              )
            )
          )
        )
      ),
      Effect.mapError(
        (e) => new MultiAgentError("Failed to broadcast message", e)
      )
    );
  getAgentMessages = (agentId, filters) =>
    pipe(
      this.validateAgentExists(agentId),
      Effect.flatMap(() => this.messageRepo.getAgentMessages(agentId, filters)),
      Effect.mapError(
        (e) => new MultiAgentError("Failed to get agent messages", e)
      )
    );
  getTeamMessages = (teamId, filters) =>
    pipe(
      this.getTeam(teamId),
      Effect.flatMap(() => this.messageRepo.getTeamMessages(teamId, filters)),
      Effect.mapError(
        (e) => new MultiAgentError("Failed to get team messages", e)
      )
    );
  markMessageAsRead = (messageId, agentId) =>
    pipe(
      Effect.all([
        this.messageRepo.findById(messageId),
        this.validateAgentExists(agentId),
      ]),
      Effect.flatMap(([messageOpt]) =>
        Option.match(messageOpt, {
          onNone: () => Effect.fail(new MultiAgentError("Message not found")),
          onSome: (msg) =>
            msg.toAgentId === agentId
              ? this.messageRepo.markAsRead(messageId)
              : Effect.fail(
                  new MultiAgentError(
                    "Not authorized to mark this message as read"
                  )
                ),
        })
      ),
      Effect.mapError(
        (e) => new MultiAgentError("Failed to mark message as read", e)
      )
    );
  // Tool Rules Management
  createToolRule = (request) =>
    pipe(
      Effect.all([
        this.getTeam(request.teamId),
        this.validateAgentPermissions(request.teamId, "admin"),
      ]),
      Effect.flatMap(() => this.toolRuleRepo.create(request)),
      Effect.mapError(
        (e) => new MultiAgentError("Failed to create tool rule", e)
      )
    );
  getToolRules = (teamId, _agentId) =>
    pipe(
      Effect.all([
        this.getTeam(teamId),
        this.validateAgentPermissions(teamId, "read"),
      ]),
      Effect.flatMap(() => this.toolRuleRepo.listByTeam(teamId)),
      Effect.mapError((e) => new MultiAgentError("Failed to get tool rules", e))
    );
  updateToolRule = (id, updates, _agentId) =>
    pipe(
      Effect.all([
        this.toolRuleRepo.findById(id),
        this.validateAgentPermissions("", "admin"), // Would validate based on rule's team
      ]),
      Effect.flatMap(([ruleOpt]) =>
        Option.match(ruleOpt, {
          onNone: () => Effect.fail(new MultiAgentError("Tool rule not found")),
          onSome: () => this.toolRuleRepo.update(id, updates),
        })
      ),
      Effect.mapError(
        (e) => new MultiAgentError("Failed to update tool rule", e)
      )
    );
  deleteToolRule = (id, _agentId) =>
    pipe(
      Effect.all([
        this.toolRuleRepo.findById(id),
        this.validateAgentPermissions("", "admin"), // Would validate based on rule's team
      ]),
      Effect.flatMap(([ruleOpt]) =>
        Option.match(ruleOpt, {
          onNone: () => Effect.fail(new MultiAgentError("Tool rule not found")),
          onSome: () => this.toolRuleRepo.delete(id),
        })
      ),
      Effect.mapError(
        (e) => new MultiAgentError("Failed to delete tool rule", e)
      )
    );
  // Tool Rule Enforcement
  validateToolExecution = (teamId, toolName, agentId) =>
    pipe(
      Effect.all([
        this.getTeam(teamId),
        this.validateAgentPermissions(teamId, "read"),
      ]),
      Effect.flatMap(() =>
        this.toolRuleRepo.getActiveRulesForTool(teamId, toolName)
      ),
      Effect.flatMap((rules) =>
        pipe(
          rules,
          Effect.forEach((rule) => this.evaluateRule(rule, toolName, agentId)),
          Effect.map((results) => A.every(results, (result) => result))
        )
      ),
      Effect.flatMap((isValid) =>
        isValid
          ? Effect.succeed(true)
          : Effect.fail(new ToolRuleViolationError("", toolName))
      ),
      Effect.mapError((e) => new MultiAgentError("Tool validation failed", e))
    );
  // Helper methods
  validateAgentExists = (_agentId) =>
    // Would implement actual agent validation
    Effect.succeed(undefined);
  validateAgentPermissions = (_teamId, _requiredLevel) =>
    // Would implement actual permission validation
    Effect.succeed(undefined);
  validateAgentsInSameTeam = (_agentId1, _agentId2) =>
    // Would validate both agents are in the same team
    Effect.succeed(undefined);
  validateVersion = (currentVersion, expectedVersion) =>
    expectedVersion !== undefined && currentVersion !== expectedVersion
      ? Effect.fail(new MultiAgentError("Version conflict"))
      : Effect.succeed(undefined);
  evaluateRule = (_rule, _toolName, _agentId) =>
    // Would implement actual rule evaluation logic
    Effect.succeed(true);
}
// Default implementations (would be replaced with actual database implementations)
export const TeamRepositoryLive = Layer.succeed(TeamRepository, {
  create: () => Effect.fail(new MultiAgentError("Not implemented")),
  findById: () => Effect.fail(new MultiAgentError("Not implemented")),
  update: () => Effect.fail(new MultiAgentError("Not implemented")),
  delete: () => Effect.fail(new MultiAgentError("Not implemented")),
  list: () => Effect.fail(new MultiAgentError("Not implemented")),
});
export const TeamMembershipRepositoryLive = Layer.succeed(
  TeamMembershipRepository,
  {
    addAgent: () => Effect.fail(new MultiAgentError("Not implemented")),
    removeAgent: () => Effect.fail(new MultiAgentError("Not implemented")),
    getTeamAgents: () => Effect.fail(new MultiAgentError("Not implemented")),
    getAgentTeams: () => Effect.fail(new MultiAgentError("Not implemented")),
  }
);
export const SharedMemoryRepositoryLive = Layer.succeed(
  SharedMemoryRepository,
  {
    create: () => Effect.fail(new MultiAgentError("Not implemented")),
    findById: () => Effect.fail(new MultiAgentError("Not implemented")),
    update: () => Effect.fail(new MultiAgentError("Not implemented")),
    delete: () => Effect.fail(new MultiAgentError("Not implemented")),
    listByTeam: () => Effect.fail(new MultiAgentError("Not implemented")),
    checkAccess: () => Effect.succeed(true),
    logAccess: () => Effect.void,
  }
);
export const MessageRepositoryLive = Layer.succeed(MessageRepository, {
  create: () => Effect.fail(new MultiAgentError("Not implemented")),
  findById: () => Effect.fail(new MultiAgentError("Not implemented")),
  updateStatus: () => Effect.fail(new MultiAgentError("Not implemented")),
  getAgentMessages: () => Effect.fail(new MultiAgentError("Not implemented")),
  getTeamMessages: () => Effect.fail(new MultiAgentError("Not implemented")),
  markAsRead: () => Effect.fail(new MultiAgentError("Not implemented")),
});
export const ToolRuleRepositoryLive = Layer.succeed(ToolRuleRepository, {
  create: () => Effect.fail(new MultiAgentError("Not implemented")),
  findById: () => Effect.fail(new MultiAgentError("Not implemented")),
  update: () => Effect.fail(new MultiAgentError("Not implemented")),
  delete: () => Effect.fail(new MultiAgentError("Not implemented")),
  listByTeam: () => Effect.fail(new MultiAgentError("Not implemented")),
  getActiveRulesForTool: () =>
    Effect.fail(new MultiAgentError("Not implemented")),
});
export const MessageQueueLive = Layer.succeed(MessageQueue, {
  enqueue: () => Effect.void,
  dequeue: () => Effect.succeed(Option.none()),
  broadcast: () => Effect.succeed([]),
});
// Service layer
export const MultiAgentServiceLive = Layer.effect(
  MultiAgentService,
  Effect.map(
    Effect.all([
      TeamRepository,
      TeamMembershipRepository,
      SharedMemoryRepository,
      MessageRepository,
      ToolRuleRepository,
      MessageQueue,
    ]),
    ([
      teamRepo,
      membershipRepo,
      memoryRepo,
      messageRepo,
      toolRuleRepo,
      messageQueue,
    ]) =>
      new MultiAgentServiceImpl(
        teamRepo,
        membershipRepo,
        memoryRepo,
        messageRepo,
        toolRuleRepo,
        messageQueue
      )
  )
);
// Combined layer
export const MultiAgentLayers = Layer.mergeAll(
  TeamRepositoryLive,
  TeamMembershipRepositoryLive,
  SharedMemoryRepositoryLive,
  MessageRepositoryLive,
  ToolRuleRepositoryLive,
  MessageQueueLive,
  MultiAgentServiceLive
);
//# sourceMappingURL=MultiAgentService.js.map
