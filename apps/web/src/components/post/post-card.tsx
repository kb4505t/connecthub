"use client";

import * as React from "react";
import Link from "next/link";
import { BadgeCheck, Pin, Repeat2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MediaGrid } from "@/components/post/media-grid";
import { PollDisplay } from "@/components/post/poll-display";
import { PostActions } from "@/components/post/post-actions";
import { PostMenu } from "@/components/post/post-menu";
import { EditPostDialog } from "@/components/post/edit-post-dialog";
import { PostContent } from "@/components/post/post-content";
import { timeAgo } from "@/lib/time";
import type { PostDTO } from "@connecthub/shared-types";


function PostBody({ post }: { post: PostDTO }) {
  const [editOpen, setEditOpen] = React.useState(false);

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-start justify-between">
        <Link href={`/profile/${post.author.username}`} className="flex items-center gap-1.5 min-w-0 hover:underline">
          <span className="font-medium text-sm truncate">{post.author.fullName ?? post.author.username}</span>
          {post.author.isVerified && <BadgeCheck className="h-3.5 w-3.5 text-primary fill-primary/20 shrink-0" />}
          <span className="text-sm text-muted-foreground truncate">@{post.author.username}</span>
          <span className="text-sm text-muted-foreground shrink-0">· {timeAgo(post.publishedAt ?? post.createdAt)}</span>
        </Link>

        <div className="flex items-center gap-1 shrink-0">
          {post.isPinned && <Pin className="h-3.5 w-3.5 text-muted-foreground" aria-label="Pinned" />}
          {post.isOwnPost && <PostMenu post={post} onEdit={() => setEditOpen(true)} />}
        </div>
      </div>

      {post.content && <PostContent content={post.content} className="text-sm mt-1 whitespace-pre-wrap break-words" />}
      {post.isEdited && <span className="text-xs text-muted-foreground">(edited)</span>}

      <MediaGrid media={post.media} />
      {post.poll && <PollDisplay poll={post.poll} />}

      <PostActions post={post} />

      {post.isOwnPost && <EditPostDialog post={post} open={editOpen} onOpenChange={setEditOpen} />}
    </div>
  );
}

export function PostCard({ post }: { post: PostDTO }) {
  // A repost with no added commentary renders as: small "X reposted" header, then the original post's full card.
  if (post.originalPost && !post.content) {
    return (
      <div className="glass-card p-4">
        <Link
          href={`/profile/${post.author.username}`}
          className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2 hover:underline"
        >
          <Repeat2 className="h-3.5 w-3.5" />
          {post.author.fullName ?? post.author.username} reposted
        </Link>
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={post.originalPost.author.avatarUrl ?? undefined} alt={post.originalPost.author.username} />
            <AvatarFallback>{(post.originalPost.author.fullName ?? post.originalPost.author.username).slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <PostBody post={post.originalPost} />
        </div>
      </div>
    );
  }

  // A quote-repost (has its own commentary) renders as: full card, with the original embedded as a nested preview.
  return (
    <div className="glass-card p-4">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={post.author.avatarUrl ?? undefined} alt={post.author.username} />
          <AvatarFallback>{(post.author.fullName ?? post.author.username).slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <PostBody post={post} />
      </div>

      {post.originalPost && (
        <div className="mt-3 ml-[52px] rounded-xl border p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="font-medium text-xs">{post.originalPost.author.fullName ?? post.originalPost.author.username}</span>
            <span className="text-xs text-muted-foreground">@{post.originalPost.author.username}</span>
          </div>
          {post.originalPost.content && <PostContent content={post.originalPost.content} className="text-xs whitespace-pre-wrap break-words" />}
          <MediaGrid media={post.originalPost.media} />
        </div>
      )}
    </div>
  );
}
