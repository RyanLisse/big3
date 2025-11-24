import type { UIMessage as MessageType } from "ai";
import { cn } from "@/lib/utils";

type MessageProps = {
  message: MessageType;
};

export function Message({ message }: MessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "mb-4 flex w-full",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-2",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        <div className="mb-1 font-semibold text-xs">
          {isUser ? "You" : "Agent"}
        </div>
        <div className="whitespace-pre-wrap">
          {message.parts
            .filter((part) => part.type === "text")
            .map((part) => (part as { text: string }).text)
            .join("")}
        </div>
      </div>
    </div>
  );
}
