"use client";

import * as React from "react";
import { Users } from "lucide-react";
import { useAdminUsers } from "@/hooks/use-admin";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { AdminUserRowItem } from "@/components/admin/admin-user-row";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "banned", label: "Banned" },
  { value: "admin", label: "Admins" },
  { value: "verified", label: "Verified" },
] as const;

export default function AdminUsersPage() {
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<(typeof FILTERS)[number]["value"]>("all");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useAdminUsers(debouncedSearch, filter);
  const users = data?.pages.flatMap((page) => page.data.items) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <Input
          placeholder="Search by username, email, or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <div className="inline-flex items-center gap-1 rounded-xl bg-secondary p-1 self-start">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                filter === f.value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card p-5">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <EmptyState icon={Users} title="No users found" description="Try a different search term or filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border/60">
                  <th className="font-medium pb-2 pr-4">User</th>
                  <th className="font-medium pb-2 pr-4">Posts</th>
                  <th className="font-medium pb-2 pr-4">Followers</th>
                  <th className="font-medium pb-2 pr-4">Status</th>
                  <th className="font-medium pb-2 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <AdminUserRowItem key={u.id} user={u} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {hasNextPage && (
          <div className="text-center pt-4">
            <Button variant="outline" size="sm" onClick={() => fetchNextPage()} isLoading={isFetchingNextPage}>
              Load more
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
