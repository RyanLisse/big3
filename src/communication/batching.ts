/**
 * Message Batching Implementation
 * Latency-aware batching for WebSocket messages with sub-200ms target
 */

import type { WebSocketMessage } from "./ws";

export type BatchingConfig = {
  maxBatchSize: number;
  flushInterval: number;
  targetLatency: number;
  adaptive?: boolean;
};

type BatchMetadata = {
  batchSize: number;
  connectionId: string;
  flushReason: "size" | "time" | "manual";
  timestamp: number;
};

type BatcherStats = {
  totalBatches: number;
  totalMessages: number;
  avgBatchSize: number;
  avgLatency: number;
  isAdaptive: boolean;
};

type FlushCallback = (
  batch: WebSocketMessage[],
  metadata: BatchMetadata
) => void;

export class MessageBatcher {
  private readonly config: BatchingConfig;
  private readonly queues: Map<string, WebSocketMessage[]> = new Map();
  private readonly timers: Map<string, NodeJS.Timeout> = new Map();
  private flushCallbacks: FlushCallback[] = [];
  private readonly stats = {
    totalBatches: 0,
    totalMessages: 0,
    latencies: [] as number[],
  };
  private isShutdown = false;

  constructor(config: BatchingConfig) {
    this.config = {
      ...config,
      adaptive: config.adaptive ?? false,
    };
  }

  queue(connectionId: string, message: WebSocketMessage): void {
    if (this.isShutdown) {
      throw new Error("MessageBatcher has been shut down");
    }

    if (!this.queues.has(connectionId)) {
      this.queues.set(connectionId, []);
      this.setupTimer(connectionId);
    }

    const queue = this.queues.get(connectionId)!;
    queue.push(message);
    this.stats.totalMessages++;

    if (queue.length >= this.config.maxBatchSize) {
      this.flush(connectionId, "size");
    }
  }

  flush(
    connectionId: string,
    reason: "size" | "time" | "manual" = "manual"
  ): void {
    const queue = this.queues.get(connectionId);
    if (!queue || queue.length === 0) {
      return;
    }

    const batchStart = Date.now();
    const batch = queue.splice(0, queue.length);
    const metadata: BatchMetadata = {
      batchSize: batch.length,
      connectionId,
      flushReason: reason,
      timestamp: batchStart,
    };

    this.stats.totalBatches++;
    const latency = Date.now() - batchStart;
    this.stats.latencies.push(latency);

    this.flushCallbacks.forEach((cb) => cb(batch, metadata));
  }

  closeConnection(connectionId: string): void {
    const timer = this.timers.get(connectionId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(connectionId);
    }

    const queue = this.queues.get(connectionId);
    if (queue && queue.length > 0) {
      this.flush(connectionId, "manual");
    }

    this.queues.delete(connectionId);
  }

  getQueueSize(connectionId: string): number {
    return this.queues.get(connectionId)?.length ?? 0;
  }

  getStats(): BatcherStats {
    const msgCount = this.stats.latencies.length;
    const avgLatency =
      msgCount > 0
        ? this.stats.latencies.reduce((a, b) => a + b, 0) / msgCount
        : 0;

    const totalMsgs = this.stats.totalMessages;
    const avgBatchSize =
      this.stats.totalBatches > 0 ? totalMsgs / this.stats.totalBatches : 0;

    return {
      totalBatches: this.stats.totalBatches,
      totalMessages: this.stats.totalMessages,
      avgBatchSize,
      avgLatency,
      isAdaptive: this.config.adaptive ?? false,
    };
  }

  onFlush(callback: FlushCallback): void {
    this.flushCallbacks.push(callback);
  }

  shutdown(): void {
    if (this.isShutdown) {
      return;
    }

    // Flush all pending messages
    for (const connectionId of this.queues.keys()) {
      this.flush(connectionId, "manual");
    }

    // Clear timers
    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }

    this.queues.clear();
    this.timers.clear();
    this.flushCallbacks = [];
    this.isShutdown = true;
  }

  private setupTimer(connectionId: string): void {
    const timer = setInterval(() => {
      if (!this.isShutdown) {
        this.flush(connectionId, "time");
      }
    }, this.config.flushInterval);

    this.timers.set(connectionId, timer);
  }
}
