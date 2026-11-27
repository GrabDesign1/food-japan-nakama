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
 * ⚠️ 吹き出しに読み込む件数。
 * ⚠️⚠️ **絞り込み（未読・案件）と検索は、この読み込んだ分の中でやる**（2026-11-27）——
 *    ⚠️ 打つたびにサーバーへ行かせない。足りなければ「すべて見る」で一覧へ。
 * ⚠️⚠️ **export しない**——`"use server"` のファイルから出せるのは async 関数だけ（⚠️ ビルドが落ちる）。
 */
const PEEK_TAKE = 30;

export type PeekRow = {
  id: string;
  name: string;
  avatarUrl: string | null;
  preview: string;
  /** ⚠️ サーバーで文字にする（⚠️⚠️ 画面で日付を組み立てると、最初の描き直しで食い違う） */
  timeLabel: string;
  unread: number;
  /** 案件（売りたい・探している）に紐づくやり取りか。⚠️ 「案件」タブの絞り込みに使う */
  hasOffering: boolean;
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
      /**
       * ⚠️⚠️ **顔写真は `contactPhotoUrl` が先**（2026-11-27 ユーザーご指摘
       *    「登壇者は既にアイコンがあるはずなのでそれを使ってね」）。
       *    ⚠️ 登壇者の顔写真は Onegaizar から `contactPhotoUrl` に入る（`onegaizar-sync.ts`）。
       *      ⚠️⚠️ `avatarUrl` だけを見ると、**登壇者が全員「頭文字」で出る**。
       *    ⚠️ 他の画面（/producers・/summit・ホーム）も `contactPhotoUrl ?? avatarUrl` の順。
       */
      select: { id: true, name: true, avatarUrl: true, contactPhotoUrl: true },
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
      avatarUrl: other?.contactPhotoUrl ?? other?.avatarUrl ?? null,
      preview: locked.has(t.id)
        ? LEAD_LOCKED_TEXT
        : last
          ? `${last.senderMemberId === meId ? "自分：" : ""}${last.body || "（ファイル）"}`
          : "（メッセージはまだありません）",
      timeLabel: agoLabel(t.lastMessageAt),
      unread: unreadMap.get(t.id) ?? 0,
      hasOffering: Boolean(t.offeringId),
    };
  });
}

/**
 * 「3分」「35分」「13時間」「3日」——1週間を過ぎたら月/日。
 * ⚠️ 2026-11-27、ユーザーご指示の見本（Messenger）に合わせた。
 * ⚠️ 一覧（`ThreadList`）は今までどおり時刻・月/日のまま（⚠️ あちらは指示が無いので触っていない）。
 */
function agoLabel(d: Date): string {
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}時間`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}日`;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}/${p(d.getDate())}`;
}
