import { beforeEach, describe, expect, it } from "vitest";
import type { SDKConfig } from "../../src/config/types";
import { AIAgentSDK } from "../../src/sdk/index";
import {
  createMultiModelAgent,
  type ModelConfig,
  type ModelProvider,
} from "../../src/sdk/models";

describe("Multi-Model Agent Creation", () => {
  let sdk: AIAgentSDK;

  beforeEach(() => {
    const config: SDKConfig = {
      apiKey: "test-key-123456789",
    };
    sdk = new AIAgentSDK(config);
  });

  describe("createMultiModelAgent", () => {
    it("should create agent with single model configuration", () => {
      const modelConfig: ModelConfig = {
        primary: {
          provider: "openai",
          modelId: "gpt-4",
          apiKey: "sk_test123456789",
        },
      };

      const agent = createMultiModelAgent(sdk, {
        config: {
          id: "agent-1",
          name: "SingleModelAgent",
          instructions: "You are helpful",
        },
        modelConfig,
      });

      expect(agent.model).toBe("gpt-4");
      expect(agent.status).toBe("initializing");
    });

    it("should create agent with multiple model fallbacks", () => {
      const modelConfig: ModelConfig = {
        primary: {
          provider: "openai",
          modelId: "gpt-4",
          apiKey: "sk_test123456789",
        },
        fallbacks: [
          {
            provider: "anthropic",
            modelId: "claude-3.5",
            apiKey: "sk_test123456789",
          },
        ],
      };

      const agent = createMultiModelAgent(sdk, {
        config: {
          id: "agent-2",
          name: "MultiModelAgent",
          instructions: "You are helpful",
        },
        modelConfig,
      });

      expect(agent.model).toBe("gpt-4");
      expect(agent.config.model).toBe("gpt-4");
    });

    it("should throw error for invalid provider", () => {
      const modelConfig: ModelConfig = {
        primary: {
          provider: "invalid-provider" as ModelProvider,
          modelId: "gpt-4",
          apiKey: "sk_test123456789",
        },
      };

      expect(() => {
        createMultiModelAgent(sdk, {
          config: {
            name: "InvalidAgent",
            instructions: "You are helpful",
          },
          modelConfig,
        });
      }).toThrow();
    });

    it("should validate model ID matches provider", () => {
      const modelConfig: ModelConfig = {
        primary: {
          provider: "anthropic",
          modelId: "gpt-4",
          apiKey: "sk_test123456789",
        },
      };

      expect(() => {
        createMultiModelAgent(sdk, {
          config: {
            name: "MismatchAgent",
            instructions: "You are helpful",
          },
          modelConfig,
        });
      }).toThrow();
    });

    it("should support performance modes", () => {
      const modelConfig: ModelConfig = {
        primary: {
          provider: "openai",
          modelId: "gpt-4",
          apiKey: "sk_test123456789",
        },
        performanceMode: "balanced",
      };

      const agent = createMultiModelAgent(sdk, {
        config: {
          id: "agent-3",
          name: "BalancedAgent",
          instructions: "You are helpful",
        },
        modelConfig,
      });

      expect(agent.model).toBe("gpt-4");
    });

    it("should require API key for primary model", () => {
      const modelConfig: ModelConfig = {
        primary: {
          provider: "openai",
          modelId: "gpt-4",
          apiKey: "",
        },
      };

      expect(() => {
        createMultiModelAgent(sdk, {
          config: {
            name: "NoKeyAgent",
            instructions: "You are helpful",
          },
          modelConfig,
        });
      }).toThrow();
    });

    it("should store model configuration in agent context", () => {
      const modelConfig: ModelConfig = {
        primary: {
          provider: "openai",
          modelId: "gpt-4",
          apiKey: "sk_test123456789",
        },
      };

      const agent = createMultiModelAgent(sdk, {
        config: {
          id: "agent-4",
          name: "ContextAgent",
          instructions: "You are helpful",
        },
        modelConfig,
      });

      expect(agent.context).toBeDefined();
      expect(agent.context?.modelConfig).toBeDefined();
    });
  });

  describe("ModelProvider validation", () => {
    it("should support all valid providers", () => {
      const validProviders: ModelProvider[] = ["openai", "anthropic", "google"];

      validProviders.forEach((provider, idx) => {
        const modelId =
          provider === "openai"
            ? "gpt-4"
            : provider === "anthropic"
              ? "claude-3.5"
              : "gemini-pro";

        const modelConfig: ModelConfig = {
          primary: {
            provider,
            modelId,
            apiKey: "sk_test123456789",
          },
        };

        const agent = createMultiModelAgent(sdk, {
          config: {
            id: `agent-provider-${idx}`,
            name: `Agent-${provider}`,
            instructions: "You are helpful",
          },
          modelConfig,
        });

        expect(agent.model).toBe(modelId);
      });
    });
  });

  describe("Performance modes", () => {
    it("should handle speed mode", () => {
      const modelConfig: ModelConfig = {
        primary: {
          provider: "openai",
          modelId: "gpt-4",
          apiKey: "sk_test123456789",
        },
        performanceMode: "speed",
      };

      const agent = createMultiModelAgent(sdk, {
        config: {
          id: "agent-speed",
          name: "SpeedAgent",
          instructions: "You are helpful",
        },
        modelConfig,
      });

      expect(agent.model).toBe("gpt-4");
    });

    it("should handle cost mode", () => {
      const modelConfig: ModelConfig = {
        primary: {
          provider: "openai",
          modelId: "gpt-4",
          apiKey: "sk_test123456789",
        },
        performanceMode: "cost",
      };

      const agent = createMultiModelAgent(sdk, {
        config: {
          id: "agent-cost",
          name: "CostAgent",
          instructions: "You are helpful",
        },
        modelConfig,
      });

      expect(agent.model).toBe("gpt-4");
    });

    it("should default to balanced mode", () => {
      const modelConfig: ModelConfig = {
        primary: {
          provider: "openai",
          modelId: "gpt-4",
          apiKey: "sk_test123456789",
        },
      };

      const agent = createMultiModelAgent(sdk, {
        config: {
          id: "agent-default",
          name: "DefaultAgent",
          instructions: "You are helpful",
        },
        modelConfig,
      });

      expect(agent.model).toBe("gpt-4");
    });
  });
});
