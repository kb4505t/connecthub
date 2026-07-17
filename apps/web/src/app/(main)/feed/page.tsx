"use client";

import * as React from "react";
import { Rss } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PostComposer } from "@/components/post/post-composer";
import { PostList } from "@/components/post/post-list";
import { StoryBar } from "@/components/stories/story-bar";
import { useFeed } from "@/hooks/use-posts";

function FeedTab({ type }: { type: "following" | "latest" | "trending" }) {
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useFeed(type);

  const emptyCopy = {
    following: { title: "Your feed is quiet", description: "Follow some people to see their posts here." },
    latest: { title: "No posts yet", description: "Be the first to post something." },
    trending: { title: "Nothing trending yet", description: "Check back once posts start getting engagement." },
  }[type];

  return (
    <PostList
      data={data}
      isLoading={isLoading}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={() => fetchNextPage()}
      emptyIcon={Rss}
      emptyTitle={emptyCopy.title}
      emptyDescription={emptyCopy.description}
    />
  );
}

export default function FeedPage() {
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <StoryBar />
      <PostComposer />

      <Tabs defaultValue="latest">
        <TabsList>
          <TabsTrigger value="following">Following</TabsTrigger>
          <TabsTrigger value="latest">Latest</TabsTrigger>
          <TabsTrigger value="trending">Trending</TabsTrigger>
        </TabsList>

        <TabsContent value="following">
          <FeedTab type="following" />
        </TabsContent>
        <TabsContent value="latest">
          <FeedTab type="latest" />
        </TabsContent>
        <TabsContent value="trending">
          <FeedTab type="trending" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
