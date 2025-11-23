/**
 * Workflow Recovery Tests
 * Tests for checkpointing mechanism and state persistence
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  WorkflowCheckpoint,
  CheckpointStore,
  createCheckpoint,
  saveCheckpoint,
  loadCheckpoint,
  RecoveryManager,
} from '../../src/workflow/recovery';
import { createWorkflowPlan, addStepToPlan } from '../../src/workflow/plan';

describe('Checkpoint Management', () => {
  let store: CheckpointStore;

  beforeEach(() => {
    store = new Map();
  });

  describe('createCheckpoint', () => {
    it('should create a checkpoint with current state', () => {
      const plan = createWorkflowPlan({ name: 'Test' });
      const step = addStepToPlan(plan, { name: 'Step 1', type: 'action' });

      const checkpoint = createCheckpoint(plan, [step], {
        lastCompletedStepId: step.id,
        executionTime: 100,
      });

      expect(checkpoint).toBeDefined();
      expect(checkpoint.id).toMatch(/^ckpt_/);
      expect(checkpoint.planId).toBe(plan.id);
      expect(checkpoint.completedSteps).toContain(step.id);
      expect(checkpoint.timestamp).toBeDefined();
      expect(checkpoint.metadata.lastCompletedStepId).toBe(step.id);
      expect(checkpoint.metadata.executionTime).toBe(100);
    });

    it('should include multiple completed steps', () => {
      const plan = createWorkflowPlan({ name: 'Test' });
      const step1 = addStepToPlan(plan, { name: 'Step 1', type: 'action' });
      const step2 = addStepToPlan(plan, { name: 'Step 2', type: 'action' });

      const checkpoint = createCheckpoint(plan, [step1, step2], {});

      expect(checkpoint.completedSteps).toContain(step1.id);
      expect(checkpoint.completedSteps).toContain(step2.id);
      expect(checkpoint.completedSteps).toHaveLength(2);
    });

    it('should preserve plan state at checkpoint time', () => {
      const plan = createWorkflowPlan({ name: 'Test' });
      const step1 = addStepToPlan(plan, { name: 'Step 1', type: 'action' });

      const checkpoint = createCheckpoint(plan, [step1], {
        planSnapshot: { stepsCompleted: 1 },
      });

      expect(checkpoint.metadata.planSnapshot).toEqual({ stepsCompleted: 1 });
    });
  });

  describe('saveCheckpoint', () => {
    it('should save checkpoint to store', async () => {
      const plan = createWorkflowPlan({ name: 'Test' });
      const step = addStepToPlan(plan, { name: 'Step 1', type: 'action' });

      const checkpoint = createCheckpoint(plan, [step], {});

      await saveCheckpoint(store, checkpoint);

      expect(store.has(checkpoint.id)).toBe(true);
      expect(store.get(checkpoint.id)).toEqual(checkpoint);
    });

    it('should overwrite existing checkpoint with same id', async () => {
      const plan = createWorkflowPlan({ name: 'Test' });
      const step1 = addStepToPlan(plan, { name: 'Step 1', type: 'action' });
      const step2 = addStepToPlan(plan, { name: 'Step 2', type: 'action' });

      const checkpoint1 = createCheckpoint(plan, [step1], { version: 1 });
      const checkpoint2 = createCheckpoint(plan, [step1, step2], { version: 2 });
      checkpoint2.id = checkpoint1.id;

      await saveCheckpoint(store, checkpoint1);
      await saveCheckpoint(store, checkpoint2);

      expect(store.size).toBe(1);
      expect(store.get(checkpoint1.id)!.metadata.version).toBe(2);
    });
  });

  describe('loadCheckpoint', () => {
    it('should load checkpoint from store', async () => {
      const plan = createWorkflowPlan({ name: 'Test' });
      const step = addStepToPlan(plan, { name: 'Step 1', type: 'action' });

      const checkpoint = createCheckpoint(plan, [step], {});
      await saveCheckpoint(store, checkpoint);

      const loaded = await loadCheckpoint(store, checkpoint.id);

      expect(loaded).toBeDefined();
      expect(loaded!.id).toBe(checkpoint.id);
      expect(loaded!.planId).toBe(checkpoint.planId);
    });

    it('should return null if checkpoint does not exist', async () => {
      const loaded = await loadCheckpoint(store, 'nonexistent');

      expect(loaded).toBeNull();
    });

    it('should preserve metadata on load', async () => {
      const plan = createWorkflowPlan({ name: 'Test' });
      const step = addStepToPlan(plan, { name: 'Step 1', type: 'action' });

      const checkpoint = createCheckpoint(plan, [step], {
        customField: 'custom_value',
        nested: { field: 'value' },
      });
      await saveCheckpoint(store, checkpoint);

      const loaded = await loadCheckpoint(store, checkpoint.id);

      expect(loaded!.metadata.customField).toBe('custom_value');
      expect(loaded!.metadata.nested.field).toBe('value');
    });
  });
});

describe('RecoveryManager', () => {
  let manager: RecoveryManager;
  let store: CheckpointStore;

  beforeEach(() => {
    store = new Map();
    manager = new RecoveryManager(store);
  });

  describe('createRecoveryPoint', () => {
    it('should create and store a recovery point', async () => {
      const plan = createWorkflowPlan({ name: 'Test' });
      const step = addStepToPlan(plan, { name: 'Step 1', type: 'action' });

      const checkpoint = await manager.createRecoveryPoint(plan, [step], {
        reason: 'periodic',
      });

      expect(checkpoint).toBeDefined();
      expect(checkpoint.id).toMatch(/^ckpt_/);

      const loaded = await loadCheckpoint(store, checkpoint.id);
      expect(loaded).toBeDefined();
    });

    it('should include reason in metadata', async () => {
      const plan = createWorkflowPlan({ name: 'Test' });
      const step = addStepToPlan(plan, { name: 'Step 1', type: 'action' });

      const checkpoint = await manager.createRecoveryPoint(plan, [step], {
        reason: 'error_recovery',
      });

      expect(checkpoint.metadata.reason).toBe('error_recovery');
    });
  });

  describe('getLatestCheckpoint', () => {
    it('should return the most recent checkpoint', async () => {
      const plan = createWorkflowPlan({ name: 'Test' });
      const step1 = addStepToPlan(plan, { name: 'Step 1', type: 'action' });
      const step2 = addStepToPlan(plan, { name: 'Step 2', type: 'action' });

      const ckpt1 = await manager.createRecoveryPoint(plan, [step1], {});
      await new Promise((resolve) => setTimeout(resolve, 10));
      const ckpt2 = await manager.createRecoveryPoint(plan, [step1, step2], {});

      const latest = await manager.getLatestCheckpoint(plan.id);

      expect(latest!.id).toBe(ckpt2.id);
      expect(latest!.completedSteps).toContain(step2.id);
    });

    it('should return null if no checkpoints exist', async () => {
      const plan = createWorkflowPlan({ name: 'Test' });

      const latest = await manager.getLatestCheckpoint(plan.id);

      expect(latest).toBeNull();
    });
  });

  describe('getPreviousCheckpoints', () => {
    it('should return all checkpoints for a plan', async () => {
      const plan = createWorkflowPlan({ name: 'Test' });
      const step = addStepToPlan(plan, { name: 'Step 1', type: 'action' });

      await manager.createRecoveryPoint(plan, [step], { version: 1 });
      await new Promise((resolve) => setTimeout(resolve, 5));
      await manager.createRecoveryPoint(plan, [step], { version: 2 });

      const checkpoints = await manager.getPreviousCheckpoints(plan.id);

      expect(checkpoints.length).toBe(2);
      expect(checkpoints[0].metadata.version).toBe(1);
      expect(checkpoints[1].metadata.version).toBe(2);
    });

    it('should return checkpoints sorted by timestamp', async () => {
      const plan = createWorkflowPlan({ name: 'Test' });
      const step = addStepToPlan(plan, { name: 'Step 1', type: 'action' });

      const ckpt1 = await manager.createRecoveryPoint(plan, [step], {});
      await new Promise((resolve) => setTimeout(resolve, 10));
      const ckpt2 = await manager.createRecoveryPoint(plan, [step], {});

      const checkpoints = await manager.getPreviousCheckpoints(plan.id);

      expect(checkpoints[0].timestamp).toBeLessThanOrEqual(
        checkpoints[1].timestamp
      );
    });
  });

  describe('rollbackToCheckpoint', () => {
    it('should identify remaining steps after rollback', async () => {
      const plan = createWorkflowPlan({ name: 'Test' });
      const step1 = addStepToPlan(plan, { name: 'Step 1', type: 'action' });
      const step2 = addStepToPlan(plan, { name: 'Step 2', type: 'action' });
      const step3 = addStepToPlan(plan, { name: 'Step 3', type: 'action' });

      const checkpoint = await manager.createRecoveryPoint(
        plan,
        [step1, step2],
        {}
      );

      const remaining = await manager.getRemainingSteps(checkpoint, plan);

      expect(remaining).toContain(step3);
      expect(remaining).not.toContain(step1);
      expect(remaining).not.toContain(step2);
    });
  });

  describe('deleteCheckpoint', () => {
    it('should delete a checkpoint', async () => {
      const plan = createWorkflowPlan({ name: 'Test' });
      const step = addStepToPlan(plan, { name: 'Step 1', type: 'action' });

      const checkpoint = await manager.createRecoveryPoint(plan, [step], {});

      await manager.deleteCheckpoint(checkpoint.id);

      const loaded = await loadCheckpoint(store, checkpoint.id);
      expect(loaded).toBeNull();
    });

    it('should not throw if checkpoint does not exist', async () => {
      await expect(
        manager.deleteCheckpoint('nonexistent')
      ).resolves.not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should delete old checkpoints', async () => {
      const plan = createWorkflowPlan({ name: 'Test' });
      const step = addStepToPlan(plan, { name: 'Step 1', type: 'action' });

      const ckpt1 = await manager.createRecoveryPoint(plan, [step], {});
      await new Promise((resolve) => setTimeout(resolve, 50));
      const ckpt2 = await manager.createRecoveryPoint(plan, [step], {});

      await manager.cleanupOldCheckpoints(plan.id, { maxAge: 30 });

      const remaining = await manager.getPreviousCheckpoints(plan.id);

      expect(remaining.some((c) => c.id === ckpt1.id)).toBe(false);
      expect(remaining.some((c) => c.id === ckpt2.id)).toBe(true);
    });

    it('should keep specified number of recent checkpoints', async () => {
      const plan = createWorkflowPlan({ name: 'Test' });
      const step = addStepToPlan(plan, { name: 'Step 1', type: 'action' });

      const ckpt1 = await manager.createRecoveryPoint(plan, [step], {});
      const ckpt2 = await manager.createRecoveryPoint(plan, [step], {});
      const ckpt3 = await manager.createRecoveryPoint(plan, [step], {});

      await manager.cleanupOldCheckpoints(plan.id, { keep: 2 });

      const remaining = await manager.getPreviousCheckpoints(plan.id);

      expect(remaining.length).toBeLessThanOrEqual(2);
      expect(remaining.some((c) => c.id === ckpt3.id)).toBe(true);
    });
  });
});
