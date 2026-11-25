// 招待メールの文面を、送らずにHTMLへ書き出す（目で確かめるため）。
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import fs from "node:fs";

async function main() {
  const mod = await import("../src/lib/email");
  const captured: { subject: string; html: string }[] = [];
  // send を差し替えずに文面だけ取りたいので、環境変数を外して「送信未設定」状態で呼ぶ手は使わない。
  // 代わりに sendMemberInvite と同じ組み立てを、ここでは実際の関数から取り出す。
  // → 実関数は送信まで行うため、ここでは送信先を捕まえるラッパを使う。
  const orig = (globalThis as Record<string, unknown>).fetch;
  (globalThis as Record<string, unknown>).fetch = async (...args: unknown[]) => {
    const init = args[1] as { body?: string } | undefined;
    try {
      const b = JSON.parse(init?.body ?? "{}");
      captured.push({ subject: b.subject ?? "", html: b.html ?? "" });
    } catch { /* 送信以外の fetch は無視 */ }
    return new Response(JSON.stringify({ id: "dry-run" }), { status: 200 });
  };

  for (const listed of [true, false]) {
    await mod.sendMemberInvite({
      to: "dry-run@example.com",
      name: "株式会社ドール",
      contactName: "青木 寛",
      token: "SAMPLE-TOKEN-xxxxxxxxxxxxxxxxxxxx",
      listed,
    });
  }
  (globalThis as Record<string, unknown>).fetch = orig;

  if (!captured.length) {
    console.log("⚠️ 送信サービスが未設定のため、文面を取れませんでした（RESEND等のAPIキー未設定）。");
    return;
  }
  const page = captured
    .map((c, i) => `
      <section style="margin:0 0 48px">
        <p style="font:bold 13px sans-serif;color:#888;margin:0 0 6px">
          ${i === 0 ? "① すでに一覧に掲載している方（＝今回の登壇者45名）" : "② まだ掲載していない方（＝ご参加者163名・将来用）"}
        </p>
        <p style="font:bold 15px sans-serif;margin:0 0 14px">件名：${c.subject}</p>
        <div style="border:1px solid #e3e6e8;border-radius:10px;padding:22px;background:#fff">${c.html}</div>
      </section>`)
    .join("");
  const out = `<!doctype html><html lang="ja"><meta charset="utf-8">
<title>招待メールの文面（送信前の確認）</title>
<body style="background:#f6f7f8;padding:28px;margin:0">
<h1 style="font:bold 18px sans-serif;margin:0 0 20px">招待メールの文面（まだ送っていません）</h1>
${page}
</body></html>`;
  fs.writeFileSync("/tmp/invite-mail-preview.html", out);
  console.log("書き出しました: /tmp/invite-mail-preview.html");
  console.log("件名①:", captured[0].subject);
  console.log("件名②:", captured[1]?.subject ?? "-");
}
main().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1); });
