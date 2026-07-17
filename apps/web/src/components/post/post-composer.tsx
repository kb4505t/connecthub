"use client";

import * as React from "react";
import { Image as ImageIcon, BarChart3, Clock, X, Globe, Users, Lock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { useAuthStore } from "@/store/auth-store";
import { useCreatePost } from "@/hooks/use-posts";

const MAX_CONTENT_LENGTH = 10000;
const MAX_FILES = 10;

type Visibility = "PUBLIC" | "FOLLOWERS" | "PRIVATE";

const VISIBILITY_OPTIONS: { value: Visibility; label: string; icon: React.ElementType }[] = [
  { value: "PUBLIC", label: "Public", icon: Globe },
  { value: "FOLLOWERS", label: "Followers only", icon: Users },
  { value: "PRIVATE", label: "Only me", icon: Lock },
];

export function PostComposer() {
  const user = useAuthStore((s) => s.user);
  const createPostMutation = useCreatePost();

  const [content, setContent] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [previews, setPreviews] = React.useState<string[]>([]);
  const [visibility, setVisibility] = React.useState<Visibility>("PUBLIC");
  const [showPollBuilder, setShowPollBuilder] = React.useState(false);
  const [pollOptions, setPollOptions] = React.useState(["", ""]);
  const [pollDurationHours, setPollDurationHours] = React.useState(24);
  const [showSchedule, setShowSchedule] = React.useState(false);
  const [scheduledFor, setScheduledFor] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!user) return null;
  const initials = (user.fullName ?? user.username).slice(0, 2).toUpperCase();

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    const combined = [...files, ...selected].slice(0, MAX_FILES);
    setFiles(combined);
    setPreviews(combined.map((f) => URL.createObjectURL(f)));
    setShowPollBuilder(false); // media and polls are mutually exclusive
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const togglePollBuilder = () => {
    setShowPollBuilder((prev) => !prev);
    if (!showPollBuilder) {
      setFiles([]);
      setPreviews([]);
    }
  };

  const updatePollOption = (index: number, value: string) => {
    setPollOptions((prev) => prev.map((opt, i) => (i === index ? value : opt)));
  };

  const addPollOption = () => setPollOptions((prev) => (prev.length < 4 ? [...prev, ""] : prev));
  const removePollOption = (index: number) => setPollOptions((prev) => prev.filter((_, i) => i !== index));

  const trimmedContent = content.trim();
  const validPollOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
  const canSubmit =
    (trimmedContent.length > 0 || files.length > 0 || (showPollBuilder && validPollOptions.length >= 2)) &&
    content.length <= MAX_CONTENT_LENGTH;

  const resetForm = () => {
    setContent("");
    setFiles([]);
    setPreviews([]);
    setShowPollBuilder(false);
    setPollOptions(["", ""]);
    setShowSchedule(false);
    setScheduledFor("");
    setVisibility("PUBLIC");
  };

  const handleSubmit = () => {
    const formData = new FormData();
    if (trimmedContent) formData.append("content", trimmedContent);
    formData.append("visibility", visibility);
    files.forEach((file) => formData.append("media", file));
    if (showPollBuilder && validPollOptions.length >= 2) {
      validPollOptions.forEach((opt) => formData.append("pollOptions[]", opt));
      formData.append("pollDurationHours", String(pollDurationHours));
    }
    if (showSchedule && scheduledFor) {
      formData.append("scheduledFor", new Date(scheduledFor).toISOString());
    }

    createPostMutation.mutate(formData, { onSuccess: resetForm });
  };

  return (
    <div className="glass-card p-4">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={user.avatarUrl ?? undefined} alt={user.username} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's happening?"
            rows={3}
            className="border-none shadow-none px-0 py-0 min-h-0 focus-visible:ring-0 resize-none text-base"
          />

          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {previews.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-secondary">
                  {files[i]?.type.startsWith("video") ? (
                    <video src={src} className="h-full w-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute top-1 right-1 bg-black/60 rounded-full p-1 text-white hover:bg-black/80"
                    aria-label="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {showPollBuilder && (
            <div className="mt-3 space-y-2 rounded-xl border p-3">
              {pollOptions.map((option, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={option}
                    onChange={(e) => updatePollOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    maxLength={80}
                    className="flex-1 h-9 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  {pollOptions.length > 2 && (
                    <button type="button" onClick={() => removePollOption(i)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 4 && (
                <button type="button" onClick={addPollOption} className="text-sm text-primary hover:underline">
                  + Add option
                </button>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
                <Clock className="h-3.5 w-3.5" />
                Poll runs for
                <select
                  value={pollDurationHours}
                  onChange={(e) => setPollDurationHours(Number(e.target.value))}
                  className="rounded-lg border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value={1}>1 hour</option>
                  <option value={24}>1 day</option>
                  <option value={72}>3 days</option>
                  <option value={168}>7 days</option>
                </select>
              </div>
            </div>
          )}

          {showSchedule && (
            <div className="mt-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                type="datetime-local"
                value={scheduledFor}
                min={new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)}
                onChange={(e) => setScheduledFor(e.target.value)}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          )}

          <FormAlert message={createPostMutation.isError ? "Couldn't create post. Please try again." : null} />

          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={showPollBuilder || files.length >= MAX_FILES}
                className="rounded-lg p-2 text-primary hover:bg-secondary transition-colors disabled:opacity-40"
                aria-label="Add media"
              >
                <ImageIcon className="h-5 w-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                multiple
                className="hidden"
                onChange={handleFilesSelected}
              />

              <button
                type="button"
                onClick={togglePollBuilder}
                disabled={files.length > 0}
                className="rounded-lg p-2 text-primary hover:bg-secondary transition-colors disabled:opacity-40"
                aria-label="Add poll"
              >
                <BarChart3 className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => setShowSchedule((prev) => !prev)}
                className="rounded-lg p-2 text-primary hover:bg-secondary transition-colors"
                aria-label="Schedule post"
              >
                <Clock className="h-5 w-5" />
              </button>

              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as Visibility)}
                className="ml-1 h-8 rounded-lg border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Post visibility"
              >
                {VISIBILITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {content.length}/{MAX_CONTENT_LENGTH}
              </span>
              <Button size="sm" disabled={!canSubmit} isLoading={createPostMutation.isPending} onClick={handleSubmit}>
                {showSchedule && scheduledFor ? "Schedule" : "Post"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
