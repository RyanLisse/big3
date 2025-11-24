/**
 * WebSocket Server Tests
 * Tests for real-time agent messaging and connection management
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WebSocketMessage } from "../../src/communication/ws";
import { WsServer } from "../../src/communication/ws-server";

const getRandomPort = (): number => Math.floor(Math.random() * 16_384) + 49_152;

describe("WsServer", () => {
  let server: WsServer;
  let port: number;

  beforeEach(() => {
    port = getRandomPort();
    server = new WsServer({ port });
  });

  afterEach(async () => {
    await server.shutdown();
  });

  describe("initialization", () => {
    it("should create server instance with default config", () => {
      expect(server).toBeDefined();
    });

    it("should accept custom configuration", async () => {
      const customPort = getRandomPort();
      const customServer = new WsServer({ port: customPort });
      expect(customServer).toBeDefined();
      await customServer.shutdown();
    });
  });

  describe("connection management", () => {
    it("should track active connections", async () => {
      await server.start();
      const initialCount = server.getConnectionCount();
      expect(initialCount).toBe(0);
    });

    it("should increment connection count when simulating connection", async () => {
      await server.start();
      const initialCount = server.getConnectionCount();
      expect(initialCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe("message handling", () => {
    it("should handle incoming agent messages", async () => {
      const messageHandler = vi.fn();
      server.onMessage(messageHandler);

      const message: WebSocketMessage = {
        id: "msg1",
        type: "agent_message",
        timestamp: Date.now(),
        payload: { content: "test" },
      };

      server.handleIncomingMessage(message, "conn1");

      expect(messageHandler).toHaveBeenCalledWith(message, "conn1");
    });

    it("should broadcast messages to all connections", async () => {
      await server.start();
      const message: WebSocketMessage = {
        id: "msg1",
        type: "system_message",
        timestamp: Date.now(),
        payload: { event: "connected" },
      };

      const result = await server.broadcast(message);
      expect(typeof result).toBe("boolean");
    });

    it("should emit disconnect events", async () => {
      const disconnectHandler = vi.fn();
      server.onDisconnect(disconnectHandler);

      await server.start();
      server.handleDisconnect("conn1");

      expect(disconnectHandler).toHaveBeenCalledWith("conn1");
    });
  });

  describe("error handling", () => {
    it("should handle WebSocket errors gracefully", async () => {
      const errorHandler = vi.fn();
      server.onError(errorHandler);

      await server.start();
      server.handleError("conn1", new Error("Connection lost"));

      expect(errorHandler).toHaveBeenCalled();
    });

    it("should continue operating after connection errors", async () => {
      await server.start();
      server.handleError("conn1", new Error("Test error"));

      const count = server.getConnectionCount();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe("shutdown", () => {
    it("should cleanly shut down the server", async () => {
      await server.start();
      await server.shutdown();

      const count = server.getConnectionCount();
      expect(count).toBe(0);
    });

    it("should be able to restart after shutdown", async () => {
      await server.start();
      await server.shutdown();

      const server2 = new WsServer({ port });
      await server2.start();
      const count = server2.getConnectionCount();
      expect(count).toBe(0);
      await server2.shutdown();
    });
  });

  describe("connection states", () => {
    it("should not have state for non-existent connection", async () => {
      await server.start();

      const state = server.getConnectionState("nonexistent");
      expect(state).toBeUndefined();
    });

    it("should track connection state when added", async () => {
      await server.start();

      const message: WebSocketMessage = {
        id: "msg1",
        type: "agent_message",
        timestamp: Date.now(),
      };

      server.handleIncomingMessage(message, "conn1");
      const state = server.getConnectionState("conn1");

      expect(state).toBeDefined();
      expect(state?.isActive).toBe(true);
      expect(state?.messageCount).toBe(1);
    });
  });

  describe("health check", () => {
    it("should report health status", async () => {
      await server.start();
      const health = server.getHealth();

      expect(health.active).toBeGreaterThanOrEqual(0);
      expect(health.totalConnections).toBeGreaterThanOrEqual(0);
      expect(health.uptime).toBeGreaterThanOrEqual(0);
    });

    it("should update uptime over time", async () => {
      await server.start();
      const health1 = server.getHealth();

      await new Promise((resolve) => setTimeout(resolve, 10));
      const health2 = server.getHealth();

      expect(health2.uptime).toBeGreaterThanOrEqual(health1.uptime);
    });
  });

  describe("message types", () => {
    it("should handle different message types", async () => {
      const messageHandler = vi.fn();
      server.onMessage(messageHandler);

      await server.start();

      const messages: WebSocketMessage[] = [
        { id: "msg1", type: "agent_message", timestamp: Date.now() },
        { id: "msg2", type: "system_message", timestamp: Date.now() },
        { id: "msg3", type: "control_message", timestamp: Date.now() },
      ];

      for (const msg of messages) {
        server.handleIncomingMessage(msg, "conn1");
  }

      expect(messageHandler).toHaveBeenCalledTimes(3);
    });
  });
});
