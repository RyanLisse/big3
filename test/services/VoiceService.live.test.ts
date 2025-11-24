import { Effect, Queue } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type VoiceModule = typeof import("../../src/services/VoiceService.js");
let VoiceService: VoiceModule["VoiceService"];
let VoiceServiceLive: VoiceModule["VoiceServiceLive"];

let failFirstConnection = false;
const sockets: MockSocket[] = [];

type Handler = (...args: any[]) => void;

type HandlerMap = {
  open?: Handler;
  close?: Handler;
  error?: Handler;
  message?: Handler;
};

class MockWebSocket {
  static OPEN = 1;

  handlers: HandlerMap = {};
  readyState = MockWebSocket.OPEN;
  sent: string[] = [];
  pingCount = 0;
  closed = false;

  constructor(_url: string, _options?: unknown) {
    sockets.push(this);

    if (failFirstConnection) {
      failFirstConnection = false;
      queueMicrotask(() => this.emitError(new Error("connect failed")));
      return;
    }

    queueMicrotask(() => this.emitOpen());
  }

  on(event: keyof HandlerMap, handler: Handler) {
    this.handlers[event] = handler;
  }

  send(payload: string) {
    this.sent.push(payload);
  }

  ping() {
    this.pingCount += 1;
  }

  close() {
    this.closed = true;
  }

  emitOpen() {
    this.handlers.open?.();
  }

  emitMessage(data: unknown) {
    const serialized = Buffer.from(JSON.stringify(data));
    this.handlers.message?.(serialized);
  }

  emitError(error: Error) {
    this.handlers.error?.(error);
  }
}

type MockSocket = MockWebSocket;

const getActiveSocket = () => sockets[sockets.length - 1];

describe("VoiceServiceLive", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    process.env.OPENAI_API_KEY = "test-openai-key";
    sockets.length = 0;
    failFirstConnection = false;
    vi.resetModules();
    (globalThis as any).__VOICE_WEBSOCKET__ = MockWebSocket;
    const module = await import("../../src/services/VoiceService.js");
    VoiceService = module.VoiceService;
    VoiceServiceLive = module.VoiceServiceLive;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    delete (globalThis as any).__VOICE_WEBSOCKET__;
  });

  const runVoice = <T>(program: Effect.Effect<T>) =>
    Effect.runPromise(program.pipe(Effect.provide(VoiceServiceLive)));

  it("connects, forwards messages, and heartbeats the socket", async () => {
    const result = await runVoice(
      Effect.scoped(
        Effect.gen(function* (_) {
          const service = yield* _(VoiceService);
          const socket = getActiveSocket();

          const takeEvent = Queue.take(service.eventStream);
          socket?.emitMessage({ hello: "world" });
          const event = yield* _(takeEvent);

          yield* service.send({ ack: true });
          yield* Effect.sync(() => vi.advanceTimersByTime(15_000));

          return { event, socket };
        })
      )
    );

    expect(result.event).toEqual({ hello: "world" });
    expect(result.socket?.sent).toContain(JSON.stringify({ ack: true }));
    expect(result.socket?.pingCount).toBeGreaterThan(0);
    expect(result.socket?.closed).toBe(true);
  });

  it("retries connection when the first attempt fails", async () => {
    failFirstConnection = true;

    const run = runVoice(
      Effect.scoped(
        Effect.gen(function* (_) {
          const service = yield* _(VoiceService);
          yield* service.send({ retry: true });
        })
      )
    );

    await vi.advanceTimersByTimeAsync(1200);
    await run;

    expect(sockets.length).toBeGreaterThan(1);
    expect(getActiveSocket()?.sent[0]).toContain("retry");
  });
});
