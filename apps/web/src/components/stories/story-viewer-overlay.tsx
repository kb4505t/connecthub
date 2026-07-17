"use client";

import * as React from "react";
import { X, Trash2, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/time";
import { useMarkStoryViewed, useDeleteStory, useStoryViewers } from "@/hooks/use-stories";
import type { StoryGroupDTO } from "@connecthub/shared-types";

const IMAGE_DURATION_MS = 5000;
const PROGRESS_TICK_MS = 50;
const TAP_VS_HOLD_THRESHOLD_MS = 200;

interface StoryViewerOverlayProps {
  groups: StoryGroupDTO[];
  initialGroupIndex: number;
  currentUserId: string;
  onClose: () => void;
}

export function StoryViewerOverlay({ groups, initialGroupIndex, currentUserId, onClose }: StoryViewerOverlayProps) {
  const [groupIndex, setGroupIndex] = React.useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const [showViewers, setShowViewers] = React.useState(false);

  const markViewed = useMarkStoryViewed();
  const deleteStory = useDeleteStory();
  const viewedIdsRef = React.useRef<Set<string>>(new Set());
  const pointerDownAtRef = React.useRef(0);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const group = groups[groupIndex];
  const story = group?.stories[storyIndex];
  const isOwn = story?.author.id === currentUserId;
  const isVideo = story?.mediaType === "VIDEO";

  const goNext = React.useCallback(() => {
    setShowViewers(false);
    if (storyIndex < group.stories.length - 1) {
      setStoryIndex((i) => i + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex((i) => i + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  }, [group, groupIndex, groups.length, onClose, storyIndex]);

  const goPrev = React.useCallback(() => {
    setShowViewers(false);
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
    } else if (groupIndex > 0) {
      const prevGroup = groups[groupIndex - 1];
      setGroupIndex((i) => i - 1);
      setStoryIndex(prevGroup.stories.length - 1);
    }
  }, [groupIndex, groups, storyIndex]);

  // Reset progress whenever the active story changes, and mark it viewed once.
  React.useEffect(() => {
    setProgress(0);
    if (!story) return;
    if (!isOwn && !viewedIdsRef.current.has(story.id)) {
      viewedIdsRef.current.add(story.id);
      markViewed.mutate(story.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  // Image auto-advance: a fixed-duration progress tick. Video drives its own progress via timeupdate below.
  React.useEffect(() => {
    if (!story || isVideo || isPaused || showViewers) return;
    const interval = setInterval(() => {
      setProgress((p) => {
        const next = p + (PROGRESS_TICK_MS / IMAGE_DURATION_MS) * 100;
        if (next >= 100) {
          goNext();
          return 100;
        }
        return next;
      });
    }, PROGRESS_TICK_MS);
    return () => clearInterval(interval);
  }, [story, isVideo, isPaused, showViewers, goNext]);

  React.useEffect(() => {
    if (!isVideo) return;
    const video = videoRef.current;
    if (!video) return;
    if (isPaused || showViewers) {
      video.pause();
      return;
    }
    video.play().catch(() => {});

    function handleTimeUpdate() {
      if (!video!.duration) return;
      setProgress((video!.currentTime / video!.duration) * 100);
    }
    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [isVideo, isPaused, showViewers, story?.id]);

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev, onClose]);

  if (!group || !story) return null;

  const handlePointerDown = () => {
    pointerDownAtRef.current = Date.now();
    setIsPaused(true);
  };

  const handlePointerUp = (side: "left" | "right") => {
    const held = Date.now() - pointerDownAtRef.current;
    setIsPaused(false);
    if (held < TAP_VS_HOLD_THRESHOLD_MS) {
      if (side === "left") goPrev();
      else goNext();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 animate-fade-in">
      <div className="relative flex h-full w-full max-w-md flex-col overflow-hidden sm:h-[95vh] sm:rounded-2xl">
        <div className="absolute inset-x-3 top-3 z-20 flex gap-1">
          {group.stories.map((s, i) => (
            <div key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: (i < storyIndex ? 100 : i === storyIndex ? progress : 0) + "%" }}
              />
            </div>
          ))}
        </div>

        <div className="absolute inset-x-3 top-7 z-20 flex items-center gap-2">
          <Avatar className="h-8 w-8 border border-white/40">
            <AvatarImage src={group.author.avatarUrl ?? undefined} alt={group.author.username} />
            <AvatarFallback className="text-xs">{group.author.username.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-white">{group.author.fullName ?? group.author.username}</span>
          <span className="text-xs text-white/70">{timeAgo(story.createdAt)}</span>
          <div className="ml-auto flex items-center gap-1">
            {isOwn && (
              <button
                type="button"
                onClick={() => deleteStory.mutate(story.id, { onSuccess: goNext })}
                aria-label="Delete story"
                className="rounded-full p-1.5 text-white/90 hover:bg-white/10"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-white/90 hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="relative flex flex-1 items-center justify-center bg-black">
          {isVideo ? (
            <video ref={videoRef} src={story.mediaUrl} className="max-h-full max-w-full" playsInline autoPlay onEnded={goNext} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={story.mediaUrl} alt="Story" className="max-h-full max-w-full object-contain" />
          )}

          <button
            type="button"
            aria-label="Previous story"
            className="absolute inset-y-0 left-0 w-1/3"
            onPointerDown={handlePointerDown}
            onPointerUp={() => handlePointerUp("left")}
          />
          <button
            type="button"
            aria-label="Next story"
            className="absolute inset-y-0 right-0 w-2/3"
            onPointerDown={handlePointerDown}
            onPointerUp={() => handlePointerUp("right")}
          />

          {groupIndex > 0 && <ChevronLeft className="pointer-events-none absolute left-2 hidden h-8 w-8 text-white/50 sm:block" />}
          {groupIndex < groups.length - 1 && (
            <ChevronRight className="pointer-events-none absolute right-2 hidden h-8 w-8 text-white/50 sm:block" />
          )}
        </div>

        {isOwn && (
          <div className="relative z-20 bg-black">
            <button
              type="button"
              onClick={() => setShowViewers((v) => !v)}
              className="flex w-full items-center justify-center gap-1.5 py-3 text-sm text-white/80 hover:text-white"
            >
              <Eye className="h-4 w-4" /> {story.viewCount} {story.viewCount === 1 ? "view" : "views"}
            </button>
            {showViewers && <StoryViewersPanel storyId={story.id} />}
          </div>
        )}
      </div>
    </div>
  );
}

function StoryViewersPanel({ storyId }: { storyId: string }) {
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useStoryViewers(storyId);
  const viewers = data?.pages.flatMap((p) => p.data.items) ?? [];

  return (
    <div className="max-h-52 overflow-y-auto border-t border-white/10 bg-black px-4 py-2">
      {isLoading ? (
        <div className="space-y-2 py-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full bg-white/10" />
          ))}
        </div>
      ) : viewers.length === 0 ? (
        <p className="py-3 text-center text-sm text-white/60">No views yet</p>
      ) : (
        <div className="space-y-2 py-2">
          {viewers.map(({ viewer, viewedAt }) => (
            <div key={viewer.id} className="flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={viewer.avatarUrl ?? undefined} alt={viewer.username} />
                <AvatarFallback className="text-[10px]">{viewer.username.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-white">{viewer.fullName ?? viewer.username}</span>
              <span className="ml-auto text-xs text-white/50">{timeAgo(viewedAt)}</span>
            </div>
          ))}
          {hasNextPage && (
            <button
              type="button"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="w-full py-1.5 text-center text-xs text-white/60 hover:text-white"
            >
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
