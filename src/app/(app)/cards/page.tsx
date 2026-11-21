// 交換カード。自分のカード（QRと交換コード）と、交換して集めたカードの一覧。
//
// ⚠️ **この機能の主戦場は会期中ではなく、会期が明けたあと**（ユーザー指示 2026-11-14）。
//    会場では紙の名刺交換が起きる。NAKAMA の役目は「あの時会った人とあとからつながり直す」ほう。
//    だから文言は「交換しましょう」より「**あの時の方とつながる**」を前に出している。
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { getOrCreateMyCard, listMyExchanges } from "@/lib/cards";
import { exchangeQrSvg, exchangeUrl } from "@/lib/card-qr";
import { defaultMetAt, isDuringSummit } from "@/lib/card-summit";
import { listMyContactCards } from "@/lib/contact-cards";
import { fadingPartners, listMyRelationships, myEffectiveCount } from "@/lib/relationship";
import { isAlive } from "@/lib/card-relationship";
import { removeCard } from "./scan/actions";
import { EmptyState } from "@/components/EmptyState";
import { eyebrowCls, h1Cls, h2Cls } from "@/lib/ui";
import { ExchangeForm } from "./ExchangeForm";
import { CardShare } from "./CardShare";
import { CardSettings } from "./CardSettings";
import { CardNote } from "./CardNote";

