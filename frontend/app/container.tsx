"use client";
import { useInngestSubscription } from "@inngest/realtime/hooks";
import { useEffect, useState } from "react";

import {
  fetchRealtimeSubscriptionToken,
  type TaskChannelToken,
} from "@/app/actions/inngest";
import { useTaskStore } from "@/stores/tasks";

// Wrapper to handle null tokens gracefully
async function safeRefreshToken(): Promise<TaskChannelToken> {
  const token = await fetchRealtimeSubscriptionToken();
  if (!token) {
    // Return a dummy token that will be ignored when enabled=false
    throw new Error("Inngest realtime not configured");
  }
  return token;
}

export default function Container({ children }: { children: React.ReactNode }) {
  const { updateTask, getTaskById } = useTaskStore();
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);

  // Check if realtime is available on mount
  useEffect(() => {
    fetchRealtimeSubscriptionToken().then((token) => {
      setRealtimeEnabled(token !== null);
    });
  }, []);

  const { latestData } = useInngestSubscription({
    refreshToken: safeRefreshToken,
    bufferInterval: 0,
    enabled: realtimeEnabled,
  });

  useEffect(() => {
    if (latestData?.channel === "tasks" && latestData.topic === "status") {
      updateTask(latestData.data.taskId, {
        status: latestData.data.status,
        hasChanges: true,
        sessionId: latestData.data.sessionId,
      });
    }

    if (latestData?.channel === "tasks" && latestData.topic === "update") {
      if (latestData.data.message.type === "git") {
        updateTask(latestData.data.taskId, {
          statusMessage: latestData.data.message.output as string,
        });
      }

      if (latestData.data.message.type === "local_shell_call") {
        const task = getTaskById(latestData.data.taskId);
        updateTask(latestData.data.taskId, {
          statusMessage: `Running command ${(latestData.data.message as { action: { command: string[] } }).action.command.join(" ")}`,
          messages: [
            ...(task?.messages || []),
            {
              role: "assistant",
              type: "local_shell_call",
              data: latestData.data.message,
            },
          ],
        });
      }

      if (latestData.data.message.type === "local_shell_call_output") {
        const task = getTaskById(latestData.data.taskId);
        updateTask(latestData.data.taskId, {
          messages: [
            ...(task?.messages || []),
            {
              role: "assistant",
              type: "local_shell_call_output",
              data: latestData.data.message,
            },
          ],
        });
      }

      if (
        latestData.data.message.type === "message" &&
        latestData.data.message.status === "completed" &&
        latestData.data.message.role === "assistant"
      ) {
        const task = getTaskById(latestData.data.taskId);

        updateTask(latestData.data.taskId, {
          messages: [
            ...(task?.messages || []),
            {
              role: "assistant",
              type: "message",
              data: (latestData.data.message.content as { text: string }[])[0],
            },
          ],
        });
      }
    }
  }, [latestData]);

  return children;
}
