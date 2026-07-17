"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, Calendar, LinkIcon, MapPin, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FollowButton } from "@/components/profile/follow-button";
import { useStartDirectConversation } from "@/hooks/use-messages";
import type { UserProfile } from "@connecthub/shared-types";

export function ProfileHeader({ profile }: { profile: UserProfile }) {
  const router = useRouter();
  const startDirect = useStartDirectConversation();
  const initials = (profile.fullName ?? profile.username).slice(0, 2).toUpperCase();
  const joinedDate = new Date(profile.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const handleMessage = async () => {
    const res = await startDirect.mutateAsync(profile.username);
    router.push(`/messages/${res.data.conversation.id}`);
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="h-40 sm:h-56 bg-gradient-to-br from-primary/30 via-accent/40 to-primary/10 relative">
        {profile.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.coverImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
      </div>

      <div className="px-6 pb-6">
        <div className="flex items-end justify-between -mt-12 mb-4">
          <Avatar className="h-24 w-24 border-4 border-card">
            <AvatarImage src={profile.avatarUrl ?? undefined} alt={profile.username} />
            <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
          </Avatar>

          {profile.isOwnProfile ? (
            <Button variant="outline" asChild>
              <Link href="/settings/profile">Edit profile</Link>
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="default" onClick={handleMessage} isLoading={startDirect.isPending} aria-label="Message">
                <MessageCircle className="h-4 w-4" />
              </Button>
              <FollowButton username={profile.username} isFollowing={profile.isFollowing} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <h1 className="text-xl font-bold">{profile.fullName ?? profile.username}</h1>
          {profile.isVerified && <BadgeCheck className="h-5 w-5 text-primary fill-primary/20" aria-label="Verified" />}
        </div>
        <p className="text-muted-foreground text-sm mb-3">@{profile.username}</p>

        {profile.bio && <p className="text-sm mb-3 whitespace-pre-wrap">{profile.bio}</p>}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-4">
          {profile.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {profile.location}
            </span>
          )}
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <LinkIcon className="h-3.5 w-3.5" /> {profile.website.replace(/^https?:\/\//, "")}
            </a>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> Joined {joinedDate}
          </span>
        </div>

        <div className="flex gap-5 text-sm">
          <Link href={`/profile/${profile.username}/following`} className="hover:underline">
            <span className="font-semibold">{profile.followingCount}</span>{" "}
            <span className="text-muted-foreground">Following</span>
          </Link>
          <Link href={`/profile/${profile.username}/followers`} className="hover:underline">
            <span className="font-semibold">{profile.followersCount}</span>{" "}
            <span className="text-muted-foreground">Followers</span>
          </Link>
          <span>
            <span className="font-semibold">{profile.postsCount}</span> <span className="text-muted-foreground">Posts</span>
          </span>
        </div>
      </div>
    </div>
  );
}
