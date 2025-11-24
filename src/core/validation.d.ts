/**
 * Input Validation Framework - MVP implementation (T013)
 *
 * Provides strict validation for agent creation with error messaging.
 * Uses Zod for schema validation and type safety.
 */
import type { AgentConfig } from "../config/types";
export declare const AgentConfigSchema: z.ZodObject<
  {
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    instructions: z.ZodString;
    tools: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    model: z.ZodOptional<z.ZodString>;
    communication: z.ZodOptional<
      z.ZodObject<
        {
          websocket: z.ZodOptional<
            z.ZodObject<
              {
                url: z.ZodString;
                reconnectInterval: z.ZodOptional<z.ZodNumber>;
                maxReconnectAttempts: z.ZodOptional<z.ZodNumber>;
                batching: z.ZodOptional<
                  z.ZodObject<
                    {
                      enabled: z.ZodBoolean;
                      maxSize: z.ZodNumber;
                      flushInterval: z.ZodNumber;
                    },
                    "strip",
                    z.ZodTypeAny,
                    {
                      enabled: boolean;
                      maxSize: number;
                      flushInterval: number;
                    },
                    {
                      enabled: boolean;
                      maxSize: number;
                      flushInterval: number;
                    }
                  >
                >;
              },
              "strip",
              z.ZodTypeAny,
              {
                url: string;
                reconnectInterval?: number | undefined;
                maxReconnectAttempts?: number | undefined;
                batching?:
                  | {
                      enabled: boolean;
                      maxSize: number;
                      flushInterval: number;
                    }
                  | undefined;
              },
              {
                url: string;
                reconnectInterval?: number | undefined;
                maxReconnectAttempts?: number | undefined;
                batching?:
                  | {
                      enabled: boolean;
                      maxSize: number;
                      flushInterval: number;
                    }
                  | undefined;
              }
            >
          >;
        },
        "strip",
        z.ZodTypeAny,
        {
          websocket?:
            | {
                url: string;
                reconnectInterval?: number | undefined;
                maxReconnectAttempts?: number | undefined;
                batching?:
                  | {
                      enabled: boolean;
                      maxSize: number;
                      flushInterval: number;
                    }
                  | undefined;
              }
            | undefined;
        },
        {
          websocket?:
            | {
                url: string;
                reconnectInterval?: number | undefined;
                maxReconnectAttempts?: number | undefined;
                batching?:
                  | {
                      enabled: boolean;
                      maxSize: number;
                      flushInterval: number;
                    }
                  | undefined;
              }
            | undefined;
        }
      >
    >;
    logging: z.ZodOptional<
      z.ZodObject<
        {
          level: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
        },
        "strip",
        z.ZodTypeAny,
        {
          level: "info" | "debug" | "error" | "warn";
        },
        {
          level?: "info" | "debug" | "error" | "warn" | undefined;
        }
      >
    >;
  },
  "strip",
  z.ZodTypeAny,
  {
    name: string;
    instructions: string;
    model?: string | undefined;
    tools?: string[] | undefined;
    description?: string | undefined;
    communication?:
      | {
          websocket?:
            | {
                url: string;
                reconnectInterval?: number | undefined;
                maxReconnectAttempts?: number | undefined;
                batching?:
                  | {
                      enabled: boolean;
                      maxSize: number;
                      flushInterval: number;
                    }
                  | undefined;
              }
            | undefined;
        }
      | undefined;
    logging?:
      | {
          level: "info" | "debug" | "error" | "warn";
        }
      | undefined;
  },
  {
    name: string;
    instructions: string;
    model?: string | undefined;
    tools?: string[] | undefined;
    description?: string | undefined;
    communication?:
      | {
          websocket?:
            | {
                url: string;
                reconnectInterval?: number | undefined;
                maxReconnectAttempts?: number | undefined;
                batching?:
                  | {
                      enabled: boolean;
                      maxSize: number;
                      flushInterval: number;
                    }
                  | undefined;
              }
            | undefined;
        }
      | undefined;
    logging?:
      | {
          level?: "info" | "debug" | "error" | "warn" | undefined;
        }
      | undefined;
  }
