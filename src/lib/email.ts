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

/** パスワード変更の完了通知（身に覚えのない変更に気づけるようにする）。 */
export async function notifyPasswordChanged(to: string): Promise<void> {
  const html = `
  <div style="font-family:'Hiragino Sans',sans-serif;max-width:520px;margin:0 auto;color:#141414">
    <h2 style="font-size:18px;border-bottom:2px solid #0F7A3D;padding-bottom:8px">パスワードが変更されました</h2>
    <p style="font-size:14px;color:#3C4A62">FOOD JAPAN NAKAMA のアカウントのパスワードが変更されました。</p>
    <p style="font-size:12px;color:#7C8899">お心当たりがない場合は、すぐに事務局（info@grab-design.com）までご連絡ください。</p>
  </div>`;

  await send({
    to: [to],
    subject: "【FOOD JAPAN NAKAMA】パスワードが変更されました",
    html,
  });
}

/** 退会申請の通知（事務局宛。実削除は事務局が確認のうえ行う）。 */
export async function notifyWithdrawalRequest(params: {
  memberName: string;
  memberId: string;
  email: string;
  reason: string;
}): Promise<void> {
  const html = `
  <div style="font-family:'Hiragino Sans',sans-serif;max-width:520px;margin:0 auto;color:#141414">
    <h2 style="font-size:18px;border-bottom:2px solid #E8341F;padding-bottom:8px">退会のお申し出がありました</h2>
    <p style="font-size:14px;color:#3C4A62">
      事業者名：${esc(params.memberName)}<br>
      申請者：${esc(params.email)}<br>
      会員ID：${esc(params.memberId)}
    </p>
    <p style="font-size:14px;color:#3C4A62">理由：${esc(params.reason) || "（記入なし）"}</p>
    <p style="font-size:12px;color:#7C8899">
      /admin/members から、課金の解約状況を確認したうえで削除してください（削除でStorageの画像・添付も消えます）。
    </p>
  </div>`;

  await send({
    to: [ADMIN_INBOX],
    subject: `【FOOD JAPAN NAKAMA】退会申請：${params.memberName}`,
    html,
  });
}

/** 事務局あての汎用通知（違反報告など）。件名と本文の行だけを受け取る。 */
export async function notifyAdminLines(params: {
  subject: string;
  lines: string[];
}): Promise<void> {
  const html = `<div style="font-family:sans-serif;line-height:1.8">
    <p style="font-size:15px;color:#141414">${esc(params.subject)}</p>
    ${params.lines.map((l) => `<p style="font-size:14px;color:#3C4A62">${esc(l)}</p>`).join("")}
  </div>`;
  await send({
    to: [ADMIN_INBOX],
    subject: `【FOOD JAPAN NAKAMA】${params.subject}`,
    html,
  });
}

// ── 課金システム関連（最終実装指示 2026-08-10）──

/** 有料オプション・クレジット購入の決済完了通知。 */
export async function notifyBillingPaid(params: {
  to: string[];
  itemNames: string[];
  totalAmount: number;
  requiresReview: boolean;
}): Promise<void> {
  const { to, itemNames, totalAmount, requiresReview } = params;
  if (to.length === 0) return;
  const html = `
  <div style="font-family:'Hiragino Sans',sans-serif;max-width:520px;margin:0 auto;color:#141414">
    <h2 style="font-size:18px;border-bottom:2px solid #0F7A3D;padding-bottom:8px">お支払いを確認しました</h2>
    <p style="font-size:14px;color:#3C4A62">ご購入内容：${esc(itemNames.join("、"))}<br>合計：¥${totalAmount.toLocaleString()}（税込）</p>
    <p style="font-size:14px;color:#3C4A62">${
      requiresReview
        ? "内容を確認後、掲載開始日をお知らせします。"
        : "掲載オプションの状態はマイページで確認できます。"
    }</p>
    <p style="margin:22px 0">
      <a href="${APP_URL}/billing" style="display:inline-block;background:#0F7A3D;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px">購入履歴を確認する</a>
    </p>
    <p style="font-size:12px;color:#7C8899">有料オプションは表示機会を増やすサービスであり、閲覧数・問い合わせ・成約を保証するものではありません。</p>
  </div>`;
  await send({ to, subject: "【FOOD JAPAN NAKAMA】お支払いを確認しました", html });
}

