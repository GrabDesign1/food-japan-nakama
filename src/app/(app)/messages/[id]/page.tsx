import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { markThreadRead } from "../actions";
import { ThreadList } from "../_components/ThreadList";
import { Composer } from "../_components/Composer";
import { ScrollToLatest } from "../_components/ScrollToLatest";
import { ThreadHeader } from "../_components/ThreadHeader";
import { h1Cls } from "@/lib/ui";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);

  const thread = await prisma.thread.findUnique({ where: { id } });
  if (!thread || (thread.fromMemberId !== me.id && thread.toMemberId !== me.id)) {
    notFound();
  }
  const otherId = thread.fromMemberId === me.id ? thread.toMemberId : thread.fromMemberId;
  // 既読化はサイドバーの未読バッジ表示と競合しないよう先に完了させる
  await markThreadRead(thread.id);
  // 取得系の独立クエリはまとめて並列実行（直列4往復→1往復）
  const [other, messages, draft, templates, offering, deal] = await Promise.all([
    prisma.member.findUnique({
      where: { id: otherId },
      select: { id: true, name: true, avatarUrl: true },
    }),
    prisma.message.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.messageDraft.findUnique({
      where: { threadId_memberId: { threadId: thread.id, memberId: me.id } },
    }),
    prisma.messageTemplate.findMany({
      where: { memberId: me.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, body: true },
    }),
    // 対象案件（このスレッドがどの案件のやり取りか）
    thread.offeringId
      ? prisma.offering.findUnique({
          where: { id: thread.offeringId },
          select: {
            id: true,
            direction: true,
            title: true,
            imageUrls: true,
            priceType: true,
            priceAmount: true,
            priceUnit: true,
            amountValue: true,
            amountUnit: true,
            amountPeriod: true,
            amountText: true,
            minOrderText: true,
            applicationDeadline: true,
          },
        })
      : Promise.resolve(null),
    // 進捗（商談）。スレッド単位＝案件単位
    prisma.deal.findFirst({ where: { threadId: thread.id }, select: { id: true, phase: true } }),
  ]);
  const lastMessageId = messages[messages.length - 1]?.id ?? "none";

  return (
    <div className="flex flex-col gap-4">
      <h1 className={h1Cls}>メッセージ一覧</h1>
      <div className="grid grid-cols-1 overflow-hidden rounded-[12px] border border-[var(--line)] bg-white lg:grid-cols-[300px_1fr]">
        {/* 左：一覧（スマホ・タブレットでは非表示） */}
        <div className="hidden max-h-[74vh] overflow-y-auto border-r border-[var(--line)] lg:block">
          <ThreadList meId={me.id} activeId={thread.id} />
        </div>

        {/* 右：会話 */}
        <div className="flex max-h-[74vh] flex-col">
          {/* スマホ・タブレット用：一覧へ戻る */}
          <Link
            href="/messages"
            className="border-b border-[var(--line)] px-5 py-2.5 text-[12px] text-[var(--green-d)] lg:hidden"
          >
            ← メッセージ一覧
          </Link>
          <div className="flex items-center gap-3 border-b border-[var(--line)] px-6 py-4">
            <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-white font-serif text-[16px] text-[var(--green-d)]">
              {other?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={other.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                (other?.name?.[0] ?? "?").toUpperCase()
              )}
            </div>
            <Link
              href={`/producers/${otherId}`}
              className="text-[17px] font-semibold text-[var(--ink)] hover:underline"
            >
              {other?.name || "（不明）"}
            </Link>
          </div>

          {/* 対象案件と進捗（案件ごとのやり取り） */}
          <ThreadHeader offering={offering} dealId={deal?.id ?? null} phase={deal?.phase ?? 0} />

          {/* メッセージ */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 pt-5">
            <div className="flex flex-col gap-4">
              {messages.map((msg) => {
                const mine = msg.senderMemberId === me.id;
                return (
                  <div key={msg.id} className={mine ? "text-right" : "text-left"}>
                    <div className="mb-1 text-[11px] text-[var(--muted)]">
                      {mine ? "自分" : other?.name} ・ {timeStr(msg.createdAt)}
                    </div>
                    <div
                      className={`inline-block max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-left text-[14px] leading-7 ${
                        mine
                          ? "bg-[var(--green)] text-white"
                          : "bg-[var(--canvas)] text-[var(--ink)]"
                      }`}
                    >
                      {msg.body}
                      {msg.attachmentUrl ? (
                        <div className="mt-2 rounded-[10px] border border-[var(--line)] bg-white p-3">
                          {isImageName(msg.attachmentName) ? (
                            // 非公開バケットのため、配信口（参加者のみ）を経由して表示する
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`/api/attachments/${msg.id}`}
                              alt={msg.attachmentName ?? "添付画像"}
                              className="mb-2 max-h-[220px] w-auto rounded object-contain"
                            />
                          ) : (
                            <div className="mb-2 text-[28px] leading-none">📄</div>
                          )}
                          <div className="flex flex-wrap items-center gap-2 text-[12px]">
                            <span className="break-all text-[var(--ink)]">
                              {msg.attachmentName ?? "添付ファイル"}
                              {msg.attachmentSize ? (
                                <span className="text-[var(--muted)]">（{formatBytes(msg.attachmentSize)}）</span>
                              ) : null}
                            </span>
                            <a
                              href={`/api/attachments/${msg.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="shrink-0 rounded border border-[var(--line)] px-2.5 py-1 text-[var(--green-d)] hover:bg-[var(--canvas)]"
                            >
                              プレビュー
                            </a>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* 最新メッセージまで自動スクロールする目印 */}
            <ScrollToLatest latestId={lastMessageId} />
          </div>

          {/* 入力欄（下書き・テンプレート・面談日程・添付） */}
          <Composer
            key={lastMessageId}
            threadId={thread.id}
            otherName={other?.name ?? "相手"}
            initialDraft={draft?.body ?? ""}
            initialTemplates={templates}
            myCompanyName={me.name}
            myPersonName={me.contactName || su.app.name}
          />
        </div>
      </div>
    </div>
  );
}

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
