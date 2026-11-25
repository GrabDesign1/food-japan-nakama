// FOOD JAPAN SUMMIT 2026 in MIYAZAKI の開催報告（セッション記事の一覧）。
//
// ⚠️ 会員だけが読むページ。ログインが要る（(app) 配下なので middleware が守る）。
// ⚠️ 公開サイトからはリンクしない。検索にも出さない（robots: noindex）。
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { REPORTS, SUMMIT_EVENT, SUMMIT_HERO, SUMMIT_PHOTO_CREDIT } from "@/lib/summit-reports";
import { eyebrowCls, h1Cls } from "@/lib/ui";

export const metadata = {
  title: "開催報告｜FOOD JAPAN SUMMIT 2026 in MIYAZAKI",
  robots: { index: false, follow: false },
};

export default async function SummitReportsPage() {
  const su = await getSessionUser();
  if (!su) redirect("/login");

  return (
    <div className="mx-auto flex max-w-[820px] flex-col gap-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={SUMMIT_HERO}
        alt=""
        className="w-full rounded-lg border border-[var(--line)] object-cover"
      />
      <p className="-mt-3 text-[11px] text-[var(--muted)]">{SUMMIT_PHOTO_CREDIT}</p>

      <div>
        <p className={eyebrowCls}>REPORT</p>
        <h1 className={h1Cls}>{SUMMIT_EVENT.name}　開催報告</h1>
        <p className="mt-2 text-[13px] leading-7 text-[var(--ink-2)]">
          {SUMMIT_EVENT.date}、{SUMMIT_EVENT.place}で行われた全{REPORTS.length}セッションの記録です。
          登壇者の言葉をそのまま残すことを優先しました。
          <br />
          <strong>会員の方だけが読めます。</strong>外部への転載はご遠慮ください。
        </p>
      </div>

      <ol className="flex flex-col gap-3">
        {REPORTS.map((r, i) => (
          <li key={r.slug}>
            <Link
              href={`/summit/reports/${r.slug}`}
              className="block rounded-lg border border-[var(--line)] bg-white p-4 transition-colors hover:border-[var(--green-d)]"
            >
              <div className="flex items-center gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--green-soft)] text-[11px] text-[var(--green-d)]">
                  {i + 1}
                </span>
                {r.code ? (
                  <span className="rounded bg-[var(--canvas)] px-1.5 py-0.5 text-[10px] tracking-wider text-[var(--muted)]">
                    {r.code}
                  </span>
                ) : null}
              </div>
              <div className="mt-2 flex gap-3">
                {r.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.image}
                    alt=""
                    className="hidden h-[72px] w-32 shrink-0 rounded border border-[var(--line)] object-cover sm:block"
                  />
                ) : null}
                <p className="font-serif text-[17px] leading-7 text-[var(--ink)]">{r.title}</p>
              </div>
              <p className="mt-1 line-clamp-3 text-[12.5px] leading-6 text-[var(--ink-2)]">{r.lead}</p>
              <p className="mt-2 line-clamp-1 text-[11px] text-[var(--muted)]">
                {r.speakers.join("／")}
              </p>
            </Link>
          </li>
        ))}
      </ol>

      <div className="rounded-lg border border-[var(--line)] bg-[var(--canvas)] p-4 text-[12.5px] leading-6 text-[var(--ink-2)]">
        <p>
          この報告は、当日の記録をもとに作成しています。
          お名前・肩書・数字に誤りがありましたら、
          <Link href="/contact" className="underline">
            事務局
          </Link>
          までお知らせください。
        </p>
        <p className="mt-2">
          登壇・ご参加された方は
          <Link href="/summit" className="underline">
            サミットで会った人
          </Link>
          から探せます。
        </p>
      </div>
    </div>
  );
}
