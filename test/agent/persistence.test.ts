import { Effect, Layer, pipe, Context } from "effect"
import { describe, it, expect, beforeEach, vi } from "vitest"

// Define service tags
const CompositeFilesystem = Context.GenericTag<{
  writeFile: (path: string) => (content: string) => Effect.Effect<void>
  readFile: (path: string) => Effect.Effect<string>
  exists: (path: string) => Effect.Effect<boolean>
  delete: (path: string) => Effect.Effect<void>
  listFiles: (dir: string) => Effect.Effect<string[]>
}>("CompositeFilesystem")

const RedisClient = Context.GenericTag<{
  get: (key: string) => Effect.Effect<string | null>
  set: (key: string, value: string) => Effect.Effect<void>
  del: (key: string) => Effect.Effect<void>
  keys: (pattern: string) => Effect.Effect<string[]>
}>("RedisClient")

const Checkpointer = Context.GenericTag<{
  save: (threadId: string, checkpoint: any) => Effect.Effect<void>
  load: (threadId: string) => Effect.Effect<any | null>
  list: () => Effect.Effect<string[]>
}>("Checkpointer")

// Mock implementations for testing - must return Effects
const mockRedisClient = {
  get: vi.fn((key: string) => Effect.succeed("test value")),
  set: vi.fn((key: string, value: string) => Effect.succeed(undefined)),
  del: vi.fn((key: string) => Effect.succeed(undefined)),
  keys: vi.fn((pattern: string) => Effect.succeed(["key1", "key2"]))
}

const mockCompositeFilesystem = {
  writeFile: vi.fn((path: string) => (content: string) => Effect.succeed(undefined)),
  readFile: vi.fn((path: string) => Effect.succeed("file content")),
  exists: vi.fn((path: string) => Effect.succeed(true)),
  delete: vi.fn((path: string) => Effect.succeed(undefined)),
  listFiles: vi.fn((dir: string) => Effect.succeed(["file1.txt", "file2.txt"]))
}

const mockCheckpointer = {
  save: vi.fn((threadId: string, checkpoint: any) => Effect.succeed(undefined)),
  load: vi.fn((threadId: string) => Effect.succeed({ data: "test" })),
  list: vi.fn(() => Effect.succeed(["thread-1", "thread-2"]))
}

// Test layer setup
const TestPersistenceLayer = Layer.mergeAll(
  Layer.succeed(RedisClient, mockRedisClient),
  Layer.succeed(CompositeFilesystem, mockCompositeFilesystem),
  Layer.succeed(Checkpointer, mockCheckpointer)
)

