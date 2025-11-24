import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/main.ts"],
  format: "cjs",
  dts: true,
  clean: true,
  sourcemap: true,
  minify: false,
  external: [
    "playwright",
    "playwright-core",
    "chromium-bidi",
    "@playwright/test",
  ],
});
