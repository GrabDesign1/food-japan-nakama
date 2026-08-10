// メール送信（Resend）。APIキー未設定でも落ちないようにする（開発中はログのみ）。
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM || "FOOD JAPAN NAKAMA <onboarding@resend.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const resend = apiKey ? new Resend(apiKey) : null;

type SendArgs = { to: string[]; subject: string; html: string };

// ユーザー入力をメールHTMLへ埋め込む前に必ずエスケープする（偽装リンク等の差し込み防止）
function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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
    `<tr><td style="padding:4px 12px 4px 0;color:#7C8899;font-size:13px;white-space:nowrap">${label}</td><td style="padding:4px 0;color:#141414;font-size:13px">${value ? esc(value) : "—"}</td></tr>`;

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

// 会員向け：新着メッセージ通知（相手が既読済みの状態で新しく届いたときのみ呼ぶ）。
// listingTitle があれば「案件への問い合わせ」として件名・本文に案件名を入れる。
export async function notifyNewMessage(params: {
  to: string[];
  fromMemberName: string;
  preview: string;
  threadId: string;
  listingTitle?: string | null;
}): Promise<void> {
  const { to, fromMemberName, preview, threadId, listingTitle } = params;
  if (to.length === 0) return;
  const short = preview.length > 80 ? `${preview.slice(0, 80)}…` : preview;
  const heading = listingTitle ? "お問い合わせがありました" : "新しいメッセージが届きました";
  const lead = listingTitle
    ? `あなたの案件「<b>${esc(listingTitle)}</b>」に、<b>${esc(fromMemberName)}</b> さんから問い合わせが届きました。`
    : `<b>${esc(fromMemberName)}</b> さんからメッセージが届いています。`;
  const html = `
  <div style="font-family:'Hiragino Sans',sans-serif;max-width:520px;margin:0 auto;color:#141414">
    <h2 style="font-size:18px;border-bottom:2px solid #0F7A3D;padding-bottom:8px">${heading}</h2>
    <p style="font-size:14px;color:#3C4A62">${lead}</p>
    <p style="font-size:13px;color:#3C4A62;background:#f2f5f0;border-radius:6px;padding:12px;white-space:pre-wrap">${esc(short)}</p>
    <p style="margin:22px 0">
      <a href="${APP_URL}/messages/${threadId}" style="display:inline-block;background:#0F7A3D;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px">メッセージを確認する</a>
    </p>
    <p style="font-size:12px;color:#7C8899">このメールはFOOD JAPAN NAKAMAから自動送信されています。</p>
  </div>`;
  await send({
    to,
    subject: listingTitle
      ? `【FOOD JAPAN NAKAMA】「${listingTitle}」にお問い合わせがありました`
      : `【FOOD JAPAN NAKAMA】${fromMemberName}さんからメッセージが届きました`,
    html,
  });
}

// 会員向け：共創プロジェクトへの応募通知（掲載者へ）。
export async function notifyProjectApplication(params: {
  to: string[];
  projectTitle: string;
  applicantName: string;
  projectId: string;
}): Promise<void> {
  const { to, projectTitle, applicantName, projectId } = params;
  if (to.length === 0) return;
  const html = `
  <div style="font-family:'Hiragino Sans',sans-serif;max-width:520px;margin:0 auto;color:#141414">
    <h2 style="font-size:18px;border-bottom:2px solid #0F7A3D;padding-bottom:8px">プロジェクトに応募がありました</h2>
    <p style="font-size:14px;color:#3C4A62">あなたの共創プロジェクト「<b>${esc(projectTitle)}</b>」に、<b>${esc(applicantName)}</b> さんから応募が届きました。</p>
    <p style="margin:22px 0">
      <a href="${APP_URL}/projects/${projectId}" style="display:inline-block;background:#0F7A3D;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px">応募内容を確認する</a>
    </p>
    <p style="font-size:12px;color:#7C8899">このメールはFOOD JAPAN NAKAMAから自動送信されています。</p>
  </div>`;
  await send({
    to,
    subject: `【FOOD JAPAN NAKAMA】「${projectTitle}」に応募がありました`,
    html,
  });
}

