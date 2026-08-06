import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "../_components/ResetPasswordForm";

export default async function ResetPasswordPage() {
  // 再設定リンク経由でセッションが張られている前提。無ければ期限切れ扱い。
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-[16px] font-semibold text-[var(--ink)]">リンクが無効です</h1>
        <p className="rounded-md bg-[var(--red-soft)] px-3 py-2 text-[12px] leading-6 text-[var(--red)]">
          パスワード再設定リンクの有効期限が切れているか、無効です。お手数ですが、もう一度やり直してください。
        </p>
        <Link
          href="/forgot-password"
          className="rounded-md bg-[var(--green)] py-2.5 text-center text-[14px] font-medium text-white hover:bg-[var(--green-d)]"
        >
          パスワード再設定をやり直す
        </Link>
      </div>
    );
  }

  return <ResetPasswordForm />;
}
