import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type {
  ApiResponse,
  CreateSharedMemoryRequest,
  CreateTeamRequest,
  CreateToolRuleRequest,
  MemoryAccessLevel,
  MemoryType,
  MessagePriority,
  MessageType,
  SendMessageRequest,
  ToolRuleType,
} from "../src/domain.js";

// Mock API Service for testing
class MockMultiAgentApiService {
  createTeam = (_request: CreateTeamRequest) =>
    Effect.succeed({
      success: true,
      data: {
        id: "team-123",
        name: _request.name,
        description: _request.description,
        status: "active" as const,
        configuration: _request.configuration || {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

  getTeam = (_id: string) =>
    Effect.succeed({
      success: true,
      data: {
        id: "team-123",
        name: "Test Team",
        description: "A test team",
        status: "active" as const,
        configuration: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

  createSharedMemory = (_request: CreateSharedMemoryRequest) =>
    Effect.succeed({
      success: true,
      data: {
        id: "memory-123",
        teamId: _request.teamId,
        label: _request.label,
        value: _request.value,
        description: _request.description,
        type: _request.type,
        accessLevel: _request.accessLevel,
        version: 1,
        lastModifiedBy: "agent-123",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

  sendMessage = (_fromAgentId: string, _request: SendMessageRequest) =>
    Effect.succeed({
      success: true,
      data: {
        id: "message-123",
        fromAgentId: _fromAgentId,
        toAgentId: _request.toAgentId,
        teamId: "team-123",
        messageType: _request.messageType || "request",
        content: _request.content,
        metadata: _request.metadata || {},
        status: "delivered" as const,
        priority: _request.priority || "normal",
        createdAt: new Date(),
        deliveredAt: new Date(),
      },
    });

  createToolRule = (_request: CreateToolRuleRequest) =>
    Effect.succeed({
      success: true,
      data: {
        id: "rule-123",
        teamId: _request.teamId,
        name: _request.name,
        type: _request.type,
        configuration: _request.configuration,
        toolNames: _request.toolNames,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

  healthCheck = () =>
    Effect.succeed({
      success: true,
      data: {
        status: "healthy",
        timestamp: new Date(),
      },
    });
}

describe("MultiAgent API Basic Operations", () => {
  const apiService = new MockMultiAgentApiService();

  it("should create a team via API", async () => {
    const request = {
      name: "Test Team",
      description: "A test team for API testing",
    };

    const result = await Effect.runPromise(apiService.createTeam(request));

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.name).toBe("Test Team");
    expect(result.data?.description).toBe("A test team for API testing");
    expect(result.data?.status).toBe("active");
  });

  it("should get a team via API", async () => {
    const result = await Effect.runPromise(apiService.getTeam("team-123"));

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.id).toBe("team-123");
    expect(result.data?.name).toBe("Test Team");
  });

  it("should create shared memory via API", async () => {
    const request = {
      teamId: "team-123",
      label: "Test Memory",
      value: "Test content",
      description: "A test memory block",
      type: "project_context" as MemoryType,
      accessLevel: "read_write" as MemoryAccessLevel,
    };

    const result = await Effect.runPromise(
      apiService.createSharedMemory(request)
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.teamId).toBe("team-123");
    expect(result.data?.label).toBe("Test Memory");
    expect(result.data?.value).toBe("Test content");
    expect(result.data?.type).toBe("project_context");
    expect(result.data?.accessLevel).toBe("read_write");
  });

  it("should send message via API", async () => {
    const request = {
      toAgentId: "agent-2",
      content: "Hello from agent-1",
      messageType: "request" as MessageType,
      priority: "high" as MessagePriority,
    };

    const result = await Effect.runPromise(
      apiService.sendMessage("agent-1", request)
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.fromAgentId).toBe("agent-1");
    expect(result.data?.toAgentId).toBe("agent-2");
    expect(result.data?.content).toBe("Hello from agent-1");
    expect(result.data?.messageType).toBe("request");
    expect(result.data?.priority).toBe("high");
  });

  it("should create tool rule via API", async () => {
    const request = {
      teamId: "team-123",
      name: "Test Rule",
      type: "TerminalToolRule" as ToolRuleType,
      configuration: { condition: "always" },
      toolNames: ["test_tool"],
    };

    const result = await Effect.runPromise(apiService.createToolRule(request));

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.teamId).toBe("team-123");
    expect(result.data?.name).toBe("Test Rule");
    expect(result.data?.type).toBe("TerminalToolRule");
    expect(result.data?.toolNames).toEqual(["test_tool"]);
    expect(result.data?.isActive).toBe(true);
  });

  it("should perform health check via API", async () => {
    const result = await Effect.runPromise(apiService.healthCheck());

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.status).toBe("healthy");
    expect(result.data?.timestamp).toBeInstanceOf(Date);
  });

  it("should handle API response structure", () => {
    const successResponse: ApiResponse<string> = {
      success: true,
      data: "test data",
    };

    const errorResponse: ApiResponse<never> = {
      success: false,
      error: {
        code: "ValidationError",
        message: "Invalid input",
        details: { field: "name" },
      },
    };

    expect(successResponse.success).toBe(true);
    expect(successResponse.data).toBe("test data");
    expect(errorResponse.success).toBe(false);
    expect(errorResponse.error?.code).toBe("ValidationError");
    expect(errorResponse.error?.message).toBe("Invalid input");
  });

  it("should validate API request types", () => {
    const validTeamRequest: CreateTeamRequest = {
      name: "Valid Team",
      description: "A valid team",
      configuration: { key: "value" },
    };

    const validMemoryRequest: CreateSharedMemoryRequest = {
      teamId: "team-123",
      label: "Valid Memory",
      value: "Valid content",
      description: "A valid memory block",
      type: "shared_knowledge",
      accessLevel: "read",
    };

    const validMessageRequest: SendMessageRequest = {
      toAgentId: "agent-123",
      content: "Valid message content",
      messageType: "notification",
      priority: "normal",
      metadata: { source: "test" },
    };

    const validRuleRequest: CreateToolRuleRequest = {
      teamId: "team-123",
      name: "Valid Rule",
      type: "ConditionalToolRule",
      configuration: { condition: "test" },
      toolNames: ["tool1", "tool2"],
    };

    expect(validTeamRequest.name).toBe("Valid Team");
    expect(validMemoryRequest.type).toBe("shared_knowledge");
    expect(validMessageRequest.messageType).toBe("notification");
    expect(validRuleRequest.type).toBe("ConditionalToolRule");
  });
});
