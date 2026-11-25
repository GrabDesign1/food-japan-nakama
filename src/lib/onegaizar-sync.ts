// Onegaizar（イベント管理）から、登壇者・参加者を取り込む（2026-11-25）。
//
// なぜ作るか（ユーザー指示 2026-11-25）: 「保守　１をすすめて」
//   手で表を貼るのをやめ、イベント側を直せば NAKAMA も直るようにする。
//
// ⚠️⚠️ **取り込んでも、誰にも見えません。** 作る行は必ず listed:false。
//    本人が /join で「はい」と言うまで、検索にもプロフィールにも出ない。
//    ⚠️ ユーザー指示（2026-11-23）「移動させておいて、利用するかは、本人の承諾を得る」
// ⚠️⚠️ **ここからメールは送りません。** 送るのは先行登録の画面のボタンだけ（1人1回）。
// ⚠️⚠️ **すでに本人が使っている会員は、作り直しません。**
//    開催の記録（summitEvents / summitRole）だけ足します。
//    ⚠️ 本人が書いたプロフィールを、イベント側の古い情報で上書きしない。
// ⚠️ 電話番号は、そもそも向こうが渡してきません。
// ⚠️ 事業内容は取り込みません——ご本人が NAKAMA で書くことになっています（ユーザー決定「A」）。
import { prisma } from "@/lib/db";

export type SyncResult = {
  ok: boolean;
  error?: string;
  /** 新しく預かった人 */
  created: number;
  /** すでに預かっていた人（開催の記録だけ足した） */
  updated: number;
  /** すでに本人が使っている会員（開催の記録だけ足した） */
  linked: number;
  /** メールが無くて取り込めなかった人 */
  skippedNoEmail: number;
  /** 今回は作らず、次回に回した人 */
  remaining: number;
  speaker: number;
  attendee: number;
};

type RosterPerson = {
  sourceKey: string;
  kind: "speaker" | "attendee";
  name: string;
  nameKana: string | null;
  company: string | null;
  title: string | null;
  email: string | null;
  photoUrl: string | null;
  bio: string | null;
  websiteUrl: string | null;
  events: string[];
};

/** 1回に読む上限。⚠️ 際限なく読まない */
export const SYNC_MAX = 2000;
/**
 * 1回に**新しく作る**上限。
 * ⚠️⚠️ 311人を一度に作ると、画面が時間切れになる（Vercel の関数には制限時間がある）。
 *    区切っても、印（sourceKey）で突き合わせるので**重複しません**。
 *    残りは、もう一度押せば続きから入ります。
 */
export const CREATE_PER_RUN = 120;

function clean(v: string | null | undefined, max = 200): string {
  return (v ?? "").trim().slice(0, max);
}

function normalizeEmail(v: string | null | undefined): string {
  return clean(v, 200).toLowerCase();
}

/** 開催名を足す（同じものを2回入れない） */
function mergeEvents(current: string[], incoming: string[]): string[] {
  const set = new Set(current);
  for (const e of incoming) if (e) set.add(e);
  return [...set].slice(0, 20);
}

export function syncConfigured(): boolean {
  return !!(process.env.ONEGAIZAR_SYNC_URL && process.env.ONEGAIZAR_SYNC_TOKEN);
}

/**
 * Onegaizar から名簿を取り、預かる。
 * ⚠️ 合言葉は環境変数。URLも環境変数（本番とローカルで向き先が変わる）。
 */
/**
 * イベント側が返す "/api/media/xxx" のような相対パスを、絶対URLに直す。
 * ⚠️ これをしないと NAKAMA 自身の /api/media を見にいって写真が出ない（2026-11-25）。
 */
function absolutize(u: string | null | undefined): string | null {
  const t = (u ?? "").trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (!t.startsWith("/")) return t;
  try {
    return new URL(t, new URL(process.env.ONEGAIZAR_SYNC_URL ?? "").origin).toString();
  } catch {
    return null;
  }
}

