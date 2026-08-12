// 開封課金の「どれが課金対象か」だけを確かめる（DBには触らない純粋関数）。
// 施行日より前に届いた問い合わせを無料のままにする、という約束が壊れると
// 不利益変更のトラブルに直結するため、ここで固定しておく。
import { describe, it, expect } from "vitest";
import { isChargeableLead, LEAD_UNLOCK_START_AT, isLeadChargingActive } from "../lead-unlock-core";

const SELLER = "m_seller";
const BUYER = "m_buyer";
const AFTER = new Date(LEAD_UNLOCK_START_AT.getTime() + 60_000);
const BEFORE = new Date(LEAD_UNLOCK_START_AT.getTime() - 60_000);

const base = {
  direction: "GIVE",
  offeringMemberId: SELLER,
  viewerMemberId: SELLER,
  threadFromMemberId: BUYER,
  firstInboundAt: AFTER,
};

describe("isChargeableLead", () => {
  it("自分の「売りたい」に施行日以降に届いた問い合わせは課金対象", () => {
    expect(isChargeableLead(base)).toBe(true);
  });

  it("施行日より前に届いていたものは無料のまま", () => {
    expect(isChargeableLead({ ...base, firstInboundAt: BEFORE })).toBe(false);
  });

  it("相手からのメッセージが無いスレッドは対象外", () => {
    expect(isChargeableLead({ ...base, firstInboundAt: null })).toBe(false);
  });

  it("「探している」案件（提案側の紹介料で課金する）は対象外", () => {
    expect(isChargeableLead({ ...base, direction: "WANT" })).toBe(false);
  });

  it("他人の案件を見ているときは対象外", () => {
    expect(isChargeableLead({ ...base, viewerMemberId: "m_other" })).toBe(false);
  });

  it("自分から送り始めたやり取りは「届いたリード」ではない", () => {
    expect(isChargeableLead({ ...base, threadFromMemberId: SELLER })).toBe(false);
  });
});

describe("isLeadChargingActive", () => {
  it("施行日の前後で切り替わる", () => {
    expect(isLeadChargingActive(BEFORE)).toBe(false);
    expect(isLeadChargingActive(LEAD_UNLOCK_START_AT)).toBe(true);
    expect(isLeadChargingActive(AFTER)).toBe(true);
  });
});
