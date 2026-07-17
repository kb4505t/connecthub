"use client";

import { MessageSquare } from "lucide-react";
import { useConversations } from "@/hooks/use-messages";
import { usePresence } from "@/hooks/use-message-socket";
import { useAuthStore } from "@/store/auth-store";
import { ConversationListItem } from "@/components/messages/conversation-list-item";
import { NewConversationDialog } from "@/components/messages/new-conversation-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function MessagesPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useConversations();
  const onlineUserIds = usePresence();

  const conversations = data?.pages.flatMap((p) => p.data.items) ?? [];

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Messages</h1>
        <NewConversationDialog />
      </div>

      <div className="glass-card p-2">
        {isLoading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No conversations yet"
            description="Start a direct message or create a group chat to get going."
          />
        ) : (
          <div className="space-y-1">
            {conversations.map((conversation) => {
              const other = conversation.participants.find((p) => p.id !== user.id);
              return (
                <ConversationListItem
                  key={conversation.id}
                  conversation={conversation}
                  currentUserId={user.id}
                  isOnline={!!other && onlineUserIds.has(other.id)}
                />
              );
            })}
          </div>
        )}

        {hasNextPage && (
          <div className="p-2 pt-3 text-center">
            <Button variant="ghost" size="sm" onClick={() => fetchNextPage()} isLoading={isFetchingNextPage}>
              Load more
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
