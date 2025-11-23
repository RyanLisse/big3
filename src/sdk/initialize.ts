/**
 * Agent Initialization Flow
 * 
 * Implements the agent initialization process for the AI Agent SDK.
 * Supports configuration validation, model selection, and agent creation.
 */

import { Effect } from 'effect';
import { AIAgentSDK, AgentConfig, CreateAgentRequest } from './index';
import { Validation, StructuredError } from '../core/errors';

/**
 * Agent initialization implementation
 */
export class AgentInitialization {
  constructor(private sdk: AIAgentSDK) {}
  
  /**
   * Initialize a new agent with configuration and model selection
   */
  async initialize(request: CreateAgentRequest): Promise<{ agentId: string; model: string }> {
    try {
      // Validate configuration
      const config = this.sdk.createAgent(request);
      
      // Create agent with validated configuration
      const agent = this.sdk.createAgent({
        config: config.config,
        model: config.model || this.sdk.getRegistry().getDefaultModel(),
      });
      
      return {
        agentId: agent.id,
        model: agent.model,
      };
    } catch (error) {
      if (error instanceof StructuredError) {
        throw error;
      }
      
      throw new StructuredError(
        'Failed to initialize agent',
        'AGENT_INITIALIZATION_ERROR' as any,
        undefined,
        { originalError: error }
      );
    }
  }
}
