// ページ遷移時に即表示する骨組み（スケルトン）部品。
// loading.tsx から使い、押した瞬間に画面が反応して速く感じさせる。

/** 基本ブロック（パルスするグレー面） */
export function Sk({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-[var(--line)] ${className}`} />;
}

/** ページ見出し（小ラベル＋タイトル）のスケルトン */
export function HeaderSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Sk className="h-2.5 w-20" />
      <Sk className="h-6 w-56" />
    </div>
  );
}

/** 画像カードのグリッド（台帳・事業者・プロジェクト共通）のスケルトン */
export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Sk className="aspect-[4/3] w-full rounded-xl" />
          <Sk className="h-3 w-1/2" />
          <Sk className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

/** 横並びの行リスト（商談・一覧）のスケルトン */
export function RowsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-[var(--line)] bg-white">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-[var(--line-soft)] px-4 py-4 last:border-0">
          <Sk className="h-10 w-10 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Sk className="h-3.5 w-1/3" />
            <Sk className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
