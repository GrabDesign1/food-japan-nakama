import Link from "next/link";
import type { Metadata } from "next";
import { SponsorForm } from "./SponsorForm";
import {
  SUMMIT_TITLE, HOST, HERO_CHIPS, yen, MIN_PLAN_PRICE,
  isApplicationClosed, APPLICATION_CLOSED_TITLE, APPLICATION_CLOSED_BODY,
} from "@/lib/sponsor";

// Food Japan Summit 2026 in MIYAZAKI の協賛申込フォーム。
// ⚠️ NAKAMA の機能ではない。**NAKAMA からリンクは張らず**、URLを直接案内して使う
//    （ユーザー指示 2026-08-17）。sitemap・llms.txt にも入れていない。
// ⚠️ 検索に出さない（noindex）。公開したくなったら robots を外して sitemap に追加する。
// ⚠️ 金額はすべて税別（NAKAMA本体は税込なので取り違えないこと）。

export const metadata: Metadata = {
  title: "協賛申込フォーム｜Food Japan Summit 2026",
  description:
    "Food Japan Summit 2026（宮崎開催・名古屋開催）への協賛をご検討・お申し込みいただくためのフォームです。",
  robots: { index: false, follow: false },
};

// ⚠️ 来場予定300名・参加企業50社などの数字ブロックと「協賛企業の皆さまと、イベント当日だけで
//    終わらない共創事業をつくっていきます。」の一文は、ユーザー指示で削除した（2026-08-17）。
//    戻す場合は募集資料PDF p.2 の数字を参照。
//
// ⚠️ ファーストビューは**開催選択に届く長さまで詰める**（2026-08-18 の指示書2）。
//    以前はここに「開催情報の一覧」と「協賛企業共通の提供価値」を置いていて、
//    スマホで1画面目が全部読み物になり、開催を選ぶまで1,352px スクロールが必要だった。
//    ・開催の日程・会場 → フォーム STEP1 の開催カードの中へ
//    ・協賛企業共通の提供価値 → フォーム STEP1（開催選択の下）へカード5枚で移動
//    削除ではなく移動なので、内容は落ちていない。

// ⚠️ **静的生成にしない**（2026-08-18）。募集の締め切りを日付で判定するので、
//    静的に焼くとビルド時点の状態のまま固定されてしまう。サーバーの時計で毎回判定する。
//    このページは noindex の申込フォームでアクセスも多くないため、動的で問題ない。
export const dynamic = "force-dynamic";

export default function SponsorPage() {
  // 募集が終了していたら、リード文も情報チップも相談リンクも出さない
  // （フォームだけ隠すと「お選びいただけます」「相談して決めたい」が残って矛盾する）。
  const closed = isApplicationClosed();

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col px-4 py-10">
      {/* このページ専用のヘッダー（NAKAMAのナビは出さない） */}
      <Link href="/sponsor" className="text-[13px] text-[var(--green-d)] underline">
        ← 協賛のご案内に戻る
      </Link>

      <header className="mt-5 flex flex-col gap-1">
        <p className="text-[12px] font-bold tracking-[0.18em] text-[var(--green-d)]">
          FOOD JAPAN SUMMIT 2026
        </p>
        <h1 className="font-serif text-[26px] leading-tight text-[var(--ink)] sm:text-[32px]">
          協賛申込フォーム
        </h1>
      </header>

      {closed ? (
        <div className="mt-6 rounded-[10px] border border-[var(--line)] bg-white p-8">
          <h2 className="text-[18px] font-bold text-[var(--ink)]">{APPLICATION_CLOSED_TITLE}</h2>
          <p className="mt-3 text-[15px] leading-8 text-[var(--ink-2)]">{APPLICATION_CLOSED_BODY}</p>
          <p className="mt-4 text-[13px] leading-7 text-[var(--muted)]">
            {HOST}
            <br />
            info@grab-design.com／03-6825-3901
          </p>
        </div>
      ) : (
        <>
      <p className="mt-3.5 text-[15px] leading-7 text-[var(--ink-2)]">
        {SUMMIT_TITLE} への協賛をお申し込みいただくフォームです。協賛プランは{yen(MIN_PLAN_PRICE)}から。
        宮崎開催・名古屋開催・両開催からお選びいただけます。
        <br />
        プランや金額がまだ決まっていない場合も、そのまま「内容を相談して決めたい」を選んでお進みください。
      </p>

      {/* 情報チップ（読み物にせず、3点だけを一目で）。
          ⚠️ **一つずつ枠で囲まない**（ユーザー指摘 2026-08-18）。囲むと押せるものに見えて
             クリックを待たせてしまう。押せないので上下の罫線だけで一帯にまとめる
             （この形はページ内の開催情報の並びでも使っている書式）。 */}
      <ul className="mt-4 flex flex-col gap-3 border-y border-[var(--line)] py-4 sm:flex-row sm:gap-0">
        {HERO_CHIPS.map((c, i) => (
          <li
            key={c.head}
            className={`sm:flex-1 ${i > 0 ? "sm:border-l sm:border-[var(--line)] sm:pl-5" : ""} ${
              i < HERO_CHIPS.length - 1 ? "sm:pr-5" : ""
            }`}
          >
            <span className="block text-[15px] font-bold text-[var(--ink)]">{c.head}</span>
            <span className="mt-0.5 block text-[12px] text-[var(--muted)]">{c.body}</span>
          </li>
        ))}
      </ul>

      {/* 相談導線はページ上部にも置く（申込だけに絞らない・指示書18） */}
      <p className="mt-3 text-[13px] leading-6 text-[var(--muted)]">
        まず相談したい場合は{" "}
        <Link href="/sponsor/contact" className="font-bold text-[var(--green-d)] underline">
          プランを相談して決めたい
        </Link>
      </p>

      <div className="mt-6">
        <SponsorForm />
      </div>
        </>
      )}

      <footer className="mt-12 border-t border-[var(--line)] pt-5 text-[13px] leading-7 text-[var(--muted)]">
        {HOST}
        <br />
        〒102-0073 東京都千代田区九段北1-2-1／info@grab-design.com／03-6825-3901
      </footer>
    </div>
  );
}
