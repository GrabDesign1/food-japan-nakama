"use server";

import { sendSponsorInquiryEmails } from "@/lib/email";
import { SPONSOR_INBOX } from "@/lib/sponsor";

export type InquiryState = { ok?: boolean; refNo?: string; error?: string };

// プラン未定の段階の相談を受ける。必須は組織名・担当者名・電話番号・メールアドレスの4つだけ。
// ⚠️ DBに保存しない（メールのみ）。事務局あてが1通も送れなかったら成功にしない。

function makeRefNo(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const ymd = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const rand = Array.from(bytes, (b) => (b % 36).toString(36)).join("").toUpperCase();
  return `FJS-Q-${ymd}-${rand}`;
}

export async function submitSponsorInquiry(
  _prev: InquiryState,
  formData: FormData
): Promise<InquiryState> {
  const g = (k: string, max = 2000) => String(formData.get(k) ?? "").trim().slice(0, max);

  // honeypot（人には見えない欄）
  if (String(formData.get("nickname") ?? "").trim()) {
    return { ok: true, refNo: makeRefNo() };
  }

  const company = g("company", 200);
  const name = g("name", 100);
  const phone = g("phone", 40);
  const email = g("email", 320);
  const facebook = g("facebook", 300);
  const message = g("message");

  if (!company) return { error: "組織名・企業名を入力してください。" };
  if (!name) return { error: "ご担当者名を入力してください。" };
  if (!phone) return { error: "電話番号を入力してください。" };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "正しいメールアドレスを入力してください。" };

  const refNo = makeRefNo();
  const { adminDelivered } = await sendSponsorInquiryEmails(
    { refNo, company, name, phone, email, facebook, message },
    SPONSOR_INBOX
  );

  if (!adminDelivered) {
    return {
      error:
        "送信処理でエラーが発生しました。お手数ですが、info@grab-design.com まで直接メールでご連絡ください（内容はこの画面に残っています）。",
    };
  }
  return { ok: true, refNo };
}
