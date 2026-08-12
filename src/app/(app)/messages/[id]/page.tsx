import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { markThreadRead } from "../actions";
import { loadLockedLeadThreadIds } from "@/lib/lead-unlock";
import { ThreadList } from "../_components/ThreadList";
import { Composer } from "../_components/Composer";
import { MessageList } from "../_components/MessageList";
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

  // 未開封のリードはこの画面では読めない（本文を返さず、開封できる案件ごとの画面へ送る）。
  // ここを塞がないと、案件ごとの画面のゲートを迂回して全文が読めてしまう。
  const locked = await loadLockedLeadThreadIds(me.id, [thread]);
  if (locked.has(thread.id) && thread.offeringId) {
    redirect(`/ledger/${thread.offeringId}/proposals/${thread.id}`);
  }

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
      // 添付は複数可（旧メッセージは attachmentUrl の1件だけを持つ）
      include: { attachments: { orderBy: { sortOrder: "asc" } } },
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
              href={`/producers/${otherId}?from=${encodeURIComponent(`/messages/${id}`)}`}
              className="text-[17px] font-semibold text-[var(--ink)] hover:underline"
            >
              {other?.name || "（不明）"}
            </Link>
          </div>

          {/* 対象案件と進捗（案件ごとのやり取り） */}
          {/* 進捗の更新は案件ごとのやり取り画面で行う（ここでは出さない・2026-08-11 ユーザー指示） */}
          <ThreadHeader offering={offering} dealId={deal?.id ?? null} phase={deal?.phase ?? 0} showPhase={false} />

          {/* メッセージ（案件ごとの提案画面と共用） */}
          <MessageList
            messages={messages}
            meId={me.id}
            otherName={other?.name ?? "相手"}
            myName={me.name || "自分"}
            myAvatarUrl={me.avatarUrl || me.companyLogoUrl}
            otherAvatarUrl={other?.avatarUrl ?? null}
          />

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

