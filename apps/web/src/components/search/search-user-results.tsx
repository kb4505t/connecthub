"use client";

import Link from "next/link";
import { BadgeCheck, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { FollowButton } from "@/components/profile/follow-button";
import { useAuthStore } from "@/store/auth-store";
import { useSearchUsers } from "@/hooks/use-search";

export function SearchUserResults({ query }: { query: string }) {
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useSearchUsers(query);
  const currentUserId = useAuthStore((s) => s.user?.id);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const users = data?.pages.flatMap((page) => page.data.items) ?? [];

  if (users.length === 0) {
    return <EmptyState icon={Users} title="No people found" description={`Nobody matches "${query}".`} />;
  }

  return (
    <div className="divide-y divide-border">
      {users.map((user) => (
        <div key={user.id} className="flex items-center justify-between gap-3 p-4">
          <Link href={`/profile/${user.username}`} className="flex min-w-0 items-center gap-3">
            <Avatar>
              <AvatarImage src={user.avatarUrl ?? undefined} alt={user.username} />
              <AvatarFallback>{(user.fullName ?? user.username).slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <p className="truncate text-sm font-medium">{user.fullName ?? user.username}</p>
                {user.isVerified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 fill-primary/20 text-primary" />}
              </div>
              <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
              {user.bio && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{user.bio}</p>}
            </div>
          </Link>

          {currentUserId && currentUserId !== user.id && (
            <FollowButton username={user.username} isFollowing={user.isFollowedByViewer} />
          )}
        </div>
      ))}

      {hasNextPage && (
        <div className="p-4 text-center">
          <Button variant="outline" size="sm" onClick={() => fetchNextPage()} isLoading={isFetchingNextPage}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
