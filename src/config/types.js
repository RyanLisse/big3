import { z } from "zod";
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
    .custom((val) => val !== null && typeof val === "object")
    .optional(),
  workflow: WorkflowConfigSchema.optional(),
  communication: CommunicationConfigSchema.optional(),
  logging: LoggingConfigSchema.optional(),
});
export const ConfigSchema = SDKConfigSchema;
// Validation Functions
export const validateConfig = (config) => ConfigSchema.safeParse(config);
export const validateAgentConfig = (config) =>
  AgentConfigSchema.safeParse(config);
export const isValidApiKey = (apiKey) =>
  typeof apiKey === "string" && apiKey.trim().length > 0;
export const isValidModel = (model) =>
  typeof model === "string" && model.trim().length > 0;
export const isValidRegistry = (registry) =>
  typeof registry === "string" && registry.trim().length > 0;
export const isValidWorkflowConfig = (config) =>
  config !== null && typeof config === "object";
export const isValidLoggingConfig = (logging) =>
  logging !== null &&
  typeof logging === "object" &&
  "level" in logging &&
  typeof logging.level === "string" &&
  ["error", "warn", "info", "debug"].includes(logging.level);
export const isValidWebSocketConfig = (config) =>
  config !== null &&
  typeof config === "object" &&
  "url" in config &&
  typeof config.url === "string" &&
  config.url.trim().length > 0;
export const isValidBatchingConfig = (config) =>
  config !== null &&
  typeof config === "object" &&
  "enabled" in config &&
  typeof config.enabled === "boolean" &&
  "maxSize" in config &&
  typeof config.maxSize === "number" &&
  config.maxSize > 0 &&
  "flushInterval" in config &&
  typeof config.flushInterval === "number" &&
  config.flushInterval > 0;
//# sourceMappingURL=types.js.map
