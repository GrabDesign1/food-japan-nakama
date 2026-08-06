// 台帳カード（一覧・ダッシュボード共通）。レイアウトは一般的な案件カードを参考にした独自デザイン。
import Link from "next/link";
import { categoryMeta, DIRECTION_SHORT, formatAmount } from "@/lib/offering-taxonomy";

export type OfferingCardData = {
  id: string;
  direction: string;
  category: string;
  title: string;
  area: string | null;
  imageUrls: string[];
  amountValue: number | null;
  amountUnit: string | null;
  amountPeriod: string | null;
  amountText: string | null;
  memberName?: string | null;
  createdAt?: string | Date | null;
  tags?: string[];
  views24h?: number | null;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function OfferingCard({ o, isOwn = false }: { o: OfferingCardData; isOwn?: boolean }) {
  const meta = categoryMeta(o.category);
  const thumb = o.imageUrls?.[0];
  const isGive = o.direction === "GIVE";
  const amount = formatAmount(o);
  const isNew = o.createdAt
    ? Date.now() - new Date(o.createdAt).getTime() < WEEK_MS
    : false;

  return (
    <Link href={`/ledger/${o.id}`} className="group block">
      <div
        className={`relative aspect-[4/3] overflow-hidden rounded-xl border bg-[var(--green-soft)] ${
          isOwn ? "border-2 border-[#B77F0B] ring-2 ring-[#FAF0D6]" : "border-[var(--line)]"
        }`}
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            className="h-full w-full object-cover transition group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-[40px] opacity-60">
            {meta?.icon ?? "📦"}
          </div>
        )}
        {isNew ? (
          <span className="absolute left-0 top-0 rounded-br-lg bg-[var(--red)] px-2.5 py-1 text-[11px] font-bold text-white shadow">
            新着
          </span>
        ) : null}
        {isOwn ? (
          <span className="absolute right-2 top-2 rounded bg-[#B77F0B] px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
            あなたの投稿
          </span>
        ) : null}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
          {o.area ? (
            <span className="rounded bg-black/65 px-2 py-0.5 text-[11px] font-medium text-white">
              {o.area}
            </span>
          ) : null}
          <span
            className={`rounded px-2 py-0.5 text-[11px] font-bold text-white ${
              isGive ? "bg-[var(--green)]" : "bg-[#B77F0B]"
            }`}
          >
            {DIRECTION_SHORT[o.direction] ?? ""}
          </span>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-1 text-[11px] text-[var(--muted)]">
        <span>{meta?.icon}</span>
        <span>{o.category}</span>
        {amount ? <span className="ml-auto text-[var(--green-d)]">{amount}</span> : null}
      </div>
      <div className="mt-0.5 line-clamp-2 text-[13px] font-medium leading-5 text-[var(--ink)] group-hover:text-[var(--green-d)]">
        {o.title || "（無題）"}
      </div>
      {o.memberName ? (
        <div className="mt-0.5 text-[11px] text-[var(--muted)]">{o.memberName}</div>
      ) : null}

      {o.views24h && o.views24h > 0 ? (
        <div className="mt-1 text-[10px] text-[var(--muted)]">
          24時間以内に <b className="text-[var(--red)]">{o.views24h}</b> 人が閲覧
        </div>
      ) : null}

      {o.tags && o.tags.length ? (
        <div className="mt-1 flex flex-wrap gap-1">
          {o.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[10px] text-[var(--ink-2)]"
            >
              #{t}
            </span>
          ))}
        </div>
      ) : null}
    </Link>
  );
}
