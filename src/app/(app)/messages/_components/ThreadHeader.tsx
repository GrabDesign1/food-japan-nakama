// 案件ごとのやり取りのヘッダー（対象案件＋進捗ステッパー）。
// クラウドワークスの「相談から契約まで」に相当。どの案件の話か、いまどの段階かを常に見せる（2026-08-11）。
import Link from "next/link";
import { PHASES, activeStep } from "@/lib/deal-constants";
import { formatAmount, formatPrice, formatDeadline, DIRECTION_SHORT } from "@/lib/offering-taxonomy";
import { PhaseStepper } from "./PhaseStepper";

type OfferingHead = {
  id: string;
  direction: string;
  title: string;
  imageUrls: string[];
  priceType: string | null;
  priceAmount: number | null;
  priceUnit: string | null;
  amountValue: number | null;
  amountUnit: string | null;
  amountPeriod: string | null;
  amountText: string | null;
  minOrderText: string | null;
  applicationDeadline: Date | null;
};

export function ThreadHeader({
  offering,
  dealId,
  phase,
  showPhase = true,
}: {
  offering: OfferingHead | null;
  dealId: string | null;
  phase: number;
  /** 進捗ステッパーを出すか（メッセージ一覧側では出さない＝案件ごとの画面で管理する） */
  showPhase?: boolean;
}) {
  if (!offering) {
    // 案件に紐づかない直接の会話
    return (
      <div className="border-b border-[var(--line)] bg-[var(--canvas)] px-6 py-3">
        <p className="text-[12px] text-[var(--muted)]">
          案件に紐づかないお問い合わせです。案件について相談する場合は、案件ページの「提案する」「問い合わせる」からご連絡ください。
        </p>
        {showPhase && dealId ? <PhaseStepper phase={phase} /> : null}
      </div>
    );
  }

  const price = formatPrice(offering);
  const amount = formatAmount(offering);
  const deadline = formatDeadline(offering.applicationDeadline);
  const thumb = offering.imageUrls?.[0];
  const facts = [
    price ? `希望価格：${price}` : null,
    amount ? `数量：${amount}` : null,
    offering.minOrderText ? `最小：${offering.minOrderText}` : null,
    deadline ? `募集期限：${deadline}` : null,
  ].filter((v): v is string => !!v);

  return (
    <div className="border-b border-[var(--line)] bg-[var(--canvas)] px-6 py-3">
      <div className="flex items-start gap-3">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            className="h-12 w-12 shrink-0 rounded-lg border border-[var(--line)] object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-bold text-white ${
                offering.direction === "GIVE" ? "bg-[var(--green)]" : "bg-[var(--amber)]"
              }`}
            >
              {DIRECTION_SHORT[offering.direction] ?? ""}
            </span>
            <span className="text-[11px] text-[var(--muted)]">この案件についてのやり取り</span>
          </div>
          <Link
            href={`/ledger/${offering.id}`}
            className="mt-0.5 block truncate text-[14px] font-bold text-[var(--ink)] hover:text-[var(--green-d)] hover:underline"
          >
            {offering.title || "（無題）"}
          </Link>
          {facts.length ? (
            <div className="mt-0.5 truncate text-[11px] text-[var(--muted)]">{facts.join("　/　")}</div>
          ) : null}
        </div>
        <Link
          href={`/ledger/${offering.id}`}
          className="shrink-0 text-[11px] text-[var(--green-d)] underline"
        >
          案件を見る →
        </Link>
      </div>

      {showPhase && dealId ? (
        <div className="mt-3">
          <PhaseStepper phase={phase} />
          <p className="mt-1 text-[10px] text-[var(--muted)]">
            次にやること：{PHASES[activeStep(phase)] ?? PHASES[0]}／段階は操作に応じて自動で進みます
          </p>
        </div>
      ) : null}
    </div>
  );
}
