// 共創プロジェクトのカード（ダッシュボード・一覧共通）。
import Link from "next/link";

export type ProjectCardData = {
  id: string;
  title: string;
  imageUrls: string[];
  status?: string;
  memberName?: string | null;
  budget?: string | null;
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  draft: { label: "下書き", cls: "bg-[var(--line)] text-[var(--ink-2)]" },
  pending: { label: "承認待ち", cls: "bg-[#FAF0D6] text-[#B77F0B]" },
  published: { label: "掲載中", cls: "bg-[var(--green-soft)] text-[var(--green-d)]" },
  closed: { label: "終了", cls: "bg-[var(--line)] text-[var(--ink-2)]" },
};

export function ProjectCard({ p, href }: { p: ProjectCardData; href?: string }) {
  const s = p.status ? STATUS_LABEL[p.status] : undefined;
  return (
    <Link href={href ?? `/projects/${p.id}`} className="group block transition-transform hover:-translate-y-0.5">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--green-soft)] shadow-sm transition group-hover:border-[var(--green)] group-hover:shadow-md">
        {p.imageUrls[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.imageUrls[0]} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
        ) : (
          <div className="grid h-full w-full place-items-center text-[36px] opacity-50">🤝</div>
        )}
        {s ? (
          <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] ${s.cls}`}>{s.label}</span>
        ) : null}
      </div>
      <div className="mt-2 line-clamp-2 text-[13px] font-medium leading-5 text-[var(--ink)] group-hover:text-[var(--green-d)]">
        {p.title || "（無題）"}
      </div>
      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--muted)]">
        {p.memberName ? <span className="truncate">{p.memberName}</span> : null}
        {p.budget ? <span className="ml-auto text-[#B77F0B]">予算 {p.budget}</span> : null}
      </div>
    </Link>
  );
}
