"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect } from "react";
import Navbar from "@/components/navbar";
import TaskList from "./_components/task-list";
import TaskForm from "./_components/task-form";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { ScrollArea } from "@/src/components/ui/scroll-area";
import { Separator } from "@/src/components/ui/separator";
import { Badge } from "@/src/components/ui/badge";
import { 
  Terminal, 
  Code2, 
  MessageSquare, 
  Settings, 
  Play, 
  Pause,
  Zap,
  Bot,
  FileCode,
  GitBranch,
  Activity,
  Command
} from "lucide-react";
import { VoiceControls } from "@/src/components/VoiceControls";

interface AgentSession {
  id: string;
  status: "idle" | "thinking" | "coding" | "browsing" | "speaking";
  lastActivity: Date;
}

export default function ClientPage() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/backend-chat" }),
  });
  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState<"chat" | "code" | "terminal">("chat");
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
      setAgentSession(prev => ({ ...prev, status: "thinking" }));
    } else {
      setAgentSession(prev => ({ ...prev, status: "idle" }));
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
        headers: {
          "Content-Type": "audio/webm",
        },
        body: blob,
      });

      if (!response.ok) throw new Error("Transcription failed");
      const data = await response.json();
      if (data.text) {
        setInput(prev => prev + (prev ? " " : "") + data.text);
      }
    } catch (error) {
      console.error("Error handling audio:", error);
    }
  };

  const getStatusColor = (status: AgentSession["status"]) => {
    switch (status) {
      case "thinking": return "bg-yellow-500";
      case "coding": return "bg-blue-500";
      case "browsing": return "bg-purple-500";
      case "speaking": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: AgentSession["status"]) => {
    switch (status) {
      case "thinking": return <Bot className="h-3 w-3" />;
      case "coding": return <Code2 className="h-3 w-3" />;
      case "browsing": return <GitBranch className="h-3 w-3" />;
      case "speaking": return <Terminal className="h-3 w-3" />;
      default: return <Activity className="h-3 w-3" />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="w-64 border-r flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(agentSession.status)}`} />
              <span className="font-semibold">Big3 Agent</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {agentSession.status}
            </Badge>
          </div>

          {/* Navigation */}
          <div className="p-2">
            <nav className="space-y-1">
              <Button
                variant={activeTab === "chat" ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("chat")}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat
              </Button>
              <Button
                variant={activeTab === "code" ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("code")}
              >
                <FileCode className="h-4 w-4 mr-2" />
                Code
              </Button>
              <Button
                variant={activeTab === "terminal" ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("terminal")}
              >
                <Terminal className="h-4 w-4 mr-2" />
                Terminal
              </Button>
            </nav>
          </div>

          <Separator />

          {/* Codex-Clone Tasks */}
          <div className="flex-1 p-4 overflow-hidden">
            <div className="space-y-4">
              <TaskForm />
              <Separator />
              <TaskList />
            </div>
          </div>

          <Separator />

          {/* Agent Activity */}
          <div className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
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
                <Badge variant="outline" className="text-xs">
                  {agentSession.status}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Quick Actions */}
          <div className="p-4">
            <h3 className="font-semibold mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full">
                <Play className="h-3 w-3 mr-2" />
                Start Session
              </Button>
              <Button variant="outline" size="sm" className="w-full">
                <Pause className="h-3 w-3 mr-2" />
                Pause
              </Button>
              <Button variant="outline" size="sm" className="w-full">
                <Settings className="h-3 w-3 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Top Bar */}
          <div className="flex items-center justify-between p-3 border-b bg-muted/30">
            <div className="flex items-center gap-4">
              <h1 className="font-semibold">Big3 Super-Agent</h1>
              <div className="flex items-center gap-2">
                {getStatusIcon(agentSession.status)}
                <span className="text-sm text-muted-foreground">
                  {agentSession.status === "idle" ? "Ready" : 
                   agentSession.status === "thinking" ? "Processing..." :
                   agentSession.status}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Command className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-4xl mx-auto">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted border"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {m.role === "assistant" && <Bot className="h-4 w-4" />}
                        <span className="text-sm font-medium">
                          {m.role === "user" ? "You" : "AI Assistant"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date().toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-sm whitespace-pre-wrap">{JSON.stringify(m.parts, null, 2)}</div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted border rounded-lg p-4 max-w-[80%]">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin">
                          <Bot className="h-4 w-4" />
                        </div>
                        <span className="text-sm">Agent is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t p-4">
              <form className="flex gap-2 max-w-4xl mx-auto" onSubmit={handleSubmit}>
                <Input
                  className="flex-1"
                  onChange={handleInputChange}
                  placeholder="Type your message or use voice input..."
                  value={input}
                  disabled={isLoading}
                />
                <Button type="submit" disabled={isLoading}>
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

        {/* Right Panel - Tool Events */}
        <div className="w-80 border-l flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Tool Events
            </h3>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-2">
              {messages
                .filter(m => m.role === "assistant")
                .map((m, i) => (
                  <div key={i} className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Terminal className="h-3 w-3" />
                      <span className="font-medium text-sm">Assistant Response</span>
                      <Badge variant="outline" className="text-xs">
                        complete
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <pre className="whitespace-pre-wrap bg-background p-2 rounded max-h-32 overflow-y-auto">
                          {JSON.stringify(m.parts, null, 2)}
                        </pre>
                    </div>
                  </div>
                ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
