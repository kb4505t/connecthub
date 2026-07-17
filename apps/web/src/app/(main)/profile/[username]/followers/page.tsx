"use client";

import { useParams } from "next/navigation";
import { useFollowers } from "@/hooks/use-profile";
import { UserList } from "@/components/profile/user-list";

export default function FollowersPage() {
  const { username } = useParams<{ username: string }>();
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useFollowers(username);

  return (
    <div className="glass-card overflow-hidden">
      <h1 className="text-lg font-semibold px-6 py-4 border-b">Followers</h1>
      <UserList
        data={data}
        isLoading={isLoading}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
        emptyLabel={`When people follow @${username}, they'll show up here.`}
      />
    </div>
  );
}
