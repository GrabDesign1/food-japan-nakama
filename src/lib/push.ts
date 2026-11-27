/**
 * 【プッシュ通知の送信】2026-11-28（PWA・Web Push）。
 *
 * ⚠️⚠️ **本文そのものを通知に入れない。** 通知はロック画面に出る。
 *    商談の中身が、机に置いたスマホから他人に読まれる（規約17条・通信の秘密）。
 *    入れてよいのは「誰から」「どの画面か」まで。中身は開いてから読んでもらう。
 *
 * ⚠️⚠️ **鍵が無い環境では黙って何もしない。** 開発機やプレビューで落とさないため。
 *    ⚠️ 本番で鳴らないときは、まず Vercel の環境変数（VAPID）を疑う。
 *
 * ⚠️ 404 / 410 が返ったら、その宛先は**消す**（端末側で通知を切られている）。
 *    消さないと、毎回失敗する宛先に送り続けることになる。
 */
// ⚠️ web-push は CommonJS で、default export を持っていない。
//    `import webpush from "web-push"` と書くと Turbopack のビルドで落ちる（2026-11-28 に踏んだ）。
import { setVapidDetails, sendNotification } from "web-push";
import { prisma } from "@/lib/db";
import type { NotifyKind } from "@/lib/notify-settings";
import { allowedPushMemberIds } from "@/lib/notify-settings";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:info@food-japan-summit.jp";

let ready = false;
function setup(): boolean {
  if (!PUBLIC_KEY || !PRIVATE_KEY) return false;
  if (!ready) {
    setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
    ready = true;
  }
  return true;
}

export function pushConfigured(): boolean {
  return Boolean(PUBLIC_KEY && PRIVATE_KEY);
}

export type PushPayload = {
  title: string;
  /** ⚠️ 本文の中身を入れない。「〇〇さんからメッセージが届きました」まで */
  body: string;
  /** 押したときに開く画面 */
  url: string;
  /** 同じ種類をまとめるための印（溜めない） */
  tag?: string;
};

/**
 * ある会員の全端末へ送る。
 * ⚠️ 「通知の設定」で止めている人には送らない（メールと同じスイッチを使う）。
 */
export async function sendPushToMember(
  memberId: string,
  kind: NotifyKind,
  payload: PushPayload
): Promise<void> {
  if (!setup()) return;
  const allowed = await allowedPushMemberIds([memberId], kind);
  if (allowed.length === 0) return;

  const subs = await prisma.pushSubscription.findMany({ where: { memberId } });
  if (subs.length === 0) return;

  const body = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (s) => {
      try {
        await sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body
        );
        await prisma.pushSubscription.update({
          where: { id: s.id },
          data: { lastUsedAt: new Date() },
        });
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        // ⚠️ 404/410＝その宛先はもう無い。消す
        if (code === 404 || code === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        } else {
          console.error("[push] 送信に失敗:", code, e);
        }
      }
    })
  );
}
