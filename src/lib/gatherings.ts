// 「集まりたい」（2026-11-23）。
//
// なぜ作るか（ユーザー指示 2026-11-23）:
//   「探したい、売りたい、集まりたいを登録するようにすれば良い」「集まりたいも作ろう」
//
// ⚠️ 見えるのは**公開されている承認済み会員すべて**。
//    投稿（みんなの取り組み）は「カードを交換した相手だけ」だが、こちらは違う。
//    集まりは人を増やすための呼びかけなので、つながりの内側に閉じると意味がない。
// ⚠️ 立てられる／手を挙げられるのは、**公開されている承認済み会員だけ**
//    （先行登録したまま非公開の人は、まだ場に出さない）。
// ⚠️ 参加表明は**接触として数える**（card-relationship）。主催と参加者の関係が、
//    手を挙げた時点で生き返る。これが「3か月に1回、何かアクションを取る」の実体になる。
import { prisma } from "@/lib/db";
import {
  GATHERING_TITLE_MAX, GATHERING_BODY_MAX, GATHERING_PLACE_MAX,
  GATHERING_TIMENOTE_MAX, GATHERING_NOTE_MAX, GATHERING_PAGE_SIZE,
} from "@/lib/gathering-core";

export * from "@/lib/gathering-core";

export type GatheringHost = {
  id: string;
  name: string;
  avatarUrl: string | null;
  categoryL1: string;
  prefecture: string | null;
};

export type GatheringJoinView = {
  memberId: string;
  kind: string;
  note: string | null;
  createdAt: Date;
};

export type GatheringView = {
  id: string;
  hostMemberId: string;
  title: string;
  body: string;
  startAt: Date | null;
  timeNote: string | null;
  prefecture: string | null;
  place: string | null;
  capacity: number | null;
  status: string;
  createdAt: Date;
  goingCount: number;
  interestedCount: number;
  /** 自分の表明（していなければ null） */
  myKind: string | null;
};

/** 立てる・手を挙げるができる会員か */
async function isActiveMember(memberId: string): Promise<boolean> {
  const m = await prisma.member.findUnique({
    where: { id: memberId },
    select: { status: true, listed: true },
  });
  return m?.status === "APPROVED" && m.listed === true;
}

function trim(v: string | undefined | null, max: number): string | null {
  const s = (v ?? "").trim().slice(0, max);
  return s || null;
}

export type CreateGatheringInput = {
  title: string;
  body: string;
  startAt?: string | null;
  timeNote?: string | null;
  prefecture?: string | null;
  place?: string | null;
  capacity?: string | null;
};

export async function createGathering(
  me: { id: string; tenantId: string },
  input: CreateGatheringInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!(await isActiveMember(me.id))) {
    return { ok: false, error: "プロフィールが承認されると、集まりを立てられます。" };
  }
  const title = trim(input.title, GATHERING_TITLE_MAX);
  if (!title) return { ok: false, error: "題名を入れてください。" };
  const body = trim(input.body, GATHERING_BODY_MAX);
  if (!body) return { ok: false, error: "どんな集まりかを書いてください。" };

  // 日時は未定でよい。入っていれば形を確かめる
  let startAt: Date | null = null;
  const raw = (input.startAt ?? "").trim();
  if (raw) {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return { ok: false, error: "日時を読み取れませんでした。" };
    startAt = d;
  }

  let capacity: number | null = null;
  const cap = (input.capacity ?? "").trim();
  if (cap) {
    const n = Number(cap);
    if (!Number.isFinite(n) || n < 1 || n > 10000) {
      return { ok: false, error: "人数は1〜10000で入れてください。" };
    }
    capacity = Math.floor(n);
  }

  const g = await prisma.gathering.create({
    data: {
      tenantId: me.tenantId,
      hostMemberId: me.id,
      title,
      body,
      startAt,
      timeNote: trim(input.timeNote, GATHERING_TIMENOTE_MAX),
      prefecture: trim(input.prefecture, 20),
      place: trim(input.place, GATHERING_PLACE_MAX),
      capacity,
    },
    select: { id: true },
  });
  return { ok: true, id: g.id };
}

/** 公開されている会員が立てた集まりだけを返す */
async function visibleHostIds(tenantId: string): Promise<string[]> {
  const rows = await prisma.member.findMany({
    where: { tenantId, status: "APPROVED", listed: true },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

export type ListGatheringOpts = {
  /** 終わったもの・締め切ったものも出すか */
  includeClosed?: boolean;
  prefecture?: string | null;
  take?: number;
};

export async function listGatherings(
  me: { id: string; tenantId: string },
  opts: ListGatheringOpts = {}
): Promise<{ items: GatheringView[]; hosts: GatheringHost[] }> {
  const hostIds = await visibleHostIds(me.tenantId);
  const rows = await prisma.gathering.findMany({
    where: {
      tenantId: me.tenantId,
      deletedAt: null,
      hostMemberId: { in: hostIds },
      ...(opts.includeClosed ? {} : { status: "open" }),
      ...(opts.prefecture ? { prefecture: opts.prefecture } : {}),
    },
    // 日程が決まっているものを先に、近い順。未定は後ろへ
    orderBy: [{ startAt: "asc" }, { createdAt: "desc" }],
    take: Math.min(opts.take ?? GATHERING_PAGE_SIZE, 100),
    select: {
      id: true, hostMemberId: true, title: true, body: true,
      startAt: true, timeNote: true, prefecture: true, place: true,
      capacity: true, status: true, createdAt: true,
      joins: { select: { memberId: true, kind: true } },
    },
  });

  const items: GatheringView[] = rows.map((r) => ({
    id: r.id,
    hostMemberId: r.hostMemberId,
    title: r.title,
    body: r.body,
    startAt: r.startAt,
    timeNote: r.timeNote,
    prefecture: r.prefecture,
    place: r.place,
    capacity: r.capacity,
    status: r.status,
    createdAt: r.createdAt,
    goingCount: r.joins.filter((j) => j.kind === "going").length,
    interestedCount: r.joins.filter((j) => j.kind === "interested").length,
    myKind: r.joins.find((j) => j.memberId === me.id)?.kind ?? null,
  }));

  const ids = [...new Set(items.map((i) => i.hostMemberId))];
  const hosts = ids.length
    ? await prisma.member.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, avatarUrl: true, categoryL1: true, prefecture: true },
      })
    : [];

  return { items, hosts };
}

