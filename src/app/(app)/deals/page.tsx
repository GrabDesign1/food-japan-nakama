import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { PHASES, isStale, loadMemberDeals } from "@/lib/deal";
import { prisma } from "@/lib/db";
import { DIRECTION_SHORT } from "@/lib/offering-taxonomy";
import { PhaseSelect } from "./_components/PhaseSelect";
import { setDealNext } from "./actions";
import { EmptyState } from "@/components/EmptyState";
import { MyListingsTable } from "@/components/MyListingsTable";
import { loadMyListingRows } from "@/lib/listing-stats";
import { btn, eyebrowCls, h1Cls, h2Cls, input, inputBare } from "@/lib/ui";

// レンダー中の Date.now 直呼びは lint（react-hooks/purity）が禁止しているため関数に切り出す
function isOverdue(d: Date | null): boolean {
  return !!d && d.getTime() < Date.now();
}

function ymd(d: Date | null): string {
  if (!d) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ phase?: string }>;
}) {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);
  const all = await loadMemberDeals(me.id);
  // 自分が出した案件の管理表（届いた件数・未返信・放置が一目で分かる）
  const myListings = await loadMyListingRows(me.id);
  const now = new Date();

  // どの案件の商談かを出す（案件ごとにスレッドを分けたため、会社名だけでは区別できない）。
  // 未読は「要返信」の判定に使う。ダッシュボード・提案一覧と同じ見せ方に揃える（2026-08-11）。
  const threadIds = all.map((d) => d.deal.threadId).filter((v): v is string => !!v);
  const [threads, unreadGroups] = await Promise.all([
    threadIds.length
      ? prisma.thread.findMany({
          where: { id: { in: threadIds } },
          select: { id: true, offeringId: true },
        })
      : Promise.resolve([]),
    threadIds.length
      ? prisma.message.groupBy({
          by: ["threadId"],
          where: { threadId: { in: threadIds }, senderMemberId: { not: me.id }, readAt: null },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);
  const offeringIds = Array.from(
    new Set(threads.map((t) => t.offeringId).filter((v): v is string => !!v))
  );
  const offerings = offeringIds.length
    ? await prisma.offering.findMany({
        where: { id: { in: offeringIds } },
        select: { id: true, title: true, direction: true },
      })
    : [];
  const offeringById = new Map(offerings.map((o) => [o.id, o]));
  const offeringByThread = new Map(
    threads.map((t) => [t.id, t.offeringId ? offeringById.get(t.offeringId) ?? null : null])
  );
  const unreadByThread = new Map(unreadGroups.map((g) => [g.threadId, g._count._all]));

  const sp = await searchParams;
  const activePhase = sp.phase !== undefined ? Number(sp.phase) : null;
  const counts = PHASES.map((_, i) => all.filter((d) => d.deal.phase === i).length);
  const list = activePhase === null ? all : all.filter((d) => d.deal.phase === activePhase);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between">
        <div>
          <p className={eyebrowCls}>DEALS</p>
          <h1 className={h1Cls}>進行中の活動</h1>
        </div>
        <Link href="/deals/board" className={btn("secondary", "sm")}>
          ステータスボードで見る →
        </Link>
      </div>

      {/* 自分が出した案件（クラウドワークスの「登録中のお仕事」に相当） */}
      {myListings.length ? (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className={h2Cls}>自分が出した案件</h2>
            <Link href="/ledger" className="text-[13px] font-bold text-[var(--green-d)]">
              案件を登録する →
            </Link>
          </div>
          <MyListingsTable rows={myListings} now={now} />
        </section>
      ) : null}

      <h2 className={h2Cls}>相手とのやり取り</h2>

      {/* フェーズタブ */}
      <div className="flex flex-wrap gap-1 border-b border-[var(--line)]">
        <Tab href="/deals" label="すべて" count={all.length} active={activePhase === null} />
        {PHASES.map((label, i) => (
          <Tab key={i} href={`/deals?phase=${i}`} label={label} count={counts[i]} active={activePhase === i} />
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="該当する商談はありません"
          description="共創パートナーに「興味を送る」と、ここに商談が作られ、進捗を管理できます。"
          actions={[{ label: "共創パートナーを探す", href: "/search", variant: "primary" }]}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {list.map(({ deal, other }) => {
            const stale = isStale(deal.lastActivityAt);
            const overdue = isOverdue(deal.dueDate);
            const offering = deal.threadId ? offeringByThread.get(deal.threadId) : null;
            const unread = deal.threadId ? unreadByThread.get(deal.threadId) ?? 0 : 0;
            // やり取りの行き先は案件ごとの画面（案件＋履歴＋返信が1画面）。案件が無いものは従来のメッセージ画面
            const threadHref = deal.threadId
              ? offering
                ? `/ledger/${offering.id}/proposals/${deal.threadId}`
                : `/messages/${deal.threadId}`
              : null;
            return (
              <div key={deal.id} className="rounded-[10px] border border-[var(--line)] bg-white p-5">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-white font-serif text-[16px] text-[var(--green-d)]">
                    {other?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={other.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (other?.name?.[0] ?? "?").toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {/* どの案件の商談かを最初に出す（会社名だけでは区別できないため） */}
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      {offering ? (
                        <>
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold text-white ${
                              offering.direction === "GIVE" ? "bg-[var(--green)]" : "bg-[var(--amber)]"
                            }`}
                          >
                            {DIRECTION_SHORT[offering.direction] ?? ""}
                          </span>
                          <Link
                            href={`/ledger/${offering.id}`}
                            className="truncate text-[15px] font-bold text-[var(--ink)] hover:text-[var(--green-d)] hover:underline"
                          >
                            {offering.title || "（無題）"}
                          </Link>
                        </>
                      ) : (
                        <span className="text-[13px] text-[var(--muted)]">案件に紐づかないメッセージ</span>
                      )}
                      {unread > 0 ? (
                        <span className="rounded-full bg-[var(--action)] px-2 py-0.5 text-[10px] font-bold text-white">
                          要返信 {unread}
                        </span>
                      ) : null}
                    </div>
                    <Link href={other ? `/producers/${other.id}` : "#"} className="text-[13px] font-semibold text-[var(--ink-2)] hover:underline">
                      {other?.name || "（不明）"}
                    </Link>
                    <p className="mt-0.5 line-clamp-1 text-[12px] text-[var(--muted)]">
                      {other?.categoryL1} ・ {other?.description || "—"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <PhaseSelect dealId={deal.id} phase={deal.phase} />
                    {stale ? (
                      <span className="text-[11px] text-[var(--red)]">30日以上動きなし</span>
                    ) : null}
                  </div>
                </div>

                {/* 次にやること・メモ・期限 */}
                <form action={setDealNext.bind(null, deal.id)} className="mt-4 flex flex-col gap-2 rounded-lg bg-[var(--canvas)] p-3">
                  <label className="flex flex-col gap-1 text-[11px] text-[var(--muted)]">
                    次にやること・メモ
                    <textarea
                      name="nextAction"
                      defaultValue={deal.nextAction ?? ""}
                      rows={3}
                      placeholder={"例：面談日を調整する\n・条件面のポイント\n・次回アジェンダ\nなど、メモを複数行で残せます。"}
                      className={`${input("sm")} leading-6`}
                    />
                  </label>
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="flex flex-col gap-1 text-[11px] text-[var(--muted)]">
                      期限
                      <input type="date" name="dueDate" defaultValue={ymd(deal.dueDate)} className={`${inputBare("sm")} border bg-white ${overdue ? "border-[var(--red)] text-[var(--red)]" : "border-[var(--line)]"}`} />
                    </label>
                    <button className={btn("primary", "sm")}>
                      保存
                    </button>
                    {threadHref ? (
                      <Link href={threadHref} className={`${btn(unread > 0 ? "action" : "secondary", "sm")} ml-auto whitespace-nowrap`}>
                        やり取りを見る →
                      </Link>
                    ) : null}
                  </div>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Tab({ href, label, count, active }: { href: string; label: string; count: number; active: boolean }) {
  return (
    <Link
      href={href}
      className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] ${
        active ? "border-[var(--green)] text-[var(--green-d)]" : "border-transparent text-[var(--muted)] hover:text-[var(--ink-2)]"
      }`}
    >
      {label}
      <span className={`rounded-full px-1.5 text-[11px] ${active ? "bg-[var(--green-soft)] text-[var(--green-d)]" : "bg-[var(--line)] text-[var(--ink-2)]"}`}>
        {count}
      </span>
    </Link>
  );
}
