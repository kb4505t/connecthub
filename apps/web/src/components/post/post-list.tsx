import { FileText, LucideIcon } from "lucide-react";
import { PostCard } from "@/components/post/post-card";
import { PostCardSkeleton } from "@/components/post/post-card-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import type { PostDTO } from "@connecthub/shared-types";
import type { InfiniteData } from "@tanstack/react-query";

interface PostListProps {
  data?: InfiniteData<{ data: { items: PostDTO[]; nextCursor: string | null } }>;
  isLoading: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
}

export function PostList({
  data,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  emptyTitle = "No posts yet",
  emptyDescription,
  emptyIcon = FileText,
}: PostListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const posts = data?.pages.flatMap((page) => page.data.items) ?? [];

  if (posts.length === 0) {
    return (
      <div className="glass-card">
        <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {hasNextPage && (
        <div className="text-center py-2">
          <Button variant="outline" size="sm" onClick={onLoadMore} isLoading={isFetchingNextPage}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
