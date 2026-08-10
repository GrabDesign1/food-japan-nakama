import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { ThreadList } from "./_components/ThreadList";
import { prisma } from "@/lib/db";
import { h1Cls } from "@/lib/ui";

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className={h1Cls}>メッセージ一覧</h1>
        {unreadTotal > 0 ? (
          <span className="rounded-full bg-[var(--red)] px-3 py-1 text-[12px] font-bold text-white">
            新着 {unreadTotal}件
          </span>
        ) : null}
      </div>
      {unreadTotal > 0 ? (
        <p className="text-[12px] text-[var(--ink-2)]">
          左の一覧で<b className="text-[var(--red)]">オレンジ色の行</b>が未読のやり取りです。
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