>;
export declare const SDKConfigSchema: z.ZodObject<
  {
    apiKey: z.ZodString;
    model: z.ZodOptional<z.ZodString>;
    registry: z.ZodOptional<
      z.ZodType<
        import("../config/types").ModelRegistry,
        z.ZodTypeDef,
        import("../config/types").ModelRegistry
      >
    >;
    workflow: z.ZodOptional<
      z.ZodObject<
        {
          enabled: z.ZodDefault<z.ZodBoolean>;
          autoStart: z.ZodOptional<z.ZodBoolean>;
        },
        "strip",
        z.ZodTypeAny,
        {
          enabled: boolean;
          autoStart?: boolean | undefined;
        },
        {
          enabled?: boolean | undefined;
          autoStart?: boolean | undefined;
        }
      >
    >;
    communication: z.ZodOptional<
      z.ZodObject<
        {
          websocket: z.ZodOptional<
            z.ZodObject<
              {
                url: z.ZodString;
                reconnectInterval: z.ZodOptional<z.ZodNumber>;
                maxReconnectAttempts: z.ZodOptional<z.ZodNumber>;
                batching: z.ZodOptional<
                  z.ZodObject<
                    {
                      enabled: z.ZodBoolean;
                      maxSize: z.ZodNumber;
                      flushInterval: z.ZodNumber;
                    },
                    "strip",
                    z.ZodTypeAny,
                    {
                      enabled: boolean;
                      maxSize: number;
                      flushInterval: number;
                    },
                    {
                      enabled: boolean;
                      maxSize: number;
                      flushInterval: number;
                    }
                  >
                >;
              },
              "strip",
              z.ZodTypeAny,
              {
                url: string;
                reconnectInterval?: number | undefined;
                maxReconnectAttempts?: number | undefined;
                batching?:
                  | {
                      enabled: boolean;
                      maxSize: number;
                      flushInterval: number;
                    }
                  | undefined;
              },
              {
                url: string;
                reconnectInterval?: number | undefined;
                maxReconnectAttempts?: number | undefined;
                batching?:
                  | {
                      enabled: boolean;
                      maxSize: number;
                      flushInterval: number;
                    }
                  | undefined;
              }
            >
          >;
        },
        "strip",
        z.ZodTypeAny,
        {
          websocket?:
            | {
                url: string;
                reconnectInterval?: number | undefined;
                maxReconnectAttempts?: number | undefined;
                batching?:
                  | {
                      enabled: boolean;
                      maxSize: number;
                      flushInterval: number;
                    }
                  | undefined;
              }
            | undefined;
        },
        {
          websocket?:
            | {
                url: string;
                reconnectInterval?: number | undefined;
                maxReconnectAttempts?: number | undefined;
                batching?:
                  | {
                      enabled: boolean;
                      maxSize: number;
                      flushInterval: number;
                    }
                  | undefined;
              }
            | undefined;
        }
      >
    >;
    logging: z.ZodOptional<
      z.ZodObject<
        {
          level: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
        },
        "strip",
        z.ZodTypeAny,
        {
          level: "info" | "debug" | "error" | "warn";
        },
        {
          level?: "info" | "debug" | "error" | "warn" | undefined;
        }
      >
    >;
  },
  "strip",
  z.ZodTypeAny,
  {
    apiKey: string;
    model?: string | undefined;
    communication?:
      | {
          websocket?:
            | {
                url: string;
                reconnectInterval?: number | undefined;
                maxReconnectAttempts?: number | undefined;
                batching?:
                  | {
                      enabled: boolean;
                      maxSize: number;
                      flushInterval: number;
                    }
                  | undefined;
              }
            | undefined;
        }
      | undefined;
    logging?:
      | {
          level: "info" | "debug" | "error" | "warn";
        }
      | undefined;
    registry?: import("../config/types").ModelRegistry | undefined;
    workflow?:
      | {
          enabled: boolean;
          autoStart?: boolean | undefined;
        }
      | undefined;
  },
  {
    apiKey: string;
    model?: string | undefined;
    communication?:
      | {
          websocket?:
            | {
                url: string;
                reconnectInterval?: number | undefined;
                maxReconnectAttempts?: number | undefined;
                batching?:
                  | {
                      enabled: boolean;
                      maxSize: number;
                      flushInterval: number;
                    }
                  | undefined;
              }
            | undefined;
        }
      | undefined;
    logging?:
      | {
          level?: "info" | "debug" | "error" | "warn" | undefined;
        }
      | undefined;
    registry?: import("../config/types").ModelRegistry | undefined;
    workflow?:
      | {
          enabled?: boolean | undefined;
          autoStart?: boolean | undefined;
        }
      | undefined;
  }
