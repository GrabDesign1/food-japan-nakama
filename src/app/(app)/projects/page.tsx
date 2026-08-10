// 共創プロジェクト一覧（指示書 §6）。絞り込みはGETフォーム＝URLクエリに反映され、戻る操作でも維持される。
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { ProjectCard } from "@/components/ProjectCard";
import { EmptyState } from "@/components/EmptyState";
import { PREFECTURES } from "@/lib/member-taxonomy";
import {
  PROJECT_PURPOSES,
  PROJECT_STAGES,
} from "@/lib/project-taxonomy";
import { btn, eyebrowCls, h1Cls, h2Cls } from "@/lib/ui";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  draft: { label: "下書き", cls: "bg-[var(--line)] text-[var(--ink-2)]" },
  pending: { label: "承認待ち", cls: "bg-[#FAF0D6] text-[#B77F0B]" },
  published: { label: "掲載中", cls: "bg-[var(--green-soft)] text-[var(--green-d)]" },
  closed: { label: "終了", cls: "bg-[var(--line)] text-[var(--ink-2)]" },
};

const selectCls =
  "rounded-md border border-[var(--line)] bg-white px-2.5 py-2 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--green)]";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    purpose?: string;
    area?: string;
    stage?: string;
    fjs?: string;
    open?: string;
  }>;
}) {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);
  const sp = await searchParams;

  const q = (sp.q ?? "").trim().slice(0, 100);
  const purpose = PROJECT_PURPOSES.some(([v]) => v === sp.purpose) ? sp.purpose! : "";
  const area = sp.area && ([...PREFECTURES, "全国", "オンライン"] as string[]).includes(sp.area) ? sp.area : "";
  const stage = PROJECT_STAGES.some(([v]) => v === sp.stage) ? sp.stage! : "";
  const fjs = sp.fjs === "1";
  const openOnly = sp.open === "1";
  const hasFilter = !!(q || purpose || area || stage || fjs || openOnly);

  // OR条件が複数あるためANDの配列で合成する（同一キーの上書きを防ぐ）
  const and: Prisma.ProjectWhereInput[] = [];
  if (q) {
    and.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { oneLiner: { contains: q, mode: "insensitive" } },
        { coCreationGoal: { contains: q, mode: "insensitive" } },
        { challengeIssue: { contains: q, mode: "insensitive" } },
        { body: { contains: q, mode: "insensitive" } },
        { tags: { has: q } },
      ],
    });
  }
  if (purpose) and.push({ OR: [{ purposeMain: purpose }, { purposeSub: { has: purpose } }] });
  if (openOnly) and.push({ OR: [{ deadline: null }, { deadline: { gte: new Date() } }] });

  const published = await prisma.project.findMany({
    where: {
      tenantId: su.app.tenantId,
      status: "published",
      ...(area ? { area } : {}),
      ...(stage ? { stage } : {}),
      ...(fjs ? { eventFlags: { has: "fjs_origin" } } : {}),
      ...(and.length ? { AND: and } : {}),
    },
    orderBy: { publishedAt: "desc" },
    take: 30,
    include: { roles: { where: { isPublic: true }, orderBy: { sortOrder: "asc" }, select: { name: true } } },
  });
  const memberIds = Array.from(new Set(published.map((p) => p.memberId)));
  const members = await prisma.member.findMany({
    where: { id: { in: memberIds } },
    select: { id: true, name: true },
  });
  const nameMap = new Map(members.map((m) => [m.id, m.name]));

  const mine = await prisma.project.findMany({
    where: { memberId: me.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { applications: true } } },
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={eyebrowCls}>PROJECTS</p>
          <h1 className={h1Cls}>仲間と一緒に、食の新しい事業をつくる</h1>
          <p className="mt-1 text-[13px] text-[var(--ink-2)]">
            自社だけでは実現できない課題や構想を公開し、原料・技術・販路・地域・資金などを持つ仲間を募集できます。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/consultation?type=project" className={btn("secondary")}>
            事務局と企画を整理する
          </Link>
          <Link href="/projects/new" className={btn("primary")}>
            ＋ 新しいプロジェクトを始める
          </Link>
        </div>
      </div>

      {/* 絞り込み（GET＝URLクエリに反映） */}
      <form method="GET" className="flex flex-wrap items-center gap-2 rounded-[10px] border border-[var(--line)] bg-white p-3">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="キーワード（例：規格外、麦芽粕）"
          className={`${selectCls} w-[220px] max-w-full`}
        />
        <select name="purpose" defaultValue={purpose} className={selectCls}>
          <option value="">目的：すべて</option>
          {PROJECT_PURPOSES.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select name="area" defaultValue={area} className={selectCls}>
          <option value="">地域：すべて</option>
          <option value="全国">全国</option>
          <option value="オンライン">オンライン</option>
          {PREFECTURES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select name="stage" defaultValue={stage} className={selectCls}>
          <option value="">段階：すべて</option>
          {PROJECT_STAGES.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-[var(--ink-2)]">
          <input type="checkbox" name="fjs" value="1" defaultChecked={fjs} className="accent-[var(--green)]" />
          FJS発
        </label>
        <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-[var(--ink-2)]">
          <input type="checkbox" name="open" value="1" defaultChecked={openOnly} className="accent-[var(--green)]" />
          募集中のみ
        </label>
        <button className={btn("secondary", "sm")}>絞り込む</button>
        {hasFilter ? (
          <Link href="/projects" className="text-[12px] text-[var(--green-d)] underline">
            条件を解除
          </Link>
        ) : null}
      </form>

      {/* 掲載中のプロジェクト */}
      <div>
        <h2 className={`${h2Cls} mb-3`}>掲載中のプロジェクト{hasFilter ? `（${published.length}件）` : ""}</h2>
        {published.length === 0 ? (
          hasFilter ? (
            <EmptyState
              title="条件に合うプロジェクトが見つかりませんでした"
              description="条件を変えて探すか、事務局に相談すると、近い取り組みをご案内できる場合があります。"
              actions={[
                { label: "条件を解除する", href: "/projects" },
                { label: "事務局に相談する", href: "/consultation?type=project" },
              ]}
            />
          ) : (
            <EmptyState
              title="掲載中のプロジェクトはまだありません"
              description="最初の1件を掲載してみませんか。課題・実現したいことを書くだけで、共創パートナー候補に届きます。"
              actions={[
                { label: "＋ 新しいプロジェクトを始める", href: "/projects/new" },
                { label: "持ち寄り（売りたい・買いたい）から探す", href: "/search" },
              ]}
            />
          )
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {published.map((p) => (
              <ProjectCard
                key={p.id}
                p={{
                  id: p.id,
                  title: p.title,
                  imageUrls: p.imageUrls,
                  memberName: nameMap.get(p.memberId),
                  budget: p.budget,
                  oneLiner: p.oneLiner,
                  purposeMain: p.purposeMain,
                  stage: p.stage,
                  area: p.area,
                  deadline: p.deadline,
                  roleNames: p.roles.map((r) => r.name),
                  fjsOrigin: p.eventFlags.includes("fjs_origin"),
                  supportOfficial: p.supportOfficial,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* 自分の掲載 */}
      <div>
        <h2 className={`${h2Cls} mb-3`}>自分の掲載</h2>
        {mine.length === 0 ? (
          <EmptyState
            compact
            title="まだ掲載していません"
            description="「＋ 新しいプロジェクトを始める」から登録できます。掲載は事務局の承認後に公開されます。"
            actions={[{ label: "＋ 新しいプロジェクトを始める", href: "/projects/new" }]}
          />
        ) : (
          <div className="overflow-hidden rounded-[10px] border border-[var(--line)] bg-white">
            {mine.map((p) => {
              const s = STATUS_LABEL[p.status] ?? STATUS_LABEL.draft;
              return (
                <div key={p.id} className="flex items-center gap-3 border-b border-[#EDF0EA] px-4 py-3 last:border-0">
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] ${s.cls}`}>{s.label}</span>
                  <Link href={`/projects/${p.id}`} className="min-w-0 flex-1 truncate text-[14px] text-[var(--ink)] hover:underline">
                    {p.title || "（無題）"}
                  </Link>
                  <Link
                    href={`/projects/${p.id}/applicants`}
                    className="shrink-0 text-[12px] text-[var(--green-d)] underline"
                  >
                    応募 {p._count.applications}
                  </Link>
                  <Link href={`/projects/${p.id}/edit`} className="shrink-0 text-[12px] text-[var(--green-d)] underline">編集</Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
