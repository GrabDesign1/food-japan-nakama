// 名刺を取り込む（2026-11-21）。
//
// ⚠️⚠️ 扱うのは**他人の個人情報**。保存先 ContactCard は持ち主しか読めない。
//    プライバシーポリシーへの記載は 2026-11-21 に追記済み（legal.ts の PRIVACY_TEXT）。
//    （cards.ts の但し書きも参照）
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { defaultMetAt } from "@/lib/card-summit";
import { AI_ENABLED } from "@/lib/ai";
import { eyebrowCls, h1Cls } from "@/lib/ui";
import { ScanForm } from "./ScanForm";
import { CleanupButton } from "./CleanupButton";

export const metadata = { title: "名刺を取り込む" };

export default async function ScanPage() {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  await getOrCreateMemberForUser(su);

  return (
    <div className="mx-auto max-w-[680px] px-4 py-8">
      <div className={eyebrowCls}>CARD</div>
      <h1 className={`${h1Cls} mt-1`}>名刺を取り込む</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink-2)]">
        いただいた紙の名刺を撮ると、お名前・会社・連絡先を読み取ります。
        {AI_ENABLED ? "" : "（いまは読み取りが使えないため、手で入力してください。）"}
      </p>

      <div className="mt-4 rounded-[10px] border border-[var(--amber-line)] bg-[var(--amber-bg)] px-4 py-3">
        <p className="text-[13px] leading-6 text-[var(--amber-ink)]">
          取り込んだ名刺は<strong className="font-bold">あなたにしか見えません</strong>。
          ほかの会員にも、名刺の方にも表示されません。いつでも1枚ずつ削除できます。
          読み取りには外部のAIを使います。
        </p>
      </div>

      <div className="mt-6">
        <ScanForm defaultMetAt={defaultMetAt()} />
      </div>

      {/* ⚠️ 読み取っただけで保存しなかった写真は残る。自分で片づけられるようにしておく
             （事務局に頼まないと消せない、にしない） */}
      <div className="mt-6">
        <CleanupButton />
      </div>

      <p className="mt-8 text-center">
        <Link href="/cards" className="text-[13px] text-[var(--green-d)] underline">
          交換カードへ戻る
        </Link>
      </p>
    </div>
  );
}
