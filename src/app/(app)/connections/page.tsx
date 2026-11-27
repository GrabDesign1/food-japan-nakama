/**
 * 【つながり】2026-11-27 ユーザー指示「繋がりは申請型にしてね」
 *   → 同日「UIにしっかり表示してね。ボタンリンクも表示して」
 *      ＝ 人数を押したら、その顔ぶれが一覧で出るようにする。
 *
 * ⚠️⚠️ **承認はこの画面に一本化する。** プロフィール側に承認ボタンを増やさないこと
 *    （⚠️ 2か所に置くと、片方を直し忘れて食い違う）。
 * ⚠️⚠️ **ここは自分のつながりだけ。** 他の会員のフォロワー一覧は出さない
 *    （⚠️ 本人の同意なく、誰とつながっているかを見せることになる）。
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import {
  connectionCounts, connectionPeople, incomingRequests,
  type PeopleKind, type PersonRow,
} from "@/lib/connections";
import { EmptyState } from "@/components/EmptyState";
import { btn, eyebrowCls, h1Cls, h2Cls } from "@/lib/ui";
import { actRespondConnection } from "../producers/actions";

export const metadata: Metadata = {
  title: "つながり",
  robots: { index: false, follow: false },
};

type TabKey = "requests" | PeopleKind;

/** ⚠️ 見出しと説明は1か所にまとめる（タブと中身で文言がずれないように） */
const TABS: { key: TabKey; label: string; heading: string; note: string }[] = [
  {
    key: "requests",
    label: "届いた申請",
    heading: "届いている申請",
    note: "「仲間になる」を押すと、おたがいの取り組みがホームに流れます。",
  },
  {
    key: "friends",
    label: "仲間",
    heading: "仲間",
    note: "おたがいに承認した方です。取り組みがホームに流れます。",
  },
  {
    key: "following",
    label: "フォロー中",
    heading: "フォロー中",
    note: "自分から見ている方です。相手の承認は要りません。",
  },
  {
    key: "followers",
    label: "フォロワー",
    heading: "フォロワー",
    note: "自分を見てくれている方です。",
  },
];

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);

  const sp = (await searchParams) ?? {};
  const tab: TabKey =
    TABS.find((t) => t.key === sp.tab)?.key ?? "requests";
  const active = TABS.find((t) => t.key === tab)!;

  const [requests, counts, people] = await Promise.all([
    incomingRequests(me.id),
    connectionCounts(me.id),
    // ⚠️ 申請タブのときは人の一覧を引かない（使わないものを数えない）
    tab === "requests" ? Promise.resolve<PersonRow[]>([]) : connectionPeople(me.id, tab),
  ]);

  const tabCount: Record<TabKey, number> = {
    requests: requests.length,
    friends: counts.friends,
    following: counts.following,
    followers: counts.followers,
  };

  return (
    <div className="mx-auto max-w-[760px] px-4 py-8">
      <div className={eyebrowCls}>CONNECTIONS</div>
      <h1 className={`${h1Cls} mt-1`}>つながり</h1>

      {/*
        人数のボタンリンク（2026-11-27 ユーザー指示「ボタンリンクも表示して」）。
        ⚠️ 0人でも出す（⚠️ 出たり消えたりすると、押す場所が動く）。
      */}
      <nav className="mt-4 flex flex-wrap gap-2" aria-label="つながりの種類">
        {TABS.map((t) => {
          const on = t.key === tab;
          return (
            <Link
              key={t.key}
              href={t.key === "requests" ? "/connections" : `/connections?tab=${t.key}`}
              aria-current={on ? "page" : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition ${
                on
                  ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                  : "border-[var(--line)] bg-white text-[var(--ink)] hover:bg-[var(--line-soft)]"
              }`}
            >
              {t.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${
                  on ? "bg-white/20 text-white" : "bg-[var(--line-soft)] text-[var(--ink-2)]"
                }`}
              >
                {tabCount[t.key]}
              </span>
            </Link>
          );
        })}
      </nav>

      <section className="mt-7">
        <h2 className={h2Cls}>{active.heading}</h2>
        <p className="mt-1.5 text-[13px] leading-7 text-[var(--ink-2)]">{active.note}</p>

        {tab === "requests" ? (
          requests.length === 0 ? (
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
          )
        ) : people.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title={
                tab === "friends"
                  ? "まだ仲間がいません"
                  : tab === "following"
                    ? "まだ誰もフォローしていません"
                    : "まだフォロワーがいません"
              }
              description={
                tab === "followers"
                  ? "プロフィールやひとこと紹介を書いておくと、見つけてもらいやすくなります。"
                  : "メンバーのページで「仲間になる」や「＋ フォロー」を押すと、ここに並びます。"
              }
              actions={[
                { label: "オススメの仲間を見る", href: "/matching" },
                ...(tab === "followers"
                  ? [{ label: "プロフィールを編集", href: "/profile" }]
                  : [{ label: "メンバーを見る", href: "/members" }]),
              ]}
            />
          </div>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {people.map((p) => (
              <li
                key={p.memberId}
                className="flex items-center gap-3 rounded-[12px] border border-[var(--line)] bg-white p-3.5"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--line)] bg-white font-serif text-[17px] text-[var(--green-d)]">
                  {p.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (p.name[0] ?? "?").toUpperCase()
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  {/* ⚠️ 非公開の方はプロフィールが開けないので、リンクにしない */}
                  {p.openable ? (
                    <Link
                      href={`/producers/${p.memberId}?from=${encodeURIComponent(
                        `/connections?tab=${tab}`,
                      )}`}
                      className="block truncate text-[14px] font-bold text-[var(--ink)] hover:underline"
                    >
                      {p.name}
                    </Link>
                  ) : (
                    <p className="truncate text-[14px] font-bold text-[var(--ink)]">{p.name}</p>
                  )}
                  {p.role ? (
                    <p className="truncate text-[12px] text-[var(--ink-2)]">{p.role}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {tab === "requests" ? (
        <p className="mt-8 text-[12px] leading-6 text-[var(--muted)]">
          「今回は見送る」を選んでも、相手には知らせません。申請の記録も残しません。
        </p>
      ) : tab === "followers" ? (
        <p className="mt-8 text-[12px] leading-6 text-[var(--muted)]">
          フォローは相手の承認が要りません。見られたくない取り組みは、投稿のときに公開範囲をお確かめください。
        </p>
      ) : null}
    </div>
  );
}
