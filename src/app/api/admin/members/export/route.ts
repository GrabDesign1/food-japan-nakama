// 会員一覧のCSV書き出し（2026-08-16）。事務局が選んだ会員だけを出す。
//
// **個人データの持ち出しにあたるため、上位管理者のみ・監査ログに必ず記録する。**
// Excelで文字化けしないよう BOM 付き UTF-8 で返す。
import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "未提出",
  PENDING: "審査中",
  APPROVED: "承認済み",
  AWAITING_PAYMENT: "お支払い待ち",
  REJECTED: "非承認",
  SUSPENDED: "停止中",
};
const PAYMENT_LABEL: Record<string, string> = {
  FREE: "無料",
  UNPAID: "未決済",
  PAID: "ビジネス会員",
};

/** CSVの1セル（カンマ・改行・引用符を含む値を安全に囲む） */
function cell(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const su = await requireSuperAdmin();
  const ids = (req.nextUrl.searchParams.get("ids") ?? "").split(",").filter(Boolean);

  const members = await prisma.member.findMany({
    where: {
      tenantId: su.app.tenantId,
      ...(ids.length > 0 ? { id: { in: ids } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      users: {
        select: { name: true, email: true, marketingOptInAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const header = [
    "会社名・団体名",
    "担当者名",
    "部署・役職",
    "電話",
    "メール",
    "案内メール同意",
    "登録日",
    "都道府県",
    "市区町村",
    "業種（大分類）",
    "業種（細分類）",
    "審査状態",
    "課金状態",
    "記入率",
    "タグ",
    "備考",
  ];

  const rows = members.map((m) => [
    m.name,
    m.contactName || m.users[0]?.name || "",
    m.crmDepartment ?? "",
    m.crmPhone ?? "",
    m.users.map((u) => u.email).join(" / "),
    m.users.some((u) => u.marketingOptInAt) ? "同意" : "未同意",
    m.createdAt.toLocaleDateString("ja-JP"),
    m.prefecture ?? "",
    m.city ?? "",
    m.categoryL1,
    m.categoryL2 ?? "",
    STATUS_LABEL[m.status] ?? m.status,
    PAYMENT_LABEL[m.paymentStatus] ?? m.paymentStatus,
    `${m.completionRate}%`,
    m.crmTags.join(" "),
    m.crmMemo ?? "",
  ]);

  const csv = [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");

  await writeAudit(su, "member.export_csv", {
    targetType: "member",
    detail: `${members.length}件を書き出し（指定${ids.length > 0 ? `${ids.length}件` : "全件"}）`,
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nakama-members-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
