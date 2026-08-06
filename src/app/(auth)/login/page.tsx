import { AuthForm } from "../_components/AuthForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; reset?: string }>;
}) {
  const { next, error, reset } = await searchParams;
  const notice =
    error === "confirm"
      ? "確認リンクが無効か、期限切れの可能性があります。もう一度お試しください。"
      : error === "oauth"
        ? "Googleログインに失敗しました。もう一度お試しください。"
        : undefined;
  const success =
    reset === "done"
      ? "パスワードを更新しました。新しいパスワードでログインしてください。"
      : undefined;
  return <AuthForm mode="login" next={next} notice={notice} success={success} />;
}
