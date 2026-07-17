"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/time";
import type { ConversationDTO } from "@connecthub/shared-types";

interface ConversationListItemProps {
  conversation: ConversationDTO;
  currentUserId: string;
  isOnline: boolean;
  isActive?: boolean;
}

function conversationDisplay(conversation: ConversationDTO, currentUserId: string) {
  if (conversation.type === "GROUP") {
    return { name: conversation.name ?? "Group chat", avatarUrl: null as string | null, isGroup: true };
  }
  const other = conversation.participants.find((p) => p.id !== currentUserId) ?? conversation.participants[0];
  return { name: other?.fullName ?? other?.username ?? "Unknown", avatarUrl: other?.avatarUrl ?? null, isGroup: false };
}

function previewText(conversation: ConversationDTO, currentUserId: string): string {
  const last = conversation.lastMessage;
  if (!last) return "No messages yet";
  const prefix = last.sender.id === currentUserId ? "You: " : "";
  if (last.content) return `${prefix}${last.content}`;
  if (last.mediaType === "IMAGE") return `${prefix}📷 Photo`;
  return `${prefix}🎤 Voice message`;
}

export function ConversationListItem({ conversation, currentUserId, isOnline, isActive }: ConversationListItemProps) {
  const { name, avatarUrl, isGroup } = conversationDisplay(conversation, currentUserId);
  const initials = name.slice(0, 2).toUpperCase();
  const hasUnread = conversation.unreadCount > 0;

  return (
    <Link
      href={`/messages/${conversation.id}`}
      className={cn(
        "flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-secondary/60",
        isActive && "bg-secondary"
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="h-12 w-12">
          {isGroup ? (
            <AvatarFallback>
              <Users className="h-5 w-5" />
            </AvatarFallback>
          ) : (
            <>
              <AvatarImage src={avatarUrl ?? undefined} alt={name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </>
          )}
        </Avatar>
        {!isGroup && isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-500 ring-2 ring-card" aria-label="Online" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className={cn("truncate text-sm", hasUnread ? "font-semibold" : "font-medium")}>{name}</p>
          {conversation.lastMessage && (
            <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(conversation.lastMessage.createdAt)}</span>
          )}
        </div>
        <p className={cn("truncate text-sm", hasUnread ? "text-foreground" : "text-muted-foreground")}>
          {previewText(conversation, currentUserId)}
        </p>
      </div>

      {hasUnread && (
        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
          {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
        </span>
      )}
    </Link>
  );
}
