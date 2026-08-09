"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { getPublicTenantId } from "@/lib/public-content";
import { sendConsultationEmails } from "@/lib/email";

export type ConsultationState = { ok?: boolean; refNo?: string; error?: string };

const SERVICE_TYPES = new Set(["produce", "crowdfunding", "food-loss", "unsure"]);

// 濫用対策（公開・未認証フォームのため）：同一IP 1時間5件・全体 1時間30件まで
const LIMIT_PER_IP_HOUR = 5;
const LIMIT_TOTAL_HOUR = 30;

function makeRefNo(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const ymd = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
  // 衝突しにくい乱数（4桁数値は再送などで衝突→@uniqueで500になるため廃止）
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const rand = Array.from(bytes, (b) => (b % 36).toString(36)).join("").toUpperCase();
  return `NK-${ymd}-${rand}`;
}

export async function submitConsultation(
  _prev: ConsultationState,
  formData: FormData
): Promise<ConsultationState> {
  const g = (k: string, max = 4000) => String(formData.get(k) ?? "").trim().slice(0, max);

  // honeypot（人間には見えない入力欄。埋まっていたらボット）
  if (String(formData.get("website") ?? "").trim()) {
    return { ok: true, refNo: makeRefNo() }; // 保存も送信もせず成功を装う
  }

  const serviceType = g("serviceType", 40);
  const company = g("company", 200);
  const name = g("name", 100);
  const email = g("email", 320);
  const productSummary = g("productSummary");
  const challenge = g("challenge");
  const consent = formData.get("consent");

  if (!SERVICE_TYPES.has(serviceType)) return { error: "相談種別を選択してください。" };
  if (!company) return { error: "会社・団体名を入力してください。" };
  if (!name) return { error: "お名前を入力してください。" };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "正しいメールアドレスを入力してください。" };
  if (!productSummary) return { error: "商品・地域資源・技術の概要を入力してください。" };
  if (!challenge) return { error: "解決したい課題を入力してください。" };
  if (!consent) return { error: "個人情報の取扱いにご同意ください。" };

  // レート制限（DBベース。任意アドレスへの自動返信を踏み台にされないように）
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [ipCount, totalCount] = await Promise.all([
    ip
      ? prisma.consultation.count({ where: { ip, createdAt: { gte: oneHourAgo } } })
      : Promise.resolve(0),
    prisma.consultation.count({ where: { createdAt: { gte: oneHourAgo } } }),
  ]);
  if (ipCount >= LIMIT_PER_IP_HOUR || totalCount >= LIMIT_TOTAL_HOUR) {
    return { error: "送信が混み合っています。しばらく時間をおいて再度お試しください。" };
  }

  // フードロス相談の詳細（任意項目）を概要に整形して追記
  let productSummaryFull = productSummary;
  if (serviceType === "food-loss") {
    const flParts: [string, string][] = [
      ["原料・食品の状態", g("flState")],
      ["成分・原材料", g("flIngredients")],
      ["発生量の目安", g("flVolume")],
      ["発生する地域・場所", g("flArea")],
      ["現在の処分方法と費用", g("flCost")],
      ["安全性で気になる点", g("flSafety")],
      ["過去の対策・検討", g("flPast")],
      ["法規制の確認状況", g("flLegal")],
    ].filter(([, v]) => v) as [string, string][];
    if (flParts.length) {
      productSummaryFull +=
        "\n\n【フードロス相談の詳細】\n" + flParts.map(([k, v]) => `・${k}：${v}`).join("\n");
    }
  }

  const tenantId = await getPublicTenantId();
  if (!tenantId) return { error: "受付できませんでした。時間をおいて再度お試しください。" };

  const refNo = makeRefNo();
  const data = {
    tenantId,
    refNo,
    serviceType,
    company,
    name,
    email,
    phone: g("phone", 50) || null,
    area: g("area", 200) || null,
    industry: g("industry", 200) || null,
    productSummary: productSummaryFull,
    challenge,
    desiredOutcome: g("desiredOutcome") || null,
    desiredTiming: g("desiredTiming", 100) || null,
    budget: g("budget", 100) || null,
  };

  await prisma.consultation.create({ data: { ...data, ip } });
  // メール送信は失敗しても受付自体は成立させる
  await sendConsultationEmails(data).catch((e) => console.error("[consultation] mail error", e));

  return { ok: true, refNo };
}
