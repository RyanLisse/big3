/**
 * Model Registry - Implementation for AI model management
 * 
 * Provides type-safe model registry with validation, compatibility checking,
 * and model information management for the AI Agent SDK.
 */

import { ModelRegistry, ModelInfo, ModelRegistryData, ModelCompatibility } from '../config/types';

export const DEFAULT_MODEL_REGISTRY: ModelRegistryData = {
  models: {
    'gpt-4': {
      id: 'gpt-4',
      provider: 'openai',
      name: 'GPT-4',
      version: '1.0.0',
      capabilities: ['text-generation', 'code-generation', 'analysis'],
      compatibility: ['openai-v1'],
      contextWindow: 8192,
      maxOutputTokens: 4096,
      inputPrice: 0.03,
      outputPrice: 0.06
    },
    'claude-3.5': {
      id: 'claude-3.5',
      provider: 'anthropic',
      name: 'Claude 3.5',
      version: '3.5.0',
      capabilities: ['text-generation', 'code-generation', 'analysis'],
      compatibility: ['anthropic-v1'],
      contextWindow: 200000,
      maxOutputTokens: 4096,
      inputPrice: 0.015,
      outputPrice: 0.075
    },
    'gemini-pro': {
      id: 'gemini-pro',
      provider: 'google',
      name: 'Gemini Pro',
      version: '1.5.0',
      capabilities: ['text-generation', 'multimodal', 'analysis'],
      compatibility: ['google-v1'],
      contextWindow: 32000,
      maxOutputTokens: 2048,
      inputPrice: 0.00025,
      outputPrice: 0.0005
    },
  },
  default: 'gpt-4',
};

export const MODEL_COMPATIBILITY: Record<string, string[]> = {
  'openai-v1': ['gpt-4', 'gpt-3.5-turbo'],
  'anthropic-v1': ['claude-3.5', 'claude-3-opus'],
  'google-v1': ['gemini-pro', 'gemini-ultra'],
};

export function getModelInfo(registry: ModelRegistryData, model: string): ModelInfo | undefined {
  return registry.models[model];
}

export function isModelSupported(registry: ModelRegistryData, model: string): boolean {
  return model in registry.models;
}

export function validateModelCompatibility(fromModel: string, toModel: string, registry: ModelRegistryData): boolean {
  const fromInfo = registry.models[fromModel];
  const toInfo = registry.models[toModel];

  if (!fromInfo || !toInfo) {
    return false;
  }

  // Check if models share any compatibility tags
  return fromInfo.compatibility.some(tag => toInfo.compatibility.includes(tag));
}

interface ModelRequirements {
  readonly minContextWindow?: number
  readonly minMaxOutputTokens?: number
  readonly requiredCapabilities?: readonly string[]
}

function isValidModelRequirements(req: unknown): req is ModelRequirements {
  if (typeof req !== 'object' || req === null) {
    return false
  }
  const r = req as Record<string, unknown>
  return (
    (r.minContextWindow === undefined || typeof r.minContextWindow === 'number') &&
    (r.minMaxOutputTokens === undefined || typeof r.minMaxOutputTokens === 'number') &&
    (r.requiredCapabilities === undefined || Array.isArray(r.requiredCapabilities))
  )
}

function isCapabilitySupported(cap: unknown, capList: readonly string[]): cap is string {
  return typeof cap === 'string' && capList.includes(cap)
}

const validateContextWindowRequirement = (
  modelContextWindow: number,
  requiredContextWindow: number | undefined
): boolean => {
  if (requiredContextWindow === undefined) {
    return true
  }
  return modelContextWindow >= requiredContextWindow
}

const validateOutputTokenRequirement = (
  modelOutputTokens: number,
  requiredOutputTokens: number | undefined
): boolean => {
  if (requiredOutputTokens === undefined) {
    return true
  }
  return modelOutputTokens >= requiredOutputTokens
}

const validateCapabilityRequirements = (
  modelCapabilities: readonly string[],
  requiredCapabilities: readonly string[] | undefined
): { compatible: boolean; missing: string[] } => {
  if (!requiredCapabilities || requiredCapabilities.length === 0) {
    return { compatible: true, missing: [] }
  }

  const missing: string[] = []
  for (const required of requiredCapabilities) {
    if (!isCapabilitySupported(required, modelCapabilities)) {
      missing.push(required)
    }
  }

  return {
    compatible: missing.length === 0,
    missing
  }
}

