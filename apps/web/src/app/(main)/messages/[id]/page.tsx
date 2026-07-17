"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, LogOut, Users } from "lucide-react";
import { useConversation, useMessages, useSendMessage, useSendMediaMessage, useMarkConversationRead, useLeaveConversation } from "@/hooks/use-messages";
import { usePresence, useTypingIndicator } from "@/hooks/use-message-socket";
import { useAuthStore } from "@/store/auth-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageBubble } from "@/components/messages/message-bubble";
import { MessageComposer } from "@/components/messages/message-composer";
import { TypingIndicator } from "@/components/messages/typing-indicator";

export default function ConversationThreadPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const { data: conversation, isLoading: isLoadingConversation } = useConversation(id);
  const messagesQuery = useMessages(id);
  const sendMessage = useSendMessage(id);
  const sendMediaMessage = useSendMediaMessage(id);
  const markRead = useMarkConversationRead();
  const leaveConversation = useLeaveConversation();

  const onlineUserIds = usePresence();
  const { typingUserIds, notifyTypingStart, notifyTypingStop } = useTypingIndicator(id);

  const bottomRef = React.useRef<HTMLDivElement>(null);
  const messages = React.useMemo(
    () => (messagesQuery.data?.pages.flatMap((p) => p.data.items) ?? []).slice().reverse(),
    [messagesQuery.data]
  );

  // Mark the thread read once its messages have loaded, and again whenever a
  // new message arrives while it's open (the query invalidation from the
  // socket listener re-triggers this effect via `messages.length`).
  React.useEffect(() => {
    if (id && messages.length > 0) markRead.mutate(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, messages.length]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (!user) return null;

  if (isLoadingConversation || !conversation) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  const isGroup = conversation.type === "GROUP";
  const other = conversation.participants.find((p) => p.id !== user.id);
  const title = isGroup ? conversation.name ?? "Group chat" : other?.fullName ?? other?.username ?? "Unknown";
  const isOtherOnline = !isGroup && !!other && onlineUserIds.has(other.id);
  const typingOthers = Array.from(typingUserIds).filter((uid) => uid !== user.id);

  return (
    <div className="mx-auto flex h-[calc(100vh-9rem)] max-w-2xl flex-col">
      <div className="glass mb-3 flex items-center gap-3 rounded-2xl border px-3 py-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/messages")} aria-label="Back to messages">
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="relative shrink-0">
          <Avatar className="h-10 w-10">
            {isGroup ? (
              <AvatarFallback>
                <Users className="h-4 w-4" />
              </AvatarFallback>
            ) : (
              <>
                <AvatarImage src={other?.avatarUrl ?? undefined} alt={title} />
                <AvatarFallback>{title.slice(0, 2).toUpperCase()}</AvatarFallback>
              </>
            )}
          </Avatar>
          {isOtherOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 ring-2 ring-card" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {isGroup ? (
            <p className="truncate text-sm font-semibold">{title}</p>
          ) : (
            <Link href={`/profile/${other?.username}`} className="truncate text-sm font-semibold hover:underline">
              {title}
            </Link>
          )}
          <p className="text-xs text-muted-foreground">
            {isGroup ? `${conversation.participants.length} members` : isOtherOnline ? "Online" : "Offline"}
          </p>
        </div>

        {isGroup && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => leaveConversation.mutate(conversation.id, { onSuccess: () => router.push("/messages") })}
            aria-label="Leave group"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border bg-card/40 p-4">
        {messagesQuery.hasNextPage && (
          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => messagesQuery.fetchNextPage()}
              isLoading={messagesQuery.isFetchingNextPage}
            >
              Load earlier messages
            </Button>
          </div>
        )}

        {messagesQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className={`h-12 ${i % 2 === 0 ? "ml-auto" : ""} w-2/3 rounded-2xl`} />
            ))}
          </div>
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} isOwn={message.sender.id === user.id} />)
        )}

        {typingOthers.length > 0 && <TypingIndicator label={isGroup ? "Someone is typing…" : `${title} is typing…`} />}

        <div ref={bottomRef} />
      </div>

      <div className="mt-3">
        <MessageComposer
          isSending={sendMessage.isPending || sendMediaMessage.isPending}
          onSendText={(content) => sendMessage.mutate(content)}
          onSendImage={(file) => {
            const formData = new FormData();
            formData.append("media", file);
            sendMediaMessage.mutate(formData);
          }}
          onSendVoice={(blob) => {
            const formData = new FormData();
            formData.append("media", blob, "voice-message.webm");
            sendMediaMessage.mutate(formData);
          }}
          onTypingStart={notifyTypingStart}
          onTypingStop={notifyTypingStop}
        />
      </div>
    </div>
  );
}
