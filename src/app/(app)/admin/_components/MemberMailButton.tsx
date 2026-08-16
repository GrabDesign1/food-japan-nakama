"use client";

// 顧客カルテから会員へメールを送るモーダル（2026-08-16）。
//
// 種別の扱い（規約第27条の2・特定電子メール法）：
//  - 利用案内（手続きの連絡）＝同意の有無に関わらず送れる。
//  - 広告・宣伝を含む案内＝**同意した宛先だけ**。未同意の人はチェックできないようにし、
//    サーバー側（sendMemberEmail）でも同じ検証をしている（画面の制御だけに頼らない）。
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { sendMemberEmail } from "../crm-actions";
import { useCloseOnEscape } from "@/components/useCloseOnEscape";
import { btn, input } from "@/lib/ui";
import { aBadge, aH2, aNote } from "./adminUi";

export type MailTarget = { id: string; name: string; email: string; optIn: boolean };

function SubmitButton({ kind }: { kind: "notice" | "ad" }) {
  const { pending } = useFormStatus();
  return (
    <button className={btn("primary", "sm")} disabled={pending}>
      {pending ? "送信中…" : kind === "ad" ? "広告として送信する" : "利用案内として送信する"}
    </button>
  );
}

export function MemberMailButton({
  memberId,
  memberName,
  targets,
}: {
  memberId: string;
  memberName: string;
  targets: MailTarget[];
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"notice" | "ad">("notice");
  const [checked, setChecked] = useState<string[]>(targets.map((t) => t.id));
  const [state, action] = useActionState(sendMemberEmail.bind(null, memberId), null);
  useCloseOnEscape(open, () => setOpen(false));

  const selectable = (t: MailTarget) => kind === "notice" || t.optIn;
  // 広告に切り替えたときは、同意していない宛先をその場で外して数える（effectで書き換えない）
  const effective = checked.filter((id) => {
    const t = targets.find((x) => x.id === id);
    return t ? selectable(t) : false;
  });

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={btn("action", "sm")}>
        メールを送る
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-[640px] overflow-y-auto rounded-[8px] bg-white p-6">
            <h2 className={aH2}>{memberName} へメールを送る</h2>
            <p className={`${aNote} mt-1`}>
              送った内容は対応履歴に自動で記録されます。会員間のメッセージには入りません。
            </p>

            <form action={action} className="mt-4 flex flex-col gap-4">
              {/* 種別 */}
              <fieldset className="rounded-[6px] border border-[#E3E6E8] p-3">
                <legend className="px-1 text-[12px] font-bold text-[var(--ink)]">メールの種類</legend>
                <label className="flex items-start gap-2 py-1 text-[13px]">
                  <input
                    type="radio"
                    name="kind"
                    value="notice"
                    checked={kind === "notice"}
                    onChange={() => setKind("notice")}
                    className="mt-1 accent-[var(--green)]"
                  />
                  <span>
                    <b>利用案内（手続きの連絡）</b>
                    <span className="block text-[12px] text-[var(--muted)]">
                      登録手続、掲載内容の確認依頼、審査結果など。同意していない方にも送れます。
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2 py-1 text-[13px]">
                  <input
                    type="radio"
                    name="kind"
                    value="ad"
                    checked={kind === "ad"}
                    onChange={() => setKind("ad")}
                    className="mt-1 accent-[var(--green)]"
                  />
                  <span>
                    <b>広告・宣伝を含む案内</b>
                    <span className="block text-[12px] text-[var(--muted)]">
                      サービスやキャンペーンの案内など。<b>案内メールに同意した方にだけ</b>送れます。本文の冒頭に「＜広告＞」と表示されます。
                    </span>
                  </span>
                </label>
              </fieldset>

              {/* 宛先 */}
              <div>
                <p className="text-[12px] font-bold text-[var(--ink)]">送信先</p>
                <div className="mt-2 flex flex-col gap-1">
                  {targets.map((t) => {
                    const ok = selectable(t);
                    return (
                      <label
                        key={t.id}
                        className={`flex items-center gap-2 text-[13px] ${ok ? "" : "opacity-50"}`}
                      >
                        <input
                          type="checkbox"
                          name="to"
                          value={t.id}
                          disabled={!ok}
                          checked={effective.includes(t.id)}
                          onChange={(e) =>
                            setChecked((prev) =>
                              e.target.checked ? [...prev, t.id] : prev.filter((x) => x !== t.id)
                            )
                          }
                          className="accent-[var(--green)]"
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {t.name || "（名前未設定）"}／{t.email}
                        </span>
                        <span className={t.optIn ? aBadge("green") : aBadge("neutral")}>
                          {t.optIn ? "案内メール同意" : "未同意"}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {kind === "ad" && targets.every((t) => !t.optIn) ? (
                  <p className="mt-2 text-[12px] text-[var(--red)]">
                    この会員に案内メールへ同意した方がいないため、広告・宣伝を含む案内は送れません。
                  </p>
                ) : null}
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-bold text-[var(--ink)]">件名</span>
                <input name="subject" maxLength={120} required className={`${input()} w-full`} />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-bold text-[var(--ink)]">本文</span>
                <textarea name="body" rows={10} maxLength={4000} required className={`${input()} w-full`} />
                <span className="text-[11px] text-[var(--muted)]">
                  署名（事務局名・住所・連絡先）と、広告のときの配信停止の案内は自動で付きます。
                </span>
              </label>

              {state?.ok ? (
                <p className="rounded-md bg-[var(--green-soft)] px-3 py-2 text-[12px] text-[var(--green-d)]">
                  {state.message}
                </p>
              ) : null}
              {state?.error ? (
                <p className="rounded-md bg-[var(--red-soft)] px-3 py-2 text-[12px] text-[var(--red)]">
                  {state.error}
                </p>
              ) : null}

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className={btn("secondary", "sm")}>
                  閉じる
                </button>
                <SubmitButton kind={kind} />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
