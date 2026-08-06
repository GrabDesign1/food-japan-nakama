import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { INDUSTRY_LABEL } from "@/lib/member-taxonomy";
import { OfferingCard } from "@/components/OfferingCard";
import { views24hMap } from "@/lib/offering-views";
import { toggleFavoriteMember } from "../actions";
import { startConversation } from "../../messages/actions";

export default async function ProducerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const su = await getSessionUser();
  if (!su) redirect("/login");

  const m = await prisma.member.findUnique({
    where: { id },
    include: {
      offerings: {
        where: { isPublic: true, title: { not: "" } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!m) notFound();

  const viewMap = await views24hMap(m.offerings.map((o) => o.id));

  const isOwner = m.id === su.app.memberId;
  if (m.status !== "APPROVED" && !isOwner) notFound();


  const isFavorited = su.app.memberId
    ? !!(await prisma.favorite.findUnique({
        where: {
          memberId_targetType_targetId: {
            memberId: su.app.memberId,
            targetType: "member",
            targetId: m.id,
          },
        },
      }))
    : false;

  const existingThread =
    su.app.memberId && !isOwner
      ? await prisma.thread.findFirst({
          where: {
            OR: [
              { fromMemberId: su.app.memberId, toMemberId: m.id },
              { fromMemberId: m.id, toMemberId: su.app.memberId },
            ],
          },
        })
      : null;

  const hero = m.imageUrls[0] ?? null;
  const gallery = m.imageUrls.slice(1);
  const area = [m.prefecture, m.city].filter(Boolean).join(" ");

  const infoRows: [string, string | null][] = [
    ["事業者名", m.name || "—"],
    ["会員種別", `${m.categoryL1}${m.categoryL2 ? " / " + m.categoryL2 : ""}`],
    ["本店所在地", ([m.prefecture, m.city].filter(Boolean).join("") + (m.address ? " " + m.address : "")).trim() || "—"],
    ["設立", m.founded],
    ["従業員数", m.size || "なし"],
    ["許認可", m.hasLicense ? `あり${m.licenseName ? "：" + m.licenseName : ""}` : "なし"],
    ["Webサイト", m.website],
  ];

  const detailRows: [string, string | null][] = [
    ["生産品目名", m.productItems],
    ["生産量", m.productVolume],
    ["強み・特徴", m.featureText],
    ["設備・加工能力", m.equipmentText],
    ["現在の販路・売り場", m.salesAreaText],
    ["現在の困りごと", m.logisticsText],
    ["余っている食材・規格外品", m.foodlossText],
    ["組みたい相手", m.collabStyle],
    ["解決したい課題", m.challengeText],
  ];

  return (
    <div className="mx-auto flex max-w-[820px] flex-col gap-6">
      <Link href="/search" className="text-[12px] text-[var(--green-d)] underline">
        ← 検索に戻る
      </Link>

      {/* ヘッダー */}
      <div className="flex items-center gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-white font-serif text-[24px] text-[var(--green-d)]">
          {m.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            (m.name?.[0] ?? "?").toUpperCase()
          )}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="font-serif text-[24px] text-[var(--ink)]">
              {m.name || "（未入力）"}
            </h1>
            {m.companyLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={m.companyLogoUrl}
                alt={`${m.name}の会社ロゴ`}
                className="h-8 max-w-[160px] object-contain"
              />
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--ink-2)]">
            {area ? <span>📍 {area}</span> : null}
            <span>💼 {INDUSTRY_LABEL[m.categoryL1] ?? m.categoryL1}</span>
            <span className="rounded bg-[var(--green-soft)] px-2 py-0.5 text-[11px] text-[var(--green-d)]">
              {m.categoryL1}
              {m.categoryL2 ? ` / ${m.categoryL2}` : ""}
            </span>
          </div>
        </div>

        {!isOwner ? (
          <div className="flex shrink-0 flex-col gap-2">
            {!existingThread ? (
              <form action={startConversation.bind(null, m.id)}>
                <button className="w-full rounded-lg bg-[var(--green)] px-4 py-2.5 text-center text-[13px] font-bold text-white transition hover:bg-[var(--green-d)]">
                  💬 問い合わせする
                </button>
              </form>
            ) : null}
            <form action={toggleFavoriteMember.bind(null, m.id)}>
              <button
                className={`w-full rounded-lg px-4 py-2 text-[13px] font-medium transition ${
                  isFavorited
                    ? "bg-[var(--yuzu-soft,#FAF0D6)] text-[#B77F0B]"
                    : "border border-[var(--green)] text-[var(--green-d)] hover:bg-[var(--green-soft)]"
                }`}
              >
                {isFavorited ? "★ お気に入り済み" : "☆ お気に入りに追加"}
              </button>
            </form>
          </div>
        ) : null}
      </div>

      {hero ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={hero}
          alt=""
          className="max-h-[420px] w-full rounded-xl border border-[var(--line)] object-cover"
        />
      ) : null}

      {/* すでにやり取りがある場合の案内 */}
      {!isOwner && existingThread ? (
        <div className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--green)] bg-[var(--green-soft)] px-5 py-4">
          <span className="text-[13px] text-[var(--green-d)]">
            この事業者とはすでにやり取りがあります。
          </span>
          <Link
            href={`/messages/${existingThread.id}`}
            className="shrink-0 rounded-md bg-[var(--green)] px-4 py-2 text-[13px] font-medium text-white hover:bg-[var(--green-d)]"
          >
            メッセージを見る →
          </Link>
        </div>
      ) : null}

      {m.description ? (
        <p className="whitespace-pre-wrap text-[14px] leading-7 text-[var(--ink-2)]">
          {m.description}
        </p>
      ) : null}

      {/* 事業の中身 */}
      {detailRows.some(([, v]) => v) ? (
        <div>
          <h2 className="mb-2 text-[16px] font-semibold text-[var(--ink)]">事業の中身</h2>
          <div className="overflow-hidden rounded-[10px] border border-[var(--line)]">
            <table className="w-full text-[14px]">
              <tbody>
                {detailRows
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <tr key={k} className="border-b border-[#EDF0EA] last:border-0">
                      <th className="w-[150px] bg-[var(--green-soft)] px-4 py-3 text-left align-top font-medium text-[var(--ink-2)]">
                        {k}
                      </th>
                      <td className="whitespace-pre-wrap px-4 py-3 text-[var(--ink)]">{v}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* ギャラリー */}
      {gallery.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {gallery.map((u) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={u}
              src={u}
              alt=""
              className="aspect-square w-full rounded-lg border border-[var(--line)] object-cover"
            />
          ))}
        </div>
      ) : null}

      {/* この生産者の共創プロジェクト */}
      {m.offerings.length ? (
        <div>
          <h2 className="mb-3 text-[16px] font-semibold text-[var(--ink)]">
            この事業者の「売りたい・買いたい」
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {m.offerings.map((o) => (
              <OfferingCard key={o.id} o={{ ...o, views24h: viewMap.get(o.id) ?? 0 }} />
            ))}
          </div>
        </div>
      ) : null}

      {/* 事業者情報 */}
      <div>
        <h2 className="mb-2 text-[16px] font-semibold text-[var(--ink)]">事業者情報</h2>
        <div className="overflow-hidden rounded-[10px] border border-[var(--line)]">
          <table className="w-full text-[14px]">
            <tbody>
              {infoRows.map(([k, v]) => (
                <tr key={k} className="border-b border-[#EDF0EA] last:border-0">
                  <th className="w-[140px] bg-[var(--green-soft)] px-4 py-3 text-left font-medium text-[var(--ink-2)]">
                    {k}
                  </th>
                  <td className="px-4 py-3 text-[var(--ink)]">{v || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
