"use client";

import * as React from "react";
import { Flag } from "lucide-react";
import { useAdminReports } from "@/hooks/use-admin";
import { AdminReportCard } from "@/components/admin/admin-report-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

const STATUS_TABS = [
  { value: "PENDING", label: "Pending" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "DISMISSED", label: "Dismissed" },
  { value: "ALL", label: "All" },
] as const;

export default function AdminReportsPage() {
  const [status, setStatus] = React.useState<(typeof STATUS_TABS)[number]["value"]>("PENDING");

  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useAdminReports(status, "ALL");
  const reports = data?.pages.flatMap((page) => page.data.items) ?? [];

  return (
    <div className="space-y-4">
      <div className="inline-flex items-center gap-1 rounded-xl bg-secondary p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              status === tab.value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="glass-card">
          <EmptyState icon={Flag} title="No reports here" description="Nothing needs your attention in this queue right now." />
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <AdminReportCard key={r.id} report={r} />
          ))}
        </div>
      )}

      {hasNextPage && (
        <div className="text-center py-2">
          <Button variant="outline" size="sm" onClick={() => fetchNextPage()} isLoading={isFetchingNextPage}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
