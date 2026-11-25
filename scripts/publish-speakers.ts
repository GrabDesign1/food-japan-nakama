// サミットのご登壇者を一覧に出す（ユーザー判断 2026-11-25「登壇者48名だけ先に出す」）。
// ⚠️ 対象は、イベントから取り込んだ **登壇者のみ**。ご参加者（attendee）は出さない。
// ⚠️ メールは送りません。/join の「はい／いいえ」はこのあとも使えます。
// ⚠️ 元に戻すには REVERT=1 を付けて実行。
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const { prisma } = await import("../src/lib/db");
  const revert = process.env.REVERT === "1";
  const t = await prisma.tenant.findUnique({ where: { slug: "food-japan-summit" }, select: { id: true } });
  if (!t) throw new Error("tenant なし");
  const r = await prisma.member.updateMany({
    where: {
      tenantId: t.id,
      summitRole: "speaker",
      sourceKey: { not: null },
      preregAt: { not: null },
      users: { none: {} },      // ご自身で登録済みの方は触らない
      listed: revert,
    },
    data: { listed: !revert },
  });
  console.log(revert ? "非公開に戻した件数:" : "一覧に出した件数:", r.count);
  const listed = await prisma.member.count({ where: { tenantId: t.id, listed: true } });
  console.log("現在 listed:true の合計:", listed);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1); });
