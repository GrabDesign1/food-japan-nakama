// 関係が薄れてきた方のお知らせ（日次バッチ・Vercel Cron）。2026-11-26
//
// ⚠️⚠️ **1つの関係につき1通だけ。** 送った印（fading_notified_at / cold_notified_at）を必ず付ける。
//    付け忘れると毎朝同じ人に届き、迷惑メールとして扱われる。
// ⚠️ 止めている方（User.feedEmailOptOutAt）には送らない。止め場所は1つに集約している。
// ⚠️ 1回の実行で送るのは NOTICE_MAX_MEMBERS_PER_RUN 人まで。残りは翌日に回す。
// ⚠️ 冪等。途中で落ちても、送れた分だけ印が付く（二重送信しない）。
import type { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { sendRelationshipReminder } from "@/lib/email";
import {
  findNoticeTargets, markNoticed,
  NOTICE_MAX_MEMBERS_PER_RUN, NOTICE_MAX_NAMES,
} from "@/lib/relationship-notify";

function timingSafeEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret) {
    if (!timingSafeEquals(auth ?? "", `Bearer ${secret}`)) {
      return new Response("unauthorized", { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    console.error("[cron] CRON_SECRET が未設定のため実行を拒否しました");
    return new Response("cron not configured", { status: 500 });
  }

  // 送らずに中身だけ見る（?dry=1）。本番で様子を見るときに使う
  const dry = new URL(req.url).searchParams.get("dry") === "1";

  const targets = (await findNoticeTargets()).slice(0, NOTICE_MAX_MEMBERS_PER_RUN);
  const summary = { targets: targets.length, sent: 0, skippedNoEmail: 0, skippedOptOut: 0, failed: 0 };

  for (const t of targets) {
    // 宛先（その会員のログイン。止めている人は外す）
    const users = await prisma.user.findMany({
      where: { memberId: t.memberId, status: "ACTIVE" },
      select: { email: true, name: true, feedEmailOptOutAt: true },
    });
    const live = users.filter((u) => !u.feedEmailOptOutAt && u.email);
    if (users.length === 0) { summary.skippedNoEmail++; continue; }
    if (live.length === 0) { summary.skippedOptOut++; continue; }

    const member = await prisma.member.findUnique({
      where: { id: t.memberId },
      select: { contactName: true, name: true },
    });
    const displayName = member?.contactName || member?.name || live[0].name || "ご担当者";

    if (!dry) {
      try {
        for (const u of live) {
          await sendRelationshipReminder({
            to: u.email,
            name: displayName,
            fading: t.fading.map((x) => x.otherName),
            cold: t.cold.map((x) => x.otherName),
            maxNames: NOTICE_MAX_NAMES,
          });
        }
        // ⚠️ 送った直後に印を付ける。ここを後回しにすると二重送信になる
        await markNoticed({
          fadingIds: t.fading.map((x) => x.relationshipId),
          coldIds: t.cold.map((x) => x.relationshipId),
        });
        summary.sent++;
      } catch (e) {
        console.error("[cron] 関係のお知らせに失敗:", e);
        summary.failed++;
      }
    }
  }

  console.log("[cron] relationship-daily:", JSON.stringify(summary), dry ? "(送信なし)" : "");
  return Response.json({ ok: true, dry, ...summary });
}
