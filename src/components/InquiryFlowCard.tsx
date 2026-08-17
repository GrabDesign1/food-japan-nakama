import {
  isLeadChargingActive,
  LEAD_UNLOCK_START_LABEL,
  LEAD_UNOPENED_NOTICE_DAYS,
} from "@/lib/lead-unlock-core";

// 案件詳細に固定表示する「連絡してから商談までの流れ」。
//
// ⚠️ 現行の実装どおりに書くこと。**相手の承認を待つ仕組みは無い**（送れば相手のスレッドに届く）。
// ⚠️ 立場で流れが逆になる：
//    GIVE（売りたい案件）＝買い手が問い合わせを送り、掲載者（売り手）が開封して読む（開封が有料）
//    WANT（探している案件）＝売り手が提案を送る（送信が有料）、掲載者（買い手）が読む
// ⚠️ 開封課金は 2026-08-26 施行。施行前後で文言を出し分ける（LEAD_UNLOCK_START_LABEL と必ず対で直す）。
//
// import 元は lead-unlock-core（DB非依存）。lead-unlock を import すると prisma が入って
// client component から使えなくなるので変えないこと。

export function InquiryFlowCard({
  direction,
  className = "",
}: {
  /** 案件の向き。GIVE=売りたい／WANT=探している */
  direction: string;
  className?: string;
}) {
  const isGive = direction === "GIVE";
  const active = isLeadChargingActive();

  const steps: string[] = isGive
    ? [
        "掲載されている条件（価格・数量・時期・受け渡し）を確認します。",
        "この案件について問い合わせを送ります。送信は無料です。",
        active
          ? `売り手が開封して内容を読み、返信します（売り手は開封に紹介料1クレジットを使います）。${LEAD_UNOPENED_NOTICE_DAYS}日たっても開封されない場合は、メールでお知らせします。`
          : `売り手が内容を読み、返信します。${LEAD_UNLOCK_START_LABEL}以降にお送りいただく分から、売り手は開封に紹介料1クレジットを使います。${LEAD_UNOPENED_NOTICE_DAYS}日たっても開封されない場合は、メールでお知らせします。`,
        "連絡が始まったあとのやり取りは、何往復でも無料です。条件を相談し、必要に応じて取引条件の提示・合意へ進みます。",
        "必要に応じて、NAKAMA事務局が間に入って支援します。",
      ]
    : [
        "募集されている条件（必須・希望・相談可能）を確認します。",
        "提案を送ります。最初の提案にだけ紹介料がかかります（通常の案件で1クレジット、NAKAMA確認済みの案件で3クレジット）。",
        "掲載者が内容を読み、返信します。14日たっても開封されない場合、使ったクレジットは自動で返還されます。",
        "連絡が始まったあとのやり取りは、何往復でも無料です。条件を相談し、必要に応じて取引条件の提示・合意へ進みます。",
        "必要に応じて、NAKAMA事務局が間に入って支援します。",
      ];

  return (
    <section
      className={`border border-[var(--line)] bg-white p-5 ${className}`}
      aria-label="連絡から商談までの流れ"
    >
      <h2 className="text-[14px] font-bold text-[var(--ink)]">連絡から商談までの流れ</h2>
      <ol className="mt-3 flex flex-col gap-2.5">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2.5">
            <span className="shrink-0 text-[12px] font-bold tracking-[0.04em] text-[var(--green-d)]">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-[12px] leading-6 text-[var(--ink-2)]">{s}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 border-t border-[var(--line)] pt-2.5 text-[11px] leading-5 text-[var(--muted)]">
        NAKAMAは取引の当事者ではありません。商談の成立、採用、契約、代金の支払いは保証しません。
      </p>
    </section>
  );
}
