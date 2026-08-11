"use client";

// お気に入りボタン（案件詳細）。
// サーバーアクションだけだと押しても画面がすぐ変わらず「効いていない」ように見え、
// もう一度押して取り消してしまう事故が起きたため、押した瞬間に表示を切り替える（2026-08-11）。
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleFavorite } from "../../favorites/actions";
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
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={favorited}
      onClick={() => {
        const next = !favorited;
        setFavorited(next); // 先に見た目を変える（サーバー側が失敗したら戻す）
        startTransition(async () => {
          try {
            await toggleFavorite("offering", offeringId);
            router.refresh();
          } catch {
            setFavorited(!next);
          }
        });
      }}
      className={`${btn("secondary", size)} ${fullWidth ? "w-full" : ""} disabled:opacity-60`}
    >
      {favorited ? "★ お気に入り済み" : "☆ お気に入りに追加"}
    </button>
  );
}
