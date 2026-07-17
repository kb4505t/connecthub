"use client";

import Link from "next/link";

// Mirrors the API's extraction regexes (apps/api/src/utils/textParsing.ts) closely
// enough for display purposes — this only needs to find spans to linkify, not to
// decide what actually got persisted as a hashtag/mention server-side.
const TOKEN_REGEX = /(#[a-zA-Z0-9_]{1,50}|(?<![a-zA-Z0-9_])@[a-zA-Z0-9_.]{3,30})/g;

/** Renders post/comment text with #hashtags and @mentions as clickable links, everything else as plain text. */
export function PostContent({ content, className }: { content: string; className?: string }) {
  const parts = content.split(TOKEN_REGEX);

  return (
    <p className={className}>
      {parts.map((part, i) => {
        if (part.startsWith("#")) {
          return (
            <Link key={i} href={`/hashtag/${part.slice(1).toLowerCase()}`} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
              {part}
            </Link>
          );
        }
        if (part.startsWith("@")) {
          return (
            <Link key={i} href={`/profile/${part.slice(1)}`} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
              {part}
            </Link>
          );
        }
        return part;
      })}
    </p>
  );
}
