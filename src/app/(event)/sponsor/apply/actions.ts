"use server";

import { sendSponsorApplicationEmails } from "@/lib/email";
import {
  SPONSOR_INBOX, PLAN_CONSULT, findCourse, planLabel, plansFor, LOCAL_DISCOUNT_COURSE, isCourseOpen,
  CO_CREATION_THEMES, DESIRED_BENEFITS, LOGO_SUBMISSION, CONSENTS,
} from "@/lib/sponsor";

/**
 * fields＝項目ごとのエラー（キーは input の name）。
 * ⚠️ 画面側はこのキーで「どのステップに戻すか」を決めるので、キー名は input の name と必ず一致させる。
 *    送信する側（name / value / payload）は一切変えていない＝**戻り値の形だけを増やしている**。
 */
export type SponsorState = {
  ok?: boolean;
  refNo?: string;
  error?: string;
  fields?: Record<string, string>;
};

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
  if (!course) {
    return {
      error: "協賛対象の開催を選択してください。",
      fields: { course: "協賛対象の開催を選択してください。" },
    };
  }

  // ⚠️ **締め切りの本当の関所はここ**。画面は静的生成＋ブラウザの時計で出し分けているだけなので、
  //    古いタブを開きっぱなしにされたり時計を戻されたりすると素通りする。サーバーで必ず弾く。
  if (!isCourseOpen(course.code)) {
    const msg = `${course.label}の受付は終了しました。他の開催をお選びいただくか、事務局へご相談ください。`;
    return { error: msg, fields: { course: msg } };
  }

  // ⚠️ 特別割は宮崎開催に限り適用される（名古屋のみ・両開催には適用しない。
  //    両開催向けの宮崎県法人特別価格は定義していない）。
  //    画面では宮崎開催を選んだときだけチェックを出しているが、送信値の付け替えを防ぐため
  //    サーバーでも必ず弾く。
  if (isLocalCorp && course.code !== LOCAL_DISCOUNT_COURSE) {
    return {
      error: "宮崎県法人の特別割は、宮崎開催のみに適用されます。",
      fields: { isLocalCorp: "宮崎県法人の特別割は、宮崎開催のみに適用されます。" },
    };
  }

  // ⚠️ プランは**選んだ開催コース（＋特別割の有無）に存在するものだけ**を許可する
  //   （画面で切り替えているが、送信値の付け替えを防ぐためサーバーでも見る）。
  const planCodes = new Set([...plansFor(course, isLocalCorp).map((p) => p.code), PLAN_CONSULT]);

  // ⚠️ 項目別のエラーをまとめて返す（1件ずつ返すと、直して送るたびに次のエラーが出る）。
  //    キーの順序は画面の並び順＝ステップ順にしておくと、戻す先を先頭から探せる。
  const fields: Record<string, string> = {};
  if (!planCodes.has(plan)) fields.plan = "希望する協賛プランを選択してください。";
  if (!company) fields.company = "法人・団体名を入力してください。";
  if (!companyKana) fields.companyKana = "法人・団体名（フリガナ）を入力してください。";
  if (!name) fields.name = "ご担当者名を入力してください。";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fields.email = "正しいメールアドレスを入力してください。";
  if (!phone) fields.phone = "電話番号を入力してください。";
  if (!address) fields.address = "所在地を入力してください。";
  if (!purpose) fields.purpose = "協賛を通じて実現したいことを入力してください。";
  if (!invoiceName) fields.invoiceName = "請求書の宛名を入力してください。";
  if (!LOGOS.has(logoSubmission)) fields.logoSubmission = "ロゴデータの提出方法を選択してください。";
  // 同意事項（3つとも必須）
  if (formData.getAll("consent").length < CONSENTS.length) {
    fields.consent = "同意事項のすべてにチェックしてください。";
  }

  if (Object.keys(fields).length > 0) {
    return { error: "入力内容をご確認ください。", fields };
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
