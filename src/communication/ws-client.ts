/**
 * WebSocket Client Implementation
 * Client-side WebSocket integration with batching support
 */

import { MessageBatcher } from './batching';
import type { WebSocketMessage } from './ws';

export interface WsClientConfig {
  url: string;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  batching?: {
    enabled: boolean;
    maxBatchSize?: number;
    flushInterval?: number;
  };
}

interface ClientState {
  isConnected: boolean;
  url: string;
  uptime: number;
  messagesSent: number;
  messagesReceived: number;
  pendingMessages: number;
  batchingEnabled: boolean;
  reconnectEnabled: boolean;
  maxReconnectAttempts?: number;
}

type EventListener = (data: any) => void;

export class WsClient {
  private url: string;
  private ws: WebSocket | null = null;
  private config: WsClientConfig;
  private batcher: MessageBatcher | null = null;
  private listeners: Map<string, Set<EventListener>> = new Map();
  private messagesSent = 0;
  private messagesReceived = 0;
  private startTime = Date.now();
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isShutdown = false;

  constructor(config: WsClientConfig) {
    this.url = config.url;
    this.config = {
      url: config.url,
      reconnect: config.reconnect ?? false,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 5,
      reconnectDelay: config.reconnectDelay ?? 1000,
      batching: {
        enabled: config.batching?.enabled ?? false,
        maxBatchSize: config.batching?.maxBatchSize ?? 100,
        flushInterval: config.batching?.flushInterval ?? 50
      }
    };

    if (this.config.batching?.enabled) {
      this.batcher = new MessageBatcher({
        maxBatchSize: this.config.batching.maxBatchSize ?? 100,
        flushInterval: this.config.batching.flushInterval ?? 50,
        targetLatency: 200
      });

      this.batcher.onFlush((batch, metadata) => {
        this.sendBatch(batch);
      });
    }
  }

  send(message: WebSocketMessage): boolean {
    if (this.isShutdown) return false;

    if (!this.config.batching?.enabled) {
      return this.sendDirectly(message);
    }

    if (this.batcher) {
      try {
        this.batcher.queue('default', message);
        return true;
      } catch {
        return false;
      }
    }

    return false;
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.batcher) {
      this.batcher.flush('default');
      this.batcher.shutdown();
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }

    this.ws = null;
    this.isShutdown = true;
    this.emit('disconnected', undefined);
  }

  getState(): ClientState {
    const pendingMessages = this.batcher?.getQueueSize('default') ?? 0;

    return {
      isConnected: this.ws?.readyState === WebSocket.OPEN,
      url: this.url,
      uptime: Date.now() - this.startTime,
      messagesSent: this.messagesSent,
      messagesReceived: this.messagesReceived,
      pendingMessages,
      batchingEnabled: this.config.batching?.enabled ?? false,
      reconnectEnabled: this.config.reconnect ?? false,
      maxReconnectAttempts: this.config.maxReconnectAttempts
    };
  }

  on(event: string, listener: EventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off(event: string, listener: EventListener): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  simulateIncomingMessage(message: WebSocketMessage): void {
    this.messagesReceived++;

    this.emit('message', message);

    if (message.type === 'agent_message') {
      this.emit('agent_message', message);
    } else if (message.type === 'system_message') {
      this.emit('system_message', message);
    } else if (message.type === 'control_message') {
      this.emit('control_message', message);
    }

    if (
      message.type === 'agent_message' &&
      message.payload &&
      typeof message.payload === 'object' &&
      'batched' in message.payload &&
      message.payload.batched === true
    ) {
      this.emit('batch', message);
    }
  }

  simulateError(error: Error): void {
    this.emit('error', error);
  }

  private sendDirectly(message: WebSocketMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      this.messagesSent++;
      return true;
    } catch {
      return false;
    }
  }

  private sendBatch(messages: WebSocketMessage[]): void {
    const batchMessage: WebSocketMessage = {
      id: `batch_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      type: 'agent_message',
      timestamp: Date.now(),
      payload: {
        messages,
        batched: true
      }
    };

    this.sendDirectly(batchMessage);
  }

  private emit(event: string, data: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }
}
