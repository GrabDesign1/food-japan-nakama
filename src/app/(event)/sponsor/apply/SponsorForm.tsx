"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { submitSponsorApplication, type SponsorState } from "./actions";
import { createLogoUploadTicket } from "./logo-upload";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { btn, input, inputBare } from "@/lib/ui";
import { formatJpDate } from "@/lib/invoice";
import {
  COURSES, PLAN_CONSULT, yen, yenFull, ANNUAL_MEMBER, BOOTH_OPTION, plansFor, findCourse,
  LOCAL_DISCOUNT_COURSE, LOCAL_DISCOUNT_LABEL,
  CO_CREATION_THEMES, DESIRED_BENEFITS, DESIRED_BENEFITS_NOTE, BENEFIT_LINKS, LOGO_SUBMISSION, CONSENTS,
  LOGO_SUBMISSION_UPLOAD, LOGO_SUBMISSION_DEFAULT, LOGO_MAX_BYTES, LOGO_ACCEPT,
  LOGO_BUCKET,
  APPLY_STEPS, COURSE_SHORT, isCourseOpen, COURSE_CLOSED_LABEL,
  isApplicationClosed, APPLICATION_CLOSED_TITLE, APPLICATION_CLOSED_BODY,
  PLAN_TAGLINE, planBadge, PLAN_CTA_CONSULT, PLAN_CARD_FEATURES,
  PLAN_NO, PLAN_NICKNAME, PLAN_ACCENT, yenParts,
  benefitIncluded, applicationTotal, presentationSlot, PRESENTATION_IMAGE,
  quoteNo, quoteTotals, QUOTE_TAX_RATE, QUOTE_VALID_DAYS, ISSUER, type QuoteItem,
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
  address: 2, website: 2, referrer: 2, purpose: 2, invoiceName: 2, logoSubmission: 2, logoFile: 2,
  consent: 3,
};

