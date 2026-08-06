// メッセージ左ペインのスレッド一覧（2ペインで共通利用）。
import Link from "next/link";
import { prisma } from "@/lib/db";

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
      <div className="p-5 text-[13px] text-[var(--muted)]">
        まだメッセージはありません。
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
        const needsReply = last ? last.senderMemberId !== meId : false;
        const active = activeId === t.id;
        return (
          <Link
            key={t.id}
            href={`/messages/${t.id}`}
            className={`border-b border-[#EDF0EA] px-4 py-3 transition ${
              active ? "bg-[var(--green-soft)]" : "hover:bg-[var(--canvas)]"
            }`}
          >
            <div className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
              <span>{unreadN > 0 ? "✉️" : "📩"}</span>
              <span>{formatDate(t.lastMessageAt)}</span>
              {unreadN > 0 ? (
                <span className="ml-auto rounded-full bg-[var(--red)] px-1.5 py-0.5 text-[9px] font-bold text-white">
                  {unreadN}
                </span>
              ) : null}
            </div>
            <div className="mt-1.5 flex items-center gap-2.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-white font-serif text-[14px] text-[var(--green-d)]">
                {other?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={other.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  (other?.name?.[0] ?? "?").toUpperCase()
                )}
              </div>
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-[var(--ink)]">
                {other?.name || "（不明）"}
              </span>
            </div>
            <div className="mt-1.5 text-[11px] text-[var(--muted)]">
              {needsReply ? "未返信" : "返信済み"}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

const WD = ["日", "月", "火", "水", "木", "金", "土"];
function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}年${m}月${day}日（${WD[d.getDay()]}）${hh}:${mm}`;
}
