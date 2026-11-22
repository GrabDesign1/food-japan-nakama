// 会員カード。写真＋**担当者（人）**＋事業者名。クリックでプロフィールへ。
//
// 2026-11-23 ユーザー指示「担当者の紹介ができてないよ」:
//   会員は会社だが、相手が会うのは人。顔と名前と肩書を先に出す。
// ⚠️ 担当者名が未入力の会員は、これまでどおり事業者名だけが出る（空白にしない）。
// ⚠️ 使っている画面：/search（登録事業者から探す）と /favorites。直すときは両方を見ること。
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
  /** 担当者（人）。まだ渡していない画面があるので任意にしてある */
  contactName?: string | null;
  contactRole?: string | null;
  contactPhotoUrl?: string | null;
};

// from＝事業者ページの「戻る」リンクの行き先。未指定なら事業者ページ側の既定（/search）に戻る。
export function ProducerCard({
  p,
  isOwn = false,
  from,
}: {
  p: ProducerCardData;
  isOwn?: boolean;
  from?: string;
}) {
  const person = p.contactName?.trim() || null;
  const initial = ((person ?? p.name)?.[0] ?? "?").toUpperCase();
  const area = [p.prefecture, p.city].filter(Boolean).join(" ");
  const thumb = p.imageUrls?.[0] ?? p.avatarUrl ?? null;
  const face = p.contactPhotoUrl ?? null;
  const href = from ? `/producers/${p.id}?from=${encodeURIComponent(from)}` : `/producers/${p.id}`;

  return (
    <Link href={href} className="group block transition-transform hover:-translate-y-0.5">
      <div
        className={`relative aspect-[4/3] overflow-hidden rounded-xl border bg-[var(--green-soft)] shadow-sm transition group-hover:shadow-md ${
          isOwn ? "border-2 border-[var(--amber)] ring-2 ring-[var(--amber-soft)]" : "border-[var(--line)] group-hover:border-[var(--green)]"
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
          <span className="absolute right-2 top-2 rounded bg-[var(--amber)] px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
            あなたの会社
          </span>
        ) : null}
        {face ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={face}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute bottom-2 right-2 h-11 w-11 rounded-full border-2 border-white object-cover shadow-sm"
          />
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
        {person ?? (p.name || "（未入力）")}
      </div>
      {/* 肩書は改行させる。名前のうしろに続けると、長い名前のとき名前の一部に見える */}
      {person && p.contactRole ? (
        <div className="line-clamp-1 text-[11px] text-[var(--muted)]">{p.contactRole}</div>
      ) : null}
      {person ? (
        <div className="mt-0.5 line-clamp-1 text-[11px] text-[var(--ink-2)]">{p.name}</div>
      ) : null}
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
