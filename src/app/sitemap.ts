import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { getPublicTenantId } from "@/lib/public-content";
import { CASES_SORTED } from "@/lib/cases";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://nakama.food-japan-summit.jp";

// 新しく公開された案件を反映するため、1時間ごとに再生成する
export const revalidate = 3600;

/**
 * 公開ページの本文を最後に更新した日。
 * lastmod が無いと検索エンジンが再クロールの判断材料を持てず、古い内容が
 * 検索結果に残り続ける（2026-08-11に実際に発生）。
 * 料金・サービス説明を変更したら必ずこの日付を更新すること。
 */
const CONTENT_UPDATED_AT = new Date("2026-08-19T12:00:00+09:00");

// 公開静的ページ（middleware の PUBLIC_PATHS と対応）
const STATIC_PAGES: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }[] = [
  { path: "/", priority: 1.0, changeFrequency: "daily" },
  { path: "/about", priority: 0.9, changeFrequency: "weekly" },
  { path: "/pricing", priority: 0.9, changeFrequency: "weekly" },
  { path: "/hanro", priority: 0.9, changeFrequency: "weekly" },
  { path: "/produce", priority: 0.9, changeFrequency: "weekly" },
  { path: "/crowdfunding", priority: 0.9, changeFrequency: "weekly" },
  { path: "/food-loss", priority: 0.9, changeFrequency: "weekly" },
  { path: "/cases", priority: 0.9, changeFrequency: "weekly" },
  // Food Japan Summit の協賛募集（2026-08-19 に検索対象へ。ユーザー指示「/sponsor のみ単独の SEO と AIO」）。
  // ⚠️ 申込・相談フォーム（/sponsor/apply・/sponsor/contact）は noindex のままなので**ここに足さない**。
  { path: "/sponsor", priority: 0.9, changeFrequency: "weekly" },
  { path: "/learn", priority: 0.8, changeFrequency: "weekly" },
  { path: "/flow", priority: 0.7, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.7, changeFrequency: "monthly" },
  { path: "/consultation", priority: 0.8, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.5, changeFrequency: "monthly" },
  { path: "/company", priority: 0.5, changeFrequency: "monthly" },
  { path: "/terms", priority: 0.3, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "monthly" },
  { path: "/tokushoho", priority: 0.3, changeFrequency: "monthly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_PAGES.map((p) => ({
    url: `${APP_URL}${p.path}`,
    lastModified: CONTENT_UPDATED_AT,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  // 実績の詳細（静的定義。CASES に足せば自動で増える。非公開のものは出さない）
  for (const c of CASES_SORTED) {
    entries.push({
      url: `${APP_URL}/cases/${c.slug}`,
      lastModified: CONTENT_UPDATED_AT,
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }

  // 公開中の案件プレビュー（概要は未ログインでも閲覧可）
  try {
    const tenantId = await getPublicTenantId();
    if (tenantId) {
      const [projects, offerings] = await Promise.all([
        prisma.project.findMany({
          where: { tenantId, status: "published" },
          select: { id: true, updatedAt: true },
          take: 1000,
        }),
        prisma.offering.findMany({
          where: { member: { tenantId }, isPublic: true, visibility: "public", title: { not: "" } },
          select: { id: true, updatedAt: true },
          take: 1000,
        }),
      ]);
      for (const p of projects) {
        entries.push({ url: `${APP_URL}/preview/projects/${p.id}`, lastModified: p.updatedAt, changeFrequency: "weekly", priority: 0.6 });
      }
      for (const o of offerings) {
        entries.push({ url: `${APP_URL}/preview/offerings/${o.id}`, lastModified: o.updatedAt, changeFrequency: "weekly", priority: 0.6 });
      }
    }
  } catch {
    // DB不通時も静的ページ分は返す
  }

  return entries;
}
