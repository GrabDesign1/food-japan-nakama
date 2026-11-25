// 試し打ちで作ったダミー会員を消す（2026-11-26）。
// ⚠️ 消すのは sourceKey="test:invite-dryrun" の1行だけ。他には触らない。
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  // ⚠️ test-invite-one.ts は読み込むと送ってしまうので import しない。合言葉は直接書く
  const TEST_SOURCE_KEY = "test:invite-dryrun";
  const { prisma } = await import("../src/lib/db");
  const m = await prisma.member.findUnique({
    where: { sourceKey: TEST_SOURCE_KEY },
    select: { id: true, name: true, preregEmail: true, inviteAnswer: true, _count: { select: { users: true } } },
  });
  if (!m) { console.log("ダミー会員はもうありません。"); await prisma.$disconnect(); return; }
  if (m._count.users > 0) throw new Error("ログインが紐づいています。手で確認してください（消しません）");
  await prisma.member.delete({ where: { id: m.id } });
  console.log("消しました:", m.name, m.preregEmail, "（返事:", m.inviteAnswer ?? "まだ", "）");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1); });
