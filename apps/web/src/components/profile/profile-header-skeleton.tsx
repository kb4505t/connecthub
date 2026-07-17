import { Skeleton } from "@/components/ui/skeleton";

export function ProfileHeaderSkeleton() {
  return (
    <div className="glass-card overflow-hidden">
      <Skeleton className="h-40 sm:h-56 rounded-none" />
      <div className="px-6 pb-6">
        <div className="flex items-end justify-between -mt-12 mb-4">
          <Skeleton className="h-24 w-24 rounded-full border-4 border-card" />
          <Skeleton className="h-11 w-28" />
        </div>
        <Skeleton className="h-5 w-40 mb-2" />
        <Skeleton className="h-4 w-24 mb-4" />
        <Skeleton className="h-4 w-full max-w-sm mb-2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
