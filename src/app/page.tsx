import { redirect } from "next/navigation";

// トップは /dashboard へ。未ログインなら middleware が /login に誘導する。
export default function Home() {
  redirect("/dashboard");
}
