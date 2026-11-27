/**
 * 【仲間とフォロー】2026-11-27 ユーザー指示
 *   「仲間 ◯◯人　フォロー ◯◯人　というように繋がりは申請型にしてね」。
 *
 * ⚠️⚠️ **仲間は申請型**（申請 → 相手が承認）。⚠️ フォローは片思い（承認なし）。
 * ⚠️⚠️ **カード交換（CardExchange）とは別物**（2026-11-27 ユーザー選択）。
 *    あちらは「いつどこで会ったか」の記録。読み取った時点で成立し、承認は無い。両方残す。
 * ⚠️⚠️ **お気に入り（Favorite）とも別物。** お気に入りは自分だけが見る非公開のしおりで、
 *    人数を相手に見せていない。⚠️ 読み替えると、同意なく人数が見えてしまう。混ぜないこと。
 */
import { prisma } from "@/lib/db";

export type ConnectionState =
  | "self"
  | "none"
  /** 自分が申請して、相手の返事待ち */
  | "pendingOut"
  /** 相手から申請が来ていて、自分が返事する番 */
  | "pendingIn"
  | "friends";

export type ConnectionCounts = { friends: number; following: number; followers: number };

/** 申請に添えるひとことの上限（画面とサーバーの両方で使う） */
export const CONNECT_MESSAGE_MAX = 140;

/** 仲間・フォロー・フォロワーの人数（⚠️ 3つを1往復で数える） */
export async function connectionCounts(memberId: string): Promise<ConnectionCounts> {
  const [friends, following, followers] = await Promise.all([
    prisma.memberConnection.count({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: memberId }, { addresseeId: memberId }],
      },
    }),
    prisma.memberFollow.count({ where: { followerId: memberId } }),
    prisma.memberFollow.count({ where: { followeeId: memberId } }),
  ]);
  return { friends, following, followers };
}

/** 自分から見た、相手との関係 */
export async function connectionState(meId: string, otherId: string): Promise<ConnectionState> {
  if (meId === otherId) return "self";
  // ⚠️⚠️ **両向きを見る。** 申請は requester→addressee の1行なので、
  //    片方だけ調べると「相手から来ている申請」を見落とす。
  const row = await prisma.memberConnection.findFirst({
    where: {
      OR: [
        { requesterId: meId, addresseeId: otherId },
        { requesterId: otherId, addresseeId: meId },
      ],
    },
  });
  if (!row) return "none";
  if (row.status === "ACCEPTED") return "friends";
  return row.requesterId === meId ? "pendingOut" : "pendingIn";
}

/** 自分がその相手をフォローしているか */
export async function isFollowing(meId: string, otherId: string): Promise<boolean> {
  if (meId === otherId) return false;
  const row = await prisma.memberFollow.findUnique({
    where: { followerId_followeeId: { followerId: meId, followeeId: otherId } },
    select: { id: true },
  });
  return Boolean(row);
}

/** 仲間になっている相手の memberId */
export async function friendIds(memberId: string): Promise<string[]> {
  const rows = await prisma.memberConnection.findMany({
    where: { status: "ACCEPTED", OR: [{ requesterId: memberId }, { addresseeId: memberId }] },
    select: { requesterId: true, addresseeId: true },
  });
  return rows.map((r) => (r.requesterId === memberId ? r.addresseeId : r.requesterId));
}

/** 自分がフォローしている相手の memberId */
export async function followingIds(memberId: string): Promise<string[]> {
  const rows = await prisma.memberFollow.findMany({
    where: { followerId: memberId },
    select: { followeeId: true },
  });
  return rows.map((r) => r.followeeId);
}

export type ActResult = { ok: true } | { ok: false; error: string };

/**
 * 仲間になる申請を出す。
 * ⚠️⚠️ **先に逆向きを調べる。** 相手からすでに申請が来ているなら、新しい行を作らず**その場で承認**する。
 *    ⚠️ 作ってしまうと、互いに「返事待ち」の行が1本ずつ残り、どちらからも進めなくなる。
 */
export async function requestConnection(
  tenantId: string,
  meId: string,
  otherId: string,
  message?: string,
): Promise<ActResult> {
  if (meId === otherId) return { ok: false, error: "自分には申請できません。" };
  const existing = await prisma.memberConnection.findFirst({
    where: {
      OR: [
        { requesterId: meId, addresseeId: otherId },
        { requesterId: otherId, addresseeId: meId },
      ],
    },
  });
  if (existing?.status === "ACCEPTED") return { ok: false, error: "すでに仲間です。" };
  if (existing && existing.requesterId === meId) return { ok: false, error: "すでに申請しています。" };
  if (existing) {
    // 相手から来ていた申請を、ここで承認する
    await prisma.memberConnection.update({
      where: { id: existing.id },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    });
    return { ok: true };
  }
  await prisma.memberConnection.create({
    data: {
      tenantId,
      requesterId: meId,
      addresseeId: otherId,
      status: "PENDING",
      message: message?.trim().slice(0, CONNECT_MESSAGE_MAX) || null,
    },
  });
  return { ok: true };
}

/**
 * 届いた申請に返事をする。
 * ⚠️⚠️ **承認も辞退も、自分あて（addresseeId = 自分）の行にしか効かない。**
 *    ⚠️ ここを緩めると、申請した側が自分で承認できてしまう（＝申請型の意味が無くなる）。
 * ⚠️ 辞退は行ごと消す。「断られました」を相手に残さないため。
 */
