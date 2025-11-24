import { z } from "zod";

// Model Types
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
    requirements: Record<string, any>
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

// Configuration Types
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

// Zod Schemas
export const LoggingConfigSchema = z.object({
  level: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export const WebSocketConfigSchema = z.object({
  url: z.string().min(1),
  reconnectInterval: z.number().optional(),
  maxReconnectAttempts: z.number().optional(),
  batching: z
    .object({
      enabled: z.boolean(),
      maxSize: z.number(),
      flushInterval: z.number(),
    })
    .optional(),
});

export const CommunicationConfigSchema = z.object({
  websocket: WebSocketConfigSchema.optional(),
});

export const WorkflowConfigSchema = z.object({
  enabled: z.boolean().default(false),
  autoStart: z.boolean().optional(),
});

export const AgentConfigSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  instructions: z.string().min(1),
  tools: z.array(z.string()).optional(),
  model: z.string().optional(),
  communication: CommunicationConfigSchema.optional(),
  logging: LoggingConfigSchema.optional(),
});

export const SDKConfigSchema = z.object({
  apiKey: z.string().min(1),
  model: z.string().optional(),
  registry: z
    .custom<ModelRegistry>((val) => val !== null && typeof val === "object")
    .optional(),
  workflow: WorkflowConfigSchema.optional(),
  communication: CommunicationConfigSchema.optional(),
  logging: LoggingConfigSchema.optional(),
});

export const ConfigSchema = SDKConfigSchema;

// Validation Functions
export const validateConfig = (config: unknown) =>
  ConfigSchema.safeParse(config);

export const validateAgentConfig = (config: unknown) =>
  AgentConfigSchema.safeParse(config);

export const isValidApiKey = (apiKey: unknown): apiKey is string =>
  typeof apiKey === "string" && apiKey.trim().length > 0;

export const isValidModel = (model: unknown): model is string =>
  typeof model === "string" && model.trim().length > 0;

export const isValidRegistry = (registry: unknown): registry is string =>
  typeof registry === "string" && registry.trim().length > 0;

export const isValidWorkflowConfig = (config: unknown): config is object =>
  config !== null && typeof config === "object";

export const isValidLoggingConfig = (logging: unknown): logging is object =>
  logging !== null &&
  typeof logging === "object" &&
  "level" in logging &&
  typeof (logging as any).level === "string" &&
  ["error", "warn", "info", "debug"].includes((logging as any).level);

export const isValidWebSocketConfig = (config: unknown): config is object =>
  config !== null &&
  typeof config === "object" &&
  "url" in config &&
  typeof (config as any).url === "string" &&
  (config as any).url.trim().length > 0;

export const isValidBatchingConfig = (config: unknown): config is object =>
  config !== null &&
  typeof config === "object" &&
  "enabled" in config &&
  typeof (config as any).enabled === "boolean" &&
  "maxSize" in config &&
  typeof (config as any).maxSize === "number" &&
  (config as any).maxSize > 0 &&
  "flushInterval" in config &&
  typeof (config as any).flushInterval === "number" &&
  (config as any).flushInterval > 0;
