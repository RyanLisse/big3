import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from './ai-elements/tool';

interface ToolPart {
  type: string;
  toolCallId: string;
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
  input?: any;
  output?: any;
  errorText?: string;
}

interface ToolEventProps {
  toolInvocation: ToolPart;
}

export function ToolEvent({ toolInvocation }: ToolEventProps) {
  const { type, state, input, output, errorText } = toolInvocation;
  const toolName = type.replace('tool-', '');
  
  return (
    <Tool>
      <ToolHeader 
        type={type as any} 
        state={state} 
        title={toolName} 
      />
      <ToolContent>
        <ToolInput input={input} />
        {(state === 'output-available' || state === 'output-error') && (
          <ToolOutput output={output} errorText={errorText} />
        )}
      </ToolContent>
    </Tool>
  );
}
