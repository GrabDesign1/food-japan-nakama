// 生産者（会員）カード。サムネイル画像＋名前。クリックで詳細へ。
import Link from "next/link";
import Image from "next/image";

export type ProducerCardData = {
  id: string;
  name: string;
  avatarUrl: string | null;
  companyLogoUrl: string | null;
  imageUrls: string[];
  categoryL1: string;
  categoryL2: string | null;
  prefecture: string | null;
  city: string | null;
  productItems: string | null;
  description: string | null;
};

export function ProducerCard({ p, isOwn = false }: { p: ProducerCardData; isOwn?: boolean }) {
  const initial = (p.name?.[0] ?? "?").toUpperCase();
  const area = [p.prefecture, p.city].filter(Boolean).join(" ");
  const thumb = p.imageUrls?.[0] ?? p.avatarUrl ?? null;

  return (
    <Link href={`/producers/${p.id}`} className="group block transition-transform hover:-translate-y-0.5">
      <div
        className={`relative aspect-[4/3] overflow-hidden rounded-xl border bg-[var(--green-soft)] shadow-sm transition group-hover:shadow-md ${
          isOwn ? "border-2 border-[#B77F0B] ring-2 ring-[#FAF0D6]" : "border-[var(--line)] group-hover:border-[var(--green)]"
        }`}
      >
        {thumb ? (
          // next/image: 表示サイズに合わせて縮小・WebP変換した画像を配信（fill=親のaspect枠いっぱい）
          <Image
            src={thumb}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center font-serif text-[40px] text-[var(--green-d)]">
            {initial}
          </div>
        )}
        {p.companyLogoUrl ? (
          <div className="absolute left-2 top-2 flex h-9 max-w-[104px] items-center justify-center overflow-hidden rounded-md bg-white/95 px-2 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.companyLogoUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="max-h-[26px] max-w-full object-contain"
            />
          </div>
        ) : null}
        {isOwn ? (
          <span className="absolute right-2 top-2 rounded bg-[#B77F0B] px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
            あなたの会社
          </span>
        ) : null}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
          {area ? (
            <span className="rounded bg-black/65 px-2 py-0.5 text-[11px] font-medium text-white">
              {p.prefecture}
            </span>
          ) : null}
          <span className="rounded bg-[var(--green)] px-2 py-0.5 text-[11px] font-bold text-white">
            事業者
          </span>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-1 text-[11px] text-[var(--muted)]">
        <span>👤</span>
        <span>
          {p.categoryL1}
          {p.categoryL2 ? ` / ${p.categoryL2}` : ""}
        </span>
      </div>
      <div className="mt-0.5 line-clamp-2 text-[13px] font-medium leading-5 text-[var(--ink)] group-hover:text-[var(--green-d)]">
        {p.name || "（未入力）"}
      </div>
      {p.productItems ? (
        <div className="mt-0.5 line-clamp-1 text-[11px] text-[var(--muted)]">
          {p.productItems}
        </div>
      ) : null}
      <span className="mt-1 inline-block text-[11px] text-[var(--green-d)] underline">
        詳細を見る →
      </span>
    </Link>
  );
}
