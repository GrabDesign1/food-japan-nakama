/**
 * Food Japan Summit の公式サイト。
 * 「Summitのネットワークへ先行して紹介されます」という表示の裏付けとしてここへ誘導する。
 * ヒーローのタグ・トップの掲載導線・/listings の空状態で共用するので、URLはここだけに書く。
 */
export const FJS_URL = "https://food.kanpai-lab.com/";

// 事務局へ依頼するサービスメニュー（正式サービス。自動決済はせず、相談→見積→個別契約）。
// トップ・/pricing・/billing・/sales-channel で同じ内容を出すため、ここを唯一の定義とする。
// 並びは「まず何をすればいいか」から「事業そのものを作る」までの順（入口商品→継続支援→事業づくり）。
export type ServiceItem = {
  /** 相談フォームの service 値（/consultation?type=service&service=... と一致させる） */
  type: string;
  name: string;
  /** いま困っていること（この行を選ぶ理由） */
  problem: string;
  /** やること・納品物 */
  deliverable: string;
  /** 期間の目安 */
  period: string;
  /** 費用（税込の提案値） */
  price: string;
  /** 詳細ページがある場合のリンク先 */
  href?: string;
};

export const SERVICE_MENU: ServiceItem[] = [
  {
    type: "strategy_session",
    name: "商品・販路戦略セッション",
    problem: "何から手をつければよいか分からない",
    deliverable: "90分のオンラインセッション、商品・販路戦略シート、90日間のアクションプラン",
    period: "単発",
    price: "110,000円〜",
    href: "/hanro#strategy-session",
  },
  {
    type: "channel_trial",
    name: "販路開拓トライアル",
    problem: "販売先そのものが見つからない",
    deliverable: "候補企業の調査・選定、候補先への打診、面談調整、活動報告",
    period: "1商品・30日間程度",
    price: "440,000円〜",
    href: "/hanro#channel-trial",
  },
  {
    type: "promotion_plan",
    name: "販促プラン",
    problem: "知ってもらえない",
    deliverable: "SNS掲載、クーポン配信、月次のアクセスレポート",
    period: "月ごと",
    price: "月額33,000円",
  },
  {
    type: "sales_growth",
    name: "販売強化プラン",
    problem: "露出はあるが売れない",
    deliverable: "特集制作、広告運用、販売企画、月1回の改善会議",
    period: "月ごと",
    price: "月額110,000円＋広告費",
  },
  {
    type: "solution_build",
    name: "売れる仕組み構築",
    problem: "売るための道具がない",
    deliverable: "LP、動画、クラウドファンディング、EC、キャンペーンの制作",
    period: "相談して決める",
    price: "50万円〜",
  },
  {
    type: "success_fee",
    name: "販売成果報酬",
    problem: "初期費用を出せない",
    deliverable: "初期費用なしで実施し、成立した売上から精算",
    period: "契約による",
    price: "売上の10〜20％",
  },
  {
    type: "co_creation",
    name: "共創・商品開発",
    problem: "商品・事業そのものから作りたい",
    deliverable: "相手探し、試作、販路、事業化まで伴走",
    period: "相談して決める",
    price: "200万円〜",
  },
];

/** 相談フォームへの導線（?type=service&service=... ） */
export function consultationHref(type: string): string {
  return `/consultation?type=service&service=${type}`;
}
