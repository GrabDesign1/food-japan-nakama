"use server";

/**
 * 上部バーのメッセージの吹き出しを開いたときだけ読む、直近のやり取り。
 *
 * ⚠️⚠️ **開いたときに読む**（2026-11-27）——レイアウトで毎回読むと、
 *    開かない人のぶんまで全ページに1クエリ増える。
 * ⚠️⚠️⚠️ **本文を出す画面は必ず `loadLockedLeadThreadIds()` を通す**（lead-unlock.ts の決まり）。
 *    ⚠️ ここは一覧と同じ「未開封」の伏せ字にする。1画面でも漏れると課金が無意味になる。
 * ⚠️ 規約17条（通信の秘密）——本文は出すだけ。要約も判定も **AI に通さない**。
 */

import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LEAD_LOCKED_TEXT, loadLockedLeadThreadIds } from "@/lib/lead-unlock";

/**
 * ⚠️ 吹き出しに出す件数。続きは「すべて見る」で一覧へ。
 * ⚠️⚠️ **export しない**——`"use server"` のファイルから出せるのは async 関数だけ（⚠️ ビルドが落ちる）。
 */
const PEEK_TAKE = 8;

export type PeekRow = {
  id: string;
  name: string;
  avatarUrl: string | null;
  preview: string;
  /** ⚠️ サーバーで文字にする（⚠️⚠️ 画面で日付を組み立てると、最初の描き直しで食い違う） */
  timeLabel: string;
  unread: number;
};

export async function loadMessagePeek(): Promise<PeekRow[]> {
  // ⚠️⚠️ Server Action は誰でも叩ける。⚠️ 見せるのは「いまログインしている本人の分」だけ
  const su = await getSessionUser();
  const meId = su?.app.memberId;
  if (!meId) return [];

  const threads = await prisma.thread.findMany({
    where: { OR: [{ fromMemberId: meId }, { toMemberId: meId }] },
    orderBy: { lastMessageAt: "desc" },
    take: PEEK_TAKE,
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (threads.length === 0) return [];

  const otherIds = Array.from(
    new Set(threads.map((t) => (t.fromMemberId === meId ? t.toMemberId : t.fromMemberId))),
  );
  const [members, unread, locked] = await Promise.all([
    prisma.member.findMany({
      where: { id: { in: otherIds } },
      select: { id: true, name: true, avatarUrl: true },
    }),
    prisma.message.groupBy({
      by: ["threadId"],
      where: {
        threadId: { in: threads.map((t) => t.id) },
        senderMemberId: { not: meId },
        readAt: null,
      },
      _count: { _all: true },
    }),
    loadLockedLeadThreadIds(meId, threads),
  ]);
  const byId = new Map(members.map((m) => [m.id, m]));
  const unreadMap = new Map(unread.map((g) => [g.threadId, g._count._all]));

  return threads.map((t) => {
    const other = byId.get(t.fromMemberId === meId ? t.toMemberId : t.fromMemberId);
    const last = t.messages[0];
    return {
      id: t.id,
      name: other?.name || "（不明）",
      avatarUrl: other?.avatarUrl ?? null,
      preview: locked.has(t.id)
        ? LEAD_LOCKED_TEXT
        : last
          ? `${last.senderMemberId === meId ? "自分：" : ""}${last.body || "（ファイル）"}`
          : "（メッセージはまだありません）",
      timeLabel: shortTime(t.lastMessageAt),
      unread: unreadMap.get(t.id) ?? 0,
    };
  });
}

/** 今日なら時刻、それ以外は月/日（⚠️ 一覧（ThreadList）と同じ見え方にそろえる） */
function shortTime(d: Date): string {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  return sameDay ? `${p(d.getHours())}:${p(d.getMinutes())}` : `${p(d.getMonth() + 1)}/${p(d.getDate())}`;
}
