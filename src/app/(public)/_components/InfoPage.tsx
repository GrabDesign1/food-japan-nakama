import Link from "next/link";
import { PublicTopBar } from "./PublicTopBar";
import { eyebrowCls, h1Cls } from "@/lib/ui";

// 公開の情報・法務ページ共通レイアウト。
export function InfoPage({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <PublicTopBar />
      <div className="mx-auto flex max-w-[820px] flex-col gap-6 px-4 py-10">
        <Link href="/" className="text-[12px] text-[var(--green-d)] underline">← トップに戻る</Link>
        <div className="flex flex-col gap-2">
          {eyebrow ? <p className={eyebrowCls}>{eyebrow}</p> : null}
          <h1 className={h1Cls}>{title}</h1>
          {lead ? <p className="text-[14px] leading-7 text-[var(--ink-2)]">{lead}</p> : null}
        </div>
        {children}
      </div>
    </>
  );
}

// 法務本文（プレーンテキストをそのまま整形表示）
export function LegalBody({ text }: { text: string }) {
  return (
    <div className="whitespace-pre-wrap rounded-[10px] border border-[var(--line)] bg-white p-6 text-[13px] leading-7 text-[var(--ink-2)]">
      {text}
    </div>
  );
}
