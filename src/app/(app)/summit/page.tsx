// FOOD JAPAN SUMMIT に関わった方の一覧（2026-11-25 ユーザー指示「参加した人のページをつくりたい」）。
//
// ⚠️⚠️ **出るのは、本人が「はい」と言った方だけ。**
//    事務局が預かっただけの方（listed:false）は1人も出ません（判定は summit-people.ts）。
// ⚠️ 会員だけが見るページ（ログインが要る）。公開サイトには出しません。
// ⚠️ 相手を数字で見せない決まりは守る（その人の活動量は出さない）。
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { loadSummitPeople } from "@/lib/summit-people";
import { INDUSTRY_LABEL } from "@/lib/member-taxonomy";
import { h1Cls, h2Cls } from "@/lib/ui";

export const metadata = { title: "サミットで会った人" };

function Face({
  url,
  initial,
}: {
  url: string | null;
  initial: string;
}) {
  return (
    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--line)] bg-white font-serif text-[16px] text-[var(--green-d)]">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </div>
  );
}

export default async function SummitPage({
  searchParams,
}: {
  searchParams?: Promise<{ e?: string }>;
}) {
  const su = await getSessionUser();
  if (!su) redirect("/login");

  const sp = (await searchParams) ?? {};
  const filter = sp.e?.trim() || undefined;
  const { people, events, speakers, attendees } = await loadSummitPeople(su.app.tenantId, filter);

  return (
    <div className="mx-auto flex max-w-[820px] flex-col gap-5">
      <div>
        <h1 className={h1Cls}>サミットで会った人</h1>
        <p className="mt-2 text-[13px] leading-7 text-[var(--ink-2)]">
          FOOD JAPAN SUMMIT にご登壇・ご参加された方のうち、
          <strong>NAKAMA を使うと決められた方</strong>です。
          名刺を交換すると、その方の取り組みが読めます。
        </p>
      </div>

      {/* 開催で絞る */}
      {events.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Link
            href="/summit"
            className={`rounded-full border px-3 py-1.5 text-[12px] transition ${
              !filter
                ? "border-[var(--green)] bg-[var(--green-soft)] font-medium text-[var(--green-d)]"
                : "border-[var(--line)] text-[var(--ink-2)] hover:border-[var(--green)]"
            }`}
          >
            すべて
          </Link>
          {events.map((e) => (
            <Link
              key={e}
              href={`/summit?e=${encodeURIComponent(e)}`}
              className={`rounded-full border px-3 py-1.5 text-[12px] transition ${
                filter === e
                  ? "border-[var(--green)] bg-[var(--green-soft)] font-medium text-[var(--green-d)]"
                  : "border-[var(--line)] text-[var(--ink-2)] hover:border-[var(--green)]"
              }`}
            >
              {e}
            </Link>
          ))}
        </div>
      ) : null}

      {people.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-[var(--line)] px-5 py-8 text-center">
          <p className="text-[13px] leading-7 text-[var(--muted)]">
            まだどなたも出ていません。
            <br />
            ご案内をお送りして、「使います」とお答えいただいた方から順に並びます。
          </p>
        </div>
      ) : (
        <>
          <p className="text-[12px] text-[var(--muted)]">
            ご登壇 {speakers}名・ご参加 {attendees}名
          </p>

          <ul className="flex flex-col divide-y divide-[var(--line-soft)] rounded-[10px] border border-[var(--line)] bg-white">
            {people.map((p) => {
              const person = p.contactName?.trim() || null;
              const headline = person ?? p.name;
              return (
                <li key={p.id}>
                  <Link
                    href={`/producers/${p.id}?from=${encodeURIComponent("/summit")}`}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-[var(--green-soft)]"
                  >
                    <Face
                      url={p.contactPhotoUrl ?? p.avatarUrl}
                      initial={(headline?.[0] ?? "?").toUpperCase()}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-[14px] font-medium text-[var(--ink)]">{headline}</span>
                        {p.contactRole ? (
                          <span className="text-[11px] text-[var(--muted)]">{p.contactRole}</span>
                        ) : null}
                        {p.summitRole === "speaker" ? (
                          <span className="rounded bg-[var(--green)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                            ご登壇
                          </span>
                        ) : null}
                      </div>
                      {person ? (
                        <div className="truncate text-[12px] text-[var(--ink-2)]">{p.name}</div>
                      ) : null}
                      <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-[var(--muted)]">
                        {p.prefecture ? <span>{p.prefecture}</span> : null}
                        <span>{INDUSTRY_LABEL[p.categoryL1] ?? p.categoryL1}</span>
                      </div>
                      {/* ⚠️ 開催名は長い。truncate（nowrap）だと横にはみ出すので、
                          折り返したうえで1行に収める（line-clamp） */}
                      {!filter && p.summitEvents.length ? (
                        <div className="mt-0.5 line-clamp-1 text-[11px] text-[var(--muted)]">
                          {p.summitEvents.join("・")}
                        </div>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-[11px] text-[var(--green-d)]">見る →</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <div>
        <h2 className={`${h2Cls} mb-2`}>見つからない方がいたら</h2>
        <p className="text-[12px] leading-7 text-[var(--muted)]">
          サミットでお会いしたのに出ていない方は、まだ「使う」とお答えいただいていないか、
          ご案内が届いていない可能性があります。事務局にお知らせください。
        </p>
      </div>
    </div>
  );
}
