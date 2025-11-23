/**
 * Multi-Model Agent Creation API
 *
 * Provides type-safe multi-model agent creation with support for:
 * - Multiple model providers (OpenAI, Anthropic, Google)
 * - Model configuration management
 * - Performance mode optimization (speed, cost, balanced)
 */

import { AIAgentSDK, Agent, CreateAgentRequest } from './index'
import { AgentConfig } from '../config/types'
import { ModelError } from '../core/errors'

export type ModelProvider = 'openai' | 'anthropic' | 'google'
export type PerformanceMode = 'speed' | 'cost' | 'balanced'

export interface ProviderModelConfig {
  readonly provider: ModelProvider
  readonly modelId: string
  readonly apiKey: string
}

export interface ModelConfig {
  readonly primary: ProviderModelConfig
  readonly fallbacks?: readonly ProviderModelConfig[]
  readonly performanceMode?: PerformanceMode
}

export interface CreateMultiModelAgentRequest {
  readonly config: AgentConfig
  readonly modelConfig: ModelConfig
}

// Model validation mapping
const PROVIDER_MODELS: Record<ModelProvider, readonly string[]> = {
  openai: ['gpt-4', 'gpt-3.5-turbo'],
  anthropic: ['claude-3.5', 'claude-3-opus'],
  google: ['gemini-pro', 'gemini-ultra']
}

const VALID_PROVIDERS: readonly ModelProvider[] = ['openai', 'anthropic', 'google']

function isValidProvider(provider: unknown): provider is ModelProvider {
  return VALID_PROVIDERS.includes(provider as ModelProvider)
}

function isValidPerformanceMode(mode: unknown): mode is PerformanceMode {
  return mode === 'speed' || mode === 'cost' || mode === 'balanced'
}

const isValidModelForProvider = (
  provider: ModelProvider,
  modelId: string
): boolean => {
  return PROVIDER_MODELS[provider].includes(modelId)
}

const validateProviderModelConfig = (config: ProviderModelConfig): void => {
  if (!isValidProvider(config.provider)) {
    throw new ModelError(
      `Invalid provider: ${config.provider}. Supported providers: ${VALID_PROVIDERS.join(', ')}`,
      { provider: config.provider }
    )
  }

  if (!config.modelId || typeof config.modelId !== 'string') {
    throw new ModelError(
      'Model ID must be a non-empty string',
      { modelId: config.modelId }
    )
  }

  if (!isValidModelForProvider(config.provider, config.modelId)) {
    throw new ModelError(
      `Model '${config.modelId}' is not supported by provider '${config.provider}'`,
      {
        provider: config.provider,
        modelId: config.modelId,
        supportedModels: PROVIDER_MODELS[config.provider]
      }
    )
  }

  if (!config.apiKey || config.apiKey.trim().length === 0) {
    throw new ModelError(
      'API key is required for primary model',
      { provider: config.provider }
    )
  }
}

const validateModelConfig = (modelConfig: ModelConfig): void => {
  validateProviderModelConfig(modelConfig.primary)

  if (modelConfig.fallbacks) {
    modelConfig.fallbacks.forEach((fallback, index) => {
      try {
        validateProviderModelConfig(fallback)
      } catch (error) {
        throw new ModelError(
          `Fallback model ${index} configuration is invalid`,
          { index, originalError: error }
        )
      }
    })
  }

  if (modelConfig.performanceMode && !isValidPerformanceMode(modelConfig.performanceMode)) {
    throw new ModelError(
      `Invalid performance mode: ${modelConfig.performanceMode}. Supported modes: speed, cost, balanced`,
      { performanceMode: modelConfig.performanceMode }
    )
  }
}

/**
 * Create a multi-model agent with configuration and fallback support
 *
 * @param sdk - The AIAgentSDK instance
 * @param request - Agent creation request with model configuration
 * @returns Created agent with model configuration
 * @throws ModelError if configuration is invalid
 */
export function createMultiModelAgent(
  sdk: AIAgentSDK,
  request: CreateMultiModelAgentRequest
): Agent {
  validateModelConfig(request.modelConfig)

  const performanceMode = request.modelConfig.performanceMode ?? 'balanced'

  const createRequest: CreateAgentRequest = {
    config: {
      ...request.config,
      model: request.modelConfig.primary.modelId
    },
    model: request.modelConfig.primary.modelId
  }

  const agent = sdk.createAgent(createRequest)

  return {
    ...agent,
    context: {
      ...agent.context,
      modelConfig: {
        primary: request.modelConfig.primary,
        fallbacks: request.modelConfig.fallbacks ?? [],
        performanceMode
      }
    }
  }
}

/**
 * Get all supported providers
 */
export function getSupportedProviders(): readonly ModelProvider[] {
  return VALID_PROVIDERS
}

/**
 * Get all models for a specific provider
 */
export function getModelsForProvider(provider: ModelProvider): readonly string[] {
  if (!isValidProvider(provider)) {
    throw new ModelError(
      `Invalid provider: ${provider}`,
      { provider }
    )
  }
  return PROVIDER_MODELS[provider]
}

/**
 * Check if a model is supported
 */
export function isModelSupported(provider: ModelProvider, modelId: string): boolean {
  if (!isValidProvider(provider)) {
    return false
  }
  return isValidModelForProvider(provider, modelId)
}
