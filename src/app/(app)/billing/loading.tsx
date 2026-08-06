import { HeaderSkeleton, Sk } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <HeaderSkeleton />
      <Sk className="h-14 rounded-[10px]" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Sk className="h-64 rounded-[12px]" />
        <Sk className="h-64 rounded-[12px]" />
      </div>
    </div>
  );
}
