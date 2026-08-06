import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { markThreadRead } from "../actions";
import { ThreadList } from "../_components/ThreadList";
import { Composer } from "../_components/Composer";

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
  await markThreadRead(thread.id, me.id);

  const otherId = thread.fromMemberId === me.id ? thread.toMemberId : thread.fromMemberId;
  const other = await prisma.member.findUnique({
    where: { id: otherId },
    select: { id: true, name: true, avatarUrl: true },
  });
  const messages = await prisma.message.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: "asc" },
  });
  const draft = await prisma.messageDraft.findUnique({
    where: { threadId_memberId: { threadId: thread.id, memberId: me.id } },
  });
  const templates = await prisma.messageTemplate.findMany({
    where: { memberId: me.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, body: true },
  });
  const lastMessageId = messages[messages.length - 1]?.id ?? "none";

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-[22px] text-[var(--ink)]">メッセージ一覧</h1>
      <div className="grid grid-cols-[300px_1fr] overflow-hidden rounded-[12px] border border-[var(--line)] bg-white">
        {/* 左：一覧 */}
        <div className="max-h-[74vh] overflow-y-auto border-r border-[var(--line)]">
          <ThreadList meId={me.id} activeId={thread.id} />
        </div>

        {/* 右：会話 */}
        <div className="flex max-h-[74vh] flex-col">
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
          <Composer
            key={lastMessageId}
            threadId={thread.id}
            otherName={other?.name ?? "相手"}
            initialDraft={draft?.body ?? ""}
            initialTemplates={templates}
            locked={me.paymentStatus !== "PAID"}
          />
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
