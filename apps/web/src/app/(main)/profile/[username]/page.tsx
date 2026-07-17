"use client";

import { useParams } from "next/navigation";
import { Lock, FileText } from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import { useProfilePosts } from "@/hooks/use-posts";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileHeaderSkeleton } from "@/components/profile/profile-header-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PostList } from "@/components/post/post-list";

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { data: profile, isLoading, isError } = useProfile(username);
  const canViewPosts = profile ? profile.isOwnProfile || !profile.isPrivate || profile.isFollowing : false;
  const postsQuery = useProfilePosts(canViewPosts ? username : undefined);

  if (isLoading) return <ProfileHeaderSkeleton />;

  if (isError || !profile) {
    return <EmptyState icon={FileText} title="User not found" description="This profile doesn't exist or was removed." />;
  }

  return (
    <div className="space-y-6">
      <ProfileHeader profile={profile} />

      {canViewPosts ? (
        <PostList
          data={postsQuery.data}
          isLoading={postsQuery.isLoading}
          hasNextPage={postsQuery.hasNextPage}
          isFetchingNextPage={postsQuery.isFetchingNextPage}
          onLoadMore={() => postsQuery.fetchNextPage()}
          emptyTitle="No posts yet"
          emptyDescription={profile.isOwnProfile ? "Share your first post to get started." : `@${profile.username} hasn't posted yet.`}
        />
      ) : (
        <div className="glass-card">
          <EmptyState icon={Lock} title="This account is private" description={`Follow @${profile.username} to see their posts.`} />
        </div>
      )}
    </div>
  );
}
