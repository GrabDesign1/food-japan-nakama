// 開催報告の1記事（1セッション）。会員だけが読む。
// ⚠️ 本文は src/lib/summit-reports.ts にあります。文章を直すときはそちらを。
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { REPORTS, findReport, SUMMIT_EVENT, SUMMIT_PHOTO_CREDIT } from "@/lib/summit-reports";
import { eyebrowCls, h1Cls, h3Cls } from "@/lib/ui";

export const metadata = { robots: { index: false, follow: false } };

export default async function SummitReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const su = await getSessionUser();
  if (!su) redirect("/login");

  const { slug } = await params;
  const r = findReport(slug);
  if (!r) notFound();

  const i = REPORTS.findIndex((x) => x.slug === r.slug);
  const prev = i > 0 ? REPORTS[i - 1] : null;
  const next = i < REPORTS.length - 1 ? REPORTS[i + 1] : null;

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-6">
      <div>
        <Link href="/summit/reports" className="text-[12px] text-[var(--muted)] underline">
          ← 開催報告の一覧
        </Link>
        <p className={`${eyebrowCls} mt-3`}>
          {SUMMIT_EVENT.name}
          {r.code ? `　${r.code}` : ""}
        </p>
        <h1 className={`${h1Cls} mt-1 leading-9`}>{r.title}</h1>
        <p className="mt-3 text-[14px] leading-8 text-[var(--ink)]">{r.lead}</p>
      </div>

      {r.image ? (
        <figure className="flex flex-col gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={r.image}
            alt=""
            className="w-full rounded-lg border border-[var(--line)] object-cover"
          />
          <figcaption className="text-[11px] text-[var(--muted)]">{SUMMIT_PHOTO_CREDIT}</figcaption>
        </figure>
      ) : null}

      <div className="rounded-lg border border-[var(--line)] bg-[var(--canvas)] p-4">
        <p className="text-[11px] tracking-wider text-[var(--muted)]">登壇</p>
        <ul className="mt-2 flex flex-col gap-1">
          {r.speakers.map((s) => (
            <li key={s} className="text-[13px] leading-6 text-[var(--ink)]">
              {s}
            </li>
          ))}
        </ul>
      </div>

      <article className="flex flex-col gap-7">
        {r.sections.map((s) => (
          <section key={s.h} className="flex flex-col gap-3">
            <h2 className="font-serif text-[18px] leading-8 text-[var(--ink)]">{s.h}</h2>
            {s.p.map((text, k) => (
              <p key={k} className="text-[13.5px] leading-8 text-[var(--ink-2)]">
                {text}
              </p>
            ))}
          </section>
        ))}
      </article>

      <div className="rounded-lg border border-[var(--green-d)] bg-white p-5">
        <h2 className={h3Cls}>持ち帰れること</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {r.takeaways.map((t) => (
            <li key={t} className="flex gap-2 text-[13px] leading-7 text-[var(--ink)]">
              <span className="shrink-0 text-[var(--green-d)]">・</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>

      <nav className="flex flex-col gap-2 border-t border-[var(--line)] pt-4 sm:flex-row sm:justify-between">
        {prev ? (
          <Link href={`/summit/reports/${prev.slug}`} className="text-[12.5px] leading-6 text-[var(--ink-2)] underline">
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/summit/reports/${next.slug}`} className="text-[12.5px] leading-6 text-[var(--ink-2)] underline sm:text-right">
            {next.title} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
