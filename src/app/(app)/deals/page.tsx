import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { PHASES, isStale, loadMemberDeals } from "@/lib/deal";
import { PhaseSelect } from "./_components/PhaseSelect";
import { setDealNext } from "./actions";

function ymd(d: Date | null): string {
  if (!d) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ phase?: string }>;
}) {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);
  const all = await loadMemberDeals(me.id);

  const sp = await searchParams;
  const activePhase = sp.phase !== undefined ? Number(sp.phase) : null;
  const counts = PHASES.map((_, i) => all.filter((d) => d.deal.phase === i).length);
  const list = activePhase === null ? all : all.filter((d) => d.deal.phase === activePhase);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] tracking-[0.2em] text-[var(--muted)]">DEALS</p>
          <h1 className="font-serif text-[22px] text-[var(--ink)]">商談管理</h1>
        </div>
        <Link href="/deals/board" className="rounded-md border border-[var(--line)] px-4 py-2 text-[13px] text-[var(--ink-2)] hover:bg-[var(--canvas)]">
          ステータスボードで見る →
        </Link>
      </div>

      {/* フェーズタブ */}
      <div className="flex flex-wrap gap-1 border-b border-[var(--line)]">
        <Tab href="/deals" label="すべて" count={all.length} active={activePhase === null} />
        {PHASES.map((label, i) => (
          <Tab key={i} href={`/deals?phase=${i}`} label={label} count={counts[i]} active={activePhase === i} />
        ))}
      </div>

      {list.length === 0 ? (
        <p className="rounded-md border border-dashed border-[var(--line)] bg-white p-8 text-center text-[13px] text-[var(--muted)]">
          該当する商談はありません。共創パートナーに「興味を送る」と、ここに商談が作られます。
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {list.map(({ deal, other }) => {
            const stale = isStale(deal.lastActivityAt);
            const overdue = deal.dueDate ? deal.dueDate.getTime() < Date.now() : false;
            return (
              <div key={deal.id} className="rounded-[10px] border border-[var(--line)] bg-white p-5">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-white font-serif text-[16px] text-[var(--green-d)]">
                    {other?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={other.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (other?.name?.[0] ?? "?").toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={other ? `/producers/${other.id}` : "#"} className="text-[16px] font-semibold text-[var(--ink)] hover:underline">
                      {other?.name || "（不明）"}
                    </Link>
                    <p className="mt-0.5 line-clamp-1 text-[12px] text-[var(--muted)]">
                      {other?.categoryL1} ・ {other?.description || "—"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <PhaseSelect dealId={deal.id} phase={deal.phase} />
                    {stale ? (
                      <span className="text-[11px] text-[var(--red)]">30日以上動きなし</span>
                    ) : null}
                  </div>
                </div>

                {/* 次にやること・メモ・期限 */}
                <form action={setDealNext.bind(null, deal.id)} className="mt-4 flex flex-col gap-2 rounded-lg bg-[var(--canvas)] p-3">
                  <label className="flex flex-col gap-1 text-[11px] text-[var(--muted)]">
                    次にやること・メモ
                    <textarea
                      name="nextAction"
                      defaultValue={deal.nextAction ?? ""}
                      rows={3}
                      placeholder={"例：面談日を調整する\n・条件面のポイント\n・次回アジェンダ\nなど、メモを複数行で残せます。"}
                      className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-[13px] leading-6 outline-none focus:border-[var(--green)]"
                    />
                  </label>
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="flex flex-col gap-1 text-[11px] text-[var(--muted)]">
                      期限
                      <input type="date" name="dueDate" defaultValue={ymd(deal.dueDate)} className={`rounded-md border bg-white px-3 py-1.5 text-[13px] outline-none focus:border-[var(--green)] ${overdue ? "border-[var(--red)] text-[var(--red)]" : "border-[var(--line)]"}`} />
                    </label>
                    <button className="rounded-md bg-[var(--green)] px-4 py-1.5 text-[12px] font-medium text-white hover:bg-[var(--green-d)]">
                      保存
                    </button>
                    {deal.threadId ? (
                      <Link href={`/messages/${deal.threadId}`} className="ml-auto text-[12px] text-[var(--green-d)] underline">
                        メッセージ →
                      </Link>
                    ) : null}
                  </div>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Tab({ href, label, count, active }: { href: string; label: string; count: number; active: boolean }) {
  return (
    <Link
      href={href}
      className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] ${
        active ? "border-[var(--green)] text-[var(--green-d)]" : "border-transparent text-[var(--muted)] hover:text-[var(--ink-2)]"
      }`}
    >
      {label}
      <span className={`rounded-full px-1.5 text-[11px] ${active ? "bg-[var(--green-soft)] text-[var(--green-d)]" : "bg-[var(--line)] text-[var(--ink-2)]"}`}>
        {count}
      </span>
    </Link>
  );
}