export async function respondConnection(
  meId: string,
  connectionId: string,
  accept: boolean,
): Promise<ActResult> {
  const row = await prisma.memberConnection.findFirst({
    where: { id: connectionId, addresseeId: meId, status: "PENDING" },
  });
  if (!row) return { ok: false, error: "この申請は見つかりませんでした。" };
  if (accept) {
    await prisma.memberConnection.update({
      where: { id: row.id },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    });
  } else {
    await prisma.memberConnection.delete({ where: { id: row.id } });
  }
  return { ok: true };
}

/** 申請を取り消す（自分が出した申請だけ）／仲間をやめる（どちらからでも） */
export async function removeConnection(meId: string, otherId: string): Promise<ActResult> {
  const row = await prisma.memberConnection.findFirst({
    where: {
      OR: [
        { requesterId: meId, addresseeId: otherId },
        { requesterId: otherId, addresseeId: meId },
      ],
    },
  });
  if (!row) return { ok: false, error: "関係が見つかりませんでした。" };
  // ⚠️ 相手から来ている「返事待ち」を、こちらから消すのは「辞退」にあたる。それは respondConnection の仕事
  if (row.status === "PENDING" && row.requesterId !== meId) {
    return { ok: false, error: "届いている申請は、承認か辞退をお選びください。" };
  }
  await prisma.memberConnection.delete({ where: { id: row.id } });
  return { ok: true };
}

/** フォローする（承認なし）。⚠️ 二重に押されても増えないように upsert */
export async function follow(tenantId: string, meId: string, otherId: string): Promise<ActResult> {
  if (meId === otherId) return { ok: false, error: "自分はフォローできません。" };
  await prisma.memberFollow.upsert({
    where: { followerId_followeeId: { followerId: meId, followeeId: otherId } },
    create: { tenantId, followerId: meId, followeeId: otherId },
    update: {},
  });
  return { ok: true };
}

/** フォローをやめる */
export async function unfollow(meId: string, otherId: string): Promise<ActResult> {
  await prisma.memberFollow.deleteMany({ where: { followerId: meId, followeeId: otherId } });
  return { ok: true };
}

export type PendingRequest = {
  id: string;
  memberId: string;
  name: string;
  role: string | null;
  photoUrl: string | null;
  message: string | null;
  at: Date;
};

/** 自分あてに届いている、返事待ちの申請 */
export async function incomingRequests(meId: string, take = 20): Promise<PendingRequest[]> {
  const rows = await prisma.memberConnection.findMany({
    where: { addresseeId: meId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      requester: {
        select: {
          id: true, name: true, contactName: true, contactRole: true,
          contactPhotoUrl: true, avatarUrl: true,
        },
      },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    memberId: r.requester.id,
    // ⚠️ 会うのは人なので、担当者名があればそちらを先に出す（プロフィール画面と同じ考え方）
    name: r.requester.contactName || r.requester.name,
    role: [r.requester.contactRole, r.requester.name].filter(Boolean).join("　/　") || null,
    // ⚠️⚠️ 顔写真は contactPhotoUrl が先（登壇者の写真はこちらに入る）
    photoUrl: r.requester.contactPhotoUrl ?? r.requester.avatarUrl ?? null,
    message: r.message,
    at: r.createdAt,
  }));
}

/** 自分あてに届いている申請の件数（⚠️ 上の帯のバッジに使う） */
export async function incomingRequestCount(meId: string): Promise<number> {
  return prisma.memberConnection.count({ where: { addresseeId: meId, status: "PENDING" } });
}

/**
 * 【一覧に出す人】2026-11-27 ユーザー指示「ボタンリンクも表示して」。
 * 人数を押したときに出す、仲間／フォロー中／フォロワーの一覧。
 *
 * ⚠️⚠️ **非公開の方（listed=false／未承認）はプロフィールを開けない**
 *    （producers/[id] が notFound にする）。⚠️ リンクにすると行き止まりになるので、
 *    `openable` で分け、押せない行は名前だけ出す。⚠️ 人数からは減らさない（関係はあるので）。
 */
export type PersonRow = {
  memberId: string;
  name: string;
  role: string | null;
  photoUrl: string | null;
  openable: boolean;
};

export type PeopleKind = "friends" | "following" | "followers";

export async function connectionPeople(
  memberId: string,
  kind: PeopleKind,
  take = 200,
): Promise<PersonRow[]> {
  let ids: string[];
  if (kind === "friends") {
    ids = await friendIds(memberId);
  } else if (kind === "following") {
    ids = await followingIds(memberId);
  } else {
    const rows = await prisma.memberFollow.findMany({
      where: { followeeId: memberId },
      select: { followerId: true },
    });
    ids = rows.map((r) => r.followerId);
  }
  if (ids.length === 0) return [];
  const rows = await prisma.member.findMany({
    where: { id: { in: ids.slice(0, take) } },
    select: {
      id: true, name: true, contactName: true, contactRole: true,
      contactPhotoUrl: true, avatarUrl: true, status: true, listed: true,
    },
    orderBy: { name: "asc" },
  });
  return rows.map((r) => ({
    memberId: r.id,
    // ⚠️ 会うのは人なので、担当者名があればそちらを先に出す
    name: r.contactName || r.name,
    role: [r.contactRole, r.name].filter(Boolean).join("　/　") || null,
    // ⚠️⚠️ 顔写真は contactPhotoUrl が先（登壇者の写真はこちらに入る）
    photoUrl: r.contactPhotoUrl ?? r.avatarUrl ?? null,
    openable: r.status === "APPROVED" && r.listed,
  }));
}
