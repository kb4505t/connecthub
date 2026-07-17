"use client";

import Link from "next/link";
import { Heart, MessageCircle, AtSign, UserPlus, Repeat2, Mail, type LucideIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/time";
import type { NotificationDTO } from "@connecthub/shared-types";

const NOTIFICATION_ICON: Record<NotificationDTO["type"], LucideIcon> = {
  LIKE: Heart,
  COMMENT: MessageCircle,
  MENTION: AtSign,
  FOLLOW: UserPlus,
  REPOST: Repeat2,
  MESSAGE: Mail,
};

function notificationText(n: NotificationDTO): string {
  switch (n.type) {
    case "LIKE":
      return n.commentId ? "reacted to your comment" : "reacted to your post";
    case "COMMENT":
      return "commented on your post";
    case "MENTION":
      return "mentioned you in a post";
    case "FOLLOW":
      return "started following you";
    case "REPOST":
      return "reposted your post";
    case "MESSAGE":
      return "sent you a message";
  }
}

/** Where clicking the notification should take the viewer. */
function notificationHref(n: NotificationDTO): string {
  if (n.type === "FOLLOW") return `/profile/${n.actor.username}`;
  if (n.postId) return `/posts/${n.postId}`;
  return "#";
}

interface NotificationItemProps {
  notification: NotificationDTO;
  onOpen?: () => void;
}

export function NotificationItem({ notification, onOpen }: NotificationItemProps) {
  const Icon = NOTIFICATION_ICON[notification.type];
  const actorName = notification.actor.fullName ?? notification.actor.username;

  return (
    <Link
      href={notificationHref(notification)}
      onClick={onOpen}
      className={cn(
        "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-secondary/50",
        !notification.isRead && "bg-primary/5"
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={notification.actor.avatarUrl ?? undefined} alt={actorName} />
          <AvatarFallback>{actorName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-card ring-2 ring-card">
          <Icon className="h-3 w-3 text-primary" />
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug">
          <span className="font-medium">{actorName}</span>{" "}
          <span className="text-muted-foreground">{notificationText(notification)}</span>
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(notification.createdAt)}</p>
      </div>

      {!notification.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
    </Link>
  );
}
