import { cn } from '@/lib/utils';

export function SkeletonLoader({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-shimmer bg-gradient-to-r from-elevated via-base to-elevated bg-[length:200%_100%] rounded-md",
        className
      )}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-surface border border-base rounded-2xl p-6 shadow-sm space-y-4">
      <SkeletonLoader className="h-6 w-1/3" />
      <SkeletonLoader className="h-10 w-1/2" />
      <div className="pt-4">
        <SkeletonLoader className="h-4 w-full" />
      </div>
    </div>
  );
}
