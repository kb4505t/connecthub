"use client";

import { useVoteOnPoll } from "@/hooks/use-posts";
import { cn } from "@/lib/utils";
import type { Poll } from "@connecthub/shared-types";

export function PollDisplay({ poll }: { poll: Poll }) {
  const voteMutation = useVoteOnPoll();
  const isExpired = new Date(poll.expiresAt).getTime() < Date.now();
  const hasVoted = !!poll.viewerVoteOptionId;
  const showResults = hasVoted || isExpired;

  return (
    <div className="mt-3 space-y-2">
      {poll.options.map((option) => {
        const percentage = poll.totalVotes > 0 ? Math.round((option.voteCount / poll.totalVotes) * 100) : 0;
        const isViewerChoice = poll.viewerVoteOptionId === option.id;

        if (showResults) {
          return (
            <div key={option.id} className="relative rounded-lg border overflow-hidden">
              <div
                className={cn("absolute inset-y-0 left-0 transition-all", isViewerChoice ? "bg-primary/25" : "bg-secondary")}
                style={{ width: `${percentage}%` }}
              />
              <div className="relative flex items-center justify-between px-3 py-2 text-sm">
                <span className={cn(isViewerChoice && "font-medium")}>{option.text}</span>
                <span className="text-muted-foreground">{percentage}%</span>
              </div>
            </div>
          );
        }

        return (
          <button
            key={option.id}
            type="button"
            disabled={voteMutation.isPending}
            onClick={() => voteMutation.mutate({ pollId: poll.id, optionId: option.id })}
            className="w-full text-left rounded-lg border px-3 py-2 text-sm hover:bg-secondary transition-colors disabled:opacity-50"
          >
            {option.text}
          </button>
        );
      })}

      <p className="text-xs text-muted-foreground pt-1">
        {poll.totalVotes} vote{poll.totalVotes === 1 ? "" : "s"} · {isExpired ? "Poll closed" : `Closes ${new Date(poll.expiresAt).toLocaleDateString()}`}
      </p>
    </div>
  );
}
