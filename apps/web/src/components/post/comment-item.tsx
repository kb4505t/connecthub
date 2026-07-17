"use client";

import * as React from "react";
import Link from "next/link";
import { BadgeCheck, MessageCircle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ReactionPicker } from "@/components/post/reaction-picker";
import { CommentComposer } from "@/components/post/comment-composer";
import {
  useReplies,
  useUpdateComment,
  useDeleteComment,
  useReactToComment,
  useRemoveCommentReaction,
  useCreateComment,
} from "@/hooks/use-comments";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/time";
import type { CommentDTO } from "@connecthub/shared-types";

interface CommentItemProps {
  comment: CommentDTO;
  postId: string;
  /** The top-level ancestor's id — all replies attach here, flattening the thread to two visual levels even though the schema supports deeper nesting. */
  rootId: string;
  isReply?: boolean;
}

export function CommentItem({ comment, postId, rootId, isReply }: CommentItemProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editContent, setEditContent] = React.useState(comment.content);
  const [showReplyBox, setShowReplyBox] = React.useState(false);
  const [showReplies, setShowReplies] = React.useState(false);

  const updateMutation = useUpdateComment(postId, isReply ? rootId : null);
  const deleteMutation = useDeleteComment(postId, isReply ? rootId : null);
  const reactMutation = useReactToComment(postId, isReply ? rootId : null);
  const unreactMutation = useRemoveCommentReaction(postId, isReply ? rootId : null);
  const replyMutation = useCreateComment(postId);
  const repliesQuery = useReplies(comment.id, showReplies && !isReply);

  const initials = (comment.author.fullName ?? comment.author.username).slice(0, 2).toUpperCase();

  const handleReaction = (emoji: string) => {
    if (comment.viewerReaction === emoji) {
      unreactMutation.mutate(comment.id);
    } else {
      reactMutation.mutate({ commentId: comment.id, emoji });
    }
  };

  const replies = repliesQuery.data?.pages.flatMap((p) => p.data.items) ?? [];

  return (
    <div className="flex gap-2">
      <Avatar className={cn("shrink-0", isReply ? "h-7 w-7" : "h-8 w-8")}>
        <AvatarImage src={comment.author.avatarUrl ?? undefined} alt={comment.author.username} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="bg-secondary rounded-2xl px-3 py-2 inline-block max-w-full">
          <div className="flex items-center gap-1">
            <Link href={`/profile/${comment.author.username}`} className="font-medium text-xs hover:underline">
              {comment.author.fullName ?? comment.author.username}
            </Link>
            {comment.author.isVerified && <BadgeCheck className="h-3 w-3 text-primary fill-primary/20" />}
          </div>

          {isEditing ? (
            <div className="mt-1">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={2}
                className="text-sm bg-background"
              />
              <div className="flex gap-2 mt-1.5">
                <Button
                  size="sm"
                  isLoading={updateMutation.isPending}
                  onClick={() =>
                    updateMutation.mutate({ commentId: comment.id, content: editContent }, { onSuccess: () => setIsEditing(false) })
                  }
                >
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>
          )}
        </div>

        <div className="flex items-center gap-3 mt-1 ml-3 text-xs text-muted-foreground">
          <span>{timeAgo(comment.createdAt)}</span>
          {comment.isEdited && <span>edited</span>}
          <ReactionPicker onSelect={handleReaction} />
          {comment.totalReactionsCount > 0 && (
            <span className="flex items-center gap-0.5">
              {comment.reactions.map((r) => (
                <span key={r.emoji}>
                  {r.emoji}
                  {r.count > 1 && r.count}
                </span>
              ))}
            </span>
          )}
          {!isReply && (
            <button type="button" onClick={() => setShowReplyBox((v) => !v)} className="hover:text-foreground flex items-center gap-1">
              <MessageCircle className="h-3 w-3" /> Reply
            </button>
          )}
          {comment.isOwnComment && (
            <DropdownMenu>
              <DropdownMenuTrigger className="hover:text-foreground">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => deleteMutation.mutate(comment.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {!isReply && comment.repliesCount > 0 && !showReplies && (
          <button
            type="button"
            onClick={() => setShowReplies(true)}
            className="text-xs text-muted-foreground hover:text-foreground mt-1.5 ml-3"
          >
            View {comment.repliesCount} {comment.repliesCount === 1 ? "reply" : "replies"}
          </button>
        )}

        {showReplies && replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} postId={postId} rootId={comment.id} isReply />
            ))}
          </div>
        )}

        {showReplyBox && (
          <div className="mt-2 ml-1">
            <CommentComposer
              placeholder={`Reply to ${comment.author.username}...`}
              autoFocus
              isSubmitting={replyMutation.isPending}
              onCancel={() => setShowReplyBox(false)}
              onSubmit={(content) => {
                replyMutation.mutate(
                  { content, parentId: comment.id },
                  {
                    onSuccess: () => {
                      setShowReplyBox(false);
                      setShowReplies(true);
                    },
                  }
                );
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
