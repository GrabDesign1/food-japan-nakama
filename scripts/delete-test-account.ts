// 動作確認用アカウントを消す（2026-11-26）。
// ⚠️ 消すのは nakama-test@grab-design.com の1件だけ。会員の行（Member/User）も一緒に消す。
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const TEST_EMAIL = "nakama-test@grab-design.com";

async function main() {
  const { createClient } = await import("@supabase/supabase-js");
  const { prisma } = await import("../src/lib/db");
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const u = await prisma.user.findFirst({ where: { email: TEST_EMAIL }, select: { id: true, memberId: true } });
  if (u) {
    if (u.memberId) {
      const m = await prisma.member.findUnique({
        where: { id: u.memberId },
        select: { name: true, listed: true, status: true, _count: { select: { users: true } } },
      });
      // ⚠️ 本物の会員を巻き込まない（テスト用は users が1人・非公開のはず）
      if (m && m._count.users <= 1 && !m.listed) {
        await prisma.member.delete({ where: { id: u.memberId } });
        console.log("会員の行を消しました:", m.name);
      } else {
        console.log("⚠️ 会員の行は消しませんでした（条件に合わない）:", m);
      }
    }
    await prisma.user.delete({ where: { id: u.id } });
    console.log("ログインの行を消しました");
  }

  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const au = list?.users.find((x) => x.email === TEST_EMAIL);
  if (au) {
    await admin.auth.admin.deleteUser(au.id);
    console.log("認証のアカウントを消しました:", TEST_EMAIL);
  } else {
    console.log("認証のアカウントはもうありません");
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1); });