/** 掲載オプションの終了予告（3日前）・終了通知。 */
export async function notifyPromotionEnding(params: {
  to: string[];
  offeringTitle: string;
  effectLabel: string;
  endsAt: Date;
  ended: boolean;
}): Promise<void> {
  const { to, offeringTitle, effectLabel, endsAt, ended } = params;
  if (to.length === 0) return;
  const dateText = `${endsAt.getFullYear()}/${endsAt.getMonth() + 1}/${endsAt.getDate()}`;
  const html = `
  <div style="font-family:'Hiragino Sans',sans-serif;max-width:520px;margin:0 auto;color:#141414">
    <h2 style="font-size:18px;border-bottom:2px solid #0F7A3D;padding-bottom:8px">${
      ended ? "掲載オプションが終了しました" : "掲載オプションがまもなく終了します"
    }</h2>
    <p style="font-size:14px;color:#3C4A62">案件「${esc(offeringTitle)}」の「${esc(effectLabel)}」は${
      ended ? `${dateText} に終了しました。` : `${dateText} に終了予定です。`
    }</p>
    <p style="margin:22px 0">
      <a href="${APP_URL}/billing" style="display:inline-block;background:#0F7A3D;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px">状態を確認する</a>
    </p>
  </div>`;
  await send({
    to,
    subject: `【FOOD JAPAN NAKAMA】掲載オプションの${ended ? "終了" : "終了予告"}`,
    html,
  });
}

/** 14日未読によるクレジット返還の通知。 */
export async function notifyUnreadRefund(params: {
  to: string[];
  offeringTitle: string;
  quantity?: number;
}): Promise<void> {
  const { to, offeringTitle, quantity = 1 } = params;
  if (to.length === 0) return;
  const html = `
  <div style="font-family:'Hiragino Sans',sans-serif;max-width:520px;margin:0 auto;color:#141414">
    <h2 style="font-size:18px;border-bottom:2px solid #0F7A3D;padding-bottom:8px">紹介クレジットを返還しました</h2>
    <p style="font-size:14px;color:#3C4A62">案件「${esc(offeringTitle)}」への提案が送信から14日間開封されなかったため、紹介クレジットを${quantity}クレジット返還しました。</p>
    <p style="margin:22px 0">
      <a href="${APP_URL}/billing" style="display:inline-block;background:#0F7A3D;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px">残高を確認する</a>
    </p>
  </div>`;
  await send({ to, subject: "【FOOD JAPAN NAKAMA】紹介クレジットの返還のお知らせ", html });
}

/**
 * 送った問い合わせが一定期間ひらかれていないことを、買い手へ知らせる（2026-08-12）。
 * 売り手側の開封が有料になったので、待たされている側に状況を見せる（透明化）。
 */
export async function notifyLeadUnopened(params: {
  to: string[];
  offeringTitle: string;
  days: number;
  threadId: string;
}): Promise<void> {
  const { to, offeringTitle, days, threadId } = params;
  if (to.length === 0) return;
  const html = `
  <div style="font-family:'Hiragino Sans',sans-serif;max-width:520px;margin:0 auto;color:#141414">
    <h2 style="font-size:18px;border-bottom:2px solid #0F7A3D;padding-bottom:8px">お送りした問い合わせは、まだ開封されていません</h2>
    <p style="font-size:14px;color:#3C4A62">案件「<b>${esc(offeringTitle)}</b>」へお送りした問い合わせが、${days}日間ひらかれていません。相手先の状況により、確認までお時間がかかる場合があります。</p>
    <p style="font-size:13px;color:#3C4A62">ほかの掲載者にも問い合わせることができます。お探しのものが見つからない場合は、事務局へご相談ください（無料）。</p>
    <p style="margin:22px 0">
      <a href="${APP_URL}/messages/${threadId}" style="display:inline-block;background:#0F7A3D;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px">やり取りを確認する</a>
    </p>
    <p style="font-size:12px;color:#7C8899">このメールはFOOD JAPAN NAKAMAから自動送信されています。</p>
  </div>`;
  await send({
    to,
    subject: `【FOOD JAPAN NAKAMA】「${offeringTitle}」への問い合わせは未開封です`,
    html,
  });
}

/** 案内メール一斉送信（案内メール同意者のみに送る広告メール。広告表記つき）。 */
export async function sendMatchedNoticeEmail(params: {
  to: string;
  offeringTitle: string;
  offeringId: string;
  direction: string;
}): Promise<void> {
  const { to, offeringTitle, offeringId, direction } = params;
  const kind = direction === "GIVE" ? "売りたい（提供したい）" : "探している（調達したい）";
  const html = `
  <div style="font-family:'Hiragino Sans',sans-serif;max-width:520px;margin:0 auto;color:#141414">
    <p style="font-size:11px;color:#7C8899">【広告】この案内は、案件・イベント等の案内メールに同意いただいた方へお送りしています。</p>
    <h2 style="font-size:18px;border-bottom:2px solid #0F7A3D;padding-bottom:8px">条件に合う可能性のある案件のご案内</h2>
    <p style="font-size:14px;color:#3C4A62">「${esc(kind)}」案件：<b>${esc(offeringTitle)}</b></p>
    <p style="margin:22px 0">
      <a href="${APP_URL}/ledger/${offeringId}" style="display:inline-block;background:#0F7A3D;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px">案件を見る</a>
    </p>
    <p style="font-size:12px;color:#7C8899">配信停止をご希望の場合は、このメールに返信するか info@grab-design.com までご連絡ください。</p>
  </div>`;
  await send({ to: [to], subject: `【FOOD JAPAN NAKAMA】条件に合う案件のご案内：${offeringTitle}`, html });
}

