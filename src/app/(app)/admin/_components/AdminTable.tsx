"use client";

import { useState, useTransition } from "react";
import {
  reviewAction,
  suspendMember,
  reactivateMember,
  deleteMember,
  markMemberPaid,
  unmarkMemberPaid,
} from "../actions";
import type { ReviewDecision } from "@/lib/member";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { btn, h2Cls } from "@/lib/ui";

export type AdminRow = {
  id: string;
  name: string;
  contactName: string;
  contactKana: string | null;
  contactEmail: string;
  categoryL1: string;
  categoryL2: string | null;
  prefecture: string | null;
  city: string | null;
  postalCode: string | null;
  address: string | null;
  website: string | null;
  founded: string | null;
  size: string | null;
  description: string | null;
  imageUrls: string[];
  featureText: string | null;
  hasLicense: boolean;
  licenseName: string | null;
  equipmentText: string | null;
  salesAreaText: string | null;
  logisticsText: string | null;
  foodlossText: string | null;
  challengeText: string | null;
  collabStyle: string | null;
  startTiming: string | null;
  completionRate: number;
  status: string;
  paymentStatus: string;
  users: { id: string; name: string; email: string }[];
};

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "審査中", cls: "bg-[#FAF0D6] text-[#B77F0B]" },
  APPROVED: { label: "承認済み", cls: "bg-[var(--green-soft)] text-[var(--green-d)]" },
  AWAITING_PAYMENT: { label: "お支払い待ち（旧・要承認し直し）", cls: "bg-[#FAF0D6] text-[#B77F0B]" },
  REJECTED: { label: "非承認", cls: "bg-[var(--red-soft)] text-[var(--red)]" },
  SUSPENDED: { label: "停止中", cls: "bg-[var(--red-soft)] text-[var(--red)]" },
};

const PAYMENT: Record<string, { label: string; cls: string }> = {
  FREE: { label: "無料", cls: "bg-[var(--line)] text-[var(--ink-2)]" },
  UNPAID: { label: "未決済", cls: "bg-[var(--red-soft)] text-[var(--red)]" },
  PAID: { label: "ビジネス会員（課金中）", cls: "bg-[#F7EED9] text-[#A87F2F]" },
};

