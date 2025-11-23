
'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState } from 'react';
import { Message } from './Message';
import { VoiceControls } from './VoiceControls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

import { AgentTimeline } from './AgentTimeline';

export function Chat() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });
  const [input, setInput] = useState('');
  const isLoading = status === 'submitted' || status === 'streaming';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    await sendMessage({ text: input });
    setInput('');
  };

  const handleAudioData = async (blob: Blob) => {
    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'audio/webm',
        },
        body: blob,
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const data = await response.json();
      if (data.text) {
        setInput(prev => prev + (prev ? ' ' : '') + data.text);
      }
    } catch (error) {
      console.error('Error handling audio:', error);
    }
  };

  return (
    <div className="flex gap-4 w-full max-w-5xl mx-auto h-[600px]">
      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle>Big 3 Super-Agent</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full p-4">
            {messages.map((m) => (
              <Message key={m.id} message={m} />
            ))}
            {isLoading && <div className="text-sm text-muted-foreground animate-pulse">Thinking...</div>}
          </ScrollArea>
        </CardContent>
        <CardFooter className="p-4 flex-col gap-4">
          <form onSubmit={handleSubmit} className="flex w-full gap-2">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="Type your message..."
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading}>
              Send
            </Button>
          </form>
          <div className="flex justify-center w-full">
              <VoiceControls onAudioData={handleAudioData} isProcessing={isLoading} />
          </div>
        </CardFooter>
      </Card>

      <Card className="w-80 flex flex-col hidden md:flex">
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
