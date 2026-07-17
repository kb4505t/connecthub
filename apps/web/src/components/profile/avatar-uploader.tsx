"use client";

import * as React from "react";
import { Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUploadAvatar } from "@/hooks/use-profile";
import { useAuthStore } from "@/store/auth-store";

export function AvatarUploader() {
  const user = useAuthStore((s) => s.user);
  const uploadMutation = useUploadAvatar();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<string | null>(null);

  if (!user) return null;
  const initials = (user.fullName ?? user.username).slice(0, 2).toUpperCase();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    uploadMutation.mutate(file, {
      onSettled: () => setPreview(null),
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative group rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Change avatar"
      >
        <Avatar className="h-20 w-20">
          <AvatarImage src={preview ?? user.avatarUrl ?? undefined} alt={user.username} />
          <AvatarFallback className="text-xl">{initials}</AvatarFallback>
        </Avatar>
        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {uploadMutation.isPending ? (
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          ) : (
            <Camera className="h-5 w-5 text-white" />
          )}
        </div>
      </button>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFileChange} />
      {uploadMutation.isError && <p className="text-xs text-destructive mt-2">Upload failed. Try a smaller image.</p>}
    </div>
  );
}
