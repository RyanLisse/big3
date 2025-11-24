/**
 * Dynamic Model Switching Logic
 *
 * Provides model switching capabilities with:
 * - Fallback chain handling
 * - Performance optimization (cost/speed/balanced)
 * - Model switch history tracking
 * - Error handling and recovery
 */

import { ModelError } from "../core/errors";
import type { ModelProvider, PerformanceMode } from "./models";

export type ModelSpecification = {
  readonly provider: ModelProvider;
  readonly modelId: string;
};

export type ModelSwitchConfig = {
  readonly primary: ModelSpecification;
  readonly fallbacks?: readonly ModelSpecification[];
  readonly performanceMode?: PerformanceMode;
};

export type FallbackChain = {
  readonly mode: PerformanceMode;
  readonly models: readonly ModelSpecification[];
};

/**
 * Model Switch Manager - handles dynamic model switching with fallback support
 */
export class ModelSwitchManager {
  private currentIndex = 0;
  private readonly switchHistory: string[] = [];
  private errors: ModelError[] = [];
  private readonly performanceMode: PerformanceMode;
  private readonly fallbackChain: readonly ModelSpecification[];

  constructor(config: ModelSwitchConfig) {
    this.performanceMode = config.performanceMode ?? "balanced";
    this.fallbackChain = this.buildFallbackChain(config, this.performanceMode);
    this.switchHistory.push(this.fallbackChain[0].modelId);
  }

  private buildFallbackChain(
    config: ModelSwitchConfig,
    mode: PerformanceMode
  ): readonly ModelSpecification[] {
    const primary = config.primary;
    const fallbacks = config.fallbacks ?? [];

    // Build chain based on performance mode
    if (mode === "speed") {
      return this.buildSpeedOptimizedChain(primary, fallbacks);
    }
    if (mode === "cost") {
      return this.buildCostOptimizedChain(primary, fallbacks);
    }
    return this.buildBalancedChain(primary, fallbacks);
  }

  private buildSpeedOptimizedChain(
    primary: ModelSpecification,
    fallbacks: readonly ModelSpecification[]
  ): readonly ModelSpecification[] {
    // Speed: OpenAI first (fastest), then others
    const speedOrder = ["openai", "anthropic", "google"];
    const allModels = [primary, ...fallbacks];

    const sorted = allModels.sort((a, b) => {
      const aIndex = speedOrder.indexOf(a.provider);
      const bIndex = speedOrder.indexOf(b.provider);
      return aIndex - bIndex;
    });

    return sorted;
  }

  private buildCostOptimizedChain(
    primary: ModelSpecification,
    fallbacks: readonly ModelSpecification[]
  ): readonly ModelSpecification[] {
    // Cost: Google first (cheapest), then others
    const costOrder = ["google", "anthropic", "openai"];
    const allModels = [primary, ...fallbacks];

    const sorted = allModels.sort((a, b) => {
      const aIndex = costOrder.indexOf(a.provider);
      const bIndex = costOrder.indexOf(b.provider);
      return aIndex - bIndex;
    });

    return sorted;
  }

  private buildBalancedChain(
    primary: ModelSpecification,
    fallbacks: readonly ModelSpecification[]
  ): readonly ModelSpecification[] {
    // Balanced: Anthropic first (best balance), then others
    const balanceOrder = ["anthropic", "openai", "google"];
    const allModels = [primary, ...fallbacks];

    const sorted = allModels.sort((a, b) => {
      const aIndex = balanceOrder.indexOf(a.provider);
      const bIndex = balanceOrder.indexOf(b.provider);
      return aIndex - bIndex;
    });

    return sorted;
  }

  /**
   * Get current model ID
   */
  public getCurrentModel(): string {
    if (this.currentIndex >= this.fallbackChain.length) {
      throw new ModelError("No fallback models available", {
        currentIndex: this.currentIndex,
        chainLength: this.fallbackChain.length,
      });
    }
    return this.fallbackChain[this.currentIndex].modelId;
  }

  /**
   * Switch to next fallback model
   */
  public switchToNextFallback(): void {
    if (this.currentIndex >= this.fallbackChain.length - 1) {
      throw new ModelError("No fallback models available", {
        currentIndex: this.currentIndex,
        chainLength: this.fallbackChain.length,
      });
    }

    this.currentIndex++;
    this.switchHistory.push(this.fallbackChain[this.currentIndex].modelId);
  }

  /**
   * Reset to primary model
   */
  public resetToPrimary(): void {
    this.currentIndex = 0;
  }

  /**
   * Get fallback chain
   */
  public getFallbackChain(): readonly ModelSpecification[] {
    return this.fallbackChain;
  }

  /**
   * Get switch history
   */
  public getSwitchHistory(): readonly string[] {
    return this.switchHistory;
  }

  /**
   * Get performance mode
   */
  public getPerformanceMode(): PerformanceMode {
    return this.performanceMode;
  }

  /**
   * Get active model information
   */
  public getActiveModelInfo(): ModelSpecification {
    const model = this.fallbackChain[this.currentIndex];
    if (!model) {
      throw new ModelError("No active model available", {
        currentIndex: this.currentIndex,
      });
    }
    return model;
  }

  /**
   * Get accumulated errors
   */
  public getErrors(): readonly ModelError[] {
    return this.errors;
  }

  /**
   * Add error to tracking
   */
  public recordError(error: ModelError): void {
    this.errors = [...this.errors, error];
  }
}

/**
 * Create a model switch manager from configuration
 */
export function createModelSwitchManager(
  config: ModelSwitchConfig
): ModelSwitchManager {
  return new ModelSwitchManager(config);
}

/**
 * Build a fallback chain for a specific optimization mode
 */
export function buildFallbackChain(
  mode: PerformanceMode,
  models: readonly ModelSpecification[]
): FallbackChain {
  const costOrder = ["google", "anthropic", "openai"];
  const speedOrder = ["openai", "anthropic", "google"];
  const balanceOrder = ["anthropic", "openai", "google"];

  let order: string[];
  if (mode === "speed") {
    order = speedOrder;
  } else if (mode === "cost") {
    order = costOrder;
  } else {
    order = balanceOrder;
  }

  const sorted = [...models].sort((a, b) => {
    const aIndex = order.indexOf(a.provider);
    const bIndex = order.indexOf(b.provider);
    return aIndex - bIndex;
  });

  return {
    mode,
    models: sorted,
  };
}

/**
 * Analyze model switching metrics
 */
export type ModelSwitchMetrics = {
  readonly totalSwitches: number;
  readonly currentModel: string;
  readonly failureRate: number;
  readonly averageSwitchTime?: number;
};

/**
 * Get metrics about model switching
 */
export function getModelSwitchMetrics(
  manager: ModelSwitchManager
): ModelSwitchMetrics {
  const history = manager.getSwitchHistory();
  const errors = manager.getErrors();

  return {
    totalSwitches: history.length - 1,
    currentModel: manager.getCurrentModel(),
    failureRate: errors.length / Math.max(1, history.length),
  };
}
