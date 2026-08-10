import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { markThreadRead } from "../actions";
import { getInquiryGate } from "@/lib/inquiry-gate";
import { ThreadList } from "../_components/ThreadList";
import { Composer } from "../_components/Composer";
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
  // 「売りたい」への受信問い合わせは1通目のみ無料（2通目以降はPremium特典）
  const gate = await getInquiryGate({
    threadId: thread.id,
    threadFromMemberId: thread.fromMemberId,
    viewerMemberId: me.id,
    viewerIsPremium: me.paymentStatus === "PAID",
  });

  const otherId = thread.fromMemberId === me.id ? thread.toMemberId : thread.fromMemberId;
  // 既読化はサイドバーの未読バッジ表示と競合しないよう先に完了させる
  // （ゲート判定はcache()済みのため再計算されない）
  await markThreadRead(thread.id);
  // 取得系の独立クエリはまとめて並列実行（直列4往復→1往復）
  const [other, messages, draft, templates] = await Promise.all([
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
  ]);
  const lastMessageId = messages[messages.length - 1]?.id ?? "none";

  return (
    <div className="flex flex-col gap-4">
      <h1 className={h1Cls}>メッセージ一覧</h1>
      <div className="grid grid-cols-1 overflow-hidden rounded-[12px] border border-[var(--line)] bg-white lg:grid-cols-[300px_1fr]">
        {/* 左：一覧（スマホ・タブレットでは非表示） */}
        <div className="hidden max-h-[74vh] overflow-y-auto border-r border-[var(--line)] lg:block">
          <ThreadList meId={me.id} viewerIsPremium={me.paymentStatus === "PAID"} activeId={thread.id} />
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

          {/* メッセージ */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="flex flex-col gap-4">
              {messages.map((msg) => {
                const mine = msg.senderMemberId === me.id;
                // マスク対象：無料枠（相手からの1通目）より後に届いた受信メッセージ
                // （本文・添付はHTMLに出さない）
                const masked = gate.maskedMessageIds.has(msg.id);
                if (masked) {
                  return (
                    <div key={msg.id} className="text-left">
                      <div className="mb-1 text-[11px] text-[var(--muted)]">
                        {other?.name} ・ {timeStr(msg.createdAt)}
                      </div>
                      <div className="inline-block max-w-[80%] rounded-2xl border border-[#E8DCC0] bg-[#FDF9EF] px-4 py-3 text-left">
                        <div className="select-none text-[14px] leading-7 text-[var(--muted)] blur-[5px]" aria-hidden>
                          このメッセージはPremium会員限定です。このメッセージはPremium会員限定です。
                        </div>
                        <div className="mt-1 text-[11px] font-bold text-[#A87F2F]">
                          🔒 2往復目以降のメッセージの閲覧はNAKAMA Premium会員の特典です
                        </div>
                      </div>
                    </div>
                  );
                }
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
                        <a
                          href={msg.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={`mt-2 flex items-center gap-1 text-[12px] underline ${
                            mine ? "text-white/90" : "text-[var(--green-d)]"
                          }`}
                        >
                          📎 {msg.attachmentName ?? "添付ファイル"}
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 入力欄（下書き・テンプレート・面談日程・添付） */}
          {gate.limited && !gate.canReplyFree ? (
            <div className="border-t border-[var(--line)] p-4">
              <div className="rounded-[10px] border-2 border-[#C9A053] bg-[#FDF9EF] p-5">
                <div className="mb-1 flex items-center gap-2 text-[14px] font-bold text-[var(--ink)]">
                  <span>🔒</span>
                  お問い合わせへの応対はNAKAMA Premium会員の特典です
                </div>
                <p className="mb-3 text-[12px] leading-6 text-[var(--ink-2)]">
                  届いた問い合わせは、1往復（相手からの1通目の閲覧と、最初のご返信1通）まで無料です。
                  2往復目以降のやり取り（相手の2通目以降の閲覧・返信）は、NAKAMA Premium会員（月額22,000円・税込）でご利用いただけます。
                </p>
                <Link
                  href="/billing"
                  className="inline-block rounded-md bg-[#C9A053] px-5 py-2 text-[13px] font-bold text-white hover:bg-[#B58C3D]"
                >
                  Premium会員について見る →
                </Link>
              </div>
            </div>
          ) : (
            <>
              {gate.limited && gate.canReplyFree ? (
                <p className="border-t border-[var(--line)] bg-[#FDF9EF] px-6 py-2 text-[11px] text-[#A87F2F]">
                  最初のご返信1通は無料です（1往復まで無料）。2往復目以降のやり取りはNAKAMA Premium会員の特典です。
                </p>
              ) : null}
              <Composer
                key={lastMessageId}
                threadId={thread.id}
                otherName={other?.name ?? "相手"}
                initialDraft={draft?.body ?? ""}
                initialTemplates={templates}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function timeStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}/${m}/${day} ${hh}:${mm}`;
}
