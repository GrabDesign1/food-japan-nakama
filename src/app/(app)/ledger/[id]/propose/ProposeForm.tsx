"use client";

// 提案送信フォーム／クレジット購入ボタン（useActionStateでエラー表示・送信中disabled）。
// 操作はメッセージ画面のComposerと同じ仕様に統一する（2026-08-11 ユーザー指示）＝
// 下書き保存／テンプレートから選択／面談日程を調整／ファイル添付。定型文とモーダルはComposerと共用。
// 違いは2点だけ：①送信でクレジットを消費する（ボタン表記が変わる）
// ②スレッドがまだ無いため、下書きはこのブラウザに保存し、添付は送信時にメッセージへ紐づける。
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { sendProposal, buyProposalProduct, uploadProposalAttachment, type ProposeState } from "./actions";
import { createTemplate, deleteTemplate } from "../../../messages/actions";
import { DEFAULT_TEMPLATES, Modal, formatBytes } from "../../../messages/_components/Composer";
import { btn } from "@/lib/ui";

type Template = { id: string; name: string; body: string };

export function ProposeForm(props: {
  mode: "send" | "buy";
  offeringId: string;
  needsCredit?: boolean;
  creditBalance?: number;
  /** この案件に必要なクレジット数（通常1・NAKAMA確認済み案件3）。 */
  creditCost?: number;
  buyOptions?: { code: string; label: string }[];
  initialTemplates?: Template[];
  myCompanyName?: string;
  myPersonName?: string;
}) {
  if (props.mode === "buy") {
    return (
      <div className="mt-3 flex flex-col gap-2">
        {(props.buyOptions ?? []).map((o) => (
          <BuyButton key={o.code} offeringId={props.offeringId} code={o.code} label={o.label} />
        ))}
      </div>
    );
  }
  return <SendForm {...props} />;
}

