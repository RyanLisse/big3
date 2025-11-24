import { Effect } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const messageCreateMock = vi.fn();

type CoderModule = typeof import("../../src/services/CoderService.js");
let CoderServiceLive: CoderModule["CoderServiceLive"];
let CoderServiceTag: CoderModule["CoderServiceTag"];

const runCoder = <T>(program: Effect.Effect<T>) =>
  Effect.runPromise(program.pipe(Effect.provide(CoderServiceLive)));

describe("CoderServiceLive", () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
    messageCreateMock.mockReset();
    vi.resetModules();

    vi.doMock("@anthropic-ai/sdk", () => ({
      __esModule: true,
      default: class MockAnthropic {
        messages = { create: messageCreateMock };
        constructor(public readonly options: { apiKey?: string }) {}
      },
    }));

    return import("../../src/services/CoderService.js").then((module) => {
      CoderServiceLive = module.CoderServiceLive;
      CoderServiceTag = module.CoderServiceTag;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates sessions and executes instructions with Claude", async () => {
    messageCreateMock.mockResolvedValue({
      content: [{ type: "text", text: "Hello from Claude" }],
    });

    const result = await runCoder(
      Effect.gen(function* () {
        const service = yield* CoderServiceTag;
        const session = yield* service.createSession("unit");
        const response = yield* service.execute("session-1", "Say hi");
        return { session, response };
      })
    );

    expect(result.session).toBe("✅ Created Claude Session: unit");
    expect(result.response).toBe("Hello from Claude");
    expect(messageCreateMock).toHaveBeenCalledWith({
      max_tokens: 1024,
      messages: [{ content: "Say hi", role: "user" }],
      model: "claude-3-5-sonnet-20241022",
    });
  });

  it("fails when Claude returns an invalid payload", async () => {
    messageCreateMock.mockResolvedValue({ content: null });

    await expect(
      runCoder(
        Effect.gen(function* () {
          const service = yield* CoderServiceTag;
          return yield* service.execute("broken-session", "cause failure");
        })
      )
    ).rejects.toThrow("Claude execution failed");
  });

  it("times out when Claude does not respond in time", async () => {
    vi.useFakeTimers();
    messageCreateMock.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 120_000))
    );

    const run = runCoder(
      Effect.gen(function* () {
        const service = yield* CoderServiceTag;
        return yield* service.execute("slow-session", "wait forever");
      })
    );

    const assertion = expect(run).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(61_000);
    await assertion;
  });
});
