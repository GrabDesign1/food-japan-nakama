// 共有1件の見た目（会員側・公開側で共通）。2026-11-26
// ⚠️ サーバー部品。押すものはフォーム（サーバーアクション）で渡す。
import Link from "next/link";
import type { ShareView } from "@/lib/summit-share";

function hostOf(url: string): string {
  try { return new URL(url).host.replace(/^www\./, ""); } catch { return ""; }
}

export function ShareCard({
  s,
  actions,
  linkAuthor = true,
}: {
  s: ShareView;
  /** 消す・公開するなどのボタン（会員側だけで渡す） */
  actions?: React.ReactNode;
  /** 公開ページでは会員ページへ送らない（ログインが要るため） */
  linkAuthor?: boolean;
}) {
  const name = s.author?.contactName || s.author?.name || "退会された方";
  const sub = s.author?.contactName ? s.author?.name : null;

  return (
    <article className="overflow-hidden rounded-[12px] border border-[var(--line)] bg-white">
      {/* 写真 */}
      {s.imageCount > 0 ? (
        <div className={s.imageCount > 1 ? "grid grid-cols-2 gap-[2px]" : ""}>
          {Array.from({ length: s.imageCount }).map((_, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={`/api/summit-media/${s.id}?i=${i}`}
              alt=""
              loading="lazy"
              className="h-full max-h-[420px] w-full object-cover"
            />
          ))}
        </div>
      ) : null}

      {/* 動画・記事 */}
      {s.linkUrl ? (
        <a href={s.linkUrl} target="_blank" rel="noreferrer" className="block hover:opacity-90">
          {s.hasLinkImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/summit-media/${s.id}?link=1`}
              alt=""
              loading="lazy"
              className="block max-h-[320px] w-full object-cover"
            />
          ) : null}
          <div className="bg-[var(--line-soft)] px-4 py-3">
            <p className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
              <span aria-hidden>{s.kind === "video" ? "▶" : "📄"}</span>
              <span className="truncate">{s.linkSiteName || hostOf(s.linkUrl)}</span>
            </p>
            <p className="mt-1 line-clamp-2 text-[14px] font-bold leading-6 text-[var(--ink)]">
              {s.linkTitle || s.linkUrl}
            </p>
          </div>
        </a>
      ) : null}

      <div className="px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-[var(--line)] bg-[var(--line-soft)]">
            {s.author?.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.author.photoUrl} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-[var(--ink)]">
              {linkAuthor && s.author ? (
                <Link href={`/producers/${s.author.id}`} className="hover:underline">{name}</Link>
              ) : (
                name
              )}
            </p>
            {sub ? <p className="truncate text-[11px] text-[var(--muted)]">{sub}</p> : null}
          </div>
          <time
            className="shrink-0 text-[11px] text-[var(--muted)]"
            dateTime={s.createdAt.toISOString()}
            suppressHydrationWarning
          >
            {s.createdAt.getMonth() + 1}/{s.createdAt.getDate()}
          </time>
        </div>

        {s.body ? (
          <p className="mt-2.5 whitespace-pre-wrap text-[14px] leading-7 text-[var(--ink-2)]">{s.body}</p>
        ) : null}

        {actions ? <div className="mt-3 flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </article>
  );
}
