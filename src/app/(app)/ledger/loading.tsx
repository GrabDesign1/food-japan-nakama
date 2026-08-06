import { HeaderSkeleton, Sk, CardGridSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <HeaderSkeleton />
        <div className="flex gap-2">
          <Sk className="h-10 w-32 rounded-lg" />
          <Sk className="h-10 w-32 rounded-lg" />
        </div>
      </div>
      <Sk className="h-5 w-40" />
      <CardGridSkeleton count={4} />
      <Sk className="h-5 w-40" />
      <CardGridSkeleton count={4} />
    </div>
  );
}