export async function syncFromOnegaizar(
  tenantId: string,
  actorName: string
): Promise<SyncResult> {
  const empty: SyncResult = {
    ok: false, created: 0, updated: 0, linked: 0,
    skippedNoEmail: 0, remaining: 0, speaker: 0, attendee: 0,
  };

  const url = process.env.ONEGAIZAR_SYNC_URL;
  const token = process.env.ONEGAIZAR_SYNC_TOKEN;
  if (!url || !token) {
    return { ...empty, error: "連携の設定がありません（ONEGAIZAR_SYNC_URL / ONEGAIZAR_SYNC_TOKEN）。" };
  }

  let people: RosterPerson[];
  try {
    const res = await fetch(url, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
      // ⚠️ 返事が無いまま画面を止めない
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      return { ...empty, error: `イベント側が応答しませんでした（${res.status}）。合言葉と設定をご確認ください。` };
    }
    const json = (await res.json()) as { people?: RosterPerson[] };
    people = Array.isArray(json.people) ? json.people.slice(0, SYNC_MAX) : [];
  } catch (e) {
    console.error("[onegaizar-sync] 取得に失敗:", e);
    return { ...empty, error: "イベント側につながりませんでした。" };
  }

  const out: SyncResult = { ...empty, ok: true };
  const now = new Date();

  // ⚠️⚠️ **1人ずつDBに聞かない。** 311人いるので、往復が多いと画面が時間切れになる。
  //    先にまとめて引いて、照合は手元でやる。
  const known = await prisma.member.findMany({
    where: { tenantId, sourceKey: { not: null } },
    select: { id: true, sourceKey: true, summitEvents: true, summitRole: true, listed: true },
  });
  const bySource = new Map(known.map((m) => [m.sourceKey as string, m]));

  const emails = [...new Set(people.map((p) => normalizeEmail(p.email)).filter(Boolean))];
  type EmailHit = {
    id: string; summitEvents: string[]; sourceKey: string | null; listed: boolean;
    contactName: string | null; contactKana: string | null; contactRole: string | null;
    contactPhotoUrl: string | null; contactBio: string | null; website: string | null;
  };
  const byEmail = new Map<string, EmailHit>();
  // ⚠️ メールの数だけ IN 句に入れると長くなりすぎるので、小分けにする
  for (let i = 0; i < emails.length; i += 300) {
    const chunk = emails.slice(i, i + 300);
    const rows = await prisma.member.findMany({
      where: {
        tenantId,
        OR: [{ preregEmail: { in: chunk } }, { users: { some: { email: { in: chunk } } } }],
      },
      select: {
        id: true, summitEvents: true, sourceKey: true, listed: true,
        contactName: true, contactKana: true, contactRole: true,
        contactPhotoUrl: true, contactBio: true, website: true,
        preregEmail: true, users: { select: { email: true } },
      },
    });
    for (const r of rows) {
      const keys = [r.preregEmail ?? "", ...r.users.map((u) => u.email)].map((e) => e.toLowerCase());
      for (const k of keys) if (k && !byEmail.has(k)) byEmail.set(k, r);
    }
  }

  for (const p of people) {
    const sourceKey = clean(p.sourceKey, 120);
    if (!sourceKey) continue;
    const email = normalizeEmail(p.email);
    const role = p.kind === "speaker" ? "speaker" : "attendee";
    if (role === "speaker") out.speaker++;
    else out.attendee++;

    // ① この印で、すでに預かっていないか
    const hit = bySource.get(sourceKey);
    if (hit) {
      const merged = mergeEvents(hit.summitEvents, p.events);
      // ⚠️ 変わっていなければ書かない（311回の無駄な書き込みを避ける）
      if (merged.length !== hit.summitEvents.length || hit.summitRole !== role) {
        await prisma.member.update({
          where: { id: hit.id },
          data: { summitEvents: merged, summitRole: role },
        });
      }
      out.updated++;
      continue;
    }

    if (!email) { out.skippedNoEmail++; continue; }

    // ② すでに本人が使っている会員か（メールで突き合わせる）。
    //    ⚠️⚠️ いたら作らない。開催の記録だけ足す（本人の書いたものを上書きしない）
    const ex = byEmail.get(email);
    if (ex && !ex.id) {
      // 同じメールの方がこの回ですでに作られている（まだDBのidを持たない仮の印）。
      // ⚠️ id が空のまま update すると落ちるので、ここで打ち切る。次回の取り込みで拾われる。
      out.updated++;
      continue;
    }
    if (ex) {
      // ⚠️⚠️ **本人が書いたものは絶対に上書きしない。**
      //    空欄のときだけ、イベント側の情報で埋める（登壇者の顔写真・肩書が入らない、を直す / 2026-11-25）
      const fill: Record<string, string> = {};
      const put = (k: keyof EmailHit, v: string | null, max: number) => {
        const t = clean(v, max);
        if (t && !ex[k]) fill[k] = t;
      };
      put("contactName", p.name, 80);
      put("contactKana", p.nameKana, 80);
      put("contactRole", p.title, 80);
      put("contactPhotoUrl", absolutize(p.photoUrl), 500);
      put("contactBio", p.bio, 2000);
      put("website", absolutize(p.websiteUrl), 300);
      await prisma.member.update({
        where: { id: ex.id },
        data: {
          summitEvents: mergeEvents(ex.summitEvents, p.events),
          summitRole: role,
          ...(ex.sourceKey ? {} : { sourceKey }),
          ...fill,
        },
      });
      Object.assign(ex, fill);
      if (!ex.sourceKey) bySource.set(sourceKey, { ...ex, summitRole: role });
      if (ex.listed) out.linked++;
      else out.updated++;
      continue;
    }

    // ③ 新しく預かる。⚠️ 必ず非公開。メールは送らない
    // ⚠️⚠️ 1回に作る数を区切る。残りは、もう一度押せば続きから入る（印で突き合わせるので重複しない）
    if (out.created >= CREATE_PER_RUN) { out.remaining++; continue; }
    await prisma.member.create({
      data: {
        tenantId,
        name: clean(p.company) || clean(p.name) || "（事業者名 未記入）",
        contactName: clean(p.name, 80) || null,
        contactKana: clean(p.nameKana, 80) || null,
        contactRole: clean(p.title, 80) || null,
        contactPhotoUrl: clean(absolutize(p.photoUrl), 500) || null,
        contactBio: clean(p.bio, 2000) || null,
        website: clean(absolutize(p.websiteUrl), 300) || null,
        categoryL1: "その他",
        status: "APPROVED",
        listed: false,
        sourceKey,
        summitEvents: mergeEvents([], p.events),
        summitRole: role,
        preregEmail: email,
        preregNote: role === "speaker" ? "イベントのご登壇者" : "イベントのご参加者",
        preregBy: actorName,
        preregAt: now,
      },
    });
    out.created++;
    byEmail.set(email, {
      id: "", summitEvents: p.events, sourceKey, listed: false,
      contactName: p.name, contactKana: p.nameKana, contactRole: p.title,
      contactPhotoUrl: p.photoUrl, contactBio: p.bio, website: p.websiteUrl,
    });
  }

  return out;
}
