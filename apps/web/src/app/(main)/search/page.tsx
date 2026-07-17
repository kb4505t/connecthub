"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, FileText } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { PostList } from "@/components/post/post-list";
import { SearchUserResults } from "@/components/search/search-user-results";
import { SearchHashtagResults } from "@/components/search/search-hashtag-results";
import { useSearchPosts } from "@/hooks/use-search";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

function SearchPostsTab({ query }: { query: string }) {
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useSearchPosts(query);
  return (
    <PostList
      data={data}
      isLoading={isLoading}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={() => fetchNextPage()}
      emptyIcon={FileText}
      emptyTitle="No posts found"
      emptyDescription={`No posts match "${query}".`}
    />
  );
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";

  const [inputValue, setInputValue] = React.useState(urlQuery);
  const debouncedInput = useDebouncedValue(inputValue, 400);

  // Keep the input in sync if the URL changes from elsewhere (e.g. the navbar search bar).
  React.useEffect(() => setInputValue(urlQuery), [urlQuery]);

  // Push debounced typing into the URL so the search is shareable/bookmarkable.
  React.useEffect(() => {
    if (debouncedInput.trim() && debouncedInput !== urlQuery) {
      router.replace(`/search?q=${encodeURIComponent(debouncedInput.trim())}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedInput]);

  const query = urlQuery.trim();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Search people, posts, and hashtags"
        className="h-11"
      />

      {!query ? (
        <EmptyState icon={Search} title="Search ConnectHub" description="Find people, posts, and hashtags." />
      ) : (
        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">People</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="hashtags">Hashtags</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <div className="glass-card overflow-hidden">
              <SearchUserResults query={query} />
            </div>
          </TabsContent>
          <TabsContent value="posts">
            <SearchPostsTab query={query} />
          </TabsContent>
          <TabsContent value="hashtags">
            <div className="glass-card overflow-hidden">
              <SearchHashtagResults query={query} />
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageContent />
    </Suspense>
  );
}
