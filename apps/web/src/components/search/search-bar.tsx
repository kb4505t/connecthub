"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, BadgeCheck, Hash } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSearchPreview } from "@/hooks/use-search";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";

export function SearchBar() {
  const [query, setQuery] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const router = useRouter();

  const debouncedQuery = useDebouncedValue(query, 300);
  const { data, isLoading } = useSearchPreview(debouncedQuery);

  // Close the dropdown on outside click — a plain input isn't a Radix
  // trigger, so this replaces the auto-close a dropdown-menu component
  // would normally give for free.
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function goToFullResults() {
    const trimmed = query.trim();
    if (!trimmed) return;
    setIsOpen(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  const hasQuery = debouncedQuery.trim().length > 0;
  const hasResults = !!data && (data.users.length > 0 || data.posts.length > 0 || data.hashtags.length > 0);

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => e.key === "Enter" && goToFullResults()}
          placeholder="Search ConnectHub"
          className="h-10 pl-9"
        />
      </div>

      {isOpen && hasQuery && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[28rem] overflow-y-auto rounded-xl border bg-card shadow-lg">
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Searching…</div>
          ) : !hasResults ? (
            <div className="p-4 text-sm text-muted-foreground">No results for &quot;{debouncedQuery}&quot;</div>
          ) : (
            <div className="divide-y divide-border">
              {data!.users.length > 0 && (
                <div className="p-2">
                  <p className="px-2 py-1 text-xs font-medium text-muted-foreground">People</p>
                  {data!.users.map((user) => (
                    <Link
                      key={user.id}
                      href={`/profile/${user.username}`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg p-2 hover:bg-secondary/50"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarUrl ?? undefined} alt={user.username} />
                        <AvatarFallback>{(user.fullName ?? user.username).slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="truncate text-sm font-medium">{user.fullName ?? user.username}</p>
                          {user.isVerified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 fill-primary/20 text-primary" />}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {data!.hashtags.length > 0 && (
                <div className="p-2">
                  <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Hashtags</p>
                  {data!.hashtags.map((h) => (
                    <Link
                      key={h.tag}
                      href={`/hashtag/${h.tag}`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg p-2 hover:bg-secondary/50"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                        <Hash className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">#{h.tag}</p>
                        <p className="text-xs text-muted-foreground">{h.postsCount} posts</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {data!.posts.length > 0 && (
                <div className="p-2">
                  <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Posts</p>
                  {data!.posts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/posts/${post.id}`}
                      onClick={() => setIsOpen(false)}
                      className="block rounded-lg p-2 hover:bg-secondary/50"
                    >
                      <p className="text-xs text-muted-foreground">{post.author.fullName ?? post.author.username}</p>
                      <p className="line-clamp-2 text-sm">{post.content}</p>
                    </Link>
                  ))}
                </div>
              )}

              <button
                onClick={goToFullResults}
                className={cn("w-full p-3 text-center text-sm font-medium text-primary hover:bg-secondary/50")}
              >
                See all results for &quot;{debouncedQuery}&quot;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
