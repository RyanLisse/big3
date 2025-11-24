import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import type { AgentTool, ExecutionPlan } from "../src/domain.js";
import { BrowserServiceTag } from "../src/services/BrowserService.js";
import { CoderServiceTag } from "../src/services/CoderService.js";
import {
  ExecutionServiceLive,
  ExecutionServiceTag,
} from "../src/services/ExecutionService.js";

// Mock Services
const MockCoderService = Layer.succeed(CoderServiceTag, {
  createSession: (name: string) => Effect.succeed(`Session: ${name}`),
  execute: (_sessionId: string, instruction: string) =>
    Effect.succeed(`Executed: ${instruction}`),
});

const MockBrowserService = Layer.succeed(BrowserServiceTag, {
  navigate: (_url: string) => Effect.succeed(undefined),
  act: (instruction: string) => Effect.succeed(`Browser acted: ${instruction}`),
});

const TestLayer = ExecutionServiceLive.pipe(
  Layer.provide(MockCoderService),
  Layer.provide(MockBrowserService)
);

describe("ExecutionService", () => {
  it("should execute a single-node plan", async () => {
    const plan: ExecutionPlan = {
      id: "plan-1",
      nodes: {
        "node-1": {
          id: "node-1",
          tool: {
            tag: "CommandAgent",
            name: "coder-1",
            instruction: "Write hello world",
          },
          dependencies: [],
          status: "pending",
        },
      },
      parallelBatches: [["node-1"]],
    };

    const program = Effect.gen(function* (_) {
      const executor = yield* _(ExecutionServiceTag);
      const result = yield* _(executor.executeParallel(plan));
      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(TestLayer))
    );

    expect(result.planId).toBe("plan-1");
    expect(result.completedNodes).toEqual(["node-1"]);
    expect(result.failedNodes).toEqual([]);
    expect(result.outputs["node-1"]).toBe("Executed: Write hello world");
  });

  it("should execute parallel nodes in a single batch", async () => {
    const plan: ExecutionPlan = {
      id: "plan-2",
      nodes: {
        "node-1": {
          id: "node-1",
          tool: {
            tag: "CommandAgent",
            name: "coder-1",
            instruction: "Task 1",
          },
          dependencies: [],
          status: "pending",
        },
        "node-2": {
          id: "node-2",
          tool: {
            tag: "BrowserUse",
            task: "Click button",
            url: "https://example.com",
          },
          dependencies: [],
          status: "pending",
        },
      },
      parallelBatches: [["node-1", "node-2"]],
    };

    const program = Effect.gen(function* (_) {
      const executor = yield* _(ExecutionServiceTag);
      const result = yield* _(executor.executeParallel(plan));
      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(TestLayer))
    );

    expect(result.completedNodes).toHaveLength(2);
    expect(result.completedNodes).toContain("node-1");
    expect(result.completedNodes).toContain("node-2");
    expect(result.outputs["node-1"]).toBe("Executed: Task 1");
    expect(result.outputs["node-2"]).toBe("Browser acted: Click button");
  });

  it("should execute multiple batches sequentially", async () => {
    const plan: ExecutionPlan = {
      id: "plan-3",
      nodes: {
        "node-1": {
          id: "node-1",
          tool: {
            tag: "CreateAgent",
            agentType: "coder",
            name: "coder-1",
          },
          dependencies: [],
          status: "pending",
        },
        "node-2": {
          id: "node-2",
          tool: {
            tag: "CommandAgent",
            name: "coder-1",
            instruction: "Do work",
          },
          dependencies: ["node-1"],
          status: "pending",
        },
      },
      parallelBatches: [["node-1"], ["node-2"]],
    };

    const program = Effect.gen(function* (_) {
      const executor = yield* _(ExecutionServiceTag);
      const result = yield* _(executor.executeParallel(plan));
      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(TestLayer))
    );

    expect(result.completedNodes).toEqual(["node-1", "node-2"]);
    expect(result.outputs["node-1"]).toContain("Created coder agent");
    expect(result.outputs["node-2"]).toBe("Executed: Do work");
  });

  it("should handle all AgentTool variants type-safely", async () => {
    const tools: AgentTool[] = [
      { tag: "CreateAgent", agentType: "browser", name: "browser-1" },
      { tag: "CommandAgent", name: "coder-1", instruction: "Test" },
      { tag: "BrowserUse", task: "Navigate", url: "https://test.com" },
    ];

    const plan: ExecutionPlan = {
      id: "plan-4",
      nodes: {
        "node-1": {
          id: "node-1",
          tool: tools[0],
          dependencies: [],
          status: "pending",
        },
        "node-2": {
          id: "node-2",
          tool: tools[1],
          dependencies: [],
          status: "pending",
        },
        "node-3": {
          id: "node-3",
          tool: tools[2],
          dependencies: [],
          status: "pending",
        },
      },
      parallelBatches: [["node-1", "node-2", "node-3"]],
    };

    const program = Effect.gen(function* (_) {
      const executor = yield* _(ExecutionServiceTag);
      const result = yield* _(executor.executeParallel(plan));
      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(TestLayer))
    );

    expect(result.completedNodes).toHaveLength(3);
    expect(result.failedNodes).toHaveLength(0);
  });

  it("should continue execution even if a batch fails", async () => {
    const FailingCoderService = Layer.succeed(CoderServiceTag, {
      createSession: (name: string) => Effect.succeed(`Session: ${name}`),
      execute: () => Effect.fail(new Error("Coder execution failed")),
    });

    const FailingLayer = ExecutionServiceLive.pipe(
      Layer.provide(FailingCoderService),
      Layer.provide(MockBrowserService)
    );

    const plan: ExecutionPlan = {
      id: "plan-5",
      nodes: {
        "node-1": {
          id: "node-1",
          tool: {
            tag: "CommandAgent",
            name: "coder-1",
            instruction: "Will fail",
          },
          dependencies: [],
          status: "pending",
        },
        "node-2": {
          id: "node-2",
          tool: {
            tag: "CreateAgent",
            agentType: "browser",
            name: "browser-1",
          },
          dependencies: [],
          status: "pending",
        },
      },
      parallelBatches: [["node-1"], ["node-2"]],
    };

    const program = Effect.gen(function* (_) {
      const executor = yield* _(ExecutionServiceTag);
      const result = yield* _(executor.executeParallel(plan));
      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(FailingLayer))
    );

    expect(result.failedNodes).toContain("node-1");
    expect(result.completedNodes).toContain("node-2");
  });
});
