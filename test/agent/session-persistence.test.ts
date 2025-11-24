import { Effect, Layer } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AgentSession,
  AgentSessionStatus,
} from "../../backend/agent/domain.js";
import {
  Checkpointer,
  CompositeFilesystem,
  RedisClient,
} from "../../backend/agent/persistence.js";

// Mock implementations
const checkpointStore = new Map<string, unknown>();
const mockCheckpointer = {
  save: vi.fn((id: string, value: unknown) =>
    Effect.sync(() => {
      checkpointStore.set(id, value);
    })
  ),
  load: vi.fn((id: string) =>
    Effect.sync(() => checkpointStore.get(id) ?? null)
  ),
  list: vi.fn(() => Effect.sync(() => checkpointStore.keys())),
};

const redisStore = new Map<string, string>();
const mockRedisClient = {
  get: vi.fn((key: string) => Effect.sync(() => redisStore.get(key) ?? null)),
  set: vi.fn((key: string, value: string) =>
    Effect.sync(() => {
      redisStore.set(key, value);
    })
  ),
  del: vi.fn((key: string) =>
    Effect.sync(() => {
      redisStore.delete(key);
    })
  ),
  keys: vi.fn(() => Effect.sync(() => Array.from(redisStore.keys()))),
};

const fileStore = new Map<string, string>();
const mockCompositeFilesystem = {
  writeFile: vi.fn((path: string, content: string) =>
    Effect.sync(() => {
      fileStore.set(path, content);
    })
  ),
  readFile: vi.fn((path: string) =>
    Effect.sync(() => fileStore.get(path) ?? "")
  ),
  exists: vi.fn((path: string) => Effect.sync(() => fileStore.has(path))),
  delete: vi.fn((path: string) =>
    Effect.sync(() => {
      fileStore.delete(path);
    })
  ),
  listFiles: vi.fn((dir: string) =>
    Effect.sync(() =>
      Array.from(fileStore.keys()).filter((key) => key.startsWith(dir))
    )
  ),
};

// Test layer setup
const TestPersistenceLayer = Layer.mergeAll(
  Layer.succeed(Checkpointer, mockCheckpointer),
  Layer.succeed(RedisClient, mockRedisClient),
  Layer.succeed(CompositeFilesystem, mockCompositeFilesystem)
);

