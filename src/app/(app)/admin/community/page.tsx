// 事務局：コミュニティとお金を、同じ画面で見る（2026-11-23）。
//
// なぜ作るか（ユーザー指示 2026-11-23）:
//   「まずは事務局をここで成り立たせるように、管理画面の整備をしてほしい」
//   「NAKAMAを仲間であり続けるための仕組みと、マネタイズの仕組みを両立させてほしい」
//
// ⚠️⚠️ **両立とは、2つを並べることではない。ズレを見ることである。**
//    ・払っているのに交わっていない → 次の更新で辞める。ここが最優先
//    ・交わっているのに払っていない → 価値は届いている。課金の話ができる
//    この2つを、画面のいちばん上に置いてある。
//
// ⚠️ ここは事務局だけ。requireAdmin() を通している。
// ⚠️ 会員本人には点数を見せない決まりは守る（この画面は会員からは開けない）。
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import {
  communityPulse, relationHealth, memberMatrix, attentionList, moneyPulse, byPrefecture,
  weeklyTasks,
  ACTIVE_WINDOW_DAYS, SILENT_DAYS, EXPIRING_SOON_DAYS, WEEKLY_TASK_MAX,
} from "@/lib/admin-community";
import type { WeeklyTask } from "@/lib/admin-community";
import { AdminNav } from "../_components/AdminNav";
import {
  aBadge, aCard, aCardBody, aCardHead, aEyebrow, aH1, aH2, aLabel, aLink, aNote,
  aTable, aTd, aTh, aTr,
} from "../_components/adminUi";

export const metadata = { title: "コミュニティとお金" };

function fmtDate(d: Date | null): string {
  return d ? d.toLocaleDateString("ja-JP", { month: "short", day: "numeric" }) : "—";
}

/** 大きい数字1つ */
function Stat({ label, value, unit, note }: { label: string; value: string | number; unit?: string; note?: string }) {
  return (
    <div className="px-4 py-3">
      <p className={aLabel}>{label}</p>
      <p className="mt-0.5 text-[22px] font-bold leading-tight text-[var(--ink)]">
        {value}
        {unit ? <span className="ml-1 text-[12px] font-normal text-[var(--muted)]">{unit}</span> : null}
      </p>
      {note ? <p className="mt-0.5 text-[11px] leading-4 text-[var(--muted)]">{note}</p> : null}
    </div>
  );
}

