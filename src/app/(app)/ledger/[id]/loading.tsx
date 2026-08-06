import { Sk } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-[820px] flex-col gap-6">
      <Sk className="h-3 w-24" />
      <Sk className="h-[300px] w-full rounded-xl" />
      <div className="flex flex-col gap-2">
        <Sk className="h-3 w-20" />
        <Sk className="h-6 w-2/3" />
      </div>
      <div className="flex flex-col gap-2">
        <Sk className="h-3.5 w-full" />
        <Sk className="h-3.5 w-5/6" />
        <Sk className="h-3.5 w-3/4" />
      </div>
      <Sk className="h-28 w-full rounded-[10px]" />
    </div>
  );
}
