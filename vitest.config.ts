import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const encoreRuntimeLib = path.join(
  __dirname,
  "test",
  "encore-runtime.stub.cjs"
);

export default defineConfig({
  test: {
    globals: {
      console: "readonly",
      process: "readonly",
    },
    environment: "node",
    fileParallelism: false,
    include: ["test/**/*.{test,spec}.{js,ts}"],
    exclude: [
      "node_modules",
      "dist",
      "build",
      "test/agent/session-continuity.test.ts",
      "test/agent/workspace-artifact-repo.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.{js,ts}", "backend/**/*.{js,ts}"],
      exclude: ["**/*.d.ts", "**/*.config.*", "**/node_modules/**"],
    },
    setupFiles: ["./test/setup.ts"],
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: true,
        isolate: false,
        minThreads: 1,
        maxThreads: 1,
      },
    },
    env: {
      ENCORE_RUNTIME_LIB: encoreRuntimeLib,
      REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
    },
  },
});
