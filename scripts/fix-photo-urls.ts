// 取り込み済みの相対パスの写真・サイトURLを絶対URLに直す（1回限りの手当て）。
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const ORIGIN = "https://onegaizar.com";

async function main() {
  const { prisma } = await import("../src/lib/db");
  const t = await prisma.tenant.findUnique({ where: { slug: "food-japan-summit" }, select: { id: true } });
  if (!t) throw new Error("tenant なし");
  const rows = await prisma.member.findMany({
    where: { tenantId: t.id, sourceKey: { not: null } },
    select: { id: true, contactPhotoUrl: true, website: true },
  });
  let n = 0;
  for (const r of rows) {
    const data: Record<string, string> = {};
    if (r.contactPhotoUrl?.startsWith("/")) data.contactPhotoUrl = ORIGIN + r.contactPhotoUrl;
    if (r.website?.startsWith("/")) data.website = ORIGIN + r.website;
    if (Object.keys(data).length) { await prisma.member.update({ where: { id: r.id }, data }); n++; }
  }
  console.log("直した件数:", n, "/", rows.length);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1); });
