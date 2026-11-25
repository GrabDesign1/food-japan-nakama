// ⚠️ 試作用の一時ページ（2026-11-26 ユーザー指示「ログイン後のサイトのデザインは
//    名古屋サイトにトーン＆マナーを合わせて」→「まずホーム1画面で試作」）。
// ⚠️⚠️ **共通CSS（globals.css / lib/ui.ts）には触っていない。** ここだけで色・形を直書きしている。
//    採用が決まってから、共通側へ移す。採用しなければこのページを消すだけで元通り。
// ⚠️ 中身は作り物のデータ。/preview はログイン不要で見えるので、実在の会員は出さない。

import type { Metadata } from "next";

// ⚠️ 試作なので検索に出さない（/preview は誰でも開ける）
export const metadata: Metadata = {
  title: "（試作）名古屋トーンのホーム",
  robots: { index: false, follow: false },
};

const INK = "#111111";
const INK2 = "#454545";
const LINE = "#e2e4e6";
const RED = "#ff3131";
const MUTED = "#78828f";

const pill =
  "inline-flex min-h-12 items-center justify-center rounded-full px-8 text-[15px] font-semibold transition-opacity hover:opacity-80";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold tracking-[0.2em]" style={{ color: MUTED }}>
      {children}
    </p>
  );
}

function Avatar({ size = 40 }: { size?: number }) {
  return (
    <div
      className="shrink-0 overflow-hidden rounded-full bg-[#eeeeee]"
      style={{ width: size, height: size }}
    />
  );
}

/** 「売りたい」「探している」の見出しラベル（名古屋は塗り or 枠線のミニマルな札） */
function Tag({ want }: { want?: boolean }) {
  return want ? (
    <span
      className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold"
      style={{ borderColor: INK, color: INK }}
    >
      探している
    </span>
  ) : (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold text-white"
      style={{ background: INK }}
    >
      売りたい
    </span>
  );
}

export default function PreviewHomeNagoya() {
  return (
    <div className="min-h-screen bg-white" style={{ color: INK }}>
      {/* 黒帯（名古屋サイトの上部。会員画面では既存の黒いサイドバーが同じ役目） */}
      <div className="flex h-[46px] items-center justify-between px-6" style={{ background: INK }}>
        <span className="text-[13px] font-semibold tracking-[0.18em] text-white">
          FOOD JAPAN NAKAMA
        </span>
        <span className="text-[12px] tracking-[0.1em] text-white/70">MY PAGE</span>
      </div>

      <div className="mx-auto max-w-[1120px] px-6 py-12">
        {/* ── 自分の登録情報 ── */}
        <div className="flex flex-wrap items-start gap-x-8 gap-y-5">
          <div className="h-[96px] w-[96px] shrink-0 overflow-hidden rounded-full bg-[#eeeeee]" />
          <div className="min-w-[240px] flex-1">
            <Eyebrow>FOOD JAPAN SUMMIT 2026 in MIYAZAKI ／ ご登壇</Eyebrow>
            <h1 className="mt-2 text-[31px] font-semibold leading-[1.35] tracking-[0.01em]">
              見本 太郎
            </h1>
            <p className="mt-1.5 text-[14px]" style={{ color: INK2 }}>
              株式会社サンプル食品　代表取締役
            </p>
            <p className="mt-4 max-w-[46em] text-[15px] leading-[1.9]" style={{ color: INK2 }}>
              宮崎で養鶏と加工をしています。サミットでは「もったいないを価値に変える」の回に登壇しました。
              端材を使った商品づくりの相談、いつでもどうぞ。
            </p>
          </div>
          <div className="flex gap-3">
            <a className={`${pill} text-white`} style={{ background: RED }} href="#">
              案件を登録する
            </a>
            <a className={`${pill} border`} style={{ borderColor: INK, color: INK }} href="#">
              プロフィールを編集
            </a>
          </div>
        </div>

        {/* ── 仲間の動き ── */}
        <div className="mt-16">
          <div className="flex items-end justify-between border-b pb-4" style={{ borderColor: INK }}>
            <div>
              <Eyebrow>TIMELINE</Eyebrow>
              <h2 className="mt-1.5 text-[20px] font-semibold tracking-[0.02em]">仲間の動き</h2>
            </div>
            <a className="text-[13px] font-semibold" style={{ color: "#b8272d" }} href="#">
              すべて見る →
            </a>
          </div>

          <ul className="divide-y" style={{ borderColor: LINE }}>
            {/* 投稿 */}
            <li className="flex gap-5 py-8">
              <Avatar size={48} />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold">津曲 晋作</p>
                <p className="mt-0.5 text-[12px]" style={{ color: MUTED }}>
                  福山黒酢株式会社　／　3時間前
                </p>
                <p className="mt-3 max-w-[46em] text-[15px] leading-[1.9]" style={{ color: INK2 }}>
                  壺畑の仕込みが終わりました。今年は例年より1週間早い立ち上がりです。
                  見学はいつでも受け付けていますので、鹿児島に来られる方はぜひ。
                </p>
                <div className="mt-4 h-[220px] w-full max-w-[520px] rounded-[4px] bg-[#eeeeee]" />
                <div className="mt-4 flex gap-6 text-[13px]" style={{ color: MUTED }}>
                  <span>いいね 12</span>
                  <span>コメント 3</span>
                </div>
              </div>
            </li>

            {/* 案件（売りたい） */}
            <li className="py-8">
              <div className="flex flex-wrap items-center gap-3">
                <Tag />
                <span className="text-[12px]" style={{ color: MUTED }}>
                  株式会社サンプル食品　／　宮崎県　／　1日前
                </span>
              </div>
              <h3 className="mt-3 text-[19px] font-semibold leading-[1.6]">
                朝採りリーフレタス（週50ケースから）
              </h3>
              <p className="mt-2 max-w-[46em] text-[14px] leading-[1.9]" style={{ color: INK2 }}>
                露地2haで栽培しています。朝採り当日出荷、定期の出荷が可能です。
              </p>
              <a
                className="mt-5 inline-flex min-h-11 items-center rounded-full border px-7 text-[14px] font-semibold"
                style={{ borderColor: INK, color: INK }}
                href="#"
              >
                くわしく見る
              </a>
            </li>

            {/* 案件（探している） */}
            <li className="py-8">
              <div className="flex flex-wrap items-center gap-3">
                <Tag want />
                <span className="text-[12px]" style={{ color: MUTED }}>
                  株式会社ベイシア　／　群馬県　／　2日前
                </span>
              </div>
              <h3 className="mt-3 text-[19px] font-semibold leading-[1.6]">
                宮崎県産の柑橘を探しています
              </h3>
              <p className="mt-2 max-w-[46em] text-[14px] leading-[1.9]" style={{ color: INK2 }}>
                春の棚づくりに向けて、量がまとまる産地を探しています。小ロットからの相談も可能です。
              </p>
              <a
                className="mt-5 inline-flex min-h-11 items-center rounded-full border px-7 text-[14px] font-semibold"
                style={{ borderColor: INK, color: INK }}
                href="#"
              >
                くわしく見る
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
