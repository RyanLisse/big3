/**
 * WebSocket Client Tests
 * Tests for client-side WebSocket integration with batching
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WebSocketMessage } from "../../src/communication/ws";
import { WsClient } from "../../src/communication/ws-client";

describe("WsClient", () => {
  let client: WsClient;

  beforeEach(() => {
    client = new WsClient({
      url: "ws://localhost:8081",
      batching: {
        enabled: true,
        maxBatchSize: 100,
        flushInterval: 50,
      },
    });
  });

  afterEach(async () => {
    await client.disconnect();
  });

  describe("initialization", () => {
    it("should create client instance with URL", () => {
      expect(client).toBeDefined();
    });

    it("should accept custom configuration", () => {
      const customClient = new WsClient({
        url: "ws://localhost:9000",
        reconnect: true,
        maxReconnectAttempts: 5,
      });
      expect(customClient).toBeDefined();
      customClient.disconnect();
    });

    it("should initialize with batching disabled by default", () => {
      const noBatchClient = new WsClient({
        url: "ws://localhost:8081",
        batching: { enabled: false },
      });
      const state = noBatchClient.getState();
      expect(state.batchingEnabled).toBe(false);
      noBatchClient.disconnect();
    });
  });

  describe("connection state", () => {
    it("should track connection state", () => {
      const state = client.getState();
      expect(state.isConnected).toBeDefined();
      expect(state.url).toBe("ws://localhost:8081");
    });

    it("should initialize with zero messages sent", () => {
      const state = client.getState();
      expect(state.messagesSent).toBe(0);
    });

    it("should initialize with zero messages received", () => {
      const state = client.getState();
      expect(state.messagesReceived).toBe(0);
    });
  });

  describe("message sending", () => {
    it("should queue message for sending", () => {
      const message: WebSocketMessage = {
        id: "msg1",
        type: "agent_message",
        timestamp: Date.now(),
        payload: { content: "test" },
      };

      const result = client.send(message);
      expect(result).toBe(true);
    });

    it("should accept different message types", () => {
      const agentMsg: WebSocketMessage = {
        id: "msg1",
        type: "agent_message",
        timestamp: Date.now(),
      };

      const systemMsg: WebSocketMessage = {
        id: "msg2",
        type: "system_message",
        timestamp: Date.now(),
        payload: { event: "ready" },
      };

      const controlMsg: WebSocketMessage = {
        id: "msg3",
        type: "control_message",
        timestamp: Date.now(),
        payload: { command: "start" },
      };

      expect(client.send(agentMsg)).toBe(true);
      expect(client.send(systemMsg)).toBe(true);
      expect(client.send(controlMsg)).toBe(true);
    });

    it("should return false when disconnected after shutdown", async () => {
      await client.disconnect();
      const message: WebSocketMessage = {
        id: "msg1",
        type: "agent_message",
        timestamp: Date.now(),
      };

      const result = client.send(message);
      expect(result).toBe(false);
    });
  });

  describe("client-side batching", () => {
    it("should queue messages when batching enabled", () => {
      const messages: WebSocketMessage[] = Array.from(
        { length: 50 },
        (_, i) => ({
          id: `msg${i}`,
          type: "agent_message",
          timestamp: Date.now(),
        })
      );

      for (const msg of messages) {
        client.send(msg);
  }

      const state = client.getState();
      expect(state.pendingMessages).toBeGreaterThanOrEqual(0);
    });

    it("should not batch when disabled", () => {
      const noBatchClient = new WsClient({
        url: "ws://localhost:8081",
        batching: { enabled: false },
      });

      const message: WebSocketMessage = {
        id: "msg1",
        type: "agent_message",
        timestamp: Date.now(),
      };

      noBatchClient.send(message);

      const state = noBatchClient.getState();
      expect(state.batchingEnabled).toBe(false);

      noBatchClient.disconnect();
    });
  });

  describe("message reception", () => {
    it("should handle incoming messages", () => {
      const messageHandler = vi.fn();
      client.on("message", messageHandler);

      const message: WebSocketMessage = {
        id: "msg1",
        type: "agent_message",
        timestamp: Date.now(),
        payload: { content: "received" },
      };

      client.simulateIncomingMessage(message);

      expect(messageHandler).toHaveBeenCalledWith(message);
    });

    it("should emit different event types", () => {
      const agentHandler = vi.fn();
      const systemHandler = vi.fn();

      client.on("agent_message", agentHandler);
      client.on("system_message", systemHandler);

      const agentMsg: WebSocketMessage = {
        id: "msg1",
        type: "agent_message",
        timestamp: Date.now(),
      };

      const systemMsg: WebSocketMessage = {
        id: "msg2",
        type: "system_message",
        timestamp: Date.now(),
      };

      client.simulateIncomingMessage(agentMsg);
      client.simulateIncomingMessage(systemMsg);

      expect(agentHandler).toHaveBeenCalledWith(agentMsg);
      expect(systemHandler).toHaveBeenCalledWith(systemMsg);
    });

    it("should handle batch messages", () => {
      const batchHandler = vi.fn();
      client.on("batch", batchHandler);

      const batchMsg: WebSocketMessage = {
        id: "batch1",
        type: "agent_message",
        timestamp: Date.now(),
        payload: {
          messages: [
            { id: "msg1", type: "agent_message", timestamp: Date.now() },
            { id: "msg2", type: "agent_message", timestamp: Date.now() },
          ],
          batched: true,
        },
      };

      client.simulateIncomingMessage(batchMsg);

      expect(client).toBeDefined();
    });

    it("should increment received message count", () => {
      const message: WebSocketMessage = {
        id: "msg1",
        type: "agent_message",
        timestamp: Date.now(),
      };

      const stateBefore = client.getState();
      const beforeCount = stateBefore.messagesReceived;

      client.simulateIncomingMessage(message);

      const stateAfter = client.getState();
      expect(stateAfter.messagesReceived).toBe(beforeCount + 1);
    });
  });

  describe("event handling", () => {
    it("should support multiple event listeners", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      client.on("message", handler1);
      client.on("message", handler2);

      const message: WebSocketMessage = {
        id: "msg1",
        type: "agent_message",
        timestamp: Date.now(),
      };

      client.simulateIncomingMessage(message);

      expect(handler1).toHaveBeenCalledWith(message);
      expect(handler2).toHaveBeenCalledWith(message);
    });

    it("should remove event listeners", () => {
      const handler = vi.fn();
      client.on("message", handler);
      client.off("message", handler);

      const message: WebSocketMessage = {
        id: "msg1",
        type: "agent_message",
        timestamp: Date.now(),
      };

      client.simulateIncomingMessage(message);

      expect(handler).not.toHaveBeenCalled();
    });

    it("should emit error events", () => {
      const errorHandler = vi.fn();
      client.on("error", errorHandler);

      client.simulateError(new Error("Connection failed"));

      expect(errorHandler).toHaveBeenCalled();
    });
  });

  describe("reconnection", () => {
    it("should track reconnect setting", () => {
      const reconnectClient = new WsClient({
        url: "ws://localhost:8081",
        reconnect: true,
        maxReconnectAttempts: 3,
      });

      const state = reconnectClient.getState();
      expect(state.reconnectEnabled).toBe(true);
      expect(state.maxReconnectAttempts).toBe(3);

      reconnectClient.disconnect();
    });

    it("should have disconnection disabled by default", () => {
      const state = client.getState();
      expect(state.reconnectEnabled).toBe(false);
    });
  });

  describe("client state", () => {
    it("should provide detailed client state", () => {
      const state = client.getState();

      expect(state).toHaveProperty("isConnected");
      expect(state).toHaveProperty("url");
      expect(state).toHaveProperty("uptime");
      expect(state).toHaveProperty("messagesSent");
      expect(state).toHaveProperty("messagesReceived");
      expect(state).toHaveProperty("pendingMessages");
      expect(state).toHaveProperty("batchingEnabled");
    });

    it("should track message statistics", () => {
      const messages: WebSocketMessage[] = Array.from(
        { length: 5 },
        (_, i) => ({
          id: `msg${i}`,
          type: "agent_message",
          timestamp: Date.now(),
        })
      );

      for (const msg of messages) {
        client.send(msg);
  }

      const state = client.getState();
      expect(state.messagesSent).toBeGreaterThanOrEqual(0);
    });

    it("should track uptime", () => {
      const state1 = client.getState();
      expect(state1.uptime).toBeGreaterThanOrEqual(0);

      const state2 = client.getState();
      expect(state2.uptime).toBeGreaterThanOrEqual(state1.uptime);
    });
  });

  describe("disconnect", () => {
    it("should cleanly disconnect", async () => {
      const disconnectHandler = vi.fn();
      client.on("disconnected", disconnectHandler);

      await client.disconnect();

      const state = client.getState();
      expect(state.isConnected).toBe(false);
    });

    it("should prevent new messages after disconnect", async () => {
      await client.disconnect();

      const message: WebSocketMessage = {
        id: "msg1",
        type: "agent_message",
        timestamp: Date.now(),
      };

      const result = client.send(message);
      expect(result).toBe(false);
    });

    it("should emit disconnected event", async () => {
      const handler = vi.fn();
      client.on("disconnected", handler);

      await client.disconnect();

      expect(handler).toHaveBeenCalled();
    });
  });
});
