// 集まりたい（2026-11-23）。
//
// なぜ作るか（ユーザー指示 2026-11-23）:
//   「何かあるときには、探したい、売りたい、集まりたいを登録するようにすれば良い」
//
// ⚠️ 「売りたい・探している」（/ledger）は取引の器。ここは取引ではない。
//    四半期の大きな会と会のあいだを、会員自身が立てる小さな集まりで埋める。
// ⚠️ 見えるのは**公開されている承認済み会員すべて**（投稿はつながった相手だけ、とは違う）。
//    集まりは人を増やすための呼びかけなので、つながりの内側に閉じると意味がない。
// ⚠️ 手を挙げると接触として数える（+45）。これが「3か月に1回、何かアクションを取る」の実体。
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { listGatherings } from "@/lib/gatherings";
import { PREFECTURES } from "@/lib/member-taxonomy";
import { EmptyState } from "@/components/EmptyState";
import { eyebrowCls, h1Cls } from "@/lib/ui";
import { GatheringComposer } from "./_components/GatheringComposer";
import { GatheringCard } from "./_components/GatheringCard";

export const metadata = { title: "集まりたい" };

export default async function GatheringsPage({
  searchParams,
}: {
  searchParams: Promise<{ pref?: string; past?: string }>;
}) {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);

  const sp = await searchParams;
  const pref = sp.pref && PREFECTURES.includes(sp.pref) ? sp.pref : null;
  const includeClosed = sp.past === "1";

  const { items, hosts } = await listGatherings(
    { id: me.id, tenantId: me.tenantId },
    { prefecture: pref, includeClosed }
  );
  const byId = new Map(hosts.map((h) => [h.id, h]));

  const qs = (next: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const merged = { pref, past: includeClosed ? "1" : null, ...next };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/gatherings?${s}` : "/gatherings";
  };

  return (
    <div className="mx-auto max-w-[760px] px-4 py-8">
      <div className={eyebrowCls}>GATHER</div>
      <h1 className={`${h1Cls} mt-1`}>集まりたい</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink-2)]">
        大きな会と会のあいだを埋める、小さな集まりの呼びかけです。
        田んぼでも、工場見学でも、ただの飲み会でも構いません。
        <strong>日程も場所も未定のまま</strong>出せます。
      </p>

      <div className="mt-6">
        <GatheringComposer myName={me.contactName || me.name} />
      </div>

      {/* 絞り込み。⚠️ 都道府県での運用を見据えて、県で絞れるようにしておく */}
      <div className="mt-6 flex flex-wrap items-center gap-2 text-[12px]">
        <span className="text-[var(--muted)]">都道府県：</span>
        <Link
          href={qs({ pref: null })}
          className={`rounded-full border px-3 py-1 ${
            pref ? "border-[var(--line)] bg-white text-[var(--ink-2)]" : "border-[var(--green)] bg-[var(--green-soft)] text-[var(--green-d)]"
          }`}
        >
          すべて
        </Link>
        {["宮崎県", "愛知県", "東京都", "鹿児島県"].map((p) => (
          <Link
            key={p}
            href={qs({ pref: p })}
            className={`rounded-full border px-3 py-1 ${
              pref === p
                ? "border-[var(--green)] bg-[var(--green-soft)] text-[var(--green-d)]"
                : "border-[var(--line)] bg-white text-[var(--ink-2)]"
            }`}
          >
            {p}
          </Link>
        ))}
        <Link href={qs({ past: includeClosed ? null : "1" })} className="ml-auto text-[var(--muted)] hover:underline">
          {includeClosed ? "募集中だけ見る" : "終わったものも見る"}
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={pref ? `${pref}の集まりはまだありません` : "まだ集まりがありません"}
            description="最初の1本を立ててみてください。「5月ごろ、宮崎で田んぼ」だけでも、人は集まります。"
          />
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {items.map((g) => (
            <li key={g.id}>
              <GatheringCard g={g} host={byId.get(g.hostMemberId)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
