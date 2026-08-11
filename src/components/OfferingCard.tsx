// 台帳カード（一覧・ダッシュボード共通）。レイアウトは一般的な案件カードを参考にした独自デザイン。
import Link from "next/link";
import Image from "next/image";
import { categoryMeta, DIRECTION_SHORT, SEEKING_TYPE_SHORT, formatAmount, formatPrice } from "@/lib/offering-taxonomy";

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
  description?: string | null;
  memberName?: string | null;
  memberLogoUrl?: string | null;
  createdAt?: string | Date | null;
  tags?: string[];
  views24h?: number | null;
  // 取引条件（旧データはnull＝表示しない）
  priceType?: string | null;
  priceAmount?: number | null;
  priceUnit?: string | null;
  priceTaxType?: string | null;
  minOrderText?: string | null;
  itemCondition?: string | null;
  supplyFrequency?: string | null;
  applicationDeadline?: string | Date | null;
  // 掲載タイプ・一言特徴（第2次改善）
  listingPurpose?: string | null;
  tagline?: string | null;
  // 探している（WANT）の募集タイプ
  seekingType?: string | null;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// 日付判定はコンポーネント本体の外に置く（レンダー中のDate.now直呼びをlintが禁止しているため）
function isNewOffering(createdAt: Date | string | null | undefined): boolean {
  return createdAt ? Date.now() - new Date(createdAt).getTime() < WEEK_MS : false;
}
function deadlineLabel(applicationDeadline: Date | string | null | undefined): string | null {
  if (!applicationDeadline) return null;
  const d = new Date(applicationDeadline);
  return d.getTime() < Date.now() ? "募集終了" : `〜${d.getMonth() + 1}/${d.getDate()}`;
}

