import { Effect } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGoto = vi.fn();
const mockScreenshot = vi.fn(async () => Buffer.from("image"));
const mockClose = vi.fn(async () => {});
const mockGenerateContent = vi.fn();

type BrowserModule = typeof import("../../src/services/BrowserService.js");
let BrowserServiceLive: BrowserModule["BrowserServiceLive"];
let BrowserServiceTag: BrowserModule["BrowserServiceTag"];

const runBrowser = <T>(program: Effect.Effect<T>) =>
  Effect.runPromise(program.pipe(Effect.provide(BrowserServiceLive)));

describe("BrowserServiceLive", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock("playwright", () => ({
      chromium: {
        launch: vi.fn(async () => ({
          close: mockClose,
          newContext: async () => ({
            newPage: async () => ({
              goto: mockGoto,
              screenshot: mockScreenshot,
            }),
          }),
        })),
      },
    }));

    vi.doMock("@google/generative-ai", () => ({
      GoogleGenerativeAI: class MockGoogleGenerativeAI {
        getGenerativeModel() {
          return { generateContent: mockGenerateContent };
        }
      },
    }));

    process.env.GEMINI_API_KEY = "test-gemini-key";
    mockGoto.mockReset();
    mockScreenshot.mockClear();
    mockGenerateContent.mockReset();
    return import("../../src/services/BrowserService.js").then((module) => {
      BrowserServiceLive = module.BrowserServiceLive;
      BrowserServiceTag = module.BrowserServiceTag;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("navigates and performs actions with Gemini", async () => {
    mockGoto.mockResolvedValue(undefined);
    mockGenerateContent.mockResolvedValue({
      response: { text: () => "Action completed" },
    });

    const result = await runBrowser(
      Effect.scoped(
        Effect.gen(function* (_) {
          const service = yield* _(BrowserServiceTag);
          yield* service.navigate("https://example.com");
          const actionResult = yield* service.act("Click button");
          return actionResult;
        })
      )
    );

    expect(mockGoto).toHaveBeenCalledWith("https://example.com");
    expect(mockScreenshot).toHaveBeenCalled();
    expect(mockGenerateContent).toHaveBeenCalled();
    expect(result).toContain("Action completed");
    expect(mockClose).toHaveBeenCalled();
  });

  it("times out long-running navigation", async () => {
    vi.useFakeTimers();
    mockGoto.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 120_000))
    );
    mockGenerateContent.mockResolvedValue({
      response: { text: () => "noop" },
    });

    const run = runBrowser(
      Effect.scoped(
        Effect.gen(function* (_) {
          const service = yield* _(BrowserServiceTag);
          return yield* service.navigate("https://slow.example.com");
        })
      )
    );

    const assertion = expect(run).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(46_000);
    await assertion;
  });

  it("times out long-running Gemini actions", async () => {
    vi.useFakeTimers();
    mockGoto.mockResolvedValue(undefined);
    mockGenerateContent.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 120_000))
    );

    const run = runBrowser(
      Effect.scoped(
        Effect.gen(function* (_) {
          const service = yield* _(BrowserServiceTag);
          yield* service.navigate("https://example.com");
          return yield* service.act("Analyze page");
        })
      )
    );

    const assertion = expect(run).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(46_000);
    await assertion;
  });
});
