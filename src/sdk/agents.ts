/**
 * Agent Creation API - MVP implementation for single model support
 *
 * Provides type-safe agent instantiation with basic validation.
 * This module handles:
 * - Agent instantiation with unique ID generation
 * - Model validation against registry
 * - Configuration preservation
 * - Single model support (no multi-model logic)
 */

import { randomUUID } from 'crypto'
import { AgentError } from '../domain'
import type { Agent, CreateAgentRequest } from './index'
import type { ModelRegistry, AgentConfig } from '../config/types'

/**
 * Create a new agent with MVP validation
 *
 * @param request - Agent creation request with config and optional model override
 * @param registry - Model registry for validation
 * @returns Created agent with initializing status
 * @throws AgentError if validation fails
 */
export function createAgent(request: CreateAgentRequest, registry: ModelRegistry): Agent {
  const { config, model: modelOverride } = request

  // Validate config exists and has required fields
  validateAgentConfigRequired(config)

  // Determine model: override > config > default
  const model = modelOverride || config.model || registry.getDefaultModel()

  // Validate model is supported
  if (!registry.isModelSupported(model)) {
    throw new AgentError(
      `Model '${model}' is not supported`,
      undefined,
      'MODEL_NOT_FOUND',
      { model, availableModels: registry.getAvailableModels() }
    )
  }

  // Create agent with unique ID
  const agent: Agent = {
    id: generateAgentId(),
    model,
    status: 'initializing',
    config: deepCopyConfig(config)
  }

  return agent
}

/**
 * Generate unique agent ID
 */
function generateAgentId(): string {
  return `agent-${randomUUID()}`
}

/**
 * Deep copy agent config to prevent mutation
 */
function deepCopyConfig(config: AgentConfig): AgentConfig {
  return JSON.parse(JSON.stringify(config))
}

/**
 * Validate required agent config fields
 *
 * @throws AgentError if validation fails
 */
function validateAgentConfigRequired(config: unknown): asserts config is Record<string, any> {
  if (!config || typeof config !== 'object') {
    throw new AgentError(
      'Agent config must be an object',
      undefined,
      'INVALID_CONFIG'
    )
  }

  const configObj = config as Record<string, any>

  // Validate required fields
  const name = configObj.name
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new AgentError(
      'Agent name is required and must be a non-empty string',
      undefined,
      'INVALID_CONFIG',
      { field: 'name' }
    )
  }

  const instructions = configObj.instructions
  if (!instructions || typeof instructions !== 'string' || !instructions.trim()) {
    throw new AgentError(
      'Agent instructions are required and must be a non-empty string',
      undefined,
      'INVALID_CONFIG',
      { field: 'instructions' }
    )
  }
}
