#!/usr/bin/env node

import * as dotenv from "dotenv";
import { Console, Effect, Layer, Queue } from "effect";
import {
  BrowserServiceLive,
  BrowserServiceTag,
} from "./services/BrowserService.js";
import { CoderServiceLive, CoderServiceTag } from "./services/CoderService.js";
import {
  MultiAgentCliLayers,
  MultiAgentCliServiceTag,
} from "./services/MultiAgentCliService.js";
import { VoiceService, VoiceServiceLive } from "./services/VoiceService.js";

dotenv.config();

// CLI Program
const CliProgram = Effect.gen(function* (_) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    yield* _(Console.log("🤖 Big 3 Multi-Agent CLI"));
    yield* _(Console.log("\nUsage:"));
    yield* _(Console.log("  cli <command> [options] [arguments]"));
    yield* _(Console.log("\nCommands:"));
    yield* _(Console.log("  multi-agent    Multi-agent team management"));
    yield* _(Console.log("  voice          Voice-based agent orchestration"));
    yield* _(Console.log("  coder          Code execution agent"));
    yield* _(Console.log("  browser        Browser automation agent"));
    yield* _(Console.log("\nExamples:"));
    yield* _(Console.log('  cli multi-agent create-team "Development Team"'));
    yield* _(Console.log("  cli multi-agent list-teams"));
    yield* _(Console.log("  cli voice --help"));
    yield* _(Console.log("  cli coder --help"));
    yield* _(Console.log("  cli browser --help"));
    yield* _(Console.log("\nUse --help with any command for detailed usage."));
    return;
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  switch (command) {
    case "multi-agent": {
      const multiAgentService = yield* _(MultiAgentCliServiceTag);
      if (commandArgs.length === 0) {
        yield* _(multiAgentService.executeCommand("help", []));
      } else {
        const subCommand = commandArgs[0];
        const subCommandArgs = commandArgs.slice(1);
        yield* _(multiAgentService.executeCommand(subCommand, subCommandArgs));
      }
      break;
    }
    case "voice": {
      const voice = yield* _(VoiceService);

      if (commandArgs.includes("--help") || commandArgs.includes("-h")) {
        yield* _(Console.log("Voice Mode Commands:"));
        yield* _(
          Console.log("  cli voice                    Start voice mode")
        );
        yield* _(Console.log("  cli voice --help             Show this help"));
        yield* _(
          Console.log(
            "\nVoice mode uses OpenAI Realtime API for voice interaction."
          )
        );
        yield* _(Console.log("Configure OPENAI_API_KEY in your environment."));
        return;
      }

      yield* _(Console.log("🎙️  Starting Voice Mode..."));
      yield* _(
        Console.log(
          "Configure OPENAI_API_KEY in your environment to use voice features."
        )
      );

      // Configure OpenAI Session for voice mode
      yield* _(
        voice.send({
          type: "session.update",
          session: {
            instructions:
              "You are a Super Agent Orchestrator. Dispatch tasks to Claude (coding) or Gemini (browser).",
            tools: [
              {
                type: "function",
                name: "command_agent",
                description: "Send a command to the coding agent",
                parameters: { instruction: { type: "string" } },
              },
              {
                type: "function",
                name: "browser_use",
                description: "Control the browser",
                parameters: {
                  url: { type: "string" },
                  task: { type: "string" },
                },
              },
            ],
          },
        })
      );

      yield* _(Console.log("🎤 Voice mode ready. Start speaking..."));

      // Main Event Loop for voice
      while (true) {
        const event = yield* _(Queue.take(voice.eventStream));

        if (
          typeof event === "object" &&
          event !== null &&
          "type" in event &&
          event.type === "response.function_call_arguments.done" &&
          "name" in event &&
          "arguments" in event
        ) {
          const functionName = event.name;
          const args = JSON.parse(
            typeof event.arguments === "string" ? event.arguments : "{}"
          );

          yield* _(Console.log(`🛠️ Tool Call: ${functionName}`));

          if (functionName === "command_agent") {
            const coder = yield* _(CoderServiceTag);
            const result = yield* _(
              coder.execute("default-session", args.instruction)
            );
            yield* _(
              voice.send({
                type: "conversation.item.create",
                item: { type: "function_call_output", output: result },
              })
            );
          } else if (functionName === "browser_use") {
            const browser = yield* _(BrowserServiceTag);
            if (args.url) {
              yield* _(browser.navigate(args.url));
            }
            const result = yield* _(browser.act(args.task));
            yield* _(
              voice.send({
                type: "conversation.item.create",
                item: { type: "function_call_output", output: result },
              })
            );
          }

          // Trigger response generation after tool output
          yield* _(voice.send({ type: "response.create" }));
        }
      }
    }

    case "coder":
      yield* _(runCoderMode(commandArgs));
      break;

    case "browser":
      yield* _(runBrowserMode(commandArgs));
      break;

    default:
      yield* _(Console.log(`❌ Unknown command: ${command}`));
      yield* _(Console.log("Use 'cli --help' to see available commands"));
  }
});

