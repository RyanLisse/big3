"use client";

import { Mic, Square } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type VoiceControlsProps = {
  onAudioData: (blob: Blob) => void;
  isProcessing?: boolean;
};

export function VoiceControls({
  onAudioData,
  isProcessing = false,
}: VoiceControlsProps) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        onAudioData(blob);
        chunksRef.current = [];
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        className={cn(
          "h-12 w-12 rounded-full transition-all",
          isRecording && "animate-pulse"
        )}
        disabled={isProcessing}
        onClick={isRecording ? stopRecording : startRecording}
        size="icon"
        variant={isRecording ? "destructive" : "secondary"}
      >
        {isRecording ? (
          <Square className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </Button>
      {isRecording && (
        <span className="animate-pulse font-medium text-red-500 text-xs">
          Recording...
        </span>
      )}
    </div>
  );
}
