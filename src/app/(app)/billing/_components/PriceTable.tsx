/**
 * 【料金のまとめ】2026-11-28。
 *
 * 発端＝ユーザー指摘「/billing 価格がわかりにくい」（これが今日いちばん最初の依頼）。
 * 原因は**「何にいくらかかるのか」を一覧で見せていなかった**こと。
 * 残高の長い説明文と、個別契約の大きなカード7枚が中央を占めていて、
 * 肝心の値段が文章に埋もれていた。
 *
 * ⚠️⚠️ **いちばん上の行は必ず「無料」。** 有料を必須に見せない
 *    （2026-08-11 ユーザー指示。基本掲載は無料という建て付けを崩さない）。
 * ⚠️⚠️ **いちばん下の行は「会員同士の取引に手数料はかからない」。**
 *    規約・/pricing・llms.txt と揃えてある。ここだけ食い違うと不信になる。
 * ⚠️ 金額は `lib/billing-core.ts` の定数から出す。**手で書かない**（値上げのときに食い違う）。
 * ⚠️ 掲載オプションの幅は `SEED_PRODUCTS` の実値から計算している。
 */
import {
  CREDIT_UNIT_PRICE,
  MEMBER_MONTHLY_FEE,
  MEMBER_MONTHLY_CREDITS,
  MEMBER_UNIT_PRICE,
  VERIFIED_LEAD_CREDIT_COST,
} from "@/lib/billing-core";
import { h2Cls } from "@/lib/ui";

const yen = (n: number) => `${n.toLocaleString()}円`;

type Row = { what: string; price: string; note?: string; free?: boolean };

export function PriceTable({ optionMin, optionMax }: { optionMin: number; optionMax: number }) {
  const rows: Row[] = [
    {
      what: "登録・掲載・検索・閲覧・問い合わせを送る",
      price: "無料",
      note: "ここにお金はかかりません",
      free: true,
    },
    {
      what: "届いた問い合わせを初めて開く",
      price: `${yen(CREDIT_UNIT_PRICE)}（1クレジット）`,
      note: "開いたあとのやり取りは、何往復でも無料",
    },
    {
      what: "「探している」案件に初めて提案する",
      price: `${yen(CREDIT_UNIT_PRICE)}（1クレジット）`,
      note: `NAKAMA確認済みの案件は ${yen(CREDIT_UNIT_PRICE * VERIFIED_LEAD_CREDIT_COST)}（${VERIFIED_LEAD_CREDIT_COST}クレジット）`,
    },
    {
      what: "掲載オプション（目立たせる・知らせる）",
      price: `${yen(optionMin)} 〜 ${yen(optionMax)}`,
      note: "買うときだけ。使わなければ0円",
    },
    {
      what: "NAKAMAビジネス会員（任意）",
      price: `月 ${yen(MEMBER_MONTHLY_FEE)}`,
      note: `毎月${MEMBER_MONTHLY_CREDITS}クレジット付き＝1件あたり${yen(MEMBER_UNIT_PRICE)}。掲載オプションも20%引き`,
    },
    {
      what: "会員同士の取引の手数料",
      price: "なし",
      note: "売れた金額から差し引くことはしません",
      free: true,
    },
  ];

  return (
    <section className="max-w-[760px]">
      <h2 className={h2Cls}>料金のまとめ</h2>
      <p className="mt-1 text-[12px] leading-5 text-[var(--muted)]">
        すべて税込です。かかるのは「初めての接点」と「目立たせたいとき」だけです。
      </p>
      <div className="mt-2 overflow-hidden rounded-[12px] border border-[var(--line)] bg-white">
        {rows.map((r, i) => (
          <div
            key={r.what}
            // ⚠️ スマホでは縦に積む（2026-11-28・375pxで実測）。
            //    横並びのままだと、項目名が2〜3行に折れて金額と噛み合わず読めない。
            className={`flex flex-col gap-0.5 px-5 py-3.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-4 ${
              i > 0 ? "border-t border-[var(--line-soft)]" : ""
            }`}
          >
            <div className="text-[14px] leading-[21px] text-[var(--ink)] sm:order-1 sm:min-w-0 sm:flex-1">
              {r.what}
            </div>
            <div
              className={`text-[16px] font-bold leading-[26px] sm:order-2 sm:shrink-0 ${
                r.free ? "text-[var(--green-d)]" : "text-[var(--ink)]"
              }`}
            >
              {r.price}
            </div>
            {r.note ? (
              <div className="text-[12px] leading-[17px] text-[var(--muted)] sm:order-3 sm:w-full">
                {r.note}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
