/**
 * Input Validation Framework - MVP implementation (T013)
 *
 * Provides strict validation for agent creation with error messaging.
 * Uses Zod for schema validation and type safety.
 */

import { z } from 'zod'
import type { AgentConfig } from '../config/types'
import {
  AgentConfigSchema as TypesAgentConfigSchema,
  SDKConfigSchema as TypesSDKConfigSchema
} from '../config/types'

// Re-export schemas from types.ts to ensure consistency
export const AgentConfigSchema = TypesAgentConfigSchema
export const SDKConfigSchema = TypesSDKConfigSchema

/**
 * Validation result type with errors array
 */
export interface ValidationSuccess<T> {
  success: true
  errors: []
  data: T
}

export interface ValidationFailure {
  success: false
  errors: string[]
  data?: undefined
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure

/**
 * Validate agent creation request (request + config)
 *
 * @param request - Agent creation request with config
 * @returns Validation result with errors array
 */
export function validateAgentCreation(request: unknown): ValidationResult<AgentConfig> {
  const errors: string[] = []

  // Validate request is an object
  if (!request || typeof request !== 'object') {
    errors.push('Agent creation request must be an object')
    return { success: false, errors }
  }

  const req = request as Record<string, unknown>

  // Validate config exists
  if (!req.config) {
    errors.push('Agent config is required')
    return { success: false, errors }
  }

  // Validate config with internal function
  const configErrors = validateAgentConfigInternal(req.config)
  errors.push(...configErrors)

  if (errors.length > 0) {
    return { success: false, errors }
  }

  const config = req.config as AgentConfig

  return {
    success: true,
    errors: [],
    data: config
  }
}

/**
 * Validate agent configuration
 *
 * @param config - Agent configuration to validate
 * @returns Validation result with errors array
 */
export function validateAgentConfig(config: unknown): ValidationResult<AgentConfig> {
  const errors = validateAgentConfigInternal(config)

  if (errors.length > 0) {
    return { success: false, errors }
  }

  const validConfig = config as AgentConfig

  return {
    success: true,
    errors: [],
    data: validConfig
  }
}

/**
 * Internal validation function to collect all errors
 */
function validateAgentConfigInternal(config: unknown): string[] {
  const errors: string[] = []

  // Check if config is an object
  if (!config || typeof config !== 'object') {
    errors.push('Agent config must be an object')
    return errors
  }

  const cfg = config as Record<string, unknown>

  // Validate name field
  if (!('name' in cfg)) {
    errors.push('Agent name is required')
  } else {
    const name = cfg.name
    if (typeof name !== 'string') {
      errors.push('Agent name must be a string')
    } else if (!name.trim()) {
      errors.push('Agent name must be a non-empty string')
    }
  }

  // Validate instructions field
  if (!('instructions' in cfg)) {
    errors.push('Agent instructions are required')
  } else {
    const instructions = cfg.instructions
    if (typeof instructions !== 'string') {
      errors.push('Agent instructions must be a string')
    } else if (!instructions.trim()) {
      errors.push('Agent instructions must be a non-empty string')
    }
  }

  // Validate optional fields if present
  if ('tools' in cfg && cfg.tools !== undefined && cfg.tools !== null) {
    if (!Array.isArray(cfg.tools)) {
      errors.push('Agent tools must be an array of strings')
    } else if (!cfg.tools.every((t) => typeof t === 'string')) {
      errors.push('All agent tools must be strings')
    }
  }

  if ('model' in cfg && cfg.model !== undefined && cfg.model !== null) {
    if (typeof cfg.model !== 'string') {
      errors.push('Agent model must be a string')
    }
  }

  if ('description' in cfg && cfg.description !== undefined && cfg.description !== null) {
    if (typeof cfg.description !== 'string') {
      errors.push('Agent description must be a string')
    }
  }

  // Validate communication config if provided
  if ('communication' in cfg && cfg.communication !== undefined && cfg.communication !== null) {
    const commErrors = validateCommunicationConfig(cfg.communication)
    errors.push(...commErrors)
  }

  // Validate logging config if provided
  if ('logging' in cfg && cfg.logging !== undefined && cfg.logging !== null) {
    const loggingErrors = validateLoggingConfig(cfg.logging)
    errors.push(...loggingErrors)
  }

  return errors
}

/**
 * Validate communication config structure
 */
function validateCommunicationConfig(comm: unknown): string[] {
  const errors: string[] = []

  if (typeof comm !== 'object' || comm === null) {
    errors.push('Communication config must be an object')
    return errors
  }

  const commObj = comm as Record<string, unknown>

  if ('websocket' in commObj && commObj.websocket !== undefined && commObj.websocket !== null) {
    const wsErrors = validateWebSocketConfig(commObj.websocket)
    errors.push(...wsErrors)
  }

  return errors
}

/**
 * Validate websocket config structure
 */
function validateWebSocketConfig(ws: unknown): string[] {
  const errors: string[] = []

  if (typeof ws !== 'object' || ws === null) {
    errors.push('WebSocket config must be an object')
    return errors
  }

  const wsObj = ws as Record<string, unknown>

  if ('url' in wsObj) {
    if (wsObj.url === undefined || wsObj.url === null) {
      // url is optional if not present, but if empty string it's invalid
    } else if (typeof wsObj.url !== 'string') {
      errors.push('WebSocket URL must be a string')
    } else if (!wsObj.url.trim()) {
      errors.push('WebSocket URL must be a non-empty string when provided')
    }
  }

  if ('batching' in wsObj && wsObj.batching !== undefined && wsObj.batching !== null) {
    const batchErrors = validateBatchingConfig(wsObj.batching)
    errors.push(...batchErrors)
  }

  return errors
}

/**
 * Validate batching config structure
 */
function validateBatchingConfig(batch: unknown): string[] {
  const errors: string[] = []

  if (typeof batch !== 'object' || batch === null) {
    errors.push('Batching config must be an object')
    return errors
  }

  const batchObj = batch as Record<string, unknown>

  if (!('enabled' in batchObj)) {
    errors.push('Batching enabled field is required')
  } else if (typeof batchObj.enabled !== 'boolean') {
    errors.push('Batching enabled must be a boolean')
  }

  if (!('maxSize' in batchObj)) {
    errors.push('Batching maxSize field is required')
  } else if (typeof batchObj.maxSize !== 'number' || batchObj.maxSize <= 0) {
    errors.push('Batching maxSize must be a positive number')
  }

  if (!('flushInterval' in batchObj)) {
    errors.push('Batching flushInterval field is required')
  } else if (typeof batchObj.flushInterval !== 'number' || batchObj.flushInterval <= 0) {
    errors.push('Batching flushInterval must be a positive number')
  }

  return errors
}

/**
 * Validate logging config structure
 */
function validateLoggingConfig(logging: unknown): string[] {
  const errors: string[] = []

  if (typeof logging !== 'object' || logging === null) {
    errors.push('Logging config must be an object')
    return errors
  }

  const logObj = logging as Record<string, unknown>

  if ('level' in logObj) {
    const level = logObj.level
    if (level !== undefined && level !== null) {
      if (typeof level !== 'string') {
        errors.push('Logging level must be a string')
      } else if (!['debug', 'info', 'warn', 'error'].includes(level)) {
        errors.push('Logging level must be one of: debug, info, warn, error')
      }
    }
  }

  return errors
}

/**
 * Validate SDK Configuration
 */
export function validateSDKConfig(config: unknown) {
  return SDKConfigSchema.safeParse(config)
}
