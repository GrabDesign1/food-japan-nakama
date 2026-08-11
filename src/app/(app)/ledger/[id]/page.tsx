import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser, isAdminRole } from "@/lib/auth";
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
  SEEKING_TYPE_LABEL,
  REQUIREMENT_KIND_LABEL,
  REQUIREMENT_LEVELS,
  amountLabel,
} from "@/lib/offering-taxonomy";
import { INDUSTRY_LABEL } from "@/lib/member-taxonomy";
import { sendInterest } from "../../messages/actions";
import { toggleFavorite } from "../../favorites/actions";
import { btn, h1Cls, h2Cls } from "@/lib/ui";

// レンダー中のDate.now直呼びをlintが禁止しているため関数に切り出す
function last24hStart(): Date {
  return new Date(Date.now() - 24 * 60 * 60 * 1000);
}

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
      requirements: { orderBy: { sortOrder: "asc" } },
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
  const isAdmin = isAdminRole(su.app.role);
  if (!offering.isPublic && !isOwner && !isAdmin) notFound();
  // 停止・未承認会員の掲載は本人以外に見せない
  if (offering.member.status !== "APPROVED" && !isOwner && !isAdmin) notFound();
  // 非公開募集：所有者・事務局以外には存在ごと見せない（検索・OGP・APIにも出さない）
  if (offering.visibility === "private" && !isOwner && !isAdmin) notFound();

  // 閲覧の記録・スレッド有無・お気に入り状態は互いに独立なので並列で実行（直列4往復→2往復）
  const [, existingThread, myFavorite] = await Promise.all([
    prisma.offeringView.create({
      data: { offeringId: offering.id, viewerUserId: su.app.id },
    }),
    // すでにこの相手とやり取りがあるか（メッセージCTA用）
    !isOwner
      ? prisma.thread.findFirst({
          where: {
            OR: [
              { fromMemberId: member.id, toMemberId: offering.member.id },
              { fromMemberId: offering.member.id, toMemberId: member.id },
            ],
          },
        })
      : Promise.resolve(null),
    // お気に入り状態（非オーナーのみ）
    !isOwner
      ? prisma.favorite.findUnique({
          where: {
            memberId_targetType_targetId: { memberId: member.id, targetType: "offering", targetId: offering.id },
          },
        })
      : Promise.resolve(null),
  ]);
  // 24時間閲覧数は自分の閲覧を含めて数える（記録後にカウント＝従来と同じ値）
  const views24h = await prisma.offeringView.count({
    where: { offeringId: offering.id, createdAt: { gte: last24hStart() } },
  });

  // 応募者限定公開：会社名・事業者情報は「掲載者が返信した相手（承認）」だけに開示する
  let applicantRestricted = false;
  if (offering.visibility === "applicant_only" && !isOwner && !isAdmin) {
    const ownerReplied = existingThread
      ? await prisma.message.count({
          where: { threadId: existingThread.id, senderMemberId: offering.memberId },
        })
      : 0;
    applicantRestricted = ownerReplied === 0;
  }
  const memberDisplayName = applicantRestricted ? "非公開（提案・承認後に開示）" : offering.member.name;

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
    ["事業者", memberDisplayName || "—"],
    // 応募者限定公開では会員由来の所在地を出さない（都道府県＋市区町村＋業種で会員が特定できてしまう）
    [
      "地域",
      applicantRestricted
        ? offering.area || "非公開（提案・承認後に開示）"
        : offering.area || [offering.member.prefecture, offering.member.city].filter(Boolean).join(" ") || "—",
    ],
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
      [amountLabel(offering.category, offering.direction), amount],
      ["最小取引量", offering.minOrderText],
      ["商品・原料の状態", offering.itemCondition],
      ["保存状態", offering.storageType],
      ["賞味・取扱期限", offering.shelfLifeText],
      ["提供頻度", offering.supplyFrequency],
      ["受け渡し方法", offering.deliveryMethods.length ? offering.deliveryMethods.join("・") : null],
      ["送料負担", offering.shippingCostBearer],
      ["サンプル提供", offering.sampleAvailability],
      // 売りたい（提供したい）＝送り出す側なので「発送元」、探している（調達したい）＝受け取る側なので「発送先」
      [isGive ? "発送元・受渡地域" : "発送先・受取地域", offering.area],
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
          {!isGive && offering.seekingType ? (
            <span className="rounded bg-[#FAF0D6] px-2.5 py-1 text-[12px] font-bold text-[#B77F0B]">
              {SEEKING_TYPE_LABEL[offering.seekingType] ?? offering.seekingType}
            </span>
          ) : null}
          {!isGive && offering.isPublic ? (
            <span className="rounded bg-[var(--green-soft)] px-2.5 py-1 text-[12px] font-bold text-[var(--green-d)]">
              探している先を募集中
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
            {applicantRestricted
              ? offering.area || "非公開"
              : offering.member.prefecture || offering.area || "—"}
          </span>
          {applicantRestricted ? null : (
            <span className="flex items-center gap-1">
              <span>💼</span>
              {INDUSTRY_LABEL[offering.member.categoryL1] ?? offering.member.categoryL1}
            </span>
          )}
        </div>
        <div className="mt-1 text-[12px] text-[var(--muted)]">
          24時間以内に{" "}
          <b className="text-[var(--red)]">{views24h}</b>
          人が閲覧しています
        </div>
        {!isOwner && offering.isPublic ? (
          <a href="#inquiry" className={`${btn("primary", "sm")} mt-3 inline-block`}>
            {isGive ? "この案件について問い合わせる ↓" : "商品・原料を提案する ↓"}
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
      {/* 写真が無い場合はヒーロー枠ごと出さない（アイコンだけの大きな空白を作らない。
          売りたい・探しているとも同じ扱い。2026-08-11 ユーザー指定） */}
      {hero ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={hero}
          alt=""
          className="max-h-[440px] w-full rounded-xl border border-[var(--line)] object-cover"
        />
      ) : null}

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

      {/* 探している（WANT）：使用目的と条件（売り手が提案可否を判断するための情報） */}
      {!isGive && offering.usageContext ? (
        <div>
          <h2 className={`${h2Cls} mb-2`}>使用目的・販売先</h2>
          <p className="whitespace-pre-wrap rounded-[10px] border border-[var(--line)] bg-white p-4 text-[14px] leading-7 text-[var(--ink-2)]">
            {offering.usageContext}
          </p>
        </div>
      ) : null}
      {!isGive && offering.requirements.length ? (
        <div>
          <h2 className={`${h2Cls} mb-2`}>条件</h2>
          <div className="flex flex-col gap-3">
            {REQUIREMENT_LEVELS.map(([level, levelLabel]) => {
              const rows = offering.requirements.filter((r) => r.level === level);
              if (!rows.length) return null;
              return (
                <div
                  key={level}
                  className={`rounded-[10px] border p-4 ${
                    level === "must"
                      ? "border-[#E7C7BE] bg-[#FBF1EE]"
                      : level === "want"
                        ? "border-[#E7D9A6] bg-[#FFFBF0]"
                        : "border-[var(--green)] bg-[var(--green-soft)]"
                  }`}
                >
                  <div
                    className={`text-[12px] font-bold ${
                      level === "must"
                        ? "text-[var(--red)]"
                        : level === "want"
                          ? "text-[#7A5A0B]"
                          : "text-[var(--green-d)]"
                    }`}
                  >
                    {levelLabel}
                    {level === "negotiable" ? "（近い提案・代替案も歓迎）" : ""}
                  </div>
                  <ul className="mt-1.5 flex flex-col gap-1">
                    {rows.map((r) => (
                      <li key={r.id} className="flex items-start gap-2 text-[14px] leading-6 text-[var(--ink)]">
                        <span className="shrink-0 text-[12px] text-[var(--muted)]">
                          {REQUIREMENT_KIND_LABEL[r.kind] ?? r.kind}：
                        </span>
                        <span>{r.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

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
        existingThread ? (
          <div className="flex items-center justify-between rounded-[10px] border border-[var(--green)] bg-[var(--green-soft)] px-5 py-4">
            <span className="text-[13px] text-[var(--green-d)]">
              {memberDisplayName} とはすでにやり取りがあります。
            </span>
            <Link
              href={`/messages/${existingThread.id}`}
              className={btn("primary", "sm")}
            >
              メッセージを見る →
            </Link>
          </div>
        ) : !isGive ? (
          /* 「探している（調達したい）」への新規提案＝初回紹介料の対象。提案ページへ誘導する */
          <div className="rounded-[10px] border border-[var(--green)] bg-[var(--green-soft)] p-5">
            <div className="text-[14px] font-semibold text-[var(--ink)]">
              この案件に商品・原料を提案する
            </div>
            <p className="mb-3 mt-0.5 text-[12px] text-[var(--ink-2)]">
              提案できる商品・原料や対応できる条件を書いて送ると、募集企業と相談できます。
              初回の提案には紹介料（クレジット1件）がかかります。継続メッセージと、受けた問い合わせへの返信は無料です。
            </p>
            <Link href={`/ledger/${offering.id}/propose`} className={btn("primary")}>
              提案へ進む（料金の確認）→
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
              価格、数量、受け渡し方法などを売り手と相談できます（問い合わせ内容を送信 → 相手が確認 → 条件を相談）。問い合わせは無料です。
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
                送信すると {memberDisplayName} にメッセージが届きます。
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
            {isGive ? "おすすめポイント" : "備考"}
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

      {/* 事業者情報（応募者限定公開では承認前に開示しない） */}
      {applicantRestricted ? (
        <div className="rounded-[10px] border border-[var(--line)] bg-[var(--canvas)] p-5 text-[13px] text-[var(--muted)]">
          この案件は<b>応募者限定公開</b>です。会社名・事業者情報は、提案を送り、掲載者が承認（返信）した後に開示されます。
        </div>
      ) : (
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
      )}

      {/* 末尾CTA。提案（問い合わせ）とお気に入りを大きく2つ並べる（2026-08-11 ユーザー指定） */}
      {!isOwner && offering.isPublic ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <a href="#inquiry" className={`${btn("primary", "lg")} block w-full text-center`}>
            {isGive ? "問い合わせる" : "提案する"}
          </a>
          <form action={toggleFavorite.bind(null, "offering", offering.id)} className="w-full">
            <button className={`${btn("secondary", "lg")} w-full`}>
              {myFavorite ? "★ お気に入り済み" : "☆ お気に入りに追加"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
