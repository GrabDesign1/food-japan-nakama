// ホームに出す「自分の登録情報」（2026-11-26 ユーザー指示
//   「ホームは、自分の登壇時に登録した登録情報がでるようにして」
//    → 同日「プロフィールは広げたり畳んだりできるようにして普段は、畳んでおいて」）。
//
// ⚠️⚠️ **既定はたたんだ状態。** ホームの主役は投稿と仲間の動きで、自分の情報ではない。
// ⚠️ 開け閉めは <details> で行う（JSなし）。useState にすると、この1か所のために
//    ホームへクライアント部品が増える。開いたかどうかはブラウザが覚える必要もない。
// ⚠️⚠️ **ここは自分だけが見る画面**（マイページ）。他の会員には出ない。
//    掲載するかどうかとは別の話なので、未公開の方の情報もここには出してよい。
// ⚠️ サミットの記録（summitEvents / summitRole）は、イベントから取り込んだ控え。
//    空のときは何も書かない（「登壇していません」とは書かない。取り込み漏れのこともある）。
import Link from "next/link";
import { btn } from "@/lib/ui";

export type MyProfileHeaderMember = {
  name: string;
  contactName: string | null;
  contactRole: string | null;
  contactBio: string | null;
  contactPhotoUrl: string | null;
  avatarUrl: string | null;
  companyLogoUrl: string | null;
  prefecture: string | null;
  categoryL1: string;
  summitEvents: string[];
  summitRole: string | null;
};

export function MyProfileHeader({
  member,
  fallbackName,
  defaultOpen = false,
  counts,
}: {
  member: MyProfileHeaderMember | null;
  /** 会員の行がまだ無いとき（登録直後）に出す名前 */
  fallbackName?: string | null;
  /** 最初から開いておくか。⚠️ ホームでは false（たたんでおく） */
  defaultOpen?: boolean;
  /**
   * 仲間・フォロー・フォロワーの人数（2026-11-27 ユーザー指示
   * 「仲間 ◯◯人　フォロー ◯◯人　というように」）。
   * ⚠️ 読み込み元（dashboard）が渡す。⚠️⚠️ ここで数えない（この部品はDBに触らない）。
   */
  counts?: { friends: number; following: number; followers: number } | null;
}) {
  const photo = member?.contactPhotoUrl || member?.avatarUrl || null;
  const personName = member?.contactName || fallbackName || "";
  const company = member?.name ?? "";
  const role = member?.contactRole ?? "";
  const events = member?.summitEvents ?? [];
  const isSpeaker = member?.summitRole === "speaker";
  const meta = [member?.categoryL1, member?.prefecture].filter(Boolean).join("・");
  const sub = [role, company].filter(Boolean).join("　/　");

  return (
    <details
      open={defaultOpen}
      className="group overflow-hidden rounded-[14px] border border-[var(--line)] bg-white"
    >
      {/* たたんだ1行。押すと開く */}
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 marker:hidden hover:bg-[var(--line-soft)]/60 sm:px-5">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[var(--line)] bg-[var(--line-soft)]">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-[var(--ink)]">
            {personName || company || "（お名前が未登録です）"}
          </p>
          {sub ? <p className="truncate text-[12px] text-[var(--muted)]">{sub}</p> : null}
          {/*
            仲間とフォローの人数（2026-11-27）。⚠️ たたんだ1行にも出す——
            ⚠️⚠️ ここは毎日見る場所なので、開かないと分からない数字にしない。
            ⚠️ 狭い画面では「フォロワー」を落とす（⚠️ 3つ並ぶと名前が潰れる）。
          */}
          {counts ? (
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[12px] text-[var(--ink-2)]">
              <span>
                仲間 <b className="text-[var(--ink)]">{counts.friends}</b> 人
              </span>
              <span>
                フォロー <b className="text-[var(--ink)]">{counts.following}</b> 人
              </span>
              <span className="hidden sm:inline">
                フォロワー <b className="text-[var(--ink)]">{counts.followers}</b> 人
              </span>
            </p>
          ) : null}
        </div>
        <span className="shrink-0 text-[12px] font-semibold text-[var(--muted)]">
          <span className="group-open:hidden">自分の登録情報</span>
          <span className="hidden group-open:inline">とじる</span>
          <span className="ml-1.5 inline-block transition group-open:rotate-90" aria-hidden>
            ›
          </span>
        </span>
      </summary>

      {/* 開いた中身 */}
      <div className="border-t border-[var(--line)] px-4 py-5 sm:px-5">
        {events.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {events.map((e) => (
              <span
                key={e}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ink)] px-3 py-1 text-[11px] font-bold text-[var(--ink)]"
              >
                {e}
                <span className="font-normal">{isSpeaker ? "ご登壇" : "ご参加"}</span>
              </span>
            ))}
          </div>
        ) : null}

        {member?.contactBio ? (
          <p
            className={`${events.length ? "mt-4" : ""} max-w-[46em] whitespace-pre-wrap text-[14px] leading-[1.9] text-[var(--ink-2)]`}
          >
            {member.contactBio}
          </p>
        ) : (
          <p className={`${events.length ? "mt-4" : ""} text-[13px] leading-6 text-[var(--muted)]`}>
            ひとこと紹介がまだありません。どんな取り組みをしているか1〜2行書いておくと、
            会った方が思い出しやすくなります。
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
          {meta ? <p className="text-[12px] text-[var(--muted)]">{meta}</p> : null}
          <Link href="/profile" className={`${btn("secondary", "sm")} ml-auto`}>
            プロフィールを編集
          </Link>
        </div>
      </div>
    </details>
  );
}
