import { Sk, RowsSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
      {/* 左：スレッド一覧（PCのみ） */}
      <div className="hidden lg:block">
        <RowsSkeleton count={6} />
      </div>
      {/* 右：会話 */}
      <div className="flex flex-col gap-3">
        <Sk className="h-12 w-full rounded-lg" />
        <div className="flex flex-col gap-3">
          <Sk className="h-16 w-2/3 rounded-xl" />
          <Sk className="ml-auto h-16 w-2/3 rounded-xl" />
          <Sk className="h-12 w-1/2 rounded-xl" />
          <Sk className="ml-auto h-20 w-3/5 rounded-xl" />
        </div>
        <Sk className="mt-2 h-20 w-full rounded-lg" />
      </div>
    </div>
  );
}
