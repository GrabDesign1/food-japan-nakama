// 本人に「このサービス、使いますか？」と聞く仕組み（2026-11-23）。
//
// なぜ作るか（ユーザー指示 2026-11-23）:
//   「移動させておいて、利用するかは、本人の承諾を得る方法が望ましい」
//   「サービスが出来ました、利用しますか？ はい、入れる／いいえ、入れない」
//
// ⚠️⚠️ **預かるが、使わない。**
//    事務局が先に登録した会員（listed:false）は、本人が「はい」と言うまで
//    検索・プロフィール・メッセージの送り先・台帳の相手候補のどこにも出ない。
// ⚠️⚠️ **「いいえ」のときは、その行を消す。**
//    消すからこそ「いったん預かる」が許される。残すなら最初から預からない。
// ⚠️ 送るのは1回だけ。返事が無い人に催促しない（同意なき勧誘になる）。
// ⚠️ 電話番号は、そもそもここには入っていない（イベント側の決まりを守る）。
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

/** 招待の合言葉。メールのリンクに入るので、総当たりできない長さにする */
function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export type InviteTarget = {
  id: string;
  name: string;
  contactName: string | null;
  email: string;
};

/**
 * まだ招待していない先行登録の会員を取り出す。
 * ⚠️ メールが無い人・すでに送った人・すでに答えた人・本人がログインを持っている人は外す。
 */
export async function listInvitable(tenantId: string, take = 500): Promise<InviteTarget[]> {
  const rows = await prisma.member.findMany({
    where: {
      tenantId,
      listed: false,
      preregEmail: { not: null },
      inviteSentAt: null,
      inviteAnswer: null,
      users: { none: {} },
    },
    select: { id: true, name: true, contactName: true, preregEmail: true },
    orderBy: { preregAt: "asc" },
    take,
  });
  return rows.flatMap((r) =>
    r.preregEmail ? [{ id: r.id, name: r.name, contactName: r.contactName, email: r.preregEmail }] : []
  );
}

/**
 * 招待の合言葉を発行する（まだ送らない）。
 * ⚠️ すでに答えた人には発行しない。すでに送った人には同じ合言葉を返す（2通目を作らない）。
 */
export async function issueInviteToken(tenantId: string, memberId: string): Promise<string | null> {
  const m = await prisma.member.findFirst({
    where: { tenantId, id: memberId, listed: false, users: { none: {} } },
    select: { id: true, inviteToken: true, inviteAnswer: true, preregEmail: true },
  });
  if (!m || m.inviteAnswer || !m.preregEmail) return null;
  if (m.inviteToken) return m.inviteToken;

  const token = newToken();
  await prisma.member.update({ where: { id: m.id }, data: { inviteToken: token } });
  return token;
}

/** 送った印をつける */
export async function markInviteSent(memberId: string): Promise<void> {
  await prisma.member.update({ where: { id: memberId }, data: { inviteSentAt: new Date() } });
}

export type InviteView = {
  memberId: string;
  name: string;
  contactName: string | null;
  contactRole: string | null;
  prefecture: string | null;
  categoryL1: string;
  /** 伏せたメール（本人確認のため。全部は出さない） */
  maskedEmail: string;
  answered: "yes" | "no" | null;
};

/** メールの「お名前 ○○ さま」に出す程度に伏せる（a***@example.com） */
function maskEmail(e: string): string {
  const at = e.indexOf("@");
  if (at <= 0) return "***";
  return `${e[0]}***${e.slice(at)}`;
}

/**
 * 合言葉から、聞く相手を引く。
 * ⚠️ 見つからなければ null（期限切れや、もう消した人）。
 */
export async function findByInviteToken(token: string): Promise<InviteView | null> {
  if (!token || token.length < 20) return null;
  const m = await prisma.member.findUnique({
    where: { inviteToken: token },
    select: {
      id: true, name: true, contactName: true, contactRole: true,
      prefecture: true, categoryL1: true, preregEmail: true, inviteAnswer: true,
    },
  });
  if (!m || !m.preregEmail) return null;
  return {
    memberId: m.id,
    name: m.name,
    contactName: m.contactName,
    contactRole: m.contactRole,
    prefecture: m.prefecture,
    categoryL1: m.categoryL1,
    maskedEmail: maskEmail(m.preregEmail),
    answered: m.inviteAnswer === "yes" ? "yes" : m.inviteAnswer === "no" ? "no" : null,
  };
}

/**
 * 「はい、使います」。
 * ⚠️ ここではまだ公開しない。本人がアカウントを作って、プロフィールを出すところまでが「使う」。
 *    合言葉は残す（続きの登録で同じ行につなぐため）。
 */
export async function acceptInvite(token: string): Promise<{ ok: boolean; email?: string }> {
  const m = await prisma.member.findUnique({
    where: { inviteToken: token },
    select: { id: true, inviteAnswer: true, preregEmail: true },
  });
  if (!m || m.inviteAnswer === "no" || !m.preregEmail) return { ok: false };
  if (m.inviteAnswer !== "yes") {
    await prisma.member.update({
      where: { id: m.id },
      data: { inviteAnswer: "yes", inviteAnsweredAt: new Date() },
    });
  }
  return { ok: true, email: m.preregEmail };
}

/**
 * 「いいえ、使いません」。
 * ⚠️⚠️ **行ごと消す。** 「断った人」として持ち続けない。
 * ⚠️ 消してよいのは、事務局が先に登録しただけの行（本人のログインが無い・非公開）に限る。
 *    本人が使っている会員を、リンク1つで消せてはいけない。
 */
export async function declineInvite(token: string): Promise<boolean> {
  const m = await prisma.member.findUnique({
    where: { inviteToken: token },
    select: { id: true, preregAt: true, listed: true, _count: { select: { users: true } } },
  });
  if (!m) return false;
  if (m.listed || m._count.users > 0 || !m.preregAt) return false;

  await prisma.member.delete({ where: { id: m.id } });
  return true;
}

export type InviteSummary = {
  /** まだ送っていない（メールがある人） */
  invitable: number;
  /** 送った */
  sent: number;
  /** 「はい」 */
  yes: number;
  /** メールが無くて送れない */
  noEmail: number;
};

export async function inviteSummary(tenantId: string): Promise<InviteSummary> {
  const base = { tenantId, listed: false, users: { none: {} } } as const;
  const [invitable, sent, yes, noEmail] = await Promise.all([
    prisma.member.count({
      where: { ...base, preregEmail: { not: null }, inviteSentAt: null, inviteAnswer: null },
    }),
    prisma.member.count({ where: { ...base, inviteSentAt: { not: null } } }),
    prisma.member.count({ where: { ...base, inviteAnswer: "yes" } }),
    prisma.member.count({ where: { ...base, preregEmail: null, preregAt: { not: null } } }),
  ]);
  // ⚠️ 「いいえ」は数えない。行ごと消しているので、そもそも残っていない
  return { invitable, sent, yes, noEmail };
}

/** 1回に送る上限。⚠️ 少しずつ送る。止めたくなったときに止められるようにする */
export const INVITE_BATCH = 25;
