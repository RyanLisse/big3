import type { UIMessage } from "ai";
import { ScrollArea } from "@/src/components/ui/scroll-area";
import { ToolEvent } from "./ToolEvent";

type AgentTimelineProps = {
  messages: UIMessage[];
};

export function AgentTimeline({ messages }: AgentTimelineProps) {
  // Filter for tool parts from assistant messages
  const toolParts = messages
    .filter((m) => m.role === "assistant")
    .flatMap((m) => m.parts.filter((p) => p.type.startsWith("tool-")));

  if (toolParts.length === 0) {
    return null;
  }

  return (
    <div className="ml-4 space-y-4 border-l pl-4">
      <h3 className="font-medium text-muted-foreground text-sm">
        Agent Actions
      </h3>
      <ScrollArea className="h-[300px] pr-4">
        <div className="space-y-4">
          {toolParts.map((part, i) => (
            <ToolEvent
              key={(part as any).toolCallId || i}
              message={{
                id: (part as any).toolCallId || `tool-${i}`,
                role: "assistant" as const,
                parts: [part],
              }}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
