/**
 * WebSocket Communication Implementation
 * 
 * Implements WebSocket-based real-time communication for AI agents,
 * supporting latency-aware batching and message handling.
 */

import { WebSocket, WebSocketServer } from 'ws';
import { Effect } from 'effect';
export interface WebSocketConfig {
  port?: number;
  path?: string;
  batching?: BatchingConfig;
}

export interface BatchingConfig {
  enabled: boolean;
  maxSize: number;
  flushInterval: number;
}

export interface WebSocketMessage {
  id: string;
  type: string;
  timestamp: number;
  payload?: any;
}

export interface AgentMessage extends WebSocketMessage {
  type: 'agent_message';
  payload: {
    messages: WebSocketMessage[];
    batched?: boolean;
    [key: string]: any;
  };
}

export interface SystemMessage extends WebSocketMessage {
  type: 'system_message';
  payload: {
    event: string;
    [key: string]: any;
  };
}

export interface ControlMessage extends WebSocketMessage {
  type: 'control_message';
  command: 'start' | 'stop' | 'pause' | 'resume' | 'switch_model';
  payload?: any;
}

export interface IWebSocketCommunication {
  connect(config: WebSocketConfig): Promise<string>;
  disconnect(connectionId: string): Promise<void>;
  broadcast(message: WebSocketMessage): Promise<void>;
  close(): Promise<void>;
  onMessage(callback: (message: WebSocketMessage) => void): void;
  onDisconnect(callback: (connectionId: string) => void): void;
}

export class WebSocketCommunication implements IWebSocketCommunication {
  private server: WebSocketServer | null = null;
  private connections: Map<string, WebSocket> = new Map();
  private batchingConfig: BatchingConfig;
  private messageQueues: Map<string, WebSocketMessage[]> = new Map();
  
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
    const self = this;
    return Effect.runPromise(Effect.gen(function* () {
      try {
        self.server = new WebSocketServer({ 
          port: config.port || 8080,
          path: config.path || '/ws',
        });
        
        self.server.on('connection', (ws: WebSocket, request) => {
          const connectionId = self.generateConnectionId();
          self.connections.set(connectionId, ws);
          
          ws.on('message', (data: string) => {
            try {
              const message = JSON.parse(data) as WebSocketMessage;
              self.handleMessage(message, connectionId);
            } catch (error) {
              console.error(`Failed to parse message: ${error}`);
            }
          });
          
          ws.on('close', () => {
            self.connections.delete(connectionId);
            self.handleDisconnect(connectionId);
          });
          
          ws.on('error', (error) => {
            console.error(`WebSocket error: ${error}`);
          });
          
          if (self.batchingConfig.enabled) {
            self.setupBatching(connectionId);
          }
        });
        
        self.server.on('listening', () => {
          const port = (self.server?.address() as any)?.port;
          console.log(`WebSocket server listening on port ${port}`);
        });
        
        // Return the URL (Note: this runs immediately, but server start is async event based. 
        // Ideally we should wait for 'listening' event but for simplicity we return expected URL)
        return `ws://localhost:${config.port || 8080}${config.path || '/ws'}`;
      } catch (error) {
        throw new Error(`Failed to start WebSocket server: ${error}`);
      }
    }));
  }
  
  /**
   * Setup message batching for latency optimization
   */
  private setupBatching(connectionId: string): void {
    if (!this.batchingConfig.enabled) return;
    
    this.messageQueues.set(connectionId, []);
    
    // Set up periodic flush interval
    const interval = setInterval(() => {
      this.flushQueue(connectionId);
    }, this.batchingConfig.flushInterval);
    
    // Store interval for cleanup
    (this.server as any)?.on('close', () => {
      clearInterval(interval);
    });
  }
  
  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: WebSocketMessage, connectionId: string): void {
    switch (message.type) {
      case 'agent_message':
        this.handleAgentMessage(message as AgentMessage, connectionId);
        break;
        
      case 'system_message':
        this.handleSystemMessage(message as SystemMessage, connectionId);
        break;
        
      case 'control_message':
        this.handleControlMessage(message as ControlMessage, connectionId);
        break;
        
      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }
  
  /**
   * Handle agent messages with batching support
   */
  private handleAgentMessage(message: AgentMessage, connectionId: string): void {
    if (this.batchingConfig.enabled) {
      this.queueMessage(connectionId, message);
    } else {
      this.sendMessage(message, connectionId);
    }
  }
  
  /**
   * Handle system messages
   */
  private handleSystemMessage(message: SystemMessage, connectionId: string): void {
    // System messages are sent immediately without batching
    this.sendMessage(message, connectionId);
  }
  
  /**
   * Handle control messages
   */
  private handleControlMessage(message: ControlMessage, connectionId: string): void {
    switch (message.command) {
      case 'start':
      case 'stop':
      case 'pause':
      case 'resume':
      case 'switch_model':
        // Control commands are handled immediately
        this.sendMessage(message, connectionId);
        break;
        
      default:
        console.warn(`Unknown control command: ${message.command}`);
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
    if (queue.length === 0) return;
    
    const batchedMessage: WebSocketMessage = {
      id: this.generateMessageId(),
      type: 'agent_message',
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
    const self = this;
    return Effect.runPromise(Effect.gen(function* () {
      const ws = self.connections.get(connectionId);
      if (ws) {
        ws.close();
      }
      self.connections.delete(connectionId);
    }));
  }
  
  /**
   * Send message to all connected agents
   */
  broadcast(message: WebSocketMessage): Promise<void> {
    const self = this;
    return Effect.runPromise(Effect.gen(function* () {
      const promises = Array.from(self.connections.entries()).map(([_, ws]) => 
        Effect.runPromise(Effect.gen(function* () {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
          }
        }))
      );
      
      yield* Effect.promise(() => Promise.all(promises));
    }));
  }
  
  /**
   * Close WebSocket server
   */
  close(): Promise<void> {
    const self = this;
    return Effect.runPromise(Effect.gen(function* () {
      if (self.server) {
        self.server.close();
        self.server = null;
      }
    }));
  }
  
  /**
   * Set message handlers
   */
  onMessage(callback: (message: WebSocketMessage) => void): void {
    // Implementation would set up message handlers
  }
  
  /**
   * Set disconnect handler
   */
  onDisconnect(callback: (connectionId: string) => void): void {
    // Implementation would set up disconnect handlers
  }
}
