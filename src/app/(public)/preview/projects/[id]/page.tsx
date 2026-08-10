import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getPublicProject } from "@/lib/public-content";
import { Paywall } from "../../../_components/Paywall";
import { PublicTopBar } from "../../../_components/PublicTopBar";
import { h1Cls } from "@/lib/ui";

const PREVIEW_CHARS = 140;

export default async function PublicProjectPreview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // ログイン済みは本編（アプリ内の詳細）へ
  const su = await getSessionUser();
  if (su) redirect(`/projects/${id}`);

  const p = await getPublicProject(id);
  if (!p) notFound();

  // 新形式（質問形式）の案件は「実現したいこと→課題」を、旧形式は body を抜粋する
  const body =
    p.body ??
    [p.coCreationGoal, p.challengeIssue].filter(Boolean).join("\n\n") ??
    "";
  const preview = body.slice(0, PREVIEW_CHARS);
  const remaining = Math.max(0, body.length - preview.length);
  const hero = p.imageUrls[0] ?? null;

  return (
    <>
      <PublicTopBar />
      <div className="mx-auto flex max-w-[760px] flex-col gap-6 px-4 py-10">
      <Link href="/" className="text-[12px] text-[var(--green-d)] underline">← トップに戻る</Link>

      <div className="flex flex-col gap-2">
        <span className="w-fit rounded-full bg-[var(--green-soft)] px-3 py-1 text-[11px] font-bold text-[var(--green-d)]">
          共創プロジェクト
        </span>
        <h1 className={h1Cls}>{p.title || "（無題）"}</h1>
        {p.oneLiner ? (
          <p className="text-[14px] leading-6 text-[var(--ink-2)]">{p.oneLiner}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--muted)]">
          <span>{p.memberName}</span>
          {p.area ? <span>📍 {p.area}</span> : null}
          {p.budget ? <span>予算 {p.budget}</span> : null}
        </div>
      </div>

      {hero ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={hero} alt="" className="max-h-[380px] w-full rounded-xl border border-[var(--line)] object-cover" />
      ) : null}

      {preview ? (
        <p className="whitespace-pre-wrap text-[14px] leading-7 text-[var(--ink-2)]">
          {preview}
          {remaining > 0 ? "…" : ""}
        </p>
      ) : null}

      <Paywall remaining={remaining} />
      </div>
    </>
  );
}
