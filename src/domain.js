export class AgentError {
  message;
  cause;
  code;
  details;
  _tag = "AgentError";
  constructor(message, cause, code, details) {
    this.message = message;
    this.cause = cause;
    this.code = code;
    this.details = details;
  }
}
// Error Classes
export class MultiAgentError extends Error {
  cause;
  _tag = "MultiAgentError";
  constructor(message, cause) {
    super(message);
    this.cause = cause;
    this.name = "MultiAgentError";
  }
}
export class TeamNotFoundError extends MultiAgentError {
  _tag = "TeamNotFoundError";
  constructor(teamId) {
    super(`Team not found: ${teamId}`);
    this.name = "TeamNotFoundError";
  }
}
export class AgentNotFoundError extends MultiAgentError {
  _tag = "AgentNotFoundError";
  constructor(agentId) {
    super(`Agent not found: ${agentId}`);
    this.name = "AgentNotFoundError";
  }
}
export class MemoryAccessDeniedError extends MultiAgentError {
  _tag = "MemoryAccessDeniedError";
  constructor(agentId, memoryId) {
    super(`Access denied for agent ${agentId} to memory ${memoryId}`);
    this.name = "MemoryAccessDeniedError";
  }
}
export class MessageDeliveryError extends MultiAgentError {
  _tag = "MessageDeliveryError";
  constructor(messageId, reason) {
    super(`Message delivery failed for ${messageId}: ${reason}`);
    this.name = "MessageDeliveryError";
  }
}
export class ToolRuleViolationError extends MultiAgentError {
  _tag = "ToolRuleViolationError";
  constructor(toolName, ruleName) {
    super(`Tool ${toolName} violates rule ${ruleName}`);
    this.name = "ToolRuleViolationError";
  }
}
export class ValidationError extends MultiAgentError {
  _tag = "ValidationError";
  errors;
  constructor(message, errors = []) {
    super(message);
    this.name = "ValidationError";
    this.errors = errors;
  }
}
//# sourceMappingURL=domain.js.map