export function OfferingCard({
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
  /** 注目表示（有料オプション）の枠。橙色の枠で自然表示と区別する。 */
  featured?: boolean;
}) {
  const meta = categoryMeta(o.category);
  const thumb = o.imageUrls?.[0];
  const isGive = o.direction === "GIVE";
  const amount = formatAmount(o);
  const isNew = isNewOffering(o.createdAt);
  const price = formatPrice({
    priceType: o.priceType ?? null,
    priceAmount: o.priceAmount ?? null,
    priceUnit: o.priceUnit ?? null,
  });
  const deadlineText = deadlineLabel(o.applicationDeadline);
  // 写真の代わりに出す要点（探している案件用。値があるものだけ）
  const summary = [
    price ? `希望価格：${price}` : null,
    amount ? `数量：${amount}` : null,
    o.minOrderText ? `最小：${o.minOrderText}` : null,
  ].filter((v): v is string => !!v);
  // 取引条件の要点（値があるものだけ・最大3つ）
  const conditions = [
    o.minOrderText ? `最小 ${o.minOrderText}` : null,
    o.itemCondition,
    o.supplyFrequency === "今回限り" ? null : o.supplyFrequency ? `${o.supplyFrequency}供給` : null,
  ]
    .filter((v): v is string => !!v)
    .slice(0, 3);

  return (
    <Link href={href ?? `/ledger/${o.id}`} className="group block transition-transform hover:-translate-y-0.5">
      <div
        className={`relative aspect-[4/3] overflow-hidden rounded-xl border bg-[var(--green-soft)] shadow-sm transition group-hover:shadow-md ${
          featured
            ? "border-2 border-[#F59E0B] ring-2 ring-[#FEF0D9]"
            : isOwn
              ? "border-2 border-[#B77F0B] ring-2 ring-[#FAF0D6]"
              : "border-[var(--line)] group-hover:border-[var(--green)]"
        }`}
      >
        {!thumb && !isGive ? (
          // 探している（調達したい）は写真が無いのが普通。プレースホルダーで面積を使わず、
          // 概要と条件をここに出す（2026-08-11 ユーザー指定）。
          <div className="flex h-full w-full flex-col gap-1 p-3 text-left">
            {o.description ? (
              <p className="line-clamp-4 text-[11px] leading-4 text-[var(--ink-2)]">{o.description}</p>
            ) : (
              <p className="text-[11px] leading-4 text-[var(--muted)]">（詳しい説明は詳細ページに掲載）</p>
            )}
            {summary.length ? (
              <div className="mt-auto flex flex-col gap-0.5">
                {summary.map((s) => (
                  <div key={s} className="truncate text-[11px] font-medium text-[var(--ink)]">
                    {s}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : thumb ? (
          // next/image: 表示サイズに合わせて縮小・WebP変換した画像を配信（fill=親のaspect枠いっぱい）
          <Image
            src={thumb}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-[40px] opacity-60">
            {meta?.icon ?? "📦"}
          </div>
        )}
        {urgent ? (
          // 急募は有料オプション。一覧で埋もれないよう新着より一回り大きく出す（2026-08-11 ユーザー指定）
          <span className="absolute left-0 top-0 rounded-br-2xl bg-[var(--red)] px-4 py-2 text-[15px] font-bold text-white shadow-md">
            急募
          </span>
        ) : isNew ? (
          // 新着は無料。有料の急募（赤）と色で区別する（2026-08-11 ユーザー指定）
          <span className="absolute left-0 top-0 rounded-br-lg bg-[#2E86C1] px-2.5 py-1 text-[11px] font-bold text-white shadow">
            新着
          </span>
        ) : null}
        {isOwn ? (
          <span className="absolute right-2 top-2 rounded bg-[#B77F0B] px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
            あなたの投稿
          </span>
        ) : null}
        {/* 画像上のバッジ。狭い幅では単語の途中で改行されて読めなくなるため、
            各バッジは改行させず（whitespace-nowrap）、入りきらない場合は行を折り返す。
            地域名は長くなりうるので幅を制限して省略する。 */}
        <div className="absolute bottom-2 left-2 right-2 flex flex-wrap items-center gap-1.5">
          {o.area ? (
            <span className="max-w-[55%] truncate whitespace-nowrap rounded bg-black/65 px-2 py-0.5 text-[11px] font-medium text-white">
              {o.area}
            </span>
          ) : null}
          <span
            className={`whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-bold text-white ${
              isGive ? "bg-[var(--green)]" : "bg-[#B77F0B]"
            }`}
          >
            {DIRECTION_SHORT[o.direction] ?? ""}
          </span>
          {!isGive && o.seekingType && SEEKING_TYPE_SHORT[o.seekingType] ? (
            <span className="whitespace-nowrap rounded bg-white/90 px-2 py-0.5 text-[11px] font-bold text-[#B77F0B]">
              {SEEKING_TYPE_SHORT[o.seekingType]}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-1 text-[11px] text-[var(--muted)]">
        <span>{meta?.icon}</span>
        <span>{o.category}</span>
        {o.listingPurpose === "challenge" ? (
          <span className="rounded bg-[#FAF0D6] px-1.5 py-0.5 text-[10px] font-bold text-[#B77F0B]">課題解決</span>
        ) : null}
        {deadlineText ? (
          <span className={`ml-auto ${deadlineText === "募集終了" ? "text-[var(--red)]" : ""}`}>
            {deadlineText}
          </span>
        ) : null}
      </div>
      <div className="mt-0.5 line-clamp-2 text-[13px] font-medium leading-5 text-[var(--ink)] group-hover:text-[var(--green-d)]">
        {o.title || "（無題）"}
      </div>
      {o.tagline ? (
        <div className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-[var(--ink-2)]">{o.tagline}</div>
      ) : null}
      {price || amount ? (
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 text-[12px]">
          {price ? <span className="font-bold text-[var(--green-d)]">{price}</span> : null}
          {amount ? <span className="text-[var(--muted)]">{amount}</span> : null}
        </div>
      ) : null}
      {conditions.length ? (
        <div className="mt-0.5 truncate text-[11px] text-[var(--muted)]">{conditions.join(" ・ ")}</div>
      ) : null}
      {o.memberName ? (
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
          {o.memberLogoUrl ? (
            // 会社ロゴ（登録されている場合のみ）。比率を保つため object-contain
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={o.memberLogoUrl}
              alt=""
              className="h-4 w-4 shrink-0 rounded-sm object-contain"
              loading="lazy"
              decoding="async"
            />
          ) : null}
          <span className="truncate">{o.memberName}</span>
        </div>
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
