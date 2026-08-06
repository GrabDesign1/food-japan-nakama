import { HeaderSkeleton, Sk, RowsSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between">
        <HeaderSkeleton />
        <Sk className="h-9 w-40 rounded-lg" />
      </div>
      <RowsSkeleton count={5} />
    </div>
  );
}
