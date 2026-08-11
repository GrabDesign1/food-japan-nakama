"use client";

// 応募者ごとの進捗管理カード（主催者のみ）。5段階＋保留/見送り/完了、
// 次の行動・期限・担当・次回打ち合わせ・非公開メモを編集できる。
// D&Dは使わず明示的なステータス変更（指示書 §10：更新事故とアクセシビリティ配慮）。
import { useActionState, useState } from "react";
import Link from "next/link";
import { updateApplicationProgress, type ProjectState } from "../actions";
import {
  PROGRESS_STAGES,
  PROGRESS_EXTRAS,
  PROGRESS_LABEL,
  MEETING_WISH_LABEL,
} from "@/lib/project-taxonomy";
import { btn, input } from "@/lib/ui";

const inputCls =
  input("sm");
const labelCls = "flex flex-col gap-1 text-[12px] text-[var(--ink-2)]";

export type ApplicantData = {
  applicationId: string;
  applicantMemberId: string;
  applicantName: string;
  appliedAt: string; // 表示用整形済み
  reason: string | null;
  offer: string | null;
  involvement: string | null;
  meetingWish: string | null;
  desiredRole: string | null;
  message: string | null;
  progressStage: string;
  nextAction: string | null;
  nextActionDue: string | null; // YYYY-MM-DD
  assignee: string | null;
  nextMeetingAt: string | null; // YYYY-MM-DDTHH:mm
  ownerMemo: string | null;
  holdReason: string | null;
  updatedAt: string; // 表示用整形済み
  threadId: string | null;
  dueState: "overdue" | "soon" | "none" | "ok";
  activities: { id: string; label: string; at: string }[];
};

const STAGE_BADGE: Record<string, string> = {
  inquiry: "bg-[#EEF2FA] text-[#3C4A62]",
  meeting: "bg-[var(--amber-soft)] text-[var(--amber)]",
  planning: "bg-[var(--amber-soft)] text-[var(--amber)]",
  pilot: "bg-[var(--green-soft)] text-[var(--green-d)]",
  contract: "bg-[var(--green)] text-white",
  hold: "bg-[var(--line)] text-[var(--ink-2)]",
  declined: "bg-[var(--line)] text-[var(--ink-2)]",
  done: "bg-[var(--green-soft)] text-[var(--green-d)]",
};

