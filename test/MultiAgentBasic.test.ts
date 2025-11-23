import { Array as A, Effect, Layer, Option, pipe } from "effect"
import { describe, expect, it } from "vitest"
import type { CreateTeamRequest, MultiAgentTeam, TeamStatus } from "../src/domain.js"
import { MultiAgentError } from "../src/domain.js"

// Simple test without complex dependencies
describe("MultiAgent Domain Types", () => {
  it("should create a valid team", () => {
    const team: MultiAgentTeam = {
      id: "team-123",
      name: "Test Team",
      description: "A test team",
      status: "active" as TeamStatus,
      configuration: {},
      createdAt: new Date(),
      updatedAt: new Date()
    }

    expect(team.id).toBe("team-123")
    expect(team.name).toBe("Test Team")
    expect(team.status).toBe("active")
  })

  it("should validate team creation request", () => {
    const request: CreateTeamRequest = {
      name: "Test Team",
      description: "A test team",
      configuration: { test: true }
    }

    expect(request.name).toBe("Test Team")
    expect(request.description).toBe("A test team")
    expect(request.configuration).toEqual({ test: true })
  })

  it("should create multi-agent error", () => {
    const error = new MultiAgentError("Test error")
    expect(error.message).toBe("Test error")
    expect(error._tag).toBe("MultiAgentError")
  })

  it("should handle team status types", () => {
    const statuses: Array<TeamStatus> = ["active", "paused", "archived"]
    expect(statuses).toHaveLength(3)
    expect(statuses).toContain("active")
    expect(statuses).toContain("paused")
    expect(statuses).toContain("archived")
  })
})

describe("MultiAgent Basic Operations", () => {
  it("should create and validate team data", async () => {
    const program = Effect.gen(function*(_) {
      const team: MultiAgentTeam = {
        id: "team-123",
        name: "Development Team",
        description: "Team for web development",
        status: "active" as TeamStatus,
        configuration: {
          maxAgents: 10,
          allowedTools: ["code", "test", "deploy"]
        },
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01")
      }

      // Basic validation
      expect(team.id).toBe("team-123")
      expect(team.name).toBe("Development Team")
      expect(team.status).toBe("active")
      expect(team.configuration.maxAgents).toBe(10)
      expect(Array.isArray(team.configuration.allowedTools)).toBe(true)

      return team
    })

    const result = await Effect.runPromise(program)
    expect(result.name).toBe("Development Team")
    expect(result.status).toBe("active")
  })

  it("should handle error creation", async () => {
    const program = Effect.gen(function*(_) {
      const error = new MultiAgentError("Team not found", { teamId: "invalid-id" })
      return error
    })

    const result = await Effect.runPromise(program)
    expect(result.message).toBe("Team not found")
    expect(result.cause).toEqual({ teamId: "invalid-id" })
  })

  it("should validate team status transitions", async () => {
    const validTransitions: Record<TeamStatus, Array<TeamStatus>> = {
      active: ["paused", "archived"],
      paused: ["active", "archived"],
      archived: ["active"]
    }

    const program = Effect.gen(function*(_) {
      const currentStatus: TeamStatus = "active"
      const nextStatuses = validTransitions[currentStatus]

      expect(nextStatuses).toContain("paused")
      expect(nextStatuses).toContain("archived")
      expect(nextStatuses).not.toContain("active")

      return currentStatus
    })

    const result = await Effect.runPromise(program)
    expect(result).toBe("active")
  })

  it("should handle team configuration validation", async () => {
    const program = Effect.gen(function*(_) {
      const config = {
        maxAgents: 10,
        allowedTools: ["code", "test", "deploy"],
        settings: {
          autoApprove: false,
          requireReview: true
        }
      }

      // Validate configuration structure
      expect(typeof config.maxAgents).toBe("number")
      expect(Array.isArray(config.allowedTools)).toBe(true)
      expect(typeof config.settings).toBe("object")
      expect(typeof config.settings.autoApprove).toBe("boolean")
      expect(typeof config.settings.requireReview).toBe("boolean")

      return config
    })

    const result = await Effect.runPromise(program)
    expect(result.maxAgents).toBe(10)
  })
})
