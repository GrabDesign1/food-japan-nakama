// 事務局：コミュニティの状態とお金の状態を、同じ画面で見るための集計（2026-11-23）。
//
// なぜ作るか（ユーザー指示 2026-11-23）:
//   「まずは事務局をここで成り立たせるように、管理画面の整備をしてほしい」
//   「NAKAMAを仲間であり続けるための仕組みと、マネタイズの仕組みを両立させてほしい」
//
// ⚠️⚠️ **両立とは、2つを並べて見ることではない。**
//    「よく交わっている人」と「お金を払っている人」が**ズレているところ**が、
//    事務局の手当ての場所になる。だから同じ画面に、同じ会員の軸で並べる。
//      ・交わっているのに払っていない  → 価値は届いている。課金の話ができる
//      ・払っているのに交わっていない  → **いちばん危ない**。次の更新で辞める
//
// ⚠️ 数字は「今週・今月やることを決める」ためだけに出す。
//    会員本人に点数を見せる画面ではない（相手を数字で見せない、という決まりは守る）。
// ⚠️ 事務局だけが見る。呼ぶ側で requireAdmin() を通すこと。
import { prisma } from "@/lib/db";
import { currentStrength, isAlive, ALIVE_THRESHOLD } from "@/lib/card-relationship";
import { decayResistance } from "@/lib/card-context";

const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * DAY);
const inDays = (days: number) => new Date(Date.now() + days * DAY);

/** 会員が「交わっている」とみなす期間（この間に何かしていれば動いている） */
export const ACTIVE_WINDOW_DAYS = 30;
/** 「黙っている」とみなす期間 */
export const SILENT_DAYS = 60;
/** クレジットを持っているのに使っていない、とみなす期間 */
export const UNUSED_CREDIT_DAYS = 90;
/** 失効が近い、とみなす残り日数 */
export const EXPIRING_SOON_DAYS = 30;

export type Pulse = {
  posts7: number; posts30: number;
  comments7: number; likes7: number;
  gatherings7: number; gatheringsOpen: number;
  joins7: number;
  exchanges7: number; exchanges30: number;
  messages7: number;
};

/** 今週・今月、場がどれだけ動いたか */
export async function communityPulse(tenantId: string): Promise<Pulse> {
  const d7 = ago(7);
  const d30 = ago(30);
  const [
    posts7, posts30, comments7, likes7,
    gatherings7, gatheringsOpen, joins7,
    exchanges7, exchanges30, messages7,
  ] = await Promise.all([
    prisma.post.count({ where: { tenantId, deletedAt: null, createdAt: { gte: d7 } } }),
    prisma.post.count({ where: { tenantId, deletedAt: null, createdAt: { gte: d30 } } }),
    prisma.postComment.count({ where: { deletedAt: null, createdAt: { gte: d7 }, post: { tenantId } } }),
    prisma.postLike.count({ where: { createdAt: { gte: d7 }, post: { tenantId } } }),
    prisma.gathering.count({ where: { tenantId, deletedAt: null, createdAt: { gte: d7 } } }),
    prisma.gathering.count({ where: { tenantId, deletedAt: null, status: "open" } }),
    prisma.gatheringJoin.count({ where: { createdAt: { gte: d7 }, gathering: { tenantId } } }),
    prisma.cardExchange.count({ where: { createdAt: { gte: d7 } } }),
    prisma.cardExchange.count({ where: { createdAt: { gte: d30 } } }),
    prisma.message.count({ where: { createdAt: { gte: d7 }, thread: { tenantId } } }),
  ]);
  return {
    posts7, posts30, comments7, likes7,
    gatherings7, gatheringsOpen, joins7,
    exchanges7, exchanges30, messages7,
  };
}

export type RelationHealth = {
  pairs: number;
  alive: number;
  fading: number;
  cold: number;
  /** 生きている割合（0〜100）。母数が0なら null */
  alivePercent: number | null;
};

/**
 * 関係の健康。
 * ⚠️ 強さは保存されていない（その都度計算する決まり）。行を全部読んで計算する。
 *    会員30人なら最大435行なので、全件読んで構わない。
 *    数千人規模になったら、日次で集計表に落とすこと。
 */
