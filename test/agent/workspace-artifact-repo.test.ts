import { Effect, Layer, Option } from "effect";
import { describe, expect, it } from "vitest";
import { WorkspaceArtifactRepoLive } from "../../backend/agent/artifact-repository.js";
import {
  type WorkspaceArtifact,
  WorkspaceArtifactRepo,
} from "../../backend/agent/domain.js";
import { AgentLogger } from "../../backend/agent/logging.js";
import { CompositeFilesystem } from "../../backend/agent/persistence.js";

type InMemoryFilesystemState = {
  readonly files: Map<string, string>;
};

const createInMemoryFilesystemLayer = () => {
  const state: InMemoryFilesystemState = {
    files: new Map(),
  };

  const filesystem: CompositeFilesystem = {
    writeFile: (path, content) =>
      Effect.sync(() => {
        state.files.set(path, content);
      }),
    readFile: (path) =>
      Effect.sync(() => {
        const value = state.files.get(path);
        if (value === undefined) {
          throw new Error(`File not found: ${path}`);
        }
        return value;
      }),
    exists: (path) => Effect.sync(() => state.files.has(path)),
    delete: (path) =>
      Effect.sync(() => {
        state.files.delete(path);
      }),
    listFiles: (dir) =>
      Effect.sync(() => {
        const prefix = dir.endsWith("/") ? dir : `${dir}/`;
        const children = new Set<string>();
        for (const key of state.files.keys()) {
          if (!key.startsWith(prefix)) {
            continue;
          }
          const remainder = key.slice(prefix.length);
          if (remainder.length === 0) {
            continue;
          }
          const [segment] = remainder.split("/");
          if (segment.length > 0) {
            children.add(segment);
          }
        }
        return Array.from(children);
      }),
  };

  return {
    layer: Layer.succeed(CompositeFilesystem, filesystem),
  };
};

const createTestLoggerLayer = () =>
  Layer.succeed<AgentLogger>(AgentLogger, {
    log: () => Effect.void,
    logToolCall: () => Effect.void,
    logStreamEvent: () => Effect.void,
    logSessionEvent: () => Effect.void,
  });

const createWorkspaceRepoLayer = () => {
  const fsLayer = createInMemoryFilesystemLayer().layer;
  const deps = Layer.mergeAll(createTestLoggerLayer(), fsLayer);
  return WorkspaceArtifactRepoLive.pipe(Layer.provide(deps));
};

const runWithRepo = <A>(program: Effect.Effect<A>) =>
  Effect.runPromise(
    program.pipe(Effect.provideSomeLayer(createWorkspaceRepoLayer()))
  );

const createArtifact = (
  overrides: Partial<WorkspaceArtifact> = {}
): WorkspaceArtifact => {
  const sessionId = overrides.sessionId ?? "session-1";
  const now = new Date();
  return {
    id: overrides.id ?? `artifact-${Math.random().toString(36).slice(2, 9)}`,
    sessionId,
    path:
      overrides.path ??
      `/workspace/${sessionId}/artifacts/${Math.random().toString(36).slice(2)}.txt`,
    kind: overrides.kind ?? "note",
    content: overrides.content ?? "initial-content",
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
};

describe("WorkspaceArtifactRepoLive", () => {
  it("creates artifacts and retrieves them by id", async () => {
    const program = Effect.gen(function* () {
      const repo = yield* WorkspaceArtifactRepo;
      const artifact = createArtifact({ sessionId: "session-create" });

      const created = yield* repo.create(artifact);
      expect(created.id).toBe(artifact.id);
      expect(created.content).toBe(artifact.content);

      const retrieved = yield* (repo as any).get(
        artifact.sessionId,
        artifact.id
      );
      expect(Option.isSome(retrieved)).toBe(true);
      expect(retrieved._tag).toBe("Some");
      expect(retrieved.value.content).toBe(artifact.content);
    });

    await runWithRepo(program);
  });

  it("lists artifacts by session and filters by kind", async () => {
    const program = Effect.gen(function* () {
      const repo = yield* WorkspaceArtifactRepo;
      const sessionId = "session-list";

      const note = createArtifact({ sessionId, kind: "note" });
      const code = createArtifact({ sessionId, kind: "code" });

      yield* repo.create(note);
      yield* repo.create(code);

      const allArtifacts = yield* (repo as any).listBySession(sessionId);
      expect(allArtifacts).toHaveLength(2);

      const codeArtifacts = yield* (repo as any).findByKind(sessionId, "code");
      expect(codeArtifacts).toHaveLength(1);
      expect(codeArtifacts[0].id).toBe(code.id);
    });

    await runWithRepo(program);
  });

  it("updates artifacts and persists changes", async () => {
    const program = Effect.gen(function* () {
      const repo = yield* WorkspaceArtifactRepo;
      const sessionId = "session-update";
      const artifact = createArtifact({ sessionId });
      yield* repo.create(artifact);

      const updated = yield* (repo as any).update({
        ...artifact,
        content: "updated",
      });
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
        artifact.updatedAt.getTime()
      );

      const retrieved = yield* (repo as any).get(sessionId, artifact.id);
      expect(Option.isSome(retrieved)).toBe(true);
      expect(retrieved.value.content).toBe("updated");
    });

    await runWithRepo(program);
  });

  it("deletes artifacts and removes index entries", async () => {
    const program = Effect.gen(function* () {
      const repo = yield* WorkspaceArtifactRepo;
      const sessionId = "session-delete";
      const artifact = createArtifact({ sessionId });
      yield* repo.create(artifact);

      yield* (repo as any).delete(sessionId, artifact.id);

      const retrieved = yield* (repo as any).get(sessionId, artifact.id);
      expect(Option.isNone(retrieved)).toBe(true);

      const list = yield* (repo as any).listBySession(sessionId);
      expect(list).toHaveLength(0);
    });

    await runWithRepo(program);
  });
});
