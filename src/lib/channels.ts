/**
 * 【チャンネル】2026-11-27 ユーザー指示「Slack相当の5機能」。
 *
 * ⚠️⚠️ **チャンネルは「場」であって、商談の記録ではない。**
 *    価格や取引条件の具体的な話は商談（1対1）へ移してもらう。画面にもその一文を出すこと。
 * ⚠️⚠️ **スレッド（threads）の表に相乗りさせていない。** 既存の問い合わせ63か所が
 *    from/to で絞っているため、混ぜると1か所漏らしただけで他人の商談一覧にチャンネルが出る。
 *
 * 公開範囲（あとから広げられない。UIでも「狭いほうから選ぶ」と出す）
 *   INVITE  … 招いた人だけが読める
 *   MEMBERS … ログインした会員なら誰でも読める・参加できる
 *   PUBLIC  … ↑に加えて、ログインしていない人にも見せる
 *             ⚠️ **公開ページはまだ作っていない。** いまは MEMBERS と同じ見え方になる。
 *             ⚠️ だから作成画面では PUBLIC を選ばせていない（`SELECTABLE_VISIBILITY`）。
 */
import { prisma } from "@/lib/db";

export type Visibility = "INVITE" | "MEMBERS" | "PUBLIC";

export const VISIBILITY_LABEL: Record<Visibility, string> = {
  INVITE: "招待制",
  MEMBERS: "会員のみ",
  PUBLIC: "公開",
};

export const VISIBILITY_NOTE: Record<Visibility, string> = {
  INVITE: "招いた人だけが読めます。いちばん狭い設定です。",
  MEMBERS: "NAKAMAにログインした会員が読めます。検索には出ません。",
  PUBLIC: "ログインしていない人にも読まれます。検索結果にも出ます。",
};

/**
 * 作成画面で選ばせる公開範囲。⚠️ **狭いほうから並べる**（押し間違いで広く公開しないため）。
 * ⚠️⚠️ PUBLIC を入れていないのは、ログイン無しで読む公開ページをまだ作っていないから。
 *    入れると「公開」と書いてあるのに公開されない、という嘘になる。作ったらここに足す。
 */
export const SELECTABLE_VISIBILITY: Visibility[] = ["INVITE", "MEMBERS"];

export type ChannelRow = {
  id: string;
  name: string;
  description: string | null;
  visibility: Visibility;
  memberCount: number;
  postCount: number;
  joined: boolean;
  lastPostAt: Date | null;
  /** 自分あての、まだ読んでいない呼びかけ（＠）の数 */
  unreadMentions: number;
};

/** 自分が読めるチャンネルかどうか。⚠️ 招待制は参加者だけ。 */
export function canRead(visibility: Visibility, joined: boolean): boolean {
  return visibility !== "INVITE" || joined;
}

/** 書けるのは参加している人だけ（読めるかどうかとは別）。 */
export function canPost(joined: boolean): boolean {
  return joined;
}

