import { Sk } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-[820px] flex-col gap-6">
      <Sk className="h-3 w-24" />
      <div className="flex items-end justify-between">
        <div className="flex flex-1 flex-col gap-2">
          <Sk className="h-3 w-24" />
          <Sk className="h-7 w-2/3" />
        </div>
        <Sk className="h-9 w-24 rounded-lg" />
      </div>
      <Sk className="h-[300px] w-full rounded-xl" />
      <div className="flex flex-col gap-2">
        <Sk className="h-3.5 w-full" />
        <Sk className="h-3.5 w-5/6" />
        <Sk className="h-3.5 w-3/4" />
      </div>
      <Sk className="h-32 w-full rounded-[10px]" />
    </div>
  );
}
