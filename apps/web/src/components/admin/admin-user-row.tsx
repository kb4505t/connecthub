"use client";

import Link from "next/link";
import { BadgeCheck, ShieldCheck, Undo2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BanUserDialog } from "@/components/admin/ban-user-dialog";
import { useSetVerified, useUnbanUser } from "@/hooks/use-admin";
import type { AdminUserRow } from "@connecthub/shared-types";

export function AdminUserRowItem({ user }: { user: AdminUserRow }) {
  const setVerified = useSetVerified();
  const unban = useUnbanUser();
  const initials = (user.fullName ?? user.username).slice(0, 2).toUpperCase();

  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="py-3 pr-4">
        <Link href={`/profile/${user.username}`} className="flex items-center gap-3 min-w-0">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={user.avatarUrl ?? undefined} alt={user.username} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-1 font-medium truncate">
              @{user.username}
              {user.isVerified && <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
              {user.isAdmin && <ShieldCheck className="h-3.5 w-3.5 text-accent-foreground shrink-0" aria-label="Admin" />}
            </div>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </Link>
      </td>
      <td className="py-3 pr-4 text-sm text-muted-foreground whitespace-nowrap">{user.postsCount} posts</td>
      <td className="py-3 pr-4 text-sm text-muted-foreground whitespace-nowrap">{user.followersCount} followers</td>
      <td className="py-3 pr-4">
        {user.isBanned ? (
          <div>
            <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
              Banned
            </span>
            {user.banReason && <p className="text-xs text-muted-foreground mt-1 max-w-[16rem] truncate" title={user.banReason}>{user.banReason}</p>}
          </div>
        ) : (
          <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
            Active
          </span>
        )}
      </td>
      <td className="py-3 pl-4">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={setVerified.isPending}
            onClick={() => setVerified.mutate({ userId: user.id, isVerified: !user.isVerified })}
          >
            <BadgeCheck className="h-4 w-4" /> {user.isVerified ? "Unverify" : "Verify"}
          </Button>
          {user.isBanned ? (
            <Button variant="outline" size="sm" isLoading={unban.isPending} onClick={() => unban.mutate(user.id)}>
              <Undo2 className="h-4 w-4" /> Unban
            </Button>
          ) : !user.isAdmin ? (
            <BanUserDialog userId={user.id} username={user.username} />
          ) : null}
        </div>
      </td>
    </tr>
  );
}
