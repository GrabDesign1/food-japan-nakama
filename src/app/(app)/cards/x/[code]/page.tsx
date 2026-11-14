// QRを読み取った人が最初に来る画面。
//
// ⚠️ **ここで交換を実行しない。** GETで書き込むと、リンクの先読み・クローラ・
//    チャットアプリのプレビュー取得で勝手に成立してしまう。
//    相手が誰かを見せたうえで、ボタン（サーバーアクション）で成立させる。
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { normalizeCardCode, orderPair } from "@/lib/cards";
import { defaultMetAt } from "@/lib/card-summit";
import { eyebrowCls, h1Cls, btn } from "@/lib/ui";
import { ExchangeForm } from "../../ExchangeForm";

export const metadata = { title: "カードを受け取る", robots: { index: false, follow: false } };

export default async function ExchangeByCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = normalizeCardCode(raw);

  const su = await getSessionUser();
  // 未ログインなら、戻り先を保ったままログインへ。登録後にそのまま交換まで進める
  if (!su) redirect(`/login?next=${encodeURIComponent(`/cards/x/${code}`)}`);
  const me = await getOrCreateMemberForUser(su);

  const card = await prisma.memberCard.findUnique({
    where: { code },
    select: { memberId: true, tenantId: true, isActive: true, jobTitle: true, headline: true },
  });

  const invalid =
    !card || !card.isActive || card.tenantId !== me.tenantId || card.memberId === me.id;

  if (invalid) {
    return (
      <div className="mx-auto max-w-[560px] px-4 py-12">
        <h1 className={h1Cls}>カードを受け取れませんでした</h1>
        <p className="mt-3 text-[13px] text-[var(--ink-2)]">
          {card?.memberId === me.id
            ? "ご自身のカードです。相手の方に読み取ってもらってください。"
            : "このコードのカードは見つからないか、いま交換を受け付けていません。"}
        </p>
        <Link href="/cards" className={`${btn("secondary")} mt-6 inline-flex`}>交換カードへ</Link>
      </div>
    );
  }

  const partner = await prisma.member.findUnique({
    where: { id: card.memberId },
    select: { id: true, name: true, contactName: true, categoryL1: true, prefecture: true },
  });
  if (!partner) redirect("/cards");

  const { memberAId, memberBId } = orderPair(me.id, card.memberId);
  const already = await prisma.cardExchange.findUnique({
    where: { memberAId_memberBId: { memberAId, memberBId } },
    select: { id: true },
  });

  return (
    <div className="mx-auto max-w-[560px] px-4 py-10">
      <div className={eyebrowCls}>CARD</div>
      <h1 className={`${h1Cls} mt-1`}>このカードを受け取りますか？</h1>

      <div className="mt-5 rounded-xl border border-[var(--line)] bg-white p-5">
        <div className="text-[16px] font-semibold text-[var(--ink)]">{partner.name}</div>
        {partner.contactName ? (
          <div className="text-[13px] text-[var(--ink-2)]">
            {partner.contactName}
            {card.jobTitle ? `（${card.jobTitle}）` : null}
          </div>
        ) : null}
        <div className="mt-1 text-[12px] text-[var(--muted)]">
          {[partner.categoryL1, partner.prefecture].filter(Boolean).join("・")}
        </div>
        {card.headline ? (
          <p className="mt-3 text-[13px] leading-relaxed text-[var(--ink-2)]">{card.headline}</p>
        ) : null}
      </div>

      {already ? (
        <>
          <p className="mt-5 text-[13px] text-[var(--green-d)]">すでに交換済みです。</p>
          <Link href="/cards" className={`${btn("secondary")} mt-4 inline-flex`}>交換したカードを見る</Link>
        </>
      ) : (
        <div className="mt-5">
          <p className="text-[12px] leading-relaxed text-[var(--muted)]">
            受け取ると、あなたのカードも相手に渡ります。交換は一度の操作で双方に成立します。
          </p>
          {/* コードは hidden で渡す。中身を見てから押してもらう */}
          <ExchangeForm defaultMetAt={defaultMetAt()} code={code} submitLabel="交換する" />
        </div>
      )}
    </div>
  );
}
