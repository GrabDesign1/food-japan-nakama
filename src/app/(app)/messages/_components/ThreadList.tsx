// メッセージ左ペインのスレッド一覧（2ペインで共通利用）。
import Link from "next/link";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/EmptyState";

export async function ThreadList({
  meId,
  activeId,
}: {
  meId: string;
  activeId?: string;
}) {
  const threads = await prisma.thread.findMany({
    where: { OR: [{ fromMemberId: meId }, { toMemberId: meId }] },
    orderBy: { lastMessageAt: "desc" },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  // 「売りたい」への受信問い合わせ制限（非Premiumの売り手は2通目以降を秘匿）を一覧プレビューにも適用
  const meMember = await prisma.member.findUnique({ where: { id: meId }, select: { paymentStatus: true } });
  const isPremium = meMember?.paymentStatus === "PAID";
  let maskedThreadIds = new Set<string>();
  if (!isPremium) {
    const offeringIds = Array.from(
      new Set(threads.map((t) => t.offeringId).filter((v): v is string => !!v))
    );
    {
      const giveMine = offeringIds.length
        ? await prisma.offering.findMany({
            where: { id: { in: offeringIds }, direction: "GIVE", memberId: meId },
            select: { id: true },
          })
        : [];
      const giveSet = new Set(giveMine.map((o) => o.id));
      const limitedThreadIds = threads
        .filter(
          (t) =>
            (t.offeringId && giveSet.has(t.offeringId)) ||
            // 案件に紐づかない直接会話：自分が受信側のスレッド
            (!t.offeringId && t.fromMemberId !== meId)
        )
        .map((t) => t.id);
      if (limitedThreadIds.length) {
        // 各スレッドの「自分の初回返信」時刻を特定し、それより後に届いた相手メッセージが最新ならマスク
        const myFirstReplies = await prisma.message.findMany({
          where: { threadId: { in: limitedThreadIds }, senderMemberId: meId },
          orderBy: { createdAt: "asc" },
          distinct: ["threadId"],
          select: { threadId: true, createdAt: true },
        });
        const replyMap = new Map(myFirstReplies.map((f) => [f.threadId, f.createdAt]));
        maskedThreadIds = new Set(
          threads
            .filter((t) => {
              if (!limitedThreadIds.includes(t.id)) return false;
              const last = t.messages[0];
              const freeUntil = replyMap.get(t.id);
              return !!last && last.senderMemberId !== meId && !!freeUntil && last.createdAt > freeUntil;
            })
            .map((t) => t.id)
        );
      }
    }
  }

  const otherIds = Array.from(
    new Set(threads.map((t) => (t.fromMemberId === meId ? t.toMemberId : t.fromMemberId)))
  );
  const members = await prisma.member.findMany({
    where: { id: { in: otherIds } },
    select: { id: true, name: true, avatarUrl: true },
  });
  const map = new Map(members.map((m) => [m.id, m]));

  const unread = await prisma.message.groupBy({
    by: ["threadId"],
    where: {
      threadId: { in: threads.map((t) => t.id) },
      senderMemberId: { not: meId },
      readAt: null,
    },
    _count: { _all: true },
  });
  const unreadMap = new Map(unread.map((g) => [g.threadId, g._count._all]));

  if (threads.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          compact
          title="まだメッセージはありません"
          description="気になる相手に「興味を送る」と、ここでやり取りが始まります。"
          actions={[{ label: "共創パートナーを探す", href: "/search" }]}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {threads.map((t) => {
        const otherId = t.fromMemberId === meId ? t.toMemberId : t.fromMemberId;
        const other = map.get(otherId);
        const last = t.messages[0];
        const unreadN = unreadMap.get(t.id) ?? 0;
        const active = activeId === t.id;
        const preview = maskedThreadIds.has(t.id)
          ? "🔒 新しいメッセージ（Premium会員で閲覧できます）"
          : last
            ? `${last.senderMemberId === meId ? "自分：" : ""}${last.body || "（ファイル）"}`
            : "（メッセージはまだありません）";
        return (
          <Link
            key={t.id}
            href={`/messages/${t.id}`}
            className={`flex items-center gap-3 border-b border-[#EDF0EA] px-4 py-3 transition ${
              active ? "bg-[var(--green-soft)]" : "hover:bg-[var(--canvas)]"
            }`}
          >
            <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-white font-serif text-[16px] text-[var(--green-d)]">
              {other?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={other.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                (other?.name?.[0] ?? "?").toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-[var(--ink)]">
                  {other?.name || "（不明）"}
                </span>
                <span className="shrink-0 text-[11px] text-[var(--muted)]">
                  {shortTime(t.lastMessageAt)}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <span
                  className={`min-w-0 flex-1 truncate text-[12px] ${
                    unreadN > 0 ? "font-medium text-[var(--ink-2)]" : "text-[var(--muted)]"
                  }`}
                >
                  {preview}
                </span>
                {unreadN > 0 ? (
                  <span className="grid h-[18px] min-w-[18px] shrink-0 place-items-center rounded-full bg-[var(--green)] px-1 text-[10px] font-bold text-white">
                    {unreadN}
                  </span>
                ) : null}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// 今日なら時刻、それ以外は月/日 を短く表示（LINE風）
function shortTime(d: Date): string {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  return sameDay
    ? `${p(d.getHours())}:${p(d.getMinutes())}`
    : `${p(d.getMonth() + 1)}/${p(d.getDate())}`;
}
