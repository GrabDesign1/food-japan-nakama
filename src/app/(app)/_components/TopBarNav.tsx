"use client";

/**
 * 【上の帯の丸いアイコン】2026-11-27 ユーザーご指示
 *   「Facebookから活かせる　アイコンは真似して。」→「上の帯のアイコンの並び」。
 *
 * ⚠️⚠️ **よく行く4か所だけ**（ホーム／探す／オススメの仲間／つながり）。
 *    ⚠️ 増やすと、せまい画面でロゴが折れる（375px で実測済み。丸が1つ増えるたびに起きる）。
 * ⚠️⚠️ **スマホでは出さない。** 下に固定のナビ（MobileNav）が同じ場所へ行けるので、
 *    上に同じものを並べると、同じ行き先が2つになるうえ、ロゴが折れる。
 * ⚠️ いま居る場所は濃く出す（Facebook と同じ）。そのために usePathname を使う＝client 部品。
 * ⚠️ メッセージの丸（MessagePeek）とアバターは、この部品の外（layout.tsx）にある。
 *    ⚠️ あちらは押すと吹き出しが開くので、ただのリンクであるこことは作りが違う。
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon } from "./NavIcon";

const ITEMS: { href: string; label: string }[] = [
  { href: "/dashboard", label: "ホーム" },
  { href: "/search", label: "案件を探す" },
  { href: "/matching", label: "オススメの仲間" },
  { href: "/connections", label: "つながり" },
];

export function TopBarNav({ pending }: { pending: number }) {
  const pathname = usePathname() ?? "";

  return (
    <nav className="hidden items-center gap-1 sm:flex" aria-label="よく使う画面">
      {ITEMS.map((it) => {
        const on = pathname === it.href || pathname.startsWith(`${it.href}/`);
        return (
          <Link
            key={it.href}
            href={it.href}
            title={it.label}
            aria-label={it.label}
            aria-current={on ? "page" : undefined}
            className={`relative grid h-10 w-10 place-items-center rounded-full transition ${
              on
                ? "bg-[var(--ink)] text-white"
                : "bg-[var(--line-soft)] text-[var(--ink)] hover:bg-[var(--line)]"
            }`}
          >
            <NavIcon href={it.href} size={20} />
            {/*
              届いている申請の件数（⚠️ 0件のときは出さない＝赤い丸は「用がある」印）。
              ⚠️ 99件を超えたら「99+」で止める（⚠️ 3桁で丸からはみ出す）。
            */}
            {it.href === "/connections" && pending > 0 ? (
              <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-white bg-[var(--red)] px-1 text-[10px] font-bold leading-none text-white">
                {pending > 99 ? "99+" : pending}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
