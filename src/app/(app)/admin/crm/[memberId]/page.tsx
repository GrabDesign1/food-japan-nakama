// 事務局：顧客カルテ（Phase 11＝事務局CRM）。会員1社の状況を1画面にまとめる。
//
// **規約17条（通信の秘密）により、会員間メッセージの本文はこの画面に出さない。**
// 出すのは件数・日時などのメタ情報だけ（/admin/inquiries と同じ扱い）。
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCreditBalance } from "@/lib/contact-credits";
import { PHASE_CONTRACTED } from "@/lib/deal-constants";
import { DIRECTION_SHORT } from "@/lib/offering-taxonomy";
import {
  CRM_NOTE_MAX,
  CRM_STAGES,
  CRM_STAGE_LABEL,
  NOTE_KINDS,
  NOTE_KIND_LABEL,
  dueState,
} from "@/lib/crm";
import { AdminNav } from "../../_components/AdminNav";
import { btn, input } from "@/lib/ui";
import { aCard, aEyebrow, aH1, aH2 } from "../../_components/adminUi";
import { addMemberNote, deleteMemberNote, saveMemberCrm } from "../../crm-actions";

// 表示だけの対応表（会員管理のバッジと同じ文言。AdminTable は触らずここに持つ）
const STATUS_LABEL: Record<string, string> = {
  DRAFT: "未提出（登録のみ）",
  PENDING: "審査中",
  APPROVED: "承認済み",
  AWAITING_PAYMENT: "お支払い待ち（旧・要承認し直し）",
  REJECTED: "非承認",
  SUSPENDED: "停止中",
};

const PAYMENT_LABEL: Record<string, string> = {
  FREE: "無料会員",
  UNPAID: "未払い",
  PAID: "ビジネス会員（課金中）",
};

const PURCHASED_STATUSES = ["paid", "fulfilled", "refunded"];

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("ja-JP");
}
function fmtDateTime(d: Date | null | undefined): string {
  if (!d) return "—";
  return `${d.toLocaleDateString("ja-JP")} ${d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`;
}
/** date / datetime-local の value 用（日本時間で表示する） */
function toInputValue(d: Date | null | undefined, withTime = false): string {
  if (!d) return "";
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const s = jst.toISOString();
  return withTime ? s.slice(0, 16) : s.slice(0, 10);
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[8px] border border-[var(--line)] bg-white px-3 py-2">
      <div className="text-[10px] text-[var(--muted)]">{label}</div>
      <div className="text-[16px] font-semibold text-[var(--ink)]">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 border-t border-[var(--line-soft)] py-1.5 first:border-t-0">
      <div className="w-[92px] shrink-0 text-[11px] text-[var(--muted)]">{label}</div>
      <div className="min-w-0 flex-1 break-words text-[12px] text-[var(--ink)]">{value}</div>
    </div>
  );
}

