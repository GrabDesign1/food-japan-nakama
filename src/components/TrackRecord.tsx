/**
 * 【NAKAMAでの取引実績】2026-11-28。事業者ページと提案一覧で使う表示部品。
 *
 * ⚠️⚠️ **何も無いときは、呼ぶ側が出さないこと**（`isEmptyRecord` で判定する）。
 *    「実績 0件」と書くと、まだ記録の無い会員**全員**が悪く見える。
 * ⚠️⚠️ **金額・相手の会社名・入金の遅れは出さない。**
 *    金額は秘密、相手の名前は同意が要る、入金はNAKAMAが確かめられない。
 * ⚠️ 見せるのは「合意した件数」「買い手が受け取りを押した件数」「また取引したいの数」だけ。
 */
import type { TrackRecord } from "@/lib/track-record";
import { sinceLabel } from "@/lib/track-record";

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[22px] font-bold leading-[30px] text-[var(--ink)]">{value}</div>
      <div className="text-[12px] leading-[17px] text-[var(--muted)]">{label}</div>
    </div>
  );
}

export function TrackRecordPanel({ record, name }: { record: TrackRecord; name?: string }) {
  const since = sinceLabel(record.firstAt);
  return (
    <div className="rounded-[16px] border border-[var(--line)] bg-white px-5 py-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[16px] font-bold leading-[26px] text-[var(--ink)]">
          NAKAMAでの取引
        </span>
        {since ? (
          <span className="text-[12px] leading-[17px] text-[var(--muted)]">{since}</span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-start gap-x-10 gap-y-4">
        {record.closed > 0 ? <Stat value={`${record.closed}件`} label="条件に合意した取引" /> : null}
        {record.delivered > 0 ? (
          <Stat value={`${record.delivered}件`} label="お届けまで完了" />
        ) : null}
        {/* ⚠️ 母数が RATE_MIN_DEALS 未満のときは lib 側で null にしてある */}
        {record.deliveredRate !== null ? (
          <Stat value={`${Math.round(record.deliveredRate * 100)}%`} label="お届けまで進んだ割合" />
        ) : null}
        {record.again.total > 0 ? (
          <Stat
            value={`${record.again.yes} / ${record.again.total}社`}
            label="「また取引したい」"
          />
        ) : null}
      </div>

      {record.voices.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2 border-t border-[var(--line-soft)] pt-3">
          {record.voices.map((v, i) => (
            <li key={i} className="text-[14px] leading-[21px] text-[var(--ink-2)]">
              「{v.comment}」
              <span className="ml-2 text-[12px] text-[var(--muted)]">
                {v.at.getFullYear()}年{v.at.getMonth() + 1}月
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-3 text-[12px] leading-[17px] text-[var(--muted)]">
        {/* ⚠️ この一文を消さないこと。何を数えていないかを言っておかないと、
            「入金まで確認済み」と読まれてしまう。NAKAMAは代金を預かっていない。 */}
        NAKAMAに記録された取引だけを数えています。金額・お取引先は出していません。
        入金の有無はNAKAMAでは確認できないため、実績に含めていません。
        {name ? `（${name}）` : ""}
      </p>
    </div>
  );
}
