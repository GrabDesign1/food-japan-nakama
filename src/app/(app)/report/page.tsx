// 違反報告（会員 → 事務局）。案件・やり取り・事業者のいずれかを対象に報告する。
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ReportForm } from "./ReportForm";
import { btn, eyebrowCls, h1Cls } from "@/lib/ui";

const TYPE_LABEL: Record<string, string> = {
  member: "事業者",
  offering: "案件",
  thread: "やり取り",
};

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ targetType?: string; targetId?: string }>;
}) {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const sp = await searchParams;
  const targetType = TYPE_LABEL[sp.targetType ?? ""] ? (sp.targetType as string) : "";
  const targetId = (sp.targetId ?? "").trim();

  // 対象の名前を出して、取り違えを防ぐ
  let targetName = "";
  if (targetType === "offering" && targetId) {
    const o = await prisma.offering.findUnique({ where: { id: targetId }, select: { title: true } });
    targetName = o?.title ?? "";
  } else if (targetType === "member" && targetId) {
    const m = await prisma.member.findUnique({ where: { id: targetId }, select: { name: true } });
    targetName = m?.name ?? "";
  }

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-5">
      <div>
        <p className={eyebrowCls}>REPORT</p>
        <h1 className={h1Cls}>違反報告をする</h1>
        <p className="mt-1 text-[13px] leading-7 text-[var(--ink-2)]">
          利用規約やガイドラインに反するおそれのある行為を見つけた場合は、こちらからお知らせください。
          報告があった場合、事務局が内容を確認し、必要に応じて対応します。
          なお、違反にあたるかどうかの判断や対応の結果について、<b>個別のご回答は行っておりません</b>。
        </p>
      </div>

      {targetType && targetId ? (
        <div className="rounded-[10px] border border-[var(--line)] bg-[var(--canvas)] px-4 py-3 text-[13px]">
          報告の対象：<b>{TYPE_LABEL[targetType]}</b>
          {targetName ? `「${targetName}」` : `（ID：${targetId}）`}
        </div>
      ) : (
        <div className="rounded-[10px] border border-[#E7C7BE] bg-[#FBF1EE] px-4 py-3 text-[13px] text-[var(--red)]">
          報告の対象が指定されていません。案件ページやメッセージ画面の「違反報告する」からお進みください。
        </div>
      )}

      {targetType && targetId ? <ReportForm targetType={targetType} targetId={targetId} /> : null}

      <p className="text-[12px] leading-6 text-[var(--muted)]">
        緊急を要する場合や、被害が生じている場合は
        <Link href="/consultation" className="mx-1 text-[var(--green-d)] underline">
          事務局への相談
        </Link>
        もご利用ください。規約の内容は
        <Link href="/terms" className="mx-1 text-[var(--green-d)] underline">
          利用規約
        </Link>
        をご確認ください。
      </p>

      <div>
        <Link href="/dashboard" className={btn("secondary", "sm")}>← マイページへ戻る</Link>
      </div>
    </div>
  );
}
