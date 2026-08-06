import { HeaderSkeleton, Sk, CardGridSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-end justify-between">
        <HeaderSkeleton />
        <Sk className="h-10 w-52 rounded-lg" />
      </div>
      <Sk className="h-5 w-44" />
      <CardGridSkeleton count={4} />
    </div>
  );
}
