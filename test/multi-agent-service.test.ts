import { Effect, Layer, Option } from "effect";
import { describe, expect, it } from "vitest";
import type {
  CreateSharedMemoryRequest,
  CreateTeamRequest,
  MemoryAccessLevel,
  MessageStatus,
  MessageType,
  SendMessageRequest,
  TeamStatus,
} from "../src/domain.js";
import { TeamNotFoundError } from "../src/domain.js";
import {
  MessageQueue,
  MessageRepository,
  MultiAgentService,
  SharedMemoryRepository,
  TeamMembershipRepository,
  TeamRepository,
  ToolRuleRepository,
} from "../src/services/MultiAgentService.js";

// Mock implementations for testing
const mockTeamRepository = {
  create: (request: CreateTeamRequest) =>
    Effect.succeed({
      id: "team-123",
      name: request.name,
      description: request.description,
      status: "active" as TeamStatus,
      configuration: request.configuration || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  findById: (id: string) =>
    Effect.succeed(
      id === "team-123"
        ? Option.some({
            id: "team-123",
            name: "Test Team",
            description: "A test team",
            status: "active" as TeamStatus,
            configuration: {},
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        : Option.none()
    ),
  update: (_id: string, _request) => Effect.succeed(undefined),
  delete: (_id: string) => Effect.succeed(undefined),
  list: (_filters) => Effect.succeed([]),
};

const mockMembershipRepository = {
  addAgent: (_teamId: string, _agentId: string, _role?: string) =>
    Effect.succeed(undefined),
  removeAgent: (_teamId: string, _agentId: string) => Effect.succeed(undefined),
  getTeamAgents: (_teamId: string) => Effect.succeed([]),
  getAgentTeams: (_agentId: string) => Effect.succeed([]),
};

const mockMemoryRepository = {
  create: (request: CreateSharedMemoryRequest) =>
    Effect.succeed({
      id: "memory-123",
      teamId: request.teamId,
      label: request.label,
      value: request.value,
      description: request.description,
      type: request.type,
      accessLevel: request.accessLevel,
      version: 1,
      lastModifiedBy: "agent-123",
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  findById: (id: string) =>
    Effect.succeed(
      id === "memory-123"
        ? Option.some({
            id: "memory-123",
            teamId: "team-123",
            label: "Test Memory",
            value: "Test content",
            description: "A test memory block",
            type: "project_context" as const,
            accessLevel: "read_write" as MemoryAccessLevel,
            version: 1,
            lastModifiedBy: "agent-123",
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        : Option.none()
    ),
  update: (id: string, request, agentId) =>
    Effect.succeed({
      id,
      teamId: "team-123",
      label: "Test Memory",
      value: request.value || "Updated content",
      description: "A test memory block",
      type: "project_context" as const,
      accessLevel: "read_write" as MemoryAccessLevel,
      version: 2,
      lastModifiedBy: agentId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  delete: (_id: string) => Effect.succeed(undefined),
  listByTeam: (_teamId: string) => Effect.succeed([]),
  checkAccess: (_agentId: string, _blockId: string, _action) =>
    Effect.succeed(true),
  logAccess: (_log) => Effect.succeed(undefined),
};

const mockMessageRepository = {
  create: (message) =>
    Effect.succeed({
      ...message,
      id: "message-123",
      createdAt: new Date(),
    }),
  findById: (id: string) =>
    Effect.succeed(
      id === "message-123"
        ? Option.some({
            id: "message-123",
            fromAgentId: "agent-1",
            toAgentId: "agent-2",
            teamId: "team-123",
            messageType: "request" as MessageType,
            content: "Test message",
            metadata: {},
            status: "delivered" as MessageStatus,
            priority: "normal" as const,
            createdAt: new Date(),
            deliveredAt: new Date(),
          })
        : Option.none()
    ),
  updateStatus: (_id: string, _status) => Effect.succeed(undefined),
  getAgentMessages: (_agentId: string, _filters) => Effect.succeed([]),
  getTeamMessages: (_teamId: string, _filters) => Effect.succeed([]),
  markAsRead: (_id: string) => Effect.succeed(undefined),
};

const mockToolRuleRepository = {
  create: (request) =>
    Effect.succeed({
      id: "rule-123",
      teamId: request.teamId,
      name: request.name,
      type: request.type,
      configuration: request.configuration,
      toolNames: request.toolNames,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  findById: (_id: string) => Effect.succeed(Option.none()),
  update: (id: string, updates) =>
    Effect.succeed({
      id,
      teamId: "team-123",
      name: "Test Rule",
      type: "TerminalToolRule" as const,
      configuration: {},
      toolNames: ["test_tool"],
      isActive: updates.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  delete: (_id: string) => Effect.succeed(undefined),
  listByTeam: (_teamId: string) => Effect.succeed([]),
  getActiveRulesForTool: (_teamId: string, _toolName: string) =>
    Effect.succeed([]),
};

const mockMessageQueue = {
  enqueue: (_message) => Effect.succeed(undefined),
  dequeue: (_agentId: string) => Effect.succeed(Option.none()),
  broadcast: (_teamId: string, _message) => Effect.succeed([]),
};

// Mock layers
const MockTeamRepositoryLayer = Layer.succeed(
  TeamRepository,
  mockTeamRepository
);

const MockMembershipRepositoryLayer = Layer.succeed(
  TeamMembershipRepository,
  mockMembershipRepository
);

const MockMemoryRepositoryLayer = Layer.succeed(
  SharedMemoryRepository,
  mockMemoryRepository
);

const MockMessageRepositoryLayer = Layer.succeed(
  MessageRepository,
  mockMessageRepository
);

const MockToolRuleRepositoryLayer = Layer.succeed(
  ToolRuleRepository,
  mockToolRuleRepository
);

const MockMessageQueueLayer = Layer.succeed(MessageQueue, mockMessageQueue);

const MockMultiAgentServiceLayer = Layer.effect(
  MultiAgentService,
  Effect.gen(function* (_) {
    const teamRepo = yield* _(TeamRepository);
    const membershipRepo = yield* _(TeamMembershipRepository);
    const memoryRepo = yield* _(SharedMemoryRepository);
    const messageRepo = yield* _(MessageRepository);
    const toolRuleRepo = yield* _(ToolRuleRepository);
    const _messageQueue = yield* _(MessageQueue);

    return {
      createTeam: teamRepo.create,
      getTeam: (id: string) =>
        Effect.gen(function* (getTeamHelper) {
          const teamOpt = yield* getTeamHelper(teamRepo.findById(id));
          return yield* getTeamHelper(
            Option.match(teamOpt, {
              onNone: () => Effect.fail(new TeamNotFoundError({ teamId: id })),
              onSome: (team) => Effect.succeed(team),
            })
          );
        }),
      createSharedMemory: memoryRepo.create,
      getSharedMemory: (id: string, _agentId: string) =>
        Effect.gen(function* (memHelper) {
          const memOpt = yield* memHelper(memoryRepo.findById(id));
          return yield* memHelper(
            Option.match(memOpt, {
              onNone: () => Effect.fail(new Error("Memory not found")),
              onSome: (mem) => Effect.succeed(mem),
            })
          );
        }),
      updateSharedMemory: memoryRepo.update,
      sendMessage: (fromAgentId: string, request: SendMessageRequest) =>
        messageRepo.create({
          fromAgentId,
          toAgentId: request.toAgentId,
          teamId: request.teamId,
          messageType: request.messageType,
          content: request.content,
          metadata: request.metadata || {},
          status: "pending" as MessageStatus,
          priority: request.priority || "normal",
        }),
      createToolRule: toolRuleRepo.create,
      addAgentToTeam: membershipRepo.addAgent,
      removeAgentFromTeam: membershipRepo.removeAgent,
      validateToolExecution: (
        _teamId: string,
        _toolName: string,
        _agentId: string
      ) => Effect.succeed(true),
      listTeams: () => teamRepo.list(),
      getTeamAgents: membershipRepo.getTeamAgents,
      listSharedMemoryByTeam: memoryRepo.listByTeam,
      getAgentMessages: messageRepo.getAgentMessages,
      getTeamMessages: messageRepo.getTeamMessages,
      getToolRules: (teamId: string, _agentId: string) =>
        toolRuleRepo.listByTeam(teamId),
    };
  })
);

const MockMultiAgentLayers = MockMultiAgentServiceLayer.pipe(
  Layer.provide(MockTeamRepositoryLayer),
  Layer.provide(MockMembershipRepositoryLayer),
  Layer.provide(MockMemoryRepositoryLayer),
  Layer.provide(MockMessageRepositoryLayer),
  Layer.provide(MockToolRuleRepositoryLayer),
  Layer.provide(MockMessageQueueLayer)
);

describe("MultiAgentService", () => {
  it("should create a team successfully", async () => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(MultiAgentService);
      const request: CreateTeamRequest = {
        name: "Test Team",
        description: "A test team for unit testing",
        configuration: { test: true },
      };

      const result = yield* _(service.createTeam(request));

      expect(result.id).toBe("team-123");
      expect(result.name).toBe("Test Team");
      expect(result.description).toBe("A test team for unit testing");
      expect(result.status).toBe("active");
      expect(result.configuration).toEqual({ test: true });

      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentLayers))
    );
    expect(result).toBeDefined();
  });

  it("should retrieve a team by ID", async () => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(MultiAgentService);
      const result = yield* _(service.getTeam("team-123"));

      expect(result.id).toBe("team-123");
      expect(result.name).toBe("Test Team");
      expect(result.status).toBe("active");

      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentLayers))
    );
    expect(result).toBeDefined();
  });

  it("should fail to retrieve a non-existent team", async () => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(MultiAgentService);
      return yield* _(service.getTeam("non-existent"));
    });

    await expect(
      Effect.runPromise(program.pipe(Effect.provide(MockMultiAgentLayers)))
    ).rejects.toThrow();
  });

  it("should create shared memory successfully", async () => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(MultiAgentService);
      const request: CreateSharedMemoryRequest = {
        teamId: "team-123",
        label: "Test Memory",
        value: "Test content",
        description: "A test memory block",
        type: "project_context",
        accessLevel: "read_write",
      };

      const result = yield* _(service.createSharedMemory(request));

      expect(result.id).toBe("memory-123");
      expect(result.teamId).toBe("team-123");
      expect(result.label).toBe("Test Memory");
      expect(result.value).toBe("Test content");
      expect(result.type).toBe("project_context");
      expect(result.accessLevel).toBe("read_write");
      expect(result.version).toBe(1);

      return true;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentLayers))
    );
    expect(result).toBeDefined();
  });

  it("should retrieve shared memory by ID", async () => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(MultiAgentService);
      const result = yield* _(
        service.getSharedMemory("memory-123", "agent-123")
      );

      expect(result.id).toBe("memory-123");
      expect(result.teamId).toBe("team-123");
      expect(result.label).toBe("Test Memory");
      expect(result.value).toBe("Test content");

      return true;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentLayers))
    );
    expect(result).toBeDefined();
  });

  it("should update shared memory successfully", async () => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(MultiAgentService);
      const result = yield* _(
        service.updateSharedMemory(
          "memory-123",
          {
            value: "Updated content",
          },
          "agent-123"
        )
      );

      expect(result.id).toBe("memory-123");
      expect(result.value).toBe("Updated content");
      expect(result.version).toBe(2);
      expect(result.lastModifiedBy).toBe("agent-123");

      return true;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentLayers))
    );
    expect(result).toBeDefined();
  });

  it("should send a message successfully", async () => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(MultiAgentService);
      const request: SendMessageRequest = {
        toAgentId: "agent-2",
        content: "Hello from agent-1",
        messageType: "request",
        priority: "normal",
      };

      const result = yield* _(service.sendMessage("agent-1", request));

      expect(result.id).toBe("message-123");
      expect(result.fromAgentId).toBe("agent-1");
      expect(result.toAgentId).toBe("agent-2");
      expect(result.content).toBe("Hello from agent-1");
      expect(result.messageType).toBe("request");
      expect(result.priority).toBe("normal");
      expect(result.status).toBe("pending");

      return true;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentLayers))
    );
    expect(result).toBeDefined();
  });

  it("should create a tool rule successfully", async () => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(MultiAgentService);
      const request = {
        teamId: "team-123",
        name: "Test Rule",
        type: "TerminalToolRule" as const,
        configuration: { condition: "always" },
        toolNames: ["test_tool"],
      };

      const result = yield* _(service.createToolRule(request));

      expect(result.id).toBe("rule-123");
      expect(result.teamId).toBe("team-123");
      expect(result.name).toBe("Test Rule");
      expect(result.type).toBe("TerminalToolRule");
      expect(result.toolNames).toEqual(["test_tool"]);
      expect(result.isActive).toBe(true);

      return true;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentLayers))
    );
    expect(result).toBeDefined();
  });

  it("should add agent to team successfully", async () => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(MultiAgentService);
      yield* _(service.addAgentToTeam("team-123", "agent-456", "developer"));

      // Since this is a mock, we just verify the call doesn't fail
      expect(true).toBe(true);

      return true;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentLayers))
    );
    expect(result).toBeDefined();
  });

  it("should remove agent from team successfully", async () => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(MultiAgentService);
      yield* _(service.removeAgentFromTeam("team-123", "agent-456"));

      // Since this is a mock, we just verify the call doesn't fail
      expect(true).toBe(true);

      return true;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentLayers))
    );
    expect(result).toBeDefined();
  });

  it("should validate tool execution", async () => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(MultiAgentService);
      const result = yield* _(
        service.validateToolExecution("team-123", "test_tool", "agent-123")
      );

      expect(result).toBe(true);

      return true;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentLayers))
    );
    expect(result).toBe(true);
  });

  it("should list teams successfully", async () => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(MultiAgentService);
      const result = yield* _(service.listTeams());

      expect(Array.isArray(result)).toBe(true);

      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentLayers))
    );
    expect(Array.isArray(result)).toBe(true);
  });

  it("should list team agents successfully", async () => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(MultiAgentService);
      const result = yield* _(service.getTeamAgents("team-123"));

      expect(Array.isArray(result)).toBe(true);

      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentLayers))
    );
    expect(Array.isArray(result)).toBe(true);
  });

  it("should list shared memory by team successfully", async () => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(MultiAgentService);
      const result = yield* _(
        service.listSharedMemoryByTeam("team-123", "agent-123")
      );

      expect(Array.isArray(result)).toBe(true);

      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentLayers))
    );
    expect(Array.isArray(result)).toBe(true);
  });

  it("should list agent messages successfully", async () => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(MultiAgentService);
      const result = yield* _(service.getAgentMessages("agent-123"));

      expect(Array.isArray(result)).toBe(true);

      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentLayers))
    );
    expect(Array.isArray(result)).toBe(true);
  });

  it("should list team messages successfully", async () => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(MultiAgentService);
      const result = yield* _(service.getTeamMessages("team-123"));

      expect(Array.isArray(result)).toBe(true);

      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentLayers))
    );
    expect(Array.isArray(result)).toBe(true);
  });

  it("should get tool rules successfully", async () => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(MultiAgentService);
      const result = yield* _(service.getToolRules("team-123", "agent-123"));

      expect(Array.isArray(result)).toBe(true);

      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentLayers))
    );
    expect(Array.isArray(result)).toBe(true);
  });
});
