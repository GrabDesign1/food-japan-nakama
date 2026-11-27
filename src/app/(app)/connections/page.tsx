/**
 * 【仲間の申請】2026-11-27 ユーザー指示「繋がりは申請型にしてね」。
 *
 * ⚠️⚠️ **承認はこの画面に一本化する。** プロフィール側に承認ボタンを増やさないこと
 *    （⚠️ 2か所に置くと、片方を直し忘れて食い違う）。
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { connectionCounts, incomingRequests } from "@/lib/connections";
import { EmptyState } from "@/components/EmptyState";
import { btn, eyebrowCls, h1Cls, h2Cls } from "@/lib/ui";
import { actRespondConnection } from "../producers/actions";

export const metadata: Metadata = {
  title: "仲間の申請",
  robots: { index: false, follow: false },
};

export default async function ConnectionsPage() {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);
  const [requests, counts] = await Promise.all([
    incomingRequests(me.id),
    connectionCounts(me.id),
  ]);

  return (
    <div className="mx-auto max-w-[760px] px-4 py-8">
      <div className={eyebrowCls}>CONNECTIONS</div>
      <h1 className={`${h1Cls} mt-1`}>仲間の申請</h1>
      <p className="mt-2 text-[13px] leading-7 text-[var(--ink-2)]">
        仲間になると、おたがいの取り組みがホームに流れます。
        <span className="ml-2">
          いまの仲間 <b className="text-[var(--ink)]">{counts.friends}</b> 人 ／ フォロー{" "}
          <b className="text-[var(--ink)]">{counts.following}</b> 人 ／ フォロワー{" "}
          <b className="text-[var(--ink)]">{counts.followers}</b> 人
        </span>
      </p>

      <section className="mt-8">
        <h2 className={h2Cls}>届いている申請</h2>
        {requests.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="届いている申請はありません"
              description="メンバーのページで「仲間になる」を押すと、相手に申請が届きます。"
              actions={[{ label: "メンバーを見る", href: "/members" }]}
            />
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-3 rounded-[12px] border border-[var(--line)] bg-white p-4"
              >
                <Link
                  href={`/producers/${r.memberId}?from=/connections`}
                  className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--line)] bg-white font-serif text-[18px] text-[var(--green-d)]"
                >
                  {r.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (r.name[0] ?? "?").toUpperCase()
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/producers/${r.memberId}?from=/connections`}
                    className="text-[15px] font-bold text-[var(--ink)] hover:underline"
                  >
                    {r.name}
                  </Link>
                  {r.role ? (
                    <p className="text-[12px] text-[var(--ink-2)]">{r.role}</p>
                  ) : null}
                  {/* ⚠️ 添えられたひとこと。本人が書いた文なので、そのまま出す（整形しない） */}
                  {r.message ? (
                    <p className="mt-1 whitespace-pre-wrap text-[13px] leading-6 text-[var(--ink)]">
                      {r.message}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <form action={actRespondConnection.bind(null, r.id, true)}>
                    <button className={btn("primary", "sm")}>仲間になる</button>
                  </form>
                  <form action={actRespondConnection.bind(null, r.id, false)}>
                    <button className={btn("secondary", "sm")}>今回は見送る</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 text-[12px] leading-6 text-[var(--muted)]">
        「今回は見送る」を選んでも、相手には知らせません。申請の記録も残しません。
      </p>
    </div>
  );
}
