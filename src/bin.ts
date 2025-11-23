#!/usr/bin/env node

// Main CLI entry point
import { runCli } from "./cli.js"

// Run the CLI with process arguments
runCli(process.argv.slice(2)).catch((error: unknown) => {
  console.error("CLI Error:", error)
  process.exit(1)
})
