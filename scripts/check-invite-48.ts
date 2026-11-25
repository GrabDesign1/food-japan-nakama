// 登壇者48名の招待可否を見るだけ（送らない）。
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const { prisma } = await import("../src/lib/db");
  const t = await prisma.tenant.findUnique({ where: { slug: "food-japan-summit" }, select: { id: true } });
  if (!t) throw new Error("tenant なし");
  const rows = await prisma.member.findMany({
    where: { tenantId: t.id, summitRole: "speaker", preregAt: { not: null }, users: { none: {} } },
    select: {
      name: true, contactName: true, preregEmail: true, listed: true,
      inviteSentAt: true, inviteAnswer: true, contactPhotoUrl: true, contactRole: true,
    },
    orderBy: { name: "asc" },
  });
  const withMail = rows.filter((r) => r.preregEmail);
  const noMail = rows.filter((r) => !r.preregEmail);
  console.log("登壇者（ご本人の登録はまだ）:", rows.length);
  console.log("  メールあり → 送れる      :", withMail.length);
  console.log("  メール無し → 送れない    :", noMail.length);
  console.log("  すでに送った             :", rows.filter((r) => r.inviteSentAt).length);
  console.log("  一覧に出ている           :", rows.filter((r) => r.listed).length);
  console.log("  顔写真あり               :", rows.filter((r) => r.contactPhotoUrl).length);
  console.log("\n--- 送れる方（氏名／事業者／メールは伏せる） ---");
  withMail.forEach((r, i) => {
    const e = r.preregEmail!;
    const masked = e[0] + "***@" + e.split("@")[1];
    console.log(`${String(i + 1).padStart(2)}. ${(r.contactName ?? "（氏名なし）").padEnd(10)} ${r.name.slice(0, 22).padEnd(24)} ${masked}`);
  });
  if (noMail.length) {
    console.log("\n--- メールが無くて送れない方 ---");
    noMail.forEach((r) => console.log(`    ${r.contactName ?? "（氏名なし）"} / ${r.name}`));
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1); });
