"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { submitSponsorApplication, type SponsorState } from "./actions";
import { btn, input, inputBare } from "@/lib/ui";
import {
  COURSES, PLAN_CONSULT, yen, yenFull, ANNUAL_MEMBER, BOOTH_OPTION, plansFor, findCourse,
  LOCAL_DISCOUNT_COURSE, LOCAL_DISCOUNT_LABEL,
  CO_CREATION_THEMES, DESIRED_BENEFITS, DESIRED_BENEFITS_NOTE, LOGO_SUBMISSION, CONSENTS,
  APPLY_STEPS, COURSE_SHORT, isCourseOpen, COURSE_CLOSED_LABEL,
  PLAN_TAGLINE, planBadge, PLAN_CTA_CONSULT, PLAN_CARD_FEATURES,
  PLAN_NO, PLAN_NICKNAME, PLAN_ACCENT, yenParts,
  benefitIncluded, applicationTotal, presentationSlot, PRESENTATION_IMAGE,
  type SponsorPlan,
} from "@/lib/sponsor";

// Food Japan Summit 2026 協賛申込フォーム（4ステップ）。
//
// ⚠️ 送信する値（input の name / value / FormData の形）は 2026-08-18 の改修でも**一切変えていない**。
//    見た目とステップ分割だけを変えている。メール本文（src/lib/email.ts）も無変更。
// ⚠️ **入力欄はすべて制御コンポーネントにする**。React 19 はサーバーアクション完了時に form を
//    リセットするため、defaultValue 方式だと送信エラーで入力が全部消える
//    （認証フォームで実際に踏んで commit c08dcb7 で直した件と同じ）。
// ⚠️ **ステップを切り替えても DOM から外さない**（hidden で隠すだけ）。外すと入力値が消え、
//    さらに FormData に載らなくなる。hidden な input は送信対象に残るのでこれで正しい。
// ⚠️ form に noValidate を付け、必須の判定は自前で行う。折りたたみや非表示ステップの中に
//    required な欄があると、ブラウザは「フォーカスできない欄」を検証しようとして
//    **無言で送信を止める**（エラーも出ない）。表示中ステップにだけ required を付けるのは
//    支援技術向けの意味づけとして残している。

/** 入力欄の name → 属するステップ。サーバーからのエラーで戻す先を決めるのに使う。 */
const FIELD_STEP: Record<string, number> = {
  course: 0, isLocalCorp: 0,
  plan: 1,
  company: 2, companyKana: 2, name: 2, department: 2, email: 2, phone: 2,
  address: 2, website: 2, purpose: 2, invoiceName: 2, logoSubmission: 2,
  consent: 3,
};

const EMPTY_TEXT = {
  company: "", companyKana: "", name: "", department: "", email: "", phone: "",
  address: "", website: "", purpose: "", presentation: "",
  invoiceName: "", invoiceNote: "", message: "",
};
type TextKey = keyof typeof EMPTY_TEXT;

const qCls = "text-[18px] font-bold text-[var(--ink)]";
const labelCls = "flex flex-col gap-1.5 text-[14px] font-semibold text-[var(--ink)]";
const hintCls = "text-[13px] font-normal leading-6 text-[var(--muted)]";
const cardCls = "rounded-[10px] border border-[var(--line)] bg-white";
const req = <span className="ml-1 rounded-[3px] bg-[var(--red-soft)] px-1.5 py-0.5 text-[11px] font-bold text-[var(--red)]">必須</span>;
const opt = <span className="ml-1 rounded-[3px] bg-[var(--green-soft)] px-1.5 py-0.5 text-[11px] font-bold text-[var(--green-d)]">任意</span>;

/** 44px 以上のタップ領域を確保するための最低高さ（指示書19）。 */
const tap = "min-h-[44px]";

function fieldCls(err?: string): string {
  return err
    ? `${inputBare()} w-full border border-[var(--red)] bg-[var(--red-soft)]`
    : `${input()} w-full`;
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <span role="alert" className="text-[13px] font-normal leading-5 text-[var(--red)]">
      {msg}
    </span>
  );
}

