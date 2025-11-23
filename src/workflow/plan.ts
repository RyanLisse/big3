/**
 * Workflow Plan - Format definition and execution semantics
 *
 * Defines workflow plan structure, step management, and dependency resolution
 * for autonomous AI agent workflow execution.
 */

import { WorkflowError } from '../core/errors';

export type StepType = 'action' | 'agent_init' | 'model_validation' | 'checkpoint' | 'recovery';

export interface WorkflowStepInput {
  name: string;
  description?: string;
  type: StepType;
  input?: Record<string, unknown>;
  config?: Record<string, unknown>;
}

export interface WorkflowStepDefinition extends WorkflowStepInput {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  dependencies: string[];
  output?: unknown;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  startTime?: number;
  endTime?: number;
}

export interface PlanConfig {
  maxSteps?: number;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface WorkflowPlanInput {
  name: string;
  description?: string;
  config?: PlanConfig;
  context?: Record<string, unknown>;
}

export interface WorkflowPlan {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStepDefinition[];
  config: Required<PlanConfig>;
  context: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface WorkflowPlanDefinition {
  name: string;
  description?: string;
  steps: WorkflowStepInput[];
  config?: PlanConfig;
  context?: Record<string, unknown>;
}

const VALID_STEP_TYPES: StepType[] = [
  'action',
  'agent_init',
  'model_validation',
  'checkpoint',
  'recovery',
];

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function isValidStepType(type: string): type is StepType {
  return VALID_STEP_TYPES.includes(type as StepType);
}

/**
 * Create a new workflow plan
 */
export function createWorkflowPlan(input: WorkflowPlanInput): WorkflowPlan {
  return {
    id: generateId('plan'),
    name: input.name,
    description: input.description || '',
    steps: [],
    config: {
      maxSteps: input.config?.maxSteps ?? 100,
      timeout: input.config?.timeout ?? 300000,
      retryAttempts: input.config?.retryAttempts ?? 3,
      retryDelay: input.config?.retryDelay ?? 1000,
    },
    context: input.context || {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Add a step to a workflow plan
 */
export function addStepToPlan(
  plan: WorkflowPlan,
  stepInput: WorkflowStepInput
): WorkflowStepDefinition {
  if (plan.steps.length >= plan.config.maxSteps) {
    throw new WorkflowError('Plan exceeds maximum step limit', {
      maxSteps: plan.config.maxSteps,
      currentSteps: plan.steps.length,
    });
  }

  const step: WorkflowStepDefinition = {
    ...stepInput,
    id: generateId('step'),
    status: 'pending',
    dependencies: [],
  };

  plan.steps.push(step);
  plan.updatedAt = Date.now();

  return step;
}

/**
 * Add a dependency between steps
 */
export function addDependencyToPlan(
  plan: WorkflowPlan,
  dependentStepId: string,
  dependencyStepId: string
): void {
  const dependentStep = plan.steps.find((s) => s.id === dependentStepId);
  const dependencyStep = plan.steps.find((s) => s.id === dependencyStepId);

  if (!dependentStep) {
    throw new WorkflowError('Dependent step not found', {
      stepId: dependentStepId,
    });
  }

  if (!dependencyStep) {
    throw new WorkflowError('Dependency step not found', {
      stepId: dependencyStepId,
    });
  }

  // Check for circular dependency - would the dependency already depend on dependent?
  if (wouldCreateCircularDependency(plan, dependentStepId, dependencyStepId)) {
    throw new WorkflowError('Circular dependency detected', {
      dependent: dependentStepId,
      dependency: dependencyStepId,
    });
  }

  if (!dependentStep.dependencies.includes(dependencyStepId)) {
    dependentStep.dependencies.push(dependencyStepId);
  }

  plan.updatedAt = Date.now();
}

/**
 * Check if adding a dependency would create a circular reference
 */
function wouldCreateCircularDependency(
  plan: WorkflowPlan,
  fromStepId: string,
  toStepId: string
): boolean {
  const visited = new Set<string>();

  function hasCycle(stepId: string): boolean {
    if (stepId === fromStepId) {
      return true;
    }

    if (visited.has(stepId)) {
      return false;
    }

    visited.add(stepId);

    const step = plan.steps.find((s) => s.id === stepId);
    if (step) {
      for (const depId of step.dependencies) {
        if (hasCycle(depId)) {
          return true;
        }
      }
    }

    return false;
  }

  return hasCycle(toStepId);
}

/**
 * Resolve step dependencies and return execution order (topological sort)
 */
export function resolveDependencies(plan: WorkflowPlan): WorkflowStepDefinition[] {
  const visited = new Set<string>();
  const result: WorkflowStepDefinition[] = [];
  const visiting = new Set<string>();
  const MAX_DEPTH = plan.steps.length + 10;

  function visit(stepId: string, depth: number = 0): void {
    if (depth > MAX_DEPTH) {
      throw new WorkflowError('Circular dependency detected - maximum recursion depth exceeded', {
        stepId,
      });
    }

    if (visited.has(stepId)) {
      return;
    }

    if (visiting.has(stepId)) {
      throw new WorkflowError('Circular dependency detected', {
        stepId,
      });
    }

    visiting.add(stepId);

    const step = plan.steps.find((s) => s.id === stepId);
    if (!step) {
      throw new WorkflowError('Step not found', { stepId });
    }

    for (const depId of step.dependencies) {
      visit(depId, depth + 1);
    }

    visiting.delete(stepId);
    visited.add(stepId);
    result.push(step);
  }

  for (const step of plan.steps) {
    visit(step.id);
  }

  return result;
}

/**
 * Validate a workflow plan definition
 */
export function validatePlanDefinition(definition: WorkflowPlanDefinition): void {
  if (!definition.name || typeof definition.name !== 'string') {
    throw new WorkflowError('Plan name is required and must be a string');
  }

  if (!Array.isArray(definition.steps) || definition.steps.length === 0) {
    throw new WorkflowError('Plan must have at least one step');
  }

  for (const step of definition.steps) {
    if (!step.name || typeof step.name !== 'string') {
      throw new WorkflowError('Step name is required and must be a string');
    }

    if (!isValidStepType(step.type)) {
      throw new WorkflowError('Invalid step type', {
        stepType: step.type,
        validTypes: VALID_STEP_TYPES,
      });
    }
  }
}

/**
 * Create a plan from a definition
 */
export function createPlanFromDefinition(definition: WorkflowPlanDefinition): WorkflowPlan {
  validatePlanDefinition(definition);

  const plan = createWorkflowPlan({
    name: definition.name,
    description: definition.description,
    config: definition.config,
    context: definition.context,
  });

  const stepIdMap = new Map<string, string>();

  for (const stepInput of definition.steps) {
    const step = addStepToPlan(plan, stepInput);
    stepIdMap.set(stepInput.name, step.id);
  }

  return plan;
}

/**
 * Get steps that depend on a given step
 */
export function getDependentSteps(
  plan: WorkflowPlan,
  stepId: string
): WorkflowStepDefinition[] {
  return plan.steps.filter((s) => s.dependencies.includes(stepId));
}

/**
 * Get all steps that a given step depends on
 */
export function getDependencies(
  plan: WorkflowPlan,
  stepId: string
): WorkflowStepDefinition[] {
  const step = plan.steps.find((s) => s.id === stepId);
  if (!step) {
    return [];
  }

  return step.dependencies
    .map((depId) => plan.steps.find((s) => s.id === depId))
    .filter((s): s is WorkflowStepDefinition => s !== undefined);
}

/**
 * Check if all dependencies of a step are completed
 */
export function areAllDependenciesCompleted(
  plan: WorkflowPlan,
  stepId: string
): boolean {
  const step = plan.steps.find((s) => s.id === stepId);
  if (!step) {
    return false;
  }

  return step.dependencies.every((depId) => {
    const depStep = plan.steps.find((s) => s.id === depId);
    return depStep && depStep.status === 'completed';
  });
}
