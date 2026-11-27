/**
 * 【名刺とNAKAMA会員の突き合わせ】2026-11-28。
 *
 * 狙い＝**読み取った名刺の会社がNAKAMAにいたら、その場でつながれるようにする。**
 * これはエイトにはできない（会員名簿を持っているのはこちらだから）。名刺OCRが、
 * そのまま会員を増やす導線になる。
 *
 * ⚠️⚠️ **当てにいきすぎないこと。** 間違った相手に「この人です」と出すと、
 *    知らない会社へ仲間申請を送ってしまう。確信が持てる手がかり（メールの独自ドメイン、
 *    法人格を除いた社名の完全一致）だけを使い、惜しい一致は出さない。
 * ⚠️ 候補は最大3件。「この中にいますか？」と**本人に選ばせる**（勝手に結ばない）。
 */
import { prisma } from "@/lib/db";

/** 一般的なメールサービスのドメイン。⚠️ これで会社を当ててはいけない */
const PUBLIC_MAIL_DOMAINS = new Set([
  "gmail.com", "yahoo.co.jp", "ymail.ne.jp", "outlook.com", "outlook.jp", "hotmail.com",
  "hotmail.co.jp", "icloud.com", "me.com", "docomo.ne.jp", "ezweb.ne.jp", "au.com",
  "softbank.ne.jp", "i.softbank.jp", "nifty.com", "ocn.ne.jp", "biglobe.ne.jp",
  "so-net.ne.jp", "excite.co.jp", "live.jp", "msn.com",
]);

/** 法人格・記号・空白を落として、社名を比べられる形にする。 */
export function normalizeCompany(raw: string): string {
  if (!raw) return "";
  let s = raw.normalize("NFKC").toLowerCase();
  // 法人格（前にも後ろにも付く）
  s = s.replace(
    /(株式会社|有限会社|合同会社|合資会社|合名会社|一般社団法人|一般財団法人|公益社団法人|公益財団法人|特定非営利活動法人|社会福祉法人|医療法人|学校法人|農事組合法人|協同組合|\(株\)|\(有\)|㈱|㈲|co\.,?\s*ltd\.?|co\.?\s*ltd\.?|inc\.?|corp\.?|corporation|limited|llc|k\.k\.)/g,
    ""
  );
  // 空白・記号
  return s.replace(/[\s・,.。、ー\-—–_/\\()（）]/g, "");
}

/** URL・メールからドメインを取り出す（www. は落とす）。 */
export function domainOf(value: string): string | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  const at = v.lastIndexOf("@");
  let host = "";
  if (at >= 0) {
    host = v.slice(at + 1);
  } else {
    const m = /^(?:https?:\/\/)?([^/?#]+)/.exec(v);
    host = m ? m[1] : "";
  }
  host = host.replace(/^www\./, "").replace(/[^a-z0-9.\-]/g, "");
  if (!host.includes(".")) return null;
  return host;
}

export type CardMatch = {
  memberId: string;
  name: string;
  contactName: string | null;
  logoUrl: string | null;
  prefecture: string | null;
  /** なぜ候補に挙げたか（画面に出す。理由が見えないと選べない） */
  reason: string;
};

/**
 * 名刺の会社名・メール・URL から、同じテナントの会員を探す。
 * ⚠️ 自分自身は除く。⚠️ 候補は最大3件。
 */
export async function matchMembers(params: {
  tenantId: string;
  meId: string;
  company: string;
  email: string;
  website: string;
}): Promise<CardMatch[]> {
  const { tenantId, meId, company, email, website } = params;
  const key = normalizeCompany(company);
  const mailDomain = domainOf(email);
  const siteDomain = domainOf(website);
  const usableMailDomain =
    mailDomain && !PUBLIC_MAIL_DOMAINS.has(mailDomain) ? mailDomain : null;

  if (!key && !usableMailDomain && !siteDomain) return [];

  // ⚠️ 社名の正規化はJS側でやる（DB関数に持たせると法人格の一覧を二重管理することになる）。
  //    会員数は数百なので、必要な列だけ引いて突き合わせて問題ない。
  const members = await prisma.member.findMany({
    where: { tenantId, id: { not: meId } },
    select: {
      id: true,
      name: true,
      contactName: true,
      companyLogoUrl: true,
      avatarUrl: true,
      prefecture: true,
      website: true,
    },
  });

  const out: CardMatch[] = [];
  for (const m of members) {
    let reason = "";
    if (key && normalizeCompany(m.name) === key) {
      reason = "会社名が一致";
    } else {
      const theirs = domainOf(m.website ?? "");
      if (theirs && (theirs === usableMailDomain || theirs === siteDomain)) {
        reason = "ホームページのドメインが一致";
      }
    }
    if (!reason) continue;
    out.push({
      memberId: m.id,
      name: m.name,
      contactName: m.contactName,
      logoUrl: m.companyLogoUrl ?? m.avatarUrl ?? null,
      prefecture: m.prefecture,
      reason,
    });
    if (out.length >= 3) break;
  }
  return out;
}
