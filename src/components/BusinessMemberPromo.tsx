// ビジネス会員の案内（未開封のリードが出る場所に共通で置く。2026-08-12）。
//
// **月額そのものより「1件あたり」で見せる**（ユーザー指示＝2万円のサブスクは身構えられる）。
// 開封1件 1,100円 → 会員なら440円、という比較を先に出し、月額は下に小さく置く。
// ただし**金額を隠さない**（特商法・景表法。単価は「使い切ったとき」の実効単価であることも明記する）。
//
// 3か所で同じ内容を出すため、文言はここ1つに集約する
// （メッセージ一覧／届いた問い合わせの一覧／開封画面）。
import Link from "next/link";
import {
  MEMBER_MONTHLY_CREDITS,
  MEMBER_MONTHLY_FEE,
  MEMBER_MONTHLY_WORTH,
  MEMBER_UNIT_PRICE,
  CREDIT_UNIT_PRICE,
} from "@/lib/billing-core";
import { btn } from "@/lib/ui";

export function BusinessMemberPromo({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`rounded-[10px] border border-[var(--gold)] bg-[var(--amber-bg)] ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <p
        className={`font-bold text-[var(--gold-d)] ${
          compact ? "text-[12px] leading-4" : "text-[15px] leading-6"
        }`}
      >
        開封1件 {CREDIT_UNIT_PRICE.toLocaleString()}円 → 会員なら{MEMBER_UNIT_PRICE}円
      </p>
      <p
        className={`mt-1 text-[var(--ink-2)] ${
          compact ? "text-[11px] leading-4" : "text-[13px] leading-6"
        }`}
      >
        NAKAMAビジネス会員は、全文が読めるクレジットが
        <b>月間{MEMBER_MONTHLY_CREDITS}回</b>まで使えます
        （使い切ると{MEMBER_MONTHLY_WORTH.toLocaleString()}円相当）。
      </p>
      <Link
        href="/billing"
        className={`${btn("amber", "sm")} mt-2 ${compact ? "w-full" : ""}`}
      >
        詳しくはこちら
      </Link>
      <p className={`mt-1.5 text-[var(--muted)] ${compact ? "text-[10px]" : "text-[11px]"}`}>
        月額{MEMBER_MONTHLY_FEE.toLocaleString()}円（税込）・繰越なし・いつでも解約できます
      </p>
    </div>
  );
}
