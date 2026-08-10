// セキュリティ共通ヘルパー（Phase 6・2026-08-11）。
// - 遷移先の検証（オープンリダイレクト防止）
// - 認証操作のレート制限（総当たり・メール爆撃の抑止）
// - 入力長の上限値（DB肥大とDoSの抑止）
import { headers } from "next/headers";
import { prisma } from "@/lib/db";

// ── 入力長の上限 ─────────────────────────────
export const MESSAGE_MAX = 4000; // メッセージ・提案本文・下書き
export const TEMPLATE_NAME_MAX = 100;
export const TEMPLATE_BODY_MAX = 4000;
export const PROFILE_SHORT_MAX = 200; // 会社名・URL・担当者名など1行項目
export const PROFILE_LONG_MAX = 4000; // 説明・実績などの本文項目
export const ANNOUNCEMENT_TITLE_MAX = 200;
export const ANNOUNCEMENT_BODY_MAX = 8000;

/** フォーム値を trim して上限で切り詰める。 */
export function trimTo(value: FormDataEntryValue | null | undefined, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

// ── 遷移先の検証 ─────────────────────────────

/** 制御文字（改行・タブ・NUL等）を含むか。ヘッダ注入や解析差異の元になるため弾く。 */
function hasControlChar(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return true;
  }
  return false;
}

/**
 * 自サイト内のパスだけを許可する（オープンリダイレクト防止）。
 * `startsWith("/") && !startsWith("//")` だけでは `/\evil.com` を通してしまう
 * （WHATWG URL はバックスラッシュをスラッシュとして解釈するため https://evil.com/ に解決される）。
 * ここではバックスラッシュ・制御文字を弾いたうえで、実際に解決して同一オリジンに収まることを確認する。
 */
export function safeInternalPath(
  value: FormDataEntryValue | string | null | undefined,
  fallback = "/dashboard"
): string {
  const n = typeof value === "string" ? value : "";
  if (!n.startsWith("/") || n.startsWith("//")) return fallback;
  if (n.includes("\\") || hasControlChar(n)) return fallback;
  try {
    const base = "https://internal.invalid";
    const u = new URL(n, base);
    if (u.origin !== base) return fallback;
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return fallback;
  }
}

/**
 * パスワード再設定リンクを踏んだ直後であることを示すクッキー名。
 * これが付いているセッションだけ、現在のパスワード無しでの変更を許す。
 */
export const PW_RECOVERY_COOKIE = "nakama-pw-recovery";

// ── 送信者の資格 ─────────────────────────────

/**
 * 会員が他社へメッセージ・提案・応募を送れる状態か。
 * 非承認（REJECTED）・停止（SUSPENDED）は送信できない。
 * 審査前（DRAFT / PENDING）は従来どおり送信できる（基本利用は無料という方針を変えない）。
 */
export function canSendToOthers(memberStatus: string): boolean {
  return memberStatus !== "REJECTED" && memberStatus !== "SUSPENDED";
}

// ── 認証操作のレート制限 ──────────────────────

export type AuthAttemptKind = "signin_failed" | "password_reset";

// ログイン失敗：同一メール 5回/時・同一IP 20回/時
// パスワード再設定：自前送信（Resend）のため Supabase 側の制限が効かない。同じ上限を課す。
const LIMIT_PER_EMAIL_HOUR = 5;
const LIMIT_PER_IP_HOUR = 20;

/** リクエスト元IP（プロキシ経由のため x-forwarded-for の先頭を使う）。 */
export async function requestIp(): Promise<string | null> {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
}

/** 直近1時間の試行回数が上限に達しているか。 */
export async function isAuthRateLimited(
  kind: AuthAttemptKind,
  params: { email?: string | null; ip?: string | null }
): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const email = params.email?.toLowerCase() || null;
  const [byEmail, byIp] = await Promise.all([
    email
      ? prisma.authAttempt.count({ where: { kind, email, createdAt: { gte: since } } })
      : Promise.resolve(0),
    params.ip
      ? prisma.authAttempt.count({ where: { kind, ip: params.ip, createdAt: { gte: since } } })
      : Promise.resolve(0),
  ]);
  return byEmail >= LIMIT_PER_EMAIL_HOUR || byIp >= LIMIT_PER_IP_HOUR;
}

/** 試行を記録する（記録に失敗しても本処理は止めない）。 */
export async function recordAuthAttempt(
  kind: AuthAttemptKind,
  params: { email?: string | null; ip?: string | null }
): Promise<void> {
  try {
    await prisma.authAttempt.create({
      data: {
        kind,
        email: params.email?.toLowerCase().slice(0, 320) || null,
        ip: params.ip?.slice(0, 60) || null,
      },
    });
  } catch (e) {
    console.error("[security] 認証試行の記録に失敗:", e);
  }
}
