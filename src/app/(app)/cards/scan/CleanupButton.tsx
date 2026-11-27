"use client";

/**
 * 【取り込まなかった写真を片づける】2026-11-28。
 * ⚠️ 読み取りだけして保存しなかった写真は、行き場のないまま残る。使うほど溜まるので、
 *    自分で消せるようにしておく（事務局に頼まないと消せない、にしない）。
 * ⚠️ 保存済みの名刺の写真は消えない（サーバー側で参照を確認している）。
 */
import { useState, useTransition } from "react";
import { cleanupOrphanCardImages } from "./cleanup-actions";

export function CleanupButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await cleanupOrphanCardImages();
            setMsg(
              r.error
                ? r.error
                : r.removed
                  ? `${r.removed}枚を片づけました。`
                  : "片づける写真はありませんでした。"
            );
          })
        }
        className="text-[12px] text-[var(--muted)] underline hover:text-[var(--ink-2)] disabled:opacity-60"
      >
        {pending ? "片づけています…" : "取り込まなかった写真を片づける"}
      </button>
      {msg ? <span className="text-[12px] text-[var(--ink-2)]">{msg}</span> : null}
    </div>
  );
}
