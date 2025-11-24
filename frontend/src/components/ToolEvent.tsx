import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code, Terminal, Globe, Database } from "lucide-react";

// AI SDK message structure
type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolInvocations?: Array<{
    toolName?: string;
    state?: string;
    args?: Record<string, unknown>;
    result?: unknown;
  }>;
};

type ToolEventProps = {
  message: Message;
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
  // If there are tool invocations in the message, display them
  if (message.toolInvocations && message.toolInvocations.length > 0) {
    return (
      <div className="space-y-2">
        {message.toolInvocations.map((invocation, index) => (
          <Card key={index} className="p-3">
            <div className="flex items-center gap-2 mb-2">
              {getToolIcon(invocation.toolName || "tool")}
              <span className="font-medium text-sm">{invocation.toolName || "Unknown Tool"}</span>
              <Badge variant="outline" className="text-xs">
                {invocation.state || "executing"}
              </Badge>
            </div>
            
            {invocation.args && (
              <div className="text-xs text-muted-foreground mb-2">
                <pre className="whitespace-pre-wrap bg-muted/50 p-2 rounded">
                  {JSON.stringify(invocation.args, null, 2)}
                </pre>
              </div>
            )}
            
            {invocation.result && (
              <div className="text-xs">
                <pre className="whitespace-pre-wrap bg-green-50 dark:bg-green-950/20 p-2 rounded text-green-800 dark:text-green-200">
                  {typeof invocation.result === "string" 
                    ? invocation.result 
                    : JSON.stringify(invocation.result, null, 2)
                  }
                </pre>
              </div>
            )}
          </Card>
        ))}
      </div>
    );
  }

  // Fallback: show message content as a tool event
  if (message.content && message.role === "assistant") {
    return (
      <Card className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Terminal className="h-3 w-3" />
          <span className="font-medium text-sm">Agent Response</span>
          <Badge variant="outline" className="text-xs">
            complete
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          <pre className="whitespace-pre-wrap bg-muted/50 p-2 rounded max-h-32 overflow-y-auto">
            {message.content.slice(0, 200)}
            {message.content.length > 200 && "..."}
          </pre>
        </div>
      </Card>
    );
  }

  return null;
}
