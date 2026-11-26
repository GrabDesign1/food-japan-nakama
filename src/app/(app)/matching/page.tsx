// 生産者（売りたい）と流通（探している）の突き合わせ。2026-11-26
//
// ⚠️⚠️ **点数は出さない。** 出すのは「なぜ合うのか」の言葉だけ（matching.ts の reasons）。
// ⚠️ 相手に自動で連絡はしない。押すのは必ず本人。
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { matchesForMember, type Match } from "@/lib/matching";
import { EmptyState } from "@/components/EmptyState";
import { btn, eyebrowCls, h1Cls, h2Cls } from "@/lib/ui";

export const metadata: Metadata = { title: "つながれそうな相手", robots: { index: false, follow: false } };

function MatchRow({ m, mineLabel }: { m: Match; mineLabel: string }) {
  return (
    <li className="rounded-[12px] border border-[var(--line)] bg-white p-5">
      <p className="text-[11px] text-[var(--muted)]">
        {mineLabel}：<span className="text-[var(--ink-2)]">{m.mine.title}</span>
      </p>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold text-[var(--green-d)]">
            {m.other.direction === "WANT" ? "探しています" : "出せます"}
          </p>
          <h3 className="mt-0.5 text-[16px] font-bold leading-7 text-[var(--ink)]">
            <Link href={`/search/${m.other.offeringId}`} className="hover:underline">
              {m.other.title}
            </Link>
          </h3>
          <p className="mt-1 text-[12px] text-[var(--muted)]">
            <Link href={`/producers/${m.other.memberId}`} className="hover:underline">
              {m.other.memberName}
            </Link>
            {m.other.area ? `　／　${m.other.area}` : ""}
          </p>
        </div>
        <Link href={`/search/${m.other.offeringId}`} className={`${btn("primary", "sm")} shrink-0`}>
          案件を見る
        </Link>
      </div>

      {/* ⚠️ ここが肝。なぜ合うのかを必ず見せる */}
      <ul className="mt-3 flex flex-wrap gap-2 border-t border-[var(--line)] pt-3">
        {m.reasons.map((r) => (
          <li
            key={r}
            className="rounded-full bg-[var(--line-soft)] px-3 py-1 text-[11px] font-semibold text-[var(--ink-2)]"
          >
            {r}
          </li>
        ))}
      </ul>
    </li>
  );
}

export default async function MatchingPage() {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);
  const { sellToWant, wantToSell } = await matchesForMember(me.id);

  return (
    <div className="mx-auto max-w-[880px] px-4 py-8">
      <div className={eyebrowCls}>MATCHING</div>
      <h1 className={`${h1Cls} mt-1`}>つながれそうな相手</h1>
      <p className="mt-2 text-[13px] leading-7 text-[var(--ink-2)]">
        あなたが出している案件と、条件の近い相手を並べています。
        <strong className="text-[var(--ink)]">なぜ合うのか</strong>も一緒に出しているので、
        連絡するときの一行目に使えます。
      </p>

      <section className="mt-8">
        <h2 className={h2Cls}>あなたの「売りたい」を探している人</h2>
        {sellToWant.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              compact
              title="いまは見つかりません"
              description="「売りたい」を登録すると、それを探している相手がここに出ます。品目や産地を具体的に書くほど当たります。"
              actions={[{ label: "売りたいものを登録する", href: "/ledger", variant: "primary" }]}
            />
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-4">
            {sellToWant.map((m) => (
              <MatchRow key={`${m.mine.offeringId}-${m.other.offeringId}`} m={m} mineLabel="あなたの売りたい" />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className={h2Cls}>あなたが「探している」ものを出せる人</h2>
        {wantToSell.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              compact
              title="いまは見つかりません"
              description="「探している」を登録すると、出せる相手がここに出ます。"
              actions={[{ label: "探しているものを登録する", href: "/ledger", variant: "secondary" }]}
            />
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-4">
            {wantToSell.map((m) => (
              <MatchRow key={`${m.mine.offeringId}-${m.other.offeringId}`} m={m} mineLabel="あなたの探している" />
            ))}
          </ul>
        )}
      </section>

      <p className="mt-10 text-[12px] leading-6 text-[var(--muted)]">
        ここから相手へ自動で連絡することはありません。押すのは必ずご本人です。
        うまく当たらないときは、案件の題名に<strong>品目・産地・量</strong>を入れてみてください。
      </p>
    </div>
  );
}
