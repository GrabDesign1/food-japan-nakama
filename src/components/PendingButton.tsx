"use client";

// フォーム送信中はボタンを無効化して連打・二重送信を防ぐ（<form action> の中で使う）。
import { useFormStatus } from "react-dom";

export function PendingButton({
  className,
  children,
  pendingText = "処理中…",
}: {
  className?: string;
  children: React.ReactNode;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${className ?? ""} ${pending ? "pointer-events-none opacity-60" : ""}`}
    >
      {pending ? pendingText : children}
    </button>
  );
}
