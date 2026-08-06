import { HeaderSkeleton, Sk } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between">
        <HeaderSkeleton />
        <Sk className="h-9 w-32 rounded-lg" />
      </div>
      {/* フェーズ列（ボード） */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {Array.from({ length: 6 }).map((_, col) => (
          <div key={col} className="flex w-64 shrink-0 flex-col gap-3">
            <Sk className="h-6 w-32" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Sk key={i} className="h-24 w-full rounded-[10px]" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
