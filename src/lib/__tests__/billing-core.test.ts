// 課金の純粋ロジックのテスト（金額・ティア判定・ロット選択・未読返還判定）。
import { describe, it, expect } from "vitest";
import {
  discountedUnitAmount,
  isVerifiedLeadActive,
  pricingTierFor,
  creditTypeForTier,
  availableBalance,
  pickLotToConsume,
  lotRemaining,
  isUnreadRefundDue,
  type CreditLot,
} from "../billing-core";

const NOW = new Date("2026-08-10T12:00:00+09:00");
const days = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);

describe("discountedUnitAmount（会員割引）", () => {
  it("非会員は定価", () => {
    expect(discountedUnitAmount(5500, 20, false)).toBe(5500);
  });
  it("会員は20%割引（端数切り捨て）", () => {
    expect(discountedUnitAmount(5500, 20, true)).toBe(4400);
    expect(discountedUnitAmount(11000, 20, true)).toBe(8800);
    expect(discountedUnitAmount(3300, 20, true)).toBe(2640);
  });
  it("割引率0は定価", () => {
    expect(discountedUnitAmount(1100, 0, true)).toBe(1100);
  });
  it("不正な割引率は0〜100に丸める", () => {
    expect(discountedUnitAmount(1000, 150, true)).toBe(0);
    expect(discountedUnitAmount(1000, -10, true)).toBe(1000);
  });
});

describe("優良案件のティア判定（確認から30日で通常に戻る）", () => {
  it("確認なし＝通常", () => {
    expect(pricingTierFor(null, NOW)).toBe("standard");
  });
  it("確認から30日未満＝優良", () => {
    expect(pricingTierFor(days(-29), NOW)).toBe("verified_lead");
    expect(isVerifiedLeadActive(days(-1), NOW)).toBe(true);
  });
  it("確認から30日超＝通常に戻る", () => {
    expect(pricingTierFor(days(-31), NOW)).toBe("standard");
    expect(isVerifiedLeadActive(days(-31), NOW)).toBe(false);
  });
  it("ティア→クレジット種別", () => {
    expect(creditTypeForTier("standard")).toBe("standard");
    expect(creditTypeForTier("verified_lead")).toBe("verified");
  });
});

describe("クレジットロット（残高・期限順消費）", () => {
  const lots: CreditLot[] = [
    { id: "a", quantity: 3, consumed: 1, expiresAt: days(30) }, // 残2・期限近い
    { id: "b", quantity: 5, consumed: 0, expiresAt: days(180) }, // 残5
    { id: "c", quantity: 3, consumed: 3, expiresAt: null }, // 使い切り
    { id: "d", quantity: 2, consumed: 0, expiresAt: days(-1) }, // 期限切れ
  ];
  it("残高は期限内ロットのみ合算（2+5=7。期限切れ・使い切りは除外）", () => {
    expect(availableBalance(lots, NOW)).toBe(7);
  });
  it("期限が近いロットから消費する", () => {
    expect(pickLotToConsume(lots, NOW)?.id).toBe("a");
  });
  it("無期限ロットは最後に消費する", () => {
    const l: CreditLot[] = [
      { id: "x", quantity: 1, consumed: 0, expiresAt: null },
      { id: "y", quantity: 1, consumed: 0, expiresAt: days(10) },
    ];
    expect(pickLotToConsume(l, NOW)?.id).toBe("y");
  });
  it("残高ゼロなら null", () => {
    expect(pickLotToConsume([{ id: "z", quantity: 1, consumed: 1, expiresAt: null }], NOW)).toBeNull();
  });
  it("lotRemaining は負にならない", () => {
    expect(lotRemaining({ id: "w", quantity: 1, consumed: 2, expiresAt: null })).toBe(0);
  });
});

describe("14日未読返還の判定", () => {
  const base = { unreadRefundDueAt: days(-1), unreadRefundedAt: null, now: NOW };
  it("未開封・期限到来・未返還 → 返還する", () => {
    expect(isUnreadRefundDue({ ...base, openedAt: null })).toBe(true);
  });
  it("開封済みは返還しない（返信がなくても）", () => {
    expect(isUnreadRefundDue({ ...base, openedAt: days(-2) })).toBe(false);
  });
  it("返還済みは二度返還しない", () => {
    expect(isUnreadRefundDue({ ...base, openedAt: null, unreadRefundedAt: days(-1) })).toBe(false);
  });
  it("期限前は返還しない", () => {
    expect(isUnreadRefundDue({ ...base, openedAt: null, unreadRefundDueAt: days(1) })).toBe(false);
  });
  it("会員無制限（期限なし）は対象外", () => {
    expect(isUnreadRefundDue({ ...base, openedAt: null, unreadRefundDueAt: null })).toBe(false);
  });
});