export const metadata = { title: "交換カード" };

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);

  const card = await getOrCreateMyCard({ id: me.id, tenantId: me.tenantId });
  const url = exchangeUrl(card.code);
  const [qr, exchanges, contactCards, relationships, fading, effective] = await Promise.all([
    exchangeQrSvg(url),
    listMyExchanges(me.id),
    listMyContactCards(me.id),
    listMyRelationships(me.id),
    fadingPartners(me.id),
    myEffectiveCount(me.id),
  ]);
  const stateByPartner = new Map(relationships.map((r) => [r.partnerMemberId, r]));

  // 相手の表示内容は Member から都度引く（カードに複製していないため）
  const partnerIds = [
    ...new Set([...exchanges.map((e) => e.partnerMemberId), ...fading.map((f) => f.partnerMemberId)]),
  ];
  const partners = partnerIds.length
    ? await prisma.member.findMany({
        where: { id: { in: partnerIds } },
        select: {
          id: true, name: true, avatarUrl: true, companyLogoUrl: true,
          categoryL1: true, prefecture: true, contactName: true,
        },
      })
    : [];
  const byId = new Map(partners.map((p) => [p.id, p]));
  const here = defaultMetAt();
  const needle = q.trim().toLowerCase();

  return (
    <div className="mx-auto max-w-[900px] px-4 py-8">
      <div className={eyebrowCls}>CARD</div>
      <h1 className={`${h1Cls} mt-1`}>交換カード</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink-2)]">
        名刺の代わりに交換するカードです。お互いが渡したときだけ成立します。
        {here ? `いま交換すると「${here}」で出会ったとして記録されます。` : null}
      </p>

      {/* 自分のカード */}
      <section className="mt-6 rounded-xl border border-[var(--line)] bg-white p-5">
        <h2 className={h2Cls}>あなたのカード</h2>
        <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
          <div
            className="shrink-0 rounded-lg border border-[var(--line)] bg-white p-2 [&>svg]:block [&>svg]:h-[180px] [&>svg]:w-[180px]"
            // QRはサーバーで作ったSVG。外部入力は含まない（自分の交換URLのみ）
            dangerouslySetInnerHTML={{ __html: qr }}
          />
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-[var(--ink)]">{me.name}</div>
            {me.contactName ? (
              <div className="text-[13px] text-[var(--ink-2)]">{me.contactName}</div>
            ) : null}
            <div className="mt-3 text-[11px] text-[var(--muted)]">交換コード</div>
            <div className="font-mono text-[22px] tracking-[0.18em] text-[var(--ink)]">{card.code}</div>
            <p className="mt-2 text-[12px] leading-relaxed text-[var(--muted)]">
              相手にQRを読み取ってもらうか、交換リンクを送ってください。
              読み取っただけでは成立せず、相手の画面で確認が必要です。
            </p>
            <CardShare code={card.code} url={url} />
          </div>
        </div>
        <CardSettings jobTitle={card.jobTitle} headline={card.headline} isActive={card.isActive} />
      </section>

      {/* 生きている関係 ──「枚数」ではなく「生きている数」を前に出す */}
      {relationships.length > 0 ? (
        <section className="mt-5 rounded-xl border border-[var(--line)] bg-white p-5">
          <div className="flex items-baseline justify-between">
            <h2 className={h2Cls}>生きている関係</h2>
            <span className="text-[13px] text-[var(--ink-2)]">
              <strong className="text-[20px] font-bold text-[var(--green-d)]">{effective}</strong>
              <span className="ml-1 text-[var(--muted)]">/ {relationships.length}</span>
            </span>
          </div>
          <p className="mt-1 text-[12px] leading-5 text-[var(--muted)]">
            やり取りが無いまま時間が経つと、関係は薄れていきます。
            枚数ではなく、いま生きている関係の数がその人の人脈です。
          </p>

          {fading.length > 0 ? (
            <>
              <h3 className="mt-4 text-[13px] font-bold text-[var(--ink)]">そろそろ、ご連絡を</h3>
              <ul className="mt-2 flex flex-col gap-2">
                {fading.map((f) => {
                  const p = byId.get(f.partnerMemberId);
                  if (!p) return null;
                  return (
                    <li
                      key={f.partnerMemberId}
                      className="flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <Link href={`/producers/${p.id}`} className="text-[13px] font-semibold text-[var(--ink)] hover:underline">
                          {p.name}
                        </Link>
                        <div className="text-[11px] text-[var(--muted)]">{f.state.hint}</div>
                      </div>
                      <Link href="/feed" className="shrink-0 text-[12px] text-[var(--green-d)] underline">
                        取り組みを見る
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="mt-3 text-[13px] text-[var(--ink-2)]">
              いまのところ、薄れかけている関係はありません。
            </p>
          )}
        </section>
      ) : null}

      {/* 相手のコードを入れる */}
      <section className="mt-5 rounded-xl border border-[var(--line)] bg-white p-5">
        <h2 className={h2Cls}>相手のカードを受け取る</h2>
        <ExchangeForm defaultMetAt={here} />
      </section>

      {/* 集めたカード */}
      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className={h2Cls}>交換したカード</h2>
          <span className="text-[12px] text-[var(--muted)]">{exchanges.length}枚</span>
        </div>

        {exchanges.length > 5 ? (
          <form method="get" className="mt-3">
            <input
              name="q"
              defaultValue={q}
              placeholder="名前・地域・出会った場で絞り込む"
              aria-label="交換したカードを絞り込む"
              className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-[13px]"
            />
          </form>
        ) : null}

        {exchanges.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="まだ交換したカードはありません"
              description={
                isDuringSummit()
                  ? "会場で出会った方と交換してみてください。"
                  : "サミットなどで出会った方とつながり直すところから始められます。"
              }
            />
          </div>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {exchanges.map((e) => {
              const p = byId.get(e.partnerMemberId);
              if (!p) return null;
              // 絞り込みは名前・分類・地域・出会った場・自分のメモを対象にする
              if (needle) {
                const hay = [p.name, p.contactName, p.categoryL1, p.prefecture, e.metAt, e.myNote]
                  .filter(Boolean).join(" ").toLowerCase();
                if (!hay.includes(needle)) return null;
              }
              return (
                <li key={e.exchangeId} className="rounded-xl border border-[var(--line)] bg-white p-4">
                  <Link href={`/producers/${p.id}`} className="text-[14px] font-semibold text-[var(--ink)] hover:underline">
                    {p.name}
                  </Link>
                  <div className="mt-0.5 text-[12px] text-[var(--ink-2)]">
                    {[p.categoryL1, p.prefecture].filter(Boolean).join("・")}
                  </div>
                  {(() => {
                    const rel = stateByPartner.get(p.id);
                    if (!rel) return null;
                    return (
                      <div
                        className={`mt-2 inline-block rounded px-2 py-0.5 text-[11px] ${
                          isAlive(rel.strength)
                            ? "bg-[var(--green-soft)] text-[var(--green-d)]"
                            : "bg-[var(--amber-bg)] text-[var(--amber-ink)]"
                        }`}
                      >
                        {rel.state.label}
                      </div>
                    );
                  })()}
                  {e.metAt ? (
                    <div className="mt-2 inline-block rounded bg-[#f3f3f1] px-2 py-0.5 text-[11px] text-[var(--ink-2)] sm:ml-2">
                      {e.metAt}
                    </div>
                  ) : null}
                  {e.myNote ? (
                    <p className="mt-2 whitespace-pre-wrap text-[12px] text-[var(--ink-2)]">{e.myNote}</p>
                  ) : null}
                  <CardNote exchangeId={e.exchangeId} note={e.myNote} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 取り込んだ名刺（持ち主にしか見えない） */}
      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className={h2Cls}>取り込んだ名刺</h2>
          <Link href="/cards/scan" className="text-[13px] text-[var(--green-d)] underline">
            名刺を取り込む
          </Link>
        </div>
        <p className="mt-1 text-[12px] leading-5 text-[var(--muted)]">
          いただいた紙の名刺です。<strong className="font-bold">あなたにしか見えません。</strong>
        </p>

        {contactCards.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="まだ取り込んだ名刺はありません"
              description="いただいた名刺を撮ると、お名前と連絡先を読み取って残せます。"
              actions={[{ label: "名刺を取り込む", href: "/cards/scan", variant: "primary" as const }]}
            />
          </div>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {contactCards.map((c) => {
              if (needle) {
                const hay = [c.name, c.company, c.jobTitle, c.metAt, c.note, ...c.tags]
                  .filter(Boolean).join(" ").toLowerCase();
                if (!hay.includes(needle)) return null;
              }
              return (
                <li key={c.id} className="rounded-xl border border-[var(--line)] bg-white p-4">
                  <div className="flex items-start gap-3">
                    {c.hasImage ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={`/api/card-images/${c.id}`}
                        alt=""
                        loading="lazy"
                        className="h-14 w-24 shrink-0 rounded border border-[var(--line)] object-cover"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold text-[var(--ink)]">{c.name}</div>
                      <div className="mt-0.5 text-[12px] text-[var(--ink-2)]">
                        {[c.company, c.jobTitle].filter(Boolean).join("　")}
                      </div>
                    </div>
                  </div>
                  {c.tags.length ? (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {c.tags.map((t) => (
                        <li key={t} className="rounded bg-[#f3f3f1] px-2 py-0.5 text-[11px] text-[var(--ink-2)]">
                          {t}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {c.metAt ? (
                    <div className="mt-2 text-[11px] text-[var(--muted)]">{c.metAt}</div>
                  ) : null}
                  {c.note ? (
                    <p className="mt-2 whitespace-pre-wrap text-[12px] text-[var(--ink-2)]">{c.note}</p>
                  ) : null}
                  <form action={removeCard} className="mt-3">
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className="text-[11px] text-[var(--muted)] hover:underline">
                      この名刺を削除する
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
