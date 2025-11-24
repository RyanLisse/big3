import type { UIMessage } from "ai";
import { Code, Database, Globe, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type ToolEventProps = {
  message: UIMessage;
};

const getToolIcon = (toolName: string) => {
  switch (toolName.toLowerCase()) {
    case "terminal":
    case "bash":
    case "shell":
      return <Terminal className="h-3 w-3" />;
    case "code":
    case "editor":
      return <Code className="h-3 w-3" />;
    case "browser":
    case "web":
    case "fetch":
      return <Globe className="h-3 w-3" />;
    case "database":
    case "redis":
      return <Database className="h-3 w-3" />;
    default:
      return <Code className="h-3 w-3" />;
  }
};

export function ToolEvent({ message }: ToolEventProps) {
  // Extract tool invocations from message parts
  const toolParts =
    message.parts?.filter((part) => part.type.startsWith("tool-")) || [];

  // If there are tool parts, display them
  if (toolParts.length > 0) {
    return (
      <div className="space-y-2">
        {toolParts.map((part, index) => (
          <Card className="p-3" key={index}>
            <div className="mb-2 flex items-center gap-2">
              {getToolIcon((part as any).toolName || "tool")}
              <span className="font-medium text-sm">
                {(part as any).toolName || "Unknown Tool"}
              </span>
              <Badge className="text-xs" variant="outline">
                {(part as any).state || "executing"}
              </Badge>
            </div>

            {(part as any).args && (
              <div className="mb-2 text-muted-foreground text-xs">
                <pre className="whitespace-pre-wrap rounded bg-muted/50 p-2">
                  {JSON.stringify((part as any).args, null, 2)}
                </pre>
              </div>
            )}

            {(part as any).result && (
              <div className="text-xs">
                <pre className="whitespace-pre-wrap rounded bg-green-50 p-2 text-green-800 dark:bg-green-950/20 dark:text-green-200">
                  {typeof (part as any).result === "string"
                    ? (part as any).result
                    : JSON.stringify((part as any).result, null, 2)}
                </pre>
              </div>
            )}
          </Card>
        ))}
      </div>
    );
  }

  // Fallback: show message content if available
  const content = (message.parts?.find((p) => p.type === "text") as any)?.text;

  if (content && message.role === "assistant") {
    return (
      <Card className="p-3">
        <div className="mb-2 flex items-center gap-2">
          <Terminal className="h-3 w-3" />
          <span className="font-medium text-sm">Agent Response</span>
          <Badge className="text-xs" variant="outline">
            complete
          </Badge>
        </div>
        <div className="text-muted-foreground text-xs">
          <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap rounded bg-muted/50 p-2">
            {content.slice(0, 200)}
            {content.length > 200 && "..."}
          </pre>
        </div>
      </Card>
    );
  }

  return null;
}
