"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateProfileSchema, type UpdateProfileInput } from "@connecthub/shared-types";
import { useAuthStore } from "@/store/auth-store";
import { useUpdateProfile } from "@/hooks/use-profile";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { FormAlert } from "@/components/ui/form-alert";
import { AvatarUploader } from "@/components/profile/avatar-uploader";
import { CoverUploader } from "@/components/profile/cover-uploader";

export default function ProfileSettingsPage() {
  const user = useAuthStore((s) => s.user);
  const updateProfileMutation = useUpdateProfile();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { fullName: user?.fullName ?? "", bio: "", website: "", location: "" },
  });

  const bioValue = watch("bio") ?? "";

  const onSubmit = (data: UpdateProfileInput) => {
    updateProfileMutation.mutate(data, { onSuccess: () => reset(data) });
  };

  const apiError = updateProfileMutation.error instanceof ApiError ? updateProfileMutation.error.message : null;

  if (!user) return null;

  return (
    <div className="space-y-8">
      <div>
        <Label className="mb-2 block">Cover image</Label>
        <CoverUploader />
        <div className="mt-4">
          <Label className="mb-2 block">Avatar</Label>
          <AvatarUploader />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormAlert message={apiError} />

        <div>
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" className="mt-1.5" invalid={!!errors.fullName} {...register("fullName")} />
          <FieldError message={errors.fullName?.message} />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="bio">Bio</Label>
            <span className="text-xs text-muted-foreground">{bioValue.length}/280</span>
          </div>
          <Textarea id="bio" className="mt-1.5" invalid={!!errors.bio} {...register("bio")} />
          <FieldError message={errors.bio?.message} />
        </div>

        <div>
          <Label htmlFor="website">Website</Label>
          <Input id="website" className="mt-1.5" placeholder="https://" invalid={!!errors.website} {...register("website")} />
          <FieldError message={errors.website?.message} />
        </div>

        <div>
          <Label htmlFor="location">Location</Label>
          <Input id="location" className="mt-1.5" invalid={!!errors.location} {...register("location")} />
          <FieldError message={errors.location?.message} />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" isLoading={updateProfileMutation.isPending} disabled={!isDirty}>
            Save changes
          </Button>
          {updateProfileMutation.isSuccess && <span className="text-sm text-muted-foreground">Saved ✓</span>}
        </div>
      </form>
    </div>
  );
}
