// 宮崎2026 特設ページ（公開側）。2026-11-26
//
// ⚠️⚠️ **出るのは、事務局が「公開ページに出す」を押したものだけ**（featured）。
//    会員が共有しただけのものは、ここには1件も出ない。会場の写真には人の顔が写るため。
// ⚠️ 写真とリンク画像は /api/summit-media から配る（外部URLを直接出さない・公開URLも作らない）。
import type { Metadata } from "next";
import Link from "next/link";
import { listShares, countShares, SUMMIT_EVENT_NAME } from "@/lib/summit-share";
import { ShareCard } from "../../../(app)/summit/share/_components/ShareCard";
import { btn } from "@/lib/ui";

export const metadata: Metadata = {
  title: "FOOD JAPAN SUMMIT 2026 in MIYAZAKI｜当日の記録",
  description:
    "FOOD JAPAN SUMMIT 2026 in MIYAZAKI の当日の様子を、参加した方々の写真・動画・記事でご紹介します。",
};

export const revalidate = 300;

export default async function PublicSummitMiyazakiPage() {
  const [shares, total] = await Promise.all([
    listShares({ onlyFeatured: true, take: 60 }),
    countShares(true),
  ]);

  return (
    <div className="mx-auto max-w-[900px] px-4 py-12">
      <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--muted)]">
        FOOD JAPAN SUMMIT 2026 in MIYAZAKI
      </p>
      <h1 className="mt-2 font-serif text-[28px] leading-tight text-[var(--ink)] sm:text-[36px]">
        宮崎に、食のつくり手と届け手が集まりました。
      </h1>
      <p className="mt-4 max-w-[46em] text-[15px] leading-8 text-[var(--ink-2)]">
        {SUMMIT_EVENT_NAME} の当日の様子を、参加した方々が持ち寄った写真・動画・記事でご紹介します。
        ここで生まれた出会いは、
        <Link href="/" className="underline underline-offset-2 hover:no-underline">FOOD JAPAN NAKAMA</Link>
        で続いています。
      </p>

      {shares.length === 0 ? (
        <div className="mt-10 rounded-[12px] border border-[var(--line)] bg-white px-6 py-12 text-center">
          <p className="text-[15px] font-bold text-[var(--ink)]">ただいま準備中です。</p>
          <p className="mx-auto mt-2 max-w-[32em] text-[13px] leading-7 text-[var(--ink-2)]">
            参加された方から届いた写真・動画・記事を、順に掲載していきます。
          </p>
        </div>
      ) : (
        <>
          <div className="mt-10 columns-1 gap-5 sm:columns-2 [&>*]:mb-5 [&>*]:break-inside-avoid">
            {shares.map((s) => (
              <ShareCard key={s.id} s={s} linkAuthor={false} />
            ))}
          </div>
          {total > shares.length ? (
            <p className="mt-6 text-center text-[12px] text-[var(--muted)]">
              ほかにも {total - shares.length}件 あります。
            </p>
          ) : null}
        </>
      )}

      <div className="mt-14 rounded-[12px] border border-[var(--green)] bg-[var(--green-soft)] px-6 py-9 text-center">
        <p className="text-[17px] font-bold leading-9 text-[var(--ink)]">
          当日お会いした方と、そのあとも続けませんか。
        </p>
        <p className="mx-auto mt-2 max-w-[36em] text-[13px] leading-7 text-[var(--ink-2)]">
          写真・動画・記事の持ち寄りは、参加された方（会員）のページから行えます。
        </p>
        <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/summit/share" className={`${btn("primary", "lg")} w-full max-w-[320px] sm:w-auto`}>
            写真・動画・記事を共有する
          </Link>
          <Link href="/signup" className={`${btn("secondary", "lg")} w-full max-w-[320px] sm:w-auto`}>
            無料で登録する
          </Link>
        </div>
      </div>
    </div>
  );
}
