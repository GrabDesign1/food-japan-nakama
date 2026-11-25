import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { listMemberLinks } from "@/lib/member-links";
import { prisma } from "@/lib/db";
import { INDUSTRY_LABEL } from "@/lib/member-taxonomy";
import { OfferingCard } from "@/components/OfferingCard";
import { views24hMap } from "@/lib/offering-views";
import { toggleFavoriteMember } from "../actions";
import { startConversation } from "../../messages/actions";
import { btn, h1Cls, h2Cls } from "@/lib/ui";
import { safeInternalPath } from "@/lib/security";
import { loadMemberWall } from "@/lib/feed";
import { PostCard, type Author } from "../../feed/_components/PostCard";

export default async function ProducerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  // 呼び出し元（届いた提案の一覧など）から ?from= で戻り先を受け取る。
  // 指定が無ければ従来どおり検索へ戻す。外部URLは safeInternalPath で弾く。
  const sp = (await searchParams) ?? {};
  const backHref = sp.from ? safeInternalPath(sp.from, "/search") : "/search";
  const backLabel = backHref === "/search" ? "← 検索に戻る" : "← 戻る";
  const su = await getSessionUser();
  if (!su) redirect("/login");

  const m = await prisma.member.findUnique({
    where: { id },
    include: {
      offerings: {
        where: { isPublic: true, visibility: "public", title: { not: "" } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!m) notFound();

  const isOwner = m.id === su.app.memberId;
  // 非公開の会員（listed=false）は、本人以外には存在ごと見せない（2026-11-23）
  if ((m.status !== "APPROVED" || !m.listed) && !isOwner) notFound();

  // この事業者の「取り組み」（＝投稿）。
  // ⚠️ カードを交換していない相手の投稿は空が返る（判定は feed.ts）。
  //    プロフィールは承認済みなら誰でも開けるので、ここに投稿を出す判定を足さない。
  const wall = su.app.memberId
    ? await loadMemberWall(su.app.memberId, m.id, 5)
    : { posts: [], comments: {}, authors: [], hasMore: false, total: 0 };
  const wallAuthors: Record<string, Author> = {};
  for (const a of wall.authors) wallAuthors[a.id] = a;

  // 閲覧数マップ・お気に入り・スレッド有無は互いに独立なので並列で取得（直列3往復→1往復）
  const [viewMap, favorite, existingThread, exchange, links] = await Promise.all([
    views24hMap(m.offerings.map((o) => o.id)),
    su.app.memberId
      ? prisma.favorite.findUnique({
          where: {
            memberId_targetType_targetId: {
              memberId: su.app.memberId,
              targetType: "member",
              targetId: m.id,
            },
          },
        })
      : Promise.resolve(null),
    su.app.memberId && !isOwner
      ? prisma.thread.findFirst({
          where: {
            // メッセージが1通以上あるスレッドだけ「やり取りあり」とみなす
            messages: { some: {} },
            OR: [
              { fromMemberId: su.app.memberId, toMemberId: m.id },
              { fromMemberId: m.id, toMemberId: su.app.memberId },
            ],
          },
        })
      : Promise.resolve(null),
    // 名刺を交換しているか（2026-11-23）。タイムラインを出すかどうかの判定に使う。
    // ⚠️ 「投稿が0件」と「交換していないから読めない」は別物。混ぜると誤解される
    su.app.memberId && !isOwner
      ? prisma.cardExchange.findFirst({
          where: {
            OR: [
              { memberAId: su.app.memberId, memberBId: m.id },
              { memberAId: m.id, memberBId: su.app.memberId },
            ],
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    listMemberLinks(m.id),
  ]);
  const isFavorited = !!favorite;
  // 自分、または名刺を交換した相手だけ、タイムラインが読める
  const canSeeWall = isOwner || !!exchange;

  // 人を先に立てる（2026-11-23 ユーザー指示「担当者の紹介ができてないよ」）。
  // ⚠️ 担当者名が未入力の既存会員は、これまでどおり事業者名を見出しにする（空白にしない）
  const personName = m.contactName?.trim() || null;
  const headline = personName ?? (m.name || "（未入力）");
  const faceUrl = m.contactPhotoUrl ?? m.avatarUrl ?? null;

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
      <Link href={backHref} className="text-[12px] text-[var(--green-d)] underline">
        {backLabel}
      </Link>

      {/* ヘッダー：人が先、会社はその下（2026-11-23 ユーザー指示）。
          ⚠️ 会員は会社だが、会うのは人。最初に顔と名前と肩書を出す。 */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--line)] bg-white font-serif text-[26px] text-[var(--green-d)]">
          {faceUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={faceUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            (headline?.[0] ?? "?").toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className={h1Cls}>{headline}</h1>
          {m.contactRole ? (
            <p className="mt-0.5 text-[14px] font-medium text-[var(--green-d)]">{m.contactRole}</p>
          ) : null}
          {/* 担当者名が入っているときだけ、会社名を下の行に出す（同じ名前を2回出さない） */}
          {personName ? (
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-[14px] text-[var(--ink)]">{m.name || "（事業者名 未入力）"}</span>
              {m.companyLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.companyLogoUrl}
                  alt={`${m.name}の会社ロゴ`}
                  className="h-7 max-w-[140px] object-contain"
                />
              ) : null}
            </div>
          ) : m.companyLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={m.companyLogoUrl}
              alt={`${m.name}の会社ロゴ`}
              className="mt-1 h-8 max-w-[160px] object-contain"
            />
          ) : null}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--ink-2)]">
            {area ? <span>📍 {area}</span> : null}
            <span>💼 {INDUSTRY_LABEL[m.categoryL1] ?? m.categoryL1}</span>
            <span className="rounded bg-[var(--green-soft)] px-2 py-0.5 text-[11px] text-[var(--green-d)]">
              {m.categoryL1}
              {m.categoryL2 ? ` / ${m.categoryL2}` : ""}
            </span>
            {canSeeWall && !isOwner ? (
              <span className="rounded bg-[var(--green)] px-2 py-0.5 text-[11px] font-bold text-white">
                名刺を交換済み
              </span>
            ) : null}
          </div>
        </div>

        {!isOwner ? (
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto">
            {!existingThread ? (
              <form action={startConversation.bind(null, m.id)}>
                <button className={`${btn("primary")} w-full`}>
                  💬 問い合わせする
                </button>
              </form>
            ) : null}
            <form action={toggleFavoriteMember.bind(null, m.id)}>
              <button
                className={`w-full rounded-lg px-4 py-2 text-[13px] font-medium transition ${
                  isFavorited
                    ? "bg-[var(--yuzu-soft,#FAF0D6)] text-[var(--amber)]"
                    : "border border-[var(--green)] text-[var(--green-d)] hover:bg-[var(--green-soft)]"
                }`}
              >
                {isFavorited ? "★ お気に入り済み" : "☆ お気に入りに追加"}
              </button>
            </form>
          </div>
        ) : null}
      </div>

      {/* 担当者のひとこと（本人の自己紹介）。事業紹介（description）とは別物 */}
      {m.contactBio ? (
        <p className="-mt-2 whitespace-pre-wrap text-[14px] leading-7 text-[var(--ink)]">
          {m.contactBio}
        </p>
      ) : null}

      {/* 発信しているところ（2026-11-25）。本人が登録したものだけ。
          ⚠️ 外部サイトへ出すので rel="noreferrer" を必ず付ける（どこから来たかを渡さない）。
          ⚠️ URL は member-links.ts の safeUrl を通ったものだけが来る。 */}
      {links.length > 0 ? (
        <div className="rounded-lg border border-[var(--line)] bg-[var(--canvas)] p-4">
          <p className="text-[11px] tracking-wider text-[var(--muted)]">発信しているところ</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {links.map((l) => (
              <li key={l.id}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-baseline gap-1.5 rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-[12px] text-[var(--ink)] hover:border-[var(--green-d)]"
                >
                  <span>{l.label}</span>
                  <span className="text-[10px] text-[var(--muted)]">{l.host}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

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
            className={`${btn("primary", "sm")} shrink-0`}
          >
            メッセージを見る →
          </Link>
        </div>
      ) : null}

      {/* ── タイムライン（2026-11-23 ユーザー指示「Facebookみたいなタイムライン制にして」）
          プロフィールの主役は、会社の仕様表ではなく、この人が何をしてきたか。
          ⚠️ 読めるのは**名刺を交換した相手だけ**。交換していない人には、
             投稿が0件なのか読めないのかを、はっきり書き分ける（黙って空にしない）。 */}
      <section>
        <h2 className={`${h2Cls} mb-3`}>
          {isOwner ? "あなたのタイムライン" : `${headline} のタイムライン`}
          {canSeeWall && wall.total > 0 ? (
            <span className="ml-2 text-[12px] font-normal text-[var(--muted)]">全{wall.total}件</span>
          ) : null}
        </h2>

        {!canSeeWall ? (
          <div className="rounded-[10px] border border-[var(--line)] bg-[var(--green-soft)] px-5 py-6 text-center">
            <p className="text-[14px] font-medium text-[var(--ink)]">
              名刺を交換すると、この方の取り組みが読めます。
            </p>
            <p className="mx-auto mt-1.5 max-w-[460px] text-[12px] leading-6 text-[var(--ink-2)]">
              交換するまで、投稿・コメント・いいねは見えません。
              会ったときに交換するか、こちらから問い合わせてください。
            </p>
            <Link href="/cards" className={`${btn("primary", "sm")} mt-4 inline-block`}>
              名刺を交換する →
            </Link>
          </div>
        ) : wall.posts.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-[var(--line)] px-5 py-6 text-center">
            <p className="text-[13px] text-[var(--muted)]">
              {isOwner
                ? "まだ何も書いていません。いま取り組んでいることを1本書くと、交換した相手に届きます。"
                : "まだ投稿がありません。"}
            </p>
            {isOwner ? (
              <Link href="/feed" className={`${btn("primary", "sm")} mt-4 inline-block`}>
                取り組みを書く →
              </Link>
            ) : null}
          </div>
        ) : (
          <>
            <ul className="flex max-w-[680px] flex-col gap-4">
              {wall.posts.map((pp) => (
                <li key={pp.id}>
                  <PostCard
                    post={pp}
                    author={wallAuthors[pp.authorMemberId]}
                    comments={wall.comments[pp.id] ?? []}
                    authorsById={wallAuthors}
                    isMine={pp.authorMemberId === su.app.memberId}
                  />
                </li>
              ))}
            </ul>
            {wall.hasMore ? (
              <p className="mt-3">
                <Link href="/feed" className="text-[13px] text-[var(--green-d)] hover:underline">
                  みんなの取り組みで、続きを読む →
                </Link>
              </p>
            ) : null}
          </>
        )}
      </section>

      {/* 事業紹介（会社の話。人の話は上の「ひとこと」） */}
      {m.description ? (
        <div>
          <h2 className={`${h2Cls} mb-2`}>事業紹介</h2>
          <p className="whitespace-pre-wrap text-[14px] leading-7 text-[var(--ink-2)]">
            {m.description}
          </p>
        </div>
      ) : null}

      {/* 事業の中身 */}
      {detailRows.some(([, v]) => v) ? (
        <div>
          <h2 className={`${h2Cls} mb-2`}>事業の中身</h2>
          <div className="overflow-hidden rounded-[10px] border border-[var(--line)]">
            <table className="w-full text-[14px]">
              <tbody>
                {detailRows
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <tr key={k} className="border-b border-[var(--line-soft)] last:border-0">
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
          <h2 className={`${h2Cls} mb-3`}>
            この事業者の「売りたい・探している」
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
        <h2 className={`${h2Cls} mb-2`}>事業者情報</h2>
        <div className="overflow-hidden rounded-[10px] border border-[var(--line)]">
          <table className="w-full text-[14px]">
            <tbody>
              {infoRows.map(([k, v]) => (
                <tr key={k} className="border-b border-[var(--line-soft)] last:border-0">
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