>;
/**
 * Validation result type with errors array
 */
export type ValidationSuccess<T> = {
  success: true;
  errors: [];
  data: T;
};
export type ValidationFailure = {
  success: false;
  errors: string[];
  data?: undefined;
};
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;
/**
 * Validate agent creation request (request + config)
 *
 * @param request - Agent creation request with config
 * @returns Validation result with errors array
 */
export declare function validateAgentCreation(
  request: unknown
): ValidationResult<AgentConfig>;
/**
 * Validate agent configuration
 *
 * @param config - Agent configuration to validate
 * @returns Validation result with errors array
 */
export declare function validateAgentConfig(
  config: unknown
): ValidationResult<AgentConfig>;
/**
 * Validate SDK Configuration
 */
export declare function validateSDKConfig(
  config: unknown
): z.SafeParseReturnType<
  {
    apiKey: string;
    model?: string | undefined;
    communication?:
      | {
          websocket?:
            | {
                url: string;
                reconnectInterval?: number | undefined;
                maxReconnectAttempts?: number | undefined;
                batching?:
                  | {
                      enabled: boolean;
                      maxSize: number;
                      flushInterval: number;
                    }
                  | undefined;
              }
            | undefined;
        }
      | undefined;
    logging?:
      | {
          level?: "info" | "debug" | "error" | "warn" | undefined;
        }
      | undefined;
    registry?: import("../config/types").ModelRegistry | undefined;
    workflow?:
      | {
          enabled?: boolean | undefined;
          autoStart?: boolean | undefined;
        }
      | undefined;
  },
  {
    apiKey: string;
    model?: string | undefined;
    communication?:
      | {
          websocket?:
            | {
                url: string;
                reconnectInterval?: number | undefined;
                maxReconnectAttempts?: number | undefined;
                batching?:
                  | {
                      enabled: boolean;
                      maxSize: number;
                      flushInterval: number;
                    }
                  | undefined;
              }
            | undefined;
        }
      | undefined;
    logging?:
      | {
          level: "info" | "debug" | "error" | "warn";
        }
      | undefined;
    registry?: import("../config/types").ModelRegistry | undefined;
    workflow?:
      | {
          enabled: boolean;
          autoStart?: boolean | undefined;
        }
      | undefined;
  }
>;
/**
 * Team Management Validation Schemas
 */
import { z } from "zod";
export declare const CreateTeamRequestSchema: z.ZodObject<
  {
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    configuration: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
  },
  "strip",
  z.ZodTypeAny,
  {
    name: string;
    description?: string | undefined;
    configuration?: Record<string, unknown> | undefined;
  },
  {
    name: string;
    description?: string | undefined;
    configuration?: Record<string, unknown> | undefined;
  }
>;
export declare const UpdateTeamRequestSchema: z.ZodObject<
  {
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["active", "paused", "archived"]>>;
    configuration: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
  },
  "strip",
  z.ZodTypeAny,
  {
    name?: string | undefined;
    description?: string | undefined;
    status?: "active" | "paused" | "archived" | undefined;
    configuration?: Record<string, unknown> | undefined;
  },
  {
    name?: string | undefined;
    description?: string | undefined;
    status?: "active" | "paused" | "archived" | undefined;
    configuration?: Record<string, unknown> | undefined;
  }
