// アカウント停止中の案内ページ。getSessionUser を呼ばないこと（リダイレクトループ防止）。
import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "../../(auth)/actions";
import { btn } from "@/lib/ui";

export const metadata: Metadata = {
  title: "アカウント停止中｜FOOD JAPAN NAKAMA",
  robots: { index: false, follow: false },
};

export default function SuspendedPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-[520px] flex-col items-center justify-center gap-5 px-5 text-center">
      <h1 className="font-serif text-[22px] text-[var(--ink)]">アカウントは現在停止中です</h1>
      <p className="text-[14px] leading-7 text-[var(--ink-2)]">
        このアカウントは事務局によって利用を停止されています（利用規約第18条）。
        お心当たりがない場合や再開のご相談は、事務局（info@grab-design.com）までご連絡ください。
      </p>
      <div className="flex items-center gap-3">
        <form action={signOut}>
          <button className={btn("secondary", "sm")}>サインアウト</button>
        </form>
        <Link href="/" className="text-[13px] text-[var(--green-d)] underline">トップページへ</Link>
      </div>
    </div>
  );
}
