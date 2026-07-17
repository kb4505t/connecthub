"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/auth-store";
import { useStoryFeed, useCreateStory } from "@/hooks/use-stories";
import { StoryViewerOverlay } from "@/components/stories/story-viewer-overlay";
import { cn } from "@/lib/utils";
import type { StoryGroupDTO } from "@connecthub/shared-types";

export function StoryBar() {
  const user = useAuthStore((s) => s.user);
  const { data: groups, isLoading } = useStoryFeed();
  const createStory = useCreateStory();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [activeGroupIndex, setActiveGroupIndex] = React.useState<number | null>(null);

  if (!user) return null;

  const ownGroup = groups?.find((g) => g.author.id === user.id);
  const otherGroups = groups?.filter((g) => g.author.id !== user.id) ?? [];

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const formData = new FormData();
    formData.append("media", file);
    createStory.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex shrink-0 flex-col items-center gap-1.5">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-2.5 w-12" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={handleFileSelected}
        />

        <button
          type="button"
          className="flex shrink-0 flex-col items-center gap-1.5"
          onClick={() => (ownGroup ? setActiveGroupIndex(0) : fileInputRef.current?.click())}
        >
          <div className="relative">
            <Avatar
              className={cn(
                "h-16 w-16 border-2",
                ownGroup ? (ownGroup.hasUnseen ? "border-primary" : "border-border") : "border-transparent"
              )}
            >
              <AvatarImage src={user.avatarUrl ?? undefined} alt={user.username} />
              <AvatarFallback>{(user.fullName ?? user.username).slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              aria-label="Add to story"
              className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-card"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
          <span className="max-w-[4.5rem] truncate text-xs text-muted-foreground">Your story</span>
        </button>

        {otherGroups.map((group, i) => (
          <button
            key={group.author.id}
            type="button"
            className="flex shrink-0 flex-col items-center gap-1.5"
            onClick={() => setActiveGroupIndex((ownGroup ? 1 : 0) + i)}
          >
            <Avatar className={cn("h-16 w-16 border-2", group.hasUnseen ? "border-primary" : "border-border")}>
              <AvatarImage src={group.author.avatarUrl ?? undefined} alt={group.author.username} />
              <AvatarFallback>{(group.author.fullName ?? group.author.username).slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="max-w-[4.5rem] truncate text-xs">{group.author.fullName ?? group.author.username}</span>
          </button>
        ))}
      </div>

      {activeGroupIndex !== null && (
        <StoryViewerOverlay
          groups={[...(ownGroup ? [ownGroup] : []), ...otherGroups] as StoryGroupDTO[]}
          initialGroupIndex={activeGroupIndex}
          currentUserId={user.id}
          onClose={() => setActiveGroupIndex(null)}
        />
      )}
    </>
  );
}
