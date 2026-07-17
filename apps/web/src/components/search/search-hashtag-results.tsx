"use client";

import Link from "next/link";
import { Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useSearchHashtags } from "@/hooks/use-search";

export function SearchHashtagResults({ query }: { query: string }) {
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useSearchHashtags(query);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const hashtags = data?.pages.flatMap((page) => page.data.items) ?? [];

  if (hashtags.length === 0) {
    return <EmptyState icon={Hash} title="No hashtags found" description={`No tags match "${query}".`} />;
  }

  return (
    <div className="divide-y divide-border">
      {hashtags.map((h) => (
        <Link key={h.tag} href={`/hashtag/${h.tag}`} className="flex items-center gap-3 p-4 transition-colors hover:bg-secondary/50">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary">
            <Hash className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium">#{h.tag}</p>
            <p className="text-xs text-muted-foreground">{h.postsCount} {h.postsCount === 1 ? "post" : "posts"}</p>
          </div>
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
  );
}