/** 1件の詳細（参加者つき） */
export async function getGathering(
  me: { id: string; tenantId: string },
  id: string
): Promise<
  | { ok: true; item: GatheringView; host: GatheringHost | null; joins: GatheringJoinView[]; members: GatheringHost[] }
  | { ok: false }
> {
  const r = await prisma.gathering.findFirst({
    where: { id, tenantId: me.tenantId, deletedAt: null },
    select: {
      id: true, hostMemberId: true, title: true, body: true,
      startAt: true, timeNote: true, prefecture: true, place: true,
      capacity: true, status: true, createdAt: true,
      joins: {
        orderBy: { createdAt: "asc" },
        select: { memberId: true, kind: true, note: true, createdAt: true },
      },
    },
  });
  if (!r) return { ok: false };

  // 主催が非公開に戻されていたら見せない
  if (r.hostMemberId !== me.id && !(await isActiveMember(r.hostMemberId))) return { ok: false };

  const item: GatheringView = {
    ...r,
    goingCount: r.joins.filter((j) => j.kind === "going").length,
    interestedCount: r.joins.filter((j) => j.kind === "interested").length,
    myKind: r.joins.find((j) => j.memberId === me.id)?.kind ?? null,
  };

  const ids = [...new Set([r.hostMemberId, ...r.joins.map((j) => j.memberId)])];
  const members = await prisma.member.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, avatarUrl: true, categoryL1: true, prefecture: true },
  });

  return {
    ok: true,
    item,
    host: members.find((m) => m.id === r.hostMemberId) ?? null,
    joins: r.joins,
    members,
  };
}

/**
 * 手を挙げる・変える・下ろす。
 * 戻り値の joined は「いま表明している種類」。null なら下ろした。
 * ⚠️ 下ろしたときに関係の点を減らさない（押し直しで数字が上下すると記録にならない）。
 */
export async function setJoin(
  me: { id: string; tenantId: string },
  gatheringId: string,
  kind: string | null,
  note?: string
): Promise<{ ok: true; joined: string | null; hostMemberId: string; firstTime: boolean } | { ok: false; error: string }> {
  if (!(await isActiveMember(me.id))) {
    return { ok: false, error: "プロフィールが承認されると、手を挙げられます。" };
  }
  const g = await prisma.gathering.findFirst({
    where: { id: gatheringId, tenantId: me.tenantId, deletedAt: null },
    select: { hostMemberId: true, status: true },
  });
  if (!g) return { ok: false, error: "この集まりは見つかりませんでした。" };
  if (g.status !== "open" && kind) return { ok: false, error: "この集まりは締め切られています。" };

  const existing = await prisma.gatheringJoin.findUnique({
    where: { gatheringId_memberId: { gatheringId, memberId: me.id } },
    select: { id: true },
  });

  if (!kind) {
    if (existing) await prisma.gatheringJoin.delete({ where: { id: existing.id } });
    return { ok: true, joined: null, hostMemberId: g.hostMemberId, firstTime: false };
  }
  if (kind !== "going" && kind !== "interested") {
    return { ok: false, error: "表明の種類が正しくありません。" };
  }

  const trimmedNote = trim(note, GATHERING_NOTE_MAX);
  if (existing) {
    await prisma.gatheringJoin.update({
      where: { id: existing.id },
      data: { kind, note: trimmedNote },
    });
  } else {
    await prisma.gatheringJoin.create({
      data: { gatheringId, memberId: me.id, kind, note: trimmedNote },
    });
  }
  return { ok: true, joined: kind, hostMemberId: g.hostMemberId, firstTime: !existing };
}

/** 主催が状態を変える（締め切る・終わった・戻す） */
export async function setGatheringStatus(
  memberId: string,
  gatheringId: string,
  status: string
): Promise<boolean> {
  if (!["open", "closed", "done"].includes(status)) return false;
  const r = await prisma.gathering.updateMany({
    where: { id: gatheringId, hostMemberId: memberId, deletedAt: null },
    data: { status },
  });
  return r.count > 0;
}

/** 主催が消す（論理削除） */
export async function deleteGathering(memberId: string, gatheringId: string): Promise<boolean> {
  const r = await prisma.gathering.updateMany({
    where: { id: gatheringId, hostMemberId: memberId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return r.count > 0;
}