// Voice Mode
const runVoiceMode = (args: readonly string[]) =>
  Effect.gen(function* (_) {
    const voice = yield* _(VoiceService);

    if (args.includes("--help") || args.includes("-h")) {
      yield* _(Console.log("Voice Mode Commands:"));
      yield* _(Console.log("  cli voice                    Start voice mode"));
      yield* _(Console.log("  cli voice --help             Show this help"));
      yield* _(
        Console.log(
          "\nVoice mode uses OpenAI Realtime API for voice interaction."
        )
      );
      yield* _(Console.log("Configure OPENAI_API_KEY in your environment."));
      return;
    }

    yield* _(Console.log("🎙️  Starting Voice Mode..."));
    yield* _(
      Console.log(
        "Configure OPENAI_API_KEY in your environment to use voice features."
      )
    );

    // Configure OpenAI Session for voice mode
    yield* _(
      voice.send({
        type: "session.update",
        session: {
          instructions:
            "You are a Super Agent Orchestrator. Dispatch tasks to Claude (coding) or Gemini (browser).",
          tools: [
            {
              type: "function",
              name: "command_agent",
              description: "Send a command to the coding agent",
              parameters: {
                type: "object",
                properties: { instruction: { type: "string" } },
                required: ["instruction"],
              },
            },
            {
              type: "function",
              name: "browser_use",
              description: "Control the browser",
              parameters: {
                type: "object",
                properties: {
                  url: { type: "string" },
                  task: { type: "string" },
                },
                required: ["task"],
              },
            },
          ],
        },
      })
    );

    yield* _(Console.log("🎤 Voice mode ready. Start speaking..."));

    // Main Event Loop for voice
    while (true) {
      const event = yield* _(Queue.take(voice.eventStream));

      if (
        typeof event === "object" &&
        event !== null &&
        "type" in event &&
        event.type === "response.function_call_arguments.done" &&
        "name" in event &&
        "arguments" in event
      ) {
        const functionName = event.name;
        const args = JSON.parse(
          typeof event.arguments === "string" ? event.arguments : "{}"
        );

        yield* _(Console.log(`🛠️ Tool Call: ${functionName}`));

        if (functionName === "command_agent") {
          const coder = yield* _(CoderServiceTag);
          const result = yield* _(
            coder.execute("default-session", args.instruction)
          );
          yield* _(
            voice.send({
              type: "conversation.item.create",
              item: { type: "function_call_output", output: result },
            })
          );
        } else if (functionName === "browser_use") {
          const browser = yield* _(BrowserServiceTag);
          if (args.url) {
            yield* _(browser.navigate(args.url));
          }
          const result = yield* _(browser.act(args.task));
          yield* _(
            voice.send({
              type: "conversation.item.create",
              item: { type: "function_call_output", output: result },
            })
          );
        }

        // Trigger response generation after tool output
        yield* _(voice.send({ type: "response.create" }));
      }
    }
  });