export function ApplicantProgressCard({ app }: { app: ApplicantData }) {
  const action = updateApplicationProgress.bind(null, app.applicationId);
  const [state, formAction, pending] = useActionState<ProjectState, FormData>(action, {});
  const [stage, setStage] = useState(app.progressStage);
  const showHoldReason = stage === "hold" || stage === "declined";

  return (
    <div className="rounded-[12px] border border-[var(--line)] bg-white p-5">
      {/* ヘッダー：応募者・段階・期限アラート */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/producers/${app.applicantMemberId}`}
          className="text-[15px] font-bold text-[var(--ink)] hover:underline"
        >
          {app.applicantName}
        </Link>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STAGE_BADGE[app.progressStage] ?? STAGE_BADGE.inquiry}`}>
          {PROGRESS_LABEL[app.progressStage] ?? app.progressStage}
        </span>
        {app.dueState === "overdue" ? (
          <span className="rounded-full bg-[#FBF1EE] px-2.5 py-1 text-[11px] font-bold text-[var(--red)]">⚠ 期限超過</span>
        ) : app.dueState === "soon" ? (
          <span className="rounded-full bg-[var(--amber-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--amber)]">⏰ 期限が近い</span>
        ) : app.dueState === "none" ? (
          <span className="rounded-full border border-dashed border-[var(--line)] px-2.5 py-1 text-[11px] text-[var(--muted)]">次の行動を設定</span>
        ) : null}
        <span className="ml-auto text-[11px] text-[var(--muted)]">
          応募 {app.appliedAt} ・ 最終更新 {app.updatedAt}
        </span>
      </div>

      {/* 応募内容 */}
      <div className="mt-3 rounded-[10px] bg-[#FAFBF9] p-3 text-[13px] leading-6 text-[var(--ink-2)]">
        {app.desiredRole ? (
          <div><b className="text-[var(--green-d)]">希望する役割：</b>{app.desiredRole}</div>
        ) : null}
        {app.reason ? (
          <div className="mt-1"><b>興味を持った理由：</b><span className="whitespace-pre-wrap">{app.reason}</span></div>
        ) : null}
        {app.offer ? (
          <div className="mt-1"><b>提供できるもの：</b><span className="whitespace-pre-wrap">{app.offer}</span></div>
        ) : null}
        {app.involvement ? (
          <div className="mt-1"><b>希望する関わり方：</b><span className="whitespace-pre-wrap">{app.involvement}</span></div>
        ) : null}
        {app.meetingWish ? (
          <div className="mt-1"><b>面談：</b>{MEETING_WISH_LABEL[app.meetingWish] ?? app.meetingWish}</div>
        ) : null}
        {app.message ? (
          <div className="mt-1"><b>メッセージ：</b><span className="whitespace-pre-wrap">{app.message}</span></div>
        ) : null}
        <div className="mt-2">
          {app.threadId ? (
            <Link href={`/messages/${app.threadId}`} className="text-[12px] font-bold text-[var(--green-d)] underline">
              メッセージを開く →
            </Link>
          ) : (
            <Link href={`/producers/${app.applicantMemberId}`} className="text-[12px] font-bold text-[var(--green-d)] underline">
              プロフィールを見て連絡する →
            </Link>
          )}
        </div>
      </div>

      {/* 進捗管理フォーム */}
      <form action={formAction} className="mt-3 flex flex-col gap-3">
        <div>
          <div className="mb-1.5 text-[12px] text-[var(--ink-2)]">現在の段階</div>
          <div className="flex flex-wrap gap-1.5">
            {[...PROGRESS_STAGES, ...PROGRESS_EXTRAS].map(([value, label]) => (
              <label
                key={value}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-[12px] transition ${
                  stage === value
                    ? "border-[var(--green)] bg-[var(--green-soft)] font-bold text-[var(--green-d)]"
                    : "border-[var(--line)] bg-white text-[var(--ink-2)] hover:border-[var(--green)]"
                }`}
              >
                <input
                  type="radio"
                  name="progressStage"
                  value={value}
                  checked={stage === value}
                  onChange={() => setStage(value)}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={labelCls}>
            次に行うこと
            <input
              name="nextAction"
              defaultValue={app.nextAction ?? ""}
              placeholder="例：サンプルを送付し、面談日程を調整する"
              className={inputCls}
            />
          </label>
          <label className={labelCls}>
            期限
            <input type="date" name="nextActionDue" defaultValue={app.nextActionDue ?? ""} className={inputCls} />
          </label>
          <label className={labelCls}>
            担当者
            <input
              name="assignee"
              defaultValue={app.assignee ?? ""}
              placeholder="例：梅原"
              className={inputCls}
            />
          </label>
          <label className={labelCls}>
            次回打ち合わせ日時
            <input
              type="datetime-local"
              name="nextMeetingAt"
              defaultValue={app.nextMeetingAt ?? ""}
              className={inputCls}
            />
          </label>
        </div>

        <label className={labelCls}>
          最新メモ（相手には表示されません）
          <textarea
            name="ownerMemo"
            defaultValue={app.ownerMemo ?? ""}
            rows={2}
            placeholder="例：試作の条件は前向き。原料コストの試算を待って判断。"
            className={inputCls}
          />
        </label>

        {showHoldReason ? (
          <label className={labelCls}>
            保留・見送りの理由（相手には表示されません）
            <input
              name="holdReason"
              defaultValue={app.holdReason ?? ""}
              placeholder="例：時期が合わないため、次シーズンに再検討"
              className={inputCls}
            />
          </label>
        ) : (
          <input type="hidden" name="holdReason" value={app.holdReason ?? ""} />
        )}

        <div className="flex items-center gap-3">
          <button disabled={pending} className={btn("primary", "sm")}>
            {pending ? "保存中…" : "進捗を保存"}
          </button>
          {state.ok ? <span className="text-[12px] text-[var(--green-d)]">保存しました。</span> : null}
          {state.error ? <span className="text-[12px] text-[var(--red)]">{state.error}</span> : null}
        </div>
      </form>

      {/* 活動履歴 */}
      {app.activities.length ? (
        <details className="mt-3 rounded-[8px] border border-[var(--line)] bg-[#FAFBF9] px-3 py-2">
          <summary className="cursor-pointer text-[12px] font-bold text-[var(--ink-2)]">
            活動履歴（{app.activities.length}）
          </summary>
          <ul className="mt-2 flex flex-col gap-1">
            {app.activities.map((a) => (
              <li key={a.id} className="flex gap-2 text-[12px] leading-5 text-[var(--ink-2)]">
                <span className="shrink-0 text-[var(--muted)]">{a.at}</span>
                <span>{a.label}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
