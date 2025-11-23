import { Effect, Layer, pipe } from "effect"
import { describe, expect, it } from "vitest"
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
  ToolRuleType
} from "../src/domain.js"
import { MultiAgentApiLayers, MultiAgentApiService } from "../src/services/MultiAgentApiService.js"

// Mock MultiAgentService for API testing
const mockMultiAgentService = {
  createTeam: (request: CreateTeamRequest) =>
    Effect.succeed({
      success: true,
      data: {
        id: "team-123",
        name: request.name,
        description: request.description,
        status: "active" as TeamStatus,
        configuration: request.configuration || {},
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }),
  getTeam: (id: string) =>
    Effect.succeed({
      success: true,
      data: {
        id: "team-123",
        name: "Test Team",
        description: "A test team",
        status: "active" as TeamStatus,
        configuration: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }),
  updateTeam: (id: string, request) =>
    Effect.succeed({
      success: true,
      data: {
        id,
        name: request.name || "Test Team",
        description: request.description || "A test team",
        status: request.status || "active",
        configuration: request.configuration || {},
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }),
  deleteTeam: (id: string) =>
    Effect.succeed({
      success: true,
      data: undefined
    }),
  listTeams: (filters) =>
    Effect.succeed({
      success: true,
      data: []
    }),
  addAgentToTeam: (teamId: string, agentId: string, role) =>
    Effect.succeed({
      success: true,
      data: undefined
    }),
  removeAgentFromTeam: (teamId: string, agentId: string) =>
    Effect.succeed({
      success: true,
      data: undefined
    }),
  getTeamAgents: (teamId: string) =>
    Effect.succeed({
      success: true,
      data: []
    }),
  createSharedMemory: (request: CreateSharedMemoryRequest) =>
    Effect.succeed({
      success: true,
      data: {
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
        updatedAt: new Date()
      }
    }),
  getSharedMemory: (id: string, agentId: string) =>
    Effect.succeed({
      success: true,
      data: {
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
        updatedAt: new Date()
      }
    }),
  updateSharedMemory: (id: string, request, agentId: string) =>
    Effect.succeed({
      success: true,
      data: {
        id,
        teamId: "team-123",
        label: "Test Memory",
        value: request.value || "Updated content",
        description: "A test memory block",
        type: "project_context" as MemoryType,
        accessLevel: "read_write" as MemoryAccessLevel,
        version: 2,
        lastModifiedBy: agentId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }),
  deleteSharedMemory: (id: string, agentId: string) =>
    Effect.succeed({
      success: true,
      data: undefined
    }),
  listSharedMemoryByTeam: (teamId: string, agentId: string) =>
    Effect.succeed({
      success: true,
      data: []
    }),
  sendMessage: (fromAgentId: string, request: SendMessageRequest) =>
    Effect.succeed({
      success: true,
      data: {
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
        deliveredAt: new Date()
      }
    }),
  broadcastToTeam: (fromAgentId: string, teamId: string, request) =>
    Effect.succeed({
      success: true,
      data: []
    }),
  getAgentMessages: (agentId: string, filters) =>
    Effect.succeed({
      success: true,
      data: []
    }),
  getTeamMessages: (teamId: string, filters) =>
    Effect.succeed({
      success: true,
      data: []
    }),
  markMessageAsRead: (messageId: string, agentId: string) =>
    Effect.succeed({
      success: true,
      data: undefined
    }),
  createToolRule: (request: CreateToolRuleRequest) =>
    Effect.succeed({
      success: true,
      data: {
        id: "rule-123",
        teamId: request.teamId,
        name: request.name,
        type: request.type,
        configuration: request.configuration,
        toolNames: request.toolNames,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }),
  getToolRules: (teamId: string, agentId: string) =>
    Effect.succeed({
      success: true,
      data: []
    }),
  healthCheck: () =>
    Effect.succeed({
      success: true,
      data: {
        status: "healthy",
        timestamp: new Date()
      }
    })
}

// Mock layer
const MockMultiAgentServiceLayer = Layer.succeed(
  MultiAgentApiService,
  new MultiAgentApiService(mockMultiAgentService)
)

describe("MultiAgentApiService", () => {
  it("should create a team via API", async () => {
    const program = Effect.gen(function*(_) {
      const apiService = yield* _(MultiAgentApiService)
      const request = {
        name: "Test Team",
        description: "A test team for API testing"
      }

      const result = yield* _(apiService.createTeam(request))

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.name).toBe("Test Team")
      expect(result.data?.description).toBe("A test team for API testing")
      expect(result.data?.status).toBe("active")
    })

    const result = await Effect.runPromise(program.pipe(Effect.provide(MockMultiAgentServiceLayer)))
    expect(result.success).toBe(true)
  })

  it("should handle validation errors for team creation", async () => {
    const program = Effect.gen(function*(_) {
      const apiService = yield* _(MultiAgentApiService)
      const invalidRequest = {
        name: "", // Empty name should fail validation
        description: "Invalid team"
      }

      const result = yield* _(apiService.createTeam(invalidRequest))

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe("ValidationError")
    })

    const result = await Effect.runPromise(program.pipe(Effect.provide(MockMultiAgentServiceLayer)))
    expect(result.success).toBe(false)
  })

  it("should get a team via API", async () => {
    const program = Effect.gen(function*(_) {
      const apiService = yield* _(MultiAgentApiService)
      const result = yield* _(apiService.getTeam("team-123"))

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.id).toBe("team-123")
      expect(result.data?.name).toBe("Test Team")
    })

    const result = await Effect.runPromise(program.pipe(Effect.provide(MockMultiAgentServiceLayer)))
    expect(result.success).toBe(true)
  })

  it("should update a team via API", async () => {
    const program = Effect.gen(function*(_) {
      const apiService = yield* _(MultiAgentApiService)
      const updateRequest = {
        name: "Updated Team",
        description: "Updated description",
        status: "paused" as TeamStatus
      }

      const result = yield* _(apiService.updateTeam("team-123", updateRequest))

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.name).toBe("Updated Team")
      expect(result.data?.status).toBe("paused")
    })

    const result = await Effect.runPromise(program.pipe(Effect.provide(MockMultiAgentServiceLayer)))
    expect(result.success).toBe(true)
  })

  it("should delete a team via API", async () => {
    const program = Effect.gen(function*(_) {
      const apiService = yield* _(MultiAgentApiService)
      const result = yield* _(apiService.deleteTeam("team-123"))

      expect(result.success).toBe(true)
      expect(result.data).toBeUndefined()
    })

    const result = await Effect.runPromise(program.pipe(Effect.provide(MockMultiAgentServiceLayer)))
    expect(result.success).toBe(true)
  })

  it("should list teams via API", async () => {
    const program = Effect.gen(function*(_) {
      const apiService = yield* _(MultiAgentApiService)
      const result = yield* _(apiService.listTeams())

      expect(result.success).toBe(true)
      expect(Array.isArray(result.data)).toBe(true)
    })

    const result = await Effect.runPromise(program.pipe(Effect.provide(MockMultiAgentServiceLayer)))
    expect(result.success).toBe(true)
  })

  it("should add agent to team via API", async () => {
    const program = Effect.gen(function*(_) {
      const apiService = yield* _(MultiAgentApiService)
      const result = yield* _(apiService.addAgentToTeam("team-123", "agent-456", "developer"))

      expect(result.success).toBe(true)
      expect(result.data).toBeUndefined()
    })

    const result = await Effect.runPromise(program.pipe(Effect.provide(MockMultiAgentServiceLayer)))
    expect(result.success).toBe(true)
  })

  it("should remove agent from team via API", async () => {
    const program = Effect.gen(function*(_) {
      const apiService = yield* _(MultiAgentApiService)
      const result = yield* _(apiService.removeAgentFromTeam("team-123", "agent-456"))

      expect(result.success).toBe(true)
      expect(result.data).toBeUndefined()
    })

    const result = await Effect.runPromise(program.pipe(Effect.provide(MockMultiAgentServiceLayer)))
    expect(result.success).toBe(true)
  })

  it("should get team agents via API", async () => {
    const program = Effect.gen(function*(_) {
      const apiService = yield* _(MultiAgentApiService)
      const result = yield* _(apiService.getTeamAgents("team-123"))

      expect(result.success).toBe(true)
      expect(Array.isArray(result.data)).toBe(true)
    })

    const result = await Effect.runPromise(program.pipe(Effect.provide(MockMultiAgentServiceLayer)))
    expect(result.success).toBe(true)
  })

  it("should create shared memory via API", async () => {
    const program = Effect.gen(function*(_) {
      const apiService = yield* _(MultiAgentApiService)
      const request = {
        teamId: "team-123",
        label: "Test Memory",
        value: "Test content",
        description: "A test memory block",
        type: "project_context" as MemoryType,
        accessLevel: "read_write" as MemoryAccessLevel
      }

      const result = yield* _(apiService.createSharedMemory(request))

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.teamId).toBe("team-123")
      expect(result.data?.label).toBe("Test Memory")
      expect(result.data?.value).toBe("Test content")
      expect(result.data?.type).toBe("project_context")
      expect(result.data?.accessLevel).toBe("read_write")
    })

    const result = await Effect.runPromise(program.pipe(Effect.provide(MockMultiAgentServiceLayer)))
    expect(result.success).toBe(true)
  })

  it("should get shared memory via API", async () => {
    const program = Effect.gen(function*(_) {
      const apiService = yield* _(MultiAgentApiService)
      const result = yield* _(apiService.getSharedMemory("memory-123", "agent-123"))

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.id).toBe("memory-123")
      expect(result.data?.label).toBe("Test Memory")
      expect(result.data?.value).toBe("Test content")
    })

    const result = await Effect.runPromise(program.pipe(Effect.provide(MockMultiAgentServiceLayer)))
    expect(result.success).toBe(true)
  })

  it("should update shared memory via API", async () => {
    const program = Effect.gen(function*(_) {
      const apiService = yield* _(MultiAgentApiService)
      const updateRequest = {
        value: "Updated content",
        accessLevel: "admin" as MemoryAccessLevel
      }

      const result = yield* _(apiService.updateSharedMemory("memory-123", updateRequest, "agent-123"))

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.value).toBe("Updated content")
      expect(result.data?.accessLevel).toBe("admin")
      expect(result.data?.version).toBe(2)
    })

    const result = await Effect.runPromise(program.pipe(Effect.provide(MockMultiAgentServiceLayer)))
    expect(result.success).toBe(true)
  })

  it("should delete shared memory via API", async () => {
    const program = Effect.gen(function*(_) {
      const apiService = yield* _(MultiAgentApiService)
      const result = yield* _(apiService.deleteSharedMemory("memory-123", "agent-123"))

      expect(result.success).toBe(true)
      expect(result.data).toBeUndefined()
    })

    const result = await Effect.runPromise(program.pipe(Effect.provide(MockMultiAgentServiceLayer)))
    expect(result.success).toBe(true)
  })

  it("should list shared memory by team via API", async () => {
    const program = Effect.gen(function*(_) {
      const apiService = yield* _(MultiAgentApiService)
      const result = yield* _(apiService.listSharedMemoryByTeam("team-123", "agent-123"))

      expect(result.success).toBe(true)
      expect(Array.isArray(result.data)).toBe(true)
    })

    const result = await Effect.runPromise(program.pipe(Effect.provide(MockMultiAgentServiceLayer)))
    expect(result.success).toBe(true)
  })

  it("should send message via API", async () => {
    const program = Effect.gen(function*(_) {
      const apiService = yield* _(MultiAgentApiService)
      const request = {
        toAgentId: "agent-2",
        content: "Hello from agent-1",
        messageType: "request" as MessageType,
        priority: "high" as MessagePriority
      }

      const result = yield* _(apiService.sendMessage("agent-1", request))

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.fromAgentId).toBe("agent-1")
      expect(result.data?.toAgentId).toBe("agent-2")
      expect(result.data?.content).toBe("Hello from agent-1")
      expect(result.data?.messageType).toBe("request")
      expect(result.data?.priority).toBe("high")
    })

    const result = await Effect.runPromise(program.pipe(Effect.provide(MockMultiAgentServiceLayer)))
    expect(result.success).toBe(true)
  })

  it("should broadcast message via API", async () => {
    const program = Effect.gen(function*(_) {
      const apiService = yield* _(MultiAgentApiService)
      const request = {
        content: "Team announcement",
        messageType: "notification" as MessageType,
        priority: "normal" as MessagePriority
      }

      const result = yield* _(apiService.broadcastToTeam("agent-1", "team-123", request))

      expect(result.success).toBe(true)
      expect(Array.isArray(result.data)).toBe(true)
    })

    const result = await Effect.runPromise(program.pipe(Effect.provide(MockMultiAgentServiceLayer)))
    expect(result.success).toBe(true)
  })

  it("should get agent messages via API", async () => {
    const program = Effect.gen(function*(_) {
      const apiService = yield* _(MultiAgentApiService)
      const result = yield* _(apiService.getAgentMessages("agent-123"))

      expect(result.success).toBe(true)
      expect(Array.isArray(result.data)).toBe(true)
    })

    const result = await Effect.runPromise(program.pipe(Effect.provide(MockMultiAgentServiceLayer)))
    expect(result.success).toBe(true)
  })

  it("should get team messages via API", async () => {
    const program = Effect.gen(function*(_) {
      const apiService = yield* _(MultiAgentApiService)
      const result = yield* _(apiService.getTeamMessages("team-123"))

      expect(result.success).toBe(true)
      expect(Array.isArray(result.data)).toBe(true)
    })

    const result = await Effect.runPromise(program.pipe(Effect.provide(MockMultiAgentServiceLayer)))
    expect(result.success).toBe(true)
  })

  it("should mark message as read via API", async () => {
    const program = Effect.gen(function*(_) {
      const apiService = yield* _(MultiAgentApiService)
      const result = yield* _(apiService.markMessageAsRead("message-123", "agent-123"))

      expect(result.success).toBe(true)
      expect(result.data).toBeUndefined()
    })

    const result = await Effect.runPromise(program.pipe(Effect.provide(MockMultiAgentServiceLayer)))
    expect(result.success).toBe(true)
  })

  it("should create tool rule via API", async () => {
    const program = Effect.gen(function*(_) {
      const apiService = yield* _(MultiAgentApiService)
      const request = {
        teamId: "team-123",
        name: "Test Rule",
        type: "TerminalToolRule" as ToolRuleType,
        configuration: { condition: "always" },
        toolNames: ["test_tool"]
      }

      const result = yield* _(apiService.createToolRule(request))

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.teamId).toBe("team-123")
      expect(result.data?.name).toBe("Test Rule")
      expect(result.data?.type).toBe("TerminalToolRule")
      expect(result.data?.toolNames).toEqual(["test_tool"])
      expect(result.data?.isActive).toBe(true)
    })

    const result = await Effect.runPromise(program.pipe(Effect.provide(MockMultiAgentServiceLayer)))
    expect(result.success).toBe(true)
  })

  it("should get tool rules via API", async () => {
    const program = Effect.gen(function*(_) {
      const apiService = yield* _(MultiAgentApiService)
      const result = yield* _(apiService.getToolRules("team-123", "agent-123"))

      expect(result.success).toBe(true)
      expect(Array.isArray(result.data)).toBe(true)
    })

    const result = await Effect.runPromise(program.pipe(Effect.provide(MockMultiAgentServiceLayer)))
    expect(result.success).toBe(true)
  })

  it("should perform health check via API", async () => {
    const program = Effect.gen(function*(_) {
      const apiService = yield* _(MultiAgentApiService)
      const result = yield* _(apiService.healthCheck())

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.status).toBe("healthy")
      expect(result.data?.timestamp).toBeInstanceOf(Date)
    })

    const result = await Effect.runPromise(program.pipe(Effect.provide(MockMultiAgentServiceLayer)))
    expect(result.success).toBe(true)
  })

  it("should handle validation errors for shared memory creation", async () => {
    const program = Effect.gen(function*(_) {
      const apiService = yield* _(MultiAgentApiService)
      const invalidRequest = {
        teamId: "", // Empty teamId should fail validation
        label: "Test Memory",
        value: "Test content",
        description: "Invalid memory",
        type: "invalid_type" as MemoryType,
        accessLevel: "invalid_access" as MemoryAccessLevel
      }

      const result = yield* _(apiService.createSharedMemory(invalidRequest))

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe("ValidationError")
    })

    const result = await Effect.runPromise(program.pipe(Effect.provide(MockMultiAgentServiceLayer)))
    expect(result.success).toBe(false)
  })

  it("should handle validation errors for message sending", async () => {
    const program = Effect.gen(function*(_) {
      const apiService = yield* _(MultiAgentApiService)
      const invalidRequest = {
        toAgentId: "", // Empty toAgentId should fail validation
        content: "", // Empty content should fail validation
        messageType: "invalid_type" as MessageType,
        priority: "invalid_priority" as MessagePriority
      }

      const result = yield* _(apiService.sendMessage("agent-1", invalidRequest))

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe("ValidationError")
    })

    const result = await Effect.runPromise(program.pipe(Effect.provide(MockMultiAgentServiceLayer)))
    expect(result.success).toBe(false)
  })
})
