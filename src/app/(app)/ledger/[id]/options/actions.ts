"use server";

// 掲載オプションの購入（自分の案件のみ・価格はサーバー側で確定）。
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { createOneTimeCheckout } from "@/lib/billing";

export type OptionState = { error?: string };

export async function buyListingOption(
  offeringId: string,
  productCode: string,
  _prev: OptionState,
  _formData: FormData
): Promise<OptionState> {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su!);

  // 自分の案件か（IDOR対策）
  const offering = await prisma.offering.findFirst({
    where: { id: offeringId, memberId: me.id },
    select: { id: true, direction: true, isPublic: true },
  });
  if (!offering) return { error: "対象の案件が見つかりません。" };

  // 下書き（非公開）のまま買えてしまうと、効果が出ないのに料金だけ発生する。
  // 画面のボタンも無効化しているが、サーバー側でも止める（2026-08-11）。
  if (!offering.isPublic) {
    return { error: "この案件はまだ公開されていません。先に無料で公開してから、オプションをご購入ください。" };
  }

  // 案件の向きに合う商品か（sell=GIVE / seek=WANT / both）
  const product = await prisma.billingProduct.findUnique({ where: { code: productCode } });
  if (!product || !product.active || product.billingType !== "one_time") {
    return { error: "この商品は現在購入できません。" };
  }
  const audience = offering.direction === "GIVE" ? "sell" : "seek";
  if (product.audience !== "both" && product.audience !== audience) {
    return { error: "この案件では選択できない商品です。" };
  }

  const result = await createOneTimeCheckout({
    tenantId: su!.app.tenantId,
    memberId: me.id,
    isMember: me.paymentStatus === "PAID",
    email: su!.app.email,
    productCode,
    offeringId,
    returnPath: `/ledger/${offeringId}/options`,
  });
  if (result.error) return { error: result.error };
  redirect(result.url!);
}
