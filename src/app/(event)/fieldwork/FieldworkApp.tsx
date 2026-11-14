"use client";

// 共創フィールドワークの記入画面（2026-11-18 都城・霧島バスフィールドワーク）。
//
// ⚠️ バスで山間部を移動しながら使う。**書いた内容が圏外で消えるのが最悪のシナリオ**なので、
//    入力は一文字ごとに localStorage へ保存し、通信するのは「企画書を作る」を押した瞬間だけにする。
//    途中でサーバーへ送らない＝圏外でも書き続けられる。
// ⚠️ できた企画書も localStorage に残す。再読み込みしても消えない（発表前に消えたら取り返せない）。
// ⚠️ 入力欄はすべて制御コンポーネントにする（React 19 はサーバーアクション完了時に form を
//    リセットするため、defaultValue 方式だと送信エラーで入力が消える。協賛フォームで既に踏んだ件）。
// ⚠️ 紙のワークブックと**同じ見出し番号・同じ項目名**を使う。参加者は紙とスマホを行き来するので、
//    言葉がずれると迷う。
import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { btn, input as inputCls } from "@/lib/ui";
import {
  AFTER_FIELDS,
  COMPARE_ROWS,
  COVER_FIELDS,
  FIELDWORK_EVENT_DATE,
  FIELDWORK_FIELD_MAX,
  GATES,
  PARTNER_BRIEFS,
  SECTIONS,
  TIMETABLE,
  allBodyFields,
  answersToPrompt,
  filledCount,
  type Field,
  type FieldworkAnswers,
  type FieldworkReport,
} from "@/lib/fieldwork-core";
import { generateFieldworkReport, type GenerateState } from "./actions";
import ProposalDoc from "./ProposalDoc";

const STORE_KEY = "nakama-fieldwork-miyazaki-2026-1118";
const STORE_REPORT_KEY = `${STORE_KEY}-report`;

/** 画面の順番。0=はじめに、1〜6=§2〜§7、7=確認、8=企画書 */
const STEP_COVER = 0;
const STEP_CONFIRM = SECTIONS.length + 1;
const STEP_DONE = SECTIONS.length + 2;

const labelCls = "flex flex-col gap-1.5 text-[14px] font-semibold text-[var(--ink)]";
const hintCls = "text-[13px] font-normal leading-6 text-[var(--muted)]";
const tap = "min-h-[44px]";

