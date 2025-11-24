import { beforeEach, describe, expect, it } from "vitest";
import type { AgentConfig } from "../../src/config/types";
import { AgentError } from "../../src/domain";
import { ModelRegistryImpl } from "../../src/models/registry";
import { createAgent } from "../../src/sdk/agents";
import type { Agent, CreateAgentRequest } from "../../src/sdk/index";

describe("Agent Creation API (T012)", () => {
  let registry: ModelRegistryImpl;

  beforeEach(() => {
    registry = new ModelRegistryImpl();
  });

  describe("createAgent() - Basic instantiation", () => {
    it("creates agent with minimal valid config", () => {
      const config: AgentConfig = {
        name: "TestAgent",
        instructions: "Test instructions",
      };

      const agent = createAgent({ config }, registry);

      expect(agent).toBeDefined();
      expect(agent.config.name).toBe("TestAgent");
      expect(agent.config.instructions).toBe("Test instructions");
      expect(agent.status).toBe("initializing");
      expect(agent.id).toBeDefined();
      expect(agent.model).toBeDefined();
    });

    it("uses provided model when specified in request", () => {
      const config: AgentConfig = {
        name: "TestAgent",
        instructions: "Test instructions",
      };

      const agent = createAgent({ config, model: "gpt-4" }, registry);

      expect(agent.model).toBe("gpt-4");
    });

    it("uses model from config when not in request", () => {
      const config: AgentConfig = {
        name: "TestAgent",
        instructions: "Test instructions",
        model: "claude-3.5",
      };

      const agent = createAgent({ config }, registry);

      expect(agent.model).toBe("claude-3.5");
    });

    it("uses default model when not specified anywhere", () => {
      const config: AgentConfig = {
        name: "TestAgent",
        instructions: "Test instructions",
      };

      const agent = createAgent({ config }, registry);
      const defaultModel = registry.getDefaultModel();

      expect(agent.model).toBe(defaultModel);
    });

    it("generates unique agent ID", () => {
      const config: AgentConfig = {
        name: "TestAgent",
        instructions: "Test instructions",
      };

      const agent1 = createAgent({ config }, registry);
      const agent2 = createAgent({ config }, registry);

      expect(agent1.id).not.toBe(agent2.id);
    });

    it("preserves optional config fields", () => {
      const config: AgentConfig = {
        name: "TestAgent",
        description: "A test agent",
        instructions: "Test instructions",
        tools: ["tool1", "tool2"],
      };

      const agent = createAgent({ config }, registry);

      expect(agent.config.description).toBe("A test agent");
      expect(agent.config.tools).toEqual(["tool1", "tool2"]);
    });

    it("preserves communication config", () => {
      const config: AgentConfig = {
        name: "TestAgent",
        instructions: "Test instructions",
        communication: {
          websocket: {
            url: "ws://localhost:8000",
          },
        },
      };

      const agent = createAgent({ config }, registry);

      expect(agent.config.communication?.websocket?.url).toBe(
        "ws://localhost:8000"
      );
    });

    it("preserves logging config", () => {
      const config: AgentConfig = {
        name: "TestAgent",
        instructions: "Test instructions",
        logging: {
          level: "debug",
        },
      };

      const agent = createAgent({ config }, registry);

      expect(agent.config.logging?.level).toBe("debug");
    });
  });

  describe("createAgent() - Single model support", () => {
    it("validates model is supported in registry", () => {
      const config: AgentConfig = {
        name: "TestAgent",
        instructions: "Test instructions",
      };

      expect(() => {
        createAgent({ config, model: "invalid-model" }, registry);
      }).toThrow(AgentError);
    });

    it("throws AgentError for unsupported model", () => {
      const config: AgentConfig = {
        name: "TestAgent",
        instructions: "Test instructions",
      };

      try {
        createAgent({ config, model: "unsupported-model" }, registry);
        expect.fail("Should have thrown AgentError");
      } catch (error) {
        expect(error).toBeInstanceOf(AgentError);
        if (error instanceof AgentError) {
          expect(error.code).toBe("MODEL_NOT_FOUND");
        }
      }
    });

    it("supports all models in default registry", () => {
      const config: AgentConfig = {
        name: "TestAgent",
        instructions: "Test instructions",
      };

      const availableModels = registry.getAvailableModels();

      for (const model of availableModels) {
        const agent = createAgent({ config, model }, registry);
        expect(agent.model).toBe(model);
      }
    });
  });

  describe("createAgent() - Configuration validation", () => {
    it("requires agent name", () => {
      const config: AgentConfig = {
        name: "",
        instructions: "Test instructions",
      };

      expect(() => {
        createAgent({ config }, registry);
      }).toThrow(AgentError);
    });

    it("requires agent instructions", () => {
      const config: AgentConfig = {
        name: "TestAgent",
        instructions: "",
      };

      expect(() => {
        createAgent({ config }, registry);
      }).toThrow(AgentError);
    });

    it("creates agent with all optional fields", () => {
      const config: AgentConfig = {
        id: "custom-id",
        name: "TestAgent",
        description: "Test description",
        instructions: "Test instructions",
        tools: ["tool1"],
        model: "gpt-4",
        communication: {
          websocket: {
            url: "ws://localhost:8000",
            batching: {
              enabled: true,
              maxSize: 50,
              flushInterval: 100,
            },
          },
        },
        logging: {
          level: "info",
        },
      };

      const agent = createAgent({ config }, registry);

      expect(agent.config.id).toBe("custom-id");
      expect(agent.config.description).toBe("Test description");
      expect(agent.config.tools).toEqual(["tool1"]);
      expect(agent.config.communication?.websocket?.batching?.maxSize).toBe(50);
      expect(agent.config.logging?.level).toBe("info");
    });
  });

  describe("createAgent() - Agent properties", () => {
    it("sets correct initial status", () => {
      const config: AgentConfig = {
        name: "TestAgent",
        instructions: "Test instructions",
      };

      const agent = createAgent({ config }, registry);

      expect(agent.status).toBe("initializing");
    });

    it("does not set error on successful creation", () => {
      const config: AgentConfig = {
        name: "TestAgent",
        instructions: "Test instructions",
      };

      const agent = createAgent({ config }, registry);

      expect(agent.error).toBeUndefined();
    });

    it("initializes with empty context", () => {
      const config: AgentConfig = {
        name: "TestAgent",
        instructions: "Test instructions",
      };

      const agent = createAgent({ config }, registry);

      expect(agent.context).toBeUndefined();
    });

    it("copies config without mutation", () => {
      const originalConfig: AgentConfig = {
        name: "TestAgent",
        instructions: "Test instructions",
        tools: ["tool1"],
      };

      const agent = createAgent({ config: originalConfig }, registry);

      originalConfig.tools?.push("tool2");

      expect(agent.config.tools).toEqual(["tool1"]);
    });
  });

  describe("createAgent() - Edge cases", () => {
    it("handles whitespace-only name as invalid", () => {
      const config: AgentConfig = {
        name: "   ",
        instructions: "Test instructions",
      };

      expect(() => {
        createAgent({ config }, registry);
      }).toThrow(AgentError);
    });

    it("handles whitespace-only instructions as invalid", () => {
      const config: AgentConfig = {
        name: "TestAgent",
        instructions: "   ",
      };

      expect(() => {
        createAgent({ config }, registry);
      }).toThrow(AgentError);
    });

    it("creates agent with empty tools array", () => {
      const config: AgentConfig = {
        name: "TestAgent",
        instructions: "Test instructions",
        tools: [],
      };

      const agent = createAgent({ config }, registry);

      expect(agent.config.tools).toEqual([]);
    });

    it("creates agent with long description", () => {
      const longDesc = "a".repeat(1000);
      const config: AgentConfig = {
        name: "TestAgent",
        description: longDesc,
        instructions: "Test instructions",
      };

      const agent = createAgent({ config }, registry);

      expect(agent.config.description).toBe(longDesc);
    });

    it("creates agent with long instructions", () => {
      const longInstructions = "a".repeat(5000);
      const config: AgentConfig = {
        name: "TestAgent",
        instructions: longInstructions,
      };

      const agent = createAgent({ config }, registry);

      expect(agent.config.instructions).toBe(longInstructions);
    });
  });

  describe("createAgent() - Type safety", () => {
    it("returns typed Agent with all required properties", () => {
      const config: AgentConfig = {
        name: "TestAgent",
        instructions: "Test instructions",
      };

      const agent: Agent = createAgent({ config }, registry);

      expect(agent.id).toBeDefined();
      expect(agent.model).toBeDefined();
      expect(agent.status).toBeDefined();
      expect(agent.config).toBeDefined();
    });

    it("request parameter has correct shape", () => {
      const request: CreateAgentRequest = {
        config: {
          name: "TestAgent",
          instructions: "Test instructions",
        },
        model: "gpt-4",
      };

      const agent = createAgent(request, registry);

      expect(agent.model).toBe("gpt-4");
    });
  });
});

