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
import type { ThreadReply } from "../_components/MessageExtras";
import { friendIds } from "@/lib/connections";
import { inviteToThreadForm } from "../actions";
import { btn } from "@/lib/ui";
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

  const thread = await prisma.thread.findUnique({
    where: { id },
    // ⚠️ グループ（2026-11-27）：最初の2人に加えて、承諾した参加者も読める
    include: { participants: { where: { memberId: me.id }, select: { status: true } } },
  });
  const myPart = thread?.participants[0];
  const isPair = thread ? thread.fromMemberId === me.id || thread.toMemberId === me.id : false;
  if (!thread || (!isPair && myPart?.status !== "JOINED")) {
    // ⚠️ 招待中（INVITED）の人は本文を読めない。承諾の画面は一覧側に出す
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
      // リアクションは件数と「自分が押したか」を出すため、全部引いて下でまとめる（1スレッド分なので軽い）
      include: {
        attachments: { orderBy: { sortOrder: "asc" } },
        reactions: { select: { emoji: true, memberId: true } },
      },
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
  // ── グループ：いまの参加者と、招ける相手（2026-11-27）──────────────────────
  // ⚠️⚠️ **招く＝相手の会社名と担当者名が他社に見える。** だから候補は「自分の仲間」だけに絞る。
  //    ⚠️ 会員全員から選ばせない（知らない人をいきなり商談に引き込めてしまう）。
  // ⚠️ 招待中（INVITED）の人は本文を読めない。一覧の「届いた招待」から承諾してもらう。
  const [participants, myFriendIds] = await Promise.all([
    prisma.threadParticipant.findMany({
      where: { threadId: thread.id, status: { in: ["INVITED", "JOINED"] } },
      select: { memberId: true, status: true, member: { select: { name: true, contactName: true } } },
    }),
    friendIds(me.id),
  ]);
  const inThread = new Set([
    thread.fromMemberId,
    thread.toMemberId,
    ...participants.map((p) => p.memberId),
  ]);
  const invitable = myFriendIds.filter((fid) => !inThread.has(fid));
  const invitableMembers = invitable.length
    ? await prisma.member.findMany({
        where: { id: { in: invitable.slice(0, 100) } },
        select: { id: true, name: true, contactName: true },
        orderBy: { name: "asc" },
      })
    : [];

  // ── スレッド返信とリアクションを、本文の発言にぶら下げる（2026-11-27）────────────
  // ⚠️⚠️ **本文に出すのは親（parentMessageId が null）だけ。**
  //    返信まで本文に流すと、商談の記録が枝葉で埋まる。
  // ⚠️ 返信は親ごとにまとめ、古い順のまま渡す。
  const myName_ = me.contactName || me.name || "自分";
  const otherName_ = other?.name ?? "相手";
  const repliesByParent = new Map<string, ThreadReply[]>();
  for (const m of messages) {
    if (!m.parentMessageId) continue;
    const list = repliesByParent.get(m.parentMessageId) ?? [];
    list.push({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt,
      mine: m.senderMemberId === me.id,
      name: m.senderMemberId === me.id ? myName_ : otherName_,
    });
    repliesByParent.set(m.parentMessageId, list);
  }
  const rootMessages = messages
    .filter((m) => !m.parentMessageId)
    .map((m) => {
      // 絵文字ごとに件数をまとめ、自分が押したかどうかを持たせる
      const byEmoji = new Map<string, { count: number; mine: boolean }>();
      for (const r of m.reactions) {
        const cur = byEmoji.get(r.emoji) ?? { count: 0, mine: false };
        cur.count += 1;
        if (r.memberId === me.id) cur.mine = true;
        byEmoji.set(r.emoji, cur);
      }
      return {
        ...m,
        reactions: [...byEmoji.entries()].map(([emoji, v]) => ({ emoji, ...v })),
        replies: repliesByParent.get(m.id) ?? [],
      };
    });

  const lastMessageId = rootMessages[rootMessages.length - 1]?.id ?? "none";

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

          {/* グループ：参加者と「人を招く」（2026-11-27） */}
          <div className="rounded-[12px] border border-[var(--line)] bg-white px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="text-[12px] leading-[17px] text-[var(--muted)]">
                {participants.length > 0 ? "この商談の参加者" : "1対1の商談です"}
              </span>
              <span className="flex flex-wrap items-center gap-1.5">
                {participants.map((p) => (
                  <span
                    key={p.memberId}
                    className={`rounded-full px-2.5 py-0.5 text-[12px] leading-[17px] ${
                      p.status === "JOINED"
                        ? "bg-[var(--line-soft)] text-[var(--ink)]"
                        : "border border-dashed border-[var(--line)] text-[var(--muted)]"
                    }`}
                  >
                    {p.member.contactName || p.member.name}
                    {p.status === "INVITED" ? "（招待中）" : ""}
                  </span>
                ))}
              </span>
              {invitableMembers.length > 0 ? (
                <details className="ml-auto">
                  <summary className="cursor-pointer list-none text-[14px] font-bold leading-[21px] text-[var(--green-d)]">
                    ＋ 人を招く
                  </summary>
                  {/*
                    ⚠️⚠️ **招くと、相手の会社名・担当者名が他社に見える。**
                       だから相手の承諾があるまで参加させない（招待中は本文を読めない）。
                    ⚠️ 候補は自分の仲間だけ。会員全員から選ばせない。
                  */}
                  <form
                    action={inviteToThreadForm.bind(null, thread.id)}
                    className="mt-2 flex flex-wrap items-center gap-2"
                  >
                    <label htmlFor="inviteeId" className="sr-only">
                      招く相手
                    </label>
                    <select
                      id="inviteeId"
                      name="inviteeId"
                      required
                      className="min-w-[200px] rounded-md border border-[var(--line)] bg-white px-3 py-2 text-[14px] text-[var(--ink)]"
                    >
                      <option value="">仲間から選ぶ…</option>
                      {invitableMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.contactName ? `${m.name}（${m.contactName}）` : m.name}
                        </option>
                      ))}
                    </select>
                    <button className={btn("secondary", "sm")}>招待を送る</button>
                    <span className="w-full text-[12px] leading-[17px] text-[var(--muted)]">
                      招くと3社以上のグループになります。相手が承諾するまで、ここの内容は読まれません。
                    </span>
                  </form>
                </details>
              ) : null}
            </div>
          </div>

          {/* 対象案件と進捗（案件ごとのやり取り） */}
          {/* 進捗の更新は案件ごとのやり取り画面で行う（ここでは出さない・2026-08-11 ユーザー指示） */}
          <ThreadHeader offering={offering} dealId={deal?.id ?? null} phase={deal?.phase ?? 0} showPhase={false} />

          {/* メッセージ（案件ごとの提案画面と共用） */}
          <MessageList
            messages={rootMessages}
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

