"use client";

import { Users, FileText, MessageSquare, Flag, Hash, TrendingUp } from "lucide-react";
import { useAdminStats } from "@/hooks/use-admin";
import { StatCard } from "@/components/admin/stat-card";
import { DailyBarChart, RankedBarList } from "@/components/admin/charts";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminOverviewPage() {
  const { data: stats, isLoading } = useAdminStats();

  if (isLoading || !stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total users" value={stats.totals.users.toLocaleString()} hint={`+${stats.newUsersLast7Days} in 7 days`} />
        <StatCard icon={FileText} label="Total posts" value={stats.totals.posts.toLocaleString()} hint={`+${stats.newPostsLast7Days} in 7 days`} />
        <StatCard icon={MessageSquare} label="Total comments" value={stats.totals.comments.toLocaleString()} />
        <StatCard icon={Flag} label="Pending reports" value={stats.totals.pendingReports.toLocaleString()} hint={stats.totals.pendingReports > 0 ? "Needs review" : "All clear"} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold mb-4">New signups — last 30 days</h2>
          <DailyBarChart data={stats.signupsByDay} />
        </div>
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold mb-4">New posts — last 30 days</h2>
          <DailyBarChart data={stats.postsByDay} color="hsl(var(--accent-foreground))" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Trending hashtags</h2>
          </div>
          {stats.trendingHashtags.length > 0 ? (
            <RankedBarList items={stats.trendingHashtags.map((h) => ({ label: `#${h.tag}`, value: h.postsCount }))} />
          ) : (
            <p className="text-sm text-muted-foreground">No hashtag activity yet.</p>
          )}
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Top posts this week</h2>
          </div>
          {stats.topPosts.length > 0 ? (
            <RankedBarList
              items={stats.topPosts.map((p) => ({
                label: p.content?.slice(0, 60) || `Post by @${p.authorUsername}`,
                value: p.likesCount + p.commentsCount,
              }))}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No engagement data yet this week.</p>
          )}
        </div>
      </div>
    </div>
  );
}