function SendForm({
  offeringId,
  needsCredit,
  creditBalance,
  creditCost = 1,
  initialTemplates = [],
  myCompanyName = "",
  myPersonName = "",
}: {
  offeringId: string;
  needsCredit?: boolean;
  creditBalance?: number;
  creditCost?: number;
  initialTemplates?: Template[];
  myCompanyName?: string;
  myPersonName?: string;
}) {
  const [state, action, sending] = useActionState<ProposeState, FormData>(
    sendProposal.bind(null, offeringId),
    {}
  );

  const draftKey = `nakama.proposeDraft.${offeringId}`;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [modal, setModal] = useState<null | "template" | "schedule">(null);
  const [creating, setCreating] = useState(false);
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [attachment, setAttachment] = useState<{ url: string; name: string; size: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  // 添付のプレビュー（画像はローカルURLでその場に出す。モーダルは出さない＝2026-08-11 ユーザー指示）
  const [filePreview, setFilePreview] = useState<string | null>(null);

  // 面談日程
  const [rows, setRows] = useState([{ date: "", start: "", end: "" }]);
  const [remark, setRemark] = useState("");

  // テンプレート作成
  const [tName, setTName] = useState("");
  const [tBody, setTBody] = useState("");

  // 下書きの復元（スレッドがまだ無いのでサーバーには保存できない＝このブラウザにのみ残る）
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved && textareaRef.current && !textareaRef.current.value) {
        textareaRef.current.value = saved;
      }
    } catch {
      // プライベートモード等では復元しない
    }
  }, [draftKey]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  /** 定型文の「◯◯（事業者名）」「△△」を自分の情報で埋める（未登録なら元の記号のまま残す）。 */
  const fillTemplate = (body: string) =>
    body
      .replace(/◯◯（事業者名）/g, myCompanyName.trim() || "◯◯（事業者名）")
      .replace(/△△/g, myPersonName.trim() || "△△");

  function appendText(t: string) {
    const el = textareaRef.current;
    if (!el) return;
    el.value = el.value.trim() ? el.value.trimEnd() + "\n\n" + t : t;
    el.focus();
  }

  function onSaveDraft() {
    try {
      localStorage.setItem(draftKey, textareaRef.current?.value ?? "");
      showToast("下書きを保存しました（このブラウザに保存されます）");
    } catch {
      showToast("この環境では下書きを保存できません");
    }
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    // 画像はその場でプレビューできるようにローカルURLを作る（アップロード結果は非公開URLのため）
    const localPreview = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    setUploading(true);
    startTransition(async () => {
      const res = await uploadProposalAttachment(offeringId, fd);
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
      if (res.error) {
        if (localPreview) URL.revokeObjectURL(localPreview);
        showToast(res.error);
        return;
      }
      if (res.url && res.name) {
        // 前の添付のプレビューURLは破棄する（添付し直しでも増えないように）
        if (filePreview) URL.revokeObjectURL(filePreview);
        setAttachment({ url: res.url, name: res.name, size: res.size ?? 0 });
        setFilePreview(localPreview);
        showToast("提案に添付しました");
      }
    });
  }

  /** 添付を取り消す。 */
  function clearAttachment() {
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(null);
    setAttachment(null);
  }

  function onCreateTemplate() {
    startTransition(async () => {
      const res = await createTemplate(tName, tBody);
      if ("error" in res) {
        showToast(res.error);
        return;
      }
      setTemplates([res, ...templates]);
      setTName("");
      setTBody("");
      setCreating(false);
      showToast("テンプレートを作成しました");
    });
  }

  function onDeleteTemplate(id: string) {
    startTransition(async () => {
      await deleteTemplate(id);
      setTemplates(templates.filter((t) => t.id !== id));
    });
  }

  function insertSchedule() {
    const lines = rows
      .filter((r) => r.date)
      .map((r) => {
        const dt = new Date(r.date);
        const w = ["日", "月", "火", "水", "木", "金", "土"][dt.getDay()];
        const p = (n: number) => String(n).padStart(2, "0");
        const range = r.start && r.end ? ` ${r.start}〜${r.end}` : r.start ? ` ${r.start}〜` : "";
        return `・${dt.getFullYear()}/${p(dt.getMonth() + 1)}/${p(dt.getDate())}（${w}）${range}`;
      });
    if (lines.length) {
      let text = "【面談候補日】\n" + lines.join("\n");
      if (remark.trim()) text += "\n備考：" + remark.trim();
      appendText(text);
    }
    setModal(null);
    setRows([{ date: "", start: "", end: "" }]);
    setRemark("");
  }

  // 確認済み案件は3クレジット必要。残高が足りているかは必要数で判定する
  const noCredit = !!needsCredit && (creditBalance ?? 0) < creditCost;
  const btnCls =
    "flex items-center gap-1 text-[12px] text-[var(--muted)] hover:text-[var(--green-d)] disabled:opacity-50";

  return (
    <>
      <form action={action} className="mt-3">
        <textarea
          ref={textareaRef}
          name="message"
          required
          rows={6}
          placeholder="例：規格外トマトを年間○トン供給できます。糖度・サイズ・出荷時期は〜"
          className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--green)]"
        />

        {uploading ? (
          <div className="mt-2 flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--canvas)] px-3 py-2 text-[12px] text-[var(--ink-2)]">
            <span
              aria-hidden
              className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--green)]"
            />
            ファイルをアップロードしています…
          </div>
        ) : null}

        {/* 添付は提案文のすぐ下に出す（画像はそのままプレビュー）。相手にも同じ形で届く */}
        {attachment ? (
          <div className="mt-2 rounded-[10px] border border-[var(--green)] bg-white p-3">
            {filePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={filePreview}
                alt={attachment.name}
                className="mb-2 max-h-[220px] w-auto rounded object-contain"
              />
            ) : (
              <div className="mb-2 text-[28px] leading-none">📄</div>
            )}
            <div className="flex flex-wrap items-center gap-2 text-[12px]">
              <span className="break-all text-[var(--ink)]">
                {attachment.name}
                <span className="text-[var(--muted)]">（{formatBytes(attachment.size)}）</span>
              </span>
              <button type="button" onClick={clearAttachment} className="shrink-0 text-[var(--red)] underline">
                取り消す
              </button>
            </div>
            <p className="mt-1 text-[11px] text-[var(--muted)]">
              提案を送信すると相手に届きます（相手はプレビューとダウンロードができます）。
            </p>
            <input type="hidden" name="attachmentUrl" value={attachment.url} />
            <input type="hidden" name="attachmentName" value={attachment.name} />
            <input type="hidden" name="attachmentSize" value={attachment.size} />
          </div>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-4">
          <button type="button" onClick={onSaveDraft} disabled={pending} className={btnCls}>
            ⤓ 下書き保存
          </button>
          <button type="button" onClick={() => setModal("template")} className={btnCls}>
            🗒 テンプレートから選択
          </button>
          <button type="button" onClick={() => setModal("schedule")} className={btnCls}>
            📅 面談日程を調整
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={pending || uploading}
            className={btnCls}
          >
            📎 {uploading ? "アップロード中…" : attachment ? "添付を変更" : "ファイル添付"}
          </button>
        </div>
        <input ref={fileRef} type="file" hidden onChange={onPickFile} />

        {state.error ? (
          <p className="mt-3 rounded-md bg-[var(--red-soft)] px-3 py-2 text-[12px] text-[var(--red)]">
            {state.error}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button disabled={sending || noCredit} className={`${btn("primary", "md")} disabled:opacity-50`}>
            {sending
              ? "送信中…"
              : needsCredit
                ? `${creditCost}クレジットを使って提案を送信する`
                : "提案を送信する（無料）"}
          </button>
          {noCredit ? (
            <span className="text-[12px] text-[var(--red)]">
              クレジットが不足しています（この案件には{creditCost}クレジット必要です）。上の購入からお求めください。
            </span>
          ) : null}
        </div>
      </form>

      {/* トースト */}
      {toast ? (
        <div className="fixed right-6 top-6 z-[60] rounded-md bg-[var(--green)] px-5 py-3 text-[14px] font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      {/* テンプレートモーダル（メッセージ画面と同じ定型文・保存済みテンプレートを共用） */}
      {modal === "template" ? (
        <Modal
          title={creating ? "メッセージテンプレート作成" : "メッセージテンプレート選択"}
          onClose={() => {
            setModal(null);
            setCreating(false);
          }}
        >
          {creating ? (
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-[13px] text-[var(--ink-2)]">
                テンプレート名
                <input
                  value={tName}
                  onChange={(e) => setTName(e.target.value)}
                  className="rounded-md border border-[var(--line)] px-3 py-2 text-[14px] outline-none focus:border-[var(--green)]"
                />
              </label>
              <label className="flex flex-col gap-1 text-[13px] text-[var(--ink-2)]">
                テンプレート本文
                <textarea
                  value={tBody}
                  onChange={(e) => setTBody(e.target.value)}
                  rows={6}
                  className="rounded-md border border-[var(--green)] px-3 py-2 text-[14px] outline-none"
                />
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={onCreateTemplate} disabled={pending} className={btn("primary", "sm")}>
                  保存する
                </button>
                <button type="button" onClick={() => setCreating(false)} className={btn("secondary", "sm")}>
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {DEFAULT_TEMPLATES.map((t) => (
                <div key={t.name} className="rounded-lg border border-[var(--line)] p-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[14px] font-medium text-[var(--ink)]">
                      {t.name}
                      <span className="rounded bg-[var(--green-soft)] px-1.5 py-0.5 text-[10px] text-[var(--green-d)]">
                        定型
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        appendText(fillTemplate(t.body));
                        setModal(null);
                      }}
                      className={`${btn("primary", "sm")} shrink-0`}
                    >
                      この文面を使う
                    </button>
                  </div>
                  <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-[12px] text-[var(--muted)]">
                    {fillTemplate(t.body)}
                  </p>
                </div>
              ))}

              {templates.map((t) => (
                <div key={t.id} className="rounded-lg border border-[var(--line)] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-medium text-[var(--ink)]">{t.name}</span>
                    <div className="flex gap-3 text-[12px]">
                      <button
                        type="button"
                        onClick={() => {
                          appendText(fillTemplate(t.body));
                          setModal(null);
                        }}
                        className={`${btn("primary", "sm")} shrink-0`}
                      >
                        この文面を使う
                      </button>
                      <button type="button" onClick={() => onDeleteTemplate(t.id)} className="text-[var(--red)] underline">
                        削除
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[12px] text-[var(--muted)]">{t.body}</p>
                </div>
              ))}

              <button type="button" onClick={() => setCreating(true)} className={`${btn("primary", "sm")} w-fit`}>
                ＋ 新規テンプレート作成
              </button>
            </div>
          )}
        </Modal>
      ) : null}

      {/* 面談日程モーダル（メッセージ画面と同じ） */}
      {modal === "schedule" ? (
        <Modal title="面談日程調整" onClose={() => setModal(null)}>
          <div className="flex flex-col gap-4">
            <div className="rounded-lg bg-[var(--canvas)] p-4">
              <div className="mb-2 text-[13px] font-semibold text-[var(--ink-2)]">候補日</div>
              <div className="flex flex-col gap-2">
                {rows.map((r, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={r.date}
                      onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))}
                      className="rounded-md border border-[var(--line)] bg-white px-2 py-1.5 text-[13px]"
                    />
                    <input
                      type="time"
                      value={r.start}
                      onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))}
                      className="rounded-md border border-[var(--line)] bg-white px-2 py-1.5 text-[13px]"
                    />
                    <span>〜</span>
                    <input
                      type="time"
                      value={r.end}
                      onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))}
                      className="rounded-md border border-[var(--line)] bg-white px-2 py-1.5 text-[13px]"
                    />
                    {rows.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => setRows(rows.filter((_, j) => j !== i))}
                        className="text-[12px] text-[var(--red)]"
                      >
                        削除
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setRows([...rows, { date: "", start: "", end: "" }])}
                className={`${btn("secondary", "sm")} mt-3`}
              >
                候補日を追加する
              </button>
            </div>
            <label className="flex flex-col gap-1 text-[13px] text-[var(--ink-2)]">
              備考
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows={3}
                className="rounded-md border border-[var(--line)] px-3 py-2 text-[14px] outline-none focus:border-[var(--green)]"
              />
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={insertSchedule} className={btn("primary", "sm")}>
                提案文に反映
              </button>
              <button type="button" onClick={() => setModal(null)} className={btn("secondary", "sm")}>
                キャンセル
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  );
}

function BuyButton({ offeringId, code, label }: { offeringId: string; code: string; label: string }) {
  const [state, action, pending] = useActionState<ProposeState, FormData>(
    buyProposalProduct.bind(null, offeringId, code),
    {}
  );
  return (
    <form action={action}>
      {state.error ? <p className="mb-1 text-[12px] text-[var(--red)]">{state.error}</p> : null}
      <button disabled={pending} className={`${btn("secondary", "sm")} w-full sm:w-auto disabled:opacity-50`}>
        {pending ? "決済画面へ移動中…" : label}
      </button>
    </form>
  );
}