// Coder Mode
const runCoderMode = (args: readonly string[]) =>
  Effect.gen(function* (_) {
    const coder = yield* _(CoderServiceTag);

    if (args.includes("--help") || args.includes("-h")) {
      yield* _(Console.log("Coder Mode Commands:"));
      yield* _(
        Console.log("  cli coder <instruction>        Execute coding task")
      );
      yield* _(Console.log("  cli coder --help             Show this help"));
      yield* _(Console.log("\nExamples:"));
      yield* _(
        Console.log('  cli coder "Create a React component for user login"')
      );
      yield* _(Console.log('  cli coder "Fix the TypeScript errors in src/"'));
      return;
    }

    if (args.length === 0) {
      yield* _(Console.log("❌ No instruction provided"));
      yield* _(Console.log("Usage: cli coder <instruction>"));
      yield* _(Console.log("Use 'cli coder --help' for examples"));
      return;
    }

    const instruction = args.join(" ");
    yield* _(Console.log(`💻 Executing: ${instruction}`));

    const result = yield* _(coder.execute("default-session", instruction));
    yield* _(Console.log("\n📋 Result:"));
    yield* _(Console.log(result));
  });

// Browser Mode
const runBrowserMode = (args: readonly string[]) =>
  Effect.gen(function* (_) {
    const browser = yield* _(BrowserServiceTag);

    if (args.includes("--help") || args.includes("-h")) {
      yield* _(Console.log("Browser Mode Commands:"));
      yield* _(
        Console.log("  cli browser <task>              Execute browser task")
      );
      yield* _(
        Console.log(
          "  cli browser --url <url> <task>  Navigate to URL then execute task"
        )
      );
      yield* _(Console.log("  cli browser --help             Show this help"));
      yield* _(Console.log("\nExamples:"));
      yield* _(Console.log('  cli browser "Search for React documentation"'));
      yield* _(
        Console.log('  cli browser --url https://github.com "Find the README"')
      );
      return;
    }

    const urlIndex = args.indexOf("--url");
    let url: string | undefined;
    let task: string;

    if (urlIndex >= 0 && urlIndex + 1 < args.length) {
      url = args[urlIndex + 1];
      task = args
        .filter((_, index) => index !== urlIndex && index !== urlIndex + 1)
        .join(" ");
    } else {
      task = args.join(" ");
    }

    if (!task) {
      yield* _(Console.log("❌ No task provided"));
      yield* _(Console.log("Usage: cli browser <task>"));
      yield* _(Console.log("Use 'cli browser --help' for examples"));
      return;
    }

    yield* _(Console.log(`🌐 Browser Task: ${task}`));
    if (url) {
      yield* _(Console.log(`📍 Navigating to: ${url}`));
      yield* _(browser.navigate(url));
    }

    const result = yield* _(browser.act(task));
    yield* _(Console.log("\n📋 Result:"));
    yield* _(Console.log(result));
  });

// Dependency Injection
const CliLayer = Layer.mergeAll(
  MultiAgentCliLayers,
  VoiceServiceLive,
  CoderServiceLive,
  BrowserServiceLive
);

// Export for external use
export async function runCli(args: string[]): Promise<void> {
  const CliProgramWithArgs = Effect.gen(function* (_) {
    const [command, ...commandArgs] = args;

    switch (command) {
      case "multi-agent": {
        const multiAgentService = yield* _(MultiAgentCliServiceTag);
        if (commandArgs.length === 0) {
          yield* _(multiAgentService.executeCommand("help", []));
        } else {
          const subCommand = commandArgs[0];
          const subCommandArgs = commandArgs.slice(1);
          yield* _(
            multiAgentService.executeCommand(subCommand, subCommandArgs)
          );
        }
        break;
      }
      case "voice":
        yield* _(runVoiceMode(commandArgs));
        break;

      case "coder":
        yield* _(runCoderMode(commandArgs));
        break;

      case "browser":
        yield* _(runBrowserMode(commandArgs));
        break;

      default:
        yield* _(Console.log(`❌ Unknown command: ${command}`));
        yield* _(Console.log("Use 'cli --help' to see available commands"));
    }
  });

  const main = Effect.provide(CliProgramWithArgs, CliLayer);
  await Effect.runPromise(main as Effect.Effect<void, never, never>);
}

// Run the CLI Program
void (async () => {
  if (process.argv.length > 2) {
    await runCli(process.argv.slice(2));
  } else {
    // Run the default CLI program when no arguments provided
    const main = Effect.provide(CliProgram, CliLayer);
    await Effect.runPromise(main as Effect.Effect<void, never, never>);
  }
})();