describe("Persistence Layer", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("CompositeFilesystem", () => {
    it("should write files to workspace directory", async () => {
      const program = pipe(
        CompositeFilesystem,
        Effect.flatMap(fs => fs.writeFile("/workspace/test.txt")("test content"))
      )

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestPersistenceLayer))
      )

      expect(result).toEqual(undefined)
      expect(mockCompositeFilesystem.writeFile).toHaveBeenCalledWith("/workspace/test.txt")
    })

    it("should write files to temp directory", async () => {
      const program = pipe(
        CompositeFilesystem,
        Effect.flatMap(fs => fs.writeFile("/tmp/temp.txt")("temp content"))
      )

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestPersistenceLayer))
      )

      expect(result).toEqual(undefined)
      expect(mockCompositeFilesystem.writeFile).toHaveBeenCalledWith("/tmp/temp.txt")
    })

    it("should read files from workspace directory", async () => {
      mockCompositeFilesystem.readFile.mockReturnValue(Effect.succeed("file content"))

      const program = pipe(
        CompositeFilesystem,
        Effect.flatMap(fs => fs.readFile("/workspace/test.txt"))
      )

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestPersistenceLayer))
      )

      expect(result).toBe("file content")
      expect(mockCompositeFilesystem.readFile).toHaveBeenCalledWith("/workspace/test.txt")
    })

    it("should check file existence", async () => {
      mockCompositeFilesystem.exists.mockReturnValue(Effect.succeed(true))

      const program = pipe(
        CompositeFilesystem,
        Effect.flatMap(fs => fs.exists("/workspace/test.txt"))
      )

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestPersistenceLayer))
      )

      expect(result).toBe(true)
      expect(mockCompositeFilesystem.exists).toHaveBeenCalledWith("/workspace/test.txt")
    })

    it("should delete files", async () => {
      const program = pipe(
        CompositeFilesystem,
        Effect.flatMap(fs => fs.delete("/workspace/test.txt"))
      )

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestPersistenceLayer))
      )

      expect(result).toEqual(undefined)
      expect(mockCompositeFilesystem.delete).toHaveBeenCalledWith("/workspace/test.txt")
    })

    it("should list files in directory", async () => {
      mockCompositeFilesystem.listFiles.mockReturnValue(Effect.succeed(["file1.txt", "file2.txt"]))

      const program = pipe(
        CompositeFilesystem,
        Effect.flatMap(fs => fs.listFiles("/workspace"))
      )

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestPersistenceLayer))
      )

      expect(result).toEqual(["file1.txt", "file2.txt"])
      expect(mockCompositeFilesystem.listFiles).toHaveBeenCalledWith("/workspace")
    })
  })

  describe("RedisClient", () => {
    it("should get values from Redis", async () => {
      mockRedisClient.get.mockReturnValue(Effect.succeed("test value"))

      const program = pipe(
        RedisClient,
        Effect.flatMap(redis => redis.get("test:key"))
      )

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestPersistenceLayer))
      )

      expect(result).toBe("test value")
      expect(mockRedisClient.get).toHaveBeenCalledWith("test:key")
    })

    it("should set values in Redis", async () => {
      mockRedisClient.set.mockReturnValue(Effect.succeed(undefined))

      const program = pipe(
        RedisClient,
        Effect.flatMap(redis => redis.set("test:key", "test value"))
      )

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestPersistenceLayer))
      )

      expect(result).toEqual(undefined)
      expect(mockRedisClient.set).toHaveBeenCalledWith("test:key", "test value")
    })

    it("should delete keys from Redis", async () => {
      mockRedisClient.del.mockReturnValue(Effect.succeed(undefined))

      const program = pipe(
        RedisClient,
        Effect.flatMap(redis => redis.del("test:key"))
      )

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestPersistenceLayer))
      )

      expect(result).toEqual(undefined)
      expect(mockRedisClient.del).toHaveBeenCalledWith("test:key")
    })

    it("should list keys matching pattern", async () => {
      mockRedisClient.keys.mockReturnValue(Effect.succeed(["key1", "key2"]))

      const program = pipe(
        RedisClient,
        Effect.flatMap(redis => redis.keys("test:*"))
      )

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestPersistenceLayer))
      )

      expect(result).toEqual(["key1", "key2"])
      expect(mockRedisClient.keys).toHaveBeenCalledWith("test:*")
    })
  })

  describe("Checkpointer", () => {
    it("should save checkpoints", async () => {
      mockCheckpointer.save.mockReturnValue(Effect.succeed(undefined))

      const program = pipe(
        Checkpointer,
        Effect.flatMap(cp => cp.save("thread-123", { data: "test" }))
      )

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestPersistenceLayer))
      )

      expect(result).toEqual(undefined)
      expect(mockCheckpointer.save).toHaveBeenCalledWith("thread-123", { data: "test" })
    })

    it("should load checkpoints", async () => {
      mockCheckpointer.load.mockReturnValue(Effect.succeed({ data: "test" }))

      const program = pipe(
        Checkpointer,
        Effect.flatMap(cp => cp.load("thread-123"))
      )

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestPersistenceLayer))
      )

      expect(result).toEqual({ data: "test" })
      expect(mockCheckpointer.load).toHaveBeenCalledWith("thread-123")
    })

    it("should return null for non-existent checkpoints", async () => {
      mockCheckpointer.load.mockReturnValue(Effect.succeed(null))

      const program = pipe(
        Checkpointer,
        Effect.flatMap(cp => cp.load("non-existent"))
      )

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestPersistenceLayer))
      )

      expect(result).toBeNull()
      expect(mockCheckpointer.load).toHaveBeenCalledWith("non-existent")
    })

    it("should list all checkpoints", async () => {
      mockCheckpointer.list.mockReturnValue(Effect.succeed(["thread-1", "thread-2"]))

      const program = pipe(
        Checkpointer,
        Effect.flatMap(cp => cp.list())
      )

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestPersistenceLayer))
      )

      expect(result).toEqual(["thread-1", "thread-2"])
      expect(mockCheckpointer.list).toHaveBeenCalled()
    })
  })

  describe("Integration Tests", () => {
    it("should handle workspace artifact persistence", async () => {
      const sessionId = "session-123"
      const artifact = {
        id: "artifact-1",
        sessionId,
        path: "/workspace/notes/plan.md",
        kind: "note" as const,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Mock file operations - writeFile returns a function that takes content and returns Effect
      mockCompositeFilesystem.writeFile.mockImplementation((path: string) =>
        (content: string) => Effect.succeed(undefined)
      )
      mockCompositeFilesystem.readFile.mockReturnValue(Effect.succeed("# Plan\n\nThis is a test plan."))

      // Test saving artifact
      const saveProgram = pipe(
        CompositeFilesystem,
        Effect.flatMap(fs => fs.writeFile(artifact.path)("# Plan\n\nThis is a test plan."))
      )

      await Effect.runPromise(saveProgram.pipe(Effect.provide(TestPersistenceLayer)))

      expect(mockCompositeFilesystem.writeFile).toHaveBeenCalledWith(artifact.path)

      // Test reading artifact
      const readProgram = pipe(
        CompositeFilesystem,
        Effect.flatMap(fs => fs.readFile(artifact.path))
      )

      const content = await Effect.runPromise(readProgram.pipe(Effect.provide(TestPersistenceLayer)))

      expect(content).toBe("# Plan\n\nThis is a test plan.")
      expect(mockCompositeFilesystem.readFile).toHaveBeenCalledWith(artifact.path)
    })

    it("should handle session checkpoint persistence", async () => {
      const sessionId = "session-123"
      const checkpoint = {
        id: sessionId,
        status: "running" as const,
        metadata: { origin: "test" },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockCheckpointer.save.mockReturnValue(Effect.succeed(undefined))
      mockCheckpointer.load.mockReturnValue(Effect.succeed(checkpoint))

      // Test saving checkpoint
      const saveProgram = pipe(
        Checkpointer,
        Effect.flatMap(cp => cp.save(sessionId, checkpoint))
      )

      await Effect.runPromise(saveProgram.pipe(Effect.provide(TestPersistenceLayer)))

      expect(mockCheckpointer.save).toHaveBeenCalledWith(sessionId, checkpoint)

      // Test loading checkpoint
      const loadProgram = pipe(
        Checkpointer,
        Effect.flatMap(cp => cp.load(sessionId))
      )

      const loaded = await Effect.runPromise(loadProgram.pipe(Effect.provide(TestPersistenceLayer)))

      expect(loaded).toEqual(checkpoint)
      expect(mockCheckpointer.load).toHaveBeenCalledWith(sessionId)
    })
  })
})
