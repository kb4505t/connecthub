"use client";

import Link from "next/link";
import { BadgeCheck, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { UserSummary } from "@connecthub/shared-types";
import type { InfiniteData } from "@tanstack/react-query";

interface UserListProps {
  data?: InfiniteData<{ data: { items: UserSummary[]; nextCursor: string | null } }>;
  isLoading: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  emptyLabel: string;
}

export function UserList({ data, isLoading, hasNextPage, isFetchingNextPage, onLoadMore, emptyLabel }: UserListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const users = data?.pages.flatMap((page) => page.data.items) ?? [];

  if (users.length === 0) {
    return <EmptyState icon={Users} title="Nobody here yet" description={emptyLabel} />;
  }

  return (
    <div className="divide-y divide-border">
      {users.map((user) => (
        <Link
          key={user.id}
          href={`/profile/${user.username}`}
          className="flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors"
        >
          <Avatar>
            <AvatarImage src={user.avatarUrl ?? undefined} alt={user.username} />
            <AvatarFallback>{(user.fullName ?? user.username).slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-sm font-medium truncate">{user.fullName ?? user.username}</p>
              {user.isVerified && <BadgeCheck className="h-3.5 w-3.5 text-primary fill-primary/20 shrink-0" />}
            </div>
            <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
          </div>
        </Link>
      ))}

      {hasNextPage && (
        <div className="p-4 text-center">
          <Button variant="outline" size="sm" onClick={onLoadMore} isLoading={isFetchingNextPage}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
