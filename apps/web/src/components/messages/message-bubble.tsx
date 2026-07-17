"use client";

import { Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/time";
import type { MessageDTO } from "@connecthub/shared-types";

interface MessageBubbleProps {
  message: MessageDTO;
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5 shadow-soft",
          isOwn ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary rounded-bl-md"
        )}
      >
        {message.mediaType === "IMAGE" && message.mediaUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={message.mediaUrl} alt="Attachment" className="mb-1.5 max-h-72 w-full rounded-xl object-cover" />
        )}

        {message.mediaType === "VIDEO" && message.mediaUrl && (
          <audio controls src={message.mediaUrl} className="mb-1.5 h-10 w-56 max-w-full" />
        )}

        {message.content && <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>}

        <div
          className={cn(
            "mt-1 flex items-center justify-end gap-1 text-[10px]",
            isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          <span>{timeAgo(message.createdAt)}</span>
          {isOwn && (message.isRead ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
        </div>
      </div>
    </div>
  );
}
