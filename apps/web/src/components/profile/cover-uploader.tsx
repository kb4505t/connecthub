"use client";

import * as React from "react";
import { Camera, Loader2 } from "lucide-react";
import { useUploadCoverImage, useProfile } from "@/hooks/use-profile";
import { useAuthStore } from "@/store/auth-store";

export function CoverUploader() {
  const user = useAuthStore((s) => s.user);
  const { data: profile } = useProfile(user?.username);
  const uploadMutation = useUploadCoverImage();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    uploadMutation.mutate(file, {
      onSettled: () => setPreview(null),
    });
  };

  const coverUrl = preview ?? profile?.coverImageUrl;

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative group w-full h-32 rounded-xl overflow-hidden bg-gradient-to-br from-primary/30 via-accent/40 to-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Change cover image"
      >
        {coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-sm font-medium">
          {uploadMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
          Change cover
        </div>
      </button>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFileChange} />
      {uploadMutation.isError && <p className="text-xs text-destructive mt-2">Upload failed. Try a smaller image.</p>}
    </div>
  );
}
