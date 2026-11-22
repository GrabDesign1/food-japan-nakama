// 集まり1件のカード（2026-11-23）。
// ⚠️ サーバーコンポーネント。手を挙げるのはフォーム送信なのでJSが無くても動く。
import Link from "next/link";
import { btn } from "@/lib/ui";
import type { GatheringView, GatheringHost } from "@/lib/gatherings";
import { whenLabel, placeLabel, GATHERING_STATUS } from "@/lib/gathering-core";
import { join } from "../actions";

export function GatheringCard({
  g,
  host,
  detailed = false,
}: {
  g: GatheringView;
  host: GatheringHost | undefined;
  detailed?: boolean;
}) {
  const closed = g.status !== "open";
  return (
    <article className="rounded-[10px] border border-[var(--line)] bg-white px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[var(--green-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--green-d)]">
          {whenLabel(g.startAt, g.timeNote)}
        </span>
        <span className="text-[12px] text-[var(--muted)]">{placeLabel(g.prefecture, g.place)}</span>
        {closed ? (
          <span className="rounded-full bg-[#EEF1F3] px-2.5 py-0.5 text-[11px] text-[var(--ink-2)]">
            {GATHERING_STATUS[g.status]}
          </span>
        ) : null}
      </div>

      <h3 className="mt-2 text-[16px] font-bold leading-6 text-[var(--ink)]">
        {detailed ? g.title : <Link href={`/gatherings/${g.id}`} className="hover:underline">{g.title}</Link>}
      </h3>

      <p
        className={`mt-2 whitespace-pre-wrap break-words text-[14px] leading-[1.95] text-[var(--ink-2)] ${
          detailed ? "" : "line-clamp-3"
        }`}
      >
        {g.body}
      </p>

      <p className="mt-3 text-[12px] text-[var(--muted)]">
        呼びかけ：
        {host ? (
          <Link href={`/producers/${host.id}`} className="text-[var(--green-d)] hover:underline">
            {host.name}
          </Link>
        ) : (
          "会員"
        )}
        　／　行きます {g.goingCount}
        {g.capacity ? ` / ${g.capacity}` : ""}　気になります {g.interestedCount}
      </p>

      {/* 手を挙げる。⚠️ 締め切られていたら出さない */}
      {!closed ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--line-soft)] pt-3">
          <form action={join}>
            <input type="hidden" name="gatheringId" value={g.id} />
            <input type="hidden" name="kind" value={g.myKind === "going" ? "none" : "going"} />
            <button
              type="submit"
              className={`rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition ${
                g.myKind === "going"
                  ? "border-[var(--green)] bg-[var(--green-soft)] text-[var(--green-d)]"
                  : "border-[var(--line)] bg-white text-[var(--ink-2)]"
              }`}
            >
              {g.myKind === "going" ? "行きます（取り消す）" : "行きます"}
            </button>
          </form>
          <form action={join}>
            <input type="hidden" name="gatheringId" value={g.id} />
            <input type="hidden" name="kind" value={g.myKind === "interested" ? "none" : "interested"} />
            <button
              type="submit"
              className={`rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition ${
                g.myKind === "interested"
                  ? "border-[var(--green)] bg-[var(--green-soft)] text-[var(--green-d)]"
                  : "border-[var(--line)] bg-white text-[var(--ink-2)]"
              }`}
            >
              {g.myKind === "interested" ? "気になります（取り消す）" : "気になります"}
            </button>
          </form>
          {!detailed ? (
            <Link href={`/gatherings/${g.id}`} className={`${btn("secondary", "sm")} ml-auto`}>
              くわしく
            </Link>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
