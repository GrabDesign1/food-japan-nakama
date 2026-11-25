// ホームのいちばん上に出す「自分の登録情報」（2026-11-26 ユーザー指示
//   「ホームは、自分の登壇時に登録した登録情報がでるようにして」）。
//
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
}: {
  member: MyProfileHeaderMember | null;
  /** 会員の行がまだ無いとき（登録直後）に出す名前 */
  fallbackName?: string | null;
}) {
  const photo = member?.contactPhotoUrl || member?.avatarUrl || null;
  const personName = member?.contactName || fallbackName || "";
  const company = member?.name ?? "";
  const role = member?.contactRole ?? "";
  const events = member?.summitEvents ?? [];
  const isSpeaker = member?.summitRole === "speaker";

  const meta = [member?.categoryL1, member?.prefecture].filter(Boolean).join("・");

  return (
    <section className="overflow-hidden rounded-[14px] border border-[var(--line)] bg-white">
      {/* 帯（写真のカバーは持っていないので、無地の帯で受ける） */}
      <div className="h-[72px] bg-[var(--green-soft)]" />

      <div className="px-5 pb-5 sm:px-7 sm:pb-6">
        {/* ⚠️ 狭い画面ではボタンを下の行へ送る。同じ行に並べると名前が「見…」まで潰れる（2026-11-26） */}
        <div className="-mt-10 flex flex-wrap items-end gap-x-4 gap-y-3">
          <div className="flex min-w-[220px] flex-1 items-end gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-white bg-[#fcfcfb] shadow-sm">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-[22px] text-[var(--muted)]">👤</div>
              )}
            </div>

            <div className="min-w-0 flex-1 pb-1">
              <h1 className="truncate text-[20px] font-bold leading-tight text-[var(--ink)] sm:text-[22px]">
                {personName || company || "（お名前が未登録です）"}
              </h1>
              <p className="mt-1 truncate text-[13px] text-[var(--ink-2)]">
                {[role, company].filter(Boolean).join("　/　") || "　"}
              </p>
            </div>
          </div>

          <Link href="/profile" className={`${btn("secondary", "sm")} shrink-0`}>
            プロフィールを編集
          </Link>
        </div>

        {/* サミットの記録（取り込んだ控え。空なら出さない） */}
        {events.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {events.map((e) => (
              <span
                key={e}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--green)] bg-[var(--green-soft)] px-3 py-1 text-[11px] font-bold text-[var(--green-d)]"
              >
                {e}
                <span className="font-normal">{isSpeaker ? "ご登壇" : "ご参加"}</span>
              </span>
            ))}
          </div>
        ) : null}

        {member?.contactBio ? (
          <p className="mt-4 whitespace-pre-wrap text-[14px] leading-7 text-[var(--ink-2)]">
            {member.contactBio}
          </p>
        ) : (
          <p className="mt-4 text-[13px] leading-6 text-[var(--muted)]">
            ひとこと紹介がまだありません。どんな取り組みをしているか1〜2行書いておくと、
            会った方が思い出しやすくなります。
          </p>
        )}

        {meta ? <p className="mt-3 text-[12px] text-[var(--muted)]">{meta}</p> : null}
      </div>
    </section>
  );
}
