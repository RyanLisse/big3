"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  Activity,
  Bot,
  Code2,
  Command,
  FileCode,
  GitBranch,
  MessageSquare,
  Pause,
  Play,
  Settings,
  Terminal,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Message } from "./Message";
import { ToolEvent } from "./ToolEvent";
import { VoiceControls } from "./VoiceControls";

interface AgentSession {
  id: string;
  status: "idle" | "thinking" | "coding" | "browsing" | "speaking";
  lastActivity: Date;
}

export function CodexInterface() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState<"chat" | "code" | "terminal">(
    "chat"
  );
  const [agentSession, setAgentSession] = useState<AgentSession>({
    id: "main",
    status: "idle",
    lastActivity: new Date(),
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isLoading = status === "submitted" || status === "streaming";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isLoading) {
      setAgentSession((prev) => ({ ...prev, status: "thinking" }));
    } else {
      setAgentSession((prev) => ({ ...prev, status: "idle" }));
    }
  }, [isLoading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    await sendMessage({ text: input });
    setInput("");
  };

  const handleAudioData = async (blob: Blob) => {
    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "audio/webm" },
        body: blob,
      });

      if (!response.ok) throw new Error("Transcription failed");
      const data = await response.json();
      if (data.text) {
        setInput((prev) => prev + (prev ? " " : "") + data.text);
      }
    } catch (error) {
      console.error("Error handling audio:", error);
    }
  };

  const getStatusColor = (status: AgentSession["status"]) => {
    switch (status) {
      case "thinking":
        return "bg-yellow-500";
      case "coding":
        return "bg-blue-500";
      case "browsing":
        return "bg-purple-500";
      case "speaking":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: AgentSession["status"]) => {
    switch (status) {
      case "thinking":
        return <Bot className="h-3 w-3" />;
      case "coding":
        return <Code2 className="h-3 w-3" />;
      case "browsing":
        return <GitBranch className="h-3 w-3" />;
      case "speaking":
        return <Terminal className="h-3 w-3" />;
      default:
        return <Activity className="h-3 w-3" />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <ResizablePanelGroup className="h-full" direction="horizontal">
        <ResizablePanel defaultSize={250} maxSize={400} minSize={200}>
          <div className="codex-sidebar flex h-full flex-col border-r">
            {/* Header */}
            <div className="codex-header flex items-center justify-between border-b p-4">
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${getStatusColor(agentSession.status)}`}
                />
                <span className="font-semibold">Big3 Agent</span>
              </div>
              <Badge className="text-xs" variant="outline">
                {agentSession.status}
              </Badge>
            </div>

            {/* Navigation */}
            <div className="p-2">
              <nav className="space-y-1">
                <Button
                  className="w-full justify-start"
                  onClick={() => setActiveTab("chat")}
                  variant={activeTab === "chat" ? "secondary" : "ghost"}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Chat
                </Button>
                <Button
                  className="w-full justify-start"
                  onClick={() => setActiveTab("code")}
                  variant={activeTab === "code" ? "secondary" : "ghost"}
                >
                  <FileCode className="mr-2 h-4 w-4" />
                  Code
                </Button>
                <Button
                  className="w-full justify-start"
                  onClick={() => setActiveTab("terminal")}
                  variant={activeTab === "terminal" ? "secondary" : "ghost"}
                >
                  <Terminal className="mr-2 h-4 w-4" />
                  Terminal
                </Button>
              </nav>
            </div>

            <Separator />

            {/* Agent Activity */}
            <div className="flex-1 p-4">
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                {getStatusIcon(agentSession.status)}
                Agent Activity
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Messages</span>
                  <span>{messages.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Session</span>
                  <span>{agentSession.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className="text-xs" variant="outline">
                    {agentSession.status}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Quick Actions */}
            <div className="p-4">
              <h3 className="mb-3 font-semibold">Quick Actions</h3>
              <div className="space-y-2">
                <Button className="w-full" size="sm" variant="outline">
                  <Play className="mr-2 h-3 w-3" />
                  Start Session
                </Button>
                <Button className="w-full" size="sm" variant="outline">
                  <Pause className="mr-2 h-3 w-3" />
                  Pause
                </Button>
                <Button className="w-full" size="sm" variant="outline">
                  <Settings className="mr-2 h-3 w-3" />
                  Settings
                </Button>
              </div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Main Content */}
        <ResizablePanel defaultSize={700}>
          <div className="flex h-full flex-col">
            {/* Top Bar */}
            <div className="codex-header flex items-center justify-between border-b p-3">
              <div className="flex items-center gap-4">
                <h1 className="font-semibold">Big3 Super-Agent</h1>
                <div className="flex items-center gap-2">
                  {getStatusIcon(agentSession.status)}
                  <span className="text-muted-foreground text-sm">
                    {agentSession.status === "idle"
                      ? "Ready"
                      : agentSession.status === "thinking"
                        ? "Processing..."
                        : agentSession.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost">
                  <Command className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex flex-1 flex-col">
              <ScrollArea className="codex-scrollbar flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((m) => (
                    <Message key={m.id} message={m} />
                  ))}
                  {isLoading && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="animate-spin">
                        <Bot className="h-4 w-4" />
                      </div>
                      <span className="text-sm">Agent is thinking...</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="border-t p-4">
                <form className="flex gap-2" onSubmit={handleSubmit}>
                  <Input
                    className="codex-input flex-1"
                    disabled={isLoading}
                    onChange={handleInputChange}
                    placeholder="Type your message or use voice input..."
                    value={input}
                  />
                  <Button disabled={isLoading} type="submit">
                    {isLoading ? (
                      <div className="animate-spin">
                        <Bot className="h-4 w-4" />
                      </div>
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                  </Button>
                </form>

                {/* Voice Controls */}
                <div className="mt-3 flex justify-center">
                  <VoiceControls
                    isProcessing={isLoading}
                    onAudioData={handleAudioData}
                  />
                </div>
              </div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel - Tool Events */}
        <ResizablePanel defaultSize={300} maxSize={500} minSize={250}>
          <div className="codex-panel flex h-full flex-col border-l">
            <div className="codex-header border-b p-4">
              <h3 className="flex items-center gap-2 font-semibold">
                <Zap className="h-4 w-4" />
                Tool Events
              </h3>
            </div>
            <ScrollArea className="codex-scrollbar flex-1 p-4">
              <div className="space-y-2">
                {messages
                  .filter((m) => m.role === "assistant")
                  .map((m, i) => (
                    <ToolEvent key={i} message={m} />
                  ))}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
