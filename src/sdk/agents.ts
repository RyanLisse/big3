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

import { randomUUID } from "node:crypto";
import { Effect } from "effect";
import type { AgentConfig, ModelRegistry } from "../config/types";
import { AgentError } from "../domain";
import type { Agent, CreateAgentRequest } from "./index";
import type {
  AddAgentRequest,
  AgentMessage,
  CreateTeamRequest,
  MultiAgentTeam,
  SendMessageRequest,
  SharedMemoryBlock,
  SharedMemoryRequest,
} from "./types/multi-agent";

/**
 * Create a new agent with MVP validation
 *
 * @param request - Agent creation request with config and optional model override
 * @param registry - Model registry for validation
 * @returns Created agent with initializing status
 * @throws AgentError if validation fails
 */
export function createAgent(
  request: CreateAgentRequest,
  registry: ModelRegistry
): Agent {
  const { config, model: modelOverride } = request;

  // Validate config exists and has required fields
  validateAgentConfigRequired(config);

  // Determine model: override > config > default
  const model = modelOverride || config.model || registry.getDefaultModel();

  // Validate model is supported
  if (!registry.isModelSupported(model)) {
    throw new AgentError(
      `Model '${model}' is not supported`,
      undefined,
      "MODEL_NOT_FOUND",
      { model, availableModels: registry.getAvailableModels() }
    );
  }

  // Create agent with unique ID
  const agent: Agent = {
    id: generateAgentId(),
    model,
    status: "initializing",
    config: deepCopyConfig(config),
  };

  return agent;
}

/**
 * Generate unique agent ID
 */
function generateAgentId(): string {
  return `agent-${randomUUID()}`;
}

/**
 * Deep copy agent config to prevent mutation
 */
function deepCopyConfig(config: AgentConfig): AgentConfig {
  return JSON.parse(JSON.stringify(config));
}

/**
 * Validate required agent config fields
 *
 * @throws AgentError if validation fails
 */
function validateAgentConfigRequired(
  config: unknown
): asserts config is AgentConfig {
  if (!config || typeof config !== "object") {
    throw new AgentError(
      "Agent config must be an object",
      undefined,
      "INVALID_CONFIG"
    );
  }

  const configObj = config as Record<string, unknown>;

  // Validate required fields
  const name = configObj.name;
  if (!name || typeof name !== "string" || !name.trim()) {
    throw new AgentError(
      "Agent name is required and must be a non-empty string",
      undefined,
      "INVALID_CONFIG",
      { field: "name" }
    );
  }

  const instructions = configObj.instructions;
  if (
    !instructions ||
    typeof instructions !== "string" ||
    !instructions.trim()
  ) {
    throw new AgentError(
      "Agent instructions are required and must be a non-empty string",
      undefined,
      "INVALID_CONFIG",
      { field: "instructions" }
    );
  }
}

const defaultHeaders = {
  "Content-Type": "application/json",
};

const parseErrorMessage = async (response: Response) => {
  try {
    const body = await response.json();
    return (body as { message?: string }).message ?? "Request failed";
  } catch {
    return "Request failed";
  }
};

export const createTeam = (
  baseUrl: string,
  request: CreateTeamRequest
): Effect.Effect<MultiAgentTeam, Error> =>
  Effect.tryPromise({
    try: async () => {
      const res = await fetch(`${baseUrl}/multi-agent/teams`, {
        method: "POST",
        headers: defaultHeaders,
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        throw new Error(await parseErrorMessage(res));
      }

      const body = (await res.json()) as { team: MultiAgentTeam };
      return body.team;
    },
    catch: (error) =>
      error instanceof Error ? error : new Error(String(error)),
  });

export const addAgent = (
  baseUrl: string,
  teamId: string,
  request: AddAgentRequest
): Effect.Effect<void, Error> =>
  Effect.tryPromise({
    try: async () => {
      const res = await fetch(`${baseUrl}/multi-agent/teams/${teamId}/agents`, {
        method: "POST",
        headers: defaultHeaders,
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        throw new Error(await parseErrorMessage(res));
      }
    },
    catch: (error) =>
      error instanceof Error ? error : new Error(String(error)),
  });

export const sharedMemory = (
  baseUrl: string,
  teamId: string,
  request: SharedMemoryRequest
): Effect.Effect<SharedMemoryBlock, Error> =>
  Effect.tryPromise({
    try: async () => {
      const res = await fetch(`${baseUrl}/multi-agent/teams/${teamId}/memory`, {
        method: "POST",
        headers: defaultHeaders,
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        throw new Error(await parseErrorMessage(res));
      }

      const body = (await res.json()) as { memoryBlock: SharedMemoryBlock };
      return body.memoryBlock;
    },
    catch: (error) =>
      error instanceof Error ? error : new Error(String(error)),
  });

export const sendMessage = (
  baseUrl: string,
  toAgentId: string,
  request: SendMessageRequest
): Effect.Effect<AgentMessage, Error> =>
  Effect.tryPromise({
    try: async () => {
      const res = await fetch(
        `${baseUrl}/multi-agent/agents/${toAgentId}/messages`,
        {
          method: "POST",
          headers: defaultHeaders,
          body: JSON.stringify(request),
        }
      );

      if (!res.ok) {
        throw new Error(await parseErrorMessage(res));
      }

      const body = (await res.json()) as { message: AgentMessage };
      return body.message;
    },
    catch: (error) =>
      error instanceof Error ? error : new Error(String(error)),
  });
