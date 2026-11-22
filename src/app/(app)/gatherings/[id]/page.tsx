// 集まり1件（2026-11-23）。
// ⚠️ 参加者の顔ぶれを見せる。誰が来るか分かることが、手を挙げる理由になる。
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { getGathering } from "@/lib/gatherings";
import { JOIN_KINDS } from "@/lib/gathering-core";
import { btn } from "@/lib/ui";
import { GatheringCard } from "../_components/GatheringCard";
import { changeStatus, removeGathering } from "../actions";

export default async function GatheringDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);

  const r = await getGathering({ id: me.id, tenantId: me.tenantId }, id);
  if (!r.ok) notFound();

  const { item, host, joins, members } = r;
  const byId = new Map(members.map((m) => [m.id, m]));
  const isHost = item.hostMemberId === me.id;

  const going = joins.filter((j) => j.kind === "going");
  const interested = joins.filter((j) => j.kind === "interested");

  return (
    <div className="mx-auto max-w-[760px] px-4 py-8">
      <Link href="/gatherings" className="text-[13px] text-[var(--muted)] hover:underline">
        ← 集まりたい へ戻る
      </Link>

      <div className="mt-4">
        <GatheringCard g={item} host={host ?? undefined} detailed />
      </div>

      {/* 主催の操作 */}
      {isHost ? (
        <div className="mt-4 rounded-[10px] border border-[var(--line)] bg-[#fcfcfb] px-4 py-3">
          <p className="text-[12px] font-semibold text-[var(--ink)]">呼びかけた方の操作</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {(
              [
                ["open", "募集中に戻す"],
                ["closed", "締め切る"],
                ["done", "終わりにする"],
              ] as const
            )
              .filter(([s]) => s !== item.status)
              .map(([s, label]) => (
                <form key={s} action={changeStatus}>
                  <input type="hidden" name="gatheringId" value={item.id} />
                  <input type="hidden" name="status" value={s} />
                  <button type="submit" className={btn("secondary", "sm")}>{label}</button>
                </form>
              ))}
            <form action={removeGathering} className="ml-auto">
              <input type="hidden" name="gatheringId" value={item.id} />
              <button type="submit" className="text-[11px] text-[var(--muted)] hover:underline">
                削除する
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {/* 顔ぶれ */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {(
          [
            ["going", going],
            ["interested", interested],
          ] as const
        ).map(([kind, list]) => (
          <section key={kind} className="rounded-[10px] border border-[var(--line)] bg-white px-4 py-4">
            <h2 className="text-[13px] font-bold text-[var(--ink)]">
              {JOIN_KINDS.find(([k]) => k === kind)?.[1]}
              <span className="ml-2 font-normal text-[var(--muted)]">{list.length}名</span>
            </h2>
            {list.length === 0 ? (
              <p className="mt-2 text-[12px] text-[var(--muted)]">まだいません。</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {list.map((j) => {
                  const m = byId.get(j.memberId);
                  return (
                    <li key={j.memberId} className="text-[13px] leading-6">
                      {m ? (
                        <Link href={`/producers/${m.id}`} className="font-medium text-[var(--ink)] hover:underline">
                          {m.name}
                        </Link>
                      ) : (
                        <span className="font-medium text-[var(--ink)]">会員</span>
                      )}
                      {m?.prefecture ? (
                        <span className="ml-2 text-[11px] text-[var(--muted)]">{m.prefecture}</span>
                      ) : null}
                      {j.note ? (
                        <p className="mt-0.5 whitespace-pre-wrap break-words text-[12px] leading-6 text-[var(--ink-2)]">
                          {j.note}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
