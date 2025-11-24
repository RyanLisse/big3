"use server";
import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { cookies } from "next/headers";
import { getInngestApp, inngest, taskChannel } from "@/lib/inngest";
import type { Task } from "@/stores/tasks";

export type TaskChannelToken = Realtime.Token<
  typeof taskChannel,
  ["status", "update"]
>;

export const createTaskAction = async ({
  task,
  sessionId,
  prompt,
}: {
  task: Task;
  sessionId?: string;
  prompt?: string;
}) => {
  const cookieStore = await cookies();
  const githubToken = cookieStore.get("github_access_token")?.value;

  if (!githubToken) {
    throw new Error("No GitHub token found. Please authenticate first.");
  }

  await inngest.send({
    name: "clonedex/create.task",
    data: {
      task,
      token: githubToken,
      sessionId,
      prompt,
    },
  });
};

export const createPullRequestAction = async ({
  sessionId,
}: {
  sessionId?: string;
}) => {
  const cookieStore = await cookies();
  const githubToken = cookieStore.get("github_access_token")?.value;

  if (!githubToken) {
    throw new Error("No GitHub token found. Please authenticate first.");
  }

  await inngest.send({
    name: "clonedex/create.pull-request",
    data: {
      token: githubToken,
      sessionId,
    },
  });
};

export async function fetchRealtimeSubscriptionToken(): Promise<TaskChannelToken | null> {
  // Skip in development if INNGEST_SIGNING_KEY is not configured
  if (!process.env.INNGEST_SIGNING_KEY) {
    console.warn(
      "[Inngest] INNGEST_SIGNING_KEY not configured - realtime subscriptions disabled"
    );
    return null;
  }

  try {
    const token = await getSubscriptionToken(getInngestApp(), {
      channel: taskChannel(),
      topics: ["status", "update"],
    });
    return token;
  } catch (error) {
    console.error("[Inngest] Failed to get subscription token:", error);
    return null;
  }
}
