// 「関係が薄れてきた方のお知らせ」の文面を、**送らずに**書き出す（2026-11-26）。
// ⚠️ 送信は一切しない。fetch を差し替えて中身だけ受け取る。
// ⚠️ 確認用に古い関係を1件つくり、最後に必ず消す。
import dotenv from "dotenv";
import { writeFileSync } from "node:fs";
dotenv.config({ path: ".env.local" });

async function main() {
  const captured: string[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(typeof input === "string" ? input : (input as Request).url ?? input);
    if (url.includes("api.resend.com")) {
      const body = JSON.parse(String(init?.body ?? "{}"));
      captured.push(`<h3 style="font-family:sans-serif">件名：${body.subject}／宛先：${body.to}</h3>${body.html}`);
      return new Response(JSON.stringify({ id: "dry" }), { status: 200 });
    }
    return realFetch(input as RequestInfo, init);
  }) as typeof fetch;

  const { prisma } = await import("../src/lib/db");
  const { findNoticeTargets, NOTICE_MAX_NAMES } = await import("../src/lib/relationship-notify");
  const { sendRelationshipReminder } = await import("../src/lib/email");

  const me = await prisma.user.findFirst({
    where: { email: "nakama-test@grab-design.com" },
    select: { memberId: true },
  });
  if (!me?.memberId) throw new Error("テスト会員が見つかりません（先に create-test-account.ts）");

  // 相手は、名前の入っている既存会員から2名借りる（データは触らない）
  const others = await prisma.member.findMany({
    where: { contactName: { not: null }, id: { not: me.memberId } },
    select: { id: true, contactName: true },
    take: 2,
  });
  if (others.length < 2) throw new Error("相手が足りません");

  const DAY = 24 * 60 * 60 * 1000;
  const made: string[] = [];
  for (const [i, o] of others.entries()) {
    const [a, b] = [me.memberId, o.id].sort();
    const daysAgo = i === 0 ? 430 : 200; // 1件は「切れかけ」、1件は「そろそろ」
    const r = await prisma.relationship.upsert({
      where: { memberAId_memberBId: { memberAId: a, memberBId: b } },
      create: {
        tenantId: "tnt_default", memberAId: a, memberBId: b,
        strengthAtLastContact: 100, lastContactAt: new Date(Date.now() - daysAgo * DAY),
        lastKind: "exchange", contextCodes: [],
      },
      update: {
        strengthAtLastContact: 100, lastContactAt: new Date(Date.now() - daysAgo * DAY),
        fadingNotifiedAt: null, coldNotifiedAt: null,
      },
      select: { id: true },
    });
    made.push(r.id);
  }

  const targets = await findNoticeTargets();
  const mine = targets.find((t) => t.memberId === me.memberId);
  console.log("対象の人数:", targets.length, "／ テスト会員ぶん:", mine ? `そろそろ${mine.fading.length}件・切れかけ${mine.cold.length}件` : "なし");

  if (mine) {
    await sendRelationshipReminder({
      to: "（確認用・実際には送っていません）",
      name: "見本 太郎",
      fading: mine.fading.map((x) => x.otherName),
      cold: mine.cold.map((x) => x.otherName),
      maxNames: NOTICE_MAX_NAMES,
    });
  }

  // ⚠️ 作った関係は必ず消す
  await prisma.relationship.deleteMany({ where: { id: { in: made } } });
  console.log("確認用に作った関係を消しました:", made.length, "件");

  const out = "/tmp/relationship-mail-preview.html";
  writeFileSync(out, `<meta charset="utf-8"><body style="background:#eee;padding:24px">${captured.join("<hr style='margin:32px 0'>")}</body>`);
  console.log("文面を書き出しました:", out, `（${captured.length}通）`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1); });