/**
 * Model Registry implementation with validation and management
 */
export class ModelRegistryImpl implements ModelRegistry {
  private registry: ModelRegistryData

  constructor(registry?: Partial<ModelRegistryData>) {
    this.registry = {
      models: { ...DEFAULT_MODEL_REGISTRY.models },
      default: DEFAULT_MODEL_REGISTRY.default,
      ...registry
    }
  }

  registerModel(model: ModelInfo): void {
    const modelWithMetadata = {
      ...model,
      version: '1.0.0',
      capabilities: [],
      compatibility: []
    }
    this.registry.models[model.id] = modelWithMetadata
  }

  getModel(id: string): ModelInfo | undefined {
    return this.registry.models[id]
  }

  listModels(): ModelInfo[] {
    return Object.values(this.registry.models)
  }

  /**
   * Check if model is supported
   */
  isModelSupported(modelId: string): boolean {
    return modelId in this.registry.models
  }

  /**
   * Get all available models
   */
  getAvailableModels(): string[] {
    return Object.keys(this.registry.models)
  }

  /**
   * Get default model
   */
  getDefaultModel(): string {
    return this.registry.default
  }

  /**
   * Validate model compatibility with requirements
   */
  validateModelCompatibility(
    modelId: string,
    requirements: Record<string, unknown>
  ): ModelCompatibility {
    const model = this.registry.models[modelId]

    if (!model) {
      return {
        compatible: false,
        reason: `Model '${modelId}' not found in registry`,
        missingFeatures: []
      }
    }

    if (!isValidModelRequirements(requirements)) {
      return {
        compatible: true,
        reason: undefined,
        missingFeatures: []
      }
    }

    const minContext = typeof requirements.minContextWindow === 'number'
      ? requirements.minContextWindow
      : undefined
    const contextWindowValid = validateContextWindowRequirement(
      model.contextWindow,
      minContext
    )

    if (!contextWindowValid) {
      return {
        compatible: false,
        reason: `Model context window (${model.contextWindow}) is less than required (${requirements.minContextWindow})`,
        missingFeatures: ['context-window']
      }
    }

    const minOutput = typeof requirements.minMaxOutputTokens === 'number'
      ? requirements.minMaxOutputTokens
      : undefined
    const outputTokensValid = validateOutputTokenRequirement(
      model.maxOutputTokens,
      minOutput
    )

    if (!outputTokensValid) {
      return {
        compatible: false,
        reason: `Model max output tokens (${model.maxOutputTokens}) is less than required (${requirements.minMaxOutputTokens})`,
        missingFeatures: ['output-tokens']
      }
    }

    const requiredCaps = Array.isArray(requirements.requiredCapabilities)
      ? requirements.requiredCapabilities as readonly string[]
      : undefined
    const capabilityCheck = validateCapabilityRequirements(
      model.capabilities,
      requiredCaps
    )

    if (!capabilityCheck.compatible) {
      return {
        compatible: false,
        reason: `Model missing required capabilities: ${capabilityCheck.missing.join(', ')}`,
        missingFeatures: capabilityCheck.missing
      }
    }

    return {
      compatible: true,
      reason: undefined,
      missingFeatures: []
    }
  }

  /**
   * Get registry information (internal helper)
   */
  getRegistryData(): ModelRegistryData {
    return this.registry
  }

  /**
   * Get models by provider
   */
  getModelsByProvider(provider: string): ModelInfo[] {
    return Object.values(this.registry.models).filter(m => m.provider === provider)
  }

  /**
   * Get models with specific capability
   */
  getModelsWithCapability(capability: string): ModelInfo[] {
    return Object.values(this.registry.models).filter(m => m.capabilities.includes(capability))
  }

  /**
   * Get model with lowest cost
   */
  getCheapestModel(): ModelInfo | undefined {
    const models = Object.values(this.registry.models)
    if (models.length === 0) {
      return undefined
    }

    return models.reduce((cheapest, current) => {
      const cheapestCost = cheapest.inputPrice + cheapest.outputPrice
      const currentCost = current.inputPrice + current.outputPrice
      return currentCost < cheapestCost ? current : cheapest
    })
  }

  /**
   * Get model with largest context window
   */
  getLargestContextModel(): ModelInfo | undefined {
    const models = Object.values(this.registry.models)
    if (models.length === 0) {
      return undefined
    }

    return models.reduce((largest, current) =>
      current.contextWindow > largest.contextWindow ? current : largest
    )
  }
}
