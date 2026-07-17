"use client";

import { useParams } from "next/navigation";
import { useFollowing } from "@/hooks/use-profile";
import { UserList } from "@/components/profile/user-list";

export default function FollowingPage() {
  const { username } = useParams<{ username: string }>();
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useFollowing(username);

  return (
    <div className="glass-card overflow-hidden">
      <h1 className="text-lg font-semibold px-6 py-4 border-b">Following</h1>
      <UserList
        data={data}
        isLoading={isLoading}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
        emptyLabel={`When @${username} follows people, they'll show up here.`}
      />
    </div>
  );
}
