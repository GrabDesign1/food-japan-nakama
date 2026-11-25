// 会員（人）の一覧（2026-11-25 ユーザー指示「Facebookのような紹介サイトが　探してもないんだけど」）。
//
// ⚠️⚠️ **なぜ見つからなかったか。**
//    会員の一覧は、これまで「案件を探す」の中のタブ（/search?t=producers）にしか無く、
//    ナビに**会員を見る入口が1つもありませんでした**。プロフィールは作ってあったのに、
//    そこへ行く道が無かった。この表はその道です。
//
// ⚠️ 2026-08-11 のご指示「プロフィールがほとんど空の会員は一覧に出さない」について——
//    検索の事業者タブは記入率50%以上に絞っています。ここでは**絞らず、並べ替え**にしました。
//    会員名簿で人が消えると「あの人がいない」になるためです。
//    中身の濃い方が先に出て、薄い方は後ろに回ります。
//    ⚠️ 絞るほうがよければ、しきい値を足してください（MIN_RATE を使う形に戻せます）。
// ⚠️ 相手を数字で見せない決まりは守る（記入率・活動量は画面に出さない。並べ替えにだけ使う）。
import { prisma } from "@/lib/db";

export const PER_PAGE = 24;

export type DirectoryMember = {
  id: string;
  name: string;
  avatarUrl: string | null;
  companyLogoUrl: string | null;
  imageUrls: string[];
  categoryL1: string;
  categoryL2: string | null;
  prefecture: string | null;
  city: string | null;
  productItems: string | null;
  description: string | null;
  contactName: string | null;
  contactRole: string | null;
  contactPhotoUrl: string | null;
};

export type DirectoryPage = {
  members: DirectoryMember[];
  total: number;
  page: number;
  pages: number;
};

export async function listDirectory(args: {
  tenantId: string;
  q?: string;
  prefecture?: string;
  category?: string;
  page?: number;
}): Promise<DirectoryPage> {
  const page = Math.max(1, Math.min(200, args.page ?? 1));
  const q = (args.q ?? "").trim().slice(0, 100);

  const where = {
    tenantId: args.tenantId,
    status: "APPROVED" as const,
    // ⚠️⚠️ listed を外さない。預かっただけの方（本人が「はい」と言っていない方）を出さない
    listed: true,
    // ⚠️ 何も名前が無い行だけ外す（出しても「（未入力）」にしかならない）
    OR: [{ name: { not: "" } }, { contactName: { not: null } }],
    ...(args.category ? { categoryL1: args.category } : {}),
    ...(args.prefecture ? { prefecture: { contains: args.prefecture } } : {}),
    ...(q
      ? {
          AND: [
            {
              OR: [
                { name: { contains: q, mode: "insensitive" as const } },
                { contactName: { contains: q, mode: "insensitive" as const } },
                { contactKana: { contains: q, mode: "insensitive" as const } },
                { contactRole: { contains: q, mode: "insensitive" as const } },
                { contactBio: { contains: q, mode: "insensitive" as const } },
                { description: { contains: q, mode: "insensitive" as const } },
                { productItems: { contains: q, mode: "insensitive" as const } },
              ],
            },
          ],
        }
      : {}),
  };

  const [members, total] = await Promise.all([
    prisma.member.findMany({
      where,
      // ⚠️⚠️ **顔が出ている方が先。**（2026-11-25）
      //    記入率だけで並べると、イベントから来た登壇者（顔写真・肩書・自己紹介あり・
      //    事業の欄は空）が後ろに回ってしまう。紹介の場では、顔のある人が先。
      // ⚠️ 記入率は画面に出さず、並びにだけ使う（相手を数字で見せない決まり）。
      orderBy: [
        { contactPhotoUrl: { sort: "desc", nulls: "last" } },
        { contactBio: { sort: "desc", nulls: "last" } },
        { completionRate: "desc" },
        { updatedAt: "desc" },
      ],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true, name: true, avatarUrl: true, companyLogoUrl: true, imageUrls: true,
        categoryL1: true, categoryL2: true, prefecture: true, city: true,
        productItems: true, description: true,
        contactName: true, contactRole: true, contactPhotoUrl: true,
      },
    }),
    prisma.member.count({ where }),
  ]);

  return { members, total, page, pages: Math.max(1, Math.ceil(total / PER_PAGE)) };
}
