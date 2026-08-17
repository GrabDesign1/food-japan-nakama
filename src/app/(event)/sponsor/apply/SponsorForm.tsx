"use client";

import { useActionState, useState } from "react";
import { submitSponsorApplication, type SponsorState } from "./actions";
import { btn, input } from "@/lib/ui";
import {
  COURSES, PLAN_CONSULT, yen, ANNUAL_MEMBER, plansFor, findCourse,
  LOCAL_DISCOUNT_COURSE, LOCAL_DISCOUNT_LABEL,
  CO_CREATION_THEMES, DESIRED_BENEFITS, LOGO_SUBMISSION, CONSENTS,
} from "@/lib/sponsor";

const inputCls = `${input()} w-full`;
const labelCls = "flex flex-col gap-1.5 text-[13px] font-semibold text-[var(--ink)]";
const qCls = "text-[15px] font-bold text-[var(--ink)]";
const hintCls = "text-[12px] font-normal leading-6 text-[var(--muted)]";
const req = <span className="ml-1 rounded-[3px] bg-[var(--red-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--red)]">必須</span>;
const opt = <span className="ml-1 rounded-[3px] bg-[var(--green-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--green-d)]">任意</span>;

function Section({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2.5 border-t border-[var(--line)] pt-6">{children}</div>;
}

export function SponsorForm() {
  const [state, action, pending] = useActionState<SponsorState, FormData>(submitSponsorApplication, {});
  // ① 宮崎県法人かどうか（特別割）。**一番最初に分岐させる**＝チェックすると開催は
  //    宮崎に確定し、価格表が特別割に切り替わる（特別割は宮崎開催に限り適用されるため）。
  const [isLocal, setIsLocal] = useState(false);
  // ② 開催コース。特別割のときは宮崎で固定。
  const [picked, setPicked] = useState(COURSES[0].code);
  const courseCode = isLocal ? LOCAL_DISCOUNT_COURSE : picked;
  const course = findCourse(courseCode) ?? COURSES[0];
  const plans = plansFor(course, isLocal);

  if (state.ok) {
    return (
      <div className="rounded-[12px] border border-[var(--green)] bg-[var(--green-soft)] p-8">
        <h2 className="text-[18px] font-bold text-[var(--ink)]">お申し込みありがとうございます。</h2>
        <p className="mt-3 text-[14px] leading-8 text-[var(--ink-2)]">
          内容を確認のうえ、フードジャパンサミット実行委員会より、協賛内容・ロゴデータの提出方法・請求書・今後の進行についてご連絡します。
          <br />
          Food Japan Summit 2026 で、共に新しい事業を生み出していけることを楽しみにしております。
        </p>
        <p className="mt-4 text-[13px] text-[var(--ink-2)]">
          受付番号：<b>{state.refNo}</b>（お問い合わせの際にお伝えください）
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-7">
      {/* ①宮崎県法人の特別割。ここで最初に分岐させる */}
      <div className="rounded-[10px] border-2 border-[var(--amber)] bg-[var(--amber-bg)] p-5">
        <label className="flex cursor-pointer items-start gap-3">
          {/* ⚠️ autoComplete="off" は必須。無いとブラウザが再読み込み時にチェック状態を
              復元し、React の state と表示がずれる（実際に踏んだ）。 */}
          <input
            type="checkbox"
            name="isLocalCorp"
            autoComplete="off"
            checked={isLocal}
            onChange={(e) => setIsLocal(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-[var(--amber-d)]"
          />
          <span>
            <span className="text-[15px] font-bold text-[var(--ink)]">{LOCAL_DISCOUNT_LABEL}</span>
            <span className="mt-1 block text-[12px] leading-6 text-[var(--ink-2)]">
              チェックを入れると<b>宮崎県法人 特別割協賛プラン</b>に切り替わります。
              特別割は<b>宮崎開催に限り</b>適用されます。
            </span>
          </span>
        </label>
      </div>

      {/* 設問1｜協賛対象の開催。特別割のときは宮崎で確定するので選択肢を出さない */}
      <div className="flex flex-col gap-2.5">
        <h2 className={qCls}>1｜協賛対象の開催{req}</h2>
        {isLocal ? (
          <>
            <input type="hidden" name="course" value={LOCAL_DISCOUNT_COURSE} />
            <p className="rounded-[8px] border border-[var(--green)] bg-[var(--green-soft)] px-4 py-3 text-[14px] font-bold text-[var(--ink)]">
              宮崎開催のみ
              <span className="ml-2 text-[12px] font-normal text-[var(--ink-2)]">
                （宮崎県法人 特別割は宮崎開催に限り適用されるため）
              </span>
            </p>
            <p className={hintCls}>
              名古屋開催や両開催をご希望の場合は、上のチェックを外してください。
            </p>
          </>
        ) : (
          <>
            <p className={hintCls}>選んだ開催に応じて、下のプランと価格が切り替わります。</p>
            <div className="flex flex-col gap-2">
              {COURSES.map((c) => (
                <label
                  key={c.code}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-[8px] border px-4 py-3 text-[14px] ${
                    c.code === courseCode
                      ? "border-[var(--green)] bg-[var(--green-soft)] font-bold text-[var(--ink)]"
                      : "border-[var(--line)] bg-white text-[var(--ink)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="course"
                    value={c.code}
                    autoComplete="off"
                    checked={c.code === courseCode}
                    onChange={() => setPicked(c.code)}
                    className="h-4 w-4 accent-[var(--green)]"
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 選んだ開催のプラン一覧 */}
      <div className="flex flex-col gap-2.5 rounded-[10px] bg-[var(--green-soft)] p-5">
        <h2 className={qCls}>{isLocal ? "宮崎県法人 特別割協賛プラン" : course.heading}</h2>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {course.venues.map((v) => (
            <span key={v.label} className="text-[12px] text-[var(--ink-2)]">
              <b className="text-[var(--ink)]">{v.label}</b>　{v.dates}／{v.venue}
            </span>
          ))}
        </div>
        {(isLocal ? course.localLead : course.lead) ? (
          <p className="text-[12px] leading-6 text-[var(--ink-2)]">{isLocal ? course.localLead : course.lead}</p>
        ) : null}
        {plans.length > 0 ? (
          <div className="mt-1 grid gap-3 sm:grid-cols-2">
            {plans.map((p) => (
              <div key={p.code} className="flex flex-col rounded-[10px] border border-[var(--line)] bg-white p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[15px] font-bold tracking-[0.04em] text-[var(--ink)]">{p.name}</span>
                  <span className="text-[15px] font-bold text-[var(--green-d)]">
                    {yen(p.price)}
                    <span className="ml-1 text-[11px] font-normal text-[var(--muted)]">（税別）</span>
                  </span>
                </div>
                {p.features.length > 0 ? (
                  <ul className="mt-2 flex flex-col gap-1">
                    {p.features.map((f) => (
                      <li key={f} className="text-[12px] leading-6 text-[var(--ink-2)]">・{f}</li>
                    ))}
                  </ul>
                ) : null}
                {p.note ? <p className="mt-1.5 text-[11px] text-[var(--muted)]">※ {p.note}</p> : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* 設問2｜希望協賛プラン（コースで中身が入れ替わる） */}
      <Section>
        <h2 className={qCls}>2｜希望協賛プラン{req}</h2>
        <div className="flex flex-col gap-2">
          {plans.map((p) => (
            <label key={p.code} className="flex cursor-pointer items-center gap-2.5 rounded-[8px] border border-[var(--line)] bg-white px-4 py-3 text-[14px] text-[var(--ink)]">
              <input type="radio" name="plan" value={p.code} required className="h-4 w-4 accent-[var(--green)]" />
              <span className="font-bold tracking-[0.04em]">{p.name}</span>
              <span className="text-[var(--green-d)]">{yen(p.price)}（税別）</span>
            </label>
          ))}
          <label className="flex cursor-pointer items-center gap-2.5 rounded-[8px] border border-[var(--line)] bg-white px-4 py-3 text-[14px] text-[var(--ink)]">
            <input type="radio" name="plan" value={PLAN_CONSULT} required defaultChecked={plans.length === 0} className="h-4 w-4 accent-[var(--green)]" />
            内容を相談して決めたい
          </label>
        </div>
      </Section>

      {/* 年間会員（協賛プランと併用できるので、開催の選択とは独立させる） */}
      <Section>
        <h2 className={qCls}>2-2｜年間会員{opt}</h2>
        <label className="flex cursor-pointer items-start gap-2.5 rounded-[8px] border border-[var(--line)] bg-white px-4 py-4">
          <input type="checkbox" name="annualMember" autoComplete="off" className="mt-1 h-4 w-4 shrink-0 accent-[var(--green)]" />
          <span>
            <span className="text-[14px] font-bold text-[var(--ink)]">{ANNUAL_MEMBER.label}</span>
            {/* 訴求の1行目だけ大きく出す（年間会員の価値が一読で伝わるように） */}
            <span className="mt-2 block text-[15px] font-bold leading-7 text-[var(--green-d)]">
              {ANNUAL_MEMBER.headline}
            </span>
            <span className="mt-1.5 block text-[12px] leading-7 text-[var(--ink-2)]">
              {ANNUAL_MEMBER.lines.map((l) => (
                <span key={l} className="block">{l}</span>
              ))}
            </span>
          </span>
        </label>
      </Section>

      {/* 設問3〜10 */}
      <Section>
        <h2 className={qCls}>お申し込み者の情報</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={`${labelCls} sm:col-span-2`}>
            3｜法人・団体名{req}
            <span className={hintCls}>協賛企業として掲載する正式名称をご記入ください。</span>
            <input name="company" required className={inputCls} />
          </label>
          <label className={labelCls}>4｜法人・団体名（フリガナ）{req}<input name="companyKana" required className={inputCls} /></label>
          <label className={labelCls}>5｜ご担当者名{req}<input name="name" required className={inputCls} /></label>
          <label className={labelCls}>6｜部署・役職{opt}<input name="department" className={inputCls} /></label>
          <label className={labelCls}>7｜ご担当者メールアドレス{req}<input name="email" type="email" required className={inputCls} /></label>
          <label className={labelCls}>
            8｜電話番号{req}
            <input name="phone" required placeholder="例：0985-00-0000" className={inputCls} />
          </label>
          <label className={labelCls}>
            9｜所在地{req}
            <span className={hintCls}>都道府県・市区町村までご記入ください。</span>
            <input name="address" required className={inputCls} />
          </label>
          <label className={`${labelCls} sm:col-span-2`}>10｜ウェブサイト{opt}<input name="website" className={inputCls} /></label>
        </div>
      </Section>

      {/* 設問11 */}
      <Section>
        <h2 className={qCls}>11｜協賛を通じて実現したいこと{req}</h2>
        <p className={hintCls}>
          例：新商品の認知拡大、販路開拓、生産者との連携、地域との共創、食品ロス対策、採用・人材育成、自治体との連携など
        </p>
        <textarea name="purpose" required rows={5} className={inputCls} />
      </Section>

      {/* 設問12 */}
      <Section>
        <h2 className={qCls}>12｜関心のある共創テーマ{opt}</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CO_CREATION_THEMES.map((t) => (
            <label key={t} className="flex cursor-pointer items-center gap-2 text-[13px] text-[var(--ink)]">
              <input type="checkbox" name="themes" value={t} className="h-4 w-4 accent-[var(--green)]" />
              {t}
            </label>
          ))}
        </div>
      </Section>

      {/* 設問13 */}
      <Section>
        <h2 className={qCls}>13｜希望する協賛特典{opt}</h2>
        <div className="flex flex-col gap-2">
          {DESIRED_BENEFITS.map((t) => (
            <label key={t} className="flex cursor-pointer items-center gap-2 text-[13px] text-[var(--ink)]">
              <input type="checkbox" name="benefits" value={t} className="h-4 w-4 accent-[var(--green)]" />
              {t}
            </label>
          ))}
        </div>
      </Section>

      {/* 設問14 */}
      <Section>
        <h2 className={qCls}>14｜登壇・展示・試食の希望内容{opt}</h2>
        <p className={hintCls}>希望する商品、サービス、テーマ、展示・試食の内容などをご記入ください。</p>
        <textarea name="presentation" rows={4} className={inputCls} />
      </Section>

      {/* 設問15〜18 */}
      <Section>
        <h2 className={qCls}>請求・ロゴ・その他</h2>
        <label className={labelCls}>15｜請求書の宛名{req}<input name="invoiceName" required className={inputCls} /></label>
        <label className={`${labelCls} mt-2`}>
          16｜請求書に関するご希望{opt}
          <span className={hintCls}>請求書の送付先、記載内容、支払条件に関するご希望があればご記入ください。</span>
          <textarea name="invoiceNote" rows={3} className={inputCls} />
        </label>
        <div className="mt-3">
          <h3 className={qCls}>17｜ロゴデータの提出方法{req}</h3>
          <div className="mt-2 flex flex-col gap-2">
            {LOGO_SUBMISSION.map((v, i) => (
              <label key={v} className="flex cursor-pointer items-center gap-2.5 text-[13px] text-[var(--ink)]">
                <input type="radio" name="logoSubmission" value={v} required defaultChecked={i === 0} className="h-4 w-4 accent-[var(--green)]" />
                {v}
              </label>
            ))}
          </div>
        </div>
        <label className={`${labelCls} mt-3`}>18｜備考・事務局へのメッセージ{opt}<textarea name="message" rows={4} className={inputCls} /></label>
      </Section>

      {/* 同意事項 */}
      <Section>
        <h2 className={qCls}>同意事項{req}</h2>
        <div className="flex flex-col gap-2.5 rounded-[10px] border border-[var(--line)] bg-white p-4">
          {CONSENTS.map((c) => (
            <label key={c} className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-6 text-[var(--ink-2)]">
              <input type="checkbox" name="consent" value="1" required className="mt-1 h-4 w-4 shrink-0 accent-[var(--green)]" />
              {c}
            </label>
          ))}
        </div>
      </Section>

      {/* honeypot（人には見えない） */}
      <input type="text" name="nickname" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

      {state.error ? (
        <p className="rounded-[8px] border border-[var(--red)] bg-[var(--red-soft)] px-4 py-3 text-[13px] leading-6 text-[var(--red)]">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col items-start gap-2">
        <button type="submit" disabled={pending} className={`${btn("primary", "lg")} w-full text-[16px] sm:w-auto sm:min-w-[280px]`}>
          {pending ? "送信中…" : "この内容で申し込む"}
        </button>
        <p className="text-[11px] leading-5 text-[var(--muted)]">
          送信後、ご担当者のメールアドレス宛に受付の控えをお送りします。
        </p>
      </div>
    </form>
  );
}
