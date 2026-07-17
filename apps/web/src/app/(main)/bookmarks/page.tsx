"use client";

import { Bookmark } from "lucide-react";
import { PostList } from "@/components/post/post-list";
import { useBookmarkedPosts } from "@/hooks/use-posts";

export default function BookmarksPage() {
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useBookmarkedPosts();

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Saved posts</h1>
      <PostList
        data={data}
        isLoading={isLoading}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
        emptyIcon={Bookmark}
        emptyTitle="No saved posts"
        emptyDescription="Posts you save will show up here."
      />
    </div>
  );
}