export async function relationHealth(tenantId: string): Promise<RelationHealth> {
  const rows = await prisma.relationship.findMany({
    where: { tenantId },
    select: { strengthAtLastContact: true, lastContactAt: true, contextCodes: true },
    take: 20000,
  });
  const now = new Date();
  let alive = 0, fading = 0, cold = 0;
  for (const r of rows) {
    const s = currentStrength(
      r.strengthAtLastContact, r.lastContactAt, now, decayResistance(r.contextCodes)
    );
    if (isAlive(s)) alive++;
    else if (s >= 5) fading++;
    else cold++;
  }
  return {
    pairs: rows.length,
    alive, fading, cold,
    alivePercent: rows.length ? Math.round((alive / rows.length) * 100) : null,
  };
}

export type MemberRow = {
  id: string;
  name: string;
  prefecture: string | null;
  paymentStatus: string;
  /** 直近30日の動き（投稿・コメント・いいね・手挙げの合計） */
  actions30: number;
  /** 最後に何かした日 */
  lastActionAt: Date | null;
  /** いま持っているクレジット */
  credits: number;
};

/**
 * 会員ごとの「交わり」と「お金」を1行にまとめる。
 * ⚠️ これが両立の肝。別々の画面に分けると、ズレが見えない。
 */
export async function memberMatrix(tenantId: string): Promise<MemberRow[]> {
  const since = ago(ACTIVE_WINDOW_DAYS);

  const members = await prisma.member.findMany({
    where: { tenantId, status: "APPROVED", listed: true },
    select: { id: true, name: true, prefecture: true, paymentStatus: true },
    orderBy: { name: "asc" },
    take: 2000,
  });
  if (members.length === 0) return [];
  const ids = members.map((m) => m.id);

  // それぞれの動きを、件数だけまとめて数える
  const [posts, comments, likes, joins, lastPost, lastComment, lastJoin, credits] = await Promise.all([
    prisma.post.groupBy({
      by: ["authorMemberId"],
      where: { tenantId, deletedAt: null, createdAt: { gte: since }, authorMemberId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.postComment.groupBy({
      by: ["authorMemberId"],
      where: { deletedAt: null, createdAt: { gte: since }, authorMemberId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.postLike.groupBy({
      by: ["memberId"],
      where: { createdAt: { gte: since }, memberId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.gatheringJoin.groupBy({
      by: ["memberId"],
      where: { createdAt: { gte: since }, memberId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.post.groupBy({
      by: ["authorMemberId"],
      where: { tenantId, deletedAt: null, authorMemberId: { in: ids } },
      _max: { createdAt: true },
    }),
    prisma.postComment.groupBy({
      by: ["authorMemberId"],
      where: { deletedAt: null, authorMemberId: { in: ids } },
      _max: { createdAt: true },
    }),
    prisma.gatheringJoin.groupBy({
      by: ["memberId"],
      where: { memberId: { in: ids } },
      _max: { createdAt: true },
    }),
    // クレジット残＝台帳の合計（正=付与・負=消費）
    prisma.contactCreditLedger.groupBy({
      by: ["memberId"],
      where: { tenantId, memberId: { in: ids } },
      _sum: { quantity: true },
    }),
  ]);

  const pick = <T extends Record<string, unknown>>(rows: T[], idField: string, id: string) =>
    rows.find((r) => r[idField] === id);

  return members.map((m) => {
    const a =
      (pick(posts as never[], "authorMemberId", m.id) as { _count: { _all: number } } | undefined)?._count._all ?? 0;
    const b =
      (pick(comments as never[], "authorMemberId", m.id) as { _count: { _all: number } } | undefined)?._count._all ?? 0;
    const c =
      (pick(likes as never[], "memberId", m.id) as { _count: { _all: number } } | undefined)?._count._all ?? 0;
    const d =
      (pick(joins as never[], "memberId", m.id) as { _count: { _all: number } } | undefined)?._count._all ?? 0;

    const dates = [
      (pick(lastPost as never[], "authorMemberId", m.id) as { _max: { createdAt: Date | null } } | undefined)?._max.createdAt,
      (pick(lastComment as never[], "authorMemberId", m.id) as { _max: { createdAt: Date | null } } | undefined)?._max.createdAt,
      (pick(lastJoin as never[], "memberId", m.id) as { _max: { createdAt: Date | null } } | undefined)?._max.createdAt,
    ].filter((x): x is Date => !!x);

    return {
      id: m.id,
      name: m.name,
      prefecture: m.prefecture,
      paymentStatus: m.paymentStatus,
      actions30: a + b + c + d,
      lastActionAt: dates.length ? new Date(Math.max(...dates.map((x) => x.getTime()))) : null,
      credits:
        (pick(credits as never[], "memberId", m.id) as { _sum: { quantity: number | null } } | undefined)?._sum
          .quantity ?? 0,
    };
  });
}

export type Attention = {
  /** 払っているのに交わっていない＝いちばん危ない */
  payingButQuiet: MemberRow[];
  /** 交わっているのに払っていない＝課金の話ができる */
  activeButFree: MemberRow[];
  /** 黙っている（60日以上なにもしていない） */
  silent: MemberRow[];
  /** 手が挙がっていない集まり（主催が困っている） */
  lonelyGatherings: { id: string; title: string; hostMemberId: string; hostName: string; createdAt: Date }[];
  /** クレジットが余ったまま使われていない会員 */
  unusedCredits: MemberRow[];
};

/** 事務局が今週手当てする先 */
export async function attentionList(tenantId: string, rows: MemberRow[]): Promise<Attention> {
  const silentLine = ago(SILENT_DAYS);

  const paying = (m: MemberRow) => m.paymentStatus !== "FREE";

  const payingButQuiet = rows
    .filter((m) => paying(m) && m.actions30 === 0)
    .sort((a, b) => (a.lastActionAt?.getTime() ?? 0) - (b.lastActionAt?.getTime() ?? 0))
    .slice(0, 10);

  const activeButFree = rows
    .filter((m) => !paying(m) && m.actions30 >= 3)
    .sort((a, b) => b.actions30 - a.actions30)
    .slice(0, 10);

  const silent = rows
    .filter((m) => !m.lastActionAt || m.lastActionAt < silentLine)
    .sort((a, b) => (a.lastActionAt?.getTime() ?? 0) - (b.lastActionAt?.getTime() ?? 0))
    .slice(0, 15);

  const unusedCredits = rows
    .filter((m) => m.credits > 0 && m.actions30 === 0)
    .sort((a, b) => b.credits - a.credits)
    .slice(0, 10);

  // 立てたのに誰も手を挙げていない集まり
  const lonely = await prisma.gathering.findMany({
    where: { tenantId, deletedAt: null, status: "open", joins: { none: {} } },
    orderBy: { createdAt: "asc" },
    take: 10,
    select: { id: true, title: true, hostMemberId: true, createdAt: true },
  });
  const hostIds = [...new Set(lonely.map((g) => g.hostMemberId))];
  const hosts = hostIds.length
    ? await prisma.member.findMany({ where: { id: { in: hostIds } }, select: { id: true, name: true } })
    : [];

  return {
    payingButQuiet,
    activeButFree,
    silent,
    unusedCredits,
    lonelyGatherings: lonely.map((g) => ({
      ...g,
      hostName: hosts.find((h) => h.id === g.hostMemberId)?.name ?? "会員",
    })),
  };
}

export type MoneyPulse = {
  businessMembers: number;
  freeMembers: number;
  grantedThisMonth: number;
  consumedThisMonth: number;
  outstandingCredits: number;
  /** 30日以内に失効するロットの合計 */
  expiringSoon: number;
  ordersThisMonth: number;
};

/** お金の状態 */
export async function moneyPulse(tenantId: string): Promise<MoneyPulse> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [business, free, granted, consumed, outstanding, expiring, orders] = await Promise.all([
    prisma.member.count({ where: { tenantId, status: "APPROVED", paymentStatus: { not: "FREE" } } }),
    prisma.member.count({ where: { tenantId, status: "APPROVED", paymentStatus: "FREE" } }),
    prisma.contactCreditLedger.aggregate({
      where: { tenantId, createdAt: { gte: monthStart }, quantity: { gt: 0 } },
      _sum: { quantity: true },
    }),
    prisma.contactCreditLedger.aggregate({
      where: { tenantId, createdAt: { gte: monthStart }, entryType: "consume" },
      _sum: { quantity: true },
    }),
    prisma.contactCreditLedger.aggregate({ where: { tenantId }, _sum: { quantity: true } }),
    prisma.contactCreditLedger.aggregate({
      where: {
        tenantId,
        quantity: { gt: 0 },
        expiresAt: { not: null, lte: inDays(EXPIRING_SOON_DAYS), gte: new Date() },
      },
      _sum: { quantity: true },
    }),
    prisma.billingOrder.count({ where: { tenantId, createdAt: { gte: monthStart } } }),
  ]);

  return {
    businessMembers: business,
    freeMembers: free,
    grantedThisMonth: granted._sum.quantity ?? 0,
    consumedThisMonth: Math.abs(consumed._sum.quantity ?? 0),
    outstandingCredits: outstanding._sum.quantity ?? 0,
    expiringSoon: expiring._sum.quantity ?? 0,
    ordersThisMonth: orders,
  };
}

/** 都道府県ごとの会員数（47都道府県での運用に向けた土台） */
export async function byPrefecture(tenantId: string): Promise<{ prefecture: string; count: number }[]> {
  const rows = await prisma.member.groupBy({
    by: ["prefecture"],
    where: { tenantId, status: "APPROVED" },
    _count: { _all: true },
  });
  return rows
    .map((r) => ({ prefecture: r.prefecture ?? "（未記入）", count: r._count._all }))
    .sort((a, b) => b.count - a.count);
}

export { ALIVE_THRESHOLD };

// ───────────────────────────────────────────────────────────────
// 今週の手当て（2026-11-23 ユーザー指示「今週の手当てをリストにまとめて」）
//
// ⚠️⚠️ 上の集計は「材料」でしかない。事務局長が毎週これを見て動くには、
//    **順番の付いた1本のリスト**になっていないと動けない。
//    だから、材料を全部混ぜて、緊急な順に並べ替えて、動詞で書く。
// ⚠️ 1週間に人が動ける量には上限がある。多く出しすぎると全部やらなくなるので、
//    WEEKLY_TASK_MAX 件で打ち切る（出しきらないことが、このリストの仕事）。
// ───────────────────────────────────────────────────────────────

/** 1週間に出す手当ての上限。これ以上は出さない */
export const WEEKLY_TASK_MAX = 12;

export type WeeklyTask = {
  key: string;
  kind: "churn" | "lonely" | "expiring" | "upsell" | "credit" | "field" | "silent" | "prereg" | "decay";
  /** 何をするか。動詞で終わる一行 */
  todo: string;
  /** なぜ今それをするのか */
  why: string;
  /** 開く先（なければ null） */
  href: string | null;
  /** いつまでに */
  when: "今日" | "今週";
};

const daysSince = (d: Date | null): number | null =>
  d ? Math.max(0, Math.floor((Date.now() - d.getTime()) / DAY)) : null;

/** 「3日前」「一度もありません」のような言い方にする */
function lastSeen(d: Date | null): string {
  const n = daysSince(d);
  if (n === null) return "一度もありません";
  if (n === 0) return "今日";
  return `${n}日前`;
}

/**
 * 今週の手当て。緊急な順に並べて返す。
 * 上の集計で取った材料をそのまま受け取るので、DBは1回だけ追加で引く（先行登録の数）。
 */
export async function weeklyTasks(
  tenantId: string,
  rows: MemberRow[],
  att: Attention,
  pulse: Pulse,
  money: MoneyPulse,
  health: RelationHealth,
): Promise<WeeklyTask[]> {
  const t: WeeklyTask[] = [];

  // ① 払っているのに交わっていない ＝ 解約がいちばん近い。ここから手を付ける
  for (const m of att.payingButQuiet.slice(0, 5)) {
    t.push({
      key: `churn:${m.id}`,
      kind: "churn",
      todo: `${m.name} に、こちらから声をかける`,
      why: `お金を払っているのに、直近${ACTIVE_WINDOW_DAYS}日なにもしていません（最後の動き：${lastSeen(m.lastActionAt)}）。このままだと次の更新で辞めます。`,
      href: `/admin/crm/${m.id}`,
      when: "今日",
    });
  }

  // ② 誰も手を挙げていない集まり ＝ 立てた人がひとりで待っている
  //    ここを放っておくと、次から誰も立てなくなる。場が死ぬ入口なので上に置く
  for (const g of att.lonelyGatherings.slice(0, 3)) {
    const n = daysSince(g.createdAt) ?? 0;
    t.push({
      key: `lonely:${g.id}`,
      kind: "lonely",
      todo: `「${g.title}」に、事務局からひとこと書く`,
      why: `${g.hostName} さんが${n === 0 ? "今日" : `${n}日前に`}立てて、まだ誰も手を挙げていません。放っておくと、次から誰も立てなくなります。`,
      href: `/gatherings/${g.id}`,
      when: n >= 3 ? "今日" : "今週",
    });
  }

  // ③ 場が止まっている ＝ 事務局が1本入れるしかない
  if (pulse.posts7 === 0) {
    t.push({
      key: "field:dead",
      kind: "field",
      todo: "事務局から、壁に1本書く",
      why: "この7日間、誰も投稿していません。場が止まっています。誰かが先に書かないと、誰も書きません。",
      href: "/feed",
      when: "今日",
    });
  } else if (pulse.posts7 <= 2) {
    t.push({
      key: "field:thin",
      kind: "field",
      todo: "事務局から、壁に1本書く",
      why: `この7日間の投稿は${pulse.posts7}件だけです。事務局が先に書くと、続く人が出ます。`,
      href: "/feed",
      when: "今週",
    });
  }

  // ④ まもなく失効するクレジット ＝ 黙って消えると、次は払ってもらえない
  if (money.expiringSoon > 0) {
    t.push({
      key: "expiring",
      kind: "expiring",
      todo: `まもなく失効する ${money.expiringSoon} クレジットの持ち主に、先に知らせる`,
      why: `${EXPIRING_SOON_DAYS}日以内に失効します。黙って消えると、次の更新で払ってもらえません。`,
      href: "/admin/billing",
      when: "今週",
    });
  }

  // ⑤ 交わっているのに払っていない ＝ 価値は届いている。課金の話ができる
  for (const m of att.activeButFree.slice(0, 3)) {
    t.push({
      key: `upsell:${m.id}`,
      kind: "upsell",
      todo: `${m.name} に、ビジネス会員の話をする`,
      why: `無料のまま、直近${ACTIVE_WINDOW_DAYS}日で${m.actions30}回動いています。価値はもう届いています。`,
      href: `/admin/crm/${m.id}`,
      when: "今週",
    });
  }

  // ⑥ クレジットが余ったまま ＝ 使い方が分からないか、使う相手がいない
  for (const m of att.unusedCredits.slice(0, 2)) {
    t.push({
      key: `credit:${m.id}`,
      kind: "credit",
      todo: `${m.name} に、クレジットの使い方を1件つないで見せる`,
      why: `${m.credits} クレジット持っているのに使っていません。使い方が分からないか、使う相手が見えていません。`,
      href: `/admin/crm/${m.id}`,
      when: "今週",
    });
  }

  // ⑦ 先行登録のまま、本人にまだ渡していない
  //    先に登録しておいて声をかける、という進め方なので、残り数が「次に声をかける数」になる
  const preregLeft = await prisma.member.count({
    where: { tenantId, status: "APPROVED", listed: false, users: { none: {} } },
  });
  if (preregLeft > 0) {
    t.push({
      key: "prereg",
      kind: "prereg",
      todo: `先行登録のままの ${preregLeft} 名に、一声かける`,
      why: "登録はしてありますが、本人がまだ受け取っていません。本人が受け取るまで、名簿は名簿のままです。",
      href: "/admin/members/prereg",
      when: "今週",
    });
  }

  // ⑧ 黙っている人 ＝ 3か月に1回の声かけの対象。人数が多いのでまとめて1件にする
  if (att.silent.length > 0) {
    t.push({
      key: "silent",
      kind: "silent",
      todo: `${SILENT_DAYS}日以上黙っている ${att.silent.length} 名のうち、3名に声をかける`,
      why: "まだ場に入れていない方です。3か月に1回、何か1つ動いてもらう。全員は無理なので、古い順に3名だけ。",
      href: "/admin/community#silent",
      when: "今週",
    });
  }

  // ⑨ 関係が薄れてきている ＝ 集まりを1つ立てるのがいちばん効く
  if (health.pairs >= 10 && health.alivePercent !== null && health.alivePercent < 50) {
    t.push({
      key: "decay",
      kind: "decay",
      todo: "集まりを1つ立てて、薄れている関係を呼び戻す",
      why: `生きている関係が${health.alivePercent}%まで下がっています（${health.fading}組が薄れ、${health.cold}組が切れかけ）。顔を合わせる場が、いちばん効きます。`,
      href: "/gatherings",
      when: "今週",
    });
  }

  // 会員が1人も動いていない立ち上げ直後は、上のどれも出ない。そのときの最初の一歩
  if (t.length === 0 && rows.length === 0) {
    t.push({
      key: "empty",
      kind: "prereg",
      todo: "まず、登壇者の先行登録を取り込む",
      why: "まだ会員がいません。名簿を入れるところから始まります。",
      href: "/admin/members/prereg",
      when: "今日",
    });
  }

  return t.slice(0, WEEKLY_TASK_MAX);
}
