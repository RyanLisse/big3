import { UIMessage } from 'ai';
import { ToolEvent } from './ToolEvent';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AgentTimelineProps {
  messages: UIMessage[];
}

export function AgentTimeline({ messages }: AgentTimelineProps) {
  // Filter for tool parts from assistant messages
  const toolParts = messages
    .filter(m => m.role === 'assistant')
    .flatMap(m => m.parts.filter(p => p.type.startsWith('tool-')));
  
  if (toolParts.length === 0) {
    return null;
  }

  return (
    <div className="border-l pl-4 ml-4 space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">Agent Actions</h3>
      <ScrollArea className="h-[300px] pr-4">
        <div className="space-y-4">
          {toolParts.map((part, i) => (
            <ToolEvent key={(part as any).toolCallId || i} toolInvocation={part as any} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
