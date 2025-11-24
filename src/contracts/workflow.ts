/**
 * Workflow API Contract Definitions
 * Based on contracts/workflow-api.yaml
 */

export type WorkflowStep = {
  id: string;
  name: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed" | "paused";
  input?: unknown;
  output?: unknown;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  startTime?: number;
  endTime?: number;
  duration?: number;
};

export type WorkflowPlanConfig = {
  maxSteps?: number;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
};

export type WorkflowPlan = {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  config?: WorkflowPlanConfig;
  createdAt: number;
  updatedAt: number;
  status?: "pending" | "running" | "completed" | "failed" | "paused";
};

export type CreateWorkflowPlanRequest = {
  name: string;
  description?: string;
  config?: WorkflowPlanConfig;
};

export type ExecuteWorkflowRequest = {
  agentId?: string;
  context?: Record<string, unknown>;
};

export type WorkflowExecutionStatus = {
  executionId: string;
  planId: string;
  status: "pending" | "running" | "completed" | "failed" | "paused";
  steps: WorkflowStep[];
  startedAt: number;
  currentStep?: number;
  completedAt?: number;
  estimatedCompletion?: number;
};

export type WorkflowUpdateMessage = {
  type: "step_update" | "workflow_completed" | "workflow_failed";
  executionId: string;
  stepId?: string;
  status?: string;
  output?: unknown;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: number;
};
