"use client";

import * as React from "react";
import Link from "next/link";
import { FileText, MessageSquare, User as UserIcon, Check, Trash2, ShieldBan } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { useResolveReport } from "@/hooks/use-admin";
import { ApiError } from "@/lib/api-client";
import type { AdminReportRow } from "@connecthub/shared-types";

const TARGET_ICON = { POST: FileText, COMMENT: MessageSquare, USER: UserIcon } as const;

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-primary/10 text-primary",
  REVIEWED: "bg-secondary text-muted-foreground",
  RESOLVED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  DISMISSED: "bg-secondary text-muted-foreground",
};

export function AdminReportCard({ report }: { report: AdminReportRow }) {
  const [error, setError] = React.useState<string | null>(null);
  const resolveMutation = useResolveReport();
  const Icon = TARGET_ICON[report.targetType];
  const isOpen = report.status === "PENDING" || report.status === "REVIEWED";

  const resolve = async (action: "DISMISS" | "REMOVE_CONTENT" | "BAN_USER") => {
    setError(null);
    try {
      await resolveMutation.mutateAsync({ reportId: report.id, input: { action } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't resolve this report.");
    }
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">
              {report.targetType === "USER" ? "Reported account" : `Reported ${report.targetType.toLowerCase()}`}
            </p>
            <p className="text-xs text-muted-foreground">
              by{" "}
              <Link href={`/profile/${report.reporter.username}`} className="hover:underline">
                @{report.reporter.username}
              </Link>{" "}
              · {new Date(report.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[report.status]}`}>
          {report.status}
        </span>
      </div>

      <div className="rounded-xl bg-secondary/60 p-3 mb-3">
        <p className="text-xs text-muted-foreground mb-1">
          {report.targetPreview.deleted
            ? "Content already removed"
            : report.targetPreview.authorUsername
              ? `@${report.targetPreview.authorUsername}`
              : "Content"}
        </p>
        <p className="text-sm break-words">{report.targetPreview.label}</p>
      </div>

      <p className="text-sm mb-3">
        <span className="text-muted-foreground">Reason: </span>
        {report.reason}
      </p>

      {!isOpen && (
        <p className="text-xs text-muted-foreground">
          Resolved {report.resolvedAt && new Date(report.resolvedAt).toLocaleDateString()} by{" "}
          {report.reviewer ? `@${report.reviewer.username}` : "an admin"} · action: {report.actionTaken}
        </p>
      )}

      <FormAlert message={error} />

      {isOpen && (
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <Button variant="outline" size="sm" isLoading={resolveMutation.isPending} onClick={() => resolve("DISMISS")}>
            <Check className="h-4 w-4" /> Dismiss
          </Button>
          {report.targetType !== "USER" && !report.targetPreview.deleted && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
              isLoading={resolveMutation.isPending}
              onClick={() => resolve("REMOVE_CONTENT")}
            >
              <Trash2 className="h-4 w-4" /> Remove content
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10"
            isLoading={resolveMutation.isPending}
            onClick={() => resolve("BAN_USER")}
          >
            <ShieldBan className="h-4 w-4" /> Ban user
          </Button>
        </div>
      )}
    </div>
  );
}