export function SponsorForm() {
  const [state, action, pending] = useActionState<SponsorState, FormData>(submitSponsorApplication, {});

  const [step, setStep] = useState(0);
  // 開催は未選択から始める（STEP1 を本当の選択にする）。
  const [course, setCourse] = useState("");
  const [isLocal, setIsLocal] = useState(false);
  const [plan, setPlan] = useState("");
  const [annualMember, setAnnualMember] = useState(false);
  const [boothOption, setBoothOption] = useState(false);
  const [text, setText] = useState({ ...EMPTY_TEXT });
  const [themes, setThemes] = useState<string[]>([]);
  const [benefits, setBenefits] = useState<string[]>([]);
  const [logoSubmission, setLogoSubmission] = useState(LOGO_SUBMISSION[0]);
  const [consent, setConsent] = useState<boolean[]>(CONSENTS.map(() => false));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [openPlan, setOpenPlan] = useState<string | null>(null);
  // 請求・ロゴは必須を含むので**開いた状態から始める**（閉じたまま気づかず送信できないように）。
  const [billingOpen, setBillingOpen] = useState(true);
  // 図を出すモーダル（ブースのレイアウト図・登壇のイメージで共用）。
  const [imageModal, setImageModal] = useState<
    { title: string; src: string; alt: string; caption: string } | null
  >(null);
  const [imgFailed, setImgFailed] = useState(false);

  // モーダルは Esc で閉じ、開いている間は背後をスクロールさせない。
  useEffect(() => {
    if (!imageModal) return;
    setImgFailed(false); // 別の図を開いたら読み込み失敗の表示をリセットする
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setImageModal(null); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [imageModal]);

  // 締め切りの判定。
  // ⚠️ このページは静的生成なので、レンダー時に new Date() を読むと**ビルド時刻で固まる**。
  //    マウント後にブラウザの時計で判定する。初期値 null＝「まだ判定しない（全部選べる）」なので、
  //    プリレンダーしたHTMLと初回描画が一致し、ハイドレーションのずれも起きない。
  // ⚠️ ブラウザの時計は当てにならない（時計を戻せば通る）。**本当の関所は actions.ts**。
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); }, []);
  const isClosed = (code: string) => now !== null && !isCourseOpen(code, now);

  // 締め切った開催が選ばれたままにならないようにする（時計が日付をまたいだ場合など）。
  useEffect(() => {
    if (course && isClosed(course)) pickCourse("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, course]);

  const courseObj = findCourse(course) ?? null;
  // ⚠️ 特別割は宮崎開催のみ。名古屋のみ・両開催では効かせない（両開催向けの特別価格は定義しない）。
  const localEligible = course === LOCAL_DISCOUNT_COURSE;
  const effectiveLocal = isLocal && localEligible;
  const plans = courseObj ? plansFor(courseObj, effectiveLocal) : [];
  const selectedPlan: SponsorPlan | null = plans.find((p) => p.code === plan) ?? null;
  const total = applicationTotal(selectedPlan, boothOption);

  const setField = (k: TextKey, v: string) => {
    setText((t) => ({ ...t, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: "" } : e));
  };

  /** 開催を変えたら、プランと特別割は必ず捨てる（価格表が入れ替わるため）。 */
  const pickCourse = (code: string) => {
    setCourse(code);
    setPlan("");
    if (code !== LOCAL_DISCOUNT_COURSE) setIsLocal(false);
    setOpenPlan(null);
    setErrors((e) => ({ ...e, course: "", plan: "" }));
  };

  const toggleIn = (list: string[], v: string) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  function validate(s: number): Record<string, string> {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!course) e.course = "協賛する開催場所を選択してください。";
      else if (isClosed(course)) e.course = `${findCourse(course)?.label ?? "この開催"}の受付は終了しました。`;
    }
    if (s === 1) {
      if (!plan) e.plan = "希望する協賛プランを選択してください。";
    }
    if (s === 2) {
      if (!text.company.trim()) e.company = "法人・団体名を入力してください。";
      if (!text.companyKana.trim()) e.companyKana = "法人・団体名（フリガナ）を入力してください。";
      if (!text.name.trim()) e.name = "ご担当者名を入力してください。";
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text.email.trim())) e.email = "正しいメールアドレスを入力してください。";
      if (!text.phone.trim()) e.phone = "電話番号を入力してください。";
      if (!text.address.trim()) e.address = "所在地を入力してください。";
      if (!text.purpose.trim()) e.purpose = "協賛を通じて実現したいことを入力してください。";
      if (!text.invoiceName.trim()) e.invoiceName = "請求書の宛名を入力してください。";
      if (!LOGO_SUBMISSION.includes(logoSubmission)) e.logoSubmission = "ロゴデータの提出方法を選択してください。";
    }
    if (s === 3) {
      if (consent.some((c) => !c)) e.consent = "同意事項のすべてにチェックしてください。";
    }
    return e;
  }

  /** 最初にエラーが出るステップを探す（見つからなければ null）。 */
  function firstInvalid(upTo: number): { s: number; e: Record<string, string> } | null {
    for (let s = 0; s <= upTo; s++) {
      const e = validate(s);
      if (Object.keys(e).length > 0) return { s, e };
    }
    return null;
  }

  const [focusField, setFocusField] = useState<string | null>(null);
  useEffect(() => {
    if (!focusField) return;
    const el = document.querySelector<HTMLElement>(`[data-field="${focusField}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    setFocusField(null);
  }, [focusField]);

  const goTo = (target: number) => {
    if (target <= step) {
      setStep(target);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const bad = firstInvalid(target - 1);
    if (bad) {
      setErrors(bad.e);
      setStep(bad.s);
      setFocusField(Object.keys(bad.e)[0]);
      return;
    }
    setErrors({});
    setStep(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // サーバー側の項目エラーは、その項目が属するステップまで戻して見せる。
  useEffect(() => {
    const f = state.fields;
    if (!f) return;
    const keys = Object.keys(f).filter((k) => f[k]);
    if (keys.length === 0) return;
    setErrors(f);
    const back = Math.min(...keys.map((k) => FIELD_STEP[k] ?? 3));
    setStep(back);
    setFocusField(keys.find((k) => (FIELD_STEP[k] ?? 3) === back) ?? keys[0]);
  }, [state.fields]);

  const onSubmit = (ev: React.FormEvent<HTMLFormElement>) => {
    const bad = firstInvalid(3);
    if (bad) {
      ev.preventDefault();
      setErrors(bad.e);
      setStep(bad.s);
      setFocusField(Object.keys(bad.e)[0]);
    }
  };

  if (state.ok) {
    return (
      <div className="rounded-[12px] border border-[var(--green)] bg-[var(--green-soft)] p-8">
        <h2 className="text-[20px] font-bold text-[var(--ink)]">お申し込みありがとうございます。</h2>
        <p className="mt-3 text-[15px] leading-8 text-[var(--ink-2)]">
          内容を確認のうえ、フードジャパンサミット実行委員会より、協賛内容・ロゴデータの提出方法・請求書・今後の進行についてご連絡します。
          <br />
          Food Japan Summit 2026 で、共に新しい事業を生み出していけることを楽しみにしております。
        </p>
        <p className="mt-4 text-[14px] text-[var(--ink-2)]">
          受付番号：<b>{state.refNo}</b>（お問い合わせの際にお伝えください）
        </p>
      </div>
    );
  }

  // ── 申込内容サマリー（PCは右カラム、スマホは画面下の固定バー）──────────
  const courseText = courseObj
    ? `${courseObj.label}${effectiveLocal ? "（宮崎県法人 特別割）" : ""}`
    : "未選択";
  const planText = !plan
    ? "未選択"
    : plan === PLAN_CONSULT
      ? "内容を相談して決めたい"
      : selectedPlan
        ? selectedPlan.name
        : "未選択";
  const amountText = selectedPlan ? `${yenFull(selectedPlan.price)}（税別）` : "事務局と相談";
  const totalText = total === null ? "事務局と相談" : `${yenFull(total)}（税別）`;

  const summaryRows: { k: string; v: string }[] = [
    { k: "開催", v: courseText },
    { k: "プラン", v: planText },
    { k: "協賛金額", v: amountText },
    { k: "年間会員", v: annualMember ? "相談あり" : "なし" },
    { k: "ブース", v: boothOption ? `あり（${yenFull(BOOTH_OPTION.price)}）` : "なし" },
  ];

  const Summary = (
    <div className={`${cardCls} p-4`}>
      <h2 className="text-[14px] font-bold text-[var(--ink)]">現在の申込内容</h2>
      <dl className="mt-3 flex flex-col gap-2 border-t border-[var(--line-soft)] pt-3">
        {summaryRows.map((r) => (
          <div key={r.k} className="flex items-baseline justify-between gap-3 text-[13px]">
            <dt className="shrink-0 text-[var(--muted)]">{r.k}</dt>
            <dd className="text-right font-semibold text-[var(--ink)]">{r.v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 border-t border-[var(--line)] pt-3">
        <p className="text-[12px] text-[var(--muted)]">現時点の申込金額</p>
        <p className="mt-0.5 text-[18px] font-bold text-[var(--green-d)]">{totalText}</p>
        {annualMember ? (
          <p className="mt-1.5 text-[12px] leading-5 text-[var(--muted)]">
            年間会員は「相談」のため金額に含めていません。
          </p>
        ) : null}
      </div>
    </div>
  );

  // モバイル固定バーのラベル（選択中の要点だけ）。
  // ⚠️ 幅が狭いので開催は短縮表記を使う（「宮崎・名古屋の両開催」だと省略されて読めない）。
  const barPick = [
    course ? `${COURSE_SHORT[course] ?? courseObj?.label}${effectiveLocal ? "・特別割" : ""}` : "開催 未選択",
    planText === "未選択" ? "プラン 未選択" : planText,
  ].join("｜");

  return (
    <form action={action} onSubmit={onSubmit} noValidate className="flex flex-col pb-[104px] lg:pb-0">
      {/* ── ステップナビ（常時表示・現在地を強調）───────────────── */}
      <nav
        aria-label="申込の進行状況"
        className="sticky top-0 z-30 -mx-4 border-b border-[var(--line)] bg-white/95 px-4 py-3 backdrop-blur"
      >
        <ol className="flex gap-2 overflow-x-auto sm:gap-3">
          {APPLY_STEPS.map((s, i) => {
            const cur = i === step;
            const done = i < step;
            return (
              <li key={s.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={cur ? "step" : undefined}
                  className={`flex flex-col items-start rounded-[8px] border px-3 py-1.5 text-left transition ${
                    cur
                      ? "border-[var(--green)] bg-[var(--green-soft)]"
                      : done
                        ? "border-[var(--line)] bg-white"
                        : "border-[var(--line-soft)] bg-white"
                  }`}
                >
                  <span
                    className={`text-[11px] font-bold tracking-[0.12em] ${
                      cur ? "text-[var(--green-d)]" : "text-[var(--muted)]"
                    }`}
                  >
                    {s.no}
                  </span>
                  <span
                    className={`text-[13px] whitespace-nowrap ${
                      cur ? "font-bold text-[var(--ink)]" : "text-[var(--ink-2)]"
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_284px]">
        <div className="flex min-w-0 flex-col gap-7">
          {/* ══ STEP 1｜開催を選ぶ ══════════════════════════ */}
          <div hidden={step !== 0} className="flex flex-col gap-7">
            <section className="flex flex-col gap-3" data-field="course">
              <h2 className={qCls}>協賛する開催場所{req}</h2>
              <p className={hintCls}>選んだ開催に応じて、次の画面のプランと価格が切り替わります。</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {COURSES.map((c) => {
                  const on = c.code === course;
                  // 締め切った開催は**隠さずに、押せない状態で見せる**（消えていると
                  // 「あったはずの選択肢が無い」と混乱するため）。
                  const closed = isClosed(c.code);
                  return (
                    <label
                      key={c.code}
                      className={`${tap} flex items-start gap-3 rounded-[10px] border-2 p-4 transition ${
                        closed
                          ? "cursor-not-allowed border-[var(--line-soft)] bg-[var(--surface)]"
                          : on
                            ? "cursor-pointer border-[var(--green)] bg-[var(--green-soft)]"
                            : "cursor-pointer border-[var(--line)] bg-white hover:border-[var(--green)]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="course"
                        value={c.code}
                        autoComplete="off"
                        checked={on}
                        disabled={closed}
                        required={step === 0}
                        onChange={() => pickCourse(c.code)}
                        className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--green)]"
                      />
                      <span className={`min-w-0 ${closed ? "opacity-55" : ""}`}>
                        <span className="flex flex-wrap items-center gap-1.5 text-[16px] font-bold text-[var(--ink)]">
                          {c.label}
                          {closed ? (
                            <span className="rounded-[3px] bg-[var(--line)] px-1.5 py-0.5 text-[11px] font-bold text-[var(--ink-2)]">
                              {COURSE_CLOSED_LABEL}
                            </span>
                          ) : null}
                          {on ? (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--green)]" aria-hidden>
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          ) : null}
                        </span>
                        {/* 日程・会場もタイトルと同じ太さにする（ユーザー指定 2026-08-18）。
                            ⚠️ 会場名は**日程と同じ行に続けない**（「宮崎観光ホ／テル」のように
                               途中で折れて読みにくかった）。行を分けて会場名を丸ごと1行に置く。 */}
                        {c.plans.length > 0 ? (
                          c.venues.map((v) => (
                            <span key={v.label} className="mt-1 block text-[13px] font-bold leading-6 text-[var(--ink-2)]">
                              <span className="block">{v.dates}</span>
                              <span className="block">{v.venue}</span>
                            </span>
                          ))
                        ) : (
                          <span className="mt-1 block text-[13px] font-bold leading-6 text-[var(--ink-2)]">
                            事務局と相談しながら最適な参加方法を決めます。
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
              <FieldError msg={errors.course} />
            </section>

            {/* 宮崎県法人 特別割＝**宮崎開催を選んだときだけ**出す（県外企業に見せない） */}
            {localEligible ? (
              <section
                data-field="isLocalCorp"
                className="rounded-[10px] border border-[var(--amber-line)] bg-[var(--amber-bg)] p-4"
              >
                <label className={`${tap} flex cursor-pointer items-start gap-3`}>
                  {/* ⚠️ autoComplete="off" は残す。ブラウザが再読み込みでチェックを復元すると
                      表示と state がずれる（実際に踏んだ）。 */}
                  <input
                    type="checkbox"
                    name="isLocalCorp"
                    autoComplete="off"
                    checked={isLocal}
                    onChange={(e) => { setIsLocal(e.target.checked); setPlan(""); }}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--amber-d)]"
                  />
                  <span>
                    <span className="text-[15px] font-bold text-[var(--ink)]">宮崎県内法人ですか？</span>
                    <span className="mt-1 block text-[13px] leading-6 text-[var(--ink-2)]">
                      {LOCAL_DISCOUNT_LABEL}の場合はチェックしてください。
                      特別割は<b>宮崎開催に限り</b>適用されます（名古屋開催・両開催は通常価格です）。
                    </span>
                  </span>
                </label>
                {isLocal ? (
                  <p className="mt-3 rounded-[8px] border border-[var(--amber)] bg-white px-3 py-2 text-[14px] font-bold text-[var(--amber-ink)]">
                    宮崎県法人 特別割プランが適用されます
                  </p>
                ) : null}
              </section>
            ) : null}

          </div>

          {/* ══ STEP 2｜プラン・オプションを選ぶ ═══════════════ */}
          <div hidden={step !== 1} className="flex flex-col gap-7">
            <section className="flex flex-col gap-3" data-field="plan">
              <h2 className={qCls}>希望協賛プラン{req}</h2>
              {courseObj ? (
                <p className={hintCls}>
                  {effectiveLocal ? "宮崎県法人 特別割価格" : courseObj.heading}
                  {courseObj.venues.length > 0 && courseObj.plans.length > 0
                    ? `／${courseObj.venues.map((v) => `${v.label} ${v.dates}`).join("・")}`
                    : ""}
                </p>
              ) : null}
              {(effectiveLocal ? courseObj?.localLead : courseObj?.lead) ? (
                <p className="text-[13px] leading-6 text-[var(--ink-2)]">
                  {effectiveLocal ? courseObj?.localLead : courseObj?.lead}
                </p>
              ) : null}

              {plans.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {plans.map((p) => {
                    const on = p.code === plan;
                    const accent = PLAN_ACCENT[p.code] ?? "--muted";
                    const badge = planBadge(course, p.code);
                    const shown = p.features.slice(0, PLAN_CARD_FEATURES);
                    const rest = p.features.length - shown.length;
                    const isOpen = openPlan === p.code;
                    const consultCta = PLAN_CTA_CONSULT.has(p.code);
                    return (
                      <div
                        key={p.code}
                        onClick={() => { setPlan(p.code); setErrors((e) => ({ ...e, plan: "" })); }}
                        className={`flex cursor-pointer flex-col overflow-hidden rounded-[10px] border-2 transition ${
                          on
                            ? "border-[var(--green)] bg-[var(--green-soft)]"
                            : "border-[var(--line)] bg-white hover:border-[var(--green)]"
                        }`}
                      >
                        {/* 上端のアクセントバー。プランごとの色で価格の階段を見せる。
                            ⚠️ 色は inline style で CSS変数を渡す（クラス名を動的に組み立てると
                               Tailwind がスキャンできずCSSが出ない）。 */}
                        <span
                          aria-hidden
                          className="block h-[5px] w-full shrink-0"
                          style={{ backgroundColor: `var(${accent})` }}
                        />
                        <div className="flex flex-1 flex-col p-4">
                          <label className="flex cursor-pointer items-start gap-2.5">
                            <input
                              type="radio"
                              name="plan"
                              value={p.code}
                              autoComplete="off"
                              checked={on}
                              required={step === 1}
                              onChange={() => { setPlan(p.code); setErrors((e) => ({ ...e, plan: "" })); }}
                              className="mt-1 h-5 w-5 shrink-0 accent-[var(--green)]"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span
                                  className="text-[12px] font-bold tracking-[0.14em]"
                                  style={{ color: `var(${accent})` }}
                                >
                                  {PLAN_NO[p.code]}｜{p.name}
                                </span>
                                {badge ? (
                                  <span
                                    className="rounded-[3px] px-1.5 py-0.5 text-[11px] font-bold text-white"
                                    style={{ backgroundColor: `var(${accent})` }}
                                  >
                                    {badge}
                                  </span>
                                ) : null}
                              </span>
                              {/* 日本語の通称（資料の表記）。プラン名そのものは上の英字。 */}
                              <span className="mt-0.5 block text-[22px] font-bold leading-tight text-[var(--ink)]">
                                {PLAN_NICKNAME[p.code] ?? p.name}
                              </span>
                            </span>
                          </label>

                          <span
                            aria-hidden
                            className="mt-3 block h-[2px] w-10 shrink-0"
                            style={{ backgroundColor: `var(${accent})` }}
                          />

                          {/* 数字だけ大きく（資料の見せ方） */}
                          <p className="mt-2 flex items-baseline gap-0.5 text-[var(--ink)]">
                            <span className="text-[38px] font-bold leading-none tracking-tight">
                              {yenParts(p.price).num}
                            </span>
                            <span className="text-[15px] font-bold">{yenParts(p.price).unit}</span>
                            <span className="ml-1 text-[12px] font-normal text-[var(--muted)]">（税別）</span>
                          </p>

                        <p className="mt-2 text-[13px] font-semibold leading-6 text-[var(--ink-2)]">
                          {PLAN_TAGLINE[p.code] ?? ""}
                        </p>

                        {/* 登壇（トークセッション）枠＝協賛で一番大きい価値なので、
                            特典リストに埋めずここに独立して出す。付かないプランは「なし」と明示する。 */}
                        {(() => {
                          const slot = presentationSlot(p);
                          const mic = (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden>
                              <path d="M12 3v10" /><path d="M9 6a3 3 0 016 0v4a3 3 0 01-6 0z" /><path d="M8 20h8" /><path d="M12 16v4" />
                            </svg>
                          );
                          // 枠が無いプランは押せない（見せる図が無い）。ここを押しても
                          // プランが選ばれないよう preventDefault + stopPropagation する。
                          if (!slot) {
                            return (
                              <p className="mt-2 flex items-center gap-1.5 rounded-[6px] bg-[var(--surface)] px-2.5 py-1.5 text-[13px] text-[var(--muted)]">
                                {mic}登壇枠：なし
                              </p>
                            );
                          }
                          return (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setImageModal({
                                  title: `登壇のイメージ（${slot}）`,
                                  src: PRESENTATION_IMAGE.src,
                                  alt: PRESENTATION_IMAGE.alt,
                                  caption: PRESENTATION_IMAGE.caption(slot),
                                });
                              }}
                              className="mt-2 flex w-full items-center gap-1.5 rounded-[6px] bg-[var(--amber-soft)] px-2.5 py-1.5 text-left text-[13px] font-bold text-[var(--amber-ink)] underline decoration-[var(--amber)] underline-offset-2 hover:bg-[var(--amber-line)]"
                            >
                              {mic}登壇枠：{slot}
                            </button>
                          );
                        })()}

                        <ul className="mt-2 flex flex-1 flex-col gap-1">
                          {shown.map((f) => (
                            <li key={f} className="flex gap-1.5 text-[13px] leading-6 text-[var(--ink-2)]">
                              <span aria-hidden className="shrink-0" style={{ color: `var(${accent})` }}>▸</span>
                              {f}
                            </li>
                          ))}
                        </ul>

                        {rest > 0 || p.note ? (
                          <>
                            {isOpen ? (
                              <ul className="mt-1 flex flex-col gap-1 border-t border-[var(--line-soft)] pt-2">
                                {p.features.slice(PLAN_CARD_FEATURES).map((f) => (
                                  <li key={f} className="flex gap-1.5 text-[13px] leading-6 text-[var(--ink-2)]">
                              <span aria-hidden className="shrink-0" style={{ color: `var(${accent})` }}>▸</span>
                              {f}
                            </li>
                                ))}
                                {p.note ? (
                                  <li className="text-[12px] leading-5 text-[var(--muted)]">※ {p.note}</li>
                                ) : null}
                              </ul>
                            ) : null}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setOpenPlan(isOpen ? null : p.code); }}
                              aria-expanded={isOpen}
                              className="mt-2 self-start text-[13px] font-bold text-[var(--green-d)] underline"
                            >
                              {isOpen ? "特典を閉じる" : `すべての特典を見る${rest > 0 ? `（他${rest}件）` : ""}`}
                            </button>
                          </>
                        ) : null}

                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setPlan(p.code); setErrors((x) => ({ ...x, plan: "" })); }}
                          className={`${btn(on ? "primary" : "secondary", "sm")} mt-3 w-full`}
                        >
                          {on ? "選択中" : consultCta ? `${p.name}を相談する` : `${p.name}を選ぶ`}
                        </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {/* 「内容を相談して決めたい」＝プランを選ばない選択肢 */}
              <label
                className={`${tap} flex cursor-pointer items-start gap-2.5 rounded-[10px] border-2 p-4 transition ${
                  plan === PLAN_CONSULT
                    ? "border-[var(--green)] bg-[var(--green-soft)]"
                    : "border-[var(--line)] bg-white hover:border-[var(--green)]"
                }`}
              >
                <input
                  type="radio"
                  name="plan"
                  value={PLAN_CONSULT}
                  autoComplete="off"
                  checked={plan === PLAN_CONSULT}
                  required={step === 1}
                  onChange={() => { setPlan(PLAN_CONSULT); setErrors((e) => ({ ...e, plan: "" })); }}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--green)]"
                />
                <span>
                  <span className="text-[15px] font-bold text-[var(--ink)]">内容を相談して決めたい</span>
                  <span className="mt-1 block text-[13px] leading-6 text-[var(--ink-2)]">
                    ご希望の開催・予算・実現したいことをうかがったうえで、事務局から協賛内容をご提案します。
                  </span>
                </span>
              </label>
              <FieldError msg={errors.plan} />
            </section>

            {/* 年間会員（独立オプションカード） */}
            <section className="flex flex-col gap-2.5">
              <h2 className={qCls}>オプション{opt}</h2>
              <label
                className={`flex cursor-pointer flex-col rounded-[10px] border-2 p-5 transition ${
                  annualMember
                    ? "border-[var(--gold-d)] bg-[var(--amber-bg)]"
                    : "border-[var(--gold)] bg-white hover:border-[var(--gold-d)]"
                }`}
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[16px] font-bold text-[var(--ink)]">＋ {ANNUAL_MEMBER.title}</span>
                  <span className="rounded-[3px] bg-[var(--gold)] px-1.5 py-0.5 text-[11px] font-bold text-white">
                    {ANNUAL_MEMBER.badge}
                  </span>
                </span>
                {/* ⚠️ カード全体が label なので、リンクを押したときにチェックが入らないよう
                    stopPropagation する。⚠️ 別タブで開くこと（このフォームは下書き保存を
                    持たないので、同じタブで移動すると入力中の内容が全部消える）。 */}
                <span className="mt-2 block">
                  <a
                    href={ANNUAL_MEMBER.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-baseline gap-1.5 text-[16px] font-bold leading-7 text-[var(--amber-ink)] underline decoration-[var(--amber)] underline-offset-4 hover:text-[var(--amber-d)]"
                  >
                    {ANNUAL_MEMBER.headline}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 self-center" aria-hidden>
                      <path d="M14 4h6v6" /><path d="M20 4l-9 9" /><path d="M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" />
                    </svg>
                  </a>
                  <span className="mt-1 block text-[12px] leading-5 text-[var(--muted)]">
                    FOOD JAPAN NAKAMA でできることは別タブで開きます（入力中の内容は消えません）。
                  </span>
                </span>
                <span className="mt-2 flex flex-wrap items-baseline gap-x-3">
                  <span className="text-[18px] font-bold text-[var(--ink)]">{ANNUAL_MEMBER.price}</span>
                  <span className="text-[13px] text-[var(--ink-2)]">{ANNUAL_MEMBER.seats}</span>
                </span>
                <span className="mt-2.5 grid gap-1 sm:grid-cols-2">
                  {ANNUAL_MEMBER.features.map((f) => (
                    <span key={f} className="text-[13px] leading-6 text-[var(--ink-2)]">・{f}</span>
                  ))}
                </span>
                <span className="mt-2 block text-[13px] leading-6 text-[var(--ink-2)]">{ANNUAL_MEMBER.note}</span>
                <span className="mt-1 block text-[12px] leading-5 text-[var(--muted)]">
                  ※ {ANNUAL_MEMBER.combinable}
                </span>
                <span className={`${tap} mt-3 flex items-center gap-2.5 border-t border-[var(--amber-line)] pt-3`}>
                  <input
                    type="checkbox"
                    name="annualMember"
                    autoComplete="off"
                    checked={annualMember}
                    onChange={(e) => setAnnualMember(e.target.checked)}
                    className="h-5 w-5 shrink-0 accent-[var(--amber-d)]"
                  />
                  <span className="text-[15px] font-bold text-[var(--ink)]">{ANNUAL_MEMBER.label}</span>
                </span>
              </label>

              {/* ブース出展（年間会員と同じデザイン体系・別枠の商品） */}
              <label
                className={`flex cursor-pointer flex-col rounded-[10px] border-2 p-5 transition ${
                  boothOption
                    ? "border-[var(--green)] bg-[var(--green-soft)]"
                    : "border-[var(--line)] bg-white hover:border-[var(--green)]"
                }`}
              >
                <span className="text-[16px] font-bold text-[var(--ink)]">＋ {BOOTH_OPTION.title}</span>
                <span className="mt-2 block text-[18px] font-bold text-[var(--green-d)]">
                  1ブース {yenFull(BOOTH_OPTION.price)}
                  <span className="ml-1 text-[12px] font-normal text-[var(--muted)]">（税別）</span>
                </span>
                <span className="mt-2 block text-[13px] leading-6 text-[var(--ink-2)]">{BOOTH_OPTION.lead}</span>
                <span className="mt-2 flex flex-wrap gap-1.5">
                  {BOOTH_OPTION.features.map((f) => (
                    <span key={f} className="rounded-[4px] border border-[var(--line)] px-2 py-0.5 text-[13px] text-[var(--ink-2)]">
                      {f}
                    </span>
                  ))}
                </span>
                <span className="mt-2 block text-[12px] leading-5 text-[var(--muted)]">※ {BOOTH_OPTION.note}</span>
                {/* ⚠️ カード全体が label なので、押したときにチェックが入らないよう
                    preventDefault + stopPropagation する。モーダル本体は label の外
                    （form 直下）に置くこと＝中に置くとモーダル内のクリックで
                    ブース出展にチェックが入ってしまう。 */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setImageModal({ title: "ブース出展のイメージ", ...BOOTH_OPTION.image });
                  }}
                  className={`${btn("secondary", "sm")} mt-3 self-start`}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="3" y="4" width="18" height="14" rx="2" /><path d="M3 14l4.5-4.5 3 3L15 8l6 6" />
                  </svg>
                  ブースイメージを見る
                </button>
                <span className={`${tap} mt-3 flex items-center gap-2.5 border-t border-[var(--line-soft)] pt-3`}>
                  <input
                    type="checkbox"
                    name="boothOption"
                    autoComplete="off"
                    checked={boothOption}
                    onChange={(e) => setBoothOption(e.target.checked)}
                    className="h-5 w-5 shrink-0 accent-[var(--green)]"
                  />
                  <span className="text-[15px] font-bold text-[var(--ink)]">{BOOTH_OPTION.label}</span>
                </span>
              </label>
            </section>
          </div>

          {/* ══ STEP 3｜会社情報・目的を入力 ═══════════════════ */}
          <div hidden={step !== 2} className="flex flex-col gap-7">
            <section className="flex flex-col gap-3">
              <h2 className={qCls}>お申し込み者の情報</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelCls} data-field="company">
                  法人・団体名{req}
                  <span className={hintCls}>協賛企業として掲載する正式名称をご記入ください。</span>
                  <input
                    name="company" value={text.company} required={step === 2}
                    onChange={(e) => setField("company", e.target.value)}
                    className={fieldCls(errors.company)}
                  />
                  <FieldError msg={errors.company} />
                </label>
                <label className={labelCls} data-field="companyKana">
                  法人・団体名（フリガナ）{req}
                  <input
                    name="companyKana" value={text.companyKana} required={step === 2}
                    onChange={(e) => setField("companyKana", e.target.value)}
                    className={fieldCls(errors.companyKana)}
                  />
                  <FieldError msg={errors.companyKana} />
                </label>
                <label className={labelCls} data-field="name">
                  ご担当者名{req}
                  <input
                    name="name" value={text.name} required={step === 2}
                    onChange={(e) => setField("name", e.target.value)}
                    className={fieldCls(errors.name)}
                  />
                  <FieldError msg={errors.name} />
                </label>
                <label className={labelCls} data-field="department">
                  部署・役職{opt}
                  <input
                    name="department" value={text.department}
                    onChange={(e) => setField("department", e.target.value)}
                    className={fieldCls()}
                  />
                </label>
                <label className={labelCls} data-field="email">
                  ご担当者メールアドレス{req}
                  <input
                    name="email" type="email" value={text.email} required={step === 2}
                    onChange={(e) => setField("email", e.target.value)}
                    className={fieldCls(errors.email)}
                  />
                  <FieldError msg={errors.email} />
                </label>
                <label className={labelCls} data-field="phone">
                  電話番号{req}
                  <input
                    name="phone" value={text.phone} required={step === 2} placeholder="例：0985-00-0000"
                    onChange={(e) => setField("phone", e.target.value)}
                    className={fieldCls(errors.phone)}
                  />
                  <FieldError msg={errors.phone} />
                </label>
                <label className={labelCls} data-field="address">
                  所在地{req}
                  <span className={hintCls}>都道府県・市区町村までご記入ください。</span>
                  <input
                    name="address" value={text.address} required={step === 2}
                    onChange={(e) => setField("address", e.target.value)}
                    className={fieldCls(errors.address)}
                  />
                  <FieldError msg={errors.address} />
                </label>
                <label className={labelCls} data-field="website">
                  ウェブサイト{opt}
                  <input
                    name="website" value={text.website}
                    onChange={(e) => setField("website", e.target.value)}
                    className={fieldCls()}
                  />
                </label>
              </div>
            </section>

            <section className="flex flex-col gap-2.5 border-t border-[var(--line)] pt-6" data-field="purpose">
              <h2 className={qCls}>貴社は、Food Japan Summitで何を実現したいですか？{req}</h2>
              <p className={hintCls}>
                まだ具体的に決まっていなくても構いません。
                <br />
                例：新商品の認知拡大／販路開拓／生産者との連携／新商品開発／地域との共創／食品ロス対策／人材・採用／物流課題／自治体との連携
              </p>
              <textarea
                name="purpose" rows={8} value={text.purpose} required={step === 2}
                onChange={(e) => setField("purpose", e.target.value)}
                className={fieldCls(errors.purpose)}
              />
              <FieldError msg={errors.purpose} />
            </section>

            <section className="flex flex-col gap-2.5 border-t border-[var(--line)] pt-6">
              <h2 className={qCls}>関心のある共創テーマ{opt}</h2>
              <p className={hintCls}>複数選択できます。</p>
              <div className="flex flex-wrap gap-2">
                {CO_CREATION_THEMES.map((t) => {
                  const on = themes.includes(t);
                  return (
                    <label
                      key={t}
                      className={`flex cursor-pointer items-center rounded-full border px-3.5 py-2 text-[14px] transition ${
                        on
                          ? "border-[var(--green)] bg-[var(--green-soft)] font-bold text-[var(--green-d)]"
                          : "border-[var(--line)] bg-white text-[var(--ink-2)] hover:border-[var(--green)]"
                      }`}
                    >
                      <input
                        type="checkbox" name="themes" value={t} autoComplete="off" checked={on}
                        onChange={() => setThemes((l) => toggleIn(l, t))}
                        className="sr-only"
                      />
                      {t}
                    </label>
                  );
                })}
              </div>
            </section>

            <section className="flex flex-col gap-2.5 border-t border-[var(--line)] pt-6">
              <h2 className={qCls}>希望する協賛特典{opt}</h2>
              {/* ⚠️ この注記を外さないこと。LIGHT を選んだ人が登壇・展示・商談まで
                  含まれていると誤解する（指示書11）。 */}
              <p className="rounded-[8px] border border-[var(--orange)] bg-[var(--orange-soft)] px-3.5 py-2.5 text-[13px] leading-6 text-[var(--ink-2)]">
                ※ {DESIRED_BENEFITS_NOTE}
              </p>
              <div className="flex flex-col gap-1.5">
                {DESIRED_BENEFITS.map((t) => {
                  const incl = benefitIncluded(t, selectedPlan);
                  return (
                    <label key={t} className={`${tap} flex cursor-pointer items-center gap-2.5 text-[14px] text-[var(--ink)]`}>
                      <input
                        type="checkbox" name="benefits" value={t} autoComplete="off"
                        checked={benefits.includes(t)}
                        onChange={() => setBenefits((l) => toggleIn(l, t))}
                        className="h-5 w-5 shrink-0 accent-[var(--green)]"
                      />
                      <span>{t}</span>
                      {incl === true ? (
                        <span className="rounded-[3px] bg-[var(--green-soft)] px-1.5 py-0.5 text-[11px] font-bold text-[var(--green-d)]">
                          プランに含まれます
                        </span>
                      ) : incl === false ? (
                        <span className="rounded-[3px] bg-[var(--amber-soft)] px-1.5 py-0.5 text-[11px] font-bold text-[var(--amber-ink)]">
                          要相談
                        </span>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </section>

            <section className="flex flex-col gap-2.5 border-t border-[var(--line)] pt-6">
              <h2 className={qCls}>登壇・展示・試食の希望内容{opt}</h2>
              <p className={hintCls}>希望する商品、サービス、テーマ、展示・試食の内容などをご記入ください。</p>
              <textarea
                name="presentation" rows={4} value={text.presentation}
                onChange={(e) => setField("presentation", e.target.value)}
                className={fieldCls()}
              />
            </section>

            {/* 請求・ロゴ・その他（開閉できるが、必須を含むので既定は開いた状態） */}
            <section className="border-t border-[var(--line)] pt-6">
              <button
                type="button"
                onClick={() => setBillingOpen((v) => !v)}
                aria-expanded={billingOpen}
                className={`${tap} flex w-full items-center justify-between gap-2 text-left`}
              >
                <span className={qCls}>請求・ロゴ・その他{req}</span>
                <span className="flex shrink-0 items-center gap-1 text-[13px] font-bold text-[var(--green-d)]">
                  {billingOpen ? "閉じる" : "開く"}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={billingOpen ? "rotate-180" : ""} aria-hidden>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </button>
              {/* ⚠️ 閉じているときも DOM から外さない（入力値と送信対象を保つ）。 */}
              <div hidden={!billingOpen} className="mt-3 flex flex-col gap-4">
                <label className={labelCls} data-field="invoiceName">
                  請求書の宛名{req}
                  <input
                    name="invoiceName" value={text.invoiceName} required={step === 2 && billingOpen}
                    onChange={(e) => setField("invoiceName", e.target.value)}
                    className={fieldCls(errors.invoiceName)}
                  />
                  <FieldError msg={errors.invoiceName} />
                </label>
                <label className={labelCls}>
                  請求書に関するご希望{opt}
                  <span className={hintCls}>請求書の送付先、記載内容、支払条件に関するご希望があればご記入ください。</span>
                  <textarea
                    name="invoiceNote" rows={3} value={text.invoiceNote}
                    onChange={(e) => setField("invoiceNote", e.target.value)}
                    className={fieldCls()}
                  />
                </label>
                <div data-field="logoSubmission">
                  <h3 className="text-[14px] font-semibold text-[var(--ink)]">ロゴデータの提出方法{req}</h3>
                  <div className="mt-2 flex flex-col gap-1">
                    {LOGO_SUBMISSION.map((v) => (
                      <label key={v} className={`${tap} flex cursor-pointer items-center gap-2.5 text-[14px] text-[var(--ink)]`}>
                        <input
                          type="radio" name="logoSubmission" value={v} autoComplete="off"
                          checked={logoSubmission === v}
                          required={step === 2 && billingOpen}
                          onChange={() => { setLogoSubmission(v); setErrors((e) => ({ ...e, logoSubmission: "" })); }}
                          className="h-5 w-5 shrink-0 accent-[var(--green)]"
                        />
                        {v}
                      </label>
                    ))}
                  </div>
                  <FieldError msg={errors.logoSubmission} />
                </div>
                <label className={labelCls}>
                  備考・事務局へのメッセージ{opt}
                  <textarea
                    name="message" rows={4} value={text.message}
                    onChange={(e) => setField("message", e.target.value)}
                    className={fieldCls()}
                  />
                </label>
              </div>
            </section>
          </div>

          {/* ══ STEP 4｜確認・申込 ═════════════════════════ */}
          <div hidden={step !== 3} className="flex flex-col gap-7">
            <section className="flex flex-col gap-3">
              <h2 className={qCls}>お申し込み内容</h2>
              <dl className={`${cardCls} divide-y divide-[var(--line-soft)]`}>
                {[
                  ...summaryRows,
                  { k: "会社名", v: text.company || "—" },
                  { k: "ご担当者", v: text.name ? `${text.name} 様` : "—" },
                  { k: "メールアドレス", v: text.email || "—" },
                  { k: "共創テーマ", v: themes.length ? themes.join("／") : "—" },
                  { k: "希望する特典", v: benefits.length ? benefits.join("／") : "—" },
                ].map((r) => (
                  <div key={r.k} className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-2.5 text-[14px]">
                    <dt className="w-[110px] shrink-0 text-[var(--muted)]">{r.k}</dt>
                    <dd className="min-w-0 flex-1 font-semibold break-words text-[var(--ink)]">{r.v}</dd>
                  </div>
                ))}
              </dl>
              <div className="rounded-[10px] border border-[var(--green)] bg-[var(--green-soft)] px-4 py-3">
                <p className="text-[13px] text-[var(--ink-2)]">現時点の申込金額</p>
                <p className="mt-0.5 text-[20px] font-bold text-[var(--green-d)]">{totalText}</p>
              </div>
              <button
                type="button"
                onClick={() => goTo(0)}
                className={`${btn("secondary", "sm")} self-start`}
              >
                内容を修正する
              </button>
            </section>

            <section className="flex flex-col gap-2.5 border-t border-[var(--line)] pt-6" data-field="consent">
              <h2 className={qCls}>同意事項{req}</h2>
              <div className="flex flex-col gap-2">
                {CONSENTS.map((c, i) => (
                  <label
                    key={c}
                    className={`flex cursor-pointer items-start gap-3 rounded-[10px] border p-4 text-[14px] leading-7 transition ${
                      consent[i]
                        ? "border-[var(--green)] bg-[var(--green-soft)] text-[var(--ink)]"
                        : "border-[var(--line)] bg-white text-[var(--ink-2)]"
                    }`}
                  >
                    <input
                      type="checkbox" name="consent" value="1" autoComplete="off"
                      checked={consent[i]}
                      required={step === 3}
                      onChange={(e) => {
                        setConsent((c2) => c2.map((v, j) => (j === i ? e.target.checked : v)));
                        setErrors((x) => ({ ...x, consent: "" }));
                      }}
                      className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--green)]"
                    />
                    <span>{c}</span>
                  </label>
                ))}
              </div>
              <FieldError msg={errors.consent} />
            </section>
          </div>

          {/* honeypot（人には見えない） */}
          <input type="text" name="nickname" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

          {state.error ? (
            <p role="alert" className="rounded-[8px] border border-[var(--red)] bg-[var(--red-soft)] px-4 py-3 text-[14px] leading-6 text-[var(--red)]">
              {state.error}
            </p>
          ) : null}

          {/* ── ステップの移動／送信 ───────────────────── */}
          <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-6">
            <div className="flex flex-wrap items-center gap-3">
              {step > 0 ? (
                <button type="button" onClick={() => goTo(step - 1)} className={btn("secondary", "md")}>
                  戻る
                </button>
              ) : null}
              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => goTo(step + 1)}
                  className={`${btn("primary", "lg")} min-w-[220px] flex-1 sm:flex-none`}
                >
                  {step === 2 ? "申込内容を確認する" : "次へ進む"}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={pending}
                  className={`${btn("action", "lg")} min-w-[280px] flex-1 text-[18px] sm:flex-none`}
                >
                  {pending ? "送信中…" : "この内容で申し込む"}
                </button>
              )}
            </div>
            {step === 3 ? (
              <p className="text-[12px] leading-5 text-[var(--muted)]">
                送信後、ご担当者のメールアドレス宛に受付の控えをお送りします。
              </p>
            ) : null}
            {/* 相談導線は最後まで消さない（高額協賛のため・指示書18） */}
            <p className="text-[13px] leading-6 text-[var(--muted)]">
              プランが決めきれない場合は{" "}
              <Link href="/sponsor/contact" className={`${btn("ghost", "sm")} px-1.5 align-baseline underline`}>
                プランを相談して決めたい
              </Link>
            </p>
          </div>
        </div>

        {/* ── PC：右カラムのサマリー ─────────────────────── */}
        <aside className="hidden lg:block">
          <div className="sticky top-[92px]">{Summary}</div>
        </aside>
      </div>

      {/* ── ブースイメージのモーダル ─────────────────────
          ⚠️ label の外（form 直下）に置くこと。label の中に入れると、モーダル内を
             クリックしただけでブース出展にチェックが入る。 */}
      {imageModal ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={imageModal.title}
          onClick={() => setImageModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-full w-full max-w-[1100px] flex-col overflow-hidden rounded-[12px] bg-white"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
              <h2 className="text-[16px] font-bold text-[var(--ink)]">{imageModal.title}</h2>
              <button
                type="button"
                onClick={() => setImageModal(null)}
                className={`${btn("secondary", "sm")} shrink-0`}
              >
                閉じる
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-4">
              {/* ⚠️ 画像が無い／読み込めないときは、alt の長い説明文がそのまま広がって
                  「壊れている」ようにしか見えない。読み込みに失敗したら短い一文に差し替える。 */}
              {imgFailed ? (
                <p className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-4 py-8 text-center text-[13px] leading-6 text-[var(--muted)]">
                  図を読み込めませんでした。お手数ですが事務局までお問い合わせください。
                </p>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageModal.src}
                  alt={imageModal.alt}
                  onError={() => setImgFailed(true)}
                  className="mx-auto h-auto w-full"
                />
              )}
              <p className="mt-3 text-[13px] leading-6 text-[var(--ink-2)]">{imageModal.caption}</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── スマホ：画面下の固定バー ───────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-white/95 px-4 py-2.5 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] text-[var(--muted)]">選択中：{barPick}</p>
            <p className="truncate text-[14px] font-bold text-[var(--green-d)]">{totalText}</p>
          </div>
          {step < 3 ? (
            <button type="button" onClick={() => goTo(step + 1)} className={`${btn("primary", "md")} shrink-0`}>
              {step === 2 ? "内容を確認" : "次へ"}
            </button>
          ) : (
            <button type="submit" disabled={pending} className={`${btn("action", "md")} shrink-0`}>
              {pending ? "送信中…" : "申し込む"}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
