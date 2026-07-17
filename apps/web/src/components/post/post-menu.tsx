"use client";

import * as React from "react";
import { MoreHorizontal, Pencil, Trash2, Pin, PinOff } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useDeletePost, usePinPost, useUnpinPost } from "@/hooks/use-posts";
import type { PostDTO } from "@connecthub/shared-types";

export function PostMenu({ post, onEdit }: { post: PostDTO; onEdit: () => void }) {
  const deleteMutation = useDeletePost();
  const pinMutation = usePinPost();
  const unpinMutation = useUnpinPost();
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);

  return (
    <DropdownMenu onOpenChange={(open) => !open && setConfirmingDelete(false)}>
      <DropdownMenuTrigger className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="h-4 w-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => (post.isPinned ? unpinMutation.mutate(post.id) : pinMutation.mutate(post.id))}>
          {post.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          {post.isPinned ? "Unpin from profile" : "Pin to profile"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {confirmingDelete ? (
          <DropdownMenuItem
            onClick={() => deleteMutation.mutate(post.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4" /> Confirm delete
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault();
              setConfirmingDelete(true);
            }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
