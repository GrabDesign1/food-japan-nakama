import Link from "next/link";

/**
 * フリープラン向け：メッセージ（興味送信）は「共創コミュニティ」プランの機能のため、
 * 送信フォームの代わりに表示するアップグレード案内。押すとプラン・お支払いページへ。
 */
export function UpgradeToMessage({ targetName }: { targetName?: string }) {
  return (
    <div className="rounded-[10px] border border-[#B77F0B] bg-[#FAF0D6] p-5">
      <div className="mb-1 flex items-center gap-2 text-[14px] font-semibold text-[var(--ink)]">
        <span>🔒</span>
        メッセージの送信は「共創コミュニティ」プランの機能です
      </div>
      <p className="mb-3 text-[12px] leading-6 text-[var(--ink-2)]">
        フリープランでは{targetName ? `${targetName}への` : "相手への"}メッセージ送信（興味送信）はご利用いただけません。
        アップグレードすると、生産者・事業者へ直接メッセージを送って商談を始められます。
      </p>
      <Link
        href="/billing"
        className="inline-block rounded-md bg-[var(--green)] px-5 py-2 text-[13px] font-bold text-white hover:bg-[var(--green-d)]"
      >
        アップグレードする
      </Link>
    </div>
  );
}
