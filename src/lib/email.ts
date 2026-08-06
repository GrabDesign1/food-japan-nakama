// メール送信（Resend）。APIキー未設定でも落ちないようにする（開発中はログのみ）。
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM || "FOOD JAPAN NAKAMA <onboarding@resend.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const resend = apiKey ? new Resend(apiKey) : null;

type SendArgs = { to: string[]; subject: string; html: string };

async function send({ to, subject, html }: SendArgs): Promise<void> {
  if (!resend) {
    console.log(`[email] RESEND_API_KEY 未設定のため送信スキップ: ${subject} -> ${to.join(", ")}`);
    return;
  }
  // 宛先ごとに個別送信（1件が拒否されても他に届く。Resendのドメイン未認証制限対策）。
  for (const addr of to) {
    try {
      const { error } = await resend.emails.send({
        from: FROM,
        to: [addr],
        subject,
        html,
      });
      if (error) console.error(`[email] 送信失敗(${addr}):`, error);
    } catch (e) {
      console.error(`[email] 送信例外(${addr}):`, e);
    }
  }
}

// パスワード再設定メール（Supabaseテンプレに依存せず、アプリから日本語で送る）。
export async function sendPasswordResetEmail(
  to: string,
  confirmUrl: string
): Promise<void> {
  const html = `
  <div style="font-family:'Hiragino Sans',sans-serif;max-width:520px;margin:0 auto;color:#141414">
    <h2 style="font-size:18px;border-bottom:2px solid #0F7A3D;padding-bottom:8px">パスワードの再設定</h2>
    <p style="font-size:14px;color:#3C4A62">FOOD JAPAN NAKAMA のパスワード再設定のご依頼を受け付けました。<br>下のボタンから、新しいパスワードを設定してください。</p>
    <p style="margin:22px 0">
      <a href="${confirmUrl}" style="display:inline-block;background:#0F7A3D;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px">パスワードを再設定する</a>
    </p>
    <p style="font-size:12px;color:#7C8899">このメールにお心当たりがない場合は、破棄してください（パスワードは変更されません）。</p>
  </div>`;

  await send({
    to: [to],
    subject: "【FOOD JAPAN NAKAMA】パスワード再設定のご案内",
    html,
  });
}

// 会員が審査申請したとき、事務局へ通知。
export async function notifyAdminMemberRegistered(params: {
  adminEmails: string[];
  memberName: string;
  contactName: string;
  contactEmail: string;
  categoryL1: string;
  categoryL2: string | null;
  prefecture: string | null;
  city: string | null;
  description: string | null;
}): Promise<void> {
  const {
    adminEmails,
    memberName,
    contactName,
    contactEmail,
    categoryL1,
    categoryL2,
    prefecture,
    city,
    description,
  } = params;

  if (adminEmails.length === 0) return;

  const row = (label: string, value: string | null) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#7C8899;font-size:13px;white-space:nowrap">${label}</td><td style="padding:4px 0;color:#141414;font-size:13px">${value || "—"}</td></tr>`;

  const area = [prefecture, city].filter(Boolean).join(" ") || null;

  const html = `
  <div style="font-family:'Hiragino Sans',sans-serif;max-width:560px;margin:0 auto;color:#141414">
    <h2 style="font-size:18px;border-bottom:2px solid #0F7A3D;padding-bottom:8px">新しい会員の審査申請が届きました</h2>
    <p style="font-size:14px;color:#3C4A62">以下の内容で会員登録の申請がありました。事務局管理で審査してください。</p>
    <table style="border-collapse:collapse;margin:16px 0">
      ${row("事業者名", memberName)}
      ${row("担当者名", contactName)}
      ${row("担当者メール", contactEmail)}
      ${row("会員種別", `${categoryL1}${categoryL2 ? " / " + categoryL2 : ""}`)}
      ${row("所在地", area)}
      ${row("事業紹介", description)}
    </table>
    <a href="${APP_URL}/admin" style="display:inline-block;background:#0F7A3D;color:#fff;text-decoration:none;padding:10px 22px;border-radius:6px;font-size:14px">事務局管理で承認する</a>
  </div>`;

  await send({
    to: adminEmails,
    subject: `【FOOD JAPAN SUMMIT】新規会員の審査申請：${memberName}`,
    html,
  });
}
