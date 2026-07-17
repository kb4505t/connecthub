"use client";

import { useParams } from "next/navigation";
import { Hash } from "lucide-react";
import { PostList } from "@/components/post/post-list";
import { usePostsByHashtag } from "@/hooks/use-search";

export default function HashtagPage() {
  const { tag } = useParams<{ tag: string }>();
  const decodedTag = decodeURIComponent(tag).toLowerCase();
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = usePostsByHashtag(decodedTag);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
          <Hash className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-xl font-bold tracking-tight">#{decodedTag}</h1>
          <p className="text-sm text-muted-foreground">Posts tagged with #{decodedTag}</p>
        </div>
      </div>

      <PostList
        data={data}
        isLoading={isLoading}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
        emptyIcon={Hash}
        emptyTitle="No posts yet"
        emptyDescription={`Nobody has posted with #${decodedTag} yet.`}
      />
    </div>
  );
}
