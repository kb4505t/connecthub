"use client";

import * as React from "react";
import { ImagePlus, Mic, Send, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_LENGTH = 2000;

interface MessageComposerProps {
  onSendText: (content: string) => void;
  onSendImage: (file: File) => void;
  onSendVoice: (blob: Blob) => void;
  isSending: boolean;
  onTypingStart: () => void;
  onTypingStop: () => void;
}

export function MessageComposer({
  onSendText,
  onSendImage,
  onSendVoice,
  isSending,
  onTypingStart,
  onTypingStop,
}: MessageComposerProps) {
  const [content, setContent] = React.useState("");
  const [isRecording, setIsRecording] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const typingStopTimeoutRef = React.useRef<ReturnType<typeof setTimeout>>();

  const handleTextChange = (value: string) => {
    setContent(value);
    onTypingStart();
    clearTimeout(typingStopTimeoutRef.current);
    // Debounced "stopped typing" — sent 2s after the last keystroke rather
    // than on every change, so we're not emitting a socket event per character.
    typingStopTimeoutRef.current = setTimeout(onTypingStop, 2000);
  };

  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    onSendText(trimmed);
    setContent("");
    onTypingStop();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onSendImage(file);
    e.target.value = "";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
        stream.getTracks().forEach((track) => track.stop());
        if (blob.size > 0) onSendVoice(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      // Mic permission denied or unavailable — nothing to send, just stay in the text-input state.
    }
  };

  const stopRecording = (send: boolean) => {
    if (!send) audioChunksRef.current = [];
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  };

  if (isRecording) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-input bg-background px-4 py-2.5">
        <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-destructive" />
        <span className="flex-1 text-sm text-muted-foreground">Recording voice message…</span>
        <Button type="button" size="sm" variant="ghost" onClick={() => stopRecording(false)} aria-label="Cancel recording">
          <X className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" onClick={() => stopRecording(true)} aria-label="Send voice message">
          <Square className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => fileInputRef.current?.click()}
        aria-label="Attach image"
      >
        <ImagePlus className="h-5 w-5" />
      </Button>

      <textarea
        value={content}
        onChange={(e) => handleTextChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder="Write a message..."
        maxLength={MAX_LENGTH}
        rows={1}
        className="max-h-32 flex-1 resize-none rounded-2xl border border-input bg-background px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      {content.trim() ? (
        <Button type="button" size="sm" onClick={handleSend} isLoading={isSending} aria-label="Send message">
          <Send className="h-4 w-4" />
        </Button>
      ) : (
        <Button type="button" size="sm" variant="ghost" onClick={startRecording} aria-label="Record voice message">
          <Mic className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
