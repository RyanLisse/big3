/**
 * WebSocket Server Implementation
 * Real-time agent messaging and connection management
 */

import { WebSocket, WebSocketServer } from "ws";
import type { WebSocketMessage } from "./ws";

export type WsServerConfig = {
  port?: number;
  path?: string;
  hostname?: string;
};

type ConnectionState = {
  connectionId: string;
  isActive: boolean;
  connectedAt: number;
  lastMessageAt: number;
  messageCount: number;
};

type ServerHealth = {
  active: number;
  totalConnections: number;
  uptime: number;
};

type MessageHandler = (message: WebSocketMessage, connectionId: string) => void;
type DisconnectHandler = (connectionId: string) => void;
type ErrorHandler = (connectionId: string, error: Error) => void;

export class WsServer {
  private server: WebSocketServer | null = null;
  private readonly connections: Map<string, WebSocket> = new Map();
  private readonly connectionStates: Map<string, ConnectionState> = new Map();
  private readonly config: WsServerConfig;
  private readonly messageHandlers: MessageHandler[] = [];
  private readonly disconnectHandlers: DisconnectHandler[] = [];
  private readonly errorHandlers: ErrorHandler[] = [];
  private readonly startTime = Date.now();
  private isRunning = false;

  constructor(config: WsServerConfig = {}) {
    this.config = {
      port: config.port ?? 8080,
      path: config.path ?? "/ws",
      hostname: config.hostname ?? "localhost",
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    try {
      this.server = new WebSocketServer({
        port: this.config.port,
        path: this.config.path,
      });

      this.server.on("connection", (ws: WebSocket) => {
        this.handleConnection(ws);
      });

      this.isRunning = true;
    } catch (error) {
      throw new Error(`Failed to start WebSocket server: ${error}`);
    }
  }

  async shutdown(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    for (const ws of this.connections.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    }

    if (this.server) {
      this.server.close();
    }

    this.connections.clear();
    this.connectionStates.clear();
    this.isRunning = false;
  }

  handleIncomingMessage(message: WebSocketMessage, connectionId: string): void {
    let state = this.connectionStates.get(connectionId);
    if (!state) {
      state = {
        connectionId,
        isActive: true,
        connectedAt: Date.now(),
        lastMessageAt: Date.now(),
        messageCount: 0,
      };
      this.connectionStates.set(connectionId, state);
    }

    state.lastMessageAt = Date.now();
    state.messageCount++;

    this.messageHandlers.forEach((handler) => {
      handler(message, connectionId);
    });
  }

  handleDisconnect(connectionId: string): void {
    const state = this.connectionStates.get(connectionId);
    if (state) {
      state.isActive = false;
    }

    this.connections.delete(connectionId);
    this.connectionStates.delete(connectionId);

    this.disconnectHandlers.forEach((handler) => {
      handler(connectionId);
    });
  }

  handleError(connectionId: string, error: Error): void {
    this.errorHandlers.forEach((handler) => {
      handler(connectionId, error);
    });
  }

  async broadcast(message: WebSocketMessage): Promise<boolean> {
    let successCount = 0;

    for (const [_, ws] of this.connections.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
        successCount++;
      }
    }

    return successCount > 0;
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  getConnectionState(connectionId: string): ConnectionState | undefined {
    return this.connectionStates.get(connectionId);
  }

  getHealth(): ServerHealth {
    const active = Array.from(this.connectionStates.values()).filter(
      (s) => s.isActive
    ).length;

    return {
      active,
      totalConnections: this.connectionStates.size,
      uptime: Date.now() - this.startTime,
    };
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
  }

  onDisconnect(handler: DisconnectHandler): void {
    this.disconnectHandlers.push(handler);
  }

  onError(handler: ErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  private handleConnection(ws: WebSocket): void {
    const connectionId = this.generateConnectionId();
    this.connections.set(connectionId, ws);

    const state: ConnectionState = {
      connectionId,
      isActive: true,
      connectedAt: Date.now(),
      lastMessageAt: Date.now(),
      messageCount: 0,
    };
    this.connectionStates.set(connectionId, state);

    ws.on("message", (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString("utf-8")) as WebSocketMessage;
        this.handleIncomingMessage(message, connectionId);
      } catch (error) {
        this.handleError(
          connectionId,
          new Error(`Failed to parse message: ${error}`)
        );
      }
    });

    ws.on("close", () => {
      this.handleDisconnect(connectionId);
    });

    ws.on("error", (error: Error) => {
      this.handleError(connectionId, error);
    });
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
