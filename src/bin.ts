#!/usr/bin/env node

// Main CLI entry point
import { runCli } from "./cli.js";

// Run the CLI with process arguments
runCli(process.argv.slice(2)).catch((error: unknown) => {
  process.stderr.write(`CLI Error: ${error}\n`);
  process.exit(1);
});
