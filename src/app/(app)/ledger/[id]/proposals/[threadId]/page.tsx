// 案件ごとのやり取り画面（クラウドワークス型・2026-08-11 ユーザー指示）。
// 「案件 → 届いた提案 → 相手を選ぶ → その場でやり取り」を1本の線でつなぐ。
// これまでは提案するとメッセージ画面へ飛ばされ、案件とやり取りが分断されていた。
// 既存の /messages/[threadId] はそのまま残す（案件に紐づかない直接連絡があるため）。
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { markThreadRead } from "../../../../messages/actions";
import { Composer } from "../../../../messages/_components/Composer";
import { MessageList } from "../../../../messages/_components/MessageList";
import { ThreadHeader } from "../../../../messages/_components/ThreadHeader";
import { DIRECTION_SHORT } from "@/lib/offering-taxonomy";
import { btn, eyebrowCls, h1Cls } from "@/lib/ui";

export default async function OfferingThreadPage({
  params,
}: {
  params: Promise<{ id: string; threadId: string }>;
}) {
  const { id, threadId } = await params;
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);

  // このスレッドが「この案件のもの」で、かつ自分が当事者であることを確かめる
  const thread = await prisma.thread.findUnique({ where: { id: threadId } });
  if (!thread || thread.offeringId !== id) notFound();
  if (thread.fromMemberId !== me.id && thread.toMemberId !== me.id) notFound();

  const otherId = thread.fromMemberId === me.id ? thread.toMemberId : thread.fromMemberId;
  // 既読化はサイドバーの未読バッジと競合しないよう先に完了させる
  await markThreadRead(thread.id);

  const [other, messages, draft, templates, offering, deal] = await Promise.all([
    prisma.member.findUnique({
      where: { id: otherId },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        companyLogoUrl: true,
        prefecture: true,
        city: true,
        categoryL1: true,
        categoryL2: true,
      },
    }),
    prisma.message.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: "asc" },
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
    prisma.offering.findUnique({
      where: { id },
      select: {
        id: true,
        memberId: true,
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
    }),
    prisma.deal.findFirst({ where: { threadId: thread.id }, select: { id: true, phase: true } }),
  ]);
  if (!offering) notFound();

  const isOwner = offering.memberId === me.id;
  const lastMessageId = messages[messages.length - 1]?.id ?? "none";
  const otherPlace = [other?.prefecture, other?.city].filter(Boolean).join(" ");
  const otherIndustry = [other?.categoryL1, other?.categoryL2].filter(Boolean).join(" / ");

  return (
    <div className="mx-auto flex max-w-[900px] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={isOwner ? `/ledger/${offering.id}/proposals` : `/ledger/${offering.id}`}
          className={btn("secondary", "sm")}
        >
          {isOwner
            ? `← ${offering.direction === "GIVE" ? "届いた問い合わせ" : "届いた提案"}一覧`
            : "← 案件ページ"}
        </Link>
        <Link href={`/messages/${thread.id}`} className="text-[12px] text-[var(--muted)] underline">
          メッセージ画面で開く
        </Link>
      </div>

      <div>
        <p className={eyebrowCls}>
          {DIRECTION_SHORT[offering.direction] ?? "案件"} ・ {isOwner ? "届いたやり取り" : "自分の提案"}
        </p>
        <h1 className={h1Cls}>{offering.title}</h1>
      </div>

      <div className="flex flex-col overflow-hidden rounded-[12px] border border-[var(--line)] bg-white">
        {/* 相手の事業者 */}
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] px-6 py-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--canvas)] font-serif text-[16px] text-[var(--green-d)]">
            {other?.companyLogoUrl || other?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={other.companyLogoUrl || other.avatarUrl || ""}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              (other?.name?.[0] ?? "?").toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <Link
              href={`/producers/${otherId}`}
              className="text-[16px] font-semibold text-[var(--ink)] hover:underline"
            >
              {other?.name || "（名称未設定）"}
            </Link>
            <div className="text-[12px] text-[var(--muted)]">
              {[otherPlace, otherIndustry].filter(Boolean).join("　/　") || "事業者情報は未登録です"}
            </div>
          </div>
        </div>

        {/* 対象案件の要点と進捗（メッセージ画面と同じ表示） */}
        <ThreadHeader offering={offering} dealId={deal?.id ?? null} phase={deal?.phase ?? 0} />

        {/* やり取り */}
        <div className="flex max-h-[62vh] flex-col">
          <MessageList
            messages={messages}
            meId={me.id}
            otherName={other?.name ?? "相手"}
            emptyText="まだやり取りはありません。下の入力欄から送れます。"
          />
        </div>

        {/* 返信（下書き・テンプレート・面談日程・添付。メッセージ画面と同じ） */}
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
  );
}