/** 手当てが要る会員の一覧 */
function MemberList({
  title,
  why,
  rows,
  tone,
  showCredits,
  id,
}: {
  title: string;
  why: string;
  rows: { id: string; name: string; prefecture: string | null; actions30: number; lastActionAt: Date | null; credits: number }[];
  tone: "red" | "green" | "neutral";
  showCredits?: boolean;
  /** 「今週の手当て」から飛んでくるための見出しID */
  id?: string;
}) {
  return (
    <div id={id} className={`${aCard} scroll-mt-4`}>
      <div className={aCardHead}>
        <h2 className={aH2}>{title}</h2>
        <span className={`${aBadge(tone)} ml-auto`}>{rows.length}</span>
      </div>
      <div className={aCardBody}>
        <p className={aNote}>{why}</p>
        {rows.length === 0 ? (
          <p className={`${aNote} mt-2`}>いまはいません。</p>
        ) : (
          <ul className="mt-2 flex flex-col divide-y divide-[#EDF0F2]">
            {rows.map((m) => (
              <li key={m.id} className="flex flex-wrap items-baseline gap-x-3 py-1.5">
                <Link href={`/admin/crm/${m.id}`} className={`${aLink} text-[13px]`}>
                  {m.name}
                </Link>
                {m.prefecture ? (
                  <span className="text-[11px] text-[var(--muted)]">{m.prefecture}</span>
                ) : null}
                <span className="ml-auto text-[11px] text-[var(--muted)]">
                  {showCredits ? `クレジット ${m.credits}　` : ""}
                  直近30日 {m.actions30} 回　最後 {fmtDate(m.lastActionAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * 今週の手当て。
 * ⚠️ 事務局長が毎週ここだけ見れば動ける、という形にする。
 *    上から順にやる。全部やらなくてよい（上から3つで十分な週もある）。
 */
function WeeklyTasks({ tasks }: { tasks: WeeklyTask[] }) {
  return (
    <div className={`${aCard} mt-5 border-[#D6DBDE]`}>
      <div className={aCardHead}>
        <h2 className={aH2}>今週の手当て</h2>
        <span className={`${aBadge(tasks.some((x) => x.when === "今日") ? "red" : "neutral")} ml-auto`}>
          {tasks.length} 件
        </span>
      </div>
      <div className={aCardBody}>
        {tasks.length > 0 ? (
          <p className={aNote}>
            上から順にやってください。<strong>全部やらなくてよい</strong>——上の3つで足りる週もあります。
            {tasks.length >= WEEKLY_TASK_MAX ? `多くても${WEEKLY_TASK_MAX}件しか出しません。` : ""}
          </p>
        ) : null}
        {tasks.length === 0 ? (
          <p className={aNote}>
            今週、手当てが要るものはありません。<strong>これがいちばん良い状態です。</strong>
          </p>
        ) : (
          <ol className="mt-3 flex flex-col divide-y divide-[#EDF0F2]">
            {tasks.map((task, i) => (
              <li key={task.key} className="flex gap-3 py-2.5 first:pt-0">
                <span
                  className="mt-[1px] inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F1F4F5] text-[11px] font-bold text-[var(--muted)]"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    {task.href ? (
                      <Link href={task.href} className={`${aLink} text-[13px] font-medium`}>
                        {task.todo}
                      </Link>
                    ) : (
                      <span className="text-[13px] font-medium text-[var(--ink)]">{task.todo}</span>
                    )}
                    <span className={aBadge(task.when === "今日" ? "red" : "neutral")}>{task.when}</span>
                  </div>
                  <p className="mt-0.5 text-[12px] leading-5 text-[var(--muted)]">{task.why}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

export default async function AdminCommunityPage() {
  const su = await requireAdmin();
  const tenantId = su.app.tenantId;

  const [pulse, health, rows, money, prefs] = await Promise.all([
    communityPulse(tenantId),
    relationHealth(tenantId),
    memberMatrix(tenantId),
    moneyPulse(tenantId),
    byPrefecture(tenantId),
  ]);
  const att = await attentionList(tenantId, rows);
  const tasks = await weeklyTasks(tenantId, rows, att, pulse, money, health);

  const activeMembers = rows.filter((m) => m.actions30 > 0).length;

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6">
      <AdminNav current="community" />

      <div className="mt-5">
        <div className={aEyebrow}>COMMUNITY & MONEY</div>
        <h1 className={`${aH1} mt-1`}>コミュニティとお金</h1>
        <p className={`${aNote} mt-2`}>
          仲間であり続けているか、と、お金が回っているか。
          <strong>この2つがズレているところ</strong>が、事務局の手当ての場所です。
        </p>
      </div>

      <WeeklyTasks tasks={tasks} />

      {/* ── 次に：ズレ ───────────────────────── */}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <MemberList
          title="払っているのに、交わっていない"
          why={`お金を払っているのに、直近${ACTIVE_WINDOW_DAYS}日なにもしていない方です。いちばん危ない。次の更新で辞めます。先に声をかけてください。`}
          rows={att.payingButQuiet}
          tone="red"
        />
        <MemberList
          title="交わっているのに、払っていない"
          why={`無料のまま、直近${ACTIVE_WINDOW_DAYS}日によく動いている方です。価値は届いています。課金の話ができます。`}
          rows={att.activeButFree}
          tone="green"
        />
      </div>

      {/* ── 場の動き ───────────────────────── */}
      <div className={`${aCard} mt-6`}>
        <div className={aCardHead}>
          <h2 className={aH2}>場の動き（この7日間）</h2>
          <span className="ml-auto text-[11px] text-[var(--muted)]">
            動いた会員 {activeMembers} / {rows.length} 名（直近{ACTIVE_WINDOW_DAYS}日）
          </span>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-[#EDF0F2] sm:grid-cols-4 lg:grid-cols-7">
          <Stat label="投稿" value={pulse.posts7} unit="件" note={`30日で${pulse.posts30}件`} />
          <Stat label="コメント" value={pulse.comments7} unit="件" />
          <Stat label="いいね" value={pulse.likes7} unit="件" />
          <Stat label="集まり" value={pulse.gatherings7} unit="件" note={`募集中${pulse.gatheringsOpen}件`} />
          <Stat label="手が挙がった" value={pulse.joins7} unit="件" />
          <Stat label="カード交換" value={pulse.exchanges7} unit="組" note={`30日で${pulse.exchanges30}組`} />
          <Stat label="メッセージ" value={pulse.messages7} unit="通" />
        </div>
      </div>

      {/* ── 関係の健康 ───────────────────────── */}
      <div className={`${aCard} mt-6`}>
        <div className={aCardHead}>
          <h2 className={aH2}>関係の健康</h2>
          <span className="ml-auto text-[11px] text-[var(--muted)]">
            交換しただけの関係は、約93日で薄れ、約418日で切れます
          </span>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-[#EDF0F2] sm:grid-cols-4">
          <Stat
            label="生きている関係"
            value={health.alive}
            unit={`/ ${health.pairs} 組`}
            note={health.alivePercent !== null ? `${health.alivePercent}%` : "まだ関係がありません"}
          />
          <Stat label="薄れています" value={health.fading} unit="組" />
          <Stat label="切れかけています" value={health.cold} unit="組" />
          <Stat
            label="募集中の集まり"
            value={pulse.gatheringsOpen}
            unit="件"
            note="3か月に1回、誰もが何か1つ"
          />
        </div>
      </div>

      {/* ── お金 ───────────────────────── */}
      <div className={`${aCard} mt-6`}>
        <div className={aCardHead}>
          <h2 className={aH2}>お金の状態（今月）</h2>
          <Link href="/admin/billing" className={`${aLink} ml-auto text-[12px]`}>
            課金管理へ
          </Link>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-[#EDF0F2] sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="ビジネス会員" value={money.businessMembers} unit="社" note={`無料 ${money.freeMembers} 社`} />
          <Stat label="今月の付与" value={money.grantedThisMonth} unit="クレジット" />
          <Stat label="今月の消費" value={money.consumedThisMonth} unit="クレジット" />
          <Stat label="残っている" value={money.outstandingCredits} unit="クレジット" />
          <Stat
            label="まもなく失効"
            value={money.expiringSoon}
            unit="クレジット"
            note={`${EXPIRING_SOON_DAYS}日以内`}
          />
          <Stat label="今月の注文" value={money.ordersThisMonth} unit="件" />
        </div>
      </div>

      {/* ── 手当てが要るもの ───────────────────────── */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <MemberList
          title="クレジットが余ったまま"
          why="持っているのに使っていない方です。使い方が分かっていないか、使う相手がいません。"
          rows={att.unusedCredits}
          tone="neutral"
          showCredits
        />
        <MemberList
          id="silent"
          title={`${SILENT_DAYS}日以上、黙っている`}
          why="投稿もコメントも手挙げもありません。まだ場に入れていない方です。"
          rows={att.silent}
          tone="neutral"
        />
      </div>

      {/* 手が挙がっていない集まり */}
      <div className={`${aCard} mt-6`}>
        <div className={aCardHead}>
          <h2 className={aH2}>誰も手を挙げていない集まり</h2>
          <span className={`${aBadge("neutral")} ml-auto`}>{att.lonelyGatherings.length}</span>
        </div>
        <div className={aCardBody}>
          <p className={aNote}>
            勇気を出して立てた方が、ひとりで待っています。
            <strong>事務局がひとこと添えるだけで変わります。</strong>
          </p>
          {att.lonelyGatherings.length === 0 ? (
            <p className={`${aNote} mt-2`}>いまはありません。</p>
          ) : (
            <ul className="mt-2 flex flex-col divide-y divide-[#EDF0F2]">
              {att.lonelyGatherings.map((g) => (
                <li key={g.id} className="flex flex-wrap items-baseline gap-x-3 py-1.5">
                  <Link href={`/gatherings/${g.id}`} className={`${aLink} text-[13px]`}>
                    {g.title}
                  </Link>
                  <span className="text-[11px] text-[var(--muted)]">{g.hostName}</span>
                  <span className="ml-auto text-[11px] text-[var(--muted)]">
                    立てたのは {fmtDate(g.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── 都道府県 ───────────────────────── */}
      <div className={`${aCard} mt-6`}>
        <div className={aCardHead}>
          <h2 className={aH2}>都道府県ごとの会員</h2>
          <span className="ml-auto text-[11px] text-[var(--muted)]">47都道府県での運用に向けて</span>
        </div>
        <div className="overflow-x-auto">
          <table className={aTable}>
            <thead>
              <tr>
                <th className={aTh}>都道府県</th>
                <th className={aTh}>会員</th>
                <th className={aTh}></th>
              </tr>
            </thead>
            <tbody>
              {prefs.map((p) => (
                <tr key={p.prefecture} className={aTr}>
                  <td className={aTd}>{p.prefecture}</td>
                  <td className={`${aTd} w-[80px]`}>{p.count}</td>
                  <td className={aTd}>
                    <span
                      className="block h-2 rounded-full bg-[var(--green-soft)]"
                      style={{ width: `${Math.min(100, (p.count / Math.max(1, prefs[0]?.count ?? 1)) * 100)}%` }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
