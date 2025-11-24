import { Array as A, Context, Effect, Layer, Option, pipe } from "effect";
import type {
  CreateSharedMemoryRequest,
  CreateTeamRequest,
  MemoryType,
  MessagePriority,
  SendMessageRequest,
  TeamStatus,
} from "../domain.js";
import type { MultiAgentApiService } from "./MultiAgentApiService.js";
import {
  MultiAgentApiLayers,
  MultiAgentApiServiceTag,
} from "./MultiAgentApiService.js";

// CLI Command Types
export type CliCommand = {
  readonly name: string;
  readonly description: string;
  readonly execute: (args: readonly string[]) => Effect.Effect<void, never>;
};

export type CliOptions = {
  json?: boolean;
  verbose?: boolean;
  help?: boolean;
};

// CLI Service
// CLI Service Interface
export type MultiAgentCliService = {
  readonly executeCommand: (
    commandName: string,
    args: readonly string[]
  ) => Effect.Effect<void, never>;
};

// CLI Service Tag
export const MultiAgentCliServiceTag = Context.GenericTag<MultiAgentCliService>(
  "MultiAgentCliService"
);

// CLI Service Implementation
class MultiAgentCliServiceImpl implements MultiAgentCliService {
  constructor(private readonly apiService: MultiAgentApiService) {}

  // Parse CLI options
  private readonly parseOptions = (
    args: readonly string[]
  ): { options: CliOptions; remainingArgs: readonly string[] } => {
    const options: CliOptions = {};
    const remainingArgs: string[] = [];

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      switch (arg) {
        case "--json":
        case "-j":
          options.json = true;
          break;
        case "--verbose":
        case "-v":
          options.verbose = true;
          break;
        case "--help":
        case "-h":
          options.help = true;
          break;
        default:
          if (arg.startsWith("--")) {
            // Skip unknown options
            i++;
          } else {
            remainingArgs.push(arg);
          }
      }
    }

