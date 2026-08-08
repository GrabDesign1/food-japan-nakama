"use server";

import { prisma } from "@/lib/db";
import { getPublicTenantId } from "@/lib/public-content";
import { sendConsultationEmails } from "@/lib/email";

export type ConsultationState = { ok?: boolean; refNo?: string; error?: string };

const SERVICE_TYPES = new Set(["produce", "crowdfunding", "unsure"]);

function makeRefNo(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const ymd = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `NK-${ymd}-${rand}`;
}

export async function submitConsultation(
  _prev: ConsultationState,
  formData: FormData
): Promise<ConsultationState> {
  const g = (k: string) => String(formData.get(k) ?? "").trim();

  const serviceType = g("serviceType");
  const company = g("company");
  const name = g("name");
  const email = g("email");
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
    phone: g("phone") || null,
    area: g("area") || null,
    industry: g("industry") || null,
    productSummary,
    challenge,
    desiredOutcome: g("desiredOutcome") || null,
    desiredTiming: g("desiredTiming") || null,
    budget: g("budget") || null,
  };

  await prisma.consultation.create({ data });
  // メール送信は失敗しても受付自体は成立させる
  await sendConsultationEmails(data).catch((e) => console.error("[consultation] mail error", e));

  return { ok: true, refNo };
}
