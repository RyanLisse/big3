/**
 * Workflow Runner Tests
 * Tests for step execution logic and parallel step support
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  WorkflowRunner,
  ExecutionContext,
  StepHandler,
  ParallelExecutionOptions,
} from '../../src/workflow/runner';
import { createWorkflowPlan, addStepToPlan, addDependencyToPlan } from '../../src/workflow/plan';

describe('WorkflowRunner', () => {
  let runner: WorkflowRunner;

  beforeEach(() => {
    runner = new WorkflowRunner();
  });

  describe('registerHandler', () => {
    it('should register a step handler', () => {
      const handler: StepHandler = async () => ({ success: true });

      runner.registerHandler('test', handler);

      expect(runner.hasHandler('test')).toBe(true);
    });

    it('should allow multiple handlers for different types', () => {
      const handler1: StepHandler = async () => ({ type: 'type1' });
      const handler2: StepHandler = async () => ({ type: 'type2' });

      runner.registerHandler('type1', handler1);
      runner.registerHandler('type2', handler2);

      expect(runner.hasHandler('type1')).toBe(true);
      expect(runner.hasHandler('type2')).toBe(true);
    });
  });

  describe('executeStep', () => {
    it('should execute a single step successfully', async () => {
      const handler: StepHandler = async (step, context) => ({
        success: true,
        stepId: step.id,
      });

      runner.registerHandler('action', handler);

      const plan = createWorkflowPlan({ name: 'Test' });
      const step = addStepToPlan(plan, {
        name: 'Test Step',
        type: 'action',
      });

      const context: ExecutionContext = {
        planId: plan.id,
        stepId: step.id,
        data: {},
      };

      const result = await runner.executeStep(step, context);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.stepId).toBe(step.id);
    });

    it('should pass input data to handler', async () => {
      const handler: StepHandler = async (step, context) => ({
        inputData: context.data,
      });

      runner.registerHandler('action', handler);

      const plan = createWorkflowPlan({ name: 'Test' });
      const step = addStepToPlan(plan, {
        name: 'Test Step',
        type: 'action',
        input: { key: 'value' },
      });

      const context: ExecutionContext = {
        planId: plan.id,
        stepId: step.id,
        data: { key: 'value' },
      };

      const result = await runner.executeStep(step, context);

      expect(result.inputData).toEqual({ key: 'value' });
    });

    it('should handle step execution errors', async () => {
      const handler: StepHandler = async () => {
        throw new Error('Handler failed');
      };

      runner.registerHandler('action', handler);

      const plan = createWorkflowPlan({ name: 'Test' });
      const step = addStepToPlan(plan, {
        name: 'Test Step',
        type: 'action',
      });

      const context: ExecutionContext = {
        planId: plan.id,
        stepId: step.id,
        data: {},
      };

      await expect(runner.executeStep(step, context)).rejects.toThrow(
        'Handler failed'
      );
    });

    it('should throw if handler is not registered', async () => {
      const plan = createWorkflowPlan({ name: 'Test' });
      const step = addStepToPlan(plan, {
        name: 'Test Step',
        type: 'unknown',
      });

      const context: ExecutionContext = {
        planId: plan.id,
        stepId: step.id,
        data: {},
      };

      await expect(runner.executeStep(step, context)).rejects.toThrow(
        'No handler registered for step type'
      );
    });
  });

  describe('executeSequentially', () => {
    it('should execute steps in order', async () => {
      const executionOrder: string[] = [];

      const handler: StepHandler = async (step) => {
        if (step.name === 'Step 1') {
          executionOrder.push('step1');
        } else if (step.name === 'Step 2') {
          executionOrder.push('step2');
        }
        return { success: true };
      };

      runner.registerHandler('action', handler);

      const plan = createWorkflowPlan({ name: 'Test' });
      const step1 = addStepToPlan(plan, {
        name: 'Step 1',
        type: 'action',
      });
      const step2 = addStepToPlan(plan, {
        name: 'Step 2',
        type: 'action',
      });

      addDependencyToPlan(plan, step2.id, step1.id);

      const context: ExecutionContext = {
        planId: plan.id,
        stepId: '',
        data: {},
      };

      await runner.executeSequentially(plan, context);

      expect(executionOrder[0]).toBe('step1');
      expect(executionOrder[1]).toBe('step2');
    });

    it('should pass output from one step to next', async () => {
      const handler: StepHandler = async (step) => {
        if (step.name === 'Step 1') {
          return { output: 'data_from_step1' };
        }
        return { receivedData: 'from_context' };
      };

      runner.registerHandler('action', handler);

      const plan = createWorkflowPlan({ name: 'Test' });
      const step1 = addStepToPlan(plan, {
        name: 'Step 1',
        type: 'action',
      });
      const step2 = addStepToPlan(plan, {
        name: 'Step 2',
        type: 'action',
      });

      addDependencyToPlan(plan, step2.id, step1.id);

      const context: ExecutionContext = {
        planId: plan.id,
        stepId: '',
        data: {},
      };

      const results = await runner.executeSequentially(plan, context);

      expect(results).toHaveLength(2);
    });

    it('should stop on first error', async () => {
      const executionOrder: string[] = [];

      const handler: StepHandler = async (step) => {
        if (step.name === 'Step 1') {
          executionOrder.push('step1');
          throw new Error('Step 1 failed');
        }
        executionOrder.push('step2');
        return { success: true };
      };

      runner.registerHandler('action', handler);

      const plan = createWorkflowPlan({ name: 'Test' });
      const step1 = addStepToPlan(plan, {
        name: 'Step 1',
        type: 'action',
      });
      const step2 = addStepToPlan(plan, {
        name: 'Step 2',
        type: 'action',
      });

      addDependencyToPlan(plan, step2.id, step1.id);

      const context: ExecutionContext = {
        planId: plan.id,
        stepId: '',
        data: {},
      };

      await expect(runner.executeSequentially(plan, context)).rejects.toThrow(
        'Step 1 failed'
      );

      expect(executionOrder).toContain('step1');
      expect(executionOrder).not.toContain('step2');
    });
  });

  describe('executeParallel', () => {
    it('should execute independent steps in parallel', async () => {
      const startTimes: Record<string, number> = {};
      const endTimes: Record<string, number> = {};

      const slowHandler: StepHandler = async (step) => {
        startTimes[step.id] = Date.now();
        await new Promise((resolve) => setTimeout(resolve, 50));
        endTimes[step.id] = Date.now();
        return { success: true };
      };

      runner.registerHandler('slow', slowHandler);

      const plan = createWorkflowPlan({ name: 'Test' });
      const step1 = addStepToPlan(plan, {
        name: 'Step 1',
        type: 'slow',
      });
      const step2 = addStepToPlan(plan, {
        name: 'Step 2',
        type: 'slow',
      });

      const context: ExecutionContext = {
        planId: plan.id,
        stepId: '',
        data: {},
      };

      const startTime = Date.now();
      await runner.executeParallel(plan, context);
      const totalTime = Date.now() - startTime;

      // If executed in parallel, should take ~50ms, not ~100ms
      expect(totalTime).toBeLessThan(100);
    });

    it('should respect max concurrency', async () => {
      const concurrent: number[] = [];
      let maxConcurrent = 0;

      const handler: StepHandler = async () => {
        concurrent.push(1);
        maxConcurrent = Math.max(maxConcurrent, concurrent.length);
        await new Promise((resolve) => setTimeout(resolve, 10));
        concurrent.pop();
        return { success: true };
      };

      runner.registerHandler('action', handler);

      const plan = createWorkflowPlan({ name: 'Test' });
      for (let i = 0; i < 5; i++) {
        addStepToPlan(plan, {
          name: `Step ${i}`,
          type: 'action',
        });
      }

      const context: ExecutionContext = {
        planId: plan.id,
        stepId: '',
        data: {},
      };

      const options: ParallelExecutionOptions = {
        maxConcurrency: 2,
      };

      await runner.executeParallel(plan, context, options);

      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });

    it('should handle errors in parallel execution', async () => {
      let successCount = 0;

      const handler1: StepHandler = async () => {
        throw new Error('Step 1 failed');
      };

      const handler2: StepHandler = async () => {
        successCount++;
        return { success: true };
      };

      runner.registerHandler('fail', handler1);
      runner.registerHandler('success', handler2);

      const plan = createWorkflowPlan({ name: 'Test' });
      addStepToPlan(plan, {
        name: 'Step 1',
        type: 'fail',
      });
      addStepToPlan(plan, {
        name: 'Step 2',
        type: 'success',
      });

      const context: ExecutionContext = {
        planId: plan.id,
        stepId: '',
        data: {},
      };

      await expect(runner.executeParallel(plan, context)).rejects.toThrow();
    });
  });

  describe('retryStep', () => {
    it('should retry a failed step', async () => {
      let attempts = 0;

      const handler: StepHandler = async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Temporary failure');
        }
        return { success: true, attempts };
      };

      runner.registerHandler('action', handler);

      const plan = createWorkflowPlan({ name: 'Test' });
      const step = addStepToPlan(plan, {
        name: 'Test Step',
        type: 'action',
      });

      const context: ExecutionContext = {
        planId: plan.id,
        stepId: step.id,
        data: {},
      };

      const result = await runner.retryStep(step, context, {
        maxRetries: 3,
        retryDelay: 10,
      });

      expect(attempts).toBe(2);
      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
    });

    it('should give up after max retries', async () => {
      let attempts = 0;

      const handler: StepHandler = async () => {
        attempts++;
        throw new Error('Persistent failure');
      };

      runner.registerHandler('action', handler);

      const plan = createWorkflowPlan({ name: 'Test' });
      const step = addStepToPlan(plan, {
        name: 'Test Step',
        type: 'action',
      });

      const context: ExecutionContext = {
        planId: plan.id,
        stepId: step.id,
        data: {},
      };

      await expect(
        runner.retryStep(step, context, {
          maxRetries: 2,
          retryDelay: 5,
        })
      ).rejects.toThrow('Persistent failure');

      expect(attempts).toBe(3); // initial + 2 retries
    });
  });
});
