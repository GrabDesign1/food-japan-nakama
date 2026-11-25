// 「発信しているところ」の、画面と処理の両方から使う定数だけ。
// ⚠️⚠️ **ここに prisma を import しない。** "use client" のフォームから読むため、
//    DBを触る処理（member-links.ts）とは必ず分ける。
export const MEMBER_LINK_MAX = 12;
export const MEMBER_LINK_FREE_SLOTS = 4;

export type LinkKind =
  | "site" | "facebook" | "instagram" | "x" | "note"
  | "youtube" | "linkedin" | "tiktok" | "other";

export const FIXED_KINDS: { kind: LinkKind; label: string; placeholder: string }[] = [
  { kind: "site",      label: "自社サイト",   placeholder: "https://example.co.jp" },
  { kind: "facebook",  label: "Facebook",     placeholder: "https://www.facebook.com/…" },
  { kind: "instagram", label: "Instagram",    placeholder: "https://www.instagram.com/…" },
  { kind: "x",         label: "X（Twitter）", placeholder: "https://x.com/…" },
  { kind: "note",      label: "note",         placeholder: "https://note.com/…" },
  { kind: "youtube",   label: "YouTube",      placeholder: "https://www.youtube.com/@…" },
  { kind: "linkedin",  label: "LinkedIn",     placeholder: "https://www.linkedin.com/in/…" },
  { kind: "tiktok",    label: "TikTok",       placeholder: "https://www.tiktok.com/@…" },
];
