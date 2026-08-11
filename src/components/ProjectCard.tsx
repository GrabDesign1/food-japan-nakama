// 共創プロジェクトのカード（ダッシュボード・一覧・検索共通）。
// 新項目（一言目的・主目的・段階・募集役割・期限）は値がある場合のみ表示（旧データ互換）。
import Link from "next/link";
import Image from "next/image";
import {
  PURPOSE_LABEL,
  STAGE_LABEL,
  formatProjectDeadline,
} from "@/lib/project-taxonomy";

export type ProjectCardData = {
  id: string;
  title: string;
  imageUrls: string[];
  status?: string;
  memberName?: string | null;
  budget?: string | null;
  oneLiner?: string | null;
  purposeMain?: string | null;
  stage?: string | null;
  area?: string | null;
  deadline?: Date | null;
  roleNames?: string[]; // 公開の募集役割（最大3表示）
  fjsOrigin?: boolean; // Food Japan Summit発
  supportOfficial?: boolean; // 事務局伴走中
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  draft: { label: "下書き", cls: "bg-[var(--line)] text-[var(--ink-2)]" },
  pending: { label: "承認待ち", cls: "bg-[var(--amber-soft)] text-[var(--amber)]" },
  published: { label: "掲載中", cls: "bg-[var(--green-soft)] text-[var(--green-d)]" },
  closed: { label: "終了", cls: "bg-[var(--line)] text-[var(--ink-2)]" },
};

export function ProjectCard({ p, href }: { p: ProjectCardData; href?: string }) {
  const s = p.status ? STATUS_LABEL[p.status] : undefined;
  const deadlineText = p.deadline ? formatProjectDeadline(p.deadline) : null;
  return (
    <Link href={href ?? `/projects/${p.id}`} className="group block transition-transform hover:-translate-y-0.5">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--green-soft)] shadow-sm transition group-hover:border-[var(--green)] group-hover:shadow-md">
        {p.imageUrls[0] ? (
          // next/image: 表示サイズに合わせて縮小・WebP変換した画像を配信（fill=親のaspect枠いっぱい）
          <Image
            src={p.imageUrls[0]}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-[36px] opacity-50">🤝</div>
        )}
        {s ? (
          <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] ${s.cls}`}>{s.label}</span>
        ) : null}
        {p.stage && STAGE_LABEL[p.stage] ? (
          <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-[var(--green-d)]">
            {STAGE_LABEL[p.stage]}
          </span>
        ) : null}
      </div>
      <div className="mt-2 line-clamp-2 text-[13px] font-medium leading-5 text-[var(--ink)] group-hover:text-[var(--green-d)]">
        {p.title || "（無題）"}
      </div>
      {p.oneLiner ? (
        <div className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-[var(--ink-2)]">{p.oneLiner}</div>
      ) : null}
      {(p.purposeMain && PURPOSE_LABEL[p.purposeMain]) || p.fjsOrigin || p.supportOfficial ? (
        <div className="mt-1 flex flex-wrap gap-1">
          {p.purposeMain && PURPOSE_LABEL[p.purposeMain] ? (
            <span className="rounded bg-[var(--green-soft)] px-1.5 py-0.5 text-[10px] text-[var(--green-d)]">
              {PURPOSE_LABEL[p.purposeMain]}
            </span>
          ) : null}
          {p.fjsOrigin ? (
            <span className="rounded border border-[var(--amber-line)] bg-[var(--amber-bg)] px-1.5 py-0.5 text-[10px] text-[var(--amber-ink)]">FJS発</span>
          ) : null}
          {p.supportOfficial ? (
            <span className="rounded bg-[var(--amber-soft)] px-1.5 py-0.5 text-[10px] text-[var(--amber)]">事務局伴走中</span>
          ) : null}
        </div>
      ) : null}
      {p.roleNames?.length ? (
        <div className="mt-1 line-clamp-1 text-[11px] text-[var(--ink-2)]">
          <span className="text-[var(--green-d)]">募集：</span>
          {p.roleNames.slice(0, 3).join("・")}
        </div>
      ) : null}
      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--muted)]">
        {p.memberName ? <span className="truncate">{p.memberName}</span> : null}
        {p.area ? <span className="shrink-0">📍{p.area}</span> : null}
        {deadlineText ? (
          <span className="ml-auto shrink-0 text-[var(--amber)]">{deadlineText}</span>
        ) : p.budget ? (
          <span className="ml-auto shrink-0 text-[var(--amber)]">予算 {p.budget}</span>
        ) : null}
      </div>
    </Link>
  );
}
