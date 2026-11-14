"use client";

import { useState } from "react";
import { btn } from "@/lib/ui";

/**
 * 交換コードと交換用URLのコピー。
 * ⚠️ 会場でもオンラインでも、**口頭で8文字を伝える**のは現実的でない。
 *    URLをそのままLINE等に貼れるようにしておくのが、会期後の主動線になる。
 * ⚠️ clipboard API は安全なコンテキスト（https / localhost）でしか動かない。
 *    失敗しても画面にコードは出ているので、落とさず黙って戻す。
 */
export function CardShare({ code, url }: { code: string; url: string }) {
  const [copied, setCopied] = useState<"code" | "url" | null>(null);

  async function copy(kind: "code" | "url", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // コピーできない環境では何もしない（コードは画面に出ている）
    }
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" onClick={() => copy("code", code)} className={btn("secondary", "sm")}>
        {copied === "code" ? "コピーしました" : "コードをコピー"}
      </button>
      <button type="button" onClick={() => copy("url", url)} className={btn("secondary", "sm")}>
        {copied === "url" ? "コピーしました" : "交換リンクをコピー"}
      </button>
    </div>
  );
}
