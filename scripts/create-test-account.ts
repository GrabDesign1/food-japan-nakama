// 動作確認用アカウントを用意する（2026-11-26 ユーザー指示「テスト用アカウントを作って」）。
//
// なぜ必要か:
//   ログイン後の画面は、これまでユーザー本人の目でしか確認できなかった。
//   そのせいで「作ったのに導線が無い」「崩れている」を本番で見つけることが続いた。
//
// ⚠️⚠️ **パスワードは作らない。** 1回きりのログインリンク（token_hash）を発行して入る。
//    合言葉を持たない＝漏れない。リンクは短時間で切れる。
// ⚠️ 作る会員は **status=DRAFT / listed=false**。他の会員の一覧にも、公開ページにも出ない。
// ⚠️ 使い終わったら scripts/delete-test-account.ts で消す。
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

export const TEST_EMAIL = "nakama-test@grab-design.com";

async function main() {
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";

  // すでに居れば作らない
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  let user = list?.users.find((u) => u.email === TEST_EMAIL);

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      email_confirm: true, // 確認メールは送らない（届かなくてよい）
      user_metadata: { is_test: true, note: "動作確認用。パスワードなし" },
    });
    if (error) throw new Error(`作成に失敗: ${error.message}`);
    user = data.user;
    console.log("作りました:", TEST_EMAIL);
  } else {
    console.log("すでにあります:", TEST_EMAIL);
  }

  // 1回きりのログインリンク
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: TEST_EMAIL,
  });
  if (linkErr || !link?.properties?.hashed_token) {
    throw new Error(`ログインリンクを作れませんでした: ${linkErr?.message}`);
  }
  const url = `${base}/auth/confirm?token_hash=${link.properties.hashed_token}&type=magiclink&next=/dashboard`;
  console.log("\nログインリンク（1回だけ使えます）:\n" + url);
  console.log("\n⚠️ このリンクは合言葉と同じ重さ。人に渡さないこと。");
}
main().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1); });
