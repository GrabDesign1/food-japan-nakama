import Link from "next/link";
import { JsonLd, ORG_WEBSITE_JSONLD } from "./_components/JsonLd";
import { btn } from "@/lib/ui";

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="text-[11px] font-bold tracking-[0.08em] text-[var(--ink)]">{title}</div>
      <ul className="mt-2 flex flex-col gap-1.5">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="text-[12px] text-[var(--ink-2)] hover:text-[var(--green-d)] hover:underline">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// 公開ゾーン（未ログイン向け）の共通レイアウト。
// ヘッダーはページ側で用意する（トップはヒーロー内蔵ヘッダー、下層は PublicTopBar）。
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <JsonLd data={ORG_WEBSITE_JSONLD} />
      {/* キーボードでヘッダーを飛ばして本文へ（普段は見えない） */}
      <a href="#main" className="skip-link">
        本文へスキップ
      </a>
      <main id="main" className="flex-1">{children}</main>

      {/* フッター */}
      <footer className="mt-16 border-t border-[var(--line)] bg-[var(--green-soft)]">
        <div className="mx-auto grid max-w-[1100px] grid-cols-2 gap-6 px-4 py-10 text-[12px] text-[var(--ink-2)] sm:grid-cols-3 lg:grid-cols-5">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-mark.png" alt="FOOD JAPAN SUMMIT ロゴ" width={36} height={36} />
              <div>
                <div className="font-serif text-[15px] text-[var(--ink)]">FOOD JAPAN NAKAMA</div>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">by FOOD JAPAN SUMMIT</p>
              </div>
            </div>
          </div>
          <FooterCol title="NAKAMA" links={[
            ["NAKAMAとは", "/about"],
            ["実績", "/cases"],
            ["学び・セミナー", "/learn"],
            ["利用の流れ", "/flow"],
            ["利用料金・共創支援", "/pricing"],
            ["よくある質問", "/faq"],
          ]} />
          <FooterCol title="個別支援" links={[
            ["販路開拓支援", "/hanro"],
            ["共創プロデュース", "/produce"],
            ["食品ロス支援", "/food-loss"],
            ["クラウドファンディング支援", "/crowdfunding"],
            ["個別相談", "/consultation"],
          ]} />
          <FooterCol title="会社" links={[
            ["運営会社", "/company"],
            ["お問い合わせ", "/contact"],
          ]} />
          <FooterCol title="規約・法務" links={[
            ["利用規約", "/terms"],
            ["プライバシーポリシー", "/privacy"],
            ["特定商取引法に基づく表記", "/tokushoho"],
          ]} />
        </div>
        <div className="border-t border-white/60">
          <div className="mx-auto flex max-w-[1100px] flex-col gap-2 px-4 py-4 text-[11px] text-[var(--muted)] sm:flex-row sm:items-center">
            <span>© FOOD JAPAN SUMMIT実行委員会</span>
            {/* Food Japan Summit の協賛募集への導線（2026-08-19・ユーザー指示）。
                ⚠️ **サイト内から /sponsor へ張る唯一のリンク**＝検索エンジンがこのページを見つける入口。
                   Search Console に「URL が Google に認識されていません」と出たため、
                   サイトマップだけでなくリンクからも辿れるようにした。外すと発見経路がサイトマップだけに戻る。
                ⚠️ NAKAMA本体の機能ではないので、ナビ（上の5列）には入れずここに小さく置く。 */}
            <Link
              href="/sponsor"
              className="hover:text-[var(--green-d)] hover:underline"
            >
              Food Japan Summit 2026 協賛募集・協賛スポンサー募集
            </Link>
            <span className="sm:ml-auto flex items-center gap-4">
              <Link href="/login" className="hover:underline">ログイン</Link>
              <Link href="/signup" className={btn("primary", "sm")}>無料で登録する</Link>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
