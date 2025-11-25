import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import type {
  CreateSharedMemoryRequest,
  CreateTeamRequest,
  CreateToolRuleRequest,
  MemoryAccessLevel,
  MemoryType,
  MessagePriority,
  MessageType,
  SendMessageRequest,
  TeamStatus,
  ToolRuleType,
} from "../src/domain.js";
import {
  MultiAgentApiServiceImpl,
  MultiAgentApiServiceTag,
} from "../src/services/MultiAgentApiService.js";

// Mock MultiAgentService for API testing
const mockMultiAgentService = {
  createTeam: (request: CreateTeamRequest) =>
    Effect.succeed({
      id: "team-123",
      name: request.name,
      description: request.description,
      status: "active" as TeamStatus,
      configuration: request.configuration || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  getTeam: (_id: string) =>
    Effect.succeed({
      id: "team-123",
      name: "Test Team",
      description: "A test team",
      status: "active" as TeamStatus,
      configuration: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  updateTeam: (id: string, request) =>
    Effect.succeed({
      id,
      name: request.name || "Test Team",
      description: request.description || "A test team",
      status: request.status || "active",
      configuration: request.configuration || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  deleteTeam: (_id: string) => Effect.succeed(undefined),
  listTeams: (_filters) => Effect.succeed([]),
  addAgentToTeam: (_teamId: string, _agentId: string, _role) =>
    Effect.succeed(undefined),
  removeAgentFromTeam: (_teamId: string, _agentId: string) =>
    Effect.succeed(undefined),
  getTeamAgents: (_teamId: string) => Effect.succeed([]),
  createSharedMemory: (request: CreateSharedMemoryRequest) =>
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
  getSharedMemory: (_id: string, _agentId: string) =>
    Effect.succeed({
      id: "memory-123",
      teamId: "team-123",
      label: "Test Memory",
      value: "Test content",
      description: "A test memory block",
      type: "project_context" as MemoryType,
      accessLevel: "read_write" as MemoryAccessLevel,
      version: 1,
      lastModifiedBy: "agent-123",
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  updateSharedMemory: (id: string, request, agentId: string) =>
    Effect.succeed({
      id,
      teamId: "team-123",
      label: "Test Memory",
      value: request.value || "Updated content",
      description: "A test memory block",
      type: "project_context" as MemoryType,
      accessLevel: request.accessLevel || "read_write",
      version: 2,
      lastModifiedBy: agentId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  deleteSharedMemory: (_id: string, _agentId: string) =>
    Effect.succeed(undefined),
  listSharedMemoryByTeam: (_teamId: string, _agentId: string) =>
    Effect.succeed([]),
  sendMessage: (fromAgentId: string, request: SendMessageRequest) =>
    Effect.succeed({
      id: "message-123",
      fromAgentId,
      toAgentId: request.toAgentId,
      teamId: "team-123",
      messageType: request.messageType || "request",
      content: request.content,
      metadata: request.metadata || {},
      status: "delivered" as const,
      priority: request.priority || "normal",
      createdAt: new Date(),
      deliveredAt: new Date(),
    }),
  broadcastToTeam: (_fromAgentId: string, _teamId: string, _request: unknown) =>
    Effect.succeed([]),
  getAgentMessages: (_agentId: string, _filters) => Effect.succeed([]),
  getTeamMessages: (_teamId: string, _filters) => Effect.succeed([]),
  markMessageAsRead: (_messageId: string, _agentId: string) =>
    Effect.succeed(undefined),
  createToolRule: (request: CreateToolRuleRequest) =>
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
  getToolRules: (_teamId: string, _agentId: string) => Effect.succeed([]),
  healthCheck: () =>
    Effect.succeed({
      status: "healthy",
      timestamp: new Date(),
    }),
};

// Mock layer
const MockMultiAgentServiceLayer = Layer.succeed(
  MultiAgentApiServiceTag,
  new MultiAgentApiServiceImpl(mockMultiAgentService)
);

describe("MultiAgentApiService", () => {
  it("should create a team via API", async () => {
    const program = Effect.gen(function* (_) {
      const apiService = yield* _(MultiAgentApiServiceTag);
      const request = {
        name: "Test Team",
        description: "A test team for API testing",
      };

      const result = yield* _(apiService.createTeam(request));

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe("Test Team");
      expect(result.data?.description).toBe("A test team for API testing");
      expect(result.data?.status).toBe("active");

      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentServiceLayer))
    );
    expect(result.success).toBe(true);
  });

  it("should handle validation errors for team creation", async () => {
    const program = Effect.gen(function* (_) {
      const apiService = yield* _(MultiAgentApiServiceTag);
      const invalidRequest = {
        name: "", // Empty name should fail validation
        description: "Invalid team",
      };

      const result = yield* _(apiService.createTeam(invalidRequest));

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("ApiValidationError");

      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentServiceLayer))
    );
    expect(result.success).toBe(false);
  });

  it("should get a team via API", async () => {
    const program = Effect.gen(function* (_) {
      const apiService = yield* _(MultiAgentApiServiceTag);
      const result = yield* _(apiService.getTeam("team-123"));

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe("team-123");
      expect(result.data?.name).toBe("Test Team");

      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentServiceLayer))
    );
    expect(result.success).toBe(true);
  });

  it("should update a team via API", async () => {
    const program = Effect.gen(function* (_) {
      const apiService = yield* _(MultiAgentApiServiceTag);
      const updateRequest = {
        name: "Updated Team",
        description: "Updated description",
        status: "paused" as TeamStatus,
      };

      const result = yield* _(apiService.updateTeam("team-123", updateRequest));

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe("Updated Team");
      expect(result.data?.status).toBe("paused");

      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentServiceLayer))
    );
    expect(result.success).toBe(true);
  });

  it("should delete a team via API", async () => {
    const program = Effect.gen(function* (_) {
      const apiService = yield* _(MultiAgentApiServiceTag);
      const result = yield* _(apiService.deleteTeam("team-123"));

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();

      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentServiceLayer))
    );
    expect(result.success).toBe(true);
  });

  it("should list teams via API", async () => {
    const program = Effect.gen(function* (_) {
      const apiService = yield* _(MultiAgentApiServiceTag);
      const result = yield* _(apiService.listTeams());

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);

      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentServiceLayer))
    );
    expect(result.success).toBe(true);
  });

  it("should add agent to team via API", async () => {
    const program = Effect.gen(function* (_) {
      const apiService = yield* _(MultiAgentApiServiceTag);
      const result = yield* _(
        apiService.addAgentToTeam("team-123", "agent-456", "developer")
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();

      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentServiceLayer))
    );
    expect(result.success).toBe(true);
  });

  it("should remove agent from team via API", async () => {
    const program = Effect.gen(function* (_) {
      const apiService = yield* _(MultiAgentApiServiceTag);
      const result = yield* _(
        apiService.removeAgentFromTeam("team-123", "agent-456")
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();

      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentServiceLayer))
    );
    expect(result.success).toBe(true);
  });

  it("should get team agents via API", async () => {
    const program = Effect.gen(function* (_) {
      const apiService = yield* _(MultiAgentApiServiceTag);
      const result = yield* _(apiService.getTeamAgents("team-123"));

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);

      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentServiceLayer))
    );
    expect(result.success).toBe(true);
  });

  it("should create shared memory via API", async () => {
    const program = Effect.gen(function* (_) {
      const apiService = yield* _(MultiAgentApiServiceTag);
      const teamId = "123e4567-e89b-12d3-a456-426614174000"; // Valid UUID
      const request = {
        teamId,
        label: "Test Memory",
        value: "Test content",
        description: "A test memory block",
        type: "project_context" as MemoryType,
        accessLevel: "read_write" as MemoryAccessLevel,
      };

      const result = yield* _(apiService.createSharedMemory(request));

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.teamId).toBe(teamId);
      expect(result.data?.label).toBe("Test Memory");
      expect(result.data?.value).toBe("Test content");
      expect(result.data?.type).toBe("project_context");
      expect(result.data?.accessLevel).toBe("read_write");

      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentServiceLayer))
    );
    expect(result.success).toBe(true);
  });

  it("should get shared memory via API", async () => {
    const program = Effect.gen(function* (_) {
      const apiService = yield* _(MultiAgentApiServiceTag);
      const result = yield* _(
        apiService.getSharedMemory("memory-123", "agent-123")
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe("memory-123");
      expect(result.data?.label).toBe("Test Memory");
      expect(result.data?.value).toBe("Test content");

      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentServiceLayer))
    );
    expect(result.success).toBe(true);
  });

  it("should update shared memory via API", async () => {
    const program = Effect.gen(function* (_) {
      const apiService = yield* _(MultiAgentApiServiceTag);
      const updateRequest = {
        value: "Updated content",
        accessLevel: "admin" as MemoryAccessLevel,
      };

      const result = yield* _(
        apiService.updateSharedMemory("memory-123", updateRequest, "agent-123")
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.value).toBe("Updated content");
      expect(result.data?.accessLevel).toBe("admin");
      expect(result.data?.version).toBe(2);

      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentServiceLayer))
    );
    expect(result.success).toBe(true);
  });

  it("should delete shared memory via API", async () => {
    const program = Effect.gen(function* (_) {
      const apiService = yield* _(MultiAgentApiServiceTag);
      const result = yield* _(
        apiService.deleteSharedMemory("memory-123", "agent-123")
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();

      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentServiceLayer))
    );
    expect(result.success).toBe(true);
  });

  it("should list shared memory by team via API", async () => {
    const program = Effect.gen(function* (_) {
      const apiService = yield* _(MultiAgentApiServiceTag);
      const result = yield* _(
        apiService.listSharedMemoryByTeam("team-123", "agent-123")
      );

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);

      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentServiceLayer))
    );
    expect(result.success).toBe(true);
  });

  it("should send message via API", async () => {
    const program = Effect.gen(function* (_) {
      const apiService = yield* _(MultiAgentApiServiceTag);
      const request = {
        toAgentId: "agent-2",
        content: "Hello from agent-1",
        messageType: "request" as MessageType,
        priority: "high" as MessagePriority,
      };

      const result = yield* _(apiService.sendMessage("agent-1", request));

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.fromAgentId).toBe("agent-1");
      expect(result.data?.toAgentId).toBe("agent-2");
      expect(result.data?.content).toBe("Hello from agent-1");
      expect(result.data?.messageType).toBe("request");
      expect(result.data?.priority).toBe("high");

      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentServiceLayer))
    );
    expect(result.success).toBe(true);
  });

  it("should broadcast message via API", async () => {
    const program = Effect.gen(function* (_) {
      const apiService = yield* _(MultiAgentApiServiceTag);
      const request = {
        content: "Team announcement",
        messageType: "notification" as MessageType,
        priority: "normal" as MessagePriority,
      };

      const result = yield* _(
        apiService.broadcastToTeam("agent-1", "team-123", request)
      );

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);

      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentServiceLayer))
    );
    expect(result.success).toBe(true);
  });

  it("should get agent messages via API", async () => {
    const program = Effect.gen(function* (_) {
      const apiService = yield* _(MultiAgentApiServiceTag);
      const result = yield* _(apiService.getAgentMessages("agent-123"));

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);

      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentServiceLayer))
    );
    expect(result.success).toBe(true);
  });

  it("should get team messages via API", async () => {
    const program = Effect.gen(function* (_) {
      const apiService = yield* _(MultiAgentApiServiceTag);
      const result = yield* _(apiService.getTeamMessages("team-123"));

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);

      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentServiceLayer))
    );
    expect(result.success).toBe(true);
  });

  it("should mark message as read via API", async () => {
    const program = Effect.gen(function* (_) {
      const apiService = yield* _(MultiAgentApiServiceTag);
      const result = yield* _(
        apiService.markMessageAsRead("message-123", "agent-123")
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();

      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentServiceLayer))
    );
    expect(result.success).toBe(true);
  });

  it("should create tool rule via API", async () => {
    const program = Effect.gen(function* (_) {
      const apiService = yield* _(MultiAgentApiServiceTag);
      const request = {
        teamId: "team-123",
        name: "Test Rule",
        type: "TerminalToolRule" as ToolRuleType,
        configuration: { condition: "always" },
        toolNames: ["test_tool"],
      };

      const result = yield* _(apiService.createToolRule(request));

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.teamId).toBe("team-123");
      expect(result.data?.name).toBe("Test Rule");
      expect(result.data?.type).toBe("TerminalToolRule");
      expect(result.data?.toolNames).toEqual(["test_tool"]);
      expect(result.data?.isActive).toBe(true);

      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentServiceLayer))
    );
    expect(result.success).toBe(true);
  });

  it("should get tool rules via API", async () => {
    const program = Effect.gen(function* (_) {
      const apiService = yield* _(MultiAgentApiServiceTag);
      const result = yield* _(apiService.getToolRules("team-123", "agent-123"));

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);

      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentServiceLayer))
    );
    expect(result.success).toBe(true);
  });

  it("should perform health check via API", async () => {
    const program = Effect.gen(function* (_) {
      const apiService = yield* _(MultiAgentApiServiceTag);
      const result = yield* _(apiService.healthCheck());

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.status).toBe("healthy");
      expect(result.data?.timestamp).toBeInstanceOf(Date);

      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentServiceLayer))
    );
    expect(result.success).toBe(true);
  });

  it("should handle validation errors for shared memory creation", async () => {
    const program = Effect.gen(function* (_) {
      const apiService = yield* _(MultiAgentApiServiceTag);
      const invalidRequest = {
        teamId: "", // Empty teamId should fail validation
        label: "Test Memory",
        value: "Test content",
        description: "Invalid memory",
        type: "invalid_type" as MemoryType,
        accessLevel: "invalid_access" as MemoryAccessLevel,
      };

      const result = yield* _(apiService.createSharedMemory(invalidRequest));

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("ApiValidationError");

      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentServiceLayer))
    );
    expect(result.success).toBe(false);
  });

  it("should handle validation errors for message sending", async () => {
    const program = Effect.gen(function* (_) {
      const apiService = yield* _(MultiAgentApiServiceTag);
      const invalidRequest = {
        toAgentId: "", // Empty toAgentId should fail validation
        content: "", // Empty content should fail validation
        messageType: "invalid_type" as MessageType,
        priority: "invalid_priority" as MessagePriority,
      };

      const result = yield* _(
        apiService.sendMessage("agent-1", invalidRequest)
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("ApiValidationError");

      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(MockMultiAgentServiceLayer))
    );
    expect(result.success).toBe(false);
  });
});
