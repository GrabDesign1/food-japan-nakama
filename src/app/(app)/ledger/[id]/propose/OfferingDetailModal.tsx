"use client";

// 提案画面の「対象案件」の詳細をモーダルで見せる（2026-08-11）。
// 従来は案件ページへのリンクで、提案の途中で別ページへ移動してしまい入力が中断していた。
import { useState } from "react";
import { btn, h2FormCls } from "@/lib/ui";

export type OfferingDetailData = {
  title: string;
  description: string | null;
  usageContext: string | null;
  points: string | null;
  seekingTypeLabel: string | null;
  category: string;
  memberName: string;
  facts: [string, string][];
  requirements: { kindLabel: string; text: string; levelLabel: string; level: string }[];
  tags: string[];
};

const LEVEL_STYLE: Record<string, string> = {
  must: "bg-[#FBF1EE] text-[var(--red)]",
  want: "bg-[var(--amber-soft)] text-[var(--amber)]",
  negotiable: "bg-[var(--green-soft)] text-[var(--green-d)]",
};

export function OfferingDetailModal({ data }: { data: OfferingDetailData }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={btn("secondary", "sm")}>
        募集の詳細を見る
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="offering-detail-title"
            className="relative flex max-h-[88vh] w-full max-w-[720px] flex-col rounded-[14px] border border-[var(--line)] bg-white shadow-xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-3">
              <div className="min-w-0">
                <div className="text-[11px] text-[var(--muted)]">
                  {data.category}
                  {data.seekingTypeLabel ? `　/　${data.seekingTypeLabel}` : ""}
                </div>
                <h2 id="offering-detail-title" className={`${h2FormCls} mt-0.5`}>
                  {data.title}
                </h2>
                <div className="mt-0.5 text-[11px] text-[var(--muted)]">掲載者：{data.memberName}</div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="閉じる"
                className="shrink-0 rounded-md px-2 py-1 text-[18px] leading-none text-[var(--muted)] hover:bg-[var(--canvas)]"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {data.description ? (
                <section className="mb-4">
                  <h3 className="mb-1 text-[12px] font-bold text-[var(--ink)]">何を探しているか</h3>
                  <p className="whitespace-pre-wrap text-[13px] leading-7 text-[var(--ink-2)]">
                    {data.description}
                  </p>
                </section>
              ) : null}

              {data.usageContext ? (
                <section className="mb-4">
                  <h3 className="mb-1 text-[12px] font-bold text-[var(--ink)]">使用目的・販売先</h3>
                  <p className="whitespace-pre-wrap text-[13px] leading-7 text-[var(--ink-2)]">
                    {data.usageContext}
                  </p>
                </section>
              ) : null}

              {data.requirements.length ? (
                <section className="mb-4">
                  <h3 className="mb-1 text-[12px] font-bold text-[var(--ink)]">条件</h3>
                  <ul className="flex flex-col gap-1">
                    {data.requirements.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] leading-6 text-[var(--ink-2)]">
                        <span
                          className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            LEVEL_STYLE[r.level] ?? LEVEL_STYLE.want
                          }`}
                        >
                          {r.levelLabel}
                        </span>
                        <span>
                          <b className="text-[var(--ink)]">{r.kindLabel}</b>：{r.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {data.facts.length ? (
                <section className="mb-4">
                  <h3 className="mb-1 text-[12px] font-bold text-[var(--ink)]">取引条件</h3>
                  <dl className="overflow-hidden rounded-[10px] border border-[var(--line)]">
                    {data.facts.map(([k, v], i) => (
                      <div
                        key={k}
                        className={`flex gap-3 px-3 py-2 text-[12px] ${i > 0 ? "border-t border-[var(--line-soft)]" : ""}`}
                      >
                        <dt className="w-[110px] shrink-0 text-[var(--muted)]">{k}</dt>
                        <dd className="flex-1 text-[var(--ink)]">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ) : null}

              {data.points ? (
                <section className="mb-4">
                  <h3 className="mb-1 text-[12px] font-bold text-[var(--ink)]">備考</h3>
                  <p className="whitespace-pre-wrap text-[13px] leading-7 text-[var(--ink-2)]">{data.points}</p>
                </section>
              ) : null}

              {data.tags.length ? (
                <div className="flex flex-wrap gap-1">
                  {data.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[10px] text-[var(--ink-2)]"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex justify-end border-t border-[var(--line)] px-5 py-3">
              <button type="button" onClick={() => setOpen(false)} className={btn("secondary", "sm")}>
                閉じて提案に戻る
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
