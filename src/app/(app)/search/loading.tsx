import { HeaderSkeleton, Sk, CardGridSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-5">
      <HeaderSkeleton />
      {/* 検索バー */}
      <Sk className="h-28 rounded-xl" />
      <Sk className="h-4 w-32" />
      <CardGridSkeleton count={8} />
    </div>
  );
}