// 会員向け：共創プロジェクトの掲載が承認されたときの通知（掲載者へ）。
export async function notifyProjectApproved(params: {
  to: string[];
  projectTitle: string;
  projectId: string;
}): Promise<void> {
  const { to, projectTitle, projectId } = params;
  if (to.length === 0) return;
  const html = `
  <div style="font-family:'Hiragino Sans',sans-serif;max-width:520px;margin:0 auto;color:#141414">
    <h2 style="font-size:18px;border-bottom:2px solid #0F7A3D;padding-bottom:8px">プロジェクトの掲載が承認されました</h2>
    <p style="font-size:14px;color:#3C4A62">共創プロジェクト「<b>${esc(projectTitle)}</b>」の掲載を承認しました。会員の検索結果と一覧に公開されています。</p>
    <p style="font-size:14px;color:#3C4A62">応募が届くと、メールとマイページの「進行中の活動」でお知らせします。</p>
    <p style="margin:22px 0">
      <a href="${APP_URL}/projects/${projectId}" style="display:inline-block;background:#0F7A3D;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px">公開ページを確認する</a>
    </p>
    <p style="font-size:12px;color:#7C8899">FOOD JAPAN NAKAMA 事務局（株式会社グラブデザイン）</p>
  </div>`;
  await send({
    to,
    subject: `【FOOD JAPAN NAKAMA】「${projectTitle}」の掲載が承認されました`,
    html,
  });
}

// 会員向け：共創プロジェクトの掲載が差し戻されたときの通知（掲載者へ・理由つき）。
export async function notifyProjectSentBack(params: {
  to: string[];
  projectTitle: string;
  projectId: string;
  reason: string;
}): Promise<void> {
  const { to, projectTitle, projectId, reason } = params;
  if (to.length === 0) return;
  const html = `
  <div style="font-family:'Hiragino Sans',sans-serif;max-width:520px;margin:0 auto;color:#141414">
    <h2 style="font-size:18px;border-bottom:2px solid #0F7A3D;padding-bottom:8px">プロジェクトの掲載についてお願い</h2>
    <p style="font-size:14px;color:#3C4A62">共創プロジェクト「<b>${esc(projectTitle)}</b>」の掲載申請を確認し、内容の修正をお願いするため一度差し戻しました。</p>
    <p style="font-size:13px;color:#3C4A62;background:#f2f5f0;border-radius:6px;padding:12px;white-space:pre-wrap"><b>差し戻しの理由・修正してほしい箇所：</b>
${esc(reason)}</p>
    <p style="font-size:14px;color:#3C4A62">内容を修正のうえ、再度「掲載を申請」してください。ご不明な点は事務局までご連絡ください。</p>
    <p style="margin:22px 0">
      <a href="${APP_URL}/projects/${projectId}/edit" style="display:inline-block;background:#0F7A3D;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px">内容を修正する</a>
    </p>
    <p style="font-size:12px;color:#7C8899">FOOD JAPAN NAKAMA 事務局（株式会社グラブデザイン）</p>
  </div>`;
  await send({
    to,
    subject: `【FOOD JAPAN NAKAMA】「${projectTitle}」の掲載について修正のお願い`,
    html,
  });
}

