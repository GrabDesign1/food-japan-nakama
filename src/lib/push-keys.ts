/**
 * 【プッシュ通知の鍵（VAPID）】2026-11-28。
 *
 * ⚠️⚠️ **環境変数ではなくDBに置いている。** 理由＝環境変数に置くと、本番へ反映するたびに
 *    人が Vercel の画面に貼り付ける必要があり、そこで作業が止まるため（2026-11-28 ユーザー選択）。
 *    鍵は**初回に呼ばれたときサーバーが自動生成**して `push_keys` に1行だけ入れる。
 *
 * ⚠️⚠️ **秘密鍵を画面にもログにも出さないこと。** 返すのは送信処理の中だけ。
 *    公開鍵（`getVapidPublicKey`）はブラウザに渡してよい（名前のとおり公開前提）。
 *
 * ⚠️⚠️ **鍵を作り直すと、既存の購読が全部無効になる。** 作り直すなら `push_subscriptions`
 *    も空にして、会員に登録し直してもらうこと（古い宛先に送っても届かない）。
 *
 * ⚠️ 環境変数が設定されていれば、そちらを優先する（昔の作りに戻せるようにしてある）。
 */
import { generateVAPIDKeys } from "web-push";
import { prisma } from "@/lib/db";

const ROW_ID = "default";
const DEFAULT_SUBJECT = "mailto:info@food-japan-summit.jp";

export type VapidKeys = { publicKey: string; privateKey: string; subject: string };

// ⚠️ 1リクエストごとにDBを読まないよう、プロセス内で覚えておく（鍵は変わらない）
let cached: VapidKeys | null = null;

/** 鍵を取り出す。無ければ作る。 */
export async function getVapidKeys(): Promise<VapidKeys> {
  if (cached) return cached;

  // ⚠️ 環境変数があればそれを使う（過去の設定を残している環境のため）
  const envPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const envPrivate = process.env.VAPID_PRIVATE_KEY;
  if (envPublic && envPrivate) {
    cached = {
      publicKey: envPublic,
      privateKey: envPrivate,
      subject: process.env.VAPID_SUBJECT || DEFAULT_SUBJECT,
    };
    return cached;
  }

  const found = await prisma.pushKey.findUnique({ where: { id: ROW_ID } });
  if (found) {
    cached = { publicKey: found.publicKey, privateKey: found.privateKey, subject: found.subject };
    return cached;
  }

  // 無ければ作る。
  // ⚠️ 同時に2つのリクエストが来ても1行で済むよう upsert にする
  //    （create だと片方が主キー重複で落ちる）。
  const made = generateVAPIDKeys();
  const row = await prisma.pushKey.upsert({
    where: { id: ROW_ID },
    create: {
      id: ROW_ID,
      publicKey: made.publicKey,
      privateKey: made.privateKey,
      subject: process.env.VAPID_SUBJECT || DEFAULT_SUBJECT,
    },
    update: {}, // 先に誰かが作っていたら、その鍵をそのまま使う
  });
  cached = { publicKey: row.publicKey, privateKey: row.privateKey, subject: row.subject };
  return cached;
}

/** 画面に渡してよいほうの鍵。⚠️ 失敗しても落とさない（通知だけ使えない状態にする）。 */
export async function getVapidPublicKey(): Promise<string | null> {
  try {
    return (await getVapidKeys()).publicKey;
  } catch (e) {
    console.error("[push] 鍵の用意に失敗:", e);
    return null;
  }
}
