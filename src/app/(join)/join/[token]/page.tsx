// 「サービスが出来ました、利用しますか？」（2026-11-23 ユーザー指示）。
//
// ⚠️⚠️ **この画面の役目は、本人に決めてもらうこと。** 誘導しない。
//    「はい」と「いいえ」を同じ大きさで並べる。「いいえ」を小さくしない。
// ⚠️⚠️ **お預かりしている中身を、そのまま見せる。**
//    何を持たれているか分からないまま「はい」を押させない。
// ⚠️ ログインしていない方が開く画面（middleware の PUBLIC_PATHS に /join を入れてある）。
import type { Metadata } from "next";
import { findByInviteToken } from "@/lib/member-invite";
import { answerYes, answerNo } from "./actions";
import { btn } from "@/lib/ui";

export const metadata: Metadata = {
  title: "FOOD JAPAN NAKAMA のご案内",
  // ⚠️ 合言葉つきの個人宛ページ。検索に出さない
  robots: { index: false, follow: false },
};

/** ⚠️ 外側の余白・ロゴは (join)/layout.tsx が持つ。ここはカード1枚だけ描く（二重にしない） */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[12px] border border-[var(--line)] bg-white p-6 sm:p-8">{children}</div>
  );
}

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ e?: string }>;
}) {
  const { token } = await params;
  const sp = (await searchParams) ?? {};
  const view = await findByInviteToken(token);

  if (!view) {
    return (
      <Shell>
        <h1 className="text-[18px] font-bold text-[var(--ink)]">このご案内は、もう開けません</h1>
        <p className="mt-3 text-[14px] leading-7 text-[var(--ink-2)]">
          すでにお答えいただいたか、お預かりしていた情報を削除済みです。
          お心当たりがない場合は、そのまま閉じてください。
        </p>
      </Shell>
    );
  }

  if (view.answered === "no") {
    return (
      <Shell>
        <h1 className="text-[18px] font-bold text-[var(--ink)]">承知しました</h1>
        <p className="mt-3 text-[14px] leading-7 text-[var(--ink-2)]">
          お預かりしていた情報は削除しました。こちらからご連絡することはありません。
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="text-[11px] font-medium tracking-[0.14em] text-[var(--muted)]">FOOD JAPAN NAKAMA</p>
      <h1 className="mt-2 text-[20px] font-bold leading-snug text-[var(--ink)]">
        サービスができました。
        <br />
        お使いになりますか？
      </h1>

      <p className="mt-4 text-[14px] leading-7 text-[var(--ink-2)]">
        FOOD JAPAN SUMMIT でお会いした方々が、そのあともつながっていられる場です。
        名刺を交換すると、その方の取り組みが読めます。
      </p>

      {/* ⚠️ 何を持たれているかを、押す前に見せる */}
      <div className="mt-6 rounded-[10px] border border-[var(--line)] bg-[var(--green-soft)] p-4">
        <p className="text-[12px] font-bold text-[var(--ink)]">お預かりしている内容</p>
        <dl className="mt-2 flex flex-col gap-1.5 text-[13px]">
          <div className="flex gap-3">
            <dt className="w-[72px] shrink-0 text-[var(--muted)]">事業者名</dt>
            <dd className="text-[var(--ink)]">{view.name || "—"}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-[72px] shrink-0 text-[var(--muted)]">お名前</dt>
            <dd className="text-[var(--ink)]">{view.contactName || "—"}</dd>
          </div>
          {view.contactRole ? (
            <div className="flex gap-3">
              <dt className="w-[72px] shrink-0 text-[var(--muted)]">肩書</dt>
              <dd className="text-[var(--ink)]">{view.contactRole}</dd>
            </div>
          ) : null}
          {view.prefecture ? (
            <div className="flex gap-3">
              <dt className="w-[72px] shrink-0 text-[var(--muted)]">都道府県</dt>
              <dd className="text-[var(--ink)]">{view.prefecture}</dd>
            </div>
          ) : null}
          <div className="flex gap-3">
            <dt className="w-[72px] shrink-0 text-[var(--muted)]">メール</dt>
            <dd className="text-[var(--ink)]">{view.maskedEmail}</dd>
          </div>
        </dl>
        <p className="mt-3 border-t border-[var(--green)] pt-2.5 text-[12px] leading-6 text-[var(--ink-2)]">
          {/* ⚠️⚠️ 事実と違うことを書かない。一覧に出した方には「出している」と書く（2026-11-25）。
              登壇者45名を一覧へ出したのに、ここが「誰にも見えていません」のままだった。 */}
          {view.listed ? (
            <>
              <strong>いまは、会員だけが見られる登壇者一覧に出しています。</strong>
              一般には公開しておらず、検索にも出ません。
              「いいえ」を選ばれた場合、掲載はその場で取り下げ、お預かりした情報も削除します。
              電話番号はお預かりしていません。
            </>
          ) : (
            <>
              <strong>いまは、誰にも見えていません。</strong>
              「はい」を選ばれてはじめて、ほかの会員に見えるようになります。
              電話番号はお預かりしていません。
            </>
          )}
        </p>
      </div>

      {sp.e ? (
        <p className="mt-4 text-[13px] text-[var(--red)]">
          うまくいきませんでした。もう一度お試しください。
        </p>
      ) : null}

      {/* ⚠️ 2つを同じ大きさで並べる。「いいえ」を押しにくくしない */}
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <form action={answerYes} className="flex-1">
          <input type="hidden" name="token" value={token} />
          <button className={`${btn("primary", "lg")} w-full`}>はい、使います</button>
        </form>
        <form action={answerNo} className="flex-1">
          <input type="hidden" name="token" value={token} />
          <button className={`${btn("secondary", "lg")} w-full`}>いいえ、使いません</button>
        </form>
      </div>

      <p className="mt-4 text-[12px] leading-6 text-[var(--muted)]">
        「はい」を選ぶと、続けてアカウントを作る画面に進みます。<br />
        <strong>「いいえ」を選ぶと、お預かりしている情報はその場で削除します。</strong>
        その後ご連絡することもありません。
      </p>
    </Shell>
  );
}
