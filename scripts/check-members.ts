// 本番DBの会員データの状態を見るだけの確認スクリプト（読み取りのみ）。
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const { prisma } = await import("../src/lib/db"); // dotenv の後に読む（import巻き上げ回避）
  const t = await prisma.tenant.findUnique({ where: { slug: "food-japan-summit" }, select: { id: true } });
  if (!t) throw new Error("tenant なし");
  const tenantId = t.id;
  const [total, listed, synced, speakers, attendees, withPhoto, withBio, withUser] = await Promise.all([
    prisma.member.count({ where: { tenantId } }),
    prisma.member.count({ where: { tenantId, listed: true } }),
    prisma.member.count({ where: { tenantId, sourceKey: { not: null } } }),
    prisma.member.count({ where: { tenantId, summitRole: "speaker" } }),
    prisma.member.count({ where: { tenantId, summitRole: "attendee" } }),
    prisma.member.count({ where: { tenantId, contactPhotoUrl: { not: null } } }),
    prisma.member.count({ where: { tenantId, contactBio: { not: null } } }),
    prisma.member.count({ where: { tenantId, users: { some: {} } } }),
  ]);
  console.log("members 全体            :", total);
  console.log("  公開中 listed:true    :", listed);
  console.log("  イベント取り込み済    :", synced, "（登壇", speakers, "/ 参加", attendees, "）");
  console.log("  顔写真あり            :", withPhoto);
  console.log("  ひとことあり          :", withBio);
  console.log("  ログインアカウントあり:", withUser);

  const ume = await prisma.member.findMany({
    where: { tenantId, OR: [{ contactName: { contains: "梅澤" } }, { name: { contains: "折兼" } }] },
    select: { name: true, contactName: true, listed: true, status: true,
              contactPhotoUrl: true, contactRole: true, summitRole: true, sourceKey: true },
  });
  console.log("\n梅澤さん/折兼:", JSON.stringify(ume, null, 2));
  await prisma.$disconnect();
}
main().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1); });