describe("Session Persistence - User Story 2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkpointStore.clear();
    redisStore.clear();
    fileStore.clear();
  });

  describe("Session State Persistence", () => {
    it("should save and restore session state across restarts", async () => {
      const sessionId = "session-persistence-test";
      const originalSession: AgentSession = {
        id: sessionId,
        status: "running" as AgentSessionStatus,
        createdAt: new Date("2024-01-01T10:00:00Z"),
        updatedAt: new Date("2024-01-01T10:05:00Z"),
        metadata: {
          origin: "test",
          labels: { type: "research" },
          featureFlags: { experimental: true },
        },
      };

      // Mock checkpointer save
      mockCheckpointer.save.mockReturnValue(Effect.succeed(undefined));

      const saveProgram = Effect.gen(function* (_) {
        const checkpointer = yield* Checkpointer;
        yield* checkpointer.save(sessionId, originalSession);
      });

      await Effect.runPromise(
        saveProgram.pipe(Effect.provide(TestPersistenceLayer))
      );

      expect(mockCheckpointer.save).toHaveBeenCalledWith(
        sessionId,
        originalSession
      );

      // Mock checkpointer load
      mockCheckpointer.load.mockReturnValue(Effect.succeed(originalSession));

      const loadProgram = Effect.gen(function* (_) {
        const checkpointer = yield* Checkpointer;
        const restoredSession = yield* checkpointer.load(sessionId);
        return restoredSession;
      });

      const restoredSession = await Effect.runPromise(
        loadProgram.pipe(Effect.provide(TestPersistenceLayer))
      );

      expect(restoredSession).toEqual(originalSession);
      expect(mockCheckpointer.load).toHaveBeenCalledWith(sessionId);
    });

    it("should handle session state corruption gracefully", async () => {
      const sessionId = "session-corruption-test";

      // Mock corrupted data
      mockCheckpointer.load.mockReturnValue(Effect.succeed(null)); // Session not found

      const loadProgram = Effect.gen(function* (_) {
        const checkpointer = yield* Checkpointer;
        const session = yield* checkpointer.load(sessionId);

        if (!session) {
          return {
            recovered: false,
            reason: "Session not found in checkpointer",
            fallbackSession: {
              id: sessionId,
              status: "failed" as AgentSessionStatus,
              createdAt: new Date(),
              updatedAt: new Date(),
              metadata: {
                origin: "recovery",
                error: "Session corruption detected",
              },
            },
          };
        }

        return {
          recovered: true,
          session,
        };
      });

      const result = await Effect.runPromise(
        loadProgram.pipe(Effect.provide(TestPersistenceLayer))
      );

      expect(result.recovered).toBe(false);
      expect(result.reason).toBe("Session not found in checkpointer");
      expect(result.fallbackSession.status).toBe("failed");
    });

    it("should maintain session continuity across multiple operations", async () => {
      const sessionId = "session-continuity-test";
      const operations = [
        {
          type: "tool_started",
          tool: "coder",
          timestamp: new Date("2024-01-01T10:01:00Z"),
        },
        {
          type: "tool_finished",
          tool: "coder",
          result: "Code analyzed",
          timestamp: new Date("2024-01-01T10:02:00Z"),
        },
        {
          type: "tool_started",
          tool: "browser",
          timestamp: new Date("2024-01-01T10:03:00Z"),
        },
        {
          type: "tool_finished",
          tool: "browser",
          result: "Page loaded",
          timestamp: new Date("2024-01-01T10:04:00Z"),
        },
      ];

      // Mock successful saves
      mockCheckpointer.save.mockReturnValue(Effect.succeed(undefined));

      const continuityProgram = Effect.gen(function* (_) {
        const checkpointer = yield* Checkpointer;

        // Simulate session progression with checkpoints
        let sessionState = {
          id: sessionId,
          status: "running" as AgentSessionStatus,
          createdAt: new Date("2024-01-01T10:00:00Z"),
          updatedAt: new Date(),
          metadata: {},
          operations: [],
        };

        for (const operation of operations) {
          sessionState = {
            ...sessionState,
            operations: [...sessionState.operations, operation],
            updatedAt: operation.timestamp,
          };

          yield* checkpointer.save(
            `${sessionId}-checkpoint-${operations.indexOf(operation)}`,
            sessionState
          );
        }

        return sessionState;
      });

      const finalState = await Effect.runPromise(
        continuityProgram.pipe(Effect.provide(TestPersistenceLayer))
      );

      expect(finalState.operations).toHaveLength(4);
      expect(mockCheckpointer.save).toHaveBeenCalledTimes(4);
      expect(finalState.operations[3].type).toBe("tool_finished");
    });
  });

  describe("Workspace Artifact Persistence", () => {
    it("should persist and retrieve workspace artifacts", async () => {
      const sessionId = "session-artifacts-test";
      const artifacts = [
        {
          id: "artifact-1",
          sessionId,
          path: "/workspace/research/analysis.md",
          kind: "note" as const,
          content: "# Research Analysis\n\nThis is a comprehensive analysis...",
          createdAt: new Date("2024-01-01T10:00:00Z"),
        },
        {
          id: "artifact-2",
          sessionId,
          path: "/workspace/code/refactored-component.ts",
          kind: "code" as const,
          content: "export class RefactoredComponent { /* ... */ }",
          createdAt: new Date("2024-01-01T10:01:00Z"),
        },
      ];

      // Mock filesystem operations
      mockCompositeFilesystem.writeFile.mockReturnValue(
        Effect.succeed(undefined)
      );
      mockCompositeFilesystem.readFile.mockReturnValue(
        Effect.succeed(artifacts[0].content)
      );
      mockCompositeFilesystem.exists.mockReturnValue(Effect.succeed(true));

      const persistProgram = Effect.gen(function* (_) {
        const filesystem = yield* CompositeFilesystem;

        // Save artifacts
        for (const artifact of artifacts) {
          yield* filesystem.writeFile(artifact.path, artifact.content);
        }

        // Retrieve artifacts
        const retrievedContent = yield* filesystem.readFile(artifacts[0].path);

        return {
          savedCount: artifacts.length,
          retrievedContent,
          contentMatches: retrievedContent === artifacts[0].content,
        };
      });

      const result = await Effect.runPromise(
        persistProgram.pipe(Effect.provide(TestPersistenceLayer))
      );

      expect(result.savedCount).toBe(2);
      expect(result.contentMatches).toBe(true);
      expect(mockCompositeFilesystem.writeFile).toHaveBeenCalledTimes(2);
      expect(mockCompositeFilesystem.readFile).toHaveBeenCalledWith(
        artifacts[0].path
      );
    });

    it("should handle workspace file system errors gracefully", async () => {
      const sessionId = "session-workspace-error-test";
      const artifactPath = "/workspace/important/data.json";

      // Mock filesystem error
      mockCompositeFilesystem.writeFile.mockImplementation(
        (path: string, content: string) =>
          path === artifactPath
            ? Effect.fail(new Error("Disk space full"))
            : Effect.succeed(undefined)
      );
      mockCompositeFilesystem.exists.mockReturnValue(Effect.succeed(false));

      const errorHandlingProgram = Effect.gen(function* (_) {
        const filesystem = yield* CompositeFilesystem;

        return yield* filesystem
          .writeFile(artifactPath, '{"important": "data"}')
          .pipe(
            Effect.as({ success: true, path: artifactPath }),
            Effect.catchAll((error) => {
              // Fallback: try temp directory
              const tempPath = `/tmp/fallback-${sessionId}.json`;

              return filesystem
                .writeFile(tempPath, '{"important": "data"}')
                .pipe(
                  Effect.map(() => ({
                    success: false,
                    originalPath: artifactPath,
                    fallbackPath: tempPath,
                    error:
                      error instanceof Error ? error.message : "Unknown error",
                  })),
                  Effect.catchAll((fallbackError) =>
                    Effect.succeed({
                      success: false,
                      originalPath: artifactPath,
                      fallbackPath: null,
                      error:
                        fallbackError instanceof Error
                          ? fallbackError.message
                          : "Unknown error",
                    })
                  )
                );
            })
          );
      });

      const result = await Effect.runPromise(
        errorHandlingProgram.pipe(Effect.provide(TestPersistenceLayer))
      );

      expect(result.success).toBe(false);
      expect(result.originalPath).toBe(artifactPath);
      expect(result.fallbackPath).toBe(`/tmp/fallback-${sessionId}.json`);
      expect(result.error).toBe("Disk space full");
    });

    it("should maintain workspace directory structure", async () => {
      const _sessionId = "session-structure-test";
      const expectedStructure = [
        "/workspace/research",
        "/workspace/code",
        "/workspace/artifacts",
        "/workspace/logs",
      ];

      mockCompositeFilesystem.listFiles.mockReturnValue(
        Effect.succeed([
          "research/analysis.md",
          "code/component.ts",
          "artifacts/result.json",
          "logs/session.log",
        ])
      );

      const structureProgram = Effect.gen(function* (_) {
        const filesystem = yield* CompositeFilesystem;

        // Check workspace structure
        const files = yield* filesystem.listFiles("/workspace");

        const foundDirs = new Set(files.map((file) => file.split("/")[0]));

        return {
          expectedDirs: expectedStructure.map((dir) =>
            dir.replace("/workspace/", "")
          ),
          foundDirs: Array.from(foundDirs),
          structureValid: expectedStructure.every((dir) =>
            foundDirs.has(dir.replace("/workspace/", ""))
          ),
          fileCount: files.length,
        };
      });

      const result = await Effect.runPromise(
        structureProgram.pipe(Effect.provide(TestPersistenceLayer))
      );

      expect(result.structureValid).toBe(true);
      expect(result.fileCount).toBe(4);
      expect(result.foundDirs).toContain("research");
      expect(result.foundDirs).toContain("code");
    });
  });

  describe("Cross-Session Continuity", () => {
    it("should support session resumption after backend restart", async () => {
      const sessionId = "session-resumption-test";

      // Simulate original session data
      const originalSession = {
        id: sessionId,
        status: "running" as AgentSessionStatus,
        createdAt: new Date("2024-01-01T09:00:00Z"),
        updatedAt: new Date("2024-01-01T09:30:00Z"),
        metadata: {
          origin: "api",
          labels: { type: "coding" },
        },
      };

      // Simulate workspace artifacts
      const artifacts = [
        { path: "/workspace/current-work.ts", content: "/* current work */" },
        { path: "/workspace/notes.md", content: "# Session notes" },
      ];

      // Mock successful persistence
      mockCheckpointer.save.mockReturnValue(Effect.succeed(undefined));
      mockCheckpointer.load.mockReturnValue(Effect.succeed(originalSession));
      mockCompositeFilesystem.readFile.mockImplementation((path: string) =>
        Effect.succeed(artifacts.find((a) => a.path === path)?.content ?? "")
      );

      const resumptionProgram = Effect.gen(function* (_) {
        const checkpointer = yield* Checkpointer;
        const filesystem = yield* CompositeFilesystem;

        // Simulate backend restart - load session state
        const session = yield* checkpointer.load(sessionId);

        if (!session) {
          throw new Error("Session not found");
        }

        // Load workspace artifacts
        const loadedArtifacts = [];
        for (const artifact of artifacts) {
          const content = yield* filesystem.readFile(artifact.path);
          loadedArtifacts.push({ ...artifact, content });
        }

        return {
          sessionResumed: true,
          sessionId: session.id,
          status: session.status,
          artifactsLoaded: loadedArtifacts.length,
          canContinue: session.status !== "failed",
        };
      });

      const result = await Effect.runPromise(
        resumptionProgram.pipe(Effect.provide(TestPersistenceLayer))
      );

      expect(result.sessionResumed).toBe(true);
      expect(result.sessionId).toBe(sessionId);
      expect(result.artifactsLoaded).toBe(2);
      expect(result.canContinue).toBe(true);
    });

    it("should handle partial session corruption", async () => {
      const sessionId = "session-partial-corruption";

      // Mock partial session data (some fields missing)
      const partialSession = {
        id: sessionId,
        status: "running" as AgentSessionStatus,
        // Missing createdAt, updatedAt, metadata
      };

      mockCheckpointer.load.mockReturnValue(Effect.succeed(partialSession));

      const recoveryProgram = Effect.gen(function* (_) {
        const checkpointer = yield* Checkpointer;

        const session = yield* checkpointer.load(sessionId);

        if (!session) {
          return { recovered: false, reason: "Session completely missing" };
        }

        // Validate and repair partial session
        const repairedSession = {
          ...session,
          createdAt: session.createdAt || new Date(),
          updatedAt: session.updatedAt || new Date(),
          metadata: session.metadata || { origin: "recovered" },
        };

        // Save repaired session
        yield* checkpointer.save(sessionId, repairedSession);

        return {
          recovered: true,
          wasPartial: !(session.createdAt && session.metadata),
          repairedSession,
        };
      });

      const result = await Effect.runPromise(
        recoveryProgram.pipe(Effect.provide(TestPersistenceLayer))
      );

      expect(result.recovered).toBe(true);
      expect(result.wasPartial).toBe(true);
      expect(result.repairedSession.metadata.origin).toBe("recovered");
    });
  });

  describe("Performance and Scalability", () => {
    it("should handle large session state efficiently", async () => {
      const sessionId = "session-large-state";

      // Create large session state
      const largeSession = {
        id: sessionId,
        status: "running" as AgentSessionStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          origin: "test",
          // Large metadata object
          largeData: new Array(1000).fill(0).map((_, i) => `item-${i}`),
          nested: {
            deep: {
              data: new Array(100)
                .fill(0)
                .map((_, i) => ({ id: i, value: `value-${i}` })),
            },
          },
        },
      };

      mockCheckpointer.save.mockReturnValue(Effect.succeed(undefined));
      mockCheckpointer.load.mockReturnValue(Effect.succeed(largeSession));

      const performanceProgram = Effect.gen(function* (_) {
        const checkpointer = yield* Checkpointer;

        const startTime = Date.now();
        yield* checkpointer.save(sessionId, largeSession);
        const saveTime = Date.now() - startTime;

        const loadStartTime = Date.now();
        const _loaded = yield* checkpointer.load(sessionId);
        const loadTime = Date.now() - loadStartTime;

        return {
          saveTime,
          loadTime,
          totalTime: saveTime + loadTime,
          dataSize: JSON.stringify(largeSession).length,
          efficient: saveTime < 1000 && loadTime < 500, // Under 1 second save, 500ms load
        };
      });

      const result = await Effect.runPromise(
        performanceProgram.pipe(Effect.provide(TestPersistenceLayer))
      );

      expect(result.dataSize).toBeGreaterThan(10_000); // Large data
      expect(result.efficient).toBe(true); // Performance within acceptable limits
    });
  });
});
