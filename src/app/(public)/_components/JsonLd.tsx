// 構造化データ（JSON-LD）をページに埋め込む。SEO/AIO用。
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://nakama.food-japan-summit.jp";

/** サイト全体: 運営組織とWebサイト */
export const ORG_WEBSITE_JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${APP_URL}/#org`,
      name: "株式会社グラブデザイン",
      url: "https://www.grab-design.com/",
      logo: `${APP_URL}/logo-mark.png`,
      address: {
        "@type": "PostalAddress",
        postalCode: "102-0073",
        addressRegion: "東京都",
        addressLocality: "千代田区",
        streetAddress: "九段北1-2-1",
        addressCountry: "JP",
      },
      contactPoint: {
        "@type": "ContactPoint",
        email: "info@grab-design.com",
        telephone: "+81-3-6825-3901",
        contactType: "customer service",
        availableLanguage: "ja",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${APP_URL}/#website`,
      url: `${APP_URL}/`,
      name: "FOOD JAPAN NAKAMA",
      description:
        "食の出会い・学び・共創をつくる会員制ネットワーク。生産者・食品メーカー・小売・飲食・流通・自治体をつなぐ。",
      publisher: { "@id": `${APP_URL}/#org` },
      inLanguage: "ja",
    },
  ],
};

/** 料金ページ: 月額会員サービスと価格 */
export const MEMBERSHIP_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${APP_URL}/pricing#membership`,
  name: "FOOD JAPAN NAKAMA 月額会員",
  serviceType: "会員制ビジネスマッチング・共創プラットフォーム",
  description:
    "食に関わる事業者向けの月額会員サービス。自社プロフィール・案件（売りたい／買いたい／共創）の掲載、掲載案件の詳細閲覧、会員へのメッセージ、会員向けセミナー参加を含む。",
  provider: { "@id": `${APP_URL}/#org` },
  areaServed: "JP",
  audience: { "@type": "BusinessAudience", name: "食品関連事業者（生産者・メーカー・小売・飲食・流通・自治体等）" },
  offers: {
    "@type": "Offer",
    url: `${APP_URL}/pricing`,
    priceCurrency: "JPY",
    price: "22000",
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: "22000",
      priceCurrency: "JPY",
      unitText: "月",
      valueAddedTaxIncluded: true,
    },
    availability: "https://schema.org/InStock",
  },
};

/** 共創プロデュース */
export const PRODUCE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${APP_URL}/produce#service`,
  name: "共創プロデュース",
  serviceType: "食品事業の企画・実証・事業化の個別支援",
  description:
    "事務局の担当者が介在し、共創相手探し・企画設計・実証・事業化まで伴走する個別支援サービス。最低着手金15万円（税抜）〜＋成功報酬（個別見積）。",
  provider: { "@id": `${APP_URL}/#org` },
  areaServed: "JP",
  url: `${APP_URL}/produce`,
};

/** クラウドファンディング支援 */
export const CROWDFUNDING_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${APP_URL}/crowdfunding#service`,
  name: "クラウドファンディング支援",
  serviceType: "クラウドファンディングを活用したマーケティング・テスト販売の支援",
  description:
    "Makuake等のクラウドファンディングを活用し、販売前に需要・価格・顧客を検証して最初のファンと販売実績をつくるマーケティング支援。企画設計からページ制作、公開中の運用、終了後の販路づくりまで伴走。料金は応援購入総額の35％（Makuake手数料20％＋当社支援手数料15％）。",
  provider: { "@id": `${APP_URL}/#org` },
  areaServed: "JP",
  url: `${APP_URL}/crowdfunding`,
};

/** FAQページ用: Q&A配列から FAQPage を生成（回答は文字列のみ対象） */
export function faqJsonLd(qa: [string, React.ReactNode][]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qa
      .filter((pair): pair is [string, string] => typeof pair[1] === "string")
      .map(([q, a]) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
  };
}
