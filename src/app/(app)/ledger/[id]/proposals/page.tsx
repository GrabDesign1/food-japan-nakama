// 案件に届いた提案・問い合わせの一覧（掲載者のみ）。
// クラウドワークスの「応募者一覧」に相当。相手・初回の内容・進捗・最終更新を並べて比較し、
// 各やり取り（案件ごとのスレッド）へ入る（2026-08-11）。
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { PHASES, PHASE_CONTRACTED, PHASE_DONE } from "@/lib/deal-constants";
import { DIRECTION_SHORT, formatPrice, formatAmount, formatDeadline } from "@/lib/offering-taxonomy";
import { EmptyState } from "@/components/EmptyState";
import { loadLockedLeadThreadIds, leadPreview } from "@/lib/lead-unlock";
import { ProposalRows } from "./ProposalRows";
import { btn, eyebrowCls, h1Cls, input } from "@/lib/ui";

function fmtDateTime(d: Date): string {
  const j = new Date(d.getTime() + 9 * 3600 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${j.getUTCFullYear()}/${j.getUTCMonth() + 1}/${j.getUTCDate()} ${p(j.getUTCHours())}:${p(j.getUTCMinutes())}`;
}

const SORTS: [string, string][] = [
  ["new", "新着順"],
  ["rating", "お気に入り順"],
  ["updated", "最新更新日"],
  ["amount", "提示額の安い順"],
];

export default async function OfferingProposalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const sort = SORTS.some(([v]) => v === sp.sort) ? (sp.sort as string) : "new";
  const su = await getSessionUser();
  if (!su) redirect(`/login?next=${encodeURIComponent(`/ledger/${id}/proposals`)}`);
  const me = await getOrCreateMemberForUser(su!);

  const offering = await prisma.offering.findUnique({ where: { id } });
  // 掲載者のみ（他人は存在ごと見せない）
  if (!offering || offering.memberId !== me.id) notFound();

  const isGive = offering.direction === "GIVE";

  // この案件のやり取り（案件ごとのスレッド）
  const threads = await prisma.thread.findMany({
    where: {
      offeringId: offering.id,
      OR: [{ fromMemberId: me.id }, { toMemberId: me.id }],
    },
    orderBy: { lastMessageAt: "desc" },
  });

  const otherIds = Array.from(
    new Set(threads.map((t) => (t.fromMemberId === me.id ? t.toMemberId : t.fromMemberId)))
  );
  const threadIds = threads.map((t) => t.id);

  const [members, deals, firstMessages, lastMessages, unreadGroups] = await Promise.all([
    otherIds.length
      ? prisma.member.findMany({
          where: { id: { in: otherIds } },
          select: {
            id: true,
            name: true,
            companyLogoUrl: true,
            prefecture: true,
            city: true,
            categoryL1: true,
          },
        })
      : Promise.resolve([]),
    threadIds.length
      ? prisma.deal.findMany({
          where: { threadId: { in: threadIds } },
          select: { id: true, threadId: true, phase: true, lastActivityAt: true },
        })
      : Promise.resolve([]),
    // 相手からの最初のメッセージ＝提案・問い合わせの内容
    threadIds.length
      ? prisma.message.findMany({
          where: { threadId: { in: threadIds }, senderMemberId: { not: me.id } },
          orderBy: { createdAt: "asc" },
          select: { id: true, threadId: true, body: true, createdAt: true },
        })
      : Promise.resolve([]),
    threadIds.length
      ? prisma.message.findMany({
          where: { threadId: { in: threadIds } },
          orderBy: { createdAt: "desc" },
          select: { id: true, threadId: true, body: true, createdAt: true, senderMemberId: true },
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

  // 未開封のリードは本文を返さない（一覧で読めてしまうと開封課金の意味がない）
  const lockedThreadIds = await loadLockedLeadThreadIds(me.id, threads);

  const notes = threadIds.length
    ? await prisma.proposalNote.findMany({
        where: { threadId: { in: threadIds }, memberId: me.id },
        select: { threadId: true, rating: true, memo: true },
      })
    : [];
  const noteByThread = new Map(notes.map((n) => [n.threadId, n]));
  const memberMap = new Map(members.map((m) => [m.id, m]));
  const dealMap = new Map(deals.map((d) => [d.threadId ?? "", d]));
  const firstMap = new Map<string, (typeof firstMessages)[number]>();
  for (const m of firstMessages) if (!firstMap.has(m.threadId)) firstMap.set(m.threadId, m);
  const lastMap = new Map<string, (typeof lastMessages)[number]>();
  for (const m of lastMessages) if (!lastMap.has(m.threadId)) lastMap.set(m.threadId, m);
  const unreadMap = new Map(unreadGroups.map((g) => [g.threadId, g._count._all]));

  // 相手から1通も届いていないスレッド（自分から開いただけ）は提案として数えない
  const rows = threads
    .filter((t) => firstMap.has(t.id))
    .map((t) => {
      const otherId = t.fromMemberId === me.id ? t.toMemberId : t.fromMemberId;
      const deal = dealMap.get(t.id);
      const note = noteByThread.get(t.id);
      return {
        thread: t,
        other: memberMap.get(otherId),
        first: firstMap.get(t.id)!,
        last: lastMap.get(t.id),
        unread: unreadMap.get(t.id) ?? 0,
        phase: deal?.phase ?? 0,
        rating: note?.rating ?? null,
        memo: note?.memo ?? "",
      };
    })
    .sort((a, b) => {
      // 未返信は並べ替えに関わらず先頭（対応が必要なものを見落とさないため）
      if ((b.unread > 0 ? 1 : 0) !== (a.unread > 0 ? 1 : 0)) return b.unread - a.unread;
      if (sort === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
      if (sort === "amount") {
        const av = a.thread.proposedAmount ?? Number.MAX_SAFE_INTEGER;
        const bv = b.thread.proposedAmount ?? Number.MAX_SAFE_INTEGER;
        if (av !== bv) return av - bv;
      }
      if (sort === "new") return b.first.createdAt.getTime() - a.first.createdAt.getTime();
      return b.thread.lastMessageAt.getTime() - a.thread.lastMessageAt.getTime();
    });

  const totals = {
    all: rows.length,
    unread: rows.filter((r) => r.unread > 0).length,
    // 受付＝まだ商談に入っていない（出会う段階）
    received: rows.filter((r) => r.phase < 1).length,
    talking: rows.filter((r) => r.phase >= PHASE_CONTRACTED && r.phase < PHASE_DONE).length,
    closed: rows.filter((r) => r.phase >= PHASE_DONE).length,
  };

  const facts = [
    formatPrice(offering) ? `希望価格：${formatPrice(offering)}` : null,
    formatAmount(offering) ? `数量：${formatAmount(offering)}` : null,
    formatDeadline(offering.applicationDeadline)
      ? `募集期限：${formatDeadline(offering.applicationDeadline)}`
      : null,
  ].filter((v): v is string => !!v);

  return (
    <div className="mx-auto flex max-w-[1000px] flex-col gap-5">
      <div>
        <Link href={`/ledger/${offering.id}`} className={btn("secondary", "sm")}>
          ← 案件の詳細へ
        </Link>
        <p className={`${eyebrowCls} mt-3`}>PROPOSALS</p>
        <h1 className={h1Cls}>{isGive ? "届いた問い合わせ" : "届いた提案"}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span
            className={`rounded px-2 py-0.5 text-[10px] font-bold text-white ${
              isGive ? "bg-[var(--green)]" : "bg-[var(--amber)]"
            }`}
          >
            {DIRECTION_SHORT[offering.direction] ?? ""}
          </span>
          <span className="text-[14px] font-bold text-[var(--ink)]">{offering.title || "（無題）"}</span>
        </div>
        {facts.length ? (
          <p className="mt-1 text-[12px] text-[var(--muted)]">{facts.join("　/　")}</p>
        ) : null}
      </div>

      {/* サマリー（クラウドワークスの応募者サマリーと同じ考え方＝対応が必要な数を左に赤で出す） */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <div className="mb-1 text-center text-[11px] font-bold text-[var(--red)]">対応が必要</div>
          <div
            className={`min-w-[110px] rounded-[10px] px-4 py-3 text-center ${
              totals.unread > 0
                ? "border-2 border-[var(--red)] bg-[var(--red-soft)]"
                : "border border-[var(--line)] bg-white"
            }`}
          >
            <div className="text-[11px] text-[var(--muted)]">未返信</div>
            <div
              className={`text-[22px] font-bold ${
                totals.unread > 0 ? "text-[var(--red)]" : "text-[var(--ink)]"
              }`}
            >
              {totals.unread}
              <span className="ml-0.5 text-[11px] font-normal text-[var(--muted)]">件</span>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-1 text-[11px] text-[var(--muted)]">やり取りの状況</div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: "受付", value: totals.received },
              { label: "商談中", value: totals.talking },
              { label: "完了", value: totals.closed },
            ].map((s, i) => (
              <div key={s.label} className="flex items-center gap-2">
                {i > 0 ? <span className="text-[13px] text-[var(--muted)]">＋</span> : null}
                <div className="min-w-[92px] rounded-[10px] border border-[var(--line)] bg-white px-3 py-3 text-center">
                  <div className="text-[11px] text-[var(--muted)]">{s.label}</div>
                  <div className="text-[18px] font-bold text-[var(--ink)]">
                    {s.value}
                    <span className="ml-0.5 text-[11px] font-normal text-[var(--muted)]">件</span>
                  </div>
                </div>
              </div>
            ))}
            <span className="text-[13px] text-[var(--muted)]">＝</span>
            <div className="min-w-[92px] rounded-[10px] border border-[var(--green)] bg-[var(--green-soft)] px-3 py-3 text-center">
              <div className="text-[11px] text-[var(--green-d)]">合計</div>
              <div className="text-[18px] font-bold text-[var(--green-d)]">
                {totals.all}
                <span className="ml-0.5 text-[11px] font-normal">件</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={isGive ? "まだ問い合わせは届いていません" : "まだ提案は届いていません"}
          description={
            offering.isPublic
              ? "公開中です。より多くの相手へ届けたい場合は、掲載オプションを追加できます。"
              : "この案件はまだ下書き（非公開）です。公開すると相手から届くようになります。"
          }
          actions={[
            offering.isPublic
              ? { label: "掲載オプションを見る", href: `/ledger/${offering.id}/options` }
              : { label: "編集して公開する", href: `/ledger/${offering.id}/edit`, variant: "primary" as const },
          ]}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {/* 表示順 */}
          <form method="GET" className="flex flex-wrap items-center justify-end gap-2">
            <label className="text-[12px] text-[var(--muted)]">表示順</label>
            <select
              name="sort"
              defaultValue={sort}
              className={input("sm")}
            >
              {SORTS.map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
            <button className={btn("secondary", "sm")}>並べ替え</button>
          </form>

          <ProposalRows
            offeringId={offering.id}
            isGive={isGive}
            showMemberPromo={me.paymentStatus !== "PAID"}
            rows={rows.map((r) => ({
              threadId: r.thread.id,
              offeringId: offering.id,
              isGive,
              otherId: r.other?.id ?? "",
              otherName: r.other?.name || "（不明）",
              otherLogoUrl: r.other?.companyLogoUrl ?? null,
              otherPlace: [r.other?.prefecture, r.other?.city].filter(Boolean).join(" "),
              otherIndustry: r.other?.categoryL1 ?? "",
              locked: lockedThreadIds.has(r.thread.id),
              firstBody: lockedThreadIds.has(r.thread.id)
                ? leadPreview(r.first.body)
                : r.first.body,
              firstAt: fmtDateTime(r.first.createdAt),
              lastAt: r.last ? fmtDateTime(r.last.createdAt) : "—",
              lastFromMe: r.last?.senderMemberId === me.id,
              unread: r.unread,
              phaseLabel: PHASES[r.phase] ?? PHASES[0],
              proposedAmount: r.thread.proposedAmount,
              rating: r.rating,
              memo: r.memo,
            }))}
          />
        </div>
      )}

      <p className="text-[11px] leading-5 text-[var(--muted)]">
        進捗（ご商談〜完了）は、各やり取りの画面で変更できます。すべての商談を横断して見る場合は
        <Link href="/deals" className="mx-1 text-[var(--green-d)] underline">
          進行中の活動
        </Link>
        をご覧ください。
      </p>
    </div>
  );
}
