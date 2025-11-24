/**
 * Workflow Recovery - Checkpointing and state persistence
 *
 * Implements checkpoint creation, storage, and recovery mechanisms for
 * resilient autonomous workflow execution with state recovery.
 */

import { WorkflowError } from "../core/errors";
import type { WorkflowPlan, WorkflowStepDefinition } from "./plan";

export type WorkflowCheckpoint = {
  id: string;
  planId: string;
  completedSteps: string[];
  timestamp: number;
  metadata: Record<string, unknown>;
};

export type CheckpointStore = Map<string, WorkflowCheckpoint>;

export type CleanupOptions = {
  maxAge?: number;
  keep?: number;
};

/**
 * Create a checkpoint representing current plan state
 */
export function createCheckpoint(
  plan: WorkflowPlan,
  completedSteps: WorkflowStepDefinition[],
  metadata: Record<string, unknown> = {}
): WorkflowCheckpoint {
  return {
    id: `ckpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    planId: plan.id,
    completedSteps: completedSteps.map((s) => s.id),
    timestamp: Date.now(),
    metadata,
  };
}

/**
 * Save a checkpoint to the store
 */
export async function saveCheckpoint(
  store: CheckpointStore,
  checkpoint: WorkflowCheckpoint
): Promise<void> {
  store.set(checkpoint.id, checkpoint);
}

/**
 * Load a checkpoint from the store
 */
export async function loadCheckpoint(
  store: CheckpointStore,
  checkpointId: string
): Promise<WorkflowCheckpoint | null> {
  return store.get(checkpointId) ?? null;
}

/**
 * RecoveryManager handles checkpoint lifecycle and recovery operations
 */
export class RecoveryManager {
  private readonly store: CheckpointStore;

  constructor(store: CheckpointStore) {
    this.store = store;
  }

  /**
   * Create and persist a recovery point
   */
  async createRecoveryPoint(
    plan: WorkflowPlan,
    completedSteps: WorkflowStepDefinition[],
    metadata: Record<string, unknown> = {}
  ): Promise<WorkflowCheckpoint> {
    const checkpoint = createCheckpoint(plan, completedSteps, metadata);
    await saveCheckpoint(this.store, checkpoint);
    return checkpoint;
  }

  /**
   * Get the most recent checkpoint for a plan
   */
  async getLatestCheckpoint(
    planId: string
  ): Promise<WorkflowCheckpoint | null> {
    let latest: WorkflowCheckpoint | null = null;
    let latestTime = 0;

    for (const checkpoint of this.store.values()) {
      if (checkpoint.planId === planId && checkpoint.timestamp > latestTime) {
        latest = checkpoint;
        latestTime = checkpoint.timestamp;
      }
    }

    return latest;
  }

  /**
   * Get all checkpoints for a plan, sorted by timestamp
   */
  async getPreviousCheckpoints(planId: string): Promise<WorkflowCheckpoint[]> {
    const checkpoints: WorkflowCheckpoint[] = [];

    for (const checkpoint of this.store.values()) {
      if (checkpoint.planId === planId) {
        checkpoints.push(checkpoint);
      }
    }

    return checkpoints.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get steps that need to be executed after a checkpoint
   */
  async getRemainingSteps(
    checkpoint: WorkflowCheckpoint,
    plan: WorkflowPlan
  ): Promise<WorkflowStepDefinition[]> {
    const completedStepIds = new Set(checkpoint.completedSteps);

    return plan.steps.filter((step) => !completedStepIds.has(step.id));
  }

  /**
   * Restore plan state from a checkpoint
   */
  async restoreFromCheckpoint(
    checkpoint: WorkflowCheckpoint,
    plan: WorkflowPlan
  ): Promise<void> {
    const completedStepIds = new Set(checkpoint.completedSteps);

    for (const step of plan.steps) {
      if (completedStepIds.has(step.id)) {
        step.status = "completed";
      } else {
        step.status = "pending";
      }
    }

    plan.updatedAt = Date.now();
  }

  /**
   * Create periodic checkpoints during execution
   */
  async createPeriodicCheckpoint(
    plan: WorkflowPlan,
    completedSteps: WorkflowStepDefinition[],
    interval = 60_000
  ): Promise<WorkflowCheckpoint> {
    return this.createRecoveryPoint(plan, completedSteps, {
      reason: "periodic",
      interval,
    });
  }

  /**
   * Create error recovery checkpoint
   */
  async createErrorCheckpoint(
    plan: WorkflowPlan,
    completedSteps: WorkflowStepDefinition[],
    error: Error
  ): Promise<WorkflowCheckpoint> {
    return this.createRecoveryPoint(plan, completedSteps, {
      reason: "error_recovery",
      error: error.message,
      timestamp: Date.now(),
    });
  }

  /**
   * Delete a checkpoint
   */
  async deleteCheckpoint(checkpointId: string): Promise<void> {
    this.store.delete(checkpointId);
  }

  /**
   * Cleanup old checkpoints based on age or count
   */
  async cleanupOldCheckpoints(
    planId: string,
    options: CleanupOptions = {}
  ): Promise<void> {
    const checkpoints = await this.getPreviousCheckpoints(planId);

    if (checkpoints.length === 0) {
      return;
    }

    const maxAge = options.maxAge ?? Number.POSITIVE_INFINITY;
    const keep = options.keep ?? Number.POSITIVE_INFINITY;

    const now = Date.now();
    const toDelete: string[] = [];

    for (let i = 0; i < checkpoints.length; i++) {
      const checkpoint = checkpoints[i];
      const age = now - checkpoint.timestamp;

      // Delete if older than maxAge
      if (age > maxAge) {
        toDelete.push(checkpoint.id);
        continue;
      }

      // Keep only the most recent `keep` checkpoints
      if (checkpoints.length - i > keep) {
        toDelete.push(checkpoint.id);
      }
    }

    for (const id of toDelete) {
      await this.deleteCheckpoint(id);
    }
  }

  /**
   * Get checkpoint statistics for a plan
   */
  async getCheckpointStats(planId: string): Promise<{
    totalCheckpoints: number;
    oldestCheckpoint?: number;
    newestCheckpoint?: number;
    averageAge: number;
  }> {
    const checkpoints = await this.getPreviousCheckpoints(planId);

    if (checkpoints.length === 0) {
      return {
        totalCheckpoints: 0,
        averageAge: 0,
      };
    }

    const now = Date.now();
    const ages = checkpoints.map((c) => now - c.timestamp);
    const averageAge = ages.reduce((a, b) => a + b, 0) / ages.length;

    return {
      totalCheckpoints: checkpoints.length,
      oldestCheckpoint: checkpoints[0].timestamp,
      newestCheckpoint: checkpoints.at(-1)?.timestamp ?? Date.now(),
      averageAge,
    };
  }

  /**
   * Validate checkpoint integrity
   */
  async validateCheckpoint(
    checkpoint: WorkflowCheckpoint,
    plan: WorkflowPlan
  ): Promise<boolean> {
    // Verify all completed step IDs exist in plan
    const stepIds = new Set(plan.steps.map((s) => s.id));

    for (const stepId of checkpoint.completedSteps) {
      if (!stepIds.has(stepId)) {
        return false;
      }
    }

    // Verify checkpoint belongs to this plan
    if (checkpoint.planId !== plan.id) {
      return false;
    }

    // Verify checkpoint timestamp is reasonable
    if (checkpoint.timestamp > Date.now() || checkpoint.timestamp < 0) {
      return false;
    }

    return true;
  }

  /**
   * Export checkpoint to JSON
   */
  async exportCheckpoint(checkpointId: string): Promise<string> {
    const checkpoint = await loadCheckpoint(this.store, checkpointId);

    if (!checkpoint) {
      throw new WorkflowError("Checkpoint not found", { checkpointId });
    }

    return JSON.stringify(checkpoint);
  }

  /**
   * Import checkpoint from JSON
   */
  async importCheckpoint(json: string): Promise<WorkflowCheckpoint> {
    try {
      const checkpoint = JSON.parse(json) as WorkflowCheckpoint;

      // Basic validation
      if (
        !(
          checkpoint.id &&
          checkpoint.planId &&
          Array.isArray(checkpoint.completedSteps)
        )
      ) {
        throw new WorkflowError("Invalid checkpoint format");
      }

      await saveCheckpoint(this.store, checkpoint);
      return checkpoint;
    } catch (error) {
      throw new WorkflowError("Failed to import checkpoint", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
