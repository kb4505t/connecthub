"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useUpdatePost } from "@/hooks/use-posts";
import type { PostDTO } from "@connecthub/shared-types";

export function EditPostDialog({ post, open, onOpenChange }: { post: PostDTO; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [content, setContent] = React.useState(post.content ?? "");
  const updateMutation = useUpdatePost(post.id);

  React.useEffect(() => {
    if (open) setContent(post.content ?? "");
  }, [open, post.content]);

  const handleSave = () => {
    updateMutation.mutate({ content }, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit post</DialogTitle>
        </DialogHeader>
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} maxLength={10000} />
        <p className="text-xs text-muted-foreground mt-1">Note: media and polls can't be changed after posting.</p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} isLoading={updateMutation.isPending}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
