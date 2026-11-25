// 仲間のキュレーションメディア（2026-11-25 ユーザー指示「仲間のキュレーションメディアを作って」）。
//
// ⚠️ 会員だけが読む。/feed と同じ公開範囲（自分＋名刺を交換した相手）を守る。判定は curation.ts。
// ⚠️ 事務局ピックの記事は公開トップにも出ているもの。ここでは仲間の共有と混ぜて時系列に並べる。
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listCuration } from "@/lib/curation";
import { EmptyState } from "@/components/EmptyState";
import { eyebrowCls, h1Cls, btn } from "@/lib/ui";

export const metadata = { title: "食のキュレーション" };

export default async function CurationPage() {
  const su = await getSessionUser();
  if (!su) redirect("/login");

  const items = await listCuration(su.app.tenantId, su.app.memberId ?? null);
  const mine = items.filter((i) => i.kind === "member").length;

  return (
    <div className="mx-auto flex max-w-[820px] flex-col gap-5">
      <div>
        <p className={eyebrowCls}>CURATION</p>
        <h1 className={h1Cls}>食のキュレーション</h1>
        <p className="mt-2 text-[13px] leading-7 text-[var(--ink-2)]">
          事務局が見つけた記事と、<strong>名刺を交換した仲間が共有した記事</strong>が並びます。
          あなたが読んでほしい記事は、
          <Link href="/feed" className="underline">みんなの取り組み</Link>
          にURLを貼ると、つながっている方のここに出ます。
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="まだ記事がありません"
          description="記事のURLを投稿すると、ここに並びます。名刺を交換した相手が増えるほど、集まる記事も増えます。"
        />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {items.map((a) => (
              <li key={a.id}>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex gap-4 rounded-lg border border-[var(--line)] bg-white p-4 transition-colors hover:border-[var(--green-d)]"
                >
                  {a.imageSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.imageSrc}
                      alt=""
                      className="hidden h-[84px] w-[140px] shrink-0 rounded border border-[var(--line)] object-cover sm:block"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded bg-[var(--canvas)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">
                        {a.kind === "office" ? "事務局が見つけた" : "仲間が共有"}
                      </span>
                      {a.fromSummit ? (
                        <span className="rounded bg-[var(--green-soft)] px-1.5 py-0.5 text-[10px] text-[var(--green-d)]">
                          FOOD JAPAN SUMMIT 共創
                        </span>
                      ) : null}
                      <span className="text-[10px] text-[var(--muted)]">{a.source || a.host}</span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[14px] font-semibold leading-6 text-[var(--ink)]">
                      {a.title}
                    </p>
                    {a.excerpt ? (
                      <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-[var(--ink-2)]">
                        {a.excerpt}
                      </p>
                    ) : null}
                    {a.byName ? (
                      <p className="mt-1.5 line-clamp-1 text-[11px] text-[var(--muted)]">
                        {a.byName} さんが共有
                      </p>
                    ) : null}
                  </div>
                </a>
              </li>
            ))}
          </ul>

          {mine === 0 ? (
            <div className="rounded-lg border border-[var(--line)] bg-[var(--canvas)] p-4 text-[12.5px] leading-6 text-[var(--ink-2)]">
              <p>
                いまは事務局が見つけた記事だけです。
                <strong>名刺を交換すると、その方が共有した記事もここに並びます。</strong>
              </p>
              <Link className={`${btn("ghost")} mt-3 inline-flex`} href="/members">
                メンバーを見る
              </Link>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