function Badge({ map, value }: { map: typeof STATUS; value: string }) {
  const s = map[value] ?? { label: value, cls: "bg-[var(--line)] text-[var(--ink-2)]" };
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] ${s.cls}`}>
      {s.label}
    </span>
  );
}

export function AdminTable({ rows }: { rows: AdminRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const current = rows.find((r) => r.id === openId) ?? null;

  function act(id: string, decision: ReviewDecision) {
    startTransition(async () => {
      await reviewAction(id, decision);
      setOpenId(null);
    });
  }

  function suspend(id: string) {
    startTransition(async () => {
      await suspendMember(id);
      setOpenId(null);
    });
  }

  function reactivate(id: string) {
    startTransition(async () => {
      await reactivateMember(id);
      setOpenId(null);
    });
  }

  function markPaid(id: string) {
    startTransition(async () => {
      await markMemberPaid(id);
      setOpenId(null);
    });
  }

  function unmarkPaid(id: string) {
    startTransition(async () => {
      await unmarkMemberPaid(id);
      setOpenId(null);
    });
  }

  // 削除の確認はConfirmDeleteButtonのモーダル側で行う（売りたい・買いたいの削除と同じ仕様）
  async function remove(id: string) {
    await deleteMember(id);
    setOpenId(null);
  }

  return (
    <>
      <div className="overflow-x-auto rounded-[10px] border border-[var(--line)] bg-white">
        <table className="w-full min-w-[820px] text-[13px]">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--canvas)] text-left text-[11px] text-[var(--muted)]">
              <th className="px-4 py-3 font-medium">会社名・団体名</th>
              <th className="px-4 py-3 font-medium">担当者</th>
              <th className="px-4 py-3 font-medium">会員種別</th>
              <th className="px-4 py-3 font-medium">所在地</th>
              <th className="px-4 py-3 font-medium">記入率</th>
              <th className="px-4 py-3 font-medium">審査</th>
              <th className="px-4 py-3 font-medium">課金状態</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--muted)]">
                  審査対象の会員はまだありません。
                </td>
              </tr>
            ) : (
              rows.map((m) => (
                <tr key={m.id} className="border-b border-[#EDF0EA]">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setOpenId(m.id)}
                      className="text-left font-medium text-[var(--green-d)] underline decoration-dotted underline-offset-2 hover:text-[var(--green)]"
                    >
                      {m.name || "（未入力）"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-[var(--ink-2)]">{m.contactName}</td>
                  <td className="px-4 py-3 text-[var(--ink-2)]">
                    {m.categoryL1}
                    {m.categoryL2 ? ` / ${m.categoryL2}` : ""}
                  </td>
                  <td className="px-4 py-3 text-[var(--ink-2)]">
                    {[m.prefecture, m.city].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--ink-2)]">{m.completionRate}%</td>
                  <td className="px-4 py-3">
                    <Badge map={STATUS} value={m.status} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge map={PAYMENT} value={m.paymentStatus} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {current ? (
        <DetailModal
          row={current}
          pending={pending}
          onClose={() => setOpenId(null)}
          onAct={act}
          onSuspend={suspend}
          onReactivate={reactivate}
          onDelete={remove}
          onMarkPaid={markPaid}
          onUnmarkPaid={unmarkPaid}
        />
      ) : null}
    </>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 border-b border-[#EDF0EA] py-2">
      <div className="text-[12px] text-[var(--muted)]">{label}</div>
      <div className="whitespace-pre-wrap text-[13px] text-[var(--ink)]">{value}</div>
    </div>
  );
}

function DetailModal({
  row,
  pending,
  onClose,
  onAct,
  onSuspend,
  onReactivate,
  onDelete,
  onMarkPaid,
  onUnmarkPaid,
}: {
  row: AdminRow;
  pending: boolean;
  onClose: () => void;
  onAct: (id: string, decision: ReviewDecision) => void;
  onSuspend: (id: string) => void;
  onReactivate: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  onMarkPaid: (id: string) => void;
  onUnmarkPaid: (id: string) => void;
}) {
  const isSuspended = row.status === "SUSPENDED";
  const isPaid = row.paymentStatus === "PAID";
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[86vh] w-full max-w-[640px] overflow-y-auto rounded-[12px] bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <h2 className={h2Cls}>
              {row.name || "（未入力）"}
            </h2>
            <p className="mt-1 text-[12px] text-[var(--muted)]">
              担当者：{row.contactName}（{row.contactEmail}）
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-end gap-1">
              <Badge map={STATUS} value={row.status} />
              <Badge map={PAYMENT} value={row.paymentStatus} />
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="閉じる"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--line)] text-[18px] leading-none text-[var(--ink-2)] hover:bg-[var(--canvas)]"
            >
              ×
            </button>
          </div>
        </div>

        {/* 登録者（ログインアカウント）一覧 */}
        <div className="mb-4 rounded-[10px] border border-[var(--line)] bg-[var(--canvas)] p-4">
          <div className="mb-2 text-[12px] font-medium text-[var(--ink-2)]">
            登録者（ログインアカウント）{row.users.length}名
          </div>
          {row.users.length === 0 ? (
            <div className="text-[12px] text-[var(--muted)]">登録者がいません。</div>
          ) : (
            <div className="flex flex-col gap-2">
              {row.users.map((u, i) => (
                <div key={u.id} className="rounded-md border border-[var(--line)] bg-white p-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[var(--green-soft)] px-2 py-0.5 text-[11px] text-[var(--green-d)]">
                      {i + 1}人目
                    </span>
                    <span className="text-[13px] font-medium text-[var(--ink)]">
                      {u.name || "（担当者名 未登録）"}
                    </span>
                  </div>
                  <div className="mt-1.5 grid grid-cols-[72px_1fr] gap-x-2 gap-y-1 text-[12px]">
                    <span className="text-[var(--muted)]">メール</span>
                    <span className="break-all text-[var(--ink-2)]">{u.email}</span>
                    <span className="text-[var(--muted)]">ID</span>
                    <span className="break-all font-mono text-[11px] text-[var(--muted)]">{u.id}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mb-5">
          <Row label="担当者（ふりがな）" value={row.contactKana} />
          <Row label="会員種別" value={`${row.categoryL1}${row.categoryL2 ? " / " + row.categoryL2 : ""}`} />
          <Row label="都道府県 / 市区町村" value={[row.prefecture, row.city].filter(Boolean).join(" / ") || null} />
          <Row label="本店所在地" value={[row.postalCode ? `〒${row.postalCode}` : null, row.address].filter(Boolean).join(" ") || null} />
          <Row label="Webサイト" value={row.website} />
          <Row label="設立" value={row.founded} />
          <Row label="事業規模" value={row.size} />
          <Row label="記入率" value={`${row.completionRate}%`} />
          <Row label="事業紹介" value={row.description} />

          {row.imageUrls.length > 0 ? (
            <div className="border-b border-[#EDF0EA] py-2">
              <div className="mb-2 text-[12px] text-[var(--muted)]">サムネイル画像</div>
              <div className="flex flex-wrap gap-2">
                {row.imageUrls.map((u) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={u}
                    src={u}
                    alt=""
                    className="h-20 w-20 rounded-md border border-[var(--line)] object-cover"
                  />
                ))}
              </div>
            </div>
          ) : null}

          <Row label="強み・特徴" value={row.featureText} />
          <Row
            label="許認可"
            value={row.hasLicense ? `あり${row.licenseName ? "：" + row.licenseName : ""}` : "なし"}
          />
          <Row label="設備・加工能力" value={row.equipmentText} />
          <Row label="現在の販路・売り場" value={row.salesAreaText} />
          <Row label="現在の困りごと" value={row.logisticsText} />
          <Row label="余っている食材・規格外品" value={row.foodlossText} />
          <Row label="組みたい相手" value={row.collabStyle} />
          <Row label="解決したい課題" value={row.challengeText} />
          <Row label="始めたい時期" value={row.startTiming} />
        </div>

        <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-[var(--line)] bg-white pt-4">
          <button
            type="button"
            disabled={pending}
            onClick={() => onAct(row.id, "approve")}
            className={btn("primary", "md")}
          >
            承認
          </button>
          {/* 「課金してもらう」は無料化に伴い撤去（2026-08-10。AWAITING_PAYMENTの既存表示のみ残す） */}
          <button
            type="button"
            disabled={pending}
            onClick={() => onAct(row.id, "reject")}
            className={btn("danger", "md")}
          >
            非承認（情報記載を促す）
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className={`${btn("secondary", "md")} ml-auto`}
          >
            画面を閉じる
          </button>
        </div>

        {/* 入金管理（手動） */}
        <div className="mt-4 rounded-[10px] border border-[var(--line)] bg-[var(--canvas)] p-4">
          <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-[var(--ink-2)]">
            入金の管理
            <Badge map={PAYMENT} value={row.paymentStatus} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isPaid ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => onUnmarkPaid(row.id)}
                className={btn("secondary", "md")}
              >
                課金を解除（無料に戻す）
              </button>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => onMarkPaid(row.id)}
                className={btn("primary", "md")}
              >
                入金確認済み → ビジネス会員（課金中）にする
              </button>
            )}
          </div>
          <p className="mt-2 text-[11px] text-[var(--muted)]">
            銀行振込・請求書払いなどで入金を確認したら「ビジネス会員（課金中）」にします。Premium会員になると、提案の無制限送信、受信した問い合わせへの応対（2往復目以降）、掲載オプション20%割引が使えるようになります。
          </p>
        </div>

        {/* 会員管理（停止・削除） */}
        <div className="mt-3 rounded-[10px] border border-[var(--line)] bg-[var(--canvas)] p-4">
          <div className="mb-2 text-[12px] font-medium text-[var(--ink-2)]">会員の管理</div>
          <div className="flex flex-wrap items-center gap-2">
            {isSuspended ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => onReactivate(row.id)}
                className={btn("primary", "md")}
              >
                利用を再開する
              </button>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => onSuspend(row.id)}
                className={btn("danger", "md")}
              >
                アカウントを停止（無効化）
              </button>
            )}
            <div className="ml-auto">
              <ConfirmDeleteButton
                action={() => onDelete(row.id)}
                buttonLabel="完全に削除する"
                buttonClassName={btn("danger", "md")}
                title="本当に完全に削除しますか？"
                description={`「${row.name || "この会員"}」の登録データ（台帳・お気に入り・プロジェクト・商談・メッセージ）とログインアカウントがすべて削除されます。この操作は元に戻せません。`}
              />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-[var(--muted)]">
            「停止」はログイン不可・非公開にします（あとで再開できます）。「完全に削除」は登録データとログインごと消去し、元に戻せません。
          </p>
        </div>
      </div>
    </div>
  );
}
