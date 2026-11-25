// メンバー紹介（2026-11-25 ユーザー指示「Facebookのような紹介サイトが　探してもないんだけど」）。
//
// ⚠️⚠️ プロフィールは前からありましたが、**そこへ行く入口がありませんでした**。
//    会員の一覧は「案件を探す」の中のタブだけで、ナビに会員を見る項目が0でした。
//    この画面が、その入口です。ナビの「メンバーを見る」から来ます。
// ⚠️ 会員だけが見ます（ログインが要る）。公開サイトには出しません——
//    お名前・顔写真・肩書は個人情報です。公開するかどうかは別の決定が要ります。
// ⚠️ 本人が「はい」と言っていない方（listed:false）は1人も出ません。
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { listDirectory, PER_PAGE } from "@/lib/member-directory";
import { CATEGORY_L1, PREFECTURES } from "@/lib/member-taxonomy";
import { ProducerCard } from "@/components/ProducerCard";
import { EmptyState } from "@/components/EmptyState";
import { btn, h1Cls, input } from "@/lib/ui";

export const metadata = { title: "メンバーを見る" };

const inputCls = input();

function qs(base: Record<string, string | undefined>, over: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...base, ...over })) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `/members?${s}` : "/members";
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; area?: string; category?: string; page?: string }>;
}) {
  const su = await getSessionUser();
  if (!su) redirect("/login");

  const sp = (await searchParams) ?? {};
  const q = sp.q?.trim() || undefined;
  const area = sp.area || undefined;
  const category = sp.category || undefined;
  const page = Number(sp.page ?? "1") || 1;

  const { members, total, pages } = await listDirectory({
    tenantId: su.app.tenantId,
    q,
    prefecture: area,
    category,
    page,
  });

  const base = { q, area, category };

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-5">
      <div>
        <h1 className={h1Cls}>メンバーを見る</h1>
        <p className="mt-2 text-[13px] leading-7 text-[var(--ink-2)]">
          NAKAMA の会員です。会社ではなく<strong>人</strong>で並んでいます。
          名刺を交換すると、その方の取り組み（タイムライン）が読めます。
          <Link href="/summit" className="ml-2 text-[var(--green-d)] underline">
            サミットで会った人だけを見る →
          </Link>
        </p>
      </div>

      {/* 絞り込み。⚠️ GET のフォーム（URLが残る＝人に送れる） */}
      <form method="get" className="flex flex-wrap items-end gap-3 rounded-[10px] border border-[var(--line)] bg-white p-4">
        <label className="flex min-w-[200px] flex-1 flex-col gap-1">
          <span className="text-[11px] text-[var(--muted)]">名前・会社・肩書・事業の中身</span>
          <input name="q" defaultValue={q ?? ""} placeholder="例：ピーマン、営業部長、宮崎" className={inputCls} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-[var(--muted)]">都道府県</span>
          <select name="area" defaultValue={area ?? ""} className={inputCls}>
            <option value="">すべて</option>
            {PREFECTURES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-[var(--muted)]">業種</span>
          <select name="category" defaultValue={category ?? ""} className={inputCls}>
            <option value="">すべて</option>
            {CATEGORY_L1.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <button className={btn("primary")}>絞り込む</button>
        {q || area || category ? (
          <Link href="/members" className="text-[12px] text-[var(--green-d)] underline">
            条件を消す
          </Link>
        ) : null}
      </form>

      {members.length === 0 ? (
        <EmptyState
          title="見つかりませんでした"
          description="条件を減らすか、別の言葉でお試しください。"
          actions={[{ label: "条件を消す", href: "/members", variant: "primary" as const }]}
        />
      ) : (
        <>
          <p className="text-[12px] text-[var(--muted)]">
            {total}名　{pages > 1 ? `（${page} / ${pages} ページ）` : ""}
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {members.map((m) => (
              <ProducerCard
                key={m.id}
                p={m}
                isOwn={m.id === su.app.memberId}
                from="/members"
              />
            ))}
          </div>

          {pages > 1 ? (
            <div className="mt-2 flex items-center justify-center gap-3">
              {page > 1 ? (
                <Link href={qs(base, { page: String(page - 1) })} className={btn("secondary", "sm")}>
                  ← 前
                </Link>
              ) : null}
              <span className="text-[12px] text-[var(--muted)]">
                {(page - 1) * PER_PAGE + 1}〜{Math.min(page * PER_PAGE, total)} / {total}名
              </span>
              {page < pages ? (
                <Link href={qs(base, { page: String(page + 1) })} className={btn("secondary", "sm")}>
                  次 →
                </Link>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
