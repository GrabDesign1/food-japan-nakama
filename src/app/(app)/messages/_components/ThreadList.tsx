// メッセージ左ペインのスレッド一覧（2ペインで共通利用）。
import Link from "next/link";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/EmptyState";
import { loadLockedLeadThreadIds, LEAD_LOCKED_TEXT } from "@/lib/lead-unlock";

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

  // スレッドは案件ごとに分かれるため、どの案件のやり取りかを一覧でも示す（2026-08-11）
  const offeringIds = Array.from(
    new Set(threads.map((t) => t.offeringId).filter((v): v is string => !!v))
  );
  const offerings = offeringIds.length
    ? await prisma.offering.findMany({
        where: { id: { in: offeringIds } },
        select: { id: true, title: true, direction: true },
      })
    : [];
  const offeringMap = new Map(offerings.map((o) => [o.id, o]));

  // 未開封のリードは、一覧のプレビューにも本文を出さない
  const locked = await loadLockedLeadThreadIds(meId, threads);

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
        const preview = locked.has(t.id)
          ? LEAD_LOCKED_TEXT
          : last
            ? `${last.senderMemberId === meId ? "自分：" : ""}${last.body || "（ファイル）"}`
            : "（メッセージはまだありません）";
        return (
          <Link
            key={t.id}
            href={`/messages/${t.id}`}
            className={`relative flex items-center gap-3 border-b border-[var(--line-soft)] py-3 pl-5 pr-4 transition ${
              active
                ? "bg-[var(--green-soft)]"
                : unreadN > 0
                  ? "bg-[var(--orange-soft)] hover:bg-[#FFEFE2]"
                  : "hover:bg-[var(--canvas)]"
            }`}
          >
            {/* 未読は左の縦ラインで一目で分かるようにする */}
            {unreadN > 0 ? (
              <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-[var(--red)]" />
            ) : null}
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
                <span
                  className={`min-w-0 flex-1 truncate text-[14px] text-[var(--ink)] ${
                    unreadN > 0 ? "font-bold" : "font-semibold"
                  }`}
                >
                  {other?.name || "（不明）"}
                </span>
                <span
                  className={`shrink-0 text-[11px] ${
                    unreadN > 0 ? "font-bold text-[var(--red)]" : "text-[var(--muted)]"
                  }`}
                >
                  {shortTime(t.lastMessageAt)}
                </span>
              </div>
              {t.offeringId && offeringMap.get(t.offeringId) ? (
                <div className="mt-0.5 flex items-center gap-1">
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${
                      offeringMap.get(t.offeringId)!.direction === "GIVE"
                        ? "bg-[var(--green)]"
                        : "bg-[var(--amber)]"
                    }`}
                  >
                    案件
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--ink-2)]">
                    {offeringMap.get(t.offeringId)!.title || "（無題）"}
                  </span>
                </div>
              ) : null}
              <div className="mt-0.5 flex items-center gap-2">
                <span
                  className={`min-w-0 flex-1 truncate text-[12px] ${
                    unreadN > 0 ? "font-bold text-[var(--ink)]" : "text-[var(--muted)]"
                  }`}
                >
                  {preview}
                </span>
                {unreadN > 0 ? (
                  <span className="shrink-0 rounded-full bg-[var(--red)] px-2 py-0.5 text-[10px] font-bold text-white">
                    新着 {unreadN}
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
