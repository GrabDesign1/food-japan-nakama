import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { PHASES, PHASE_DESC, isStale, loadMemberDeals } from "@/lib/deal";
import { PhaseSelect } from "../_components/PhaseSelect";
import { btn } from "@/lib/ui";

export default async function DealBoardPage() {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);
  const all = await loadMemberDeals(me.id);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] tracking-[0.2em] text-[var(--muted)]">DEAL BOARD</p>
          <h1 className="font-serif text-[22px] text-[var(--ink)]">商談ステータス</h1>
        </div>
        <Link href="/deals" className={btn("secondary", "sm")}>
          リストで見る →
        </Link>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4" style={{ minWidth: `${PHASES.length * 260}px` }}>
          {PHASES.map((label, i) => {
            const cards = all.filter((d) => d.deal.phase === i);
            return (
              <div key={i} className="flex w-[248px] shrink-0 flex-col rounded-[10px] bg-[var(--canvas)] p-3">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-[var(--ink)]">
                    {i}. {label}
                  </span>
                  <span className="rounded-full bg-white px-1.5 text-[11px] text-[var(--ink-2)]">
                    {cards.length}
                  </span>
                </div>
                <p className="mb-3 text-[10px] leading-4 text-[var(--muted)]">{PHASE_DESC[i]}</p>

                <div className="flex flex-col gap-3">
                  {cards.map(({ deal, other }) => {
                    const stale = isStale(deal.lastActivityAt);
                    return (
                      <div
                        key={deal.id}
                        className={`rounded-lg border-l-4 bg-white p-3 shadow-sm ${
                          stale ? "border-l-[var(--red)]" : "border-l-[var(--green)]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-white font-serif text-[12px] text-[var(--green-d)]">
                            {other?.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={other.avatarUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              (other?.name?.[0] ?? "?").toUpperCase()
                            )}
                          </div>
                          <Link href={other ? `/producers/${other.id}` : "#"} className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--ink)] hover:underline">
                            {other?.name || "（不明）"}
                          </Link>
                        </div>
                        {deal.nextAction ? (
                          <p className="mt-2 line-clamp-2 text-[11px] text-[var(--ink-2)]">
                            次：{deal.nextAction}
                          </p>
                        ) : null}
                        {stale ? (
                          <p className="mt-1 text-[10px] text-[var(--red)]">30日以上動きなし</p>
                        ) : null}
                        <div className="mt-2">
                          <PhaseSelect dealId={deal.id} phase={deal.phase} />
                        </div>
                        {deal.threadId ? (
                          <Link href={`/messages/${deal.threadId}`} className="mt-2 inline-block text-[11px] text-[var(--green-d)] underline">
                            メッセージ →
                          </Link>
                        ) : null}
                      </div>
                    );
                  })}
                  {cards.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[var(--line)] py-6 text-center text-[11px] text-[var(--muted)]">
                      なし
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
