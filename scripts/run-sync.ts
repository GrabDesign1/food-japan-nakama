// Onegaizar の名簿を NAKAMA に取り込む（事務局画面のボタンと同じ処理を、残り0になるまで回す）。
// ⚠️ 取り込んだ方は必ず非公開（listed:false）。この時点では誰にも見えず、メールも送りません。
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const { syncConfigured, syncFromOnegaizar } = await import("../src/lib/onegaizar-sync");
  const { prisma } = await import("../src/lib/db");
  console.log("設定:", syncConfigured() ? "あり" : "なし（ONEGAIZAR_SYNC_URL / TOKEN が未設定）");
  if (!syncConfigured()) { process.exit(1); }

  const t = await prisma.tenant.findUnique({ where: { slug: "food-japan-summit" }, select: { id: true } });
  if (!t) throw new Error("tenant なし");

  for (let i = 1; i <= 6; i++) {
    const r = await syncFromOnegaizar(t.id, "事務局（スクリプト）");
    console.log(`${i}回目:`, JSON.stringify(r));
    if (!r.ok) break;
    if (r.remaining === 0) { console.log("→ 取り込み完了"); break; }
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(String(e).slice(0, 500)); process.exit(1); });
