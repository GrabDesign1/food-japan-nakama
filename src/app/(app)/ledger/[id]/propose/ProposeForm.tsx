"use client";

// 提案送信フォーム／クレジット購入ボタン（useActionStateでエラー表示・送信中disabled）。
// 操作はメッセージ画面のComposerと同じ仕様に統一する（2026-08-11 ユーザー指示）＝
// 下書き保存／テンプレートから選択／面談日程を調整／ファイル添付。定型文とモーダルはComposerと共用。
// 違いは2点だけ：①送信でクレジットを消費する（ボタン表記が変わる）
// ②スレッドがまだ無いため、下書きはこのブラウザに保存し、添付は送信時にメッセージへ紐づける。
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { sendProposal, buyProposalProduct, uploadProposalAttachment, type ProposeState } from "./actions";
import { createTemplate, deleteTemplate } from "../../../messages/actions";
import { Modal, formatBytes } from "../../../messages/_components/Composer";
import { btn } from "@/lib/ui";
import { MAX_ATTACHMENTS } from "@/lib/attachments";
import { ScheduleModal } from "@/components/ScheduleModal";

type Template = { id: string; name: string; body: string };

// 提案用の定型文（メッセージ画面の汎用文とは別。募集内容を見て提案する場面に合わせている）。
// ■■（案件名）は開いている募集のタイトルに置き換わる。
const PROPOSE_TEMPLATES: { name: string; body: string }[] = [
  {
    name: "募集を見て提案する",
    body:
      "はじめまして。◯◯（事業者名）の△△と申します。\n" +
      "「■■（案件名）」の募集を拝見し、お力になれそうでしたのでご提案いたします。\n\n" +
      "【ご提案する商品・原料】\n" +
      "【産地・原料】\n" +
      "【規格・サイズ・荷姿】\n" +
      "【ご用意できる量】\n" +
      "【希望価格】\n" +
      "【最小取引量】\n" +
      "【出荷できる時期】\n\n" +
      "サンプルの送付も可能です。ご検討のほど、よろしくお願いいたします。",
  },
  {
    name: "条件を確認してから提案したい",
    body:
      "はじめまして。◯◯（事業者名）の△△と申します。\n" +
      "「■■（案件名）」の募集を拝見しました。ご提案の前に、下記について教えていただけますでしょうか。\n\n" +
      "・ご希望の数量と納品の頻度\n" +
      "・ご希望の価格帯\n" +
      "・必要な規格や認証\n" +
      "・納品先とご希望の時期\n\n" +
      "お手数ですが、よろしくお願いいたします。",
  },
  {
    name: "代わりのご提案をする",
    body:
      "はじめまして。◯◯（事業者名）の△△と申します。\n" +
      "「■■（案件名）」の募集を拝見しました。ご指定の条件とは少し異なりますが、目的に合いそうなものがございましたのでご提案いたします。\n\n" +
      "【ご提案する商品・原料】\n" +
      "【ご指定の条件と異なる点】\n" +
      "【それでもお役に立てると考えた理由】\n" +
      "【価格・数量・時期】\n\n" +
      "ご要望に合わないようでしたら、遠慮なくお申し付けください。",
  },
  {
    name: "打ち合わせをお願いする",
    body:
      "「■■（案件名）」の件でご提案いたします、◯◯（事業者名）の△△と申します。\n" +
      "詳しい条件は一度お話しさせていただいた方が早いかと思いますので、オンラインで30分ほどお時間をいただけないでしょうか。\n" +
      "下記の候補からご都合のよい日時をお知らせください。",
  },
];
/** 添付1件（preview は画像のときだけ入るローカルURL） */
type Attach = { url: string; name: string; size: number; preview: string | null };

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
  /** 提案先の募集タイトル（定型文の■■に差し込む） */
  listingTitle?: string;
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
  listingTitle = "",
}: {
  offeringId: string;
  needsCredit?: boolean;
  creditBalance?: number;
  creditCost?: number;
  initialTemplates?: Template[];
  myCompanyName?: string;
  myPersonName?: string;
  listingTitle?: string;
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
  const [attachments, setAttachments] = useState<Attach[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pending, startTransition] = useTransition();


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
      .replace(/△△/g, myPersonName.trim() || "△△")
      .replace(/■■（案件名）/g, listingTitle.trim() || "■■（案件名）");

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

  /** 選択・貼り付け・ドロップの入口。まとめてアップロードして添付に積む。 */
  function uploadFiles(files: File[]) {
    if (!files.length) return;
    const room = MAX_ATTACHMENTS - attachments.length;
    if (room <= 0) {
      showToast(`添付できるファイルは${MAX_ATTACHMENTS}件までです`);
      return;
    }
    const picked = files.slice(0, room);
    if (files.length > room) showToast(`添付は${MAX_ATTACHMENTS}件までのため、${room}件だけ追加します`);

    setUploading(true);
    startTransition(async () => {
      for (const file of picked) {
        const fd = new FormData();
        fd.append("file", file);
        // 画像はその場でプレビューできるようにローカルURLを作る（アップロード結果は非公開URLのため）
        const localPreview = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
        const res = await uploadProposalAttachment(offeringId, fd);
        if (res.error || !res.url || !res.name) {
          if (localPreview) URL.revokeObjectURL(localPreview);
          showToast(res.error ?? "アップロードに失敗しました");
          continue;
        }
        setAttachments((prev) =>
          prev.length >= MAX_ATTACHMENTS
            ? prev
            : [...prev, { url: res.url!, name: res.name!, size: res.size ?? 0, preview: localPreview }]
        );
      }
      setUploading(false);
    });
  }

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    uploadFiles(Array.from(e.target.files ?? []));
    if (fileRef.current) fileRef.current.value = "";
  }

  /** スクリーンショット等をそのまま貼り付けられるようにする（⌘V / Ctrl+V）。 */
  function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(e.clipboardData?.files ?? []);
    if (!files.length) return;
    e.preventDefault(); // 画像のときだけ既定の貼り付けを止める（文字の貼り付けは通常どおり）
    uploadFiles(files);
  }

  /** テキスト欄へのドラッグ&ドロップでも添付できるようにする。 */
  function onDrop(e: React.DragEvent<HTMLTextAreaElement>) {
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (!files.length) return;
    e.preventDefault();
    setDragOver(false);
    uploadFiles(files);
  }

  /** 添付を1件取り消す。 */
  function removeAttachment(url: string) {
    setAttachments((prev) => {
      const target = prev.find((a) => a.url === url);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((a) => a.url !== url);
    });
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
          placeholder="例：規格外トマトを年間○トン供給できます。糖度・サイズ・出荷時期は〜（画像はここに貼り付け・ドロップできます）"
          onPaste={onPaste}
          onDrop={onDrop}
          onDragOver={(e) => {
            if (e.dataTransfer?.types?.includes("Files")) {
              e.preventDefault();
              setDragOver(true);
            }
          }}
          onDragLeave={() => setDragOver(false)}
          className={`w-full rounded-lg border bg-white px-3 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--green)] ${
            dragOver ? "border-[var(--green)] bg-[var(--green-soft)]" : "border-[var(--line)]"
          }`}
        />
        <p className="mt-1 text-[11px] text-[var(--muted)]">
          画像はテキスト欄に貼り付け（⌘V）・ドラッグ&ドロップでも添付できます。
        </p>

        {uploading ? (
          <div className="mt-2 flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--canvas)] px-3 py-2 text-[12px] text-[var(--ink-2)]">
            <span
              aria-hidden
              className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--green)]"
            />
            ファイルをアップロードしています…
          </div>
        ) : null}

        {/* 提示額（任意）。掲載者が一覧で比較しやすくなる */}
        <label className="mt-3 flex flex-col gap-1 text-[12px] text-[var(--ink-2)]">
          提示額（任意・税込／円）
          <input
            name="proposedAmount"
            inputMode="numeric"
            placeholder="例：120000"
            className="w-[220px] rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--green)]"
          />
          <span className="text-[11px] text-[var(--muted)]">
            おおよその金額を入れておくと、相手が検討しやすくなります（この時点では契約ではありません）。
          </span>
        </label>

        {/* 添付は提案文のすぐ下に出す（画像はそのままプレビュー）。相手にも同じ形で届く */}
        {attachments.length ? (
          <div className="mt-2 flex flex-col gap-2">
            {attachments.map((a) => (
              <div key={a.url} className="rounded-[10px] border border-[var(--green)] bg-white p-3">
                {a.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.preview}
                    alt={a.name}
                    className="mb-2 max-h-[220px] w-auto rounded object-contain"
                  />
                ) : (
                  <div className="mb-2 text-[28px] leading-none">📄</div>
                )}
                <div className="flex flex-wrap items-center gap-2 text-[12px]">
                  <span className="break-all text-[var(--ink)]">
                    {a.name}
                    <span className="text-[var(--muted)]">（{formatBytes(a.size)}）</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(a.url)}
                    className="shrink-0 text-[var(--red)] underline"
                  >
                    取り消す
                  </button>
                </div>
                <input
                  type="hidden"
                  name="attachments"
                  value={JSON.stringify({ url: a.url, name: a.name, size: a.size })}
                />
              </div>
            ))}
            <p className="text-[11px] text-[var(--muted)]">
              提案を送信すると相手に届きます（相手はプレビューとダウンロードができます）。
              添付は{MAX_ATTACHMENTS}件まで・1件8MBまで。
            </p>
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
            disabled={pending || uploading || attachments.length >= MAX_ATTACHMENTS}
            className={btnCls}
          >
            📎 {uploading
              ? "アップロード中…"
              : attachments.length
                ? `ファイル添付（${attachments.length}/${MAX_ATTACHMENTS}）`
                : "ファイル添付"}
          </button>
        </div>
        <input ref={fileRef} type="file" multiple hidden onChange={onPickFiles} />

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
              {PROPOSE_TEMPLATES.map((t) => (
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

      {/* 面談日程（候補日を押して積み上げる。実装は共通コンポーネント） */}
      {modal === "schedule" ? (
        <ScheduleModal
          onClose={() => setModal(null)}
          insertLabel="提案文に反映"
          onInsert={(text) => {
            appendText(text);
            setModal(null);
          }}
        />
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
