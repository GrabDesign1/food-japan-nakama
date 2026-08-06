import { Sk } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-[820px] flex-col gap-6">
      <Sk className="h-3 w-24" />
      {/* ヘッダー */}
      <div className="flex items-center gap-4">
        <Sk className="h-16 w-16 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Sk className="h-6 w-1/2" />
          <Sk className="h-3.5 w-2/3" />
        </div>
        <Sk className="h-10 w-32 rounded-lg" />
      </div>
      <Sk className="h-[280px] w-full rounded-xl" />
      <div className="flex flex-col gap-2">
        <Sk className="h-3.5 w-full" />
        <Sk className="h-3.5 w-5/6" />
        <Sk className="h-3.5 w-3/4" />
      </div>
    </div>
  );
}
