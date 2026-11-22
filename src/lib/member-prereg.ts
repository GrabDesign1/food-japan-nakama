// 事務局が本人より先に会員を登録する（2026-11-23）。
//
// なぜ必要か（ユーザー指示 2026-11-23）:
//   「宮崎と名古屋の登壇者をここに正会員として、登録し非公開の設定でまずは登録してもらえないか」
//   登壇者には先に席を用意しておきたい。ただし本人がまだ承知していないうちは、
//   他の会員から見えてはいけない。
//
// ⚠️⚠️ **本人の同意なくメールを送らない**。ここでは User（ログイン）を作らず、
//    招待メールも確認メールも一切送らない。作るのは Member の行だけ。
//    送るかどうか・いつ送るかは、事務局が人の判断で決める。
// ⚠️ 作る会員は必ず listed=false。**公開は別の操作**（publishMember）にする。
//    作成と公開を1回の操作にまとめると、確認前に世に出てしまう。
// ⚠️ ここに入れるのは**登壇者という立場で表に出している情報**（会社名・氏名・肩書）に限る。
//    名刺で受け取った私的な連絡先を、本人に断りなくここへ写さないこと。
import { prisma } from "@/lib/db";
import type { Member } from "@/generated/prisma/client";

export type PreregInput = {
  /** 事業者名（必須） */
  name: string;
  /** 担当者名＝登壇者ご本人 */
  contactName?: string;
  /** 業種の大分類（必須。member-taxonomy の値） */
  categoryL1: string;
  prefecture?: string;
  website?: string;
  /** 本人の連絡先。本人が同じメールで登録したとき、この行につなぐ鍵になる */
  email?: string;
  /** どの会のどの登壇か（例: 宮崎カンファレンス2026 DAY1 登壇） */
  note?: string;
};

export const PREREG_NAME_MAX = 120;
export const PREREG_NOTE_MAX = 500;

function norm(v: string | undefined, max: number): string | null {
  const s = (v ?? "").trim().slice(0, max);
  return s || null;
}

/** メールの表記ゆれを吸収する（つなぎ込みの鍵に使うため） */
export function normalizeEmail(v: string | undefined | null): string | null {
  const s = (v ?? "").trim().toLowerCase();
  if (!s) return null;
  // 形だけ確認する。配達できるかは確かめない（送らないので）
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return null;
  return s.slice(0, 200);
}

/**
 * 先に1件登録する。
 * ⚠️ 同じメールで二重に作らない（二重に作ると、本人がどちらにつながるか分からなくなる）。
 */
export async function preregisterMember(
  by: { tenantId: string; name: string },
  input: PreregInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const name = norm(input.name, PREREG_NAME_MAX);
  if (!name) return { ok: false, error: "事業者名を入れてください。" };
  const categoryL1 = norm(input.categoryL1, 50);
  if (!categoryL1) return { ok: false, error: "業種を選んでください。" };

  const email = normalizeEmail(input.email);
  if (input.email?.trim() && !email) {
    return { ok: false, error: "メールアドレスの形を確認してください。" };
  }

  if (email) {
    // すでにログインを持っている人なら、先に登録する必要がない
    const user = await prisma.user.findFirst({
      where: { tenantId: by.tenantId, email },
      select: { id: true },
    });
    if (user) {
      return { ok: false, error: "このメールの方は、すでにご自身で登録されています。" };
    }
    const dup = await prisma.member.findFirst({
      where: { tenantId: by.tenantId, preregEmail: email },
      select: { name: true },
    });
    if (dup) {
      return { ok: false, error: `このメールは「${dup.name}」で登録済みです。` };
    }
  }

  const member = await prisma.member.create({
    data: {
      tenantId: by.tenantId,
      name,
      contactName: norm(input.contactName, 80),
      categoryL1,
      prefecture: norm(input.prefecture, 20),
      website: norm(input.website, 300),
      // 正会員として登録する（ユーザー指示）。ただし誰にも見せない
      status: "APPROVED",
      listed: false,
      preregEmail: email,
      preregNote: norm(input.note, PREREG_NOTE_MAX),
      preregBy: by.name.slice(0, 80),
      preregAt: new Date(),
    },
    select: { id: true },
  });
  return { ok: true, id: member.id };
}

/** 先に登録してある会員の一覧（まだ本人のログインがつながっていないものを先に出す） */
export async function listPreregistered(tenantId: string): Promise<
  (Pick<Member, "id" | "name" | "contactName" | "categoryL1" | "prefecture" | "listed" | "preregEmail" | "preregNote" | "preregBy" | "preregAt"> & {
    linked: boolean;
  })[]
> {
  const rows = await prisma.member.findMany({
    where: { tenantId, preregAt: { not: null } },
    orderBy: [{ listed: "asc" }, { preregAt: "desc" }],
    select: {
      id: true, name: true, contactName: true, categoryL1: true, prefecture: true,
      listed: true, preregEmail: true, preregNote: true, preregBy: true, preregAt: true,
      users: { select: { id: true }, take: 1 },
    },
  });
  return rows.map(({ users, ...m }) => ({ ...m, linked: users.length > 0 }));
}

