// 共創フィールドワークの記入ページ（2026-11-18 DAY2 霧島フィールドワーク）。
//
// ⚠️ 検索されないようにする（noindex）。当日の参加者だけが使う道具で、
//    公開コンテンツではない。robots.ts（共通）には触らず、このページだけで指定する。
// ⚠️ (event) グループなので NAKAMA のフッター・ナビは出ない（/sponsor と同じ扱い）。
import type { Metadata } from "next";
import FieldworkApp from "./FieldworkApp";
import { FIELDWORK_EVENT_DATE, FIELDWORK_EVENT_NAME } from "@/lib/fieldwork-core";

export const metadata: Metadata = {
  title: `共創フィールドワーク｜${FIELDWORK_EVENT_NAME}`,
  description: `${FIELDWORK_EVENT_DATE}の参加者向け記入ページ。`,
  robots: { index: false, follow: false },
};

export default function FieldworkPage() {
  return (
    <div className="min-h-screen bg-white">
      <FieldworkApp />
      <footer className="fw-noprint border-t border-[var(--line)] px-5 py-6 text-center text-[11px] leading-6 text-[var(--muted)]">
        {FIELDWORK_EVENT_NAME}
        <br />
        運営：FOOD JAPAN SUMMIT 実行委員会
      </footer>
    </div>
  );
}
