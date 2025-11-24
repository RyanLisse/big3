import { Effect, Layer, Option } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type AgentSession,
  AgentSessionRepo,
  type AgentSessionStatus,
  type WorkspaceArtifact,
  WorkspaceArtifactRepo,
} from "../../backend/agent/domain.js";
import { RedisClient, RedisSaver } from "../../backend/agent/persistence.js";
import {
  generateId,
  safeJsonParse,
  safeJsonStringify,
  validateSessionId,
} from "../../backend/agent/shared/utils.js";

// Mock implementations
const mockRedisClient = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
  flushall: vi.fn(),
};

const mockRedisSaver = {
  store: new Map<string, unknown>(),
  save: vi.fn((id: string, value: unknown) =>
    Effect.sync(() => {
      mockRedisSaver.store.set(id, value);
    })
  ),
  load: vi.fn((id: string) =>
    Effect.sync(() => mockRedisSaver.store.get(id) ?? null)
  ),
  list: vi.fn(() =>
    Effect.sync(function* () {
      return mockRedisSaver.store.entries();
    })
  ),
};

const inMemorySessions = new Map<string, AgentSession>();
const inMemoryArtifacts = new Map<string, WorkspaceArtifact>();

const mockSessionRepo: AgentSessionRepo = {
  create: (session) =>
    Effect.sync(() => {
      inMemorySessions.set(session.id, session);
      return session;
    }),
  findById: (id) =>
    Effect.sync(() => {
      const value = inMemorySessions.get(id);
      return value ? { _tag: "Some", value } : { _tag: "None" as const };
    }),
  update: (id, updates) =>
    Effect.sync(() => {
      const current = inMemorySessions.get(id);
      if (!current) {
        throw new Error(`Session ${id} not found`);
      }
      const updated = { ...current, ...updates, updatedAt: new Date() };
      inMemorySessions.set(id, updated);
      return updated;
    }),
  delete: (id) =>
    Effect.sync(() => {
      inMemorySessions.delete(id);
    }),
  listActive: () =>
    Effect.sync(() => Array.from(inMemorySessions.values())),
  get: (id: string) =>
    Effect.sync(() => inMemorySessions.get(id) ?? null),
};

const mockArtifactRepo: WorkspaceArtifactRepo = {
  create: (artifact) =>
    Effect.sync(() => {
      inMemoryArtifacts.set(artifact.id, artifact);
      return artifact;
    }),
  findBySessionId: (sessionId) =>
    Effect.sync(() =>
      Array.from(inMemoryArtifacts.values()).filter(
        (artifact) => artifact.sessionId === sessionId
      )
    ),
  get: (id) =>
    Effect.sync(() => Option.fromNullable(inMemoryArtifacts.get(id))),
  update: (artifact) =>
    Effect.sync(() => {
      inMemoryArtifacts.set(artifact.id, artifact);
      return artifact;
    }),
  delete: (id) =>
    Effect.sync(() => {
      inMemoryArtifacts.delete(id);
    }),
  findByKind: (sessionId, kind) =>
    Effect.sync(() =>
      Array.from(inMemoryArtifacts.values()).filter(
        (artifact) => artifact.sessionId === sessionId && artifact.kind === kind
      )
    ),
  listBySession: (sessionId) =>
    Effect.sync(() =>
      Array.from(inMemoryArtifacts.values()).filter(
        (artifact) => artifact.sessionId === sessionId
      )
    ),
};

// Test layer setup
const TestRedisLayer = Layer.mergeAll(
  Layer.succeed(RedisClient, mockRedisClient),
  Layer.succeed(RedisSaver, mockRedisSaver),
  Layer.succeed(AgentSessionRepo, mockSessionRepo),
  Layer.succeed(WorkspaceArtifactRepo, mockArtifactRepo)
);