export default async function AdminCrmMemberPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const su = await requireAdmin();
  const { memberId } = await params;
  const tenantId = su.app.tenantId;

  const member = await prisma.member.findFirst({
    where: { id: memberId, tenantId },
    include: {
      users: {
        select: { id: true, name: true, email: true, role: true, status: true, marketingOptInAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!member) notFound();

  const emails = member.users.map((u) => u.email).filter(Boolean);

  const [
    admins,
    notes,
    offerings,
    offeringPublic,
    viewCount,
    threadsIn,
    threadsOut,
    lastThread,
    dealCount,
    dealContracted,
    projectCount,
    consultations,
    orders,
    balance,
    audits,
  ] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId, role: { in: ["TENANT_ADMIN", "ADMIN", "REVIEWER"] } },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true },
    }),
    prisma.memberNote.findMany({
      where: { memberId: member.id },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      take: 100,
    }),
    prisma.offering.findMany({
      where: { memberId: member.id },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { id: true, title: true, direction: true, isPublic: true, updatedAt: true },
    }),
    prisma.offering.count({ where: { memberId: member.id, isPublic: true } }),
    prisma.offeringView.count({ where: { offering: { memberId: member.id } } }),
    prisma.thread.count({ where: { tenantId, toMemberId: member.id } }),
    prisma.thread.count({ where: { tenantId, fromMemberId: member.id } }),
    prisma.thread.findFirst({
      where: { tenantId, OR: [{ toMemberId: member.id }, { fromMemberId: member.id }] },
      orderBy: { lastMessageAt: "desc" },
      select: { lastMessageAt: true },
    }),
    prisma.deal.count({
      where: { tenantId, OR: [{ ownerMemberId: member.id }, { counterpartMemberId: member.id }] },
    }),
    prisma.deal.count({
      where: {
        tenantId,
        phase: { gte: PHASE_CONTRACTED },
        OR: [{ ownerMemberId: member.id }, { counterpartMemberId: member.id }],
      },
    }),
    prisma.project.count({ where: { memberId: member.id } }),
    // 個別相談は会員と紐づく列を持たないため、登録メールアドレスの一致で拾う（参考表示）
    emails.length
      ? prisma.consultation.findMany({
          where: { tenantId, email: { in: emails } },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { id: true, refNo: true, serviceType: true, status: true, createdAt: true },
        })
      : Promise.resolve([]),
    prisma.billingOrder.findMany({
      where: { memberId: member.id, status: { in: PURCHASED_STATUSES } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { items: { select: { name: true } } },
    }),
    getCreditBalance(member.id),
    prisma.auditLog.findMany({
      where: { tenantId, targetId: member.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, action: true, actorEmail: true, detail: true, createdAt: true },
    }),
  ]);

  const ownerName =
    admins.find((a) => a.id === member.crmOwnerUserId)?.name ?? null;
  const lastContact = notes[0]?.occurredAt ?? null;
  const due = dueState(member.crmNextActionDue, new Date());

  const saveCrm = saveMemberCrm.bind(null, member.id);
  const addNote = addMemberNote.bind(null, member.id);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className={aEyebrow}>ADMIN ・ 顧客カルテ</p>
          <h1 className={aH1}>{member.name || "（名称未設定）"}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded bg-[var(--green-soft)] px-2 py-0.5 font-bold text-[var(--green-d)]">
              {STATUS_LABEL[member.status] ?? member.status}
            </span>
            <span className="rounded bg-[var(--amber-soft)] px-2 py-0.5 font-bold text-[var(--amber-ink)]">
              {PAYMENT_LABEL[member.paymentStatus] ?? member.paymentStatus}
            </span>
            {member.crmStage ? (
              <span className="rounded bg-[var(--line-soft)] px-2 py-0.5 text-[var(--ink-2)]">
                {CRM_STAGE_LABEL[member.crmStage]}
              </span>
            ) : null}
            {ownerName ? <span className="text-[var(--muted)]">担当：{ownerName}</span> : null}
            <span className="text-[var(--muted)]">記入率 {member.completionRate}%</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link href={`/producers/${member.id}`} className={btn("secondary", "sm")}>
            会員ページを見る
          </Link>
          <Link href="/admin/members" className={btn("secondary", "sm")}>
            ← 会員管理へ
          </Link>
        </div>
      </div>
      <AdminNav current="crm" />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* 左：対応の管理 */}
        <div className="flex min-w-0 flex-col gap-5">
          {/* 担当・状況・次にやること */}
          <section className={`${aCard} p-5`}>
            <h2 className={aH2}>担当と次にやること</h2>
            <form action={saveCrm} className="mt-3 flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-[var(--muted)]">担当（事務局）</span>
                  <select name="crmOwnerUserId" defaultValue={member.crmOwnerUserId ?? ""} className={`${input()} w-full`}>
                    <option value="">未設定</option>
                    {admins.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name || a.email}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-[var(--muted)]">状況</span>
                  <select name="crmStage" defaultValue={member.crmStage ?? ""} className={`${input()} w-full`}>
                    <option value="">未設定</option>
                    {CRM_STAGES.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-[var(--muted)]">次にやること</span>
                  <input
                    name="crmNextAction"
                    defaultValue={member.crmNextAction ?? ""}
                    placeholder="例：掲載写真を送ってもらう／来週あらためて架電"
                    className={`${input()} w-full`}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-[var(--muted)]">期限</span>
                  <input
                    type="date"
                    name="crmNextActionDue"
                    defaultValue={toInputValue(member.crmNextActionDue)}
                    className={`${input()} w-full`}
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-[var(--muted)]">タグ（カンマ区切り・最大10個）</span>
                <input
                  name="crmTags"
                  defaultValue={member.crmTags.join(", ")}
                  placeholder="例：宮崎, 生産者, 展示会で名刺交換"
                  className={`${input()} w-full`}
                />
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <button className={btn("primary", "sm")}>保存する</button>
                {member.crmNextActionDue ? (
                  <span
                    className={`text-[12px] ${
                      due === "overdue"
                        ? "font-bold text-[var(--red)]"
                        : due === "soon"
                          ? "font-bold text-[var(--orange)]"
                          : "text-[var(--muted)]"
                    }`}
                  >
                    {due === "overdue" ? "⚠ 期限を過ぎています：" : due === "soon" ? "⏰ 期限が近づいています：" : "期限："}
                    {fmtDate(member.crmNextActionDue)}
                  </span>
                ) : null}
              </div>
            </form>
          </section>

          {/* 対応履歴 */}
          <section className={`${aCard} p-5`}>
            <h2 className={aH2}>対応履歴（{notes.length}件）</h2>
            <p className="mt-1 text-[11px] leading-5 text-[var(--muted)]">
              電話・メール・訪問の記録を残します。事務局だけが見る記録です。
              会員どうしのメッセージの中身は、通信の秘密（規約17条）により書き写さないでください。
            </p>

            <form action={addNote} className="mt-3 flex flex-col gap-2 rounded-[8px] bg-[var(--canvas)] p-3">
              <div className="flex flex-wrap gap-2">
                <select name="kind" defaultValue="call" className={input("sm")}>
                  {NOTE_KINDS.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
                <input type="datetime-local" name="occurredAt" defaultValue="" className={input("sm")} />
                <span className="self-center text-[11px] text-[var(--muted)]">未入力なら「いま」で記録します</span>
              </div>
              <textarea
                name="body"
                rows={3}
                maxLength={CRM_NOTE_MAX}
                placeholder="例：代表に架電。イチゴの余剰が9月に出る見込み。掲載写真は来週送ってもらう。"
                className={`${input()} w-full`}
              />
              <div>
                <button className={btn("action", "sm")}>記録する</button>
              </div>
            </form>

            {notes.length === 0 ? (
              <p className="mt-3 text-[12px] text-[var(--muted)]">まだ記録はありません。</p>
            ) : (
              <ul className="mt-3 flex flex-col">
                {notes.map((n) => (
                  <li key={n.id} className="border-t border-[var(--line-soft)] py-3 first:border-t-0">
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="rounded bg-[var(--green-soft)] px-2 py-0.5 font-bold text-[var(--green-d)]">
                        {NOTE_KIND_LABEL[n.kind] ?? n.kind}
                      </span>
                      <span className="text-[var(--ink-2)]">{fmtDateTime(n.occurredAt)}</span>
                      <span className="text-[var(--muted)]">{n.authorName}</span>
                      <form
                        action={deleteMemberNote.bind(null, n.id)}
                        className="ml-auto"
                      >
                        <button className="text-[11px] text-[var(--muted)] underline">削除</button>
                      </form>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-6 text-[var(--ink)]">
                      {n.body}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 掲載中の案件 */}
          <section className={`${aCard} p-5`}>
            <h2 className={aH2}>この会員の案件（{offerings.length}件・新しい順）</h2>
            {offerings.length === 0 ? (
              <p className="mt-2 text-[12px] text-[var(--muted)]">
                案件がまだありません。掲載代行は
                <Link href="/admin/listings" className="underline">
                  掲載の監視
                </Link>
                の「会員に代わって案件を作る」から始められます。
              </p>
            ) : (
              <ul className="mt-2 flex flex-col">
                {offerings.map((o) => (
                  <li
                    key={o.id}
                    className="flex flex-wrap items-center gap-2 border-t border-[var(--line-soft)] py-2 text-[12px] first:border-t-0"
                  >
                    <span className="rounded bg-[var(--line-soft)] px-2 py-0.5 text-[10px] text-[var(--ink-2)]">
                      {DIRECTION_SHORT[o.direction] ?? o.direction}
                    </span>
                    <Link href={`/ledger/${o.id}`} className="min-w-0 flex-1 truncate text-[var(--ink)] underline">
                      {o.title || "（無題）"}
                    </Link>
                    <span className={o.isPublic ? "font-bold text-[var(--orange)]" : "text-[var(--muted)]"}>
                      {o.isPublic ? "公開中" : "下書き"}
                    </span>
                    <span className="text-[var(--muted)]">{fmtDate(o.updatedAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* 右：この会員の状況（読み取り専用） */}
        <div className="flex min-w-0 flex-col gap-5">
          <section className={`${aCard} p-4`}>
            <h2 className={aH2}>反応の数字</h2>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Stat label="公開中の案件" value={offeringPublic} />
              <Stat label="案件の閲覧" value={viewCount} />
              <Stat label="届いた問い合わせ" value={threadsIn} />
              <Stat label="送った提案" value={threadsOut} />
              <Stat label="商談" value={dealCount} />
              <Stat label="合意した商談" value={dealContracted} />
              <Stat label="共創PJ" value={projectCount} />
              <Stat label="クレジット残高" value={balance} />
            </div>
            <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">
              最終のやり取り：{fmtDateTime(lastThread?.lastMessageAt)}
              <br />
              最終の対応記録：{fmtDateTime(lastContact)}
              <br />
              ※ 通信の秘密（規約17条）により、メッセージの本文は表示しません。
            </p>
          </section>

          <section className={`${aCard} p-4`}>
            <h2 className={aH2}>連絡先・基本情報</h2>
            <div className="mt-2">
              {member.users.map((u) => (
                <Row
                  key={u.id}
                  label="担当者"
                  value={`${u.name || "—"}／${u.email}${u.marketingOptInAt ? "（案内メール同意）" : ""}`}
                />
              ))}
              <Row label="連絡担当" value={member.contactName} />
              <Row label="業種" value={[member.categoryL1, member.categoryL2].filter(Boolean).join(" / ") || null} />
              <Row label="所在地" value={[member.prefecture, member.city, member.address].filter(Boolean).join(" ") || null} />
              <Row label="サイト" value={member.website} />
              <Row label="登録日" value={fmtDate(member.createdAt)} />
              <Row label="承認日" value={member.approvedAt ? fmtDate(member.approvedAt) : null} />
              <Row
                label="退会申請"
                value={member.withdrawalRequestedAt ? `${fmtDate(member.withdrawalRequestedAt)}／${member.withdrawalReason ?? "理由なし"}` : null}
              />
            </div>
          </section>

          {consultations.length > 0 ? (
            <section className={`${aCard} p-4`}>
              <h2 className={aH2}>個別相談（メール一致）</h2>
              <ul className="mt-2 flex flex-col text-[12px]">
                {consultations.map((c) => (
                  <li key={c.id} className="border-t border-[var(--line-soft)] py-1.5 first:border-t-0">
                    <span className="text-[var(--muted)]">{fmtDate(c.createdAt)}</span>{" "}
                    <span className="text-[var(--ink)]">{c.serviceType}</span>{" "}
                    <span className="text-[var(--muted)]">
                      {c.refNo}／{c.status}
                    </span>
                  </li>
                ))}
              </ul>
              <Link href="/admin/consultations" className="mt-2 inline-block text-[11px] text-[var(--green-d)] underline">
                個別相談の管理へ →
              </Link>
            </section>
          ) : null}

          <section className={`${aCard} p-4`}>
            <h2 className={aH2}>購入履歴</h2>
            {orders.length === 0 ? (
              <p className="mt-2 text-[12px] text-[var(--muted)]">購入はありません。</p>
            ) : (
              <ul className="mt-2 flex flex-col text-[12px]">
                {orders.map((o) => (
                  <li key={o.id} className="border-t border-[var(--line-soft)] py-1.5 first:border-t-0">
                    <span className="text-[var(--muted)]">{fmtDate(o.createdAt)}</span>{" "}
                    <span className="text-[var(--ink)]">{o.items.map((i) => i.name).join("、")}</span>{" "}
                    <span className="text-[var(--ink-2)]">¥{o.totalAmount.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={`${aCard} p-4`}>
            <h2 className={aH2}>この会員に対する操作の記録</h2>
            {audits.length === 0 ? (
              <p className="mt-2 text-[12px] text-[var(--muted)]">記録はありません。</p>
            ) : (
              <ul className="mt-2 flex flex-col text-[11px]">
                {audits.map((a) => (
                  <li key={a.id} className="border-t border-[var(--line-soft)] py-1.5 first:border-t-0">
                    <span className="text-[var(--muted)]">{fmtDate(a.createdAt)}</span>{" "}
                    <span className="text-[var(--ink)]">{a.action}</span>{" "}
                    <span className="text-[var(--muted)]">{a.actorEmail ?? ""}</span>
                    {a.detail ? <span className="block text-[var(--muted)]">{a.detail}</span> : null}
                  </li>
                ))}
              </ul>
            )}
            <Link href="/admin/audit" className="mt-2 inline-block text-[11px] text-[var(--green-d)] underline">
              監査ログへ →
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
