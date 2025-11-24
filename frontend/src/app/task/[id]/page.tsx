"use client";

import { ArrowLeft, Copy, RotateCcw } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AgentTimeline } from "@/src/components/AgentTimeline";
import { useTaskStore } from "@/stores/tasks";

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;
  const { getTaskById } = useTaskStore();
  const task = getTaskById(taskId);

  if (!task) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <h1 className="font-bold text-2xl">Task not found</h1>
          <p className="text-muted-foreground">
            The task you're looking for doesn't exist or has been deleted.
          </p>
          <Button onClick={() => router.back()}>Go back</Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "IN_PROGRESS":
        return "bg-blue-500";
      case "DONE":
        return "bg-green-500";
      case "MERGED":
        return "bg-purple-500";
      case "ERROR":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const handleDuplicate = () => {
    // Create a new task with the same description
    // This would be implemented with the task store
  };

  const handleRerun = () => {
    // Re-run the task with the same parameters
    // This would be implemented with the task store
  };

  return (
    <div className="min-h-screen bg-background" data-testid="task-detail">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="mx-auto max-w-6xl p-6">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => router.back()}
                size="icon"
                variant="outline"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="font-bold text-3xl">{task.title}</h1>
                <p className="mt-1 text-muted-foreground">{task.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(task.status)}>
                {task.status}
              </Badge>
              {task.mode && <Badge variant="outline">{task.mode}</Badge>}
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Repository</p>
              <p className="font-medium">{task.repository}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Branch</p>
              <p className="font-medium">{task.branch}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium">
                {new Date(task.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              {task.status === "IN_PROGRESS" && task.statusMessage ? (
                <p className="font-medium text-blue-500">
                  {task.statusMessage}
                </p>
              ) : (
                <p className="font-medium">{task.status}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl p-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Messages Panel */}
          <div className="col-span-2 space-y-4">
            <div>
              <h2 className="mb-4 font-semibold text-lg">Conversation</h2>
              <div className="space-y-4">
                {task.messages && task.messages.length > 0 ? (
                  task.messages.map((message, index) => (
                    <Card
                      className={`p-4 ${
                        message.role === "user"
                          ? "bg-muted/50"
                          : "border-primary/20 bg-background"
                      }`}
                      key={index}
                    >
                      <div className="flex items-start gap-3">
                        <div className="font-semibold text-muted-foreground text-xs uppercase">
                          {message.role}
                        </div>
                        <div className="flex-1">
                          {message.role === "assistant" ? (
                            <Markdown>
                              {(message.data as { text?: string })?.text ?? ""}
                            </Markdown>
                          ) : (
                            <p className="text-sm">
                              {(message.data as { text?: string })?.text ?? ""}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No messages yet. Task is being processed...
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              {task.status === "DONE" && (
                <>
                  <Button
                    className="gap-2"
                    onClick={handleRerun}
                    variant="outline"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Re-run Task
                  </Button>
                  <Button
                    className="gap-2"
                    onClick={handleDuplicate}
                    variant="outline"
                  >
                    <Copy className="h-4 w-4" />
                    Duplicate Task
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Tool Events Panel */}
          <div>
            <h2 className="mb-4 font-semibold text-lg">Events</h2>
            <div className="space-y-2" data-testid="tool-events">
              {task.messages && task.messages.length > 0 ? (
                <AgentTimeline messages={task.messages as any} />
              ) : (
                <p className="text-muted-foreground text-sm">
                  No events yet...
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
