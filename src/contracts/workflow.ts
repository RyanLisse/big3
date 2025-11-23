/**
 * Workflow API Contract Definitions
 * Based on contracts/workflow-api.yaml
 */

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  input?: any;
  output?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  startTime?: number;
  endTime?: number;
  duration?: number;
}

export interface WorkflowPlanConfig {
  maxSteps?: number;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface WorkflowPlan {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  config?: WorkflowPlanConfig;
  createdAt: number;
  updatedAt: number;
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
}

export interface CreateWorkflowPlanRequest {
  name: string;
  description?: string;
  config?: WorkflowPlanConfig;
}

export interface ExecuteWorkflowRequest {
  agentId?: string;
  context?: Record<string, any>;
}

export interface WorkflowExecutionStatus {
  executionId: string;
  planId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  steps: WorkflowStep[];
  startedAt: number;
  currentStep?: number;
  completedAt?: number;
  estimatedCompletion?: number;
}

export interface WorkflowUpdateMessage {
  type: 'step_update' | 'workflow_completed' | 'workflow_failed';
  executionId: string;
  stepId?: string;
  status?: string;
  output?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: number;
}
