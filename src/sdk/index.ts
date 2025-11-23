/**
 * AI Agent SDK - Core initialization and agent creation
 * 
 * This module provides the main entry point for the AI Agent SDK,
 * supporting multi-model orchestration, workflow execution, and real-time communication.
 * 
 * Key features:
 * - Multi-model agent creation and management
 * - Dynamic model switching and compatibility validation
 * - Workflow orchestration with checkpointing and recovery
 * - Real-time communication via WebSocket
 * - Configuration management with validation
 * - Error handling and recovery mechanisms
 */

import { Effect } from 'effect';
import { z } from 'zod';
import { 
  SDKConfig, 
  AgentConfig, 
  ModelRegistry 
} from '../config/types';
import { AgentError } from '../domain';
import { ModelRegistryImpl } from '../models/registry';

export interface Agent {
  /** Unique identifier for the agent */
  id: string;
  
  /** Model assigned to the agent */
  model: string;
  
  /** Current status of the agent */
  status: 'initializing' | 'ready' | 'running' | 'paused' | 'error' | 'completed';
  
  /** Configuration for the agent */
  config: AgentConfig;
  
  /** Workflow execution context */
  context?: Record<string, any>;
  
  /** Error information if status is 'error' */
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface CreateAgentRequest {
  /** Configuration for the new agent */
  config: AgentConfig;
  
  /** Optional model override */
  model?: string;
}

export interface ModelSwitchRequest {
  /** Agent ID to switch model for */
  agentId: string;

  /** Target model to switch to */
  model: string;
  
  /** Optional configuration override */
  config?: Partial<AgentConfig>;
}

// Configuration schema validation (Partial, for runtime checks if needed)
// Note: Full validation should be done using schemas in src/core/validation.ts
const SDKConfigSchema = z.object({
  credentials: z.object({
    openaiApiKey: z.string().optional(),
    anthropicApiKey: z.string().optional(),
    googleApiKey: z.string().optional(),
  }).optional(),
  defaultModel: z.object({
    provider: z.string(),
    model: z.string(),
  }).optional(),
  registry: z.union([z.string(), z.custom<ModelRegistry>()]).optional(),
  workflow: z.object({
    maxSteps: z.number().optional(),
    timeout: z.number().optional(),
  }).optional(),
  communication: z.object({
    websocket: z.object({
      url: z.string().url().optional(),
      batching: z.object({
        enabled: z.boolean().default(false),
        maxSize: z.number().min(1).max(1000).default(100),
        flushInterval: z.number().min(10).max(5000).default(100),
      }).optional(),
    }).optional(),
  }).optional(),
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  }).optional(),
});

/**
 * Core SDK class for AI Agent management
 */
export class AIAgentSDK {
  private agents: Map<string, Agent> = new Map();
  private registry: ModelRegistry;
  private config: SDKConfig;
  
  constructor(config: SDKConfig) {
    this.config = config;
    
    // Initialize registry
    if (config.registry && typeof config.registry !== 'string') {
       this.registry = config.registry;
    } else {
       // If string or undefined, use default implementation
       // TODO: Handle string path loading if needed
       this.registry = new ModelRegistryImpl();
       if (typeof config.registry === 'string') {
         console.warn('Loading registry from path not fully implemented, using default.');
       }
    }
  }
  
  /**
   * Create a new agent with validation
   */
  createAgent(request: CreateAgentRequest): Agent {
    const model = request.model || request.config.model || this.registry.getDefaultModel();
    
    // Validate model exists in registry
    if (!this.registry.isModelSupported(model)) {
      throw new AgentError(
        `Model '${model}' not found in registry`,
        undefined,
        'MODEL_NOT_FOUND',
        { availableModels: this.registry.getAvailableModels() }
      );
    }
    
    // Validate configuration (Basic check)
    if (!request.config.id || !request.config.name) {
       throw new AgentError(
        'Invalid configuration: Missing id or name',
        undefined,
        'INVALID_CONFIG'
      );
    }
    
    const agent: Agent = {
      id: request.config.id, // Use ID from config
      model,
      status: 'initializing',
      config: request.config,
    };
    
    this.agents.set(agent.id, agent);
    return agent;
  }
  
  /**
   * Switch agent model with validation
   */
  switchModel(request: ModelSwitchRequest): Agent {
    const agent = this.agents.get(request.agentId);
    
    if (!agent) {
      throw new AgentError(
        `Agent '${request.agentId}' not found`,
        undefined,
        'AGENT_NOT_FOUND'
      );
    }
    
    // Validate target model exists
    if (!this.registry.isModelSupported(request.model)) {
      throw new AgentError(
        `Model '${request.model}' not found in registry`,
        undefined,
        'MODEL_NOT_FOUND',
        { availableModels: this.registry.getAvailableModels() }
      );
    }

    // Validate compatibility
    const compatibility = this.registry.validateModelCompatibility(request.model, {});
    if (!compatibility.compatible) {
       console.warn(`Warning: Switching from ${agent.model} to ${request.model} might have compatibility issues: ${compatibility.reason}`);
    }
    
    // Update agent with new configuration
    const updatedConfig = { ...agent.config, ...request.config };
    // Update the model in the config as well
    updatedConfig.model = request.model;

    const updatedAgent: Agent = {
      ...agent,
      model: request.model,
      config: updatedConfig,
    };
    
    this.agents.set(request.agentId, updatedAgent);
    return updatedAgent;
  }
  
  /**
   * Get agent by ID
   */
  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }
  
  /**
   * List all agents
   */
  listAgents(): Agent[] {
    return Array.from(this.agents.values());
  }
  
  /**
   * Delete agent
   */
  deleteAgent(id: string): boolean {
    return this.agents.delete(id);
  }
  
  /**
   * Get model registry
   */
  getRegistry(): ModelRegistry {
    return this.registry;
  }
}

// Export types re-exported from config
export type { SDKConfig, AgentConfig, ModelRegistry };
