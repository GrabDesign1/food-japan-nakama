"use client";

// お気に入りボタン（案件詳細）。
// サーバー側が条件に合わないと無言で終了する作りだったため「押しても何も起きない」状態になっていた。
// 押した瞬間に表示を切り替え、失敗した場合は理由をその場に出す（2026-08-11）。
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleFavoriteWithResult } from "../../favorites/actions";
import { btn } from "@/lib/ui";

export function FavoriteButton({
  offeringId,
  initialFavorited,
  size = "sm",
  fullWidth = false,
}: {
  offeringId: string;
  initialFavorited: boolean;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className={fullWidth ? "w-full" : ""}>
      <button
        type="button"
        disabled={pending}
        aria-pressed={favorited}
        onClick={() => {
          const next = !favorited;
          setError(null);
          setFavorited(next); // 先に見た目を変える（失敗したら戻す）
          startTransition(async () => {
            try {
              const res = await toggleFavoriteWithResult("offering", offeringId);
              if (!res.ok) {
                setFavorited(!next);
                setError(res.message ?? "お気に入りに追加できませんでした。");
                return;
              }
              setFavorited(res.favorited);
              router.refresh();
            } catch {
              setFavorited(!next);
              setError("通信に失敗しました。時間をおいて再度お試しください。");
            }
          });
        }}
        className={`${btn("secondary", size)} ${fullWidth ? "w-full" : ""} disabled:opacity-60`}
      >
        {pending ? "処理中…" : favorited ? "★ お気に入り済み" : "☆ お気に入りに追加"}
      </button>
      {error ? <p className="mt-1 text-[11px] text-[var(--red)]">{error}</p> : null}
    </div>
  );
}
