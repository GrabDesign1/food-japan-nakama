import { AuthForm } from "../_components/AuthForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const notice =
    error === "confirm"
      ? "確認リンクが無効か、期限切れの可能性があります。もう一度お試しください。"
      : undefined;
  return <AuthForm mode="login" next={next} notice={notice} />;
}
