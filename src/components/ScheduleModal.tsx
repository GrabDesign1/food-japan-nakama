"use client";

// 面談候補日の作成（メッセージ画面と提案フォームで共用）。
// 旧UIは「日付・開始・終了」を1行ずつ手入力させる作りで、候補を3つ出すだけで9回の入力が必要だった。
// ここでは「所要時間を1回選ぶ → 日付を選ぶ → 時刻を押す」で1候補が積み上がるようにしている。
// 生成する文面は従来と同じ（【面談候補日】…）。
import { useState } from "react";
import { btn, h2Cls, input } from "@/lib/ui";
import { useCloseOnEscape } from "@/components/useCloseOnEscape";

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
const DURATIONS = [30, 60, 90];
const START_TIMES = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
const DAYS_AHEAD = 21;
const MAX_SLOTS = 8;

type Slot = { date: string; start: string };

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** "2026-08-12" → "8/12（火）" */
function labelOf(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}（${WEEK[d.getDay()]}）`;
}

/** 開始時刻＋所要時間 → 終了時刻 */
function endOf(start: string, minutes: number): string {
  const [h, m] = start.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}

function slotText(s: Slot, minutes: number): string {
  const d = new Date(`${s.date}T00:00:00`);
  return `・${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}（${WEEK[d.getDay()]}） ${s.start}〜${endOf(s.start, minutes)}`;
}

export function ScheduleModal({
  onClose,
  onInsert,
  insertLabel = "メッセージに反映",
}: {
  onClose: () => void;
  onInsert: (text: string) => void;
  insertLabel?: string;
}) {
  // 候補日の一覧（今日から3週間）。初回だけ作れば十分なので useState の遅延初期化で持つ
  const [dates] = useState<string[]>(() => {
    const today = new Date();
    const list: string[] = [];
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      list.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    }
    return list;
  });
  const [selectedDate, setSelectedDate] = useState<string>(() => dates[0] ?? "");
  const [duration, setDuration] = useState(60);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [remark, setRemark] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [manualStart, setManualStart] = useState("");

  function addSlot(date: string, start: string) {
    if (!date || !start) return;
    setSlots((prev) => {
      if (prev.length >= MAX_SLOTS) return prev;
      if (prev.some((s) => s.date === date && s.start === start)) return prev;
      return [...prev, { date, start }].sort((a, b) =>
        a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date)
      );
    });
  }

  function insert() {
    if (!slots.length) return;
    let text = "【面談候補日】\n" + slots.map((s) => slotText(s, duration)).join("\n");
    text += `\n所要時間：約${duration}分`;
    if (remark.trim()) text += "\n備考：" + remark.trim();
    onInsert(text);
  }

  const full = slots.length >= MAX_SLOTS;
  // Escで閉じる（この部品は開いている間だけ描画される）
  useCloseOnEscape(true, onClose);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="面談の候補日時を選ぶ"
        className="max-h-[86vh] w-full max-w-[640px] overflow-y-auto rounded-[12px] bg-white p-7 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className={`${h2Cls} flex items-center gap-2`}>
            <span className="inline-block h-5 w-1.5 rounded bg-[var(--green)]" />
            面談日程調整
          </h2>
          <button type="button" onClick={onClose} className={btn("secondary", "sm")}>
            ✕ 閉じる
          </button>
        </div>

        <div className="flex flex-col gap-5">
          {/* 所要時間 */}
          <div>
            <div className="mb-2 text-[13px] font-semibold text-[var(--ink-2)]">所要時間</div>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDuration(m)}
                  className={`rounded-full border px-4 py-1.5 text-[13px] ${
                    duration === m
                      ? "border-[var(--green)] bg-[var(--green)] font-bold text-white"
                      : "border-[var(--line)] bg-white text-[var(--ink-2)] hover:border-[var(--green)]"
                  }`}
                >
                  {m}分
                </button>
              ))}
            </div>
          </div>

          {/* 日付 */}
          <div>
            <div className="mb-2 text-[13px] font-semibold text-[var(--ink-2)]">日付を選ぶ</div>
            <div className="flex flex-wrap gap-2">
              {dates.map((iso) => {
                const day = new Date(`${iso}T00:00:00`).getDay();
                const selected = selectedDate === iso;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setSelectedDate(iso)}
                    className={`rounded-md border px-2.5 py-1.5 text-[12px] ${
                      selected
                        ? "border-[var(--green)] bg-[var(--green-soft)] font-bold text-[var(--green-d)]"
                        : `border-[var(--line)] bg-white hover:border-[var(--green)] ${
                            day === 0 ? "text-[var(--red)]" : day === 6 ? "text-[#2E86C1]" : "text-[var(--ink-2)]"
                          }`
                    }`}
                  >
                    {labelOf(iso)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 時刻（押すと候補に入る） */}
          <div>
            <div className="mb-2 text-[13px] font-semibold text-[var(--ink-2)]">
              開始時刻を押すと候補に追加されます（終了は所要時間から自動計算）
            </div>
            <div className="flex flex-wrap gap-2">
              {START_TIMES.map((t) => {
                const added = slots.some((s) => s.date === selectedDate && s.start === t);
                return (
                  <button
                    key={t}
                    type="button"
                    disabled={full && !added}
                    onClick={() => addSlot(selectedDate, t)}
                    className={`rounded-md border px-3 py-1.5 text-[13px] disabled:opacity-40 ${
                      added
                        ? "border-[var(--green)] bg-[var(--green)] font-bold text-white"
                        : "border-[var(--line)] bg-white text-[var(--ink-2)] hover:border-[var(--green)]"
                    }`}
                  >
                    {t}
                    <span className="ml-1 text-[11px] opacity-70">〜{endOf(t, duration)}</span>
                  </button>
                );
              })}
            </div>

            {/* 一覧にない時間を使いたいとき */}
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-[var(--canvas)] p-3">
              <span className="text-[12px] text-[var(--muted)]">別の日時を直接入力</span>
              <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="rounded-md border border-[var(--line)] bg-white px-2 py-1.5 text-[13px]"
              />
              <input
                type="time"
                value={manualStart}
                onChange={(e) => setManualStart(e.target.value)}
                className="rounded-md border border-[var(--line)] bg-white px-2 py-1.5 text-[13px]"
              />
              <button
                type="button"
                disabled={!manualDate || !manualStart || full}
                onClick={() => {
                  addSlot(manualDate, manualStart);
                  setManualStart("");
                }}
                className={`${btn("secondary", "sm")} disabled:opacity-40`}
              >
                追加
              </button>
            </div>
          </div>

          {/* 選んだ候補 */}
          <div>
            <div className="mb-2 text-[13px] font-semibold text-[var(--ink-2)]">
              選んだ候補（{slots.length}／{MAX_SLOTS}）
            </div>
            {slots.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[var(--line)] p-4 text-center text-[12px] text-[var(--muted)]">
                まだ候補がありません。上の時刻を押して追加してください。
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {slots.map((s) => (
                  <li
                    key={`${s.date}-${s.start}`}
                    className="flex items-center gap-2 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-[13px]"
                  >
                    <span className="flex-1 text-[var(--ink)]">
                      {labelOf(s.date)} {s.start}〜{endOf(s.start, duration)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSlots(slots.filter((x) => !(x.date === s.date && x.start === s.start)))}
                      className="text-[12px] text-[var(--red)] underline"
                    >
                      削除
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <label className="flex flex-col gap-1 text-[13px] text-[var(--ink-2)]">
            備考（任意）
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={2}
              placeholder="例：オンライン・対面どちらでも対応できます。"
              className={input()}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={insert}
              disabled={!slots.length}
              className={`${btn("primary", "sm")} disabled:opacity-40`}
            >
              {insertLabel}
            </button>
            <button type="button" onClick={onClose} className={btn("secondary", "sm")}>
              キャンセル
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
