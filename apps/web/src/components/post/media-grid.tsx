import { Play } from "lucide-react";
import type { MediaItem } from "@connecthub/shared-types";
import { cn } from "@/lib/utils";

export function MediaGrid({ media }: { media: MediaItem[] }) {
  if (media.length === 0) return null;

  return (
    <div
      className={cn(
        "grid gap-1 rounded-xl overflow-hidden mt-3",
        media.length === 1 && "grid-cols-1",
        media.length === 2 && "grid-cols-2",
        media.length === 3 && "grid-cols-2",
        media.length >= 4 && "grid-cols-2"
      )}
    >
      {media.slice(0, 4).map((item, i) => (
        <div
          key={item.id}
          className={cn(
            "relative bg-secondary",
            media.length === 3 && i === 0 && "row-span-2",
            media.length === 1 ? "aspect-video" : "aspect-square"
          )}
        >
          {item.type === "VIDEO" ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <video src={item.url} className="h-full w-full object-cover" controls preload="metadata" />
              <div className="absolute top-2 left-2 bg-black/60 rounded-full p-1 pointer-events-none">
                <Play className="h-3 w-3 text-white fill-white" />
              </div>
            </>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.url} alt="" className="h-full w-full object-cover" />
          )}

          {media.length > 4 && i === 3 && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-semibold text-lg">
              +{media.length - 4}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
