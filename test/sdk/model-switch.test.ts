import { describe, expect, it } from "vitest";
import {
  createModelSwitchManager,
  type FallbackChain,
  type ModelSwitchConfig,
} from "../../src/sdk/model-switch";

describe("Dynamic Model Switching", () => {
  describe("Model Switch Manager", () => {
    it("should create switch manager with primary model", () => {
      const config: ModelSwitchConfig = {
        primary: {
          provider: "openai",
          modelId: "gpt-4",
        },
      };

      const manager = createModelSwitchManager(config);
      expect(manager.getCurrentModel()).toBe("gpt-4");
    });

    it("should handle fallback chain correctly", () => {
      const config: ModelSwitchConfig = {
        primary: {
          provider: "openai",
          modelId: "gpt-4",
        },
        fallbacks: [
          {
            provider: "anthropic",
            modelId: "claude-3.5",
          },
          {
            provider: "google",
            modelId: "gemini-pro",
          },
        ],
      };

      const manager = createModelSwitchManager(config);
      const chain = manager.getFallbackChain();
      expect(chain).toHaveLength(3);
      expect(chain[0].modelId).toBe("claude-3.5");
    });

    it("should switch to next available model in fallback chain", () => {
      const config: ModelSwitchConfig = {
        primary: {
          provider: "openai",
          modelId: "gpt-4",
        },
        fallbacks: [
          {
            provider: "anthropic",
            modelId: "claude-3.5",
          },
        ],
      };

      const manager = createModelSwitchManager(config);
      const chainBefore = manager.getFallbackChain();
      manager.switchToNextFallback();

      expect(manager.getCurrentModel()).toBe(chainBefore[1].modelId);
    });

    it("should throw error when no fallbacks available", () => {
      const config: ModelSwitchConfig = {
        primary: {
          provider: "openai",
          modelId: "gpt-4",
        },
      };

      const manager = createModelSwitchManager(config);
      expect(() => {
        manager.switchToNextFallback();
      }).toThrow("No fallback models available");
    });

    it("should reset to primary model", () => {
      const config: ModelSwitchConfig = {
        primary: {
          provider: "openai",
          modelId: "gpt-4",
        },
        fallbacks: [
          {
            provider: "anthropic",
            modelId: "claude-3.5",
          },
        ],
      };

      const manager = createModelSwitchManager(config);
      const chain = manager.getFallbackChain();
      manager.switchToNextFallback();
      expect(manager.getCurrentModel()).toBe(chain[1].modelId);

      manager.resetToPrimary();
      expect(manager.getCurrentModel()).toBe(chain[0].modelId);
    });

    it("should track fallback history", () => {
      const config: ModelSwitchConfig = {
        primary: {
          provider: "openai",
          modelId: "gpt-4",
        },
        fallbacks: [
          {
            provider: "anthropic",
            modelId: "claude-3.5",
          },
          {
            provider: "google",
            modelId: "gemini-pro",
          },
        ],
      };

      const manager = createModelSwitchManager(config);
      const chain = manager.getFallbackChain();
      const history = manager.getSwitchHistory();

      expect(history).toHaveLength(1);
      expect(history[0]).toBe(chain[0].modelId);

      manager.switchToNextFallback();
      const newHistory = manager.getSwitchHistory();
      expect(newHistory).toHaveLength(2);
    });
  });

  describe("Fallback Chain Handling", () => {
    it("should build fallback chain for cost optimization", () => {
      const fallbackChain: FallbackChain = {
        mode: "cost",
        models: [
          { provider: "google", modelId: "gemini-pro" },
          { provider: "anthropic", modelId: "claude-3.5" },
          { provider: "openai", modelId: "gpt-4" },
        ],
      };

      expect(fallbackChain.models[0].provider).toBe("google");
      expect(fallbackChain.mode).toBe("cost");
    });

    it("should build fallback chain for speed optimization", () => {
      const fallbackChain: FallbackChain = {
        mode: "speed",
        models: [
          { provider: "openai", modelId: "gpt-4" },
          { provider: "anthropic", modelId: "claude-3.5" },
          { provider: "google", modelId: "gemini-pro" },
        ],
      };

      expect(fallbackChain.models[0].provider).toBe("openai");
      expect(fallbackChain.mode).toBe("speed");
    });

    it("should build fallback chain for balanced optimization", () => {
      const fallbackChain: FallbackChain = {
        mode: "balanced",
        models: [
          { provider: "anthropic", modelId: "claude-3.5" },
          { provider: "openai", modelId: "gpt-4" },
          { provider: "google", modelId: "gemini-pro" },
        ],
      };

      expect(fallbackChain.models[0].provider).toBe("anthropic");
      expect(fallbackChain.mode).toBe("balanced");
    });
  });

  describe("Performance Optimization", () => {
    it("should optimize for cost", () => {
      const config: ModelSwitchConfig = {
        primary: {
          provider: "openai",
          modelId: "gpt-4",
        },
        fallbacks: [
          {
            provider: "anthropic",
            modelId: "claude-3.5",
          },
        ],
        performanceMode: "cost",
      };

      const manager = createModelSwitchManager(config);
      expect(manager.getPerformanceMode()).toBe("cost");
    });

    it("should optimize for speed", () => {
      const config: ModelSwitchConfig = {
        primary: {
          provider: "openai",
          modelId: "gpt-4",
        },
        performanceMode: "speed",
      };

      const manager = createModelSwitchManager(config);
      expect(manager.getPerformanceMode()).toBe("speed");
    });

    it("should default to balanced performance", () => {
      const config: ModelSwitchConfig = {
        primary: {
          provider: "openai",
          modelId: "gpt-4",
        },
      };

      const manager = createModelSwitchManager(config);
      expect(manager.getPerformanceMode()).toBe("balanced");
    });

    it("should get active model with performance context", () => {
      const config: ModelSwitchConfig = {
        primary: {
          provider: "openai",
          modelId: "gpt-4",
        },
        performanceMode: "balanced",
      };

      const manager = createModelSwitchManager(config);
      const activeModel = manager.getActiveModelInfo();

      expect(activeModel.modelId).toBe("gpt-4");
      expect(activeModel.provider).toBe("openai");
    });
  });

  describe("Error Handling", () => {
    it("should track model switch errors", () => {
      const config: ModelSwitchConfig = {
        primary: {
          provider: "openai",
          modelId: "gpt-4",
        },
      };

      const manager = createModelSwitchManager(config);
      expect(manager.getErrors()).toHaveLength(0);
    });

    it("should provide clear error messages for exhausted fallbacks", () => {
      const config: ModelSwitchConfig = {
        primary: {
          provider: "openai",
          modelId: "gpt-4",
        },
        fallbacks: [
          {
            provider: "anthropic",
            modelId: "claude-3.5",
          },
        ],
      };

      const manager = createModelSwitchManager(config);
      manager.switchToNextFallback();

      expect(() => {
        manager.switchToNextFallback();
      }).toThrow("No fallback models available");
    });
  });

  describe("Model Info Retrieval", () => {
    it("should return current model information", () => {
      const config: ModelSwitchConfig = {
        primary: {
          provider: "openai",
          modelId: "gpt-4",
        },
      };

      const manager = createModelSwitchManager(config);
      const modelInfo = manager.getActiveModelInfo();

      expect(modelInfo.modelId).toBe("gpt-4");
      expect(modelInfo.provider).toBe("openai");
    });

    it("should return fallback chain information", () => {
      const config: ModelSwitchConfig = {
        primary: {
          provider: "openai",
          modelId: "gpt-4",
        },
        fallbacks: [
          {
            provider: "anthropic",
            modelId: "claude-3.5",
          },
          {
            provider: "google",
            modelId: "gemini-pro",
          },
        ],
      };

      const manager = createModelSwitchManager(config);
      const chain = manager.getFallbackChain();

      expect(chain).toHaveLength(3);
      expect(chain.map((m) => m.modelId)).toContain("gpt-4");
      expect(chain.map((m) => m.modelId)).toContain("claude-3.5");
      expect(chain.map((m) => m.modelId)).toContain("gemini-pro");
    });
  });
});
