/**
 * Workflow Plan Tests
 * Tests for workflow plan format definition and execution semantics
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  WorkflowPlan,
  WorkflowPlanDefinition,
  createWorkflowPlan,
  validatePlanDefinition,
  addStepToPlan,
  addDependencyToPlan,
  resolveDependencies,
} from '../../src/workflow/plan';

describe('WorkflowPlan', () => {
  let plan: WorkflowPlan;

  beforeEach(() => {
    plan = createWorkflowPlan({
      name: 'Test Workflow',
      description: 'A test workflow plan',
    });
  });

  describe('createWorkflowPlan', () => {
    it('should create a plan with default config', () => {
      expect(plan).toBeDefined();
      expect(plan.id).toMatch(/^plan_/);
      expect(plan.name).toBe('Test Workflow');
      expect(plan.description).toBe('A test workflow plan');
      expect(plan.steps).toEqual([]);
      expect(plan.config).toBeDefined();
      expect(plan.config.maxSteps).toBe(100);
      expect(plan.config.timeout).toBe(300000);
      expect(plan.config.retryAttempts).toBe(3);
      expect(plan.config.retryDelay).toBe(1000);
    });

    it('should create a plan with custom config', () => {
      const customPlan = createWorkflowPlan({
        name: 'Custom',
        config: {
          maxSteps: 50,
          timeout: 600000,
          retryAttempts: 5,
          retryDelay: 2000,
        },
      });

      expect(customPlan.config.maxSteps).toBe(50);
      expect(customPlan.config.timeout).toBe(600000);
      expect(customPlan.config.retryAttempts).toBe(5);
      expect(customPlan.config.retryDelay).toBe(2000);
    });

    it('should initialize with empty steps', () => {
      expect(plan.steps).toEqual([]);
    });
  });

  describe('addStepToPlan', () => {
    it('should add a step to the plan', () => {
      const step = addStepToPlan(plan, {
        name: 'Initialize Agent',
        description: 'Initialize AI agent',
        type: 'agent_init',
      });

      expect(plan.steps).toHaveLength(1);
      expect(step.id).toMatch(/^step_/);
      expect(step.name).toBe('Initialize Agent');
      expect(step.type).toBe('agent_init');
      expect(step.status).toBe('pending');
      expect(step.dependencies).toEqual([]);
    });

    it('should add multiple steps in sequence', () => {
      const step1 = addStepToPlan(plan, {
        name: 'Step 1',
        type: 'action',
      });

      const step2 = addStepToPlan(plan, {
        name: 'Step 2',
        type: 'action',
      });

      expect(plan.steps).toHaveLength(2);
      expect(plan.steps[0].id).toBe(step1.id);
      expect(plan.steps[1].id).toBe(step2.id);
    });

    it('should throw if plan exceeds maxSteps', () => {
      const smallPlan = createWorkflowPlan({
        name: 'Small',
        config: { maxSteps: 2 },
      });

      addStepToPlan(smallPlan, { name: 'Step 1', type: 'action' });
      addStepToPlan(smallPlan, { name: 'Step 2', type: 'action' });

      expect(() => {
        addStepToPlan(smallPlan, { name: 'Step 3', type: 'action' });
      }).toThrow('Plan exceeds maximum step limit');
    });
  });

  describe('addDependencyToPlan', () => {
    it('should add a dependency between steps', () => {
      const step1 = addStepToPlan(plan, {
        name: 'Step 1',
        type: 'action',
      });

      const step2 = addStepToPlan(plan, {
        name: 'Step 2',
        type: 'action',
      });

      addDependencyToPlan(plan, step2.id, step1.id);

      const updatedStep2 = plan.steps.find((s) => s.id === step2.id)!;
      expect(updatedStep2.dependencies).toContain(step1.id);
    });

    it('should prevent circular dependencies', () => {
      const step1 = addStepToPlan(plan, {
        name: 'Step 1',
        type: 'action',
      });

      const step2 = addStepToPlan(plan, {
        name: 'Step 2',
        type: 'action',
      });

      addDependencyToPlan(plan, step2.id, step1.id);

      expect(() => {
        addDependencyToPlan(plan, step1.id, step2.id);
      }).toThrow('Circular dependency detected');
    });

    it('should throw if referenced step does not exist', () => {
      const step1 = addStepToPlan(plan, {
        name: 'Step 1',
        type: 'action',
      });

      expect(() => {
        addDependencyToPlan(plan, step1.id, 'nonexistent');
      }).toThrow('Dependency step not found');
    });
  });

  describe('resolveDependencies', () => {
    it('should return steps in execution order', () => {
      const step1 = addStepToPlan(plan, {
        name: 'Step 1',
        type: 'action',
      });

      const step2 = addStepToPlan(plan, {
        name: 'Step 2',
        type: 'action',
      });

      const step3 = addStepToPlan(plan, {
        name: 'Step 3',
        type: 'action',
      });

      addDependencyToPlan(plan, step2.id, step1.id);
      addDependencyToPlan(plan, step3.id, step2.id);

      const ordered = resolveDependencies(plan);

      expect(ordered[0].id).toBe(step1.id);
      expect(ordered[1].id).toBe(step2.id);
      expect(ordered[2].id).toBe(step3.id);
    });

    it('should handle independent parallel steps', () => {
      const step1 = addStepToPlan(plan, {
        name: 'Step 1',
        type: 'action',
      });

      const step2 = addStepToPlan(plan, {
        name: 'Step 2',
        type: 'action',
      });

      const ordered = resolveDependencies(plan);

      expect(ordered).toHaveLength(2);
      expect(ordered.map((s) => s.id)).toContain(step1.id);
      expect(ordered.map((s) => s.id)).toContain(step2.id);
    });

    it('should throw on circular dependencies', () => {
      const step1 = addStepToPlan(plan, {
        name: 'Step 1',
        type: 'action',
      });

      const step2 = addStepToPlan(plan, {
        name: 'Step 2',
        type: 'action',
      });

      addDependencyToPlan(plan, step2.id, step1.id);
      // Manually inject circular reference
      plan.steps[0].dependencies = [step2.id];

      expect(() => {
        resolveDependencies(plan);
      }).toThrow('Circular dependency detected');
    });
  });

  describe('validatePlanDefinition', () => {
    it('should validate a valid plan definition', () => {
      const definition: WorkflowPlanDefinition = {
        name: 'Valid Plan',
        description: 'A valid plan',
        steps: [
          {
            name: 'Step 1',
            type: 'action',
            description: 'First step',
          },
        ],
      };

      expect(() => {
        validatePlanDefinition(definition);
      }).not.toThrow();
    });

    it('should reject a plan without name', () => {
      const definition = {
        description: 'Invalid plan',
        steps: [],
      } as unknown as WorkflowPlanDefinition;

      expect(() => {
        validatePlanDefinition(definition);
      }).toThrow();
    });

    it('should reject a plan without steps', () => {
      const definition = {
        name: 'Invalid Plan',
        description: 'No steps',
      } as unknown as WorkflowPlanDefinition;

      expect(() => {
        validatePlanDefinition(definition);
      }).toThrow();
    });

    it('should reject steps with invalid types', () => {
      const definition = {
        name: 'Invalid Plan',
        steps: [
          {
            name: 'Step 1',
            type: 'invalid_type',
          },
        ],
      } as unknown as WorkflowPlanDefinition;

      expect(() => {
        validatePlanDefinition(definition);
      }).toThrow();
    });
  });
});
