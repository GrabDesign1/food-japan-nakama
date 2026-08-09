import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import {
  categoryMeta,
  DIRECTION_LABEL,
  DIRECTION_SHORT,
  formatAmount,
  formatPrice,
  formatDeadline,
  TIMINGS,
} from "@/lib/offering-taxonomy";
import { INDUSTRY_LABEL } from "@/lib/member-taxonomy";
import { sendInterest } from "../../messages/actions";
import { toggleFavorite } from "../../favorites/actions";
import { UpgradeToMessage } from "@/components/UpgradeToMessage";
import { btn, h1Cls, h2Cls } from "@/lib/ui";

export default async function OfferingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const member = await getOrCreateMemberForUser(su);

  const offering = await prisma.offering.findUnique({
    where: { id },
    include: {
      member: {
        select: {
          id: true,
          name: true,
          status: true,
          prefecture: true,
          city: true,
          address: true,
          categoryL1: true,
          categoryL2: true,
          hasLicense: true,
          licenseName: true,
          size: true,
        },
      },
    },
  });
  if (!offering) notFound();

  const isOwner = offering.memberId === member.id;
  if (!offering.isPublic && !isOwner) notFound();
  // 停止・未承認会員の掲載は本人以外に見せない
  if (offering.member.status !== "APPROVED" && !isOwner) notFound();

  // 閲覧を記録し、直近24時間の閲覧数を集計
  await prisma.offeringView.create({
    data: { offeringId: offering.id, viewerUserId: su.app.id },
  });
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const views24h = await prisma.offeringView.count({
    where: { offeringId: offering.id, createdAt: { gte: since } },
  });

  // すでにこの相手とやり取りがあるか（メッセージCTA用）
  const existingThread = !isOwner
    ? await prisma.thread.findFirst({
        where: {
          OR: [
            { fromMemberId: member.id, toMemberId: offering.member.id },
            { fromMemberId: offering.member.id, toMemberId: member.id },
          ],
        },
      })
    : null;

  // お気に入り状態（非オーナーのみ）
  const myFavorite = !isOwner
    ? await prisma.favorite.findUnique({
        where: {
          memberId_targetType_targetId: { memberId: member.id, targetType: "offering", targetId: offering.id },
        },
      })
    : null;

  const meta = categoryMeta(offering.category);
  const isGive = offering.direction === "GIVE";
  const amount = formatAmount(offering);
  const hero = offering.imageUrls[0];
  const gallery = offering.imageUrls.slice(1);
  const points = (offering.points ?? "")
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);

  const infoRows: [string, string | null][] = [
    ["事業者", offering.member.name || "—"],
    ["地域", offering.area || [offering.member.prefecture, offering.member.city].filter(Boolean).join(" ") || "—"],
    ["カテゴリ", `${meta?.icon ?? ""} ${offering.category}`],
    ["数量・規模", amount],
    ["時期", offering.timing && TIMINGS.includes(offering.timing) ? offering.timing : offering.timing || null],
  ];

  // 取引条件（値がある項目だけ表示。旧案件で「未設定」を並べない）
  const priceBase = formatPrice(offering);
  const price = priceBase
    ? `${priceBase}${offering.priceTaxType ? `（${offering.priceTaxType}）` : ""}`
    : null;
  const tradeRows: [string, string | null][] = (
    [
      ["希望価格", price],
      ["提供可能量", amount],
      ["最小取引量", offering.minOrderText],
      ["商品・原料の状態", offering.itemCondition],
      ["保存状態", offering.storageType],
      ["賞味・取扱期限", offering.shelfLifeText],
      ["提供頻度", offering.supplyFrequency],
      ["受け渡し方法", offering.deliveryMethods.length ? offering.deliveryMethods.join("・") : null],
      ["送料負担", offering.shippingCostBearer],
      ["サンプル提供", offering.sampleAvailability],
      ["発送元・受渡地域", offering.area],
      ["募集期限", formatDeadline(offering.applicationDeadline)],
    ] as [string, string | null][]
  ).filter(([, v]) => !!v);

  return (
    <div className="mx-auto flex max-w-[820px] flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link href="/ledger" className={btn("secondary", "sm")}>
          ← 台帳一覧
        </Link>
        {isOwner ? (
          <Link
            href={`/ledger/${offering.id}/edit`}
            className={btn("secondary", "sm")}
          >
            編集する
          </Link>
        ) : offering.isPublic ? (
          <form action={toggleFavorite.bind(null, "offering", offering.id)}>
            <button className={btn("secondary", "sm")}>
              {myFavorite ? "★ お気に入り済み" : "☆ お気に入りに追加"}
            </button>
          </form>
        ) : null}
      </div>

      {/* タイトル・メタ */}
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span
            className={`rounded px-2.5 py-1 text-[12px] font-bold text-white ${
              isGive ? "bg-[var(--green)]" : "bg-[#B77F0B]"
            }`}
          >
            {DIRECTION_SHORT[offering.direction]}
          </span>
          <span className="rounded bg-[var(--green-soft)] px-2.5 py-1 text-[12px] text-[var(--green-d)]">
            {meta?.icon} {offering.category}
          </span>
          {offering.listingPurpose === "challenge" ? (
            <span className="rounded bg-[#FAF0D6] px-2.5 py-1 text-[12px] font-bold text-[#B77F0B]">
              課題を一緒に解決したい
            </span>
          ) : null}
          {!offering.isPublic ? (
            <span className="rounded bg-[var(--line)] px-2.5 py-1 text-[12px] text-[var(--ink-2)]">
              下書き（未公開）
            </span>
          ) : null}
        </div>
        <h1 className={`${h1Cls} leading-tight`}>
          {offering.title || "（無題）"}
        </h1>
        {offering.tagline ? (
          <p className="mt-1.5 text-[14px] leading-6 text-[var(--ink-2)]">{offering.tagline}</p>
        ) : null}

        {/* サブタイトル：所在地・関連カテゴリ */}
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-[var(--ink-2)]">
          <span className="flex items-center gap-1">
            <span className="text-[var(--green-d)]">📍</span>
            {offering.member.prefecture || offering.area || "—"}
          </span>
          <span className="flex items-center gap-1">
            <span>💼</span>
            {INDUSTRY_LABEL[offering.member.categoryL1] ?? offering.member.categoryL1}
          </span>
        </div>
        <div className="mt-1 text-[12px] text-[var(--muted)]">
          24時間以内に{" "}
          <b className="text-[var(--red)]">{views24h}</b>
          人が閲覧しています
        </div>
        {!isOwner && offering.isPublic ? (
          <a href="#inquiry" className={`${btn("primary", "sm")} mt-3 inline-block`}>
            この案件について問い合わせる ↓
          </a>
        ) : null}

        {offering.tags.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {offering.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-[var(--line)] px-3 py-1 text-[12px] text-[var(--ink-2)]"
              >
                # {t}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* ヒーロー画像 */}
      {hero ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={hero}
          alt=""
          className="max-h-[440px] w-full rounded-xl border border-[var(--line)] object-cover"
        />
      ) : (
        <div className="grid aspect-[16/9] w-full place-items-center rounded-xl border border-[var(--line)] bg-[var(--green-soft)] text-[64px] opacity-60">
          {meta?.icon ?? "📦"}
        </div>
      )}

      {/* 情報表 */}
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

      {/* 取引条件（買い手が問い合わせ前に判断するための情報） */}
      {tradeRows.length ? (
        <div>
          <h2 className={`${h2Cls} mb-2`}>取引条件</h2>
          <div className="overflow-hidden rounded-[10px] border border-[var(--line)]">
            <table className="w-full text-[14px]">
              <tbody>
                {tradeRows.map(([k, v]) => (
                  <tr key={k} className="border-b border-[#EDF0EA] last:border-0">
                    <th className="w-[140px] bg-[var(--green-soft)] px-4 py-3 text-left align-top font-medium text-[var(--ink-2)]">
                      {k}
                    </th>
                    <td className={`px-4 py-3 text-[var(--ink)] ${k === "希望価格" ? "font-bold text-[var(--green-d)]" : ""}`}>
                      {v}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {offering.specification ? (
            <p className="mt-2 whitespace-pre-wrap rounded-[10px] border border-[var(--line)] bg-white px-4 py-3 text-[13px] leading-6 text-[var(--ink-2)]">
              <b className="text-[var(--ink)]">品質・規格：</b>
              {offering.specification}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* 希望する相手・活用用途 */}
      {offering.desiredPartner ? (
        <div>
          <h2 className={`${h2Cls} mb-2`}>希望する相手・活用用途</h2>
          <p className="whitespace-pre-wrap text-[14px] leading-7 text-[var(--ink-2)]">
            {offering.desiredPartner}
          </p>
        </div>
      ) : null}

      {/* 連絡する（興味を送る） */}
      <div id="inquiry" className="scroll-mt-24">
      {!isOwner ? (
        member.paymentStatus !== "PAID" && !existingThread ? (
          <UpgradeToMessage targetName={offering.member.name} />
        ) : existingThread ? (
          <div className="flex items-center justify-between rounded-[10px] border border-[var(--green)] bg-[var(--green-soft)] px-5 py-4">
            <span className="text-[13px] text-[var(--green-d)]">
              {offering.member.name} とはすでにやり取りがあります。
            </span>
            <Link
              href={`/messages/${existingThread.id}`}
              className={btn("primary", "sm")}
            >
              メッセージを見る →
            </Link>
          </div>
        ) : (
          <form
            action={sendInterest.bind(null, offering.member.id, offering.id)}
            className="rounded-[10px] border border-[var(--green)] bg-[var(--green-soft)] p-5"
          >
            <div className="text-[14px] font-semibold text-[var(--ink)]">
              この案件について問い合わせる
            </div>
            <p className="mb-2 mt-0.5 text-[12px] text-[var(--ink-2)]">
              価格、数量、受け渡し方法などを{isGive ? "売り手" : "相手"}と相談できます（問い合わせ内容を送信 → 相手が確認 → 条件を相談）。
            </p>
            <textarea
              name="message"
              required
              rows={3}
              placeholder={`はじめまして。「${offering.title || "こちらの投稿"}」について相談させてください。`}
              className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--green)]"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-[var(--muted)]">
                送信すると {offering.member.name} にメッセージが届きます。
              </span>
              <button className={btn("primary")}>
                メッセージを送る
              </button>
            </div>
          </form>
        )
      ) : null}
      </div>

      {/* この商品・原料について */}
      {offering.description || offering.descriptionImageUrl ? (
        <div>
          <h2 className={`${h2Cls} mb-2`}>この商品・原料について</h2>
          {offering.description ? (
            <p className="whitespace-pre-wrap text-[14px] leading-7 text-[var(--ink-2)]">
              {offering.description}
            </p>
          ) : null}
          {offering.descriptionImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={offering.descriptionImageUrl}
              alt=""
              className="mt-3 max-h-[400px] w-full rounded-xl border border-[var(--line)] object-cover"
            />
          ) : null}
        </div>
      ) : null}

      {/* 特徴・こだわり（他との違い） */}
      {offering.featureDiff ? (
        <div>
          <h2 className={`${h2Cls} mb-2`}>特徴・こだわり</h2>
          <p className="whitespace-pre-wrap text-[14px] leading-7 text-[var(--ink-2)]">{offering.featureDiff}</p>
        </div>
      ) : null}

      {/* 生まれた背景・販売したい理由 */}
      {offering.backgroundStory ? (
        <div>
          <h2 className={`${h2Cls} mb-2`}>生まれた背景・販売したい理由</h2>
          <p className="whitespace-pre-wrap text-[14px] leading-7 text-[var(--ink-2)]">{offering.backgroundStory}</p>
        </div>
      ) : null}

      {/* 課題（課題解決型のみ・入力がある項目だけ表示） */}
      {offering.challengeCurrent || offering.challengeAsk || offering.challengeValue ? (
        <div className="rounded-[12px] border border-[#E7D9A6] bg-[#FFFBF0] p-5">
          <h2 className={`${h2Cls} mb-3`}>いま起きている課題と、求めている協力</h2>
          <div className="flex flex-col gap-4">
            {(
              [
                ["いま起きている課題", offering.challengeCurrent],
                ["課題の規模・期限", offering.challengeScale],
                ["これまで試したこと", offering.challengeTried],
                ["求めている協力・提案", offering.challengeAsk],
                ["解決後に生まれる価値", offering.challengeValue],
              ] as [string, string | null][]
            )
              .filter(([, v]) => !!v)
              .map(([k, v]) => (
                <div key={k}>
                  <h3 className="text-[13px] font-bold text-[#7A5A0B]">{k}</h3>
                  <p className="mt-1 whitespace-pre-wrap text-[14px] leading-7 text-[var(--ink-2)]">{v}</p>
                </div>
              ))}
          </div>
        </div>
      ) : null}

      {/* おすすめの使い方・売り場 */}
      {offering.usageIdeas ? (
        <div>
          <h2 className={`${h2Cls} mb-2`}>おすすめの使い方・売り場</h2>
          <p className="whitespace-pre-wrap text-[14px] leading-7 text-[var(--ink-2)]">{offering.usageIdeas}</p>
        </div>
      ) : null}

      {/* おすすめポイント */}
      {points.length || offering.pointsImageUrl ? (
        <div>
          <h2 className={`${h2Cls} mb-2`}>
            おすすめポイント
          </h2>
          {points.length ? (
            <div className="rounded-[10px] bg-[var(--green-soft)] p-5">
              <ol className="flex flex-col gap-3">
                {points.map((p, i) => (
                  <li key={i} className="flex gap-3 text-[14px] leading-6 text-[var(--ink)]">
                    <span className="font-serif text-[var(--green-d)]">{i + 1}</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
          {offering.pointsImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={offering.pointsImageUrl}
              alt=""
              className="mt-3 max-h-[400px] w-full rounded-xl border border-[var(--line)] object-cover"
            />
          ) : null}
        </div>
      ) : null}

      {/* ギャラリー */}
      {gallery.length ? (
        <div>
          <h2 className={`${h2Cls} mb-2`}>写真</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
        </div>
      ) : null}

      {/* 事業者情報 */}
      <div>
        <h2 className={`${h2Cls} mb-2`}>事業者情報</h2>
        <div className="overflow-hidden rounded-[10px] border border-[var(--line)]">
          <table className="w-full text-[14px]">
            <tbody>
              {(
                [
                  ["事業者名", offering.member.name || "—"],
                  ["会員種別", `${offering.member.categoryL1}${offering.member.categoryL2 ? " / " + offering.member.categoryL2 : ""}`],
                  ["本店所在地", ([offering.member.prefecture, offering.member.city].filter(Boolean).join("") + (offering.member.address ? " " + offering.member.address : "")).trim() || "—"],
                  ["許認可", offering.member.hasLicense ? `あり${offering.member.licenseName ? "：" + offering.member.licenseName : ""}` : "なし"],
                  ["従業員数", offering.member.size || "なし"],
                ] as [string, string][]
              ).map(([k, v]) => (
                <tr key={k} className="border-b border-[#EDF0EA] last:border-0">
                  <th className="w-[140px] bg-[var(--green-soft)] px-4 py-3 text-left font-medium text-[var(--ink-2)]">
                    {k}
                  </th>
                  <td className="px-4 py-3 text-[var(--ink)]">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 末尾CTA（問い合わせフォームへ戻る） */}
      {!isOwner && offering.isPublic ? (
        <a href="#inquiry" className={`${btn("primary")} block w-full text-center`}>
          この案件について問い合わせる
        </a>
      ) : null}
    </div>
  );
}