describe("Persistence Property-Based Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inMemorySessions.clear();
    inMemoryArtifacts.clear();
    mockRedisSaver.store.clear();
  });

  describe("Session Repository Properties", () => {
    it("should maintain session ID uniqueness", async () => {
      const sessionIds = new Set<string>();
      const numSessions = 100;

      // Generate multiple session IDs and check uniqueness
      for (let i = 0; i < numSessions; i++) {
        const sessionId = generateId("session");
        expect(sessionIds.has(sessionId)).toBe(false);
        sessionIds.add(sessionId);
        expect(sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
      }

      expect(sessionIds.size).toBe(numSessions);
    });

    it("should preserve session state through save/load cycle", async () => {
      const originalSession: AgentSession = {
        id: generateId("session"),
        status: "running" as AgentSessionStatus,
        createdAt: new Date("2025-01-01T10:00:00Z"),
        updatedAt: new Date("2025-01-01T10:30:00Z"),
        metadata: {
          userId: "user-123",
          project: "test-project",
          tags: ["urgent", "frontend"],
        },
      };

      // Mock Redis operations
      mockRedisClient.set.mockResolvedValue("OK");
      mockRedisClient.get.mockResolvedValue(JSON.stringify(originalSession));

      // Test save/load cycle
      const savedSession = await Effect.runPromise(
        AgentSessionRepo.pipe(
          Effect.flatMap((repo) => repo.create(originalSession)),
          Effect.provide(TestRedisLayer)
        )
      );

      expect(savedSession.id).toBe(originalSession.id);
      expect(savedSession.status).toBe(originalSession.status);
      expect(savedSession.metadata).toEqual(originalSession.metadata);

      const loadedSessionOpt = await Effect.runPromise(
        AgentSessionRepo.pipe(
          Effect.flatMap((repo) => repo.findById(originalSession.id)),
          Effect.provide(TestRedisLayer)
        )
      );

      const loadedSession = loadedSessionOpt?._tag === "Some" ? loadedSessionOpt.value : null;

      expect(loadedSession).not.toBeNull();
      expect(loadedSession?.id).toBe(originalSession.id);
      expect(loadedSession?.status).toBe(originalSession.status);
      expect(loadedSession?.metadata).toEqual(originalSession.metadata);
    });

    it("should handle concurrent session operations safely", async () => {
      const numConcurrent = 20;
      const sessions: AgentSession[] = [];

      // Create multiple sessions
      for (let i = 0; i < numConcurrent; i++) {
        sessions.push({
          id: generateId("session"),
          status: "running" as AgentSessionStatus,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: { index: i },
        });
      }

      // Mock Redis to handle concurrent operations
      mockRedisClient.set.mockResolvedValue("OK");
      mockRedisClient.get.mockImplementation((key) => {
        const session = sessions.find((s) => key.includes(s.id));
        return Promise.resolve(session ? JSON.stringify(session) : null);
      });

      // Run concurrent operations
      const operations = sessions.map((session) =>
        Effect.gen(function* () {
          const repo = yield* AgentSessionRepo;
          yield* repo.create(session);
          const sessionOption = yield* repo.findById(session.id);
          return sessionOption._tag === "Some" ? sessionOption.value : null;
        })
      );

      const results = await Effect.runPromise(
        Effect.all(operations).pipe(Effect.provide(TestRedisLayer))
      );

      expect(results).toHaveLength(numConcurrent);
      results.forEach((result, index) => {
        expect(result.id).toBe(sessions[index].id);
        expect(result.metadata?.index).toBe(index);
      });
    });

    it("should maintain session status transitions", async () => {
      const validTransitions: Record<AgentSessionStatus, AgentSessionStatus[]> =
        {
          planning: ["running", "failed", "cancelled"],
          running: ["waiting_for_input", "completed", "failed", "cancelled"],
          waiting_for_input: ["running", "cancelled"],
          completed: [], // Terminal state
          failed: [], // Terminal state
          cancelled: [], // Terminal state
        };

      const sessionId = generateId("session");
      mockRedisClient.set.mockResolvedValue("OK");
      mockRedisClient.get.mockResolvedValue(null);

      // Test all valid transitions
      for (const [fromStatus, toStatuses] of Object.entries(validTransitions)) {
        for (const toStatus of toStatuses) {
          const session: AgentSession = {
            id: sessionId,
            status: fromStatus as AgentSessionStatus,
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: {},
          };

          await Effect.runPromise(
            AgentSessionRepo.pipe(
              Effect.flatMap((repo) => repo.create(session)),
              Effect.provide(TestRedisLayer)
            )
          );

          const updates = { status: toStatus as AgentSessionStatus };
          const result = await Effect.runPromise(
            AgentSessionRepo.pipe(
              Effect.flatMap((repo) => repo.update(sessionId, updates)),
              Effect.provide(TestRedisLayer)
            )
          );

          expect(result.status).toBe(toStatus);
        }
      }
    });
  });

  describe("Artifact Repository Properties", () => {
    it("should generate unique artifact IDs", async () => {
      const artifactIds = new Set<string>();
      const numArtifacts = 50;

      for (let i = 0; i < numArtifacts; i++) {
        const artifactId = generateId("artifact");
        expect(artifactIds.has(artifactId)).toBe(false);
        artifactIds.add(artifactId);
        expect(artifactId).toMatch(/^artifact_\d+_[a-z0-9]+$/);
      }

      expect(artifactIds.size).toBe(numArtifacts);
    });

    it("should maintain artifact size calculations", async () => {
      const contents = [
        "Small content",
        "Medium content with more text".repeat(10),
        "Large content".repeat(100),
        JSON.stringify({ data: "test", nested: { value: 42 } }, null, 2),
      ];

      const artifacts = contents.map((content, index) => ({
        id: generateId("artifact"),
        sessionId: generateId("session"),
        path: `/workspace/test/file-${index}.ts`,
        kind: "code" as const,
        content,
        size: content.length,
        checksum: `checksum-${index}`,
        createdAt: new Date(),
        metadata: {},
      }));

      // Verify size calculations
      artifacts.forEach((artifact, index) => {
        expect(artifact.size).toBe(contents[index].length);
        expect(artifact.size).toBeGreaterThan(0);
      });

      // Test repository operations
      mockRedisClient.set.mockResolvedValue("OK");
      mockRedisClient.get.mockImplementation((key) => {
        const artifact = artifacts.find((a) => key.includes(a.id));
        return Promise.resolve(artifact ? JSON.stringify(artifact) : null);
      });

      for (const artifact of artifacts) {
        const savedArtifact = await Effect.runPromise(
          WorkspaceArtifactRepo.pipe(
            Effect.flatMap((repo) => repo.create(artifact)),
            Effect.provide(TestRedisLayer)
          )
        );

        expect(savedArtifact.size).toBe(artifact.size);
        expect(savedArtifact.checksum).toBe(artifact.checksum);
      }
    });

    it("should handle artifact filtering by session", async () => {
      const sessionId1 = generateId("session");
      const sessionId2 = generateId("session");

      const artifacts: WorkspaceArtifact[] = [];

      // Create artifacts for both sessions
      for (let i = 0; i < 10; i++) {
        const sessionId = i < 6 ? sessionId1 : sessionId2;
        artifacts.push({
          id: generateId("artifact"),
          sessionId,
          path: `/workspace/file-${i}.ts`,
          kind: "code" as const,
          content: `// File ${i}`,
          size: 10,
          createdAt: new Date(),
          metadata: {},
        });
      }

      await Promise.all(
        artifacts.map(artifact =>
          Effect.runPromise(
            WorkspaceArtifactRepo.pipe(
              Effect.flatMap((repo) => repo.create(artifact)),
              Effect.provide(TestRedisLayer)
            )
          )
        )
      );

      // Mock Redis to return artifacts by session
      mockRedisClient.get.mockImplementation((key) => {
        if (key.includes("keys")) {
          return Promise.resolve(
            artifacts.map((a) => `artifact:${a.id}`).join("\n")
          );
        }
        const artifact = artifacts.find((a) => key.includes(a.id));
        return Promise.resolve(artifact ? JSON.stringify(artifact) : null);
      });

      // Test filtering by session
      const session1Artifacts = await Effect.runPromise(
        WorkspaceArtifactRepo.pipe(
          Effect.flatMap((repo) => repo.findBySessionId(sessionId1)),
          Effect.provide(TestRedisLayer)
        )
      );

      const session2Artifacts = await Effect.runPromise(
        WorkspaceArtifactRepo.pipe(
          Effect.flatMap((repo) => repo.listBySession(sessionId2)),
          Effect.provide(TestRedisLayer)
        )
      );

      expect(session1Artifacts).toHaveLength(6);
      expect(session2Artifacts).toHaveLength(4);

      for (const artifact of session1Artifacts) {
        expect(artifact.sessionId).toBe(sessionId1);
  }

      for (const artifact of session2Artifacts) {
        expect(artifact.sessionId).toBe(sessionId2);
  }
    });
  });

  describe("Redis Checkpointer Properties", () => {
    it("should handle checkpoint serialization/deserialization", async () => {
      const checkpoints = [
        {
          thread_id: generateId("session"),
          checkpoint: {
            id: generateId("checkpoint"),
            step: 1,
            data: { message: "Test checkpoint 1" },
            timestamp: new Date().toISOString(),
          },
        },
        {
          thread_id: generateId("session"),
          checkpoint: {
            id: generateId("checkpoint"),
            step: 2,
            data: { message: "Test checkpoint 2", nested: { value: 42 } },
            timestamp: new Date().toISOString(),
          },
        },
      ];

      // Test save/load cycles
      for (const checkpointData of checkpoints) {
        await Effect.runPromise(
          mockRedisSaver.save(
            checkpointData.thread_id,
            checkpointData.checkpoint
          )
        );

        const loadedCheckpoint = await Effect.runPromise(
          mockRedisSaver.load(checkpointData.thread_id)
        );

        expect(loadedCheckpoint).toEqual(checkpointData.checkpoint);
        expect(loadedCheckpoint?.id).toBe(checkpointData.checkpoint.id);
        expect(loadedCheckpoint?.step).toBe(checkpointData.checkpoint.step);
      }
    });

    it("should maintain checkpoint ordering", async () => {
      const threadId = generateId("session");
      const numCheckpoints = 10;
      const checkpoints: any[] = [];

      // Create sequential checkpoints
      for (let i = 1; i <= numCheckpoints; i++) {
        const checkpoint = {
          id: generateId("checkpoint"),
          step: i,
          data: { iteration: i },
          timestamp: new Date(Date.now() + i * 1000).toISOString(),
        };
        checkpoints.push(checkpoint);
      }

      // Save checkpoints in order
      for (let i = 0; i < numCheckpoints; i++) {
        await Effect.runPromise(
          mockRedisSaver.save(threadId, checkpoints[i])
        );
      }

      // Load latest checkpoint
      const latestCheckpoint = await Effect.runPromise(
        mockRedisSaver.load(threadId)
      );

      expect(latestCheckpoint?.step).toBe(numCheckpoints);
      expect(latestCheckpoint?.data?.iteration).toBe(numCheckpoints);
    });
  });

  describe("JSON Serialization Properties", () => {
    it("should handle various data types safely", async () => {
      const testData = [
        { string: "test", number: 42, boolean: true },
        { array: [1, 2, 3], object: { nested: "value" } },
        { date: new Date().toISOString(), null: null, undefined },
        {
          complex: {
            nested: { deep: { value: 42 } },
            array: [{ item: "test" }],
          },
        },
      ];

      for (const data of testData) {
        // Test serialization
        const jsonString = await Effect.runPromise(
          safeJsonStringify(data, "test")
        );
        expect(jsonString).toBeDefined();
        expect(typeof jsonString).toBe("string");

        // Test deserialization
        const parsedData = await Effect.runPromise(
          safeJsonParse(jsonString, "test")
        );
        expect(parsedData).toEqual(data);
      }
    });

    it("should handle malformed JSON gracefully", async () => {
      const malformedJsonStrings = [
        "",
        "{ invalid json",
        "undefined",
        "nul",
        '"unclosed string',
        '{"missing": "value',
      ];

      for (const malformed of malformedJsonStrings) {
        await expect(Effect.runPromise(safeJsonParse(malformed, "test"))).rejects.toThrow(/Invalid JSON/);
      }
    });

    it("should handle circular references", async () => {
      const circularData: any = { name: "test" };
      circularData.self = circularData;

      const result = await Effect.runPromise(
        safeJsonStringify(circularData, "test").pipe(
          Effect.flip,
          Effect.map((error) => error.message)
        )
      );

      expect(result).toContain("Failed to stringify JSON");
    });
  });

  describe("Validation Properties", () => {
    it("should validate session IDs consistently", async () => {
      const validIds = [
        "session-123",
        "session_abc_123",
        "session123",
        "SESSION_ABC",
        "session-123-456",
      ];

      const invalidIds = [
        "session 123", // space
        "session/123", // slash
        "session@123", // special char
        "session.123.456.invalid", // too many dots
        "session#123", // hash
      ];

      for (const validId of validIds) {
        const result = await Effect.runPromise(validateSessionId(validId));
        expect(result).toBe(validId);
      }

      for (const invalidId of invalidIds) {
        const result = await Effect.runPromise(
          validateSessionId(invalidId).pipe(
            Effect.flip,
            Effect.map((error) => error.message.toLowerCase())
          )
        );
        expect(result).toContain("session id");
      }
    });
  });

  describe("Performance Properties", () => {
    it("should handle large payloads efficiently", async () => {
      const largePayload = {
        data: new Array(1000).fill(null).map((_, i) => ({
          id: i,
          content: "x".repeat(100), // 100 chars per item
          metadata: { index: i, timestamp: Date.now() },
        })),
      };

      const startTime = Date.now();

      // Test serialization of large payload
      const jsonString = await Effect.runPromise(
        safeJsonStringify(largePayload, "large_payload_test")
      );
      const serializationTime = Date.now() - startTime;

      expect(jsonString.length).toBeGreaterThan(100_000); // Should be > 100KB
      expect(serializationTime).toBeLessThan(1000); // Should complete within 1 second

      // Test deserialization
      const deserializationStart = Date.now();
      const parsedData = await Effect.runPromise(
        safeJsonParse(jsonString, "large_payload_test")
      );
      const deserializationTime = Date.now() - deserializationStart;

      expect(parsedData).toEqual(largePayload);
      expect(deserializationTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it("should maintain performance under concurrent load", async () => {
      const numConcurrent = 50;
      const payloadSize = 1000;

      const payloads = Array.from({ length: numConcurrent }, (_, i) => ({
        id: i,
        data: "x".repeat(payloadSize),
        timestamp: Date.now(),
      }));

      // Mock Redis for concurrent operations
      mockRedisClient.set.mockResolvedValue("OK");
      mockRedisClient.get.mockImplementation((key) => {
        const index = Number.parseInt(key.split("_")[1] || "0", 10);
        return Promise.resolve(JSON.stringify(payloads[index]));
      });

      const startTime = Date.now();

      // Run concurrent save/load operations
      const operations = payloads.map((payload, index) =>
        Effect.gen(function* (_) {
          const jsonString = yield* safeJsonStringify(
            payload,
            `concurrent_test_${index}`
          );
          yield* Effect.succeed(mockRedisClient).pipe(
            Effect.flatMap((client) =>
              Effect.tryPromise(() => client.set(`test_${index}`, jsonString))
            )
          );
          const loadedJson = yield* Effect.succeed(mockRedisClient).pipe(
            Effect.flatMap((client) =>
              Effect.tryPromise(() => client.get(`test_${index}`))
            )
          );
          const parsed = yield* safeJsonParse(
            loadedJson || "",
            `concurrent_test_${index}`
          );
          return parsed;
        })
      );

      const results = await Effect.runPromise(Effect.all(operations));
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(numConcurrent);
      results.forEach((result, index) => {
        expect(result).toEqual(payloads[index]);
      });

      // Should complete within reasonable time (adjust threshold as needed)
      expect(totalTime).toBeLessThan(5000); // 5 seconds for 50 concurrent operations
    });
  });
});
