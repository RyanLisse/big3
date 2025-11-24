/**
 * Message Batching Tests
 * Tests for latency-aware message batching with sub-200ms target
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MessageBatcher } from "../../src/communication/batching";
import type { WebSocketMessage } from "../../src/communication/ws";

describe("MessageBatcher", () => {
  let batcher: MessageBatcher;

  beforeEach(() => {
    batcher = new MessageBatcher({
      maxBatchSize: 100,
      flushInterval: 50,
      targetLatency: 200,
    });
  });

  afterEach(() => {
    batcher.shutdown();
  });

  describe("initialization", () => {
    it("should create batcher with default config", () => {
      expect(batcher).toBeDefined();
    });

    it("should accept custom configuration", () => {
      const customBatcher = new MessageBatcher({
        maxBatchSize: 50,
        flushInterval: 100,
        targetLatency: 150,
      });
      expect(customBatcher).toBeDefined();
      customBatcher.shutdown();
    });
  });

  describe("message queueing", () => {
    it("should queue messages", async () => {
      const message: WebSocketMessage = {
        id: "msg1",
        type: "agent_message",
        timestamp: Date.now(),
      };

      batcher.queue("conn1", message);
      const queueSize = batcher.getQueueSize("conn1");

      expect(queueSize).toBe(1);
    });

    it("should accumulate multiple messages", async () => {
      const messages: WebSocketMessage[] = Array.from(
        { length: 5 },
        (_, i) => ({
          id: `msg${i}`,
          type: "agent_message",
          timestamp: Date.now(),
        })
      );

      messages.forEach((msg) => batcher.queue("conn1", msg));
      const queueSize = batcher.getQueueSize("conn1");

      expect(queueSize).toBe(5);
    });
  });

  describe("auto-flush on size limit", () => {
    it("should flush when batch reaches max size", async () => {
      const flushHandler = vi.fn();
      batcher.onFlush(flushHandler);

      const messages: WebSocketMessage[] = Array.from(
        { length: 100 },
        (_, i) => ({
          id: `msg${i}`,
          type: "agent_message",
          timestamp: Date.now(),
        })
      );

      messages.forEach((msg) => batcher.queue("conn1", msg));

      // Should trigger auto-flush
      expect(flushHandler).toHaveBeenCalled();
    });

    it("should not flush before reaching max size", async () => {
      const flushHandler = vi.fn();
      batcher.onFlush(flushHandler);

      const messages: WebSocketMessage[] = Array.from(
        { length: 50 },
        (_, i) => ({
          id: `msg${i}`,
          type: "agent_message",
          timestamp: Date.now(),
        })
      );

      messages.forEach((msg) => batcher.queue("conn1", msg));

      expect(flushHandler).not.toHaveBeenCalled();
    });
  });

  describe("time-based flushing", () => {
    it("should flush after interval time", async () => {
      const flushHandler = vi.fn();
      batcher.onFlush(flushHandler);

      const message: WebSocketMessage = {
        id: "msg1",
        type: "agent_message",
        timestamp: Date.now(),
      };

      batcher.queue("conn1", message);

      // Wait for flush interval
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(flushHandler).toHaveBeenCalled();
    });

    it("should include all queued messages in flush", async () => {
      const flushHandler = vi.fn((batch: WebSocketMessage[]) => batch);
      batcher.onFlush(flushHandler);

      const messages: WebSocketMessage[] = Array.from(
        { length: 3 },
        (_, i) => ({
          id: `msg${i}`,
          type: "agent_message",
          timestamp: Date.now(),
        })
      );

      messages.forEach((msg) => batcher.queue("conn1", msg));

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(flushHandler).toHaveBeenCalled();
    });
  });

  describe("latency optimization", () => {
    it("should maintain sub-200ms latency", async () => {
      const startTime = Date.now();
      const flushTimes: number[] = [];

      batcher.onFlush(() => {
        flushTimes.push(Date.now() - startTime);
      });

      const message: WebSocketMessage = {
        id: "msg1",
        type: "agent_message",
        timestamp: Date.now(),
      };

      batcher.queue("conn1", message);

      await new Promise((resolve) => setTimeout(resolve, 100));

      for (const latency of flushTimes) {
        expect(latency).toBeLessThan(200);
  }
    });

    it("should adapt flush interval based on latency", async () => {
      const batcherWithAdaptive = new MessageBatcher({
        maxBatchSize: 100,
        flushInterval: 50,
        targetLatency: 200,
        adaptive: true,
      });

      const stats = batcherWithAdaptive.getStats();
      expect(stats.isAdaptive).toBe(true);

      batcherWithAdaptive.shutdown();
    });
  });

  describe("batch composition", () => {
    it("should create valid batch structure", async () => {
      const flushHandler = vi.fn((batch: WebSocketMessage[]) => {
        expect(Array.isArray(batch)).toBe(true);
        expect(batch.length).toBeGreaterThan(0);
        for (const msg of batch) {
          expect(msg.id).toBeDefined();
          expect(msg.type).toBeDefined();
          expect(msg.timestamp).toBeDefined();
  }
      });

      batcher.onFlush(flushHandler);

      const messages: WebSocketMessage[] = Array.from(
        { length: 3 },
        (_, i) => ({
          id: `msg${i}`,
          type: "agent_message",
          timestamp: Date.now(),
        })
      );

      messages.forEach((msg) => batcher.queue("conn1", msg));

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(flushHandler).toHaveBeenCalled();
    });

    it("should include batch metadata", async () => {
      const flushHandler = vi.fn((batch: WebSocketMessage[], metadata: any) => {
        expect(metadata.batchSize).toBe(batch.length);
        expect(metadata.connectionId).toBe("conn1");
        expect(metadata.flushReason).toMatch(/^(size|time|manual)$/);
      });

      batcher.onFlush(flushHandler);

      const messages: WebSocketMessage[] = Array.from(
        { length: 100 },
        (_, i) => ({
          id: `msg${i}`,
          type: "agent_message",
          timestamp: Date.now(),
        })
      );

      messages.forEach((msg) => batcher.queue("conn1", msg));

      expect(flushHandler).toHaveBeenCalled();
    });
  });

  describe("connection management", () => {
    it("should maintain separate queues per connection", () => {
      const message1: WebSocketMessage = {
        id: "msg1",
        type: "agent_message",
        timestamp: Date.now(),
      };

      const message2: WebSocketMessage = {
        id: "msg2",
        type: "agent_message",
        timestamp: Date.now(),
      };

      batcher.queue("conn1", message1);
      batcher.queue("conn2", message2);

      expect(batcher.getQueueSize("conn1")).toBe(1);
      expect(batcher.getQueueSize("conn2")).toBe(1);
    });

    it("should clear queue on manual flush", async () => {
      const message: WebSocketMessage = {
        id: "msg1",
        type: "agent_message",
        timestamp: Date.now(),
      };

      batcher.queue("conn1", message);
      expect(batcher.getQueueSize("conn1")).toBe(1);

      batcher.flush("conn1");
      expect(batcher.getQueueSize("conn1")).toBe(0);
    });

    it("should handle connection closure", () => {
      const message: WebSocketMessage = {
        id: "msg1",
        type: "agent_message",
        timestamp: Date.now(),
      };

      batcher.queue("conn1", message);
      batcher.closeConnection("conn1");

      expect(batcher.getQueueSize("conn1")).toBe(0);
    });
  });

  describe("statistics and monitoring", () => {
    it("should provide batch statistics", () => {
      const stats = batcher.getStats();

      expect(stats.totalBatches).toBeGreaterThanOrEqual(0);
      expect(stats.totalMessages).toBeGreaterThanOrEqual(0);
      expect(stats.avgBatchSize).toBeGreaterThanOrEqual(0);
      expect(stats.avgLatency).toBeGreaterThanOrEqual(0);
    });

    it("should track messages per connection", () => {
      const message: WebSocketMessage = {
        id: "msg1",
        type: "agent_message",
        timestamp: Date.now(),
      };

      batcher.queue("conn1", message);
      batcher.queue("conn1", message);

      const stats = batcher.getStats();
      expect(stats.totalMessages).toBeGreaterThanOrEqual(2);
    });

    it("should update stats after flush", async () => {
      const statsBefore = batcher.getStats();
      const beforeCount = statsBefore.totalBatches;

      const messages: WebSocketMessage[] = Array.from(
        { length: 100 },
        (_, i) => ({
          id: `msg${i}`,
          type: "agent_message",
          timestamp: Date.now(),
        })
      );

      messages.forEach((msg) => batcher.queue("conn1", msg));

      const statsAfter = batcher.getStats();
      expect(statsAfter.totalBatches).toBeGreaterThan(beforeCount);
    });
  });

  describe("shutdown", () => {
    it("should flush pending messages on shutdown", async () => {
      const flushHandler = vi.fn();
      batcher.onFlush(flushHandler);

      const message: WebSocketMessage = {
        id: "msg1",
        type: "agent_message",
        timestamp: Date.now(),
      };

      batcher.queue("conn1", message);
      batcher.shutdown();

      expect(flushHandler).toHaveBeenCalled();
    });

    it("should stop accepting new messages after shutdown", () => {
      batcher.shutdown();

      const message: WebSocketMessage = {
        id: "msg1",
        type: "agent_message",
        timestamp: Date.now(),
      };

      expect(() => {
        batcher.queue("conn1", message);
      }).toThrow();
    });
  });
});
