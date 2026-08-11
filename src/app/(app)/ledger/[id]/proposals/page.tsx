// 案件に届いた提案・問い合わせの一覧（掲載者のみ）。
// クラウドワークスの「応募者一覧」に相当。相手・初回の内容・進捗・最終更新を並べて比較し、
// 各やり取り（案件ごとのスレッド）へ入る（2026-08-11）。
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { PHASES } from "@/lib/deal-constants";
import { DIRECTION_SHORT, formatPrice, formatAmount, formatDeadline } from "@/lib/offering-taxonomy";
import { EmptyState } from "@/components/EmptyState";
import { btn, eyebrowCls, h1Cls } from "@/lib/ui";

function fmtDateTime(d: Date): string {
  const j = new Date(d.getTime() + 9 * 3600 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${j.getUTCFullYear()}/${j.getUTCMonth() + 1}/${j.getUTCDate()} ${p(j.getUTCHours())}:${p(j.getUTCMinutes())}`;
}

export default async function OfferingProposalsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
      return {
        thread: t,
        other: memberMap.get(otherId),
        first: firstMap.get(t.id)!,
        last: lastMap.get(t.id),
        unread: unreadMap.get(t.id) ?? 0,
        phase: deal?.phase ?? 0,
      };
    })
    .sort((a, b) => {
      if ((b.unread > 0 ? 1 : 0) !== (a.unread > 0 ? 1 : 0)) return b.unread - a.unread;
      return b.thread.lastMessageAt.getTime() - a.thread.lastMessageAt.getTime();
    });

  const totals = {
    all: rows.length,
    unread: rows.filter((r) => r.unread > 0).length,
    talking: rows.filter((r) => r.phase >= 1 && r.phase < 5).length,
    closed: rows.filter((r) => r.phase >= 5).length,
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
              isGive ? "bg-[var(--green)]" : "bg-[#B77F0B]"
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

      {/* サマリー */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "未返信", value: totals.unread, alert: totals.unread > 0 },
          { label: "合計", value: totals.all, alert: false },
          { label: "商談中", value: totals.talking, alert: false },
          { label: "成約・商品化", value: totals.closed, alert: false },
        ].map((s) => (
          <div
            key={s.label}
            className={`rounded-[10px] border bg-white px-4 py-3 text-center ${
              s.alert ? "border-2 border-[var(--red)]" : "border-[var(--line)]"
            }`}
          >
            <div className="text-[11px] text-[var(--muted)]">{s.label}</div>
            <div
              className={`mt-0.5 text-[20px] font-bold ${
                s.alert ? "text-[var(--red)]" : "text-[var(--ink)]"
              }`}
            >
              {s.value}
              <span className="ml-0.5 text-[11px] font-normal text-[var(--muted)]">件</span>
            </div>
          </div>
        ))}
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
        <div className="overflow-hidden rounded-[12px] border border-[var(--line)] bg-white">
          {rows.map((r, i) => (
            <div
              key={r.thread.id}
              className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start ${
                i > 0 ? "border-t border-[var(--line)]" : ""
              } ${r.unread > 0 ? "bg-[#FFF7EF]" : ""}`}
            >
              {/* 相手 */}
              <div className="flex min-w-0 flex-1 gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--line)] bg-white font-serif text-[15px] text-[var(--green-d)]">
                  {r.other?.companyLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.other.companyLogoUrl} alt="" className="h-full w-full object-contain" />
                  ) : (
                    (r.other?.name?.[0] ?? "?").toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/producers/${r.other?.id ?? ""}`}
                      className="truncate text-[14px] font-bold text-[var(--ink)] hover:text-[var(--green-d)] hover:underline"
                    >
                      {r.other?.name || "（不明）"}
                    </Link>
                    {r.unread > 0 ? (
                      <span className="rounded-full bg-[var(--red)] px-2 py-0.5 text-[10px] font-bold text-white">
                        新着 {r.unread}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                    {[r.other?.prefecture, r.other?.city].filter(Boolean).join(" ") || "地域未設定"}
                    {r.other?.categoryL1 ? `　/　${r.other.categoryL1}` : ""}
                  </div>
                  <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-[var(--ink-2)]">
                    {r.first.body || "（ファイル）"}
                  </p>
                  <div className="mt-1 text-[10px] text-[var(--muted)]">
                    初回：{fmtDateTime(r.first.createdAt)}
                    {r.last ? `　/　最終：${fmtDateTime(r.last.createdAt)}` : ""}
                  </div>
                </div>
              </div>

              {/* 進捗と導線 */}
              <div className="flex shrink-0 flex-col items-start gap-2 sm:w-[190px] sm:items-end">
                <span className="rounded-full bg-[var(--green-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--green-d)]">
                  {PHASES[r.phase] ?? PHASES[0]}
                </span>
                <Link href={`/messages/${r.thread.id}`} className={`${btn("action", "sm")} w-full text-center`}>
                  やり取りを見る →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] leading-5 text-[var(--muted)]">
        進捗（出会う〜成約・商品化）は、各やり取りの画面で変更できます。すべての商談を横断して見る場合は
        <Link href="/deals" className="mx-1 text-[var(--green-d)] underline">
          進行中の活動
        </Link>
        をご覧ください。
      </p>
    </div>
  );
}
