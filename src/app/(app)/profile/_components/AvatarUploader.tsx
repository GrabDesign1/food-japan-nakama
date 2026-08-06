"use client";

import { useRef, useState, useTransition } from "react";
import { uploadMemberAvatar, removeMemberAvatar } from "../actions";
import { btn } from "@/lib/ui";

export function AvatarUploader({
  url,
  initial,
}: {
  url: string | null;
  initial: string;
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
      const res = await uploadMemberAvatar(fd);
      if (res.error) setError(res.error);
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <div className="flex items-center gap-4">
      <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-white font-serif text-[28px] text-[var(--green-d)]">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-[12px] text-[var(--ink-2)]">アイコン（プロフィール画像）</div>
        <div className="flex gap-2">
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
              onClick={() =>
                startTransition(async () => {
                  await removeMemberAvatar();
                })
              }
              disabled={pending}
              className={btn("danger", "sm")}
            >
              削除
            </button>
          ) : null}
        </div>
        {error ? <p className="text-[12px] text-[var(--red)]">{error}</p> : null}
      </div>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={onPick} />
    </div>
  );
}
