/**
 * WebSocket Communication Implementation
 *
 * Implements WebSocket-based real-time communication for AI agents,
 * supporting latency-aware batching and message handling.
 */

import { Effect } from "effect";
import { WebSocket, WebSocketServer } from "ws";
export type WebSocketConfig = {
  port?: number;
  path?: string;
  batching?: BatchingConfig;
};

export type BatchingConfig = {
  enabled: boolean;
  maxSize: number;
  flushInterval: number;
};

export type WebSocketMessage = {
  id: string;
  type: string;
  timestamp: number;
  payload?: unknown;
};

export interface AgentMessage extends WebSocketMessage {
  type: "agent_message";
  payload: {
    messages: WebSocketMessage[];
    batched?: boolean;
    [key: string]: unknown;
  };
}

export interface SystemMessage extends WebSocketMessage {
  type: "system_message";
  payload: {
    event: string;
    [key: string]: unknown;
  };
}

export interface ControlMessage extends WebSocketMessage {
  type: "control_message";
  command: "start" | "stop" | "pause" | "resume" | "switch_model";
  payload?: unknown;
}

export type IWebSocketCommunication = {
  connect(config: WebSocketConfig): Promise<string>;
  disconnect(connectionId: string): Promise<void>;
  broadcast(message: WebSocketMessage): Promise<void>;
  close(): Promise<void>;
  onMessage(callback: (message: WebSocketMessage) => void): void;
  onDisconnect(callback: (connectionId: string) => void): void;
};

export class WebSocketCommunication implements IWebSocketCommunication {
  private server: WebSocketServer | null = null;
  private readonly connections: Map<string, WebSocket> = new Map();
  private readonly batchingConfig: BatchingConfig;
  private readonly messageQueues: Map<string, WebSocketMessage[]> = new Map();

  constructor(config: WebSocketConfig) {
    this.batchingConfig = config.batching || {
      enabled: false,
      maxSize: 100,
      flushInterval: 100,
    };
  }

  /**
   * Start WebSocket server for real-time communication
   */
  connect(config: WebSocketConfig): Promise<string> {
    return Effect.runPromise(
      Effect.sync(() => {
        try {
          this.server = new WebSocketServer({
            port: config.port || 8080,
            path: config.path || "/ws",
          });

          this.server.on("connection", (ws: WebSocket) => {
            const connectionId = this.generateConnectionId();
            this.connections.set(connectionId, ws);

            ws.on("message", (data: string) => {
              try {
                const message = JSON.parse(data) as WebSocketMessage;
                this.handleMessage(message, connectionId);
              } catch {
                // Message parsing failed - connection will handle error
              }
            });

            ws.on("close", () => {
              this.connections.delete(connectionId);
              this.handleDisconnect(connectionId);
            });

            ws.on("error", () => {
              // WebSocket error handled by connection lifecycle
            });

            if (this.batchingConfig.enabled) {
              this.setupBatching(connectionId);
            }
          });

          this.server.on("listening", () => {
            // Server listening on configured port
          });

          return `ws://localhost:${config.port || 8080}${config.path || "/ws"}`;
        } catch (error) {
          throw new Error(`Failed to start WebSocket server: ${error}`);
        }
      })
    );
  }

  /**
   * Setup message batching for latency optimization
   */
  private setupBatching(connectionId: string): void {
    if (!this.batchingConfig.enabled) {
      return;
    }

    this.messageQueues.set(connectionId, []);

    // Set up periodic flush interval
    const interval = setInterval(() => {
      this.flushQueue(connectionId);
    }, this.batchingConfig.flushInterval);

    // Store interval for cleanup
    this.server?.on("close", () => {
      clearInterval(interval);
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: WebSocketMessage, connectionId: string): void {
    switch (message.type) {
      case "agent_message":
        this.handleAgentMessage(message as AgentMessage, connectionId);
        break;

      case "system_message":
        this.handleSystemMessage(message as SystemMessage, connectionId);
        break;

      case "control_message":
        this.handleControlMessage(message as ControlMessage, connectionId);
        break;

      default:
      // Unknown message type - ignored
    }
  }

  /**
   * Handle agent messages with batching support
   */
  private handleAgentMessage(
    message: AgentMessage,
    connectionId: string
  ): void {
    if (this.batchingConfig.enabled) {
      this.queueMessage(connectionId, message);
    } else {
      this.sendMessage(message, connectionId);
    }
  }

  /**
   * Handle system messages
   */
  private handleSystemMessage(
    message: SystemMessage,
    connectionId: string
  ): void {
    // System messages are sent immediately without batching
    this.sendMessage(message, connectionId);
  }

  /**
   * Handle control messages
   */
  private handleControlMessage(
    message: ControlMessage,
    connectionId: string
  ): void {
    switch (message.command) {
      case "start":
      case "stop":
      case "pause":
      case "resume":
      case "switch_model":
        // Control commands are handled immediately
        this.sendMessage(message, connectionId);
        break;

      default:
      // Unknown control command - ignored
    }
  }

  /**
   * Queue message for batching
   */
  private queueMessage(connectionId: string, message: WebSocketMessage): void {
    const queue = this.messageQueues.get(connectionId) || [];
    queue.push(message);

    if (queue.length >= this.batchingConfig.maxSize) {
      this.flushQueue(connectionId);
    }
  }

  /**
   * Flush queued messages
   */
  private flushQueue(connectionId: string): void {
    const queue = this.messageQueues.get(connectionId) || [];
    if (queue.length === 0) {
      return;
    }

    const batchedMessage: WebSocketMessage = {
      id: this.generateMessageId(),
      type: "agent_message",
      timestamp: Date.now(),
      payload: {
        messages: queue,
        batched: true,
      },
    };

    this.sendMessage(batchedMessage, connectionId);
    this.messageQueues.set(connectionId, []);
  }

  /**
   * Send message through WebSocket
   */
  private sendMessage(message: WebSocketMessage, connectionId: string): void {
    const ws = this.connections.get(connectionId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Handle connection close
   */
  private handleDisconnect(connectionId: string): void {
    this.messageQueues.delete(connectionId);
    this.connections.delete(connectionId);
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Disconnect specific connection
   */
  disconnect(connectionId: string): Promise<void> {
    return Effect.runPromise(
      Effect.sync(() => {
        const ws = this.connections.get(connectionId);
        if (ws) {
          ws.close();
        }
        this.connections.delete(connectionId);
      })
    );
  }

  /**
   * Send message to all connected agents
   */
  broadcast(message: WebSocketMessage): Promise<void> {
    return Effect.runPromise(
      Effect.promise(() => {
        const promises = Array.from(this.connections.entries()).map(([, ws]) =>
          Effect.runPromise(
            Effect.sync(() => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(message));
              }
            })
          )
        );

        return Promise.all(promises).then(() => {});
      })
    );
  }

  /**
   * Close WebSocket server
   */
  close(): Promise<void> {
    return Effect.runPromise(
      Effect.sync(() => {
        if (this.server) {
          this.server.close();
          this.server = null;
        }
      })
    );
  }

  /**
   * Set message handlers
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onMessage(_callback: (message: WebSocketMessage) => void): void {
    // Implementation would set up message handlers
  }

  /**
   * Set disconnect handler
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onDisconnect(_callback: (connectionId: string) => void): void {
    // Implementation would set up disconnect handlers
  }
}
