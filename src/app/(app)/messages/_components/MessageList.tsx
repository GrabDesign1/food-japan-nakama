"use client";

// やり取りの履歴表示（メッセージ画面と、案件ごとの提案画面で共用）。
// 添付は複数可。旧メッセージ（Message.attachmentUrl の1件）も同じ形で出す。
// 配信は非公開バケット → /api/attachments/[messageId] が参加者検証をしてから署名付きURLへ。
import { useState } from "react";
import { ScrollToLatest } from "./ScrollToLatest";

export type MessageForList = {
  id: string;
  senderMemberId: string;
  body: string;
  createdAt: Date;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentSize: number | null;
  attachments: { id: string; name: string; size: number }[];
};

/** 拡張子から画像かどうかを判定する（サムネイル表示の可否）。 */
function isImageName(name: string | null): boolean {
  if (!name) return false;
  return /\.(png|jpe?g|gif|webp|avif)$/i.test(name);
}

/** 3.50 KB のように読みやすく表示する。 */
function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(2)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function timeStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}/${m}/${day} ${hh}:${mm}`;
}

/**
 * 本文の表示。【〜】だけの行（条件の提示・同意、発送、帳票の発行などの見出し）を太字にする。
 * 本文はプレーンテキストで保存しているので、描画時に行単位で判定するだけにしている。
 */
function Body({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => {
        const isHeading = /^【.+】$/.test(line.trim());
        return (
          <span key={i}>
            {isHeading ? <b className="font-bold">{line}</b> : line}
            {i < text.split("\n").length - 1 ? "\n" : null}
          </span>
        );
      })}
    </>
  );
}

/** 1行に畳んだときの表示（アイコン・投稿者・冒頭・日時）。クリックで開く。 */
function SummaryRow({
  name,
  avatarUrl,
  body,
  createdAt,
  onOpen,
}: {
  name: string;
  avatarUrl: string | null;
  body: string;
  createdAt: Date;
  onOpen: () => void;
}) {
  const excerpt = body.replace(/\s+/g, " ").trim();
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-2 rounded-[10px] border border-[var(--line)] bg-white px-3 py-2 text-left transition hover:border-[var(--green)]"
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--line)] bg-white font-serif text-[12px] text-[var(--green-d)]">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          (name?.[0] ?? "?").toUpperCase()
        )}
      </span>
      <span className="shrink-0 text-[13px] font-bold text-[var(--green-d)]">{name}</span>
      <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--ink-2)]">{excerpt}</span>
      <span className="shrink-0 text-[11px] text-[var(--muted)]">{timeStr(createdAt)}</span>
    </button>
  );
}

/** 最初から開いておく最新メッセージの件数（これより古いものは畳む） */
const RECENT = 3;

export function MessageList({
  messages,
  meId,
  otherName,
  myName = "自分",
  myAvatarUrl = null,
  otherAvatarUrl = null,
  emptyText = "まだやり取りはありません。",
  variant = "bubble",
}: {
  messages: MessageForList[];
  meId: string;
  otherName: string;
  /** カード表示のときに自分の投稿へ出す名前 */
  myName?: string;
  /** カード表示の投稿者アイコン（ヘッダーと同じ丸アイコン。無ければ頭文字） */
  myAvatarUrl?: string | null;
  otherAvatarUrl?: string | null;
  emptyText?: string;
  /**
   * bubble＝従来のチャット（/messages）。
   * card＝投稿が全幅カードで時系列に並ぶ形（案件ごとのやり取り画面。クラウドワークスと同じ見せ方）。
   */
  variant?: "bubble" | "card";
}) {
  const lastMessageId = messages[messages.length - 1]?.id ?? "none";
  // やり取りが伸びると縦に長くなるため、古いものは既定で畳む（クリックで開閉できる）
  const [showAll, setShowAll] = useState(false);
  // 既定は開いた状態。ユーザーが畳んだものだけ記録する
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const foldedCount = Math.max(0, messages.length - RECENT);
  const folding = !showAll && foldedCount > 1;
  const shown = folding ? messages.slice(-RECENT) : messages;
  const isOpen = (id: string) => !collapsed[id];
  const toggle = (id: string) => setCollapsed((s) => ({ ...s, [id]: !s[id] }));

  return (
    <div className="flex-1 overflow-y-auto px-6 pb-6 pt-5">
      {messages.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-[var(--muted)]">{emptyText}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {folding ? (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="flex items-center gap-3 text-[12px] text-[var(--green-d)]"
            >
              <span className="h-px flex-1 border-t border-dashed border-[var(--line)]" />
              <span className="whitespace-nowrap font-bold">▼ 他の{foldedCount}件のメッセージを表示</span>
              <span className="h-px flex-1 border-t border-dashed border-[var(--line)]" />
            </button>
          ) : null}
          {shown.map((msg) => {
            const mine = msg.senderMemberId === meId;
            const files = [
              ...(msg.attachmentUrl
                ? [{ key: "legacy", query: "", name: msg.attachmentName, size: msg.attachmentSize }]
                : []),
              ...msg.attachments.map((a) => ({
                key: a.id,
                query: `?i=${a.id}`,
                name: a.name,
                size: a.size as number | null,
              })),
            ];
            const files_ = files;
            if (variant === "card") {
              if (!isOpen(msg.id)) {
                return (
                  <SummaryRow
                    key={msg.id}
                    name={mine ? myName : otherName}
                    avatarUrl={mine ? myAvatarUrl : otherAvatarUrl}
                    body={msg.body}
                    createdAt={msg.createdAt}
                    onOpen={() => toggle(msg.id)}
                  />
                );
              }
              return (
                <div
                  key={msg.id}
                  // 自分＝白地に緑枠／相手＝かなり薄い緑地。どちらの発言か一目で分かるようにする
                  className={`rounded-[10px] border p-4 ${
                    mine ? "border-[var(--green)] bg-white" : "border-[var(--line)] bg-[#F3F9F3]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(msg.id)}
                    aria-expanded
                    className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {/* ヘッダーと同じ丸アイコン（画像が無ければ頭文字） */}
                      <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--line)] bg-white font-serif text-[14px] text-[var(--green-d)]">
                        {(mine ? myAvatarUrl : otherAvatarUrl) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={(mine ? myAvatarUrl : otherAvatarUrl) as string}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          ((mine ? myName : otherName)?.[0] ?? "?").toUpperCase()
                        )}
                      </span>
                      <span className="truncate text-[14px] font-bold text-[var(--green-d)]">
                        {mine ? myName : otherName}
                      </span>
                    </div>
                    <span className="shrink-0 text-[11px] text-[var(--muted)]">
                      {timeStr(msg.createdAt)}
                      <span className="ml-2 text-[var(--green-d)]">閉じる</span>
                    </span>
                  </button>
                  <div className="mt-2 whitespace-pre-wrap text-[14px] leading-7 text-[var(--ink)]">
                    <Body text={msg.body} />
                  </div>
                  {files_.map((a) => (
                    <div key={a.key} className="mt-3 rounded-[10px] border border-[var(--line)] bg-white p-3">
                      {isImageName(a.name) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/attachments/${msg.id}${a.query}`}
                          alt={a.name ?? "添付画像"}
                          className="mb-2 max-h-[280px] w-auto rounded object-contain"
                        />
                      ) : (
                        <div className="mb-2 text-[28px] leading-none">📄</div>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-[12px]">
                        <span className="break-all text-[var(--ink)]">
                          {a.name ?? "添付ファイル"}
                          {a.size ? (
                            <span className="text-[var(--muted)]">（{formatBytes(a.size)}）</span>
                          ) : null}
                        </span>
                        <a
                          href={`/api/attachments/${msg.id}${a.query}`}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 rounded border border-[var(--line)] px-2.5 py-1 text-[var(--green-d)] hover:bg-[var(--canvas)]"
                        >
                          プレビュー
                        </a>
                        <a
                          href={`/api/attachments/${msg.id}${a.query ? `${a.query}&` : "?"}download=1`}
                          className="shrink-0 rounded border border-[var(--line)] px-2.5 py-1 text-[var(--green-d)] hover:bg-[var(--canvas)]"
                        >
                          ダウンロード
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              );
            }
            return (
              <div key={msg.id} className={mine ? "text-right" : "text-left"}>
                <div className="mb-1 text-[11px] text-[var(--muted)]">
                  {mine ? "自分" : otherName} ・ {timeStr(msg.createdAt)}
                </div>
                <div
                  className={`inline-block max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-left text-[14px] leading-7 ${
                    mine ? "bg-[var(--green)] text-white" : "bg-[var(--canvas)] text-[var(--ink)]"
                  }`}
                >
                  <Body text={msg.body} />
                  {files.map((a) => (
                    <div key={a.key} className="mt-2 rounded-[10px] border border-[var(--line)] bg-white p-3">
                      {isImageName(a.name) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/attachments/${msg.id}${a.query}`}
                          alt={a.name ?? "添付画像"}
                          className="mb-2 max-h-[220px] w-auto rounded object-contain"
                        />
                      ) : (
                        <div className="mb-2 text-[28px] leading-none">📄</div>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-[12px]">
                        <span className="break-all text-[var(--ink)]">
                          {a.name ?? "添付ファイル"}
                          {a.size ? (
                            <span className="text-[var(--muted)]">（{formatBytes(a.size)}）</span>
                          ) : null}
                        </span>
                        <a
                          href={`/api/attachments/${msg.id}${a.query}`}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 rounded border border-[var(--line)] px-2.5 py-1 text-[var(--green-d)] hover:bg-[var(--canvas)]"
                        >
                          プレビュー
                        </a>
                        <a
                          href={`/api/attachments/${msg.id}${a.query ? `${a.query}&` : "?"}download=1`}
                          className="shrink-0 rounded border border-[var(--line)] px-2.5 py-1 text-[var(--green-d)] hover:bg-[var(--canvas)]"
                        >
                          ダウンロード
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* 最新メッセージまで自動スクロールする目印 */}
      <ScrollToLatest latestId={lastMessageId} />
    </div>
  );
}
