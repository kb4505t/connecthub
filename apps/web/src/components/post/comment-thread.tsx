"use client";

import { MessageCircle } from "lucide-react";
import { CommentComposer } from "@/components/post/comment-composer";
import { CommentItem } from "@/components/post/comment-item";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useComments, useCreateComment } from "@/hooks/use-comments";

export function CommentThread({ postId }: { postId: string }) {
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useComments(postId);
  const createMutation = useCreateComment(postId);

  const comments = data?.pages.flatMap((p) => p.data.items) ?? [];

  return (
    <div className="space-y-4">
      <CommentComposer
        isSubmitting={createMutation.isPending}
        onSubmit={(content) => createMutation.mutate({ content })}
      />

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-2">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <Skeleton className="h-12 flex-1 rounded-2xl" />
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <EmptyState icon={MessageCircle} title="No comments yet" description="Be the first to say something." />
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} postId={postId} rootId={comment.id} />
          ))}
        </div>
      )}

      {hasNextPage && (
        <div className="text-center">
          <Button variant="outline" size="sm" onClick={() => fetchNextPage()} isLoading={isFetchingNextPage}>
            Load more comments
          </Button>
        </div>
      )}
    </div>
  );
}