/** 新規登録（アカウント作成）を事務局へ通知。 */
export async function notifyAdminNewSignup(params: { email: string; name: string }): Promise<void> {
  const html = `
  <div style="font-family:'Hiragino Sans',sans-serif;max-width:520px;margin:0 auto;color:#141414">
    <h2 style="font-size:18px;border-bottom:2px solid #0F7A3D;padding-bottom:8px">新規登録がありました</h2>
    <p style="font-size:14px;color:#3C4A62">メールアドレス：${esc(params.email)}<br>表示名：${esc(params.name)}</p>
    <p style="margin:22px 0">
      <a href="${APP_URL}/admin/members" style="display:inline-block;background:#0F7A3D;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px">会員管理を開く</a>
    </p>
    <p style="font-size:12px;color:#7C8899">プロフィール入力・審査申請が届いた際は、別途「審査申請」の通知が届きます。</p>
  </div>`;
  await send({ to: ["info@grab-design.com"], subject: "【FOOD JAPAN NAKAMA】新規登録がありました", html });
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
  theme: "共創テーマ相談",
  produce: "共創プロデュース",
  "food-loss": "フードロス",
  crowdfunding: "クラウドファンディング支援",
  project: "共創プロジェクト伴走",
  strategy_session: "商品・販路戦略セッション",
  channel_trial: "販路開拓トライアル",
  promotion_plan: "販促プラン",
  sales_growth: "販売強化プラン",
  solution_build: "売れる仕組み構築",
  success_fee: "販売成果報酬",
  co_creation: "共創・商品開発",
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

/**
 * 事務局から会員へ個別に送るメール（2026-08-16・顧客カルテから送信）。
 *
 * kind="notice"（利用案内）＝本サービスの提供に必要な手続的な連絡。規約第27条の2第1項。
 * kind="ad"（広告・宣伝を含む案内）＝特定電子メール法の対象。**同意者にのみ送る**（呼び出し側で検証）。
 * 広告のときは、送信者の名称・住所・受信拒否の通知先を必ず本文に表示する（同法の表示義務）。
 */
export async function sendAdminMessageEmail(params: {
  to: string;
  subject: string;
  body: string;
  kind: "notice" | "ad";
  senderName: string;
}): Promise<void> {
  const isAd = params.kind === "ad";
  const bodyHtml = esc(params.body).replace(/\n/g, "<br>");
  const html = `
    <div style="font-family:sans-serif;line-height:1.9;color:#141414">
      ${isAd ? '<p style="font-size:12px;color:#7c8899;margin:0 0 12px">＜広告＞</p>' : ""}
      <div style="font-size:14px">${bodyHtml}</div>
      <hr style="border:none;border-top:1px solid #dbe1d9;margin:24px 0">
      <div style="font-size:12px;color:#7c8899">
        FOOD JAPAN NAKAMA 事務局　${esc(params.senderName)}<br>
        株式会社グラブデザイン<br>
        〒102-0073 東京都千代田区九段北1-2-1<br>
        <a href="mailto:info@grab-design.com">info@grab-design.com</a>／03-6825-3901<br>
        <a href="${APP_URL}">${APP_URL}</a>
      </div>
      ${
        isAd
          ? `<p style="font-size:12px;color:#7c8899;margin-top:12px">
               このメールは、ご登録時に案内メールの受信に同意いただいた方へお送りしています。<br>
               配信の停止は、<a href="${APP_URL}/profile">プロフィール画面</a>またはこのメールへの返信（<a href="mailto:info@grab-design.com">info@grab-design.com</a>）で承ります。
             </p>`
          : `<p style="font-size:12px;color:#7c8899;margin-top:12px">
               このメールは、FOOD JAPAN NAKAMA のご利用に関する事務連絡としてお送りしています。
             </p>`
      }
    </div>`;
  await send({ to: [params.to], subject: params.subject, html });
}

// ── Food Japan Summit 協賛申込（/sponsor）─────────────────────────
// ⚠️ 通常の send() は失敗してもログに出すだけだが、協賛の申込は取りこぼすと影響が大きい
//    （最大250万円の申込）。ここだけは**送信できたかどうかを呼び出し側へ返し**、
//    全滅した場合はフォーム側で「直接メールしてください」と案内する。

/** 1通送って、成功したかどうかを返す（送信基盤が無い開発時は false ではなく true 扱いにしない）。 */
async function sendOne(to: string, subject: string, html: string): Promise<boolean> {
  if (!resend) {
    console.log(`[email] RESEND_API_KEY 未設定のため送信スキップ: ${subject} -> ${to}`);
    return false;
  }
  try {
    const { error } = await resend.emails.send({ from: FROM, to: [to], subject, html });
    if (error) {
      console.error(`[email] 協賛申込の送信失敗(${to}):`, error);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[email] 協賛申込の送信例外(${to}):`, e);
    return false;
  }
}

export type SponsorMailInput = {
  refNo: string;
  isLocalCorp: boolean;
  entryType: string;
  plan: string;
  annualMember: boolean;
  boothOption: boolean;
  company: string;
  companyKana: string;
  name: string;
  department: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  /** ご紹介者（任意）。未入力なら row() が行ごと出さない。 */
  referrer: string;
  purpose: string;
  themes: string[];
  benefits: string[];
  presentation: string;
  invoiceName: string;
  invoiceNote: string;
  logoSubmission: string;
  /** アップロードされたロゴのダウンロードリンク（任意）。
   *  ⚠️ **事務局宛にだけ出す**。申込者へ送り返す必要がないうえ、控えのメールが
   *     転送されるとリンクごと渡ってしまうため。
   *  ⚠️ URLには期限がある（sponsor.ts の LOGO_LINK_TTL_SEC）。期限を過ぎたら
   *     Supabase の sponsor-logos バケットから直接取り出すこと。 */
  logoLink?: { name: string; url: string };
  message: string;
};

/**
 * 事務局2名へ申込内容を送り、申込者へ受付控えを送る。
 * 戻り値の adminDelivered が false のときは、フォーム側でエラーを出すこと。
 */
export async function sendSponsorApplicationEmails(
  a: SponsorMailInput,
  inbox: string[]
): Promise<{ adminDelivered: boolean }> {
  const row = (label: string, value: string) =>
    value
      ? `<tr><th align="left" style="padding:6px 10px;background:#F4F5F2;border:1px solid #E3E6E1;font-size:13px;white-space:nowrap;vertical-align:top">${esc(label)}</th>
           <td style="padding:6px 10px;border:1px solid #E3E6E1;font-size:13px;white-space:pre-wrap">${esc(value)}</td></tr>`
      : "";

  // row() は値をエスケープするので、リンクを入れたい行はこちらを使う。
  const row2 = (label: string, valueHtml: string) =>
    `<tr><th align="left" style="padding:6px 10px;background:#F4F5F2;border:1px solid #E3E6E1;font-size:13px;white-space:nowrap;vertical-align:top">${esc(label)}</th>
         <td style="padding:6px 10px;border:1px solid #E3E6E1;font-size:13px">${valueHtml}</td></tr>`;

  const adminHtml = `
  <div style="font-family:'Hiragino Sans',sans-serif;max-width:640px;margin:0 auto;color:#141414">
    <h2 style="font-size:17px;border-bottom:2px solid #0F7A3D;padding-bottom:8px">
      協賛申込がありました（Food Japan Summit 2026）
    </h2>
    <p style="font-size:13px">受付番号：<b>${esc(a.refNo)}</b></p>
    ${a.isLocalCorp ? `<p style="font-size:13px;color:#B45309;font-weight:bold">※ 宮崎県内に本店または主たる事業所を置く法人（特別割の対象）</p>` : ""}
    <table style="border-collapse:collapse;width:100%">
      ${row("協賛対象の開催", a.entryType)}
      ${row("希望プラン", a.plan)}
      ${row("年間会員", a.annualMember ? "あわせて相談したい" : "")}
      ${row("ブース出展", a.boothOption ? "あわせて申し込みたい（1ブース200,000円・税別）" : "")}
      ${row("法人・団体名", a.company)}
      ${row("フリガナ", a.companyKana)}
      ${row("ご担当者名", a.name)}
      ${row("部署・役職", a.department)}
      ${row("メールアドレス", a.email)}
      ${row("電話番号", a.phone)}
      ${row("所在地", a.address)}
      ${row("ウェブサイト", a.website)}
      ${row("ご紹介者", a.referrer)}
      ${row("実現したいこと", a.purpose)}
      ${row("関心のある共創テーマ", a.themes.join("／"))}
      ${row("希望する協賛特典", a.benefits.join("／"))}
      ${row("登壇・展示・試食の希望", a.presentation)}
      ${row("請求書の宛名", a.invoiceName)}
      ${row("請求書に関する希望", a.invoiceNote)}
      ${row("ロゴデータの提出方法", a.logoSubmission)}
      ${
        a.logoLink
          ? row2(
              "提出されたロゴデータ",
              `<a href="${esc(a.logoLink.url)}">${esc(a.logoLink.name)}</a>（ダウンロード：30日間有効）`
            )
          : ""
      }
      ${row("備考", a.message)}
    </table>
    <p style="font-size:12px;color:#7C8899;margin-top:14px">
      返信は <a href="mailto:${esc(a.email)}">${esc(a.email)}</a> 宛に送れます。
    </p>
  </div>`;

  const results = await Promise.all(
    inbox.map((to) =>
      sendOne(to, `【協賛申込】${a.company}／${a.plan}（${a.refNo}）`, adminHtml)
    )
  );

  // 申込者への受付控え（届かなくても申込自体は成立させる）
  const applicantHtml = `
  <div style="font-family:'Hiragino Sans',sans-serif;max-width:560px;margin:0 auto;color:#141414">
    <h2 style="font-size:17px;border-bottom:2px solid #0F7A3D;padding-bottom:8px">協賛のお申し込みを受け付けました</h2>
    <p style="font-size:14px;line-height:1.9">
      ${esc(a.company)} 御中<br><br>
      Food Japan Summit 2026 へのお申し込みをいただき、ありがとうございます。<br>
      内容を確認のうえ、フードジャパンサミット実行委員会より、協賛内容・ロゴデータの提出方法・請求書・今後の進行についてご連絡します。
    </p>
    <table style="border-collapse:collapse;width:100%;margin-top:10px">
      ${row("受付番号", a.refNo)}
      ${row("協賛対象の開催", a.entryType)}
      ${row("希望プラン", a.plan)}
      ${row("年間会員", a.annualMember ? "あわせて相談したい" : "")}
      ${row("ブース出展", a.boothOption ? "あわせて申し込みたい（1ブース200,000円・税別）" : "")}
    </table>
    <p style="font-size:13px;line-height:1.9;margin-top:12px;color:#4A5A50">
      宮崎開催：2026年11月17日（火）・18日（水）／宮崎観光ホテル<br>
      名古屋開催：2026年12月15日（火）・16日（水）／名鉄グランドホテル
    </p>
    <p style="font-size:14px;line-height:1.9;margin-top:14px">
      Food Japan Summit 2026 で、共に新しい事業を生み出していけることを楽しみにしております。
    </p>
    <p style="font-size:12px;color:#7C8899;margin-top:16px">
      フードジャパンサミット実行委員会（株式会社グラブデザイン）<br>
      〒102-0073 東京都千代田区九段北1-2-1<br>
      <a href="mailto:info@grab-design.com">info@grab-design.com</a>／03-6825-3901
    </p>
  </div>`;
  await sendOne(a.email, `【Food Japan Summit 2026】協賛申込を受け付けました（${a.refNo}）`, applicantHtml);

  return { adminDelivered: results.some(Boolean) };
}

// ── 協賛内容の相談（/sponsor/contact）─────────────────────────
// プランや金額が決まっていない段階の受け皿。連絡先だけを受け取る。
// ⚠️ 申込と同じく、事務局あてが1通も送れなかったら呼び出し側でエラーを出す。

export type SponsorInquiryInput = {
  refNo: string;
  company: string;
  name: string;
  phone: string;
  email: string;
  facebook: string;
  message: string;
};

export async function sendSponsorInquiryEmails(
  a: SponsorInquiryInput,
  inbox: string[]
): Promise<{ adminDelivered: boolean }> {
  const row = (label: string, value: string) =>
    value
      ? `<tr><th align="left" style="padding:6px 10px;background:#F4F5F2;border:1px solid #E3E6E1;font-size:13px;white-space:nowrap;vertical-align:top">${esc(label)}</th>
           <td style="padding:6px 10px;border:1px solid #E3E6E1;font-size:13px;white-space:pre-wrap">${esc(value)}</td></tr>`
      : "";

  const adminHtml = `
  <div style="font-family:'Hiragino Sans',sans-serif;max-width:600px;margin:0 auto;color:#141414">
    <h2 style="font-size:17px;border-bottom:2px solid #0F7A3D;padding-bottom:8px">
      協賛内容のご相談が届きました（Food Japan Summit 2026）
    </h2>
    <p style="font-size:13px">受付番号：<b>${esc(a.refNo)}</b></p>
    <p style="font-size:13px;color:#B45309">※ プラン未定の段階のご相談です。事務局から目的をうかがってご提案してください。</p>
    <table style="border-collapse:collapse;width:100%">
      ${row("組織名・企業名", a.company)}
      ${row("ご担当者名", a.name)}
      ${row("電話番号", a.phone)}
      ${row("メールアドレス", a.email)}
      ${row("Facebook", a.facebook)}
      ${row("ご相談の内容", a.message)}
    </table>
    <p style="font-size:12px;color:#7C8899;margin-top:14px">
      返信は <a href="mailto:${esc(a.email)}">${esc(a.email)}</a> 宛に送れます。
    </p>
  </div>`;

  const results = await Promise.all(
    inbox.map((to) => sendOne(to, `【協賛相談】${a.company}（${a.refNo}）`, adminHtml))
  );

  const applicantHtml = `
  <div style="font-family:'Hiragino Sans',sans-serif;max-width:560px;margin:0 auto;color:#141414">
    <h2 style="font-size:17px;border-bottom:2px solid #0F7A3D;padding-bottom:8px">ご相談を受け付けました</h2>
    <p style="font-size:14px;line-height:1.9">
      ${esc(a.company)} 御中<br><br>
      Food Japan Summit 2026 の協賛についてお問い合わせいただき、ありがとうございます。<br>
      フードジャパンサミット実行委員会より、あらためてご連絡いたします。
      貴社が実現したいことをうかがったうえで、協賛内容をご提案します。
    </p>
    <p style="font-size:13px;margin-top:10px">受付番号：<b>${esc(a.refNo)}</b></p>
    <p style="font-size:12px;color:#7C8899;margin-top:16px">
      フードジャパンサミット実行委員会（株式会社グラブデザイン）<br>
      〒102-0073 東京都千代田区九段北1-2-1<br>
      <a href="mailto:info@grab-design.com">info@grab-design.com</a>／03-6825-3901
    </p>
  </div>`;
  await sendOne(a.email, `【Food Japan Summit 2026】協賛のご相談を受け付けました（${a.refNo}）`, applicantHtml);

  return { adminDelivered: results.some(Boolean) };
}

// 共創フィールドワークのレポートの控え（2026-11-18）。
//
// なぜ送るか: 当日は帰路のバスで作って、その場で発表する。帰社後の社内説明は数日後になる。
//   端末の localStorage だけだと、機種変更やキャッシュ削除で消える。本人の手元に1通残す。
// ⚠️ 本人が自分で入力した宛先にだけ送る。事務局や第三者へは送らない。
// ⚠️ 本文は本人が書いた内容とAIの下書き。esc() を通してから埋め込む。
export async function sendFieldworkReportEmail(params: {
  to: string;
  projectName: string;
  partner: string;
  /** 「見出し\n本文」を並べた素のテキスト */
  body: string;
}): Promise<void> {
  const title = params.projectName || "共創レポート";
  const html = `
    <div style="font-family:sans-serif;line-height:1.9;color:#141414">
      <p style="font-size:12px;color:#7c8899;margin:0 0 4px">共創レポート</p>
      <h1 style="font-size:20px;margin:0 0 8px">${esc(title)}</h1>
      ${params.partner ? `<p style="margin:0 0 16px;color:#0b5c2e;font-weight:bold">共創先：${esc(params.partner)}</p>` : ""}
      <p style="font-size:13px;color:#7c8899;margin:0 0 20px">
        FOOD JAPAN SUMMIT 2026 in MIYAZAKI DAY2 霧島フィールドワーク（2026年11月18日）でお作りいただいたレポートの控えです。
      </p>
      <div style="border-top:2px solid #141414;padding-top:16px;white-space:pre-wrap;font-size:14px">${esc(params.body)}</div>
      <p style="margin-top:28px;padding-top:12px;border-top:1px solid #dbe1d9;font-size:12px;color:#7c8899">
        このレポートはAIが作成した下書きです。事実をご確認のうえ、社内と福山黒酢へお出しください。
      </p>
    </div>`;
  await send({ to: [params.to], subject: `【共創フィールドワーク】レポートの控え：${title}`, html });
}

// ── みんなの取り組み（コミュニティ投稿）の通知（2026-11-21） ───────────────
//
// なぜ送るか（ユーザー指示 2026-11-21）:
//   「書き込んだらメールが飛ぶようにしてよ」「自分のところにメッセージがきたりすると」
//   3ヶ月に1回しか会わない相手同士では、自分で見に来る人はいない。
//   反応が本人に届いて初めて、投稿が会話になる。
//
// ⚠️ 送るのは「**自分宛の反応**」だけ（自分の投稿へのコメント・いいね・シェア、自分のコメントへの返信）。
//    誰かが新しく投稿したことを、つながっている全員に知らせる作りにはしていない
//    （30人が全員つながると1投稿で29通になり、読まれなくなる）。
// ⚠️ 本文の引用は80字まで。メールに全文を載せると、受け取る側の鍵で守られていない場所に
//    会員の書いたものが丸ごと残る。
// ⚠️ 宛先の選定と停止設定の確認は feed-notify.ts で行う。ここは文面だけ。

/** 共通の体裁。見出し・導入・引用・飛び先ボタン */
function feedNoticeHtml(params: {
  heading: string;
  lead: string;
  quote?: string | null;
  postId: string;
  buttonLabel: string;
}): string {
  const { heading, lead, quote, postId, buttonLabel } = params;
  return `
  <div style="font-family:'Hiragino Sans',sans-serif;max-width:520px;margin:0 auto;color:#141414">
    <h2 style="font-size:18px;border-bottom:2px solid #0F7A3D;padding-bottom:8px">${heading}</h2>
    <p style="font-size:14px;color:#3C4A62">${lead}</p>
    ${
      quote
        ? `<p style="font-size:13px;color:#3C4A62;background:#f2f5f0;border-radius:6px;padding:12px;white-space:pre-wrap">${esc(
            quote
          )}</p>`
        : ""
    }
    <p style="margin:22px 0">
      <a href="${APP_URL}/dashboard#p-${esc(postId)}" style="display:inline-block;background:#0F7A3D;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px">${buttonLabel}</a>
    </p>
    <p style="font-size:12px;color:#7C8899">
      このメールはFOOD JAPAN NAKAMAから自動送信されています。<br>
      この種類のお知らせは、<a href="${APP_URL}/dashboard" style="color:#7C8899">ホーム</a>の画面いちばん下で止められます。
    </p>
  </div>`;
}

/** 自分の投稿にコメントが付いた／自分のコメントに返信が付いた */
export async function notifyPostComment(params: {
  to: string[];
  fromMemberName: string;
  preview: string;
  postId: string;
  isReply: boolean;
}): Promise<void> {
  const { to, fromMemberName, preview, postId, isReply } = params;
  if (to.length === 0) return;
  const short = preview.length > 80 ? `${preview.slice(0, 80)}…` : preview;
  await send({
    to,
    subject: isReply
      ? `【FOOD JAPAN NAKAMA】${fromMemberName}さんから返信がありました`
      : `【FOOD JAPAN NAKAMA】${fromMemberName}さんがコメントしました`,
    html: feedNoticeHtml({
      heading: isReply ? "コメントに返信がありました" : "投稿にコメントがつきました",
      lead: isReply
        ? `あなたのコメントに、<b>${esc(fromMemberName)}</b> さんが返信しました。`
        : `あなたの投稿に、<b>${esc(fromMemberName)}</b> さんがコメントしました。`,
      quote: short,
      postId,
      buttonLabel: "コメントを読む",
    }),
  });
}

/**
 * 自分の投稿にいいねが付いた。
 * ⚠️ 1投稿につき1日1通まで（送るかどうかの判定は feed-notify.ts）。
 *    1件ごとに送ると、人気の投稿で通知が洪水になる。
 */
export async function notifyPostLike(params: {
  to: string[];
  fromMemberName: string;
  postPreview: string;
  postId: string;
}): Promise<void> {
  const { to, fromMemberName, postPreview, postId } = params;
  if (to.length === 0) return;
  const short = postPreview.length > 80 ? `${postPreview.slice(0, 80)}…` : postPreview;
  await send({
    to,
    subject: `【FOOD JAPAN NAKAMA】${fromMemberName}さんがいいねしました`,
    html: feedNoticeHtml({
      heading: "投稿にいいねがつきました",
      lead: `あなたの投稿に、<b>${esc(fromMemberName)}</b> さんがいいねしました。`,
      quote: short || null,
      postId,
      buttonLabel: "投稿を見る",
    }),
  });
}

/** 自分の投稿が紹介（シェア）された */
export async function notifyPostShared(params: {
  to: string[];
  fromMemberName: string;
  comment: string;
  postId: string;
}): Promise<void> {
  const { to, fromMemberName, comment, postId } = params;
  if (to.length === 0) return;
  const short = comment.length > 80 ? `${comment.slice(0, 80)}…` : comment;
  await send({
    to,
    subject: `【FOOD JAPAN NAKAMA】${fromMemberName}さんがあなたの投稿を紹介しました`,
    html: feedNoticeHtml({
      heading: "投稿が紹介されました",
      lead: `<b>${esc(fromMemberName)}</b> さんが、あなたの投稿を自分のつながりに紹介しました。`,
      quote: short || null,
      postId,
      buttonLabel: "紹介された投稿を見る",
    }),
  });
}

// ── 集まりたい（2026-11-23） ───────────────────────────────
//
// ⚠️ 送るのは**主催者ひとり**に、手が挙がったことだけ。
//    参加者全員への一斉連絡はここから出さない（主催が自分の言葉で出すもの）。

/** 自分が立てた集まりに手が挙がった */
export async function notifyGatheringJoin(params: {
  to: string[];
  gatheringId: string;
  gatheringTitle: string;
  fromMemberName: string;
  kindLabel: string;
  note: string | null;
  goingCount: number;
}): Promise<void> {
  const { to, gatheringId, gatheringTitle, fromMemberName, kindLabel, note, goingCount } = params;
  if (to.length === 0) return;
  const short = note && note.length > 80 ? `${note.slice(0, 80)}…` : note;
  const html = `
  <div style="font-family:'Hiragino Sans',sans-serif;max-width:520px;margin:0 auto;color:#141414">
    <h2 style="font-size:18px;border-bottom:2px solid #0F7A3D;padding-bottom:8px">手が挙がりました</h2>
    <p style="font-size:14px;color:#3C4A62">
      あなたの集まり「<b>${esc(gatheringTitle)}</b>」に、
      <b>${esc(fromMemberName)}</b> さんが「${esc(kindLabel)}」と答えました。
    </p>
    ${
      short
        ? `<p style="font-size:13px;color:#3C4A62;background:#f2f5f0;border-radius:6px;padding:12px;white-space:pre-wrap">${esc(short)}</p>`
        : ""
    }
    <p style="font-size:13px;color:#3C4A62">いま「行きます」は ${goingCount} 名です。</p>
    <p style="margin:22px 0">
      <a href="${APP_URL}/gatherings/${esc(gatheringId)}" style="display:inline-block;background:#0F7A3D;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px">集まりを開く</a>
    </p>
    <p style="font-size:12px;color:#7C8899">
      このメールはFOOD JAPAN NAKAMAから自動送信されています。<br>
      この種類のお知らせは、<a href="${APP_URL}/dashboard" style="color:#7C8899">ホーム</a>の画面いちばん下で止められます。
    </p>
  </div>`;
  await send({
    to,
    subject: `【FOOD JAPAN NAKAMA】「${gatheringTitle}」に${fromMemberName}さんが手を挙げました`,
    html,
  });
}

/**
 * 「このサービス、使いますか？」のご案内（2026-11-23 ユーザー指示「メールを送付する」）。
 *
 * ⚠️⚠️ **送るのは1回だけ。** 返事が無い方に催促しない（同意なき勧誘になる）。
 * ⚠️⚠️ **なぜ届いたのかを、冒頭に必ず書く。**
 *    参加規定に「関連サービスのご案内」が無い場合でも、出所が明示してあれば筋が通る。
 * ⚠️ 「いいえ」も同じ大きさで出す。押しにくくしない。
 */
export async function sendMemberInvite(params: {
  to: string;
  /** 事業者名 */
  name: string;
  /** 担当者名（あれば「○○ さま」と書く） */
  contactName: string | null;
  token: string;
  /**
   * すでに会員向けの一覧に掲載しているか。
   * ⚠️⚠️ **ここを間違えると、事実と違うことを書いて送ることになる。**
   *    2026-11-25 に登壇者45名を一覧へ出したのに、文面は「まだ誰にも見えていません」のままだった。
   *    掲載済みの方には、掲載していると正直に書き、消し方を先に示す。
   */
  listed: boolean;
}): Promise<void> {
  const url = `${APP_URL}/join/${encodeURIComponent(params.token)}`;
  const greeting = params.contactName
    ? `${esc(params.contactName)} さま`
    : `${esc(params.name)} ご担当者さま`;

  const html = `
    <div style="font-family:sans-serif;line-height:1.9;color:#1a1a1a;max-width:560px">
      <p style="font-size:12px;color:#666;margin:0 0 20px">
        このメールは、FOOD JAPAN SUMMIT 2026 にご登壇・ご参加いただいた方にお送りしています。
      </p>

      <p>${greeting}</p>

      <p>
        FOOD JAPAN SUMMIT 事務局です。<br />
        サミットでお会いした方々が、そのあともつながっていられる場として
        <strong>FOOD JAPAN NAKAMA</strong> というサービスを作りました。
      </p>

      ${
        params.listed
          ? `<p>
        サミットでいただいたお名前・会社名・肩書・ご登壇の記録を、
        <strong>会員だけが見られる登壇者一覧に掲載しています</strong>。
        一般には公開しておらず、検索にも出ません。<br />
        お使いになるかどうかは、${greeting}にお決めいただきたいと思っています。
        <strong>「いいえ」を選ばれた場合、掲載はその場で取り下げ、お預かりした情報も削除します。</strong>
      </p>`
          : `<p>
        サミットでいただいたお名前・会社名・肩書を、<strong>すでにお預かりしています</strong>。<br />
        ただし、<strong>まだ誰にも見えていません。</strong>
        お使いになるかどうかは、${greeting}にお決めいただきたいと思っています。
      </p>`
      }

      <p style="margin:28px 0">
        <a href="${url}"
           style="display:inline-block;background:#1E6B4E;color:#fff;text-decoration:none;
                  padding:14px 28px;border-radius:8px;font-weight:bold;font-size:15px">
          使うかどうかを決める
        </a>
      </p>

      <p style="font-size:13px;color:#555">
        開くと、お預かりしている内容がそのまま出ます。<br />
        <strong>「いいえ」を選ばれた場合、${params.listed ? "掲載を取り下げ、" : ""}お預かりした情報はその場で削除します。</strong>
        その後ご連絡することもありません。
      </p>

      <p style="font-size:13px;color:#555">
        このご案内をお送りするのは、この1通かぎりです。
        お返事がなくても、こちらから重ねてご連絡することはありません。
      </p>

      <hr style="border:none;border-top:1px solid #e3e6e8;margin:28px 0" />
      <p style="font-size:12px;color:#888;margin:0">
        FOOD JAPAN NAKAMA／FOOD JAPAN SUMMIT 事務局<br />
        <a href="${APP_URL}" style="color:#1E6B4E">${APP_URL}</a>
      </p>
    </div>
  `;

  await send({
    to: [params.to],
    subject: params.listed
      ? "FOOD JAPAN NAKAMA 登壇者一覧への掲載について（お使いになるか、お決めください）"
      : "FOOD JAPAN NAKAMA のご案内（お使いになるか、お決めください）",
    html,
  });
}