    return { options, remainingArgs };
  };

  // Format output
  private readonly formatOutput = <T>(data: T, options: CliOptions): string => {
    if (options.json) {
      return JSON.stringify(data, null, 2);
    }

    if (typeof data === "object" && data !== null) {
      return this.formatObject(data);
    }

    return String(data);
  };

  private readonly formatObject = (obj: unknown, indent = 0): string => {
    const spaces = "  ".repeat(indent);
    if (Array.isArray(obj)) {
      return obj
        .map((item) => `${spaces}- ${this.formatValue(item, indent + 1)}`)
        .join("\n");
    }
    if (typeof obj === "object" && obj !== null) {
      return Object.entries(obj)
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(
          ([key, value]) =>
            `${spaces}${key}: ${this.formatValue(value, indent + 1)}`
        )
        .join("\n");
    }
    return String(obj);
  };

  private readonly formatValue = (value: unknown, indent: number): string => {
    if (typeof value === "object" && value !== null) {
      return `\n${this.formatObject(value, indent)}`;
    }
    return String(value);
  };

  // Print error
  private readonly printError = (error: string, options: CliOptions): void => {
    if (options.json) {
      process.stderr.write(
        `${JSON.stringify(
          { error, timestamp: new Date().toISOString() },
          null,
          2
        )}\n`
      );
    } else {
      process.stderr.write(`❌ Error: ${error}\n`);
    }
  };

  // Print success
  private readonly printSuccess = (
    message: string,
    options: CliOptions
  ): void => {
    if (options.json) {
      process.stdout.write(
        `${JSON.stringify(
          { success: true, message, timestamp: new Date().toISOString() },
          null,
          2
        )}\n`
      );
    } else {
      process.stdout.write(`✅ ${message}\n`);
    }
  };

  // Team Commands
  private readonly createTeamCommand = (): CliCommand => ({
    name: "create-team",
    description: "Create a new multi-agent team",
    execute: (args) =>
      pipe(
        Effect.succeed(this.parseOptions(args)),
        Effect.flatMap(({ options, remainingArgs }) => {
          if (options.help || remainingArgs.length < 1) {
            return Effect.succeed(
              this.showHelp("create-team", [
                "Usage: create-team <name> [description]",
                "Options:",
                "  --json, -j     Output in JSON format",
                "  --verbose, -v  Verbose output",
                "  --help, -h     Show this help",
              ])
            );
          }

          const [name, ...descriptionParts] = remainingArgs;
          const description = descriptionParts.join(" ");

          const request: CreateTeamRequest = {
            name,
            description: description || `Team: ${name}`,
            configuration: {},
          };

          return pipe(
            this.apiService.createTeam(request),
            Effect.flatMap((response) =>
              response.success && response.data
                ? Effect.succeed(
                    this.printSuccess(
                      `Team created: ${(response.data as any).id}`,
                      options
                    )
                  )
                : Effect.succeed(
                    this.printError(
                      response.error?.message || "Unknown error",
                      options
                    )
                  )
            ),
            Effect.catchAll((error) =>
              Effect.succeed(this.printError(String(error), options))
            )
          );
        })
      ),
  });

  private readonly listTeamsCommand = (): CliCommand => ({
    name: "list-teams",
    description: "List all multi-agent teams",
    execute: (args) =>
      pipe(
        Effect.succeed(this.parseOptions(args)),
        Effect.flatMap(({ options, remainingArgs }) => {
          if (options.help) {
            return Effect.succeed(
              this.showHelp("list-teams", [
                "Usage: list-teams [status]",
                "Options:",
                "  --json, -j     Output in JSON format",
                "  --verbose, -v  Verbose output",
                "  --help, -h     Show this help",
                "",
                "Status filter: active, paused, archived",
              ])
            );
          }

          const statusFilter = remainingArgs[0] as TeamStatus | undefined;

          return pipe(
            this.apiService.listTeams(statusFilter),
            Effect.flatMap((response) =>
              response.success && response.data
                ? Effect.succeed(
                    process.stdout.write(
                      `${this.formatOutput(response.data, options)}\n`
                    )
                  )
                : Effect.succeed(
                    this.printError(
                      response.error?.message || "Unknown error",
                      options
                    )
                  )
            ),
            Effect.catchAll((error) =>
              Effect.succeed(this.printError(String(error), options))
            )
          );
        })
      ),
  });

  private readonly getTeamCommand = (): CliCommand => ({
    name: "get-team",
    description: "Get details of a specific team",
    execute: (args) =>
      pipe(
        Effect.succeed(this.parseOptions(args)),
        Effect.flatMap(({ options, remainingArgs }) => {
          if (options.help || remainingArgs.length !== 1) {
            return Effect.succeed(
              this.showHelp("get-team", [
                "Usage: get-team <team-id>",
                "Options:",
                "  --json, -j     Output in JSON format",
                "  --verbose, -v  Verbose output",
                "  --help, -h     Show this help",
              ])
            );
          }

          const teamId = remainingArgs[0];

          return pipe(
            this.apiService.getTeam(teamId),
            Effect.flatMap((response) =>
              response.success && response.data
                ? Effect.succeed(
                    process.stdout.write(
                      `${this.formatOutput(response.data, options)}\n`
                    )
                  )
                : Effect.succeed(
                    this.printError(
                      response.error?.message || "Unknown error",
                      options
                    )
                  )
            ),
            Effect.catchAll((error) =>
              Effect.succeed(this.printError(String(error), options))
            )
          );
        })
      ),
  });

  // Memory Commands
  private readonly createMemoryCommand = (): CliCommand => ({
    name: "create-memory",
    description: "Create a shared memory block",
    execute: (args) =>
      pipe(
        Effect.succeed(this.parseOptions(args)),
        Effect.flatMap(({ options, remainingArgs }) => {
          if (options.help || remainingArgs.length < 4) {
            return Effect.succeed(
              this.showHelp("create-memory", [
                "Usage: create-memory <team-id> <label> <type> <value> [description]",
                "Options:",
                "  --json, -j     Output in JSON format",
                "  --verbose, -v  Verbose output",
                "  --help, -h     Show this help",
                "",
                "Types: project_context, shared_knowledge, workflow_state, custom",
              ])
            );
          }

          const [teamId, label, type, value, ...descriptionParts] =
            remainingArgs;
          const description = descriptionParts.join(" ");

          const request: CreateSharedMemoryRequest = {
            teamId,
            label,
            value,
            description: description || `Memory block: ${label}`,
            type: type as MemoryType,
            accessLevel: "read_write",
          };

          return pipe(
            this.apiService.createSharedMemory(request),
            Effect.flatMap((response) =>
              response.success && response.data
                ? Effect.succeed(
                    this.printSuccess(
                      `Memory created: ${(response.data as any).id}`,
                      options
                    )
                  )
                : Effect.succeed(
                    this.printError(
                      response.error?.message || "Unknown error",
                      options
                    )
                  )
            ),
            Effect.catchAll((error) =>
              Effect.succeed(this.printError(String(error), options))
            )
          );
        })
      ),
  });

  private readonly listMemoryCommand = (): CliCommand => ({
    name: "list-memory",
    description: "List shared memory blocks for a team",
    execute: (args) =>
      pipe(
        Effect.succeed(this.parseOptions(args)),
        Effect.flatMap(({ options, remainingArgs }) => {
          if (options.help || remainingArgs.length < 1) {
            return Effect.succeed(
              this.showHelp("list-memory", [
                "Usage: list-memory <team-id> [agent-id]",
                "Options:",
                "  --json, -j     Output in JSON format",
                "  --verbose, -v  Verbose output",
                "  --help, -h     Show this help",
              ])
            );
          }

          const [teamId, agentId] = remainingArgs;

          return pipe(
            this.apiService.listSharedMemoryByTeam(teamId, agentId || "system"),
            Effect.flatMap((response) =>
              response.success && response.data
                ? Effect.succeed(
                    process.stdout.write(
                      `${this.formatOutput(response.data, options)}\n`
                    )
                  )
                : Effect.succeed(
                    this.printError(
                      response.error?.message || "Unknown error",
                      options
                    )
                  )
            ),
            Effect.catchAll((error) =>
              Effect.succeed(this.printError(String(error), options))
            )
          );
        })
      ),
  });

  // Message Commands
  private readonly sendMessageCommand = (): CliCommand => ({
    name: "send-message",
    description: "Send a message to another agent",
    execute: (args) =>
      pipe(
        Effect.succeed(this.parseOptions(args)),
        Effect.flatMap(({ options, remainingArgs }) => {
          if (options.help || remainingArgs.length < 3) {
            return Effect.succeed(
              this.showHelp("send-message", [
                "Usage: send-message <from-agent> <to-agent> <message> [priority]",
                "Options:",
                "  --json, -j     Output in JSON format",
                "  --verbose, -v  Verbose output",
                "  --help, -h     Show this help",
                "",
                "Priority: low, normal, high, urgent (default: normal)",
              ])
            );
          }

          const [fromAgentId, toAgentId, ...messageParts] = remainingArgs;
          const priorityIndex = messageParts.findIndex((part) =>
            ["low", "normal", "high", "urgent"].includes(part)
          );

          let message: string;
          let priority: MessagePriority = "normal";

          if (priorityIndex >= 0) {
            message = messageParts.slice(0, priorityIndex).join(" ");
            priority = messageParts[priorityIndex] as MessagePriority;
          } else {
            message = messageParts.join(" ");
          }

          const request: SendMessageRequest = {
            toAgentId,
            content: message,
            priority,
          };

          return pipe(
            this.apiService.sendMessage(fromAgentId, request),
            Effect.flatMap((response) =>
              response.success && response.data
                ? Effect.succeed(
                    this.printSuccess(
                      `Message sent: ${(response.data as any).id}`,
                      options
                    )
                  )
                : Effect.succeed(
                    this.printError(
                      response.error?.message || "Unknown error",
                      options
                    )
                  )
            ),
            Effect.catchAll((error) =>
              Effect.succeed(this.printError(String(error), options))
            )
          );
        })
      ),
  });

  private readonly listMessagesCommand = (): CliCommand => ({
    name: "list-messages",
    description: "List messages for an agent or team",
    execute: (args) =>
      pipe(
        Effect.succeed(this.parseOptions(args)),
        Effect.flatMap(({ options, remainingArgs }) => {
          if (options.help || remainingArgs.length < 1) {
            return Effect.succeed(
              this.showHelp("list-messages", [
                "Usage: list-messages <agent-id|team-id> [--team] [status]",
                "Options:",
                "  --json, -j     Output in JSON format",
                "  --verbose, -v  Verbose output",
                "  --help, -h     Show this help",
                "",
                "Use --team flag to list team messages instead of agent messages",
                "Status filter: pending, delivered, read, failed",
              ])
            );
          }

          const isTeam = remainingArgs.includes("--team");
          const filteredArgs = remainingArgs.filter((arg) => arg !== "--team");
          const [id, status] = filteredArgs;

          return pipe(
            isTeam
              ? this.apiService.getTeamMessages(id, status)
              : this.apiService.getAgentMessages(id, status),
            Effect.flatMap((response) =>
              response.success && response.data
                ? Effect.succeed(
                    process.stdout.write(
                      `${this.formatOutput(response.data, options)}\n`
                    )
                  )
                : Effect.succeed(
                    this.printError(
                      response.error?.message || "Unknown error",
                      options
                    )
                  )
            ),
            Effect.catchAll((error) =>
              Effect.succeed(this.printError(String(error), options))
            )
          );
        })
      ),
  });

  // Team Membership Commands
  private readonly addAgentCommand = (): CliCommand => ({
    name: "add-agent",
    description: "Add an agent to a team",
    execute: (args) =>
      pipe(
        Effect.succeed(this.parseOptions(args)),
        Effect.flatMap(({ options, remainingArgs }) => {
          if (options.help || remainingArgs.length < 2) {
            return Effect.succeed(
              this.showHelp("add-agent", [
                "Usage: add-agent <team-id> <agent-id> [role]",
                "Options:",
                "  --json, -j     Output in JSON format",
                "  --verbose, -v  Verbose output",
                "  --help, -h     Show this help",
                "",
                "Role defaults to 'member'",
              ])
            );
          }

          const [teamId, agentId, role = "member"] = remainingArgs;

          return pipe(
            this.apiService.addAgentToTeam(teamId, agentId, role),
            Effect.flatMap((response) =>
              response.success
                ? Effect.succeed(
                    this.printSuccess(
                      `Agent ${agentId} added to team ${teamId}`,
                      options
                    )
                  )
                : Effect.succeed(
                    this.printError(
                      response.error?.message || "Unknown error",
                      options
                    )
                  )
            ),
            Effect.catchAll((error) =>
              Effect.succeed(this.printError(String(error), options))
            )
          );
        })
      ),
  });

  private readonly removeAgentCommand = (): CliCommand => ({
    name: "remove-agent",
    description: "Remove an agent from a team",
    execute: (args) =>
      pipe(
        Effect.succeed(this.parseOptions(args)),
        Effect.flatMap(({ options, remainingArgs }) => {
          if (options.help || remainingArgs.length !== 2) {
            return Effect.succeed(
              this.showHelp("remove-agent", [
                "Usage: remove-agent <team-id> <agent-id>",
                "Options:",
                "  --json, -j     Output in JSON format",
                "  --verbose, -v  Verbose output",
                "  --help, -h     Show this help",
              ])
            );
          }

          const [teamId, agentId] = remainingArgs;

          return pipe(
            this.apiService.removeAgentFromTeam(teamId, agentId),
            Effect.flatMap((response) =>
              response.success
                ? Effect.succeed(
                    this.printSuccess(
                      `Agent ${agentId} removed from team ${teamId}`,
                      options
                    )
                  )
                : Effect.succeed(
                    this.printError(
                      response.error?.message || "Unknown error",
                      options
                    )
                  )
            ),
            Effect.catchAll((error) =>
              Effect.succeed(this.printError(String(error), options))
            )
          );
        })
      ),
  });

  // Help command
  private readonly helpCommand = (): CliCommand => ({
    name: "help",
    description: "Show help for multi-agent commands",
    execute: (args) =>
      pipe(
        Effect.succeed(this.parseOptions(args)),
        Effect.flatMap(({ options, remainingArgs }) => {
          const commandName = remainingArgs[0];

          if (commandName) {
            const commandOpt = this.getCommand(commandName);
            return Option.match(commandOpt, {
              onSome: (command) =>
                Effect.succeed(
                  this.showHelp(commandName, [
                    `Usage: multi-agent ${command.name} ${this.getUsageForCommand(command)}`,
                    `Description: ${command.description}`,
                    "Options:",
                    "  --json, -j     Output in JSON format",
                    "  --verbose, -v  Verbose output",
                    "  --help, -h     Show this help",
                  ])
                ),
              onNone: () => Effect.succeed(this.showMainHelp()),
            });
          }

          return Effect.succeed(this.showMainHelp());
        })
      ),
  });

  // Get all commands
  private readonly getCommands = (): readonly CliCommand[] => [
    this.createTeamCommand(),
    this.listTeamsCommand(),
    this.getTeamCommand(),
    this.createMemoryCommand(),
    this.listMemoryCommand(),
    this.sendMessageCommand(),
    this.listMessagesCommand(),
    this.addAgentCommand(),
    this.removeAgentCommand(),
    this.helpCommand(),
  ];

  private readonly getCommand = (name: string): Option.Option<CliCommand> => {
    const commands = this.getCommands();
    return A.findFirst(commands, (cmd) => cmd.name === name);
  };

  private readonly getUsageForCommand = (command: CliCommand): string => {
    switch (command.name) {
      case "create-team":
        return "<name> [description]";
      case "list-teams":
        return "[status]";
      case "get-team":
        return "<team-id>";
      case "create-memory":
        return "<team-id> <label> <type> <value> [description]";
      case "list-memory":
        return "<team-id> [agent-id]";
      case "send-message":
        return "<from-agent> <to-agent> <message> [priority]";
      case "list-messages":
        return "<agent-id|team-id> [--team] [status]";
      case "add-agent":
        return "<team-id> <agent-id> [role]";
      case "remove-agent":
        return "<team-id> <agent-id>";
      default:
        return "";
    }
  };

  private readonly showHelp = (
    command: string,
    lines: readonly string[]
  ): void => {
    process.stdout.write(`\nMulti-Agent CLI: ${command}\n\n`);
    lines.forEach((line) => process.stdout.write(`${line}\n`));
  };

  private readonly showMainHelp = (): void => {
    const commands = this.getCommands();
    process.stdout.write("\nMulti-Agent CLI Commands:\n\n");
    commands.forEach((cmd) => {
      process.stdout.write(`  ${cmd.name.padEnd(15)} ${cmd.description}\n`);
    });
    process.stdout.write("\nGlobal Options:\n");
    process.stdout.write("  --json, -j     Output in JSON format\n");
    process.stdout.write("  --verbose, -v  Verbose output\n");
    process.stdout.write("  --help, -h     Show this help for commands\n");
    process.stdout.write("\nExamples:\n");
    process.stdout.write(
      '  multi-agent create-team "Development Team" "Team for web development"\n'
    );
    process.stdout.write(
      "  multi-agent add-agent team-123 agent-456 developer\n"
    );
    process.stdout.write(
      '  multi-agent create-memory team-123 requirements project_context "User authentication required"\n'
    );
    process.stdout.write(
      '  multi-agent send-message agent-1 agent-2 "Please review the API design" high\n'
    );
    process.stdout.write(
      "  multi-agent list-messages agent-1 --team delivered\n"
    );
  };

  // Execute command
  executeCommand = (
    commandName: string,
    args: readonly string[]
  ): Effect.Effect<void, never> =>
    pipe(
      Effect.succeed(this.getCommand(commandName)),
      Effect.flatMap((command) =>
        Option.match(command, {
          onNone: () => Effect.succeed(this.showMainHelp()),
          onSome: (cmd) => cmd.execute(args),
        })
      )
    );
}

// Service layer
export const MultiAgentCliServiceLive = Layer.effect(
  MultiAgentCliServiceTag,
  Effect.map(
    MultiAgentApiServiceTag,
    (apiService) => new MultiAgentCliServiceImpl(apiService)
  )
);

import { MultiAgentLayers } from "./MultiAgentService.js";

// Complete CLI layer
export const MultiAgentCliLayers = Layer.mergeAll(
  MultiAgentApiLayers,
  MultiAgentCliServiceLive,
  MultiAgentLayers
);
