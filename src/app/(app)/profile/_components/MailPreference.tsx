"use client";

// 案内メールの受け取り設定（2026-08-16）。規約第27条の2で約束した「いつでも配信停止できる」手段。
// 手続的な連絡（審査結果・掲載の確認依頼など）は、この設定に関わらず届く。
import { useTransition, useState } from "react";
import { setMarketingOptIn } from "../actions";
import { btn } from "@/lib/ui";

export function MailPreference({ optIn }: { optIn: boolean }) {
  const [on, setOn] = useState(optIn);
  const [pending, start] = useTransition();

  return (
    <section className="rounded-[10px] border border-[var(--line)] bg-white p-6">
      <h2 className="text-[16px] font-bold text-[var(--ink)]">案内メールの受け取り</h2>
      <p className="mt-2 text-[13px] leading-7 text-[var(--ink-2)]">
        案件・イベント・共創支援などのご案内（広告・宣伝を含みます）をメールでお送りしています。
        受け取りをやめたい場合は、下のボタンで停止できます。
        <br />
        審査結果、掲載内容の確認依頼、重要なお知らせなど、
        <b>ご利用に必要な連絡は停止できません</b>（規約第27条の2）。
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span
          className={`rounded px-2 py-1 text-[12px] font-bold ${
            on ? "bg-[var(--green-soft)] text-[var(--green-d)]" : "bg-[var(--line)] text-[var(--ink-2)]"
          }`}
        >
          現在：{on ? "受け取る" : "受け取らない"}
        </span>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const next = !on;
              await setMarketingOptIn(next);
              setOn(next);
            })
          }
          className={btn(on ? "secondary" : "primary", "sm")}
        >
          {pending ? "変更中…" : on ? "案内メールを停止する" : "案内メールを受け取る"}
        </button>
      </div>
    </section>
  );
}
