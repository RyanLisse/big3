import { Card } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Code, Terminal, Globe, Database } from "lucide-react";
import type { UIMessage } from "ai";

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
  const toolParts = message.parts?.filter((part) => part.type.startsWith("tool-")) || [];
  
  // If there are tool parts, display them
  if (toolParts.length > 0) {
    return (
      <div className="space-y-2">
        {toolParts.map((part, index) => (
          <Card key={index} className="p-3">
            <div className="flex items-center gap-2 mb-2">
              {getToolIcon((part as any).toolName || "tool")}
              <span className="font-medium text-sm">{(part as any).toolName || "Unknown Tool"}</span>
              <Badge variant="outline" className="text-xs">
                {(part as any).state || "executing"}
              </Badge>
            </div>
            
            {(part as any).args && (
              <div className="text-xs text-muted-foreground mb-2">
                <pre className="whitespace-pre-wrap bg-muted/50 p-2 rounded">
                  {JSON.stringify((part as any).args, null, 2)}
                </pre>
              </div>
            )}
            
            {(part as any).result && (
              <div className="text-xs">
                <pre className="whitespace-pre-wrap bg-green-50 dark:bg-green-950/20 p-2 rounded text-green-800 dark:text-green-200">
                  {typeof (part as any).result === "string" 
                    ? (part as any).result 
                    : JSON.stringify((part as any).result, null, 2)
                  }
                </pre>
              </div>
            )}
          </Card>
        ))}
      </div>
    );
  }

  // Fallback: show message content if available
  const content = (message.parts?.find(p => p.type === 'text') as any)?.text;
  
  if (content && message.role === "assistant") {
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
            {content.slice(0, 200)}
            {content.length > 200 && "..."}
          </pre>
        </div>
      </Card>
    );
  }

  return null;
}