/** 一覧に出すチャンネル（自分が読めるものだけ）。 */
export async function listChannels(tenantId: string, memberId: string): Promise<ChannelRow[]> {
  const rows = await prisma.channel.findMany({
    where: {
      tenantId,
      archivedAt: null,
      // ⚠️ 招待制は、自分が参加しているものだけ出す（存在そのものを見せない）
      OR: [{ visibility: { in: ["MEMBERS", "PUBLIC"] } }, { members: { some: { memberId } } }],
    },
    select: {
      id: true,
      name: true,
      description: true,
      visibility: true,
      _count: { select: { members: true, posts: true } },
      members: { where: { memberId }, select: { id: true } },
      posts: {
        where: { parentPostId: null, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // 自分あての未読の呼びかけを、チャンネルごとに数える
  const mentions = await prisma.channelPostMention.findMany({
    where: { memberId, readAt: null },
    select: { post: { select: { channelId: true } } },
  });
  const mentionCount = new Map<string, number>();
  for (const m of mentions) {
    const k = m.post.channelId;
    mentionCount.set(k, (mentionCount.get(k) ?? 0) + 1);
  }

  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    visibility: c.visibility as Visibility,
    memberCount: c._count.members,
    postCount: c._count.posts,
    joined: c.members.length > 0,
    lastPostAt: c.posts[0]?.createdAt ?? null,
    unreadMentions: mentionCount.get(c.id) ?? 0,
  }));
}

export type ChannelPostRow = {
  id: string;
  body: string;
  createdAt: Date;
  memberId: string;
  name: string;
  avatarUrl: string | null;
  mine: boolean;
  reactions: { emoji: string; count: number; mine: boolean }[];
  replies: { id: string; body: string; createdAt: Date; name: string; mine: boolean }[];
};

/** チャンネルの発言（本文に出すのは親だけ。返信はぶら下げる）。 */
export async function listPosts(channelId: string, meId: string): Promise<ChannelPostRow[]> {
  const posts = await prisma.channelPost.findMany({
    where: { channelId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      body: true,
      createdAt: true,
      memberId: true,
      parentPostId: true,
      member: { select: { name: true, contactName: true, contactPhotoUrl: true, avatarUrl: true } },
      reactions: { select: { emoji: true, memberId: true } },
    },
  });

  const nameOf = (m: (typeof posts)[number]["member"]) => m.contactName || m.name;
  const repliesByParent = new Map<string, ChannelPostRow["replies"]>();
  for (const p of posts) {
    if (!p.parentPostId) continue;
    const list = repliesByParent.get(p.parentPostId) ?? [];
    list.push({
      id: p.id,
      body: p.body,
      createdAt: p.createdAt,
      name: nameOf(p.member),
      mine: p.memberId === meId,
    });
    repliesByParent.set(p.parentPostId, list);
  }

  return posts
    .filter((p) => !p.parentPostId)
    .map((p) => {
      const byEmoji = new Map<string, { count: number; mine: boolean }>();
      for (const r of p.reactions) {
        const cur = byEmoji.get(r.emoji) ?? { count: 0, mine: false };
        cur.count += 1;
        if (r.memberId === meId) cur.mine = true;
        byEmoji.set(r.emoji, cur);
      }
      return {
        id: p.id,
        body: p.body,
        createdAt: p.createdAt,
        memberId: p.memberId,
        name: nameOf(p.member),
        // ⚠️⚠️ 顔写真は contactPhotoUrl → avatarUrl の順（2026-11-27 の指摘と同じ）
        avatarUrl: p.member.contactPhotoUrl ?? p.member.avatarUrl ?? null,
        mine: p.memberId === meId,
        reactions: [...byEmoji.entries()].map(([emoji, v]) => ({ emoji, ...v })),
        replies: repliesByParent.get(p.id) ?? [],
      };
    });
}

/**
 * 本文から「＠名前」を拾って、チャンネルの参加者と突き合わせる。
 * ⚠️⚠️ **鳴らすのはこれだけ。** 普通の新着では通知しない（設計の「数える」段）。
 * ⚠️ 長い名前から先に照合する（「＠山田」が「＠山田食品」を食べてしまわないように）。
 * ⚠️ 自分自身への呼びかけは数えない。
 */
export async function findMentionedMemberIds(
  channelId: string,
  body: string,
  authorId: string,
): Promise<string[]> {
  if (!body.includes("@") && !body.includes("＠")) return [];
  const members = await prisma.channelMember.findMany({
    where: { channelId },
    select: { memberId: true, member: { select: { name: true, contactName: true } } },
  });
  const candidates = members
    .filter((m) => m.memberId !== authorId)
    .flatMap((m) =>
      [m.member.contactName, m.member.name]
        .filter((n): n is string => !!n && n.length >= 2)
        .map((n) => ({ memberId: m.memberId, name: n })),
    )
    .sort((a, b) => b.name.length - a.name.length);

  const hit = new Set<string>();
  for (const c of candidates) {
    if (body.includes(`@${c.name}`) || body.includes(`＠${c.name}`)) hit.add(c.memberId);
  }
  return [...hit];
}