const EMPTY_TEXT = {
  company: "", companyKana: "", name: "", department: "", email: "", phone: "",
  address: "", website: "", referrer: "", purpose: "", presentation: "",
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

/** 特典ラベルの一部を別タブリンクにする（例：FOOD JAPAN NAKAMA）。
 *  ⚠️ ラベルは <label> の中なので、リンクを押したときにチェックが切り替わらないよう
 *     onClick で stopPropagation している。preventDefault はしない（遷移はさせる）。 */
function benefitLabel(t: string) {
  const link = BENEFIT_LINKS[t];
  if (!link) return t;
  const [before, after] = t.split(link.text);
  return (
    <>
      {before}
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="font-semibold text-[var(--green-d)] underline underline-offset-2"
      >
        {link.text}
      </a>
      {after}
    </>
  );
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
  const [logoSubmission, setLogoSubmission] = useState(LOGO_SUBMISSION_DEFAULT);
  // アップロード済みロゴ。ファイル本体は Server Action を通さず Storage へ直接送るので、
  // フォームが送るのは **保存先パスと表示名だけ**（Vercelの4.5MB制限を避けるため）。
  const [logoFileName, setLogoFileName] = useState("");
  const [logoPath, setLogoPath] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);

  /** 選ばれたロゴを Storage へ直接送る。
   *  ⚠️ Server Action には**渡さない**（Vercelはボディ4.5MB超で413を返すため）。
   *     ここで発行した署名付きURLに対してブラウザが直接アップロードする。 */
  async function uploadLogo(file?: File) {
    if (!file) return;
    setErrors((x) => ({ ...x, logoFile: "" }));
    setLogoFileName(file.name);
    setLogoPath("");
    if (file.size > LOGO_MAX_BYTES) {
      setErrors((x) => ({
        ...x,
        logoFile: `ファイルが大きすぎます（${Math.round(LOGO_MAX_BYTES / 1024 / 1024)}MBまで）。`,
      }));
      return;
    }
    setLogoUploading(true);
    try {
      const ticket = await createLogoUploadTicket(file.name, file.size);
      if (!ticket.ok) {
        setErrors((x) => ({ ...x, logoFile: ticket.error }));
        return;
      }
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.storage
        .from(LOGO_BUCKET)
        .uploadToSignedUrl(ticket.path, ticket.token, file);
      if (error) {
        setErrors((x) => ({ ...x, logoFile: `アップロードに失敗しました：${error.message}` }));
        return;
      }
      setLogoPath(ticket.path);
    } catch {
      setErrors((x) => ({ ...x, logoFile: "アップロードに失敗しました。通信環境をご確認ください。" }));
    } finally {
      setLogoUploading(false);
    }
  }
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
  // 見積書。開いたときに番号と日付を確定させ、閉じるまで変わらないようにする。
  const [quote, setQuote] = useState<{ no: string; issuedOn: string; expiresOn: string } | null>(null);
  // 会社情報より前に見積書を作るとき、宛名だけ先に聞くモーダル。
  const [quoteAsk, setQuoteAsk] = useState(false);
  const [quoteAskError, setQuoteAskError] = useState("");

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

  // 請求書の宛名は法人・団体名と同じことがほとんどなので、**手で書き換えるまで追随させる**。
  // 一度でも宛名を直接編集したら追随をやめる（せっかく直した宛名を上書きしないため）。
  const [invoiceNameEdited, setInvoiceNameEdited] = useState(false);

  const setField = (k: TextKey, v: string) => {
    setText((t) => {
      const next = { ...t, [k]: v };
      if (k === "company" && !invoiceNameEdited) next.invoiceName = v;
      return next;
    });
    setErrors((e) => {
      if (k === "company" && !invoiceNameEdited) return { ...e, company: "", invoiceName: "" };
      return e[k] ? { ...e, [k]: "" } : e;
    });
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

  /**
   * 見積書ボタンの入口。会社名がまだ無ければ、先に宛名を聞く。
   * ⚠️ 聞いた値は STEP3 の欄と同じ state に入れる（二度打ちさせない）。
   */
  const startQuote = () => {
    if (!text.company.trim()) {
      setQuoteAskError("");
      setQuoteAsk(true);
      return;
    }
    openQuote();
  };

  /** 見積書を開く。開いた時点で番号と日付を確定させ、閉じるまで変えない。 */
  const openQuote = () => {
    const issued = new Date();
    const seed = Math.random().toString(36).slice(2, 8);
    setQuote({
      no: quoteNo(issued, seed),
      issuedOn: formatJpDate(issued),
      expiresOn: formatJpDate(new Date(issued.getTime() + QUOTE_VALID_DAYS * 86400000)),
    });
  };

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

  // 募集が終了したら、フォームは出さずに知らせだけにする（押せるものを残さない）。
  // ⚠️ now が null のあいだ（マウント前）は出さない＝静的HTMLとのずれを避けるため。
  if (now !== null && isApplicationClosed(now)) {
    return (
      <div className={`${cardCls} p-8`} role="status">
        <h2 className="text-[18px] font-bold text-[var(--ink)]">{APPLICATION_CLOSED_TITLE}</h2>
        <p className="mt-3 text-[14px] leading-8 text-[var(--ink-2)]">{APPLICATION_CLOSED_BODY}</p>
        <p className="mt-4 text-[13px] leading-7 text-[var(--muted)]">
          フードジャパンサミット実行委員会（株式会社グラブデザイン）
          <br />
          <a href="mailto:info@grab-design.com" className="text-[var(--green-d)] underline">
            info@grab-design.com
          </a>
          ／03-6825-3901
        </p>
      </div>
    );
  }

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

  // 見積書の明細（税抜）。年間会員は「相談」で金額が確定しないので明細に入れず、備考で触れる。
  const quoteItems: QuoteItem[] = selectedPlan
    ? [
        {
          label: `協賛プラン ${PLAN_NICKNAME[selectedPlan.code] ?? selectedPlan.name}（${selectedPlan.name}）`,
          // courseText には特別割のときだけ「（宮崎県法人 特別割）」が付く。
          note: courseText,
          amount: selectedPlan.price,
        },
        ...(boothOption
          ? [{ label: `${BOOTH_OPTION.title}　1ブース`, amount: BOOTH_OPTION.price }]
          : []),
      ]
    : [];

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
      {/* 見積書はプランが決まればどのステップからでも作れる（社内決裁を先に通したい人向け）。
          会社名が未入力のうちは宛名が空欄の見積書になる。 */}
      <button
        type="button"
        disabled={!selectedPlan}
        onClick={startQuote}
        className={`${btn("secondary", "lg")} mt-3 w-full`}
      >
        見積書を作成
      </button>
      {!selectedPlan ? (
        <p className="mt-1.5 text-[11px] leading-5 text-[var(--muted)]">
          プランが決まると作成できます。
        </p>
      ) : null}
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
        className={`sticky top-0 z-30 -mx-4 border-b border-[var(--line)] bg-white/95 px-4 py-3 backdrop-blur ${quote ? "print:hidden" : ""}`}
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

      <div className={`mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_284px] ${quote ? "print:hidden" : ""}`}>
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

              {/* ブース出展（年間会員と同じデザイン体系・別枠の商品）。
                  ⚠️ **カードを label にしないこと**（2026-08-18 に踏んだ）。label の対象になるのは
                     中で最初に見つかる「ラベル付け可能な要素」で、**button も対象に含まれる**。
                     「ブースイメージを見る」ボタンがチェックボックスより前にあったため、
                     カードのどこを押してもモーダルが開き、チェックは一切入らなかった。
                     div ＋ onClick でチェックを切り替え、ボタン側で伝播を止める。 */}
              <div
                onClick={() => setBoothOption((v) => !v)}
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
                {/* この1つだけがモーダルを開く。カードのクリック（チェック切り替え）に
                    伝播させないよう stopPropagation する。 */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageModal({ title: "ブース出展のイメージ", ...BOOTH_OPTION.image });
                  }}
                  className={`${btn("secondary", "md")} mt-3 self-start`}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="3" y="4" width="18" height="14" rx="2" /><path d="M3 14l4.5-4.5 3 3L15 8l6 6" />
                  </svg>
                  ブースイメージを見る
                </button>
                {/* チェック行。ここは label にしてよい（中に button が無いので対象はチェックボックス）。
                    ⚠️ 親の onClick にも伝わると2回切り替わって元に戻るので、伝播を止める。 */}
                <label
                  onClick={(e) => e.stopPropagation()}
                  className={`${tap} mt-3 flex cursor-pointer items-center gap-2.5 border-t border-[var(--line-soft)] pt-3`}
                >
                  <input
                    type="checkbox"
                    name="boothOption"
                    autoComplete="off"
                    checked={boothOption}
                    onChange={(e) => setBoothOption(e.target.checked)}
                    className="h-5 w-5 shrink-0 accent-[var(--green)]"
                  />
                  <span className="text-[15px] font-bold text-[var(--ink)]">{BOOTH_OPTION.label}</span>
                </label>
              </div>
            </section>
          </div>

          {/* ══ STEP 3｜会社情報・目的を入力 ═══════════════════ */}
          <div hidden={step !== 2} className="flex flex-col gap-7">
            <section className="flex flex-col gap-3">
              <h2 className={qCls}>協賛お申込みフォーム</h2>
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
                {/* ⚠️ 任意項目。ここを必須にしないこと（紹介者がいない申込を止めてしまう）。 */}
                <label className={labelCls} data-field="referrer">
                  ご紹介者（ご紹介者がいる場合）{opt}
                  <input
                    name="referrer" value={text.referrer}
                    onChange={(e) => setField("referrer", e.target.value)}
                    className={fieldCls()}
                  />
                </label>
              </div>
            </section>

            <section className="flex flex-col gap-2.5 border-t border-[var(--line)] pt-6" data-field="purpose">
              <h2 className={qCls}>Food Japan Summitで何を実現したいですか？{opt}</h2>
              <p className={hintCls}>
                まだ具体的に決まっていなくても構いません。
                <br />
                例：新商品の認知拡大／販路開拓／生産者との連携／新商品開発／地域との共創／食品ロス対策／人材・採用／物流課題／自治体との連携
              </p>
              <textarea
                name="purpose" rows={8} value={text.purpose}
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
                      <span>{benefitLabel(t)}</span>
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
                  <span className={hintCls}>
                    法人・団体名がそのまま入ります。請求書の宛名が異なる場合は書き換えてください。
                  </span>
                  <input
                    name="invoiceName" value={text.invoiceName} required={step === 2 && billingOpen}
                    // 直接編集したら、以降は法人・団体名に追随させない。
                    onChange={(e) => { setInvoiceNameEdited(true); setField("invoiceName", e.target.value); }}
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
                  {/* ⚠️ 「こちらから提出する」を選んだときだけ出す。hidden ではなく未描画に
                      しているのは、選んでいない人のファイルが送信に混ざらないようにするため。 */}
                  {logoSubmission === LOGO_SUBMISSION_UPLOAD ? (
                    <div className="mt-2.5 flex flex-col gap-1.5" data-field="logoFile">
                      <div className="flex flex-wrap items-center gap-3">
                        <label
                          className={`${btn("secondary", "sm")} ${
                            logoUploading ? "pointer-events-none opacity-60" : "cursor-pointer"
                          }`}
                        >
                          {logoUploading ? "アップロード中…" : "ファイルを添付"}
                          <input
                            type="file" accept={LOGO_ACCEPT}
                            className="hidden"
                            disabled={logoUploading}
                            onChange={(e) => uploadLogo(e.target.files?.[0])}
                          />
                        </label>
                        <span className="min-w-0 break-all text-[13px] text-[var(--ink-2)]">
                          {logoPath ? (
                            <span className="font-semibold text-[var(--green-d)]">
                              {logoFileName}（添付済み）
                            </span>
                          ) : (
                            logoFileName || "選択されていません"
                          )}
                        </span>
                      </div>
                      {/* パスと表示名だけを送る（ファイル本体はここを通らない） */}
                      <input type="hidden" name="logoPath" value={logoPath} />
                      <input type="hidden" name="logoName" value={logoFileName} />
                      <span className={hintCls}>
                        Illustratorデータ（.ai）・PDF・EPS をお送りください（
                        {Math.round(LOGO_MAX_BYTES / 1024 / 1024)}MBまで）。
                      </span>
                      <FieldError msg={errors.logoFile} />
                    </div>
                  ) : null}
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
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => goTo(0)}
                  className={btn("secondary", "md")}
                >
                  内容を修正する
                </button>
                {/* 見積書。社内決裁に回してもらうためのもので、申込を送らなくても作れる。 */}
                <button
                  type="button"
                  disabled={!selectedPlan}
                  onClick={startQuote}
                  className={btn("secondary", "md")}
                >
                  見積書を作成
                </button>
              </div>
              {!selectedPlan ? (
                <p className={hintCls}>
                  ※ 見積書は協賛プランが決まると作成できます（「内容を相談して決めたい」は金額が未定のため作成できません）。
                </p>
              ) : null}
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

      {/* ── 見積書の宛名を先に聞くモーダル ─────────────────
          会社情報（STEP3）より前に見積書を作りたい人向け。
          ⚠️ ここの入力欄に **name を付けないこと**。付けると同じ name の欄が2つになり、
             FormData に値が二重で載る。値は STEP3 の欄と同じ state を書き換えている。 */}
      {quoteAsk ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="見積書の宛名"
          onClick={() => setQuoteAsk(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-full w-full max-w-[520px] flex-col overflow-auto rounded-[12px] bg-white"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
              <h2 className="text-[16px] font-bold text-[var(--ink)]">見積書の宛名</h2>
              <button type="button" onClick={() => setQuoteAsk(false)} className={`${btn("secondary", "sm")} shrink-0`}>
                閉じる
              </button>
            </div>
            <div className="flex flex-col gap-4 p-5">
              <p className="text-[13px] leading-6 text-[var(--ink-2)]">
                見積書に入れる宛名をご記入ください。ここで入れた内容は、そのまま STEP 3「会社情報」にも入ります。
              </p>
              <label className={labelCls}>
                法人・団体名{req}
                <input
                  value={text.company}
                  onChange={(e) => { setField("company", e.target.value); setQuoteAskError(""); }}
                  className={fieldCls(quoteAskError || undefined)}
                />
              </label>
              <label className={labelCls}>
                ご担当者名{opt}
                <input
                  value={text.name}
                  onChange={(e) => setField("name", e.target.value)}
                  className={fieldCls()}
                />
              </label>
              <label className={labelCls}>
                メールアドレス{opt}
                <span className={hintCls}>見積書には印刷されません。お申し込みのときに使います。</span>
                <input
                  type="email"
                  value={text.email}
                  onChange={(e) => setField("email", e.target.value)}
                  className={fieldCls()}
                />
              </label>
              <FieldError msg={quoteAskError} />
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!text.company.trim()) {
                      setQuoteAskError("法人・団体名を入力してください。");
                      return;
                    }
                    setQuoteAsk(false);
                    openQuote();
                  }}
                  className={btn("primary", "md")}
                >
                  この内容で見積書を作成
                </button>
                <button
                  type="button"
                  onClick={() => { setQuoteAsk(false); openQuote(); }}
                  className={btn("secondary", "md")}
                >
                  宛名なしで作成
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── 見積書 ─────────────────────────────────
          ⚠️ 印刷時はこのシートだけを残す（他は print:hidden にしている）。
             PDFはサーバーに保存せず、ブラウザの「PDFとして保存」で出してもらう
             （会員側の納品書・請求書と同じ方針＝電子帳簿保存法の要件を負わないため）。 */}
      {quote && selectedPlan ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/60 p-4 print:static print:block print:overflow-visible print:bg-transparent print:p-0">
          <div className="w-full max-w-[840px] rounded-[12px] bg-white print:max-w-none print:rounded-none">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3 print:hidden">
              <h2 className="text-[16px] font-bold text-[var(--ink)]">見積書</h2>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => window.print()} className={btn("primary", "sm")}>
                  PDFとして保存
                </button>
                <button type="button" onClick={() => setQuote(null)} className={btn("secondary", "sm")}>
                  閉じる
                </button>
              </div>
            </div>
            <p className="border-b border-[var(--line)] bg-[var(--amber-bg)] px-4 py-2.5 text-[12px] leading-6 text-[var(--amber-ink)] print:hidden">
              「PDFとして保存」を押すと印刷画面が開きます。送信先を「PDFに保存」にしてください。
              この見積書は申込の送信とは別で、作成しても申し込んだことにはなりません。
            </p>

            {/* ここから見積書の本体 */}
            <div className="p-8 text-[13px] leading-6 text-[var(--ink)] print:p-0">
              <h3 className="text-center text-[22px] font-bold tracking-[0.3em]">見　積　書</h3>

              <div className="mt-7 flex flex-wrap items-start justify-between gap-6">
                <div className="min-w-0">
                  {/* 会社情報より前（STEP1・2）から見積書を作れるので、宛名が空のことがある。
                      そのときは罫線だけを残して手書きできるようにする。 */}
                  <p className="min-w-[260px] border-b border-[var(--ink)] pb-1 text-[17px] font-bold">
                    {text.company ? `${text.company}　御中` : <span className="inline-block">　</span>}
                  </p>
                  {!text.company ? (
                    <p className="mt-1 text-[11px] text-[var(--muted)] print:hidden">
                      宛名は会社情報（STEP 3）を入力すると入ります。空欄のまま印刷して手書きすることもできます。
                    </p>
                  ) : null}
                  {text.name ? (
                    <p className="mt-1.5 text-[12px] text-[var(--ink-2)]">ご担当：{text.name} 様</p>
                  ) : null}
                  <p className="mt-4 text-[13px]">下記のとおりお見積り申し上げます。</p>
                </div>
                <dl className="text-[12px] leading-6">
                  <div className="flex gap-2"><dt className="w-[70px] text-[var(--muted)]">見積番号</dt><dd>{quote.no}</dd></div>
                  <div className="flex gap-2"><dt className="w-[70px] text-[var(--muted)]">発行日</dt><dd>{quote.issuedOn}</dd></div>
                  <div className="flex gap-2"><dt className="w-[70px] text-[var(--muted)]">有効期限</dt><dd>{quote.expiresOn}</dd></div>
                </dl>
              </div>

              <p className="mt-6 border-y-2 border-[var(--ink)] py-3 text-[20px] font-bold">
                お見積金額　{yenFull(quoteTotals(quoteItems).including)}
                <span className="ml-2 text-[12px] font-normal text-[var(--ink-2)]">（消費税込）</span>
              </p>

              <table className="mt-6 w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th className="border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-left font-bold">品目</th>
                    <th className="w-[150px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-right font-bold">金額（税抜）</th>
                  </tr>
                </thead>
                <tbody>
                  {quoteItems.map((it) => (
                    <tr key={it.label}>
                      <td className="border border-[var(--line)] px-3 py-2.5 align-top">
                        {it.label}
                        {it.note ? (
                          <span className="mt-0.5 block text-[11px] text-[var(--ink-2)]">{it.note}</span>
                        ) : null}
                      </td>
                      <td className="border border-[var(--line)] px-3 py-2.5 text-right align-top">
                        {yenFull(it.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <th className="border border-[var(--line)] px-3 py-2 text-right font-normal text-[var(--ink-2)]">小計（税抜）</th>
                    <td className="border border-[var(--line)] px-3 py-2 text-right">{yenFull(quoteTotals(quoteItems).excluding)}</td>
                  </tr>
                  <tr>
                    <th className="border border-[var(--line)] px-3 py-2 text-right font-normal text-[var(--ink-2)]">消費税（{QUOTE_TAX_RATE}%）</th>
                    <td className="border border-[var(--line)] px-3 py-2 text-right">{yenFull(quoteTotals(quoteItems).tax)}</td>
                  </tr>
                  <tr>
                    <th className="border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-right font-bold">合計（税込）</th>
                    <td className="border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-right text-[15px] font-bold">
                      {yenFull(quoteTotals(quoteItems).including)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-5 text-[12px] leading-6 text-[var(--ink-2)]">
                <p className="font-bold text-[var(--ink)]">備考</p>
                <ul className="mt-1 flex flex-col gap-0.5">
                  <li>・開催：{courseText}</li>
                  {annualMember ? (
                    <li>・年間会員（{ANNUAL_MEMBER.price}）についてもご相談を承ります。上記金額には含まれておりません。</li>
                  ) : null}
                  <li>・本見積は協賛内容の確定前のものです。内容の変更に応じて金額が変わる場合があります。</li>
                  <li>・お申し込みは {ISSUER.email} または協賛申込フォームより承ります。</li>
                </ul>
              </div>

              <div className="mt-7 flex justify-end">
                <div className="text-[12px] leading-6">
                  <p className="text-[14px] font-bold text-[var(--ink)]">{ISSUER.name}</p>
                  <p>{ISSUER.address}</p>
                  <p>TEL {ISSUER.tel}／{ISSUER.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
      <div className={`fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-white/95 px-4 py-2.5 backdrop-blur lg:hidden ${quote ? "print:hidden" : ""}`}>
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
