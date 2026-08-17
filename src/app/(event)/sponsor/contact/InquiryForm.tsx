"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitSponsorInquiry, type InquiryState } from "./actions";
import { btn, input } from "@/lib/ui";

const inputCls = `${input()} w-full`;
const labelCls = "flex flex-col gap-1.5 text-[13px] font-semibold text-[var(--ink)]";
const req = <span className="ml-1 rounded-[3px] bg-[var(--red-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--red)]">必須</span>;
const opt = <span className="ml-1 rounded-[3px] bg-[var(--green-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--green-d)]">任意</span>;

export function InquiryForm() {
  const [state, action, pending] = useActionState<InquiryState, FormData>(submitSponsorInquiry, {});

  if (state.ok) {
    return (
      <div className="rounded-[12px] border border-[var(--green)] bg-[var(--green-soft)] p-8">
        <h2 className="text-[18px] font-bold text-[var(--ink)]">ご相談を受け付けました。</h2>
        <p className="mt-3 text-[14px] leading-8 text-[var(--ink-2)]">
          フードジャパンサミット実行委員会より、あらためてご連絡いたします。
          貴社が実現したいことをうかがったうえで、協賛内容をご提案します。
        </p>
        <p className="mt-4 text-[13px] text-[var(--ink-2)]">
          受付番号：<b>{state.refNo}</b>（お問い合わせの際にお伝えください）
        </p>
        <div className="mt-5">
          <Link href="/sponsor" className={btn("secondary")}>
            協賛のご案内に戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelCls}>
          組織名・企業名{req}
          <input name="company" required className={inputCls} />
        </label>
        <label className={labelCls}>
          ご担当者名{req}
          <input name="name" required className={inputCls} />
        </label>
        <label className={labelCls}>
          電話番号{req}
          <input name="phone" required placeholder="例：0985-00-0000" className={inputCls} />
        </label>
        <label className={labelCls}>
          メールアドレス{req}
          <input name="email" type="email" required className={inputCls} />
        </label>
        <label className={`${labelCls} sm:col-span-2`}>
          Facebook のURL{opt}
          <input name="facebook" placeholder="https://www.facebook.com/..." className={inputCls} />
        </label>
        <label className={`${labelCls} sm:col-span-2`}>
          ご相談の内容{opt}
          <span className="text-[12px] font-normal leading-6 text-[var(--muted)]">
            実現したいこと、ご予算の目安、気になっている開催などがあればご記入ください。
          </span>
          <textarea name="message" rows={4} className={inputCls} />
        </label>
      </div>

      {/* honeypot（人には見えない） */}
      <input type="text" name="nickname" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

      {state.error ? (
        <p className="rounded-[8px] border border-[var(--red)] bg-[var(--red-soft)] px-4 py-3 text-[13px] leading-6 text-[var(--red)]">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col items-start gap-2">
        <button
          type="submit"
          disabled={pending}
          className={`${btn("primary", "lg")} w-full border border-transparent text-[16px] sm:w-auto sm:min-w-[280px]`}
        >
          {pending ? "送信中…" : "送信する"}
        </button>
        <p className="text-[11px] leading-5 text-[var(--muted)]">
          送信後、ご担当者のメールアドレス宛に受付の控えをお送りします。
        </p>
      </div>
    </form>
  );
}
