import { z } from "zod";
export type ModelInfo = {
  id: string;
  provider: string;
  name: string;
  contextWindow: number;
  maxOutputTokens: number;
  inputPrice: number;
  outputPrice: number;
};
export type ModelCompatibility = {
  compatible: boolean;
  reason?: string;
  missingFeatures?: string[];
};
export type ModelRegistry = {
  registerModel(model: ModelInfo): void;
  getModel(id: string): ModelInfo | undefined;
  listModels(): ModelInfo[];
  isModelSupported(modelId: string): boolean;
  validateModelCompatibility(
    modelId: string,
    requirements: Record<string, unknown>
  ): ModelCompatibility;
  getDefaultModel(): string;
  getAvailableModels(): string[];
};
export type ModelRegistryData = {
  models: Record<
    string,
    ModelInfo & {
      capabilities: string[];
      compatibility: string[];
      version: string;
    }
  >;
  default: string;
};
export type LoggingConfig = {
  level: "debug" | "info" | "warn" | "error";
};
export type WebSocketConfig = {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
};
export type BatchingConfig = {
  enabled: boolean;
  maxSize: number;
  flushInterval: number;
};
export type CommunicationConfig = {
  websocket?: WebSocketConfig & {
    batching?: BatchingConfig;
  };
};
export type WorkflowConfig = {
  enabled: boolean;
  autoStart?: boolean;
};
export type AgentConfig = {
  id?: string;
  name: string;
  description?: string;
  instructions: string;
  tools?: string[];
  model?: string;
  communication?: CommunicationConfig;
  logging?: LoggingConfig;
};
export type SDKConfig = {
  apiKey: string;
  model?: string;
  registry?: ModelRegistry;
  workflow?: WorkflowConfig;
  communication?: CommunicationConfig;
  logging?: LoggingConfig;
};
export declare const LoggingConfigSchema: z.ZodObject<
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
>;
export declare const WebSocketConfigSchema: z.ZodObject<
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
>;
export declare const CommunicationConfigSchema: z.ZodObject<
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
>;
export declare const WorkflowConfigSchema: z.ZodObject<
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
>;
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
      z.ZodType<ModelRegistry, z.ZodTypeDef, ModelRegistry>
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
    registry?: ModelRegistry | undefined;
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
    registry?: ModelRegistry | undefined;
    workflow?:
      | {
          enabled?: boolean | undefined;
          autoStart?: boolean | undefined;
        }
      | undefined;
  }
>;
export declare const ConfigSchema: z.ZodObject<
  {
    apiKey: z.ZodString;
    model: z.ZodOptional<z.ZodString>;
    registry: z.ZodOptional<
      z.ZodType<ModelRegistry, z.ZodTypeDef, ModelRegistry>
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
    registry?: ModelRegistry | undefined;
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
    registry?: ModelRegistry | undefined;
    workflow?:
      | {
          enabled?: boolean | undefined;
          autoStart?: boolean | undefined;
        }
      | undefined;
  }
>;
export declare const validateConfig: (config: unknown) => z.SafeParseReturnType<
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
    registry?: ModelRegistry | undefined;
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
    registry?: ModelRegistry | undefined;
    workflow?:
      | {
          enabled: boolean;
          autoStart?: boolean | undefined;
        }
      | undefined;
  }
>;
export declare const validateAgentConfig: (
  config: unknown
) => z.SafeParseReturnType<
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
          level: "info" | "debug" | "error" | "warn";
        }
      | undefined;
  }
>;
export declare const isValidApiKey: (apiKey: unknown) => apiKey is string;
export declare const isValidModel: (model: unknown) => model is string;
export declare const isValidRegistry: (registry: unknown) => registry is string;
export declare const isValidWorkflowConfig: (
  config: unknown
) => config is object;
export declare const isValidLoggingConfig: (
  logging: unknown
) => logging is object;
export declare const isValidWebSocketConfig: (
  config: unknown
) => config is object;
export declare const isValidBatchingConfig: (
  config: unknown
) => config is object;
