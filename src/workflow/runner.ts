/**
 * Workflow Runner - Step execution and orchestration
 *
 * Handles step-by-step execution, parallel execution with dependency management,
 * and retry logic for autonomous workflow execution.
 */

import { WorkflowError } from '../core/errors';
import {
  WorkflowPlan,
  WorkflowStepDefinition,
  resolveDependencies,
  areAllDependenciesCompleted,
} from './plan';

export interface ExecutionContext {
  planId: string;
  stepId: string;
  data: Record<string, unknown>;
  agentId?: string;
}

export interface RetryOptions {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier?: number;
}

export interface ParallelExecutionOptions {
  maxConcurrency?: number;
  continueOnError?: boolean;
}

export type StepHandler = (
  step: WorkflowStepDefinition,
  context: ExecutionContext
) => Promise<unknown>;

/**
 * WorkflowRunner orchestrates step execution with support for sequential,
 * parallel, and retry logic.
 */
export class WorkflowRunner {
  private handlers: Map<string, StepHandler> = new Map();

  /**
   * Register a handler for a specific step type
   */
  registerHandler(stepType: string, handler: StepHandler): void {
    this.handlers.set(stepType, handler);
  }

  /**
   * Check if a handler is registered for a step type
   */
  hasHandler(stepType: string): boolean {
    return this.handlers.has(stepType);
  }

  /**
   * Execute a single step
   */
  async executeStep(
    step: WorkflowStepDefinition,
    context: ExecutionContext
  ): Promise<unknown> {
    const handler = this.handlers.get(step.type);

    if (!handler) {
      throw new WorkflowError('No handler registered for step type', {
        stepType: step.type,
        stepId: step.id,
      });
    }

    step.status = 'running';
    step.startTime = Date.now();

    try {
      const result = await handler(step, context);

      step.status = 'completed';
      step.output = result;
      step.endTime = Date.now();

      return result;
    } catch (error) {
      step.status = 'failed';
      step.error = {
        code: 'STEP_EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error,
      };
      step.endTime = Date.now();

      throw error;
    }
  }

  /**
   * Execute workflow steps sequentially, respecting dependencies
   */
  async executeSequentially(
    plan: WorkflowPlan,
    context: ExecutionContext
  ): Promise<unknown[]> {
    const ordered = resolveDependencies(plan);
    const results: unknown[] = [];

    for (const step of ordered) {
      const stepContext: ExecutionContext = {
        ...context,
        stepId: step.id,
        data: {
          ...context.data,
          previousResults: results,
          previousOutput: results[results.length - 1],
        },
      };

      const result = await this.executeStep(step, stepContext);
      results.push(result);
    }

    return results;
  }

  /**
   * Execute independent workflow steps in parallel
   */
  async executeParallel(
    plan: WorkflowPlan,
    context: ExecutionContext,
    options?: ParallelExecutionOptions
  ): Promise<unknown[]> {
    const maxConcurrency = options?.maxConcurrency ?? 5;
    const continueOnError = options?.continueOnError ?? false;

    const independent = plan.steps.filter(
      (step) => step.dependencies.length === 0
    );

    if (independent.length === 0) {
      return [];
    }

    const results: unknown[] = new Array(independent.length);
    const errors: Error[] = [];

    const executeWithSemaphore = async (
      step: WorkflowStepDefinition,
      index: number,
      semaphore: Semaphore
    ): Promise<void> => {
      await semaphore.acquire();
      try {
        const stepContext: ExecutionContext = {
          ...context,
          stepId: step.id,
          data: context.data,
        };

        results[index] = await this.executeStep(step, stepContext);
      } catch (error) {
        if (continueOnError) {
          errors.push(error instanceof Error ? error : new Error(String(error)));
        } else {
          throw error;
        }
      } finally {
        semaphore.release();
      }
    };

    const semaphore = new Semaphore(maxConcurrency);
    const promises = independent.map((step, index) =>
      executeWithSemaphore(step, index, semaphore)
    );

    await Promise.all(promises);

    if (errors.length > 0) {
      throw new WorkflowError('Parallel execution errors', {
        errorCount: errors.length,
        errors: errors.map((e) => e.message),
      });
    }

    return results;
  }

  /**
   * Retry a failed step with exponential backoff
   */
  async retryStep(
    step: WorkflowStepDefinition,
    context: ExecutionContext,
    options: RetryOptions
  ): Promise<unknown> {
    let lastError: Error | null = null;
    const backoffMultiplier = options.backoffMultiplier ?? 2;
    let delay = options.retryDelay;

    for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
      try {
        step.status = 'pending';
        return await this.executeStep(step, context);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < options.maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= backoffMultiplier;
        }
      }
    }

    throw lastError;
  }

  /**
   * Execute a step with timeout
   */
  async executeWithTimeout(
    step: WorkflowStepDefinition,
    context: ExecutionContext,
    timeout: number
  ): Promise<unknown> {
    return Promise.race([
      this.executeStep(step, context),
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new WorkflowError('Step execution timeout', {
                stepId: step.id,
                timeout,
              })
            ),
          timeout
        )
      ),
    ]);
  }

  /**
   * Get execution status for a step
   */
  getStepStatus(step: WorkflowStepDefinition): {
    id: string;
    status: string;
    startTime?: number;
    endTime?: number;
    duration?: number;
  } {
    const duration =
      step.startTime && step.endTime ? step.endTime - step.startTime : undefined;

    return {
      id: step.id,
      status: step.status,
      startTime: step.startTime,
      endTime: step.endTime,
      duration,
    };
  }

  /**
   * Get execution progress for a plan
   */
  getPlanProgress(plan: WorkflowPlan): {
    total: number;
    completed: number;
    failed: number;
    pending: number;
    running: number;
    percentage: number;
  } {
    const total = plan.steps.length;
    const completed = plan.steps.filter((s) => s.status === 'completed').length;
    const failed = plan.steps.filter((s) => s.status === 'failed').length;
    const pending = plan.steps.filter((s) => s.status === 'pending').length;
    const running = plan.steps.filter((s) => s.status === 'running').length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      failed,
      pending,
      running,
      percentage,
    };
  }
}

/**
 * Simple semaphore for controlling concurrency
 */
class Semaphore {
  private permits: number;
  private waiting: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise<void>((resolve) => {
      this.waiting.push(resolve);
    });
  }

  release(): void {
    this.permits++;

    const resolve = this.waiting.shift();
    if (resolve) {
      this.permits--;
      resolve();
    }
  }
}
