/**
 * Error Handling Framework - Implementation
 *
 * Provides structured error types and handling for the AI Agent SDK.
 * Supports validation, authentication, and runtime error management.
 */

export const ErrorSeverity = {
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
  CRITICAL: "critical",
} as const;

export type ErrorSeverity = (typeof ErrorSeverity)[keyof typeof ErrorSeverity];

export const ErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR",
  MODEL_ERROR: "MODEL_ERROR",
  RATE_LIMIT_ERROR: "RATE_LIMIT_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT_ERROR: "TIMEOUT_ERROR",
  NOT_FOUND_ERROR: "NOT_FOUND_ERROR",
  WORKFLOW_ERROR: "WORKFLOW_ERROR",
  AGENT_INITIALIZATION_ERROR: "AGENT_INITIALIZATION_ERROR",
  COMMUNICATION_ERROR: "COMMUNICATION_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export class StructuredError extends Error {
  readonly code: ErrorCode;
  readonly severity: ErrorSeverity;
  readonly details?: Record<string, unknown>;
  readonly timestamp: Date;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "StructuredError";
    this.code = code;
    this.severity = severity;
    this.details = details;
    this.timestamp = new Date();
  }

  static validation(
    message: string,
    details?: Record<string, unknown>
  ): StructuredError {
    return new StructuredError(
      message,
      ErrorCode.VALIDATION_ERROR,
      ErrorSeverity.ERROR,
      details
    );
  }

  static authentication(
    message: string,
    details?: Record<string, unknown>
  ): StructuredError {
    return new StructuredError(
      message,
      ErrorCode.AUTHENTICATION_ERROR,
      ErrorSeverity.ERROR,
      details
    );
  }

  static modelCompatibility(
    model: string,
    availableModels: string[]
  ): StructuredError {
    return new StructuredError(
      `Model '${model}' is not supported. Available models: ${availableModels.join(", ")}`,
      ErrorCode.MODEL_ERROR,
      ErrorSeverity.ERROR,
      { model, availableModels }
    );
  }
}

export class SDKError extends StructuredError {}

export class ValidationError extends StructuredError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ErrorCode.VALIDATION_ERROR, ErrorSeverity.ERROR, details);
    this.name = "ValidationError";
  }
}

export class AgentInitializationError extends StructuredError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(
      message,
      ErrorCode.AGENT_INITIALIZATION_ERROR,
      ErrorSeverity.CRITICAL,
      details
    );
    this.name = "AgentInitializationError";
  }
}

export class ModelError extends StructuredError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ErrorCode.MODEL_ERROR, ErrorSeverity.ERROR, details);
    this.name = "ModelError";
  }
}

export class WorkflowError extends StructuredError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ErrorCode.WORKFLOW_ERROR, ErrorSeverity.ERROR, details);
    this.name = "WorkflowError";
  }
}

export class CommunicationError extends StructuredError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ErrorCode.COMMUNICATION_ERROR, ErrorSeverity.ERROR, details);
    this.name = "CommunicationError";
  }
}

// API key format validation regex
const API_KEY_FORMAT = /^(sk_|pk_)[a-zA-Z0-9]{32,}$/;

// Validation result type
export type ValidationResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: StructuredError;
};

// Validation function type
export type ValidationFunction<T> = (input: unknown) => ValidationResult<T>;

// Common validation functions
export const Validation = {
  /**
   * Validate required string field
   */
  requiredString:
    (fieldName: string): ValidationFunction<string> =>
    (input) => {
      if (typeof input !== "string" || !input.trim()) {
        return {
          success: false,
          error: StructuredError.validation(
            `${fieldName} is required and must be a non-empty string`,
            { fieldName, input: String(input) }
          ),
        };
      }
      return { success: true, data: input };
    },

  /**
   * Validate optional string field
   */
  optionalString:
    (fieldName: string): ValidationFunction<string | undefined> =>
    (input) => {
      if (input === undefined || input === null) {
        return { success: true, data: undefined };
      }
      if (typeof input !== "string") {
        return {
          success: false,
          error: StructuredError.validation(
            `${fieldName} must be a string if provided`,
            { fieldName, input }
          ),
        };
      }
      return { success: true, data: input };
    },

  /**
   * Validate API key format
   */
  apiKey:
    (fieldName = "apiKey"): ValidationFunction<string> =>
    (input) => {
      if (typeof input !== "string" || !input.trim()) {
        return {
          success: false,
          error: StructuredError.validation(
            `${fieldName} is required and must be a non-empty string`,
            { fieldName, input: String(input) }
          ),
        };
      }

      // Basic API key format validation (starts with 'sk_' or 'pk_')
      if (!API_KEY_FORMAT.test(input)) {
        return {
          success: false,
          error: StructuredError.validation(
            `${fieldName} must be a valid API key format`,
            { fieldName, input }
          ),
        };
      }

      return { success: true, data: input };
    },

  /**
   * Validate model selection
   */
  model:
    (availableModels: string[]): ValidationFunction<string> =>
    (input) => {
      if (typeof input !== "string" || !input.trim()) {
        return {
          success: false,
          error: StructuredError.validation("Model must be a string", {
            model: input,
          }),
        };
      }

      if (!availableModels.includes(input)) {
        return {
          success: false,
          error: StructuredError.modelCompatibility(input, availableModels),
        };
      }

      return { success: true, data: input };
    },

  /**
   * Validate configuration object
   */
  config: (config: unknown): ValidationResult<Record<string, unknown>> => {
    if (typeof config !== "object" || config === null) {
      return {
        success: false,
        error: StructuredError.validation("Configuration must be an object", {
          config,
        }),
      };
    }

    return { success: true, data: config as Record<string, unknown> };
  },

  /**
   * Validate numeric field
   */
  number:
    (fieldName: string): ValidationFunction<number> =>
    (input) => {
      if (typeof input !== "number" || Number.isNaN(input) || input < 0) {
        return {
          success: false,
          error: StructuredError.validation(
            `${fieldName} must be a positive number`,
            { fieldName, input }
          ),
        };
      }

      return { success: true, data: input };
    },

  /**
   * Validate boolean field
   */
  boolean:
    (fieldName: string): ValidationFunction<boolean> =>
    (input) => {
      if (typeof input !== "boolean") {
        return {
          success: false,
          error: StructuredError.validation(`${fieldName} must be a boolean`, {
            fieldName,
            input,
          }),
        };
      }

      return { success: true, data: input };
    },

  /**
   * Validate agent configuration
   */
  validateAgentConfig: (
    config: unknown
  ): ValidationResult<Record<string, unknown>> => {
    if (typeof config !== "object" || config === null) {
      return {
        success: false,
        error: StructuredError.validation(
          "Agent configuration must be an object",
          { config }
        ),
      };
    }

    return { success: true, data: config as Record<string, unknown> };
  },
};