import { Effect } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addAgent,
  createTeam,
  sendMessage,
  sharedMemory,
} from "../../src/sdk/agents";
import type {
  AddAgentRequest,
  AgentMessage,
  CreateTeamRequest,
  MultiAgentTeam,
  SendMessageRequest,
  SharedMemoryBlock,
  SharedMemoryRequest,
} from "../../src/sdk/types/multi-agent";

describe("Multi-agent API client", () => {
  const baseUrl = "http://test";
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createTeam", () => {
    it("creates team successfully", async () => {
      const request: CreateTeamRequest = {
        name: "DevTeam",
        description: "Test team",
      };
      const expectedTeam: MultiAgentTeam = {
        id: "team-1",
        name: "DevTeam",
        description: "Test team",
        status: "active",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
        configuration: {},
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ team: expectedTeam }),
      } as Response);

      const team = await Effect.runPromise(createTeam(baseUrl, request));

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/multi-agent/teams`,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        })
      );
      expect(team).toEqual(expectedTeam);
    });

    it("throws on error response", async () => {
      const request: CreateTeamRequest = {
        name: "DevTeam",
        description: "Test team",
      };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: "Invalid name" }),
      } as Response);

      await expect(() =>
        Effect.runPromise(createTeam(baseUrl, request))
      ).rejects.toThrow("Invalid name");
    });
  });

  describe("addAgent", () => {
    it("adds agent to team successfully", async () => {
      const teamId = "team-1";
      const request: AddAgentRequest = { agentId: "agent-1", role: "coder" };
      mockFetch.mockResolvedValueOnce({ ok: true } as Response);

      await Effect.runPromise(addAgent(baseUrl, teamId, request));

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/multi-agent/teams/${teamId}/agents`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(request),
        })
      );
    });
  });

  describe("sharedMemory", () => {
    it("creates shared memory successfully", async () => {
      const teamId = "team-1";
      const request: SharedMemoryRequest = {
        label: "project",
        value: "spec",
        description: "test",
        type: "project_context",
        accessLevel: "read_write",
      };
      const expected: SharedMemoryBlock = {
        id: "mem-1",
        teamId,
        label: "project",
        value: "spec",
        description: "test",
        type: "project_context",
        accessLevel: "read_write",
        version: 1,
        lastModifiedBy: "system",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ memoryBlock: expected }),
      } as Response);

      const mem = await Effect.runPromise(
        sharedMemory(baseUrl, teamId, request)
      );

      expect(mem).toEqual(expected);
    });
  });

  describe("sendMessage", () => {
    it("sends message successfully", async () => {
      const toAgentId = "agent-2";
      const request: SendMessageRequest = {
        fromAgentId: "agent-1",
        teamId: "team-1",
        content: "Hello",
      };
      const expected: AgentMessage = {
        id: "msg-1",
        fromAgentId: "agent-1",
        toAgentId,
        teamId: "team-1",
        messageType: "request",
        content: "Hello",
        metadata: {},
        status: "pending",
        priority: "normal",
        createdAt: "2025-01-01T00:00:00Z",
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: expected }),
      } as Response);

      const msg = await Effect.runPromise(
        sendMessage(baseUrl, toAgentId, request)
      );

      expect(msg).toEqual(expected);
    });
  });
});
