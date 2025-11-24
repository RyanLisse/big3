"use client";

import { useParams, useRouter } from "next/navigation";
import { useTaskStore } from "@/stores/tasks";
import { ArrowLeft, Copy, RotateCcw } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Markdown } from "@/src/components/Markdown";
import { AgentTimeline } from "@/src/components/AgentTimeline";
import { ToolEvent } from "@/src/components/ToolEvent";

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;
  const { getTaskById } = useTaskStore();
  const task = getTaskById(taskId);

  if (!task) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Task not found</h1>
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
        <div className="max-w-6xl mx-auto p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.back()}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">{task.title}</h1>
                <p className="text-muted-foreground mt-1">{task.description}</p>
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
                <p className="font-medium text-blue-500">{task.statusMessage}</p>
              ) : (
                <p className="font-medium">{task.status}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Messages Panel */}
          <div className="col-span-2 space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-4">Conversation</h2>
              <div className="space-y-4">
                {task.messages && task.messages.length > 0 ? (
                  task.messages.map((message) => (
                    <Card
                      key={message.id}
                      className={`p-4 ${
                        message.role === "user"
                          ? "bg-muted/50"
                          : "bg-background border-primary/20"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-xs font-semibold text-muted-foreground uppercase">
                          {message.role}
                        </div>
                        <div className="flex-1">
                          {message.role === "assistant" ? (
                            <Markdown content={message.content} />
                          ) : (
                            <p className="text-sm">{message.content}</p>
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
                    variant="outline"
                    onClick={handleRerun}
                    className="gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Re-run Task
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDuplicate}
                    className="gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Duplicate Task
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Tool Events Panel */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Events</h2>
            <div
              className="space-y-2"
              data-testid="tool-events"
            >
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
