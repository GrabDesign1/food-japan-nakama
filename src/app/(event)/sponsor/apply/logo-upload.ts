"use server";

// 協賛ロゴの直アップロード（2026-08-18）。
//
// ⚠️ **なぜ Server Action にファイルを渡さないのか**
//    Vercel の関数はリクエストボディが 4.5MB を超えると 413 を返す。これはプラットフォーム側の
//    制限で、next.config.ts の serverActions.bodySizeLimit を上げても回避できない。
//    そこで「アップロード用の署名付きURLだけ」をここで発行し、**ファイル本体はブラウザから
//    Supabase Storage へ直接**送る。関数を通らないので 20MB でも通る。
//
// ⚠️ **未認証で叩ける**アクション（協賛フォームはログイン不要）。総当たりで置かれても
//    被害が広がらないよう、
//      ・バケット sponsor-logos は**非公開**（公開URLを持たない）
//      ・バケット側に 20MB / MIME の制限を設定済み
//      ・パスはこちらが決める（UUID）。クライアントの申告は拡張子だけ使う
//    にしてある。ここでクライアントの文字列をパスに混ぜないこと。

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { LOGO_BUCKET, LOGO_MAX_BYTES } from "@/lib/sponsor";

export type LogoUploadTicket =
  | { ok: true; path: string; token: string; url: string }
  | { ok: false; error: string };

const EXT = /\.(ai|pdf|eps)$/i;

export async function createLogoUploadTicket(
  fileName: string,
  size: number
): Promise<LogoUploadTicket> {
  const m = EXT.exec(fileName || "");
  if (!m) {
    return { ok: false, error: "Illustrator（.ai）・PDF・EPS のいずれかを選択してください。" };
  }
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, error: "ファイルを読み取れませんでした。選び直してください。" };
  }
  if (size > LOGO_MAX_BYTES) {
    const mb = Math.round(LOGO_MAX_BYTES / 1024 / 1024);
    return { ok: false, error: `ファイルが大きすぎます（${mb}MBまで）。` };
  }

  // パスはサーバーで決める（クライアントの文字列は拡張子しか使わない）。
  const now = new Date();
  const ym = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const path = `${ym}/${crypto.randomUUID()}${m[0].toLowerCase()}`;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(LOGO_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[sponsor] ロゴのアップロードURL発行に失敗:", error);
    return { ok: false, error: "アップロードの準備に失敗しました。時間をおいてお試しください。" };
  }
  return { ok: true, path: data.path, token: data.token, url: data.signedUrl };
}
