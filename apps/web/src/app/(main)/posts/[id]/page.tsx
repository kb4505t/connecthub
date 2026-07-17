"use client";

import { useParams } from "next/navigation";
import { FileText } from "lucide-react";
import { usePost } from "@/hooks/use-posts";
import { PostCard } from "@/components/post/post-card";
import { PostCardSkeleton } from "@/components/post/post-card-skeleton";
import { CommentThread } from "@/components/post/comment-thread";
import { EmptyState } from "@/components/ui/empty-state";

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: post, isLoading, isError } = usePost(id);

  if (isLoading) return <PostCardSkeleton />;

  if (isError || !post) {
    return <EmptyState icon={FileText} title="Post not found" description="This post doesn't exist, was deleted, or isn't visible to you." />;
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <PostCard post={post} />
      <div className="glass-card p-4">
        <CommentThread postId={post.id} />
      </div>
    </div>
  );
}