>;
export declare const TeamMembershipRequestSchema: z.ZodObject<
  {
    teamId: z.ZodString;
    agentId: z.ZodString;
    role: z.ZodOptional<z.ZodString>;
  },
  "strip",
  z.ZodTypeAny,
  {
    teamId: string;
    agentId: string;
    role?: string | undefined;
  },
  {
    teamId: string;
    agentId: string;
    role?: string | undefined;
  }
>;
export declare const CreateSharedMemoryRequestSchema: z.ZodObject<
  {
    teamId: z.ZodString;
    label: z.ZodString;
    value: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    type: z.ZodEnum<
      ["project_context", "shared_knowledge", "workflow_state", "custom"]
    >;
    accessLevel: z.ZodEnum<["read", "read_write", "admin"]>;
  },
  "strip",
  z.ZodTypeAny,
  {
    type: "custom" | "project_context" | "shared_knowledge" | "workflow_state";
    value: string;
    teamId: string;
    label: string;
    accessLevel: "read" | "read_write" | "admin";
    description?: string | undefined;
  },
  {
    type: "custom" | "project_context" | "shared_knowledge" | "workflow_state";
    value: string;
    teamId: string;
    label: string;
    accessLevel: "read" | "read_write" | "admin";
    description?: string | undefined;
  }
>;
export declare const UpdateSharedMemoryRequestSchema: z.ZodObject<
  {
    value: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    accessLevel: z.ZodOptional<z.ZodEnum<["read", "read_write", "admin"]>>;
    expectedVersion: z.ZodOptional<z.ZodNumber>;
  },
  "strip",
  z.ZodTypeAny,
  {
    description?: string | undefined;
    value?: string | undefined;
    accessLevel?: "read" | "read_write" | "admin" | undefined;
    expectedVersion?: number | undefined;
  },
  {
    description?: string | undefined;
    value?: string | undefined;
    accessLevel?: "read" | "read_write" | "admin" | undefined;
    expectedVersion?: number | undefined;
  }
>;
/**
 * Validation functions for team management
 */
export declare function validateCreateTeamRequest(
  request: unknown
): z.SafeParseReturnType<
  {
    name: string;
    description?: string | undefined;
    configuration?: Record<string, unknown> | undefined;
  },
  {
    name: string;
    description?: string | undefined;
    configuration?: Record<string, unknown> | undefined;
  }
>;
export declare function validateUpdateTeamRequest(
  request: unknown
): z.SafeParseReturnType<
  {
    name?: string | undefined;
    description?: string | undefined;
    status?: "active" | "paused" | "archived" | undefined;
    configuration?: Record<string, unknown> | undefined;
  },
  {
    name?: string | undefined;
    description?: string | undefined;
    status?: "active" | "paused" | "archived" | undefined;
    configuration?: Record<string, unknown> | undefined;
  }
>;
export declare function validateTeamMembershipRequest(
  request: unknown
): z.SafeParseReturnType<
  {
    teamId: string;
    agentId: string;
    role?: string | undefined;
  },
  {
    teamId: string;
    agentId: string;
    role?: string | undefined;
  }
>;
export declare function validateCreateSharedMemoryRequest(
  request: unknown
): z.SafeParseReturnType<
  {
    type: "custom" | "project_context" | "shared_knowledge" | "workflow_state";
    value: string;
    teamId: string;
    label: string;
    accessLevel: "read" | "read_write" | "admin";
    description?: string | undefined;
  },
  {
    type: "custom" | "project_context" | "shared_knowledge" | "workflow_state";
    value: string;
    teamId: string;
    label: string;
    accessLevel: "read" | "read_write" | "admin";
    description?: string | undefined;
  }
>;
export declare function validateUpdateSharedMemoryRequest(
  request: unknown
): z.SafeParseReturnType<
  {
    description?: string | undefined;
    value?: string | undefined;
    accessLevel?: "read" | "read_write" | "admin" | undefined;
    expectedVersion?: number | undefined;
  },
  {
    description?: string | undefined;
    value?: string | undefined;
    accessLevel?: "read" | "read_write" | "admin" | undefined;
    expectedVersion?: number | undefined;
  }
>;
