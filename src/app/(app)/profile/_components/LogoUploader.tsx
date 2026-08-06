"use client";

import { useRef, useState, useTransition } from "react";
import { uploadMemberLogo, removeMemberLogo } from "../actions";
import { btn } from "@/lib/ui";

export function LogoUploader({
  kind,
  label,
  url,
}: {
  kind: "company" | "brand";
  label: string;
  url: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    startTransition(async () => {
      const res = await uploadMemberLogo(kind, fd);
      if (res.error) setError(res.error);
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[12px] text-[var(--ink-2)]">{label}</div>
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-40 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--line)] bg-white p-2">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={label} className="max-h-[60px] max-w-full object-contain" />
          ) : (
            <span className="text-[11px] text-[var(--muted)]">未登録</span>
          )}
        </div>
        <div className="flex flex-col items-stretch gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className={btn("secondary", "sm")}
          >
            {pending ? "処理中…" : url ? "画像を変更" : "画像を選ぶ"}
          </button>
          {url ? (
            <button
              type="button"
              onClick={() => startTransition(async () => { await removeMemberLogo(kind); })}
              disabled={pending}
              className={btn("danger", "sm")}
            >
              削除
            </button>
          ) : null}
          {error ? <p className="text-[12px] text-[var(--red)]">{error}</p> : null}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={onPick} />
    </div>
  );
}
