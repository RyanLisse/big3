"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { ScrollArea } from "@/src/components/ui/scroll-area";
import { AgentTimeline } from "./AgentTimeline";
import { Message } from "./Message";
import { VoiceControls } from "./VoiceControls";

export function Chat() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [input, setInput] = useState("");
  const isLoading = status === "submitted" || status === "streaming";

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) {
      return;
    }
    await sendMessage({ text: input });
    setInput("");
  };

  const handleAudioData = async (blob: Blob) => {
    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: {
          "Content-Type": "audio/webm",
        },
        body: blob,
      });

      if (!response.ok) {
        throw new Error("Transcription failed");
      }

      const data = await response.json();
      if (data.text) {
        setInput((prev) => prev + (prev ? " " : "") + data.text);
      }
    } catch (error) {
      console.error("Error handling audio:", error);
    }
  };

  return (
    <div className="mx-auto flex h-[600px] w-full max-w-5xl gap-4">
      <Card className="flex flex-1 flex-col">
        <CardHeader>
          <CardTitle>Big 3 Super-Agent</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full p-4">
            {messages.map((m) => (
              <Message key={m.id} message={m} />
            ))}
            {isLoading && (
              <div className="animate-pulse text-muted-foreground text-sm">
                Thinking...
              </div>
            )}
          </ScrollArea>
        </CardContent>
        <CardFooter className="flex-col gap-4 p-4">
          <form className="flex w-full gap-2" onSubmit={handleSubmit}>
            <Input
              className="flex-1"
              onChange={handleInputChange}
              placeholder="Type your message..."
              value={input}
            />
            <Button disabled={isLoading} type="submit">
              Send
            </Button>
          </form>
          <div className="flex w-full justify-center">
            <VoiceControls
              isProcessing={isLoading}
              onAudioData={handleAudioData}
            />
          </div>
        </CardFooter>
      </Card>

      <Card className="flex hidden w-80 flex-col md:flex">
        <CardHeader>
          <CardTitle>Agent Activity</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full p-4">
            <AgentTimeline messages={messages} />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
