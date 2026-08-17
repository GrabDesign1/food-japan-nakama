import { COMMON_VALUE_CARDS, COMMON_VALUE_NOTE } from "@/lib/sponsor";

// 協賛企業共通の提供価値（アイコン付き5枚）。
//
// ⚠️ **枠も背景も付けない**（ユーザー指摘 2026-08-18）。囲むと押せるものに見えて
//    クリックを待たせてしまう。UI規約の「押せる＝影＋緑枠／押せない＝フラット」どおり。
// ⚠️ フックを使わないので、サーバーコンポーネント（/sponsor）からもクライアント
//    コンポーネント（申込フォーム）からも使える。片方だけ直して食い違うのを避けるため
//    ここ1か所に置いている。
// ⚠️ 「参加者の同意を得た範囲で」と、継続利用が年間会員特典である注記を落とさないこと。

/** 5枚それぞれのアイコン（線画・塗りつぶさない）。 */
function ValueIcon({ name }: { name: string }) {
  const common = {
    width: 20, height: 20, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const, "aria-hidden": true,
  };
  switch (name) {
    case "awareness": // 認知＝掲示
      return <svg {...common}><path d="M3 11l16-6v14L3 13z" /><path d="M6 12v6" /></svg>;
    case "listing": // NAKAMA掲載＝一覧
      return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9h10M7 13h10M7 17h6" /></svg>;
    case "meet": // 出会い＝人
      return <svg {...common}><circle cx="9" cy="8" r="3" /><circle cx="17" cy="10" r="2.4" /><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5" /></svg>;
    case "deal": // 商談＝握手
      return <svg {...common}><path d="M4 13l4-4 4 4 4-4 4 4" /><path d="M4 13v3a2 2 0 002 2h12a2 2 0 002-2v-3" /></svg>;
    default: // 共創＝重なる円
      return <svg {...common}><circle cx="9" cy="12" r="6" /><circle cx="15" cy="12" r="6" /></svg>;
  }
}

export function CommonValueCards({ headingCls }: { headingCls: string }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className={headingCls}>協賛企業共通の提供価値</h2>
      <div className="grid gap-x-7 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        {COMMON_VALUE_CARDS.map((c) => (
          <div key={c.label} className="flex flex-col gap-1.5">
            <span className="flex items-center gap-2 text-[var(--green-d)]">
              <ValueIcon name={c.icon} />
              <span className="text-[14px] font-bold text-[var(--ink)]">{c.label}</span>
            </span>
            <span className="text-[13px] leading-6 text-[var(--ink-2)]">{c.text}</span>
          </div>
        ))}
      </div>
      <p className="text-[13px] leading-6 text-[var(--muted)]">※ {COMMON_VALUE_NOTE}</p>
    </section>
  );
}
