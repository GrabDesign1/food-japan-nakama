// やり取りの履歴表示（メッセージ画面と、案件ごとの提案画面で共用）。
// 添付は複数可。旧メッセージ（Message.attachmentUrl の1件）も同じ形で出す。
// 配信は非公開バケット → /api/attachments/[messageId] が参加者検証をしてから署名付きURLへ。
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

export function MessageList({
  messages,
  meId,
  otherName,
  myName = "自分",
  emptyText = "まだやり取りはありません。",
  variant = "bubble",
}: {
  messages: MessageForList[];
  meId: string;
  otherName: string;
  /** カード表示のときに自分の投稿へ出す名前 */
  myName?: string;
  emptyText?: string;
  /**
   * bubble＝従来のチャット（/messages）。
   * card＝投稿が全幅カードで時系列に並ぶ形（案件ごとのやり取り画面。クラウドワークスと同じ見せ方）。
   */
  variant?: "bubble" | "card";
}) {
  const lastMessageId = messages[messages.length - 1]?.id ?? "none";

  return (
    <div className="flex-1 overflow-y-auto px-6 pb-6 pt-5">
      {messages.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-[var(--muted)]">{emptyText}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {messages.map((msg) => {
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
              return (
                <div
                  key={msg.id}
                  className={`rounded-[10px] border bg-white p-4 ${
                    mine ? "border-[var(--green)] bg-[var(--green-soft)]" : "border-[var(--line)]"
                  }`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-[14px] font-bold text-[var(--green-d)]">
                      {mine ? myName : otherName}
                    </span>
                    <span className="text-[11px] text-[var(--muted)]">{timeStr(msg.createdAt)}</span>
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-[14px] leading-7 text-[var(--ink)]">
                    {msg.body}
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
                  {msg.body}
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
