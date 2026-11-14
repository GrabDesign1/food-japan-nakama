"use client";

// できあがった共創企画書。A4縦1枚＋付録として組む。
//
// ⚠️ 印刷用のCSSはこのファイルの <style> に閉じている（globals.css を触らないため）。
//    このページを開いているときだけ有効になる。
// ⚠️ PDFはブラウザの印刷（「PDFとして保存」）で作る。PDF生成ライブラリは入れない
//    ――11/18に間に合わせることを優先し、依存を増やさない判断（2026-11-14）。
import { useState } from "react";
import { btn } from "@/lib/ui";
import {
  FIELDWORK_EVENT_DATE,
  FIELDWORK_EVENT_NAME,
  PITCH_PLAN,
  REPORT_SECTIONS,
  type FieldworkReport,
} from "@/lib/fieldwork-core";

type Props = {
  report: FieldworkReport;
  cover: { name: string; company: string; team: string; partner: string };
  onBack: () => void;
};

export default function ProposalDoc({ report, cover, onBack }: Props) {
  const [copied, setCopied] = useState<"" | "msg" | "all">("");

  const plainText = [
    `${report.projectName}`,
    "",
    report.summary,
    "",
    ...REPORT_SECTIONS.map((s) => `■ ${s.label}\n${report[s.key]}`),
    "",
    `■ 福山黒酢への最初の相談文\n${report.firstMessage}`,
    "",
    `■ 2分発表の台本\n${report.pitch}`,
    "",
    `${FIELDWORK_EVENT_NAME}／${FIELDWORK_EVENT_DATE}`,
    [cover.company, cover.team, cover.name].filter(Boolean).join("　"),
  ].join("\n");

  async function copy(text: string, which: "msg" | "all") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setCopied("");
    }
  }

  return (
    <div className="mx-auto w-full max-w-[860px] px-4 pb-24 pt-5 sm:px-6">
      <style>{`
        @media print {
          .fw-noprint { display: none !important; }
          .fw-doc { box-shadow: none !important; border: 0 !important; margin: 0 !important; padding: 0 !important; }
          .fw-page { page-break-after: always; }
          .fw-page:last-child { page-break-after: auto; }
          .fw-block { break-inside: avoid; }
          body { background: #fff !important; }
        }
        @page { size: A4; margin: 16mm 14mm; }
      `}</style>

      {/* 操作列（印刷には出さない） */}
      <div className="fw-noprint mb-5 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => window.print()} className={btn("primary", "md")}>
          印刷・PDFで保存
        </button>
        <button type="button" onClick={() => copy(plainText, "all")} className={btn("secondary", "md")}>
          {copied === "all" ? "コピーしました" : "全文をコピー"}
        </button>
        <button type="button" onClick={onBack} className={btn("ghost", "md")}>
          入力に戻って作り直す
        </button>
      </div>

      <div className="fw-noprint mb-5 rounded-[10px] border border-[var(--amber-line)] bg-[var(--amber-bg)] px-4 py-3 text-[13px] leading-6 text-[var(--amber-ink)]">
        <strong className="font-bold">そのまま使わず、事実を確かめてから発表してください。</strong>
        <br />
        AIが書いた下書きです。現地で聞いていないことが混ざっていないか、「要確認」と書かれた箇所が
        埋まっているかを見てから、社内と福山黒酢へお出しください。
      </div>

      {/* ── 企画書本体 ───────────────────────────── */}
      <article className="fw-doc rounded-[10px] border border-[var(--line)] bg-white px-6 py-8 shadow-sm sm:px-10 sm:py-12">
        <div className="fw-page">
          {/* 表紙部 */}
          <header className="fw-block border-b-2 border-[var(--ink)] pb-6">
            <p className="text-[11px] tracking-[0.18em] text-[var(--muted)]">共創事業 企画書</p>
            <h1 className="mt-3 font-serif text-[26px] leading-[1.4] text-[var(--ink)] sm:text-[32px]">
              {report.projectName || "（企画名 要確認）"}
            </h1>
            {cover.partner ? (
              <p className="mt-3 text-[14px] font-semibold text-[var(--green-d)]">
                共創先：{cover.partner}
              </p>
            ) : null}
            <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px] leading-6">
              {cover.company ? (
                <>
                  <dt className="text-[var(--muted)]">提案者</dt>
                  <dd className="text-[var(--ink)]">
                    {cover.company}
                    {cover.name ? `　${cover.name}` : ""}
                  </dd>
                </>
              ) : null}
              {cover.team ? (
                <>
                  <dt className="text-[var(--muted)]">チーム</dt>
                  <dd className="text-[var(--ink)]">{cover.team}</dd>
                </>
              ) : null}
              <dt className="text-[var(--muted)]">出典</dt>
              <dd className="text-[var(--ink)]">
                {FIELDWORK_EVENT_NAME}
                <br />
                {FIELDWORK_EVENT_DATE}
              </dd>
            </dl>
          </header>

          {/* 要約 */}
          {report.summary ? (
            <section className="fw-block mt-7 rounded-[8px] bg-[var(--green-soft)] px-5 py-4">
              <h2 className="text-[12px] font-bold tracking-[0.1em] text-[var(--green-d)]">要約</h2>
              <p className="mt-2 whitespace-pre-wrap text-[15px] leading-[1.9] text-[var(--ink)]">
                {report.summary}
              </p>
            </section>
          ) : null}

          {/* 1〜9（ワークブック WORK 7 の構成） */}
          <div className="mt-8 flex flex-col gap-7">
            {REPORT_SECTIONS.map((s) => (
              <section key={s.key} className="fw-block">
                <h2 className="flex items-baseline gap-2.5 border-b border-[var(--line)] pb-2">
                  <span className="font-serif text-[15px] text-[var(--green)]">{s.no}</span>
                  <span className="text-[15px] font-bold text-[var(--ink)]">{s.label}</span>
                </h2>
                <p className="mt-2.5 whitespace-pre-wrap text-[14px] leading-[1.95] text-[var(--ink-2)]">
                  {report[s.key] || "要確認"}
                </p>
              </section>
            ))}
          </div>
        </div>

        {/* ── 付録（別ページ） ───────────────────── */}
        <div className="fw-page mt-10 border-t-2 border-[var(--ink)] pt-8">
          <section className="fw-block">
            <h2 className="flex items-baseline gap-2.5 border-b border-[var(--line)] pb-2">
              <span className="font-serif text-[15px] text-[var(--green)]">付録1</span>
              <span className="text-[15px] font-bold text-[var(--ink)]">福山黒酢への最初の相談文</span>
            </h2>
            <p className="mt-2 text-[12px] leading-6 text-[var(--muted)]">
              文面はそのまま送れる形になっています。社名・日付・署名をご自身のものに直してからお送りください。
            </p>
            <div className="mt-3 rounded-[8px] border border-[var(--line)] bg-[#fcfcfb] px-5 py-4">
              <p className="whitespace-pre-wrap text-[14px] leading-[2] text-[var(--ink)]">
                {report.firstMessage || "要確認"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => copy(report.firstMessage, "msg")}
              className={`fw-noprint mt-3 ${btn("secondary", "sm")}`}
            >
              {copied === "msg" ? "コピーしました" : "この相談文をコピー"}
            </button>
          </section>

          <section className="fw-block mt-9">
            <h2 className="flex items-baseline gap-2.5 border-b border-[var(--line)] pb-2">
              <span className="font-serif text-[15px] text-[var(--green)]">付録2</span>
              <span className="text-[15px] font-bold text-[var(--ink)]">2分発表の台本</span>
            </h2>
            <p className="mt-2 text-[12px] leading-6 text-[var(--muted)]">
              {PITCH_PLAN.map((p) => `${p.sec} ${p.what}`).join("／")}
            </p>
            <p className="mt-3 whitespace-pre-wrap text-[14px] leading-[2] text-[var(--ink-2)]">
              {report.pitch || "要確認"}
            </p>
          </section>

          <p className="mt-10 border-t border-[var(--line)] pt-4 text-[11px] leading-6 text-[var(--muted)]">
            この企画書は、{FIELDWORK_EVENT_NAME}の記入内容をもとにAIが作成した下書きです。
            記載内容の確認と判断は提案者が行っています。
          </p>
        </div>
      </article>
    </div>
  );
}
