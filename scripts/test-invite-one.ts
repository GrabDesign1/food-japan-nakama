// 招待メールの試し打ち（2026-11-26 ユーザー指示「保守　A」）。
//
// 何をするか:
//   1. 送信テスト用のダミー会員を1件つくる（sourceKey="test:invite-dryrun" で何度やっても増えない）
//   2. 本番と同じ道（issueInviteToken → sendMemberInvite → markInviteSent）で1通だけ送る
//   3. /join のリンクを表示する
//
// ⚠️⚠️ **宛先は TO で明示する。既定値を入れない。** 手が滑って他人に届くことを防ぐ。
// ⚠️ ダミーは status=DRAFT のまま。listed=true でも /members は APPROVED かつ listed で絞るので、
//    一覧には出ない（＝登壇者45名と同じ文面を試せるが、誰の目にも触れない）。
// ⚠️ 終わったら scripts/test-invite-cleanup.ts で必ず消す。
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

export const TEST_SOURCE_KEY = "test:invite-dryrun";

async function main() {
  const to = (process.env.TO ?? "").trim();
  if (!to) throw new Error("TO=宛先メール を指定してください（既定値はありません）");

  // メールのリンクを本番に向ける（.env.local は localhost なので、受信箱で押せない）
  process.env.NEXT_PUBLIC_APP_URL =
    process.env.TEST_APP_URL ?? "https://nakama.food-japan-summit.jp";

  const { prisma } = await import("../src/lib/db");
  const { issueInviteToken, markInviteSent } = await import("../src/lib/member-invite");
  const { sendMemberInvite } = await import("../src/lib/email");

  const t = await prisma.tenant.findUnique({
    where: { slug: "food-japan-summit" },
    select: { id: true },
  });
  if (!t) throw new Error("tenant なし");

  const existing = await prisma.member.findUnique({
    where: { sourceKey: TEST_SOURCE_KEY },
    select: { id: true },
  });

  const data = {
    tenantId: t.id,
    name: "（送信テスト）テスト商店",
    contactName: "テスト 太郎",
    contactRole: "代表",
    categoryL1: "その他",
    prefecture: "宮崎県",
    preregEmail: to,
    preregAt: new Date(),
    preregBy: "送信テスト",
    preregNote: "招待メールの試し打ち用。確認後に削除する。",
    summitRole: "speaker",
    summitEvents: ["FOOD JAPAN SUMMIT 2026 in MIYAZAKI"],
    // 登壇者45名と同じ文面を試すため true。status は DRAFT のままなので一覧には出ない
    listed: true,
    sourceKey: TEST_SOURCE_KEY,
    inviteToken: null,
    inviteSentAt: null,
    inviteAnswer: null,
    inviteAnsweredAt: null,
  };

  const m = existing
    ? await prisma.member.update({ where: { id: existing.id }, data, select: { id: true, name: true } })
    : await prisma.member.create({ data, select: { id: true, name: true } });
  console.log(existing ? "ダミー会員を作り直しました:" : "ダミー会員を作りました:", m.id);

  const token = await issueInviteToken(t.id, m.id);
  if (!token) throw new Error("合言葉が発行できませんでした（条件を満たしていない）");

  await sendMemberInvite({ to, name: data.name, contactName: data.contactName, token, listed: true });
  await markInviteSent(m.id);

  console.log("\n1通だけ送りました →", to);
  console.log("リンク:", `${process.env.NEXT_PUBLIC_APP_URL}/join/${encodeURIComponent(token)}`);
  console.log("\n確認したら: TO 無しで `npx tsx scripts/test-invite-cleanup.ts`");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(String(e).slice(0, 500)); process.exit(1); });
