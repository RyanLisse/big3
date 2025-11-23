
import { UIMessage as MessageType } from 'ai';
import { cn } from '@/lib/utils';

interface MessageProps {
  message: MessageType;
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex w-full mb-4',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'rounded-lg px-4 py-2 max-w-[80%]',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        )}
      >
        <div className="font-semibold text-xs mb-1">
          {isUser ? 'You' : 'Agent'}
        </div>
        <div className="whitespace-pre-wrap">
          {message.parts
            .filter((part) => part.type === 'text')
            .map((part) => (part as { text: string }).text)
            .join('')}
        </div>
      </div>
    </div>
  );
}
