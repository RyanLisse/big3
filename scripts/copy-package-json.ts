#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const packageJsonPath = join(process.cwd(), "package.json");
const distPackageJsonPath = join(process.cwd(), "dist", "package.json");

try {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const distPackageJson = { ...packageJson };

  // Remove development-only fields
  distPackageJson.devDependencies = undefined;
  distPackageJson.scripts = undefined;

  writeFileSync(distPackageJsonPath, JSON.stringify(distPackageJson, null, 2));
  console.log("✓ package.json copied to dist/");
} catch (error) {
  console.error("Failed to copy package.json:", error);
  process.exit(1);
}
