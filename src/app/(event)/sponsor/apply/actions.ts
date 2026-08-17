"use server";

import { sendSponsorApplicationEmails } from "@/lib/email";
import {
  SPONSOR_INBOX, PLAN_CONSULT, findCourse, planLabel, plansFor, LOCAL_DISCOUNT_COURSE,
  CO_CREATION_THEMES, DESIRED_BENEFITS, LOGO_SUBMISSION, CONSENTS,
} from "@/lib/sponsor";

export type SponsorState = { ok?: boolean; refNo?: string; error?: string };

// ⚠️ このフォームはDBに保存しない（受付はメールのみ）。
//    そのため、事務局あてが1通も送れなかった場合は**成功にせず**、
//    申込者に直接メールしてもらう案内を出す（申込を黙って失う事故を防ぐ）。

const THEMES = new Set(CO_CREATION_THEMES);
const BENEFITS = new Set(DESIRED_BENEFITS);
const LOGOS = new Set(LOGO_SUBMISSION);

function makeRefNo(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const ymd = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const rand = Array.from(bytes, (b) => (b % 36).toString(36)).join("").toUpperCase();
  return `FJS-${ymd}-${rand}`;
}

export async function submitSponsorApplication(
  _prev: SponsorState,
  formData: FormData
): Promise<SponsorState> {
  const g = (k: string, max = 4000) => String(formData.get(k) ?? "").trim().slice(0, max);
  const many = (k: string, allowed: Set<string>, max = 20) =>
    formData.getAll(k).map((v) => String(v)).filter((v) => allowed.has(v)).slice(0, max);

  // honeypot（人には見えない欄。埋まっていたらボット扱いで、送信せず成功を装う）
  if (String(formData.get("nickname") ?? "").trim()) {
    return { ok: true, refNo: makeRefNo() };
  }

  const courseCode = g("course", 40);
  const plan = g("plan", 40);
  const isLocalCorp = formData.get("isLocalCorp") === "on";
  const annualMember = formData.get("annualMember") === "on";
  const boothOption = formData.get("boothOption") === "on";
  const company = g("company", 200);
  const companyKana = g("companyKana", 200);
  const name = g("name", 100);
  const department = g("department", 200);
  const email = g("email", 320);
  const phone = g("phone", 40);
  const address = g("address", 300);
  const website = g("website", 300);
  const purpose = g("purpose");
  const presentation = g("presentation");
  const invoiceName = g("invoiceName", 200);
  const invoiceNote = g("invoiceNote");
  const logoSubmission = g("logoSubmission", 100);
  const message = g("message");

  const course = findCourse(courseCode);
  if (!course) return { error: "協賛対象の開催を選択してください。" };

  // ⚠️ 特別割は宮崎開催に限り適用される。画面では宮崎に固定しているが、サーバーでも守る。
  if (isLocalCorp && course.code !== LOCAL_DISCOUNT_COURSE) {
    return { error: "宮崎県法人の特別割は、宮崎開催のみに適用されます。" };
  }

  // ⚠️ プランは**選んだ開催コース（＋特別割の有無）に存在するものだけ**を許可する
  //   （画面で切り替えているが、送信値の付け替えを防ぐためサーバーでも見る）。
  const planCodes = new Set([...plansFor(course, isLocalCorp).map((p) => p.code), PLAN_CONSULT]);
  if (!planCodes.has(plan)) return { error: "希望する協賛プランを選択してください。" };

  if (!company) return { error: "法人・団体名を入力してください。" };
  if (!companyKana) return { error: "法人・団体名（フリガナ）を入力してください。" };
  if (!name) return { error: "ご担当者名を入力してください。" };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "正しいメールアドレスを入力してください。" };
  if (!phone) return { error: "電話番号を入力してください。" };
  if (!address) return { error: "所在地を入力してください。" };
  if (!purpose) return { error: "協賛を通じて実現したいことを入力してください。" };
  if (!invoiceName) return { error: "請求書の宛名を入力してください。" };
  if (!LOGOS.has(logoSubmission)) return { error: "ロゴデータの提出方法を選択してください。" };

  // 同意事項（3つとも必須）
  if (formData.getAll("consent").length < CONSENTS.length) {
    return { error: "同意事項のすべてにチェックしてください。" };
  }

  const refNo = makeRefNo();
  const { adminDelivered } = await sendSponsorApplicationEmails(
    {
      refNo,
      isLocalCorp,
      entryType: isLocalCorp ? `${course.label}（宮崎県法人 特別割）` : course.label,
      plan: planLabel(course.code, plan, isLocalCorp),
      annualMember,
      boothOption,
      company, companyKana, name, department, email, phone, address, website,
      purpose,
      themes: many("themes", THEMES),
      benefits: many("benefits", BENEFITS),
      presentation, invoiceName, invoiceNote, logoSubmission, message,
    },
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