// 会員向け：掲載を事務局が非公開にしたときの通知。
export async function notifyListingUnpublished(params: {
  to: string[];
  kind: "台帳" | "プロジェクト";
  title: string;
  reason: string;
  editUrl: string;
}): Promise<void> {
  const { to, kind, title, reason, editUrl } = params;
  if (to.length === 0) return;
  const html = `
  <div style="font-family:'Hiragino Sans',sans-serif;max-width:520px;margin:0 auto;color:#141414">
    <h2 style="font-size:18px;border-bottom:2px solid #0F7A3D;padding-bottom:8px">掲載を一時非公開にしました</h2>
    <p style="font-size:14px;color:#3C4A62">事務局にて内容を確認し、${kind}「<b>${esc(title)}</b>」を一時的に非公開にいたしました。</p>
    <p style="font-size:13px;color:#3C4A62;background:#f2f5f0;border-radius:6px;padding:12px;white-space:pre-wrap"><b>理由：</b>${esc(reason)}</p>
    <p style="font-size:14px;color:#3C4A62">内容を修正のうえ、再度公開いただけます。ご不明な点は事務局までご連絡ください。</p>
    <p style="margin:22px 0">
      <a href="${editUrl}" style="display:inline-block;background:#0F7A3D;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px">内容を確認・修正する</a>
    </p>
    <p style="font-size:12px;color:#7C8899">FOOD JAPAN NAKAMA 事務局（株式会社グラブデザイン）</p>
  </div>`;
  await send({
    to,
    subject: `【FOOD JAPAN NAKAMA】掲載「${title}」を一時非公開にしました`,
    html,
  });
}

// 個別相談（共創プロデュース／クラファン支援）の通知＋自動返信。
const CONSULT_LABEL: Record<string, string> = {
  produce: "共創プロデュース",
  "food-loss": "フードロス",
  crowdfunding: "クラウドファンディング支援",
  unsure: "どちらが合うか相談",
};
const ADMIN_INBOX = "info@grab-design.com";

export async function sendConsultationEmails(c: {
  refNo: string;
  serviceType: string;
  company: string;
  name: string;
  email: string;
  phone?: string | null;
  area?: string | null;
  industry?: string | null;
  productSummary: string;
  challenge: string;
  desiredOutcome?: string | null;
  desiredTiming?: string | null;
  budget?: string | null;
}): Promise<void> {
  const label = CONSULT_LABEL[c.serviceType] ?? c.serviceType;
  const rows: [string, string | null | undefined][] = [
    ["受付番号", c.refNo],
    ["相談種別", label],
    ["会社・団体名", c.company],
    ["氏名", c.name],
    ["メール", c.email],
    ["電話", c.phone],
    ["所在地／対象地域", c.area],
    ["業種", c.industry],
    ["商品・地域資源・技術の概要", c.productSummary],
    ["解決したい課題", c.challenge],
    ["希望する成果", c.desiredOutcome],
    ["希望開始時期", c.desiredTiming],
    ["想定予算", c.budget],
  ];
  const table = rows
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><th align="left" style="padding:6px 12px;background:#f2f5f0;white-space:nowrap;vertical-align:top">${k}</th><td style="padding:6px 12px;white-space:pre-wrap">${esc(v)}</td></tr>`)
    .join("");

  await send({
    to: [ADMIN_INBOX],
    subject: `【個別相談】${label}｜${c.company}（${c.refNo}）`,
    html: `<div style="font-family:sans-serif"><p>個別相談の申し込みがありました。</p><table style="border-collapse:collapse;font-size:14px">${table}</table></div>`,
  });

  await send({
    to: [c.email],
    subject: `【FOOD JAPAN NAKAMA】お問い合わせを受け付けました（${c.refNo}）`,
    html: `<div style="font-family:sans-serif;font-size:14px;line-height:1.8"><p>${esc(c.name)} 様</p><p>この度は「${label}」についてお問い合わせいただき、ありがとうございます。<br>以下の内容で受け付けいたしました（受付番号：<b>${c.refNo}</b>）。</p><p>内容を確認のうえ、担当者よりご連絡いたします。<br>※ このメールは送信専用です。ご返信いただいても対応できない場合があります。</p><table style="border-collapse:collapse;font-size:13px">${table}</table><p>FOOD JAPAN NAKAMA（株式会社グラブデザイン）</p></div>`,
  });
}