export default function FieldworkApp() {
  const [answers, setAnswers] = useState<FieldworkAnswers>({});
  const [step, setStep] = useState(STEP_COVER);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [report, setReport] = useState<FieldworkReport | null>(null);
  const [code, setCode] = useState("");
  const [showTimetable, setShowTimetable] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);

  const [state, formAction, pending] = useActionState<GenerateState, FormData>(
    generateFieldworkReport,
    null
  );

  // ── 端末から復元（初回だけ） ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as FieldworkAnswers;
        if (parsed && typeof parsed === "object") setAnswers(parsed);
      }
      const rawReport = localStorage.getItem(STORE_REPORT_KEY);
      if (rawReport) {
        const parsed = JSON.parse(rawReport) as FieldworkReport;
        if (parsed && typeof parsed === "object" && parsed.projectName !== undefined) {
          setReport(parsed);
        }
      }
    } catch {
      // 壊れていても画面は出す（空から書き始められる方が大事）
    }
    setLoaded(true);
  }, []);

  // ── 端末へ保存（入力が変わるたび。300ms まとめる） ──
  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(answers));
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      } catch {
        // 容量超過・プライベートモードなど。書けなくても入力は続けられる
      }
    }, 300);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [answers, loaded]);

  // ── 生成に成功したら企画書を表示して端末にも残す ──
  useEffect(() => {
    if (state?.ok) {
      setReport(state.report);
      try {
        localStorage.setItem(STORE_REPORT_KEY, JSON.stringify(state.report));
      } catch {
        /* 残せなくても画面には出る */
      }
      setStep(STEP_DONE);
    }
  }, [state]);

  // 画面を切り替えたら先頭へ（長い章の途中から始まると迷う）
  useEffect(() => {
    topRef.current?.scrollIntoView({ block: "start" });
  }, [step]);

  const set = useCallback((key: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value.slice(0, FIELDWORK_FIELD_MAX) }));
  }, []);

  const bodyFields = useMemo(() => allBodyFields(), []);
  const totalFilled = filledCount(answers, bodyFields);
  const totalFields = bodyFields.length;
  const answersText = useMemo(() => answersToPrompt(answers), [answers]);

  if (!loaded) {
    return <div className="px-5 py-16 text-center text-[14px] text-[var(--muted)]">読み込んでいます…</div>;
  }

  // ── 企画書ができた画面 ──
  if (step === STEP_DONE && report) {
    return (
      <>
        <div ref={topRef} />
        <ProposalDoc
          report={report}
          cover={{
            name: answers.name ?? "",
            company: answers.company ?? "",
            team: answers.team ?? "",
            partner: answers.chosen_partner ?? "",
          }}
          onBack={() => setStep(STEP_CONFIRM)}
        />
        <AfterSection answers={answers} set={set} />
      </>
    );
  }

  const section = step >= 1 && step <= SECTIONS.length ? SECTIONS[step - 1] : null;

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 pb-32 sm:px-6">
      <div ref={topRef} />

      {/* 上部：進み具合 */}
      <div className="sticky top-0 z-20 -mx-4 bg-white/95 px-4 pb-3 pt-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] tracking-[0.14em] text-[var(--muted)]">
            {step === STEP_COVER
              ? "はじめに"
              : step === STEP_CONFIRM
                ? "確認して企画書を作る"
                : `${section?.no} / 7`}
          </p>
          <p className="text-[11px] text-[var(--muted)]">
            {saved ? (
              <span className="text-[var(--green-d)]">保存しました</span>
            ) : (
              <>
                記入 {totalFilled} / {totalFields}
              </>
            )}
          </p>
        </div>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[var(--line-soft)]">
          <div
            className="h-full rounded-full bg-[var(--green)] transition-[width]"
            style={{ width: `${Math.round((totalFilled / totalFields) * 100)}%` }}
          />
        </div>
      </div>

      {/* ── はじめに ── */}
      {step === STEP_COVER ? (
        <div className="pt-5">
          <p className="text-[11px] tracking-[0.18em] text-[var(--muted)]">共創フィールドワーク</p>
          <h1 className="mt-2 font-serif text-[22px] leading-[1.5] text-[var(--ink)] sm:text-[26px]">
            西製茶と福山黒酢の現場から
            <br />
            自社との新しい事業をつくる
          </h1>
          <p className="mt-3 text-[13px] leading-6 text-[var(--muted)]">{FIELDWORK_EVENT_DATE}</p>

          <div className="mt-6 rounded-[10px] border border-[var(--line)] bg-[#fcfcfb] px-5 py-4">
            <h2 className="text-[14px] font-bold text-[var(--ink)]">この日のゴール</h2>
            <ul className="mt-2 flex flex-col gap-1.5 text-[13px] leading-6 text-[var(--ink-2)]">
              <li>・自社の特徴と、視察先が持つ資源・課題を言葉にする</li>
              <li>・西製茶または福山黒酢と、お互いに利益が生まれる共創案をつくる</li>
              <li>・AIで1枚の共創企画書にまとめ、90日以内の最初の一歩を発表する</li>
            </ul>
          </div>

          <div className="mt-5 rounded-[10px] border border-[var(--green-soft)] bg-[var(--green-soft)] px-5 py-4">
            <h2 className="text-[13px] font-bold text-[var(--green-d)]">書いた内容は端末に自動保存されます</h2>
            <p className="mt-1.5 text-[13px] leading-6 text-[var(--ink-2)]">
              通信するのは最後に「企画書を作る」を押したときだけです。山の中で電波が切れても、
              書いたものは消えません。紙のワークブックと同じ順番・同じ項目名なので、
              書きやすい方でお書きください。
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            {COVER_FIELDS.map((f) => (
              <label key={f.key} className={labelCls}>
                {f.label}
                <input
                  type="text"
                  value={answers[f.key] ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  className={`${inputCls()} w-full ${tap}`}
                  autoComplete="off"
                />
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowTimetable((v) => !v)}
            className={`mt-6 ${btn("secondary", "sm")} ${tap} w-full`}
          >
            {showTimetable ? "タイムテーブルを閉じる" : "当日のタイムテーブルを見る"}
          </button>
          {showTimetable ? (
            <div className="mt-3 overflow-hidden rounded-[10px] border border-[var(--line)]">
              {TIMETABLE.map((t, i) => (
                <div
                  key={`${t.time}-${i}`}
                  className={`grid grid-cols-[76px_1fr] gap-3 px-3.5 py-2.5 text-[12px] leading-5 ${
                    i % 2 ? "bg-[#fcfcfb]" : "bg-white"
                  }`}
                >
                  <span className="font-bold text-[var(--ink)]">{t.time}</span>
                  <span className="text-[var(--ink-2)]">
                    {t.place}
                    <br />
                    <span className="text-[var(--muted)]">{t.work}</span>
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ── §2〜§7 ── */}
      {section ? (
        <div className="pt-5">
          <p className="text-[11px] tracking-[0.18em] text-[var(--green)]">{section.when}</p>
          <h1 className="mt-2 flex items-baseline gap-2.5">
            <span className="font-serif text-[20px] text-[var(--green)]">{section.no}</span>
            <span className="font-serif text-[20px] leading-[1.5] text-[var(--ink)] sm:text-[22px]">
              {section.title}
            </span>
          </h1>
          <p className="mt-2.5 text-[13px] leading-6 text-[var(--muted)]">{section.lead}</p>

          {/* 視察先の基礎情報。バスではスライドが手元にないので、ここから読めるようにする */}
          {section.key === "nishi" || section.key === "kurozu" ? (
            <PartnerBriefBox which={section.key} />
          ) : null}

          {/* §5は比較表を先に出す（点数をつけてから1案を選ぶ順にするため） */}
          {section.key === "choose" ? <CompareTable answers={answers} set={set} /> : null}

          <div className="mt-6 flex flex-col gap-5">
            {section.fields.map((f) => (
              <FieldInput key={f.key} field={f} value={answers[f.key] ?? ""} onChange={set} />
            ))}
          </div>

          {section.tips ? (
            <div className="mt-7 rounded-[10px] border border-[var(--amber-line)] bg-[var(--amber-bg)] px-5 py-4">
              <h2 className="text-[13px] font-bold text-[var(--amber-ink)]">{section.tips.title}</h2>
              <ul className="mt-2 flex flex-col gap-1.5 text-[13px] leading-6 text-[var(--ink-2)]">
                {section.tips.items.map((t) => (
                  <li key={t}>・{t}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ── 確認して企画書を作る ── */}
      {step === STEP_CONFIRM ? (
        <form action={formAction} className="pt-5" noValidate>
          <p className="text-[11px] tracking-[0.18em] text-[var(--green)]">帰路バス内 15:25–15:45</p>
          <h1 className="mt-2 font-serif text-[20px] leading-[1.5] text-[var(--ink)] sm:text-[22px]">
            確認して、企画書を作る
          </h1>
          <p className="mt-2.5 text-[13px] leading-6 text-[var(--muted)]">
            紙のワークブック§8「AIで共創レポートを作る」にあたる工程です。
            書き写す必要はありません。これまでに記入した内容がそのまま渡ります。
          </p>

          {/* 3つの関門 */}
          <div className="mt-6 rounded-[10px] border border-[var(--line)] bg-white px-5 py-4">
            <h2 className="text-[14px] font-bold text-[var(--ink)]">次のステップへ進む前の3つの関門</h2>
            <div className="mt-3 flex flex-col gap-3">
              {GATES.map((g) => (
                <label key={g.key} className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={(answers[g.key] ?? "") === "1"}
                    onChange={(e) => set(g.key, e.target.checked ? "1" : "")}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--green)]"
                  />
                  <span className="text-[13px] leading-6">
                    <span className="font-bold text-[var(--ink)]">{g.label}</span>
                    <br />
                    <span className="text-[var(--muted)]">{g.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 注意（紙の注意書きと同じ） */}
          <div className="mt-5 rounded-[10px] border border-[#E7C7BE] bg-[var(--red-soft)] px-5 py-4">
            <h2 className="text-[13px] font-bold text-[var(--red)]">AIへ送る前にご確認ください</h2>
            <p className="mt-1.5 text-[13px] leading-6 text-[var(--ink-2)]">
              未公開の価格、個人情報、契約情報、営業秘密は入力しないでください。
              下の「AIへ渡す内容」に含まれていないかお確かめください。
            </p>
          </div>

          {/* AIへ渡す内容 */}
          <details className="mt-5 rounded-[10px] border border-[var(--line)] bg-[#fcfcfb]">
            <summary className={`cursor-pointer px-5 py-3.5 text-[14px] font-bold text-[var(--ink)] ${tap}`}>
              AIへ渡す内容を確認する（{totalFilled} 項目）
            </summary>
            <div className="border-t border-[var(--line-soft)] px-5 py-4">
              <pre className="whitespace-pre-wrap break-words font-sans text-[12px] leading-6 text-[var(--ink-2)]">
                {answersText || "まだ何も記入されていません。"}
              </pre>
            </div>
          </details>

          {/* 参加コード */}
          <label className={`mt-6 ${labelCls}`}>
            参加コード
            <span className={hintCls}>当日お配りしたコードを入力してください。</span>
            <input
              type="text"
              name="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={`${inputCls()} w-full ${tap} tracking-[0.2em]`}
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="例）FW0000"
            />
          </label>

          {/* 控えの送り先（任意） */}
          <label className={`mt-5 ${labelCls}`}>
            控えの受け取り先メールアドレス（任意）
            <span className={hintCls}>
              帰社後の社内説明に使う場合にご記入ください。空欄でも企画書は作れます。
            </span>
            <input
              type="email"
              value={answers.email ?? ""}
              onChange={(e) => set("email", e.target.value)}
              className={`${inputCls()} w-full ${tap}`}
              autoComplete="email"
              inputMode="email"
            />
          </label>

          {/* サーバーへ渡すのはこの2つ（入力は端末の localStorage が持っている） */}
          <input type="hidden" name="answers" value={JSON.stringify(answers)} />
          <input
            type="text"
            name="_gotcha"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute left-[-9999px] h-0 w-0 opacity-0"
          />

          {state && !state.ok ? (
            <p className="mt-5 rounded-[8px] border border-[#E7C7BE] bg-[var(--red-soft)] px-4 py-3 text-[13px] leading-6 text-[var(--red)]">
              {state.error}
            </p>
          ) : null}

          <button type="submit" disabled={pending} className={`mt-6 w-full ${btn("action", "lg")} ${tap}`}>
            {pending ? "企画書を作っています…（30秒ほどかかります）" : "企画書を作る"}
          </button>
          <p className="mt-2.5 text-center text-[12px] leading-5 text-[var(--muted)]">
            電波の良いところで押してください。失敗しても記入した内容は残ります。
          </p>
        </form>
      ) : null}

      {/* 下部：前へ／次へ */}
      {step !== STEP_DONE ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-white/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-[720px] items-center gap-3 px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(STEP_COVER, s - 1))}
              disabled={step === STEP_COVER}
              className={`${btn("secondary", "md")} ${tap} flex-1`}
            >
              前へ
            </button>
            {step < STEP_CONFIRM ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(STEP_CONFIRM, s + 1))}
                className={`${btn("primary", "md")} ${tap} flex-[2]`}
              >
                次へ
              </button>
            ) : report ? (
              <button
                type="button"
                onClick={() => setStep(STEP_DONE)}
                className={`${btn("secondary", "md")} ${tap} flex-[2]`}
              >
                できた企画書を見る
              </button>
            ) : (
              <span className="flex-[2] text-center text-[12px] leading-5 text-[var(--muted)]">
                上の「企画書を作る」を押してください
              </span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** 1項目の入力欄。 */
function FieldInput({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: string;
  onChange: (key: string, value: string) => void;
}) {
  if (field.type === "choice") {
    return (
      <div className={labelCls}>
        {field.label}
        {field.hint ? <span className={hintCls}>{field.hint}</span> : null}
        <div className="mt-0.5 flex flex-wrap gap-2">
          {(field.choices ?? []).map((c) => {
            const on = value === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => onChange(field.key, on ? "" : c)}
                aria-pressed={on}
                className={`${tap} rounded-lg border px-4 py-2 text-[14px] font-bold transition ${
                  on
                    ? "border-[var(--green)] bg-[var(--green)] text-white"
                    : "border-[var(--line)] bg-white text-[var(--ink)]"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.type === "text") {
    return (
      <label className={labelCls}>
        {field.label}
        {field.hint ? <span className={hintCls}>{field.hint}</span> : null}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={`${inputCls()} w-full ${tap}`}
          autoComplete="off"
        />
      </label>
    );
  }

  return (
    <label className={labelCls}>
      {field.label}
      {field.hint ? <span className={hintCls}>{field.hint}</span> : null}
      <textarea
        value={value}
        onChange={(e) => onChange(field.key, e.target.value)}
        rows={Math.max(3, (field.rows ?? 2) + 1)}
        className={`${inputCls()} w-full resize-y leading-[1.9]`}
      />
    </label>
  );
}

/** 視察先の基礎情報（進行スライド由来）。畳んでおき、読みたい人だけ開く。 */
function PartnerBriefBox({ which }: { which: "nishi" | "kurozu" }) {
  const b = PARTNER_BRIEFS[which];
  return (
    <details className="mt-5 rounded-[10px] border border-[var(--line)] bg-[#fcfcfb]">
      <summary className={`cursor-pointer px-4 py-3 text-[14px] font-bold text-[var(--ink)] ${tap}`}>
        {b.name}について（主催者資料）
      </summary>
      <div className="border-t border-[var(--line-soft)] px-4 py-3.5">
        <ul className="flex flex-col gap-2 text-[13px] leading-[1.85] text-[var(--ink-2)]">
          {b.lines.map((l) => (
            <li key={l} className="flex gap-2">
              <span className="shrink-0 text-[var(--green)]">・</span>
              <span>{l}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] leading-5 text-[var(--muted)]">
          出典：当日の進行スライド。現地で見聞きしたことと取り違えないようご注意ください。
        </p>
      </div>
    </details>
  );
}

/** §5の比較表。西製茶案と福山黒酢案に同じ6項目で点数をつける。 */
function CompareTable({
  answers,
  set,
}: {
  answers: FieldworkAnswers;
  set: (key: string, value: string) => void;
}) {
  return (
    <div className="mt-6 rounded-[10px] border border-[var(--line)] bg-white px-4 py-4 sm:px-5">
      <h2 className="text-[14px] font-bold text-[var(--ink)]">2案を5点満点で比べる</h2>
      <p className="mt-1 text-[12px] leading-5 text-[var(--muted)]">
        つけた点数も企画書づくりの判断材料として渡ります。
      </p>
      <div className="mt-4 flex flex-col gap-5">
        {COMPARE_ROWS.map((r) => (
          <div key={r.key}>
            <p className="text-[13px] font-semibold leading-5 text-[var(--ink)]">{r.label}</p>
            {(
              [
                ["nishi", "西製茶案"],
                ["kurozu", "福山黒酢案"],
              ] as const
            ).map(([side, label]) => {
              const key = `${r.key}_${side}`;
              const cur = answers[key] ?? "";
              return (
                <div key={side} className="mt-2 flex items-center gap-2">
                  <span className="w-[62px] shrink-0 text-[11px] leading-4 text-[var(--muted)] sm:w-[78px] sm:text-[12px]">
                    {label}
                  </span>
                  {/* 5つのボタンは幅いっぱいに割る。固定幅だと375pxで右端がはみ出す（2026-11-14に実機幅で確認） */}
                  <div className="grid flex-1 grid-cols-5 gap-1.5">
                    {["1", "2", "3", "4", "5"].map((n) => {
                      const on = cur === n;
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => set(key, on ? "" : n)}
                          aria-label={`${label} ${r.label} ${n}点`}
                          aria-pressed={on}
                          className={`h-11 w-full rounded-lg border text-[14px] font-bold transition ${
                            on
                              ? "border-[var(--green)] bg-[var(--green)] text-white"
                              : "border-[var(--line)] bg-white text-[var(--ink-2)]"
                          }`}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/** §9 発表後の記録。企画書ができたあとに書く。 */
function AfterSection({
  answers,
  set,
}: {
  answers: FieldworkAnswers;
  set: (key: string, value: string) => void;
}) {
  return (
    <div className="fw-noprint mx-auto w-full max-w-[860px] px-4 pb-24 sm:px-6">
      <div className="rounded-[10px] border border-[var(--line)] bg-[#fcfcfb] px-5 py-5 sm:px-7">
        <p className="text-[11px] tracking-[0.18em] text-[var(--green)]">帰路バス内 15:45–16:10</p>
        <h2 className="mt-2 flex items-baseline gap-2.5">
          <span className="font-serif text-[18px] text-[var(--green)]">9</span>
          <span className="font-serif text-[18px] text-[var(--ink)]">発表後の記録</span>
        </h2>
        <p className="mt-2 text-[13px] leading-6 text-[var(--muted)]">
          2分発表のあとに書いてください。ここも端末に自動保存されます。
        </p>
        <div className="mt-5 flex flex-col gap-5">
          {AFTER_FIELDS.map((f) => (
            <FieldInput key={f.key} field={f} value={answers[f.key] ?? ""} onChange={set} />
          ))}
        </div>
      </div>
    </div>
  );
}
