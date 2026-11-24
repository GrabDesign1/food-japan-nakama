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

/** 1回に取り込む上限。⚠️ 際限なく作らない */
export const SYNC_MAX = 2000;

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
export async function syncFromOnegaizar(
  tenantId: string,
  actorName: string
): Promise<SyncResult> {
  const empty: SyncResult = {
    ok: false, created: 0, updated: 0, linked: 0,
    skippedNoEmail: 0, speaker: 0, attendee: 0,
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

  for (const p of people) {
    const sourceKey = clean(p.sourceKey, 120);
    if (!sourceKey) continue;
    const email = normalizeEmail(p.email);
    const role = p.kind === "speaker" ? "speaker" : "attendee";
    if (role === "speaker") out.speaker++;
    else out.attendee++;

    // ① この印で、すでに預かっていないか
    const bySource = await prisma.member.findUnique({
      where: { sourceKey },
      select: { id: true, summitEvents: true, listed: true },
    });
    if (bySource) {
      await prisma.member.update({
        where: { id: bySource.id },
        data: {
          summitEvents: mergeEvents(bySource.summitEvents, p.events),
          summitRole: role,
        },
      });
      out.updated++;
      continue;
    }

    if (!email) { out.skippedNoEmail++; continue; }

    // ② すでに本人が使っている会員か（メールで突き合わせる）。
    //    ⚠️⚠️ いたら作らない。開催の記録だけ足す（本人の書いたものを上書きしない）
    const existing = await prisma.member.findFirst({
      where: {
        tenantId,
        OR: [{ preregEmail: email }, { users: { some: { email } } }],
      },
      select: { id: true, summitEvents: true, sourceKey: true, listed: true },
    });
    if (existing) {
      await prisma.member.update({
        where: { id: existing.id },
        data: {
          summitEvents: mergeEvents(existing.summitEvents, p.events),
          summitRole: role,
          // 印がまだ無ければ付ける（次からは①で当たる）
          ...(existing.sourceKey ? {} : { sourceKey }),
        },
      });
      if (existing.listed) out.linked++;
      else out.updated++;
      continue;
    }

    // ③ 新しく預かる。⚠️ 必ず非公開。メールは送らない
    await prisma.member.create({
      data: {
        tenantId,
        name: clean(p.company) || clean(p.name) || "（事業者名 未記入）",
        contactName: clean(p.name, 80) || null,
        contactKana: clean(p.nameKana, 80) || null,
        contactRole: clean(p.title, 80) || null,
        // ⚠️ 登壇者の写真とプロフィールは公開サイトに出ているもの。参加者には無い
        contactPhotoUrl: clean(p.photoUrl, 500) || null,
        contactBio: clean(p.bio, 2000) || null,
        website: clean(p.websiteUrl, 300) || null,
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
  }

  return out;
}
