"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";

const MAX_LENGTH = 2000;

export function CommentComposer({
  onSubmit,
  isSubmitting,
  placeholder = "Write a comment...",
  autoFocus,
  onCancel,
}: {
  onSubmit: (content: string) => void;
  isSubmitting: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  onCancel?: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const [content, setContent] = React.useState("");

  if (!user) return null;
  const initials = (user.fullName ?? user.username).slice(0, 2).toUpperCase();

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setContent("");
  };

  return (
    <div className="flex gap-2">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={user.avatarUrl ?? undefined} alt={user.username} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={placeholder}
          maxLength={MAX_LENGTH}
          autoFocus={autoFocus}
          className="w-full h-9 rounded-full border border-input bg-background px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {content.length > 0 && (
          <div className="flex items-center gap-2 mt-1.5">
            <Button size="sm" onClick={handleSubmit} isLoading={isSubmitting} disabled={!content.trim()}>
              Reply
            </Button>
            {onCancel && (
              <Button size="sm" variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
