import Link from "next/link";
import { HeroMobileMenu } from "./HeroMobileMenu";

// 公開ゾーン下層ページのヘッダー。トップページのヒーロー内蔵ヘッダーと同一構成（fjn-*スタイルを共用）。
export function PublicTopBar() {
  return (
    <div className="fjn-headerbar">
      <header className="fjn-hero__header">
        <HeroMobileMenu />
        <Link className="fjn-brand" href="/" aria-label="FOOD JAPAN NAKAMA トップへ">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="fjn-brand__mark" src="/logo-mark.png" alt="" width={88} height={88} />
          <span>
            <span className="fjn-brand__name">FOOD JAPAN NAKAMA</span>
            <span className="fjn-brand__sub">FOOD JAPAN SUMMIT</span>
          </span>
        </Link>
        <nav className="fjn-nav" aria-label="メインナビゲーション">
          <Link href="/#buyer-listings">探している案件を見る</Link>
          <Link href="/about">NAKAMAとは</Link>
          <Link href="/hanro">販路開拓支援</Link>
          <Link href="/produce">共創プロデュース</Link>
          <Link href="/food-loss">食品ロス支援</Link>
          <Link href="/crowdfunding">クラウドファンディング支援</Link>
          <Link className="fjn-nav__login" href="/login">
            ログイン
          </Link>
        </nav>
      </header>
    </div>
  );
}
