import { Sk } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-6">
      <Sk className="h-3 w-24" />
      <div className="flex items-end justify-between">
        <Sk className="h-6 w-48" />
        <div className="flex gap-2">
          <Sk className="h-9 w-24 rounded-lg" />
          <Sk className="h-9 w-24 rounded-lg" />
        </div>
      </div>
      <div className="flex flex-col gap-4 rounded-[10px] border border-[var(--line)] bg-white p-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Sk className="h-3 w-24" />
            <Sk className={`w-full rounded-md ${i === 2 ? "h-24" : "h-10"}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
