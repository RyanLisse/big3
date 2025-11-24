import { channel, realtimeMiddleware, topic } from "@inngest/realtime";
import { VibeKit, type VibeKitConfig } from "@vibe-kit/sdk";
import { Inngest } from "inngest";

// Create a client to send and receive events
export const inngest = new Inngest({
  id: "clonedex",
  middleware: [realtimeMiddleware()],
});

export const taskChannel = channel("tasks")
  .addTopic(
    topic("status").type<{
      taskId: string;
      status: "IN_PROGRESS" | "DONE" | "MERGED";
      sessionId: string;
    }>()
  )
  .addTopic(
    topic("update").type<{
      taskId: string;
      message: Record<string, unknown>;
    }>()
  );

export const createTask = inngest.createFunction(
  { id: "create-task" },
  { event: "clonedex/create.task" },
  async ({ event, step }) => {
    const { task, token, sessionId, prompt } = event.data;
    const config: VibeKitConfig = {
      agent: {
        type: "codex",
        model: {
          apiKey: process.env.OPENAI_API_KEY!,
        },
      },
      environment: {
        e2b: {
          apiKey: process.env.E2B_API_KEY!,
        },
      },
      github: {
        token,
        repository: task.repository,
      },
    };

    const result = await step.run("generate-code", async () => {
      const vibekit = new VibeKit(config);

      if (sessionId) {
        await vibekit.setSession(sessionId);
      }

      const response = await vibekit.generateCode({
        prompt: prompt || task.title,
        mode: task.mode,
      });

      await vibekit.pause();

      return response;
    });

    if ("stdout" in result) {
      const lines = result.stdout.trim().split("\n");
      const parsedLines = lines.map((line) => JSON.parse(line));
      // Note: Publishing status updates is handled differently in newer Inngest versions
      // The real-time updates will be handled through the task channel
      return { message: parsedLines };
    }
    return { message: result };
  }
);

let app: Inngest | undefined;

export const getInngestApp = () =>
  (app ??= new Inngest({
    id: typeof window !== "undefined" ? "client" : "server",
    middleware: [realtimeMiddleware()],
  }));
