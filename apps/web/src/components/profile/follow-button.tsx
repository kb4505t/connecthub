"use client";

import { Button } from "@/components/ui/button";
import { useFollowUser, useUnfollowUser } from "@/hooks/use-profile";

export function FollowButton({ username, isFollowing }: { username: string; isFollowing: boolean }) {
  const followMutation = useFollowUser(username);
  const unfollowMutation = useUnfollowUser(username);
  const isPending = followMutation.isPending || unfollowMutation.isPending;

  if (isFollowing) {
    return (
      <Button variant="outline" onClick={() => unfollowMutation.mutate()} isLoading={isPending} className="min-w-[110px]">
        Following
      </Button>
    );
  }

  return (
    <Button onClick={() => followMutation.mutate()} isLoading={isPending} className="min-w-[110px]">
      Follow
    </Button>
  );
}
