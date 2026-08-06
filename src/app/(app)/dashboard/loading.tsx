import { HeaderSkeleton, Sk, CardGridSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <HeaderSkeleton />
      {/* クイック操作 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Sk key={i} className="h-14 rounded-full" />
        ))}
      </div>
      {/* 数字カード */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Sk key={i} className="h-24 rounded-[10px]" />
        ))}
      </div>
      <Sk className="h-5 w-40" />
      <CardGridSkeleton count={4} />
    </div>
  );
}
