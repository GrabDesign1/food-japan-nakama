import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { ThreadList } from "./_components/ThreadList";
import { prisma } from "@/lib/db";
import { btn, h1Cls } from "@/lib/ui";
import { respondThreadInvite } from "./actions";

export default async function MessagesPage() {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);

  // 未読の合計（一覧を開いた時点で「新着があること」が分かるように見出しへ出す）
  const unreadTotal = await prisma.message.count({
    where: {
      readAt: null,
      senderMemberId: { not: me.id },
      thread: { OR: [{ fromMemberId: me.id }, { toMemberId: me.id }] },
    },
  });

  // ── 届いた招待（グループに呼ばれた）2026-11-27 ────────────────────────────
  // ⚠️⚠️ **承諾するまで本文は読めない。** ここに出るのは「誰が・どの商談に呼んだか」だけ。
  //    ⚠️ 中身を先に見せてしまうと、同意を取る意味がなくなる。
  // ⚠️ Thread は from/to を**IDだけ**で持っている（Member へのリレーションは張っていない）。
  //    名前は別引きする。
  const inviteRows = await prisma.threadParticipant.findMany({
    where: { memberId: me.id, status: "INVITED" },
    orderBy: { invitedAt: "desc" },
    select: {
      threadId: true,
      invitedBy: true,
      thread: { select: { fromMemberId: true, toMemberId: true, offeringId: true } },
    },
  });
  const inviteNameIds = Array.from(
    new Set(inviteRows.flatMap((r) => [r.invitedBy, r.thread.fromMemberId, r.thread.toMemberId])),
  );
  const inviteNames = inviteNameIds.length
    ? await prisma.member.findMany({
        where: { id: { in: inviteNameIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameById = new Map(inviteNames.map((m) => [m.id, m.name]));
  const invites = inviteRows.map((r) => ({
    threadId: r.threadId,
    invitedByName: nameById.get(r.invitedBy) ?? "（不明）",
    pair: [
      nameById.get(r.thread.fromMemberId) ?? "（不明）",
      nameById.get(r.thread.toMemberId) ?? "（不明）",
    ].join(" と "),
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className={h1Cls}>メッセージ一覧</h1>
        {unreadTotal > 0 ? (
          <span className="rounded-full bg-[var(--gold)] px-3 py-1 text-[12px] font-bold text-white">
            新着 {unreadTotal}件
          </span>
        ) : null}
      </div>

      {/*
        届いたグループへの招待（2026-11-27）。
        ⚠️⚠️ **承諾するまで本文は読めない。** ここに出すのは「誰が・どの商談に呼んだか」だけ。
           中身を先に見せたら、同意を取る意味がなくなる。
        ⚠️ 「今回は見送る」は記録を残さず消す（断ったことが相手に伝わらないように）。
      */}
      {invites.length > 0 ? (
        <div className="flex flex-col gap-2">
          {invites.map((v) => (
            <div
              key={v.threadId}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[16px] border border-[var(--gold)] bg-[var(--amber-bg)] px-5 py-4"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[16px] font-bold leading-[26px] text-[var(--ink)]">
                  {v.invitedByName}さんから、商談への招待が届いています
                </div>
                <div className="text-[12px] leading-[17px] text-[var(--muted)]">
                  {v.pair} のやり取りです。承諾すると3社以上のグループになり、
                  あなたの会社名と担当者名が参加者に見えるようになります。
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <form action={respondThreadInvite.bind(null, v.threadId, true)}>
                  <button className={btn("primary", "sm")}>参加する</button>
                </form>
                <form action={respondThreadInvite.bind(null, v.threadId, false)}>
                  <button className={btn("secondary", "sm")}>今回は見送る</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {unreadTotal > 0 ? (
        <p className="text-[12px] text-[var(--ink-2)]">
          {/* ⚠️ 2026-11-27：未読の印は tertiary（金）に変えた。文言もそれに合わせている */}
          左の一覧で<b className="text-[var(--gold-d)]">金色の帯が付いた行</b>が未読のやり取りです。
        </p>
      ) : null}
      <div className="grid grid-cols-1 overflow-hidden rounded-[12px] border border-[var(--line)] bg-white lg:grid-cols-[300px_1fr]">
        <div className="max-h-[70vh] overflow-y-auto border-[var(--line)] lg:border-r">
          <ThreadList meId={me.id} />
        </div>
        <div className="hidden min-h-[400px] place-items-center p-8 text-center text-[13px] text-[var(--muted)] lg:grid">
          左の一覧から相手を選ぶと、ここに会話が表示されます。
        </div>
      </div>
    </div>
  );
}