/** 非公開を解いて、他の会員に見えるようにする */
export async function publishMember(tenantId: string, memberId: string): Promise<boolean> {
  const r = await prisma.member.updateMany({
    where: { id: memberId, tenantId },
    data: { listed: true },
  });
  return r.count > 0;
}

/** 公開をやめて、また見えないようにする */
export async function unpublishMember(tenantId: string, memberId: string): Promise<boolean> {
  const r = await prisma.member.updateMany({
    where: { id: memberId, tenantId },
    data: { listed: false },
  });
  return r.count > 0;
}

/**
 * 本人が自分で登録したときに、先に用意してあった行へつなぐ。
 * ⚠️ つなぐのは**まだ誰のログインもぶら下がっていない行だけ**。
 *    すでに誰かが使っている会員に後から相乗りさせない（他社の情報が見えてしまう）。
 * ⚠️ つないでも listed は false のまま。**公開は事務局の操作**（本人が中身を整えたあと）。
 * 戻り値＝つないだ会員のid。該当が無ければ null。
 */
export async function claimPreregisteredMember(params: {
  tenantId: string;
  userId: string;
  email: string;
}): Promise<string | null> {
  const email = normalizeEmail(params.email);
  if (!email) return null;

  const candidate = await prisma.member.findFirst({
    where: {
      tenantId: params.tenantId,
      preregEmail: email,
      users: { none: {} },
    },
    select: { id: true },
  });
  if (!candidate) return null;

  // 競合（同時に2つのタブで登録）に備えて、空のままの行だけを更新する
  const linked = await prisma.user.updateMany({
    where: { id: params.userId, memberId: null },
    data: { memberId: candidate.id },
  });
  return linked.count > 0 ? candidate.id : null;
}

// ── まとめて取り込む（2026-11-23） ────────────────────────────
//
// なぜ必要か: 登壇者は宮崎62名・名古屋46名（重複を除いて約97名）。
//   1件ずつ画面から入れるのは現実的でない。
//
// ⚠️ 取り込んでも**送信は一切しない**（1件ずつと同じ）。作るのは Member の行だけ。
// ⚠️ 1行でも駄目なら全部やめる、にはしない。**行ごとに結果を返す**
//    （100行のうち3行が重複、で全部やり直しになると使えない）。
// ⚠️ 重複は**飛ばす**。上書きしない（事務局が後から直した内容を、取り込みで消さない）。

export const PREREG_IMPORT_MAX_ROWS = 300;

/** 取り込みの1行 */
export type PreregRow = {
  line: number;
  input: PreregInput;
};

export type PreregRowResult = {
  line: number;
  name: string;
  status: "added" | "skipped" | "error";
  message: string;
};

/**
 * 貼り付けた表を行に分ける。
 * 区切りはタブ（表計算から貼ると、こうなる）。タブが無ければカンマ。
 * 列の順: 事業者名 / 登壇者名 / 業種 / 都道府県 / メール / ホームページ / 控え
 */
export function parsePreregText(text: string): { rows: PreregRow[]; tooMany: boolean } {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const rows: PreregRow[] = [];
  let tooMany = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;
    // 見出し行は飛ばす
    if (i === 0 && /事業者名/.test(raw)) continue;

    const cells = (raw.includes("\t") ? raw.split("\t") : raw.split(",")).map((c) =>
      c.trim().replace(/^"(.*)"$/, "$1")
    );
    if (rows.length >= PREREG_IMPORT_MAX_ROWS) {
      tooMany = true;
      break;
    }
    rows.push({
      line: i + 1,
      input: {
        name: cells[0] ?? "",
        contactName: cells[1] ?? "",
        categoryL1: cells[2] ?? "",
        prefecture: cells[3] ?? "",
        email: cells[4] ?? "",
        website: cells[5] ?? "",
        note: cells[6] ?? "",
      },
    });
  }
  return { rows, tooMany };
}

/**
 * まとめて登録する。
 * ⚠️ 1件ずつ preregisterMember を通す（重複の判定・形の確認を二重に書かないため）。
 */
export async function importPreregistered(
  by: { tenantId: string; name: string },
  rows: PreregRow[]
): Promise<PreregRowResult[]> {
  const out: PreregRowResult[] = [];
  // 同じ貼り付けの中での重複も見る（DBに入る前なので preregisterMember では拾えない）
  const seenEmail = new Set<string>();

  for (const r of rows) {
    const name = r.input.name.trim();
    if (!name) {
      out.push({ line: r.line, name: "", status: "error", message: "事業者名が空です。" });
      continue;
    }
    const email = normalizeEmail(r.input.email);
    if (email && seenEmail.has(email)) {
      out.push({ line: r.line, name, status: "skipped", message: "同じメールがこの表の中で重複しています。" });
      continue;
    }

    const res = await preregisterMember(by, r.input);
    if (res.ok) {
      if (email) seenEmail.add(email);
      out.push({ line: r.line, name, status: "added", message: "非公開で登録しました。" });
    } else {
      // 「すでに登録済み」は失敗ではなく、飛ばしたものとして扱う
      const skipped = res.error.includes("登録済み") || res.error.includes("すでに");
      out.push({ line: r.line, name, status: skipped ? "skipped" : "error", message: res.error });
    }
  }
  return out;
}
