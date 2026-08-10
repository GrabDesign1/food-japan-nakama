import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getPublicOffering } from "@/lib/public-content";
import { Paywall } from "../../../_components/Paywall";
import { PublicTopBar } from "../../../_components/PublicTopBar";
import { categoryMeta, DIRECTION_SHORT, formatAmount } from "@/lib/offering-taxonomy";
import { h1Cls } from "@/lib/ui";

const PREVIEW_CHARS = 140;

export default async function PublicOfferingPreview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // ログイン済みは本編（アプリ内の詳細）へ
  const su = await getSessionUser();
  if (su) redirect(`/ledger/${id}`);

  const o = await getPublicOffering(id);
  if (!o) notFound();

  const isGive = o.direction === "GIVE";
  const meta = categoryMeta(o.category);
  const amount = formatAmount(o);
  const desc = o.description ?? "";
  const preview = desc.slice(0, PREVIEW_CHARS);
  const remaining = Math.max(0, desc.length - preview.length);
  const hero = o.imageUrls[0] ?? null;

  return (
    <>
      <PublicTopBar />
      <div className="mx-auto flex max-w-[760px] flex-col gap-6 px-4 py-10">
      <Link href="/" className="text-[12px] text-[var(--green-d)] underline">← トップに戻る</Link>

      <div className="flex flex-col gap-2">
        <span
          className={`w-fit rounded-full px-3 py-1 text-[11px] font-bold text-white ${
            isGive ? "bg-[var(--green)]" : "bg-[#B77F0B]"
          }`}
        >
          {DIRECTION_SHORT[o.direction] ?? (isGive ? "売りたい" : "探している")}
        </span>
        <h1 className={h1Cls}>{o.title || "（無題）"}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--muted)]">
          <span>{o.member.name}</span>
          <span>{meta?.icon} {o.category}</span>
          {o.area ? <span>📍 {o.area}</span> : null}
          {amount ? <span className="text-[var(--green-d)]">{amount}</span> : null}
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
