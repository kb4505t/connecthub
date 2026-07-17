"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { BadgeCheck, Heart } from "lucide-react";
import { usePostLikers } from "@/hooks/use-posts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function PostLikesPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = usePostLikers(id);

  const likers = data?.pages.flatMap((p) => p.data.items) ?? [];

  return (
    <div className="max-w-xl mx-auto">
      <div className="glass-card overflow-hidden">
        <h1 className="text-lg font-semibold px-6 py-4 border-b">Reactions</h1>

        {isLoading ? (
          <div className="space-y-4 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-11 w-11 rounded-full" />
                <Skeleton className="h-3.5 w-32" />
              </div>
            ))}
          </div>
        ) : likers.length === 0 ? (
          <EmptyState icon={Heart} title="No reactions yet" />
        ) : (
          <div className="divide-y divide-border">
            {likers.map((liker) => (
              <Link
                key={liker.id}
                href={`/profile/${liker.username}`}
                className="flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors"
              >
                <Avatar>
                  <AvatarImage src={liker.avatarUrl ?? undefined} alt={liker.username} />
                  <AvatarFallback>{(liker.fullName ?? liker.username).slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium truncate">{liker.fullName ?? liker.username}</p>
                    {liker.isVerified && <BadgeCheck className="h-3.5 w-3.5 text-primary fill-primary/20 shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">@{liker.username}</p>
                </div>
                <span className="text-lg">{liker.emoji}</span>
              </Link>
            ))}

            {hasNextPage && (
              <div className="p-4 text-center">
                <Button variant="outline" size="sm" onClick={() => fetchNextPage()} isLoading={isFetchingNextPage}>
                  Load more
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
