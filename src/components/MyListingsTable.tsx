// 自分が出した案件の管理表（クラウドワークスの「登録中のお仕事」に相当・2026-08-11）。
// 目的は「問い合わせが来ているか」「返していないか」「放置していないか」が一目で分かること。
// ダッシュボードと進行中の活動（/deals）で共用する。
import Link from "next/link";
import { duplicateOffering } from "@/app/(app)/ledger/actions";
import { DIRECTION_SHORT } from "@/lib/offering-taxonomy";
import { STALE_DAYS, idleDays, listingState, type MyListingRow } from "@/lib/listing-stats";
import { btn } from "@/lib/ui";

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function Stat({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div
      className={`min-w-[62px] rounded-md border px-2 py-1.5 text-center ${
        value > 0 && strong
          ? "border-[var(--green)] bg-[var(--green-soft)]"
          : "border-[var(--line)] bg-white"
      }`}
    >
      <div className="text-[10px] text-[var(--muted)]">{label}</div>
      <div className={`text-[15px] font-bold ${value > 0 ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>
        {value}
        <span className="ml-0.5 text-[10px] font-normal text-[var(--muted)]">件</span>
      </div>
    </div>
  );
}

export function MyListingsTable({ rows, now }: { rows: MyListingRow[]; now: Date }) {
  return (
    <div className="overflow-x-auto rounded-[12px] border border-[var(--line)] bg-white">
      <table className="w-full min-w-[900px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-[var(--line)] bg-[var(--canvas)] text-[11px] text-[var(--muted)]">
            <th className="px-4 py-3 font-medium">案件</th>
            <th className="px-4 py-3 font-medium">掲載の状態</th>
            <th className="px-4 py-3 font-medium">対応が必要</th>
            <th className="px-4 py-3 font-medium">やり取りの状況</th>
            <th className="px-4 py-3 font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const state = listingState(r, now);
            const idle = idleDays(r, now);
            // 放置＝未返信は無いが、最後のやり取りから日が空いている（こちらから動く番）
            const stale = r.received > 0 && r.unread === 0 && idle !== null && idle >= STALE_DAYS;
            return (
              <tr key={r.id} className={`border-b border-[#EDF0EA] last:border-b-0 ${r.unread > 0 ? "bg-[#FFF7EF]" : ""}`}>
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold text-white ${
                        r.direction === "GIVE" ? "bg-[var(--green)]" : "bg-[#B77F0B]"
                      }`}
                    >
                      {DIRECTION_SHORT[r.direction] ?? ""}
                    </span>
                    <Link
                      href={`/ledger/${r.id}/proposals`}
                      className="max-w-[280px] truncate font-bold text-[var(--ink)] hover:text-[var(--green-d)] hover:underline"
                    >
                      {r.title || "（無題）"}
                    </Link>
                  </div>
                  <div className="mt-1 text-[11px] text-[var(--muted)]">
                    最終のやり取り {fmtDate(r.lastMessageAt)}
                    {r.applicationDeadline ? `　/　募集期限 ${fmtDate(r.applicationDeadline)}` : ""}
                  </div>
                </td>

                <td className="px-4 py-3 align-top">
                  <div className="flex flex-col items-start gap-1.5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        state === "public"
                          ? "bg-[var(--green-soft)] text-[var(--green-d)]"
                          : state === "expired"
                            ? "bg-[var(--line)] text-[var(--ink-2)]"
                            : "bg-[#FAF0D6] text-[#B77F0B]"
                      }`}
                    >
                      {state === "public" ? "公開中" : state === "expired" ? "募集終了" : "下書き"}
                    </span>
                    {/* 毎日の出荷分などを出しやすいよう、前回の内容を引き継いだ下書きを作る */}
                    <form action={duplicateOffering.bind(null, r.id)}>
                      <button className={`${btn("secondary", "sm")} whitespace-nowrap`}>
                        コピーして再登録
                      </button>
                    </form>
                  </div>
                </td>

                <td className="px-4 py-3 align-top">
                  {r.unread > 0 ? (
                    <div className="min-w-[92px] rounded-md border-2 border-[var(--red)] bg-[var(--red-soft)] px-2 py-1.5 text-center">
                      <div className="text-[10px] font-bold text-[var(--red)]">未返信</div>
                      <div className="text-[18px] font-bold text-[var(--red)]">
                        {r.unread}
                        <span className="ml-0.5 text-[10px] font-normal">件</span>
                      </div>
                    </div>
                  ) : stale ? (
                    <div className="min-w-[92px] rounded-md border border-[#E2591F] bg-[#FFF7EF] px-2 py-1.5 text-center">
                      <div className="text-[10px] font-bold text-[#E2591F]">放置</div>
                      <div className="text-[12px] font-bold text-[#E2591F]">{idle}日</div>
                    </div>
                  ) : (
                    <span className="text-[13px] text-[var(--muted)]">なし</span>
                  )}
                </td>

                <td className="px-4 py-3 align-top">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Stat label="届いた" value={r.received} strong />
                    <span className="text-[11px] text-[var(--muted)]">＋</span>
                    <Stat label="商談中" value={r.talking} />
                    <span className="text-[11px] text-[var(--muted)]">＋</span>
                    <Stat label="成約" value={r.closed} />
                  </div>
                </td>

                <td className="px-4 py-3 align-top">
                  <div className="flex flex-col gap-1.5">
                    <Link
                      href={`/ledger/${r.id}/proposals`}
                      className={`${btn(r.unread > 0 ? "action" : "secondary", "sm")} whitespace-nowrap text-center`}
                    >
                      届いた{r.direction === "GIVE" ? "問い合わせ" : "提案"}
                      {r.received > 0 ? `（${r.received}）` : ""}
                    </Link>
                    <Link
                      href={`/ledger/${r.id}/edit`}
                      className={`${btn("secondary", "sm")} whitespace-nowrap text-center`}
                    >
                      編集
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
