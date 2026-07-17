"use client";

import { useAuthStore } from "@/store/auth-store";
import { useProfile, useUpdatePrivacy } from "@/hooks/use-profile";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export default function PrivacySettingsPage() {
  const user = useAuthStore((s) => s.user);
  const { data: profile, isLoading } = useProfile(user?.username);
  const updatePrivacyMutation = useUpdatePrivacy();

  if (isLoading || !profile) {
    return <Skeleton className="h-16 w-full" />;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="pr-6">
          <Label htmlFor="private-account" className="text-base">
            Private account
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            When your account is private, only your followers can see your posts. Your profile info and follower counts stay visible.
          </p>
        </div>
        <Switch
          id="private-account"
          checked={profile.isPrivate}
          onCheckedChange={(checked) => updatePrivacyMutation.mutate(checked)}
          disabled={updatePrivacyMutation.isPending}
        />
      </div>
    </div>
  );
}
