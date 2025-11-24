/**
 * Agent Initialization Flow
 *
 * Implements the agent initialization process for the AI Agent SDK.
 * Supports configuration validation, model selection, and agent creation.
 */

import { ErrorCode, StructuredError } from "../core/errors";
import type { AIAgentSDK, CreateAgentRequest } from "./index";

/**
 * Agent initialization implementation
 */
export class AgentInitialization {
  constructor(private readonly sdk: AIAgentSDK) {
    this.sdk = sdk;
  }

  /**
   * Initialize a new agent with configuration and model selection
   */
  async initialize(
    request: CreateAgentRequest
  ): Promise<{ agentId: string; model: string }> {
    try {
      // Use standard agent creation
      const agent = this.sdk.createAgent(request);
      return {
        agentId: agent.id,
        model: agent.model,
      };
    } catch (error) {
      if (error instanceof StructuredError) {
        throw error;
      }
      throw new StructuredError(
        "Failed to initialize agent",
        ErrorCode.AGENT_INITIALIZATION_ERROR,
        undefined,
        { originalError: error }
      );
    }
  }
}
