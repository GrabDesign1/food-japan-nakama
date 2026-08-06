import { HeaderSkeleton, Sk, RowsSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-8">
      <HeaderSkeleton />
      <Sk className="h-32 rounded-[10px]" />
      <Sk className="h-5 w-40" />
      <RowsSkeleton count={6} />
    </div>
  );
}
