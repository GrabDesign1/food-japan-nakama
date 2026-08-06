import { HeaderSkeleton, Sk } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <HeaderSkeleton />
        <Sk className="h-10 w-14" />
      </div>
      <Sk className="h-14 rounded-[10px]" />
      <div className="rounded-[10px] border border-[var(--line)] bg-white p-6">
        {/* タブ */}
        <div className="mb-5 flex gap-3 border-b border-[var(--line)] pb-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Sk key={i} className="h-5 w-20" />
          ))}
        </div>
        {/* 入力欄 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Sk className="h-3 w-24" />
              <Sk className="h-10 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
