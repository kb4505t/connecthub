"use client";

import { SmilePlus } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

export function ReactionPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Add reaction"
      >
        <SmilePlus className="h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="flex gap-1 p-1.5 min-w-0">
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelect(emoji)}
            className="text-lg rounded-lg p-1.5 hover:bg-secondary transition-colors"
          >
            {emoji}
          </button>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
