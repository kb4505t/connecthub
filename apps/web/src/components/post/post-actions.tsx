"use client";

import * as React from "react";
import Link from "next/link";
import { Heart, MessageCircle, Repeat2, Bookmark, Share, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBookmarkPost, useUnbookmarkPost, useRepost, useUndoRepost, useLikePost, useUnlikePost } from "@/hooks/use-posts";
import { ReactionPicker } from "@/components/post/reaction-picker";
import type { PostDTO } from "@connecthub/shared-types";

function ActionButton({
  icon: Icon,
  count,
  active,
  activeClassName,
  onClick,
  disabled,
  label,
}: {
  icon: React.ElementType;
  count?: number;
  active?: boolean;
  activeClassName?: string;
  onClick?: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "flex items-center gap-1.5 text-sm text-muted-foreground rounded-lg px-2 py-1.5 -ml-2 transition-colors hover:bg-secondary disabled:opacity-50",
        active && activeClassName
      )}
    >
      <Icon className={cn("h-4 w-4", active && "fill-current")} />
      {count !== undefined && count > 0 && <span>{count}</span>}
    </button>
  );
}

export function PostActions({ post }: { post: PostDTO }) {
  const bookmarkMutation = useBookmarkPost();
  const unbookmarkMutation = useUnbookmarkPost();
  const repostMutation = useRepost();
  const undoRepostMutation = useUndoRepost();
  const likeMutation = useLikePost();
  const unlikeMutation = useUnlikePost();
  const [copied, setCopied] = React.useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/posts/${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can fail without a secure context (e.g. plain http) — fail silently rather than crash the UI.
    }
  };

  const handleLikeClick = () => {
    if (post.isLiked) {
      unlikeMutation.mutate(post.id);
    } else {
      likeMutation.mutate({ postId: post.id });
    }
  };

  const handleReactionSelect = (emoji: string) => {
    if (post.viewerReaction === emoji) {
      unlikeMutation.mutate(post.id);
    } else {
      likeMutation.mutate({ postId: post.id, emoji });
    }
  };

  return (
    <div className="mt-3">
      {post.likesCount > 0 && (
        <Link
          href={`/posts/${post.id}/likes`}
          className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:underline w-fit"
        >
          {post.reactions.map((r) => (
            <span key={r.emoji}>{r.emoji}</span>
          ))}
          <span>{post.likesCount}</span>
        </Link>
      )}

      <div className="flex items-center justify-between mt-1 max-w-sm">
        <div className="flex items-center">
          <ActionButton
            icon={Heart}
            active={post.isLiked}
            activeClassName="text-red-500"
            label={post.isLiked ? "Unlike" : "Like"}
            disabled={likeMutation.isPending || unlikeMutation.isPending}
            onClick={handleLikeClick}
          />
          <ReactionPicker onSelect={handleReactionSelect} />
        </div>

        <Link
          href={`/posts/${post.id}`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground rounded-lg px-2 py-1.5 transition-colors hover:bg-secondary"
          aria-label="View comments"
        >
          <MessageCircle className="h-4 w-4" />
          {post.commentsCount > 0 && <span>{post.commentsCount}</span>}
        </Link>

        <ActionButton
          icon={Repeat2}
          count={post.repostsCount}
          active={post.isReposted}
          activeClassName="text-green-600 dark:text-green-500"
          label={post.isReposted ? "Undo repost" : "Repost"}
          disabled={repostMutation.isPending || undoRepostMutation.isPending}
          onClick={() => (post.isReposted ? undoRepostMutation.mutate(post.id) : repostMutation.mutate({ postId: post.id }))}
        />

        <ActionButton
          icon={Bookmark}
          active={post.isBookmarked}
          activeClassName="text-primary"
          label={post.isBookmarked ? "Remove bookmark" : "Save"}
          disabled={bookmarkMutation.isPending || unbookmarkMutation.isPending}
          onClick={() => (post.isBookmarked ? unbookmarkMutation.mutate(post.id) : bookmarkMutation.mutate(post.id))}
        />

        <ActionButton icon={copied ? Check : Share} label="Copy link" onClick={handleShare} />
      </div>
    </div>
  );
}
