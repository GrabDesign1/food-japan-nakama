// 「探している（調達したい）」案件の一覧表示（横長の行）。
// 買い手は写真を持たないことが多く、画像中心のカードだと面積の大半が空く。
// 概要・希望価格・数量・期限・会社名を一度に読める行レイアウトにする（2026-08-11 ユーザー指定）。
// 写真と会社ロゴは「あれば出す」。無い場合はその領域を使わない。
import Link from "next/link";
import Image from "next/image";
import { categoryMeta, SEEKING_TYPE_SHORT, formatAmount, formatPrice } from "@/lib/offering-taxonomy";
import type { OfferingCardData } from "./OfferingCard";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function isNewOffering(createdAt: Date | string | null | undefined): boolean {
  return createdAt ? Date.now() - new Date(createdAt).getTime() < WEEK_MS : false;
}

/** 残り日数の表示（当日・期限切れも含む）。 */
function deadlineParts(d: Date | string | null | undefined): { label: string; sub: string; urgent: boolean } | null {
  if (!d) return null;
  const date = new Date(d);
  const diff = date.getTime() - Date.now();
  const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
  const sub = `${date.getMonth() + 1}月${date.getDate()}日まで`;
  if (diff < 0) return { label: "募集終了", sub, urgent: false };
  if (days <= 1) return { label: "本日まで", sub, urgent: true };
  return { label: `あと ${days} 日`, sub, urgent: days <= 3 };
}

function fmtDate(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const date = new Date(d);
  return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, "0")}月${String(date.getDate()).padStart(2, "0")}日`;
}

export function OfferingRow({
  o,
  isOwn = false,
  href,
  urgent = false,
  featured = false,
}: {
  o: OfferingCardData;
  isOwn?: boolean;
  href?: string;
  urgent?: boolean;
  featured?: boolean;
}) {
  const meta = categoryMeta(o.category);
  const thumb = o.imageUrls?.[0];
  const price = formatPrice({
    priceType: o.priceType ?? null,
    priceAmount: o.priceAmount ?? null,
    priceUnit: o.priceUnit ?? null,
  });
  const amount = formatAmount(o);
  const deadline = deadlineParts(o.applicationDeadline);
  const posted = fmtDate(o.createdAt);
  const isNew = isNewOffering(o.createdAt);

  return (
    <Link
      href={href ?? `/ledger/${o.id}`}
      className={`group block rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md ${
        featured
          ? "border-2 border-[#F59E0B] ring-2 ring-[#FEF0D9]"
          : isOwn
            ? "border-2 border-[#B77F0B]"
            : "border-[var(--line)] hover:border-[var(--green)]"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* 左：本文 */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {urgent ? (
              <span className="rounded bg-[var(--red)] px-2.5 py-1 text-[13px] font-bold text-white">急募</span>
            ) : null}
            {featured ? (
              <span className="rounded border border-[#F59E0B] px-2 py-0.5 text-[11px] font-bold text-[#B77F0B]">
                PR
              </span>
            ) : null}
            {isNew && !urgent ? (
              <span className="rounded bg-[#2E86C1] px-2 py-0.5 text-[11px] font-bold text-white">新着</span>
            ) : null}
            {isOwn ? (
              <span className="rounded bg-[#B77F0B] px-2 py-0.5 text-[11px] font-bold text-white">あなたの投稿</span>
            ) : null}
          </div>

          <div className="mt-1 flex gap-3">
            {thumb ? (
              <div className="relative h-[84px] w-[84px] shrink-0 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--green-soft)]">
                <Image src={thumb} alt="" fill sizes="84px" className="object-cover" />
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-[15px] font-bold leading-6 text-[var(--ink)] group-hover:text-[var(--green-d)]">
                {o.title || "（無題）"}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--muted)]">
                <span>
                  {meta?.icon} {o.category}
                </span>
                {o.seekingType && SEEKING_TYPE_SHORT[o.seekingType] ? (
                  <span className="rounded bg-[#FAF0D6] px-1.5 py-0.5 font-bold text-[#B77F0B]">
                    {SEEKING_TYPE_SHORT[o.seekingType]}
                  </span>
                ) : null}
                {o.area ? <span>📍{o.area}</span> : null}
              </div>
              {o.description ? (
                <p className="mt-1.5 line-clamp-2 text-[12px] leading-5 text-[var(--ink-2)]">{o.description}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--muted)]">
            {o.memberName ? (
              <span className="flex min-w-0 items-center gap-1.5">
                {o.memberLogoUrl ? (
                  // 会社ロゴ（登録があれば）。比率を保つため object-contain
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={o.memberLogoUrl}
                    alt=""
                    className="h-5 w-5 shrink-0 rounded object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
                <span className="truncate text-[var(--ink-2)]">{o.memberName}</span>
              </span>
            ) : null}
            {posted ? <span>掲載日：{posted}</span> : null}
            {o.views24h && o.views24h > 0 ? (
              <span>
                24時間以内に <b className="text-[var(--red)]">{o.views24h}</b> 人が閲覧
              </span>
            ) : null}
          </div>
        </div>

        {/* 右：条件（価格・数量・期限） */}
        <div className="flex shrink-0 flex-wrap items-stretch gap-3 border-t border-dashed border-[var(--line)] pt-3 sm:w-[300px] sm:flex-nowrap sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <div className="min-w-[110px] flex-1 text-center">
            <div className="text-[10px] text-[var(--muted)]">希望価格</div>
            <div className="mt-0.5 text-[14px] font-bold leading-5 text-[var(--green-d)]">{price ?? "応相談"}</div>
            {o.priceTaxType ? <div className="text-[10px] text-[var(--muted)]">{o.priceTaxType}</div> : null}
          </div>
          <div className="min-w-[110px] flex-1 border-l border-dashed border-[var(--line)] pl-3 text-center">
            <div className="text-[10px] text-[var(--muted)]">必要数量</div>
            <div className="mt-0.5 text-[13px] font-bold leading-5 text-[var(--ink)]">{amount ?? "相談"}</div>
            {o.minOrderText ? (
              <div className="text-[10px] text-[var(--muted)]">最小 {o.minOrderText}</div>
            ) : null}
          </div>
          <div className="min-w-[90px] flex-1 border-l border-dashed border-[var(--line)] pl-3 text-center">
            <div className="text-[10px] text-[var(--muted)]">募集期限</div>
            {deadline ? (
              <>
                <div
                  className={`mt-0.5 text-[13px] font-bold leading-5 ${
                    deadline.urgent ? "text-[var(--red)]" : "text-[var(--ink)]"
                  }`}
                >
                  {deadline.label}
                </div>
                <div className="text-[10px] text-[var(--muted)]">（{deadline.sub}）</div>
              </>
            ) : (
              <div className="mt-0.5 text-[13px] font-bold leading-5 text-[var(--ink)]">未設定</div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
