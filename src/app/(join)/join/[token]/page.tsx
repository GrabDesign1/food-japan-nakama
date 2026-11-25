// 「サービスが出来ました、利用しますか？」（2026-11-23／文面は 2026-11-26 にユーザー指定で差し替え）。
//
// ⚠️⚠️ **この画面の役目は、本人に決めてもらうこと。** 誘導しない。
//    「はい」と「いいえ」を同じ大きさで並べる。「いいえ」を小さくしない。
// ⚠️⚠️ **「はい」以外を押されたら、お預かりした情報を全部消す**（2026-11-26 ユーザー指示）。
//    「いいえ」も「新規登録」も削除する。だから、どちらもフォーム（POST）にする。
// ⚠️⚠️ **本人の同意なく掲載しない**（2026-11-26 ユーザー指示）。
//    2026-11-25 に出した登壇者45名は、この指示を受けて非公開へ戻した。
//    したがってこの画面に「掲載しています」とは書かない（書けば嘘になる日が来る）。
// ⚠️ ログインしていない方が開く画面（middleware の PUBLIC_PATHS に /join を入れてある）。
import type { Metadata } from "next";
import { findByInviteToken } from "@/lib/member-invite";
import { answerYes, answerNo, answerFresh } from "./actions";
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-[72px] shrink-0 text-[var(--muted)]">{label}</dt>
      <dd className="text-[var(--ink)]">{value}</dd>
    </div>
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
        NAKAMA をお使いいただけます。
      </h1>

      <p className="mt-5 text-[15px] font-bold leading-7 text-[var(--ink)]">
        FOOD JAPAN SUMMIT の登録情報を使いますか？
      </p>
      <p className="mt-1 text-[13px] leading-6 text-[var(--ink-2)]">入力の手間が省けます。</p>

      {sp.e ? (
        <p className="mt-4 text-[13px] text-[var(--red)]">
          うまくいきませんでした。もう一度お試しください。
        </p>
      ) : null}

      {/* ⚠️ 2つを同じ大きさで並べる。「いいえ」を押しにくくしない */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <form action={answerYes} className="flex-1">
          <input type="hidden" name="token" value={token} />
          <button className={`${btn("primary", "lg")} w-full`}>はい</button>
        </form>
        <form action={answerNo} className="flex-1">
          <input type="hidden" name="token" value={token} />
          <button className={`${btn("secondary", "lg")} w-full`}>いいえ</button>
        </form>
      </div>

      {/* ⚠️ 新規登録も「はい以外」なので、押された時点でお預かりした情報を消す。
          消す操作なので、リンク（GET）ではなくフォーム（POST）にする */}
      <form action={answerFresh} className="mt-2">
        <input type="hidden" name="token" value={token} />
        <button className={`${btn("ghost", "md")} w-full`}>新規登録</button>
      </form>

      <p className="mt-6 text-[14px] leading-7 text-[var(--ink-2)]">
        FOOD JAPAN SUMMIT でお会いした方々が、そのあともつながっていられる場です。
        新規に名刺を交換すると、その方の取り組みが読めます。
      </p>

      {/* ⚠️ 何を持たれているかを、押す前に見せる（見出しは付けない＝ユーザー指示 2026-11-26） */}
      <div className="mt-5 rounded-[10px] border border-[var(--line)] bg-[var(--green-soft)] p-4">
        <dl className="flex flex-col gap-1.5 text-[13px]">
          <Row label="事業者名" value={view.name || "—"} />
          <Row label="お名前" value={view.contactName || "—"} />
          {view.contactRole ? <Row label="肩書" value={view.contactRole} /> : null}
          {view.prefecture ? <Row label="都道府県" value={view.prefecture} /> : null}
          <Row label="メール" value={view.maskedEmail} />
        </dl>
        <p className="mt-3 border-t border-[var(--green)] pt-2.5 text-[12px] leading-6 text-[var(--ink-2)]">
          <strong>「いいえ」を選ばれた場合、お預かりした情報も削除します。</strong>
          <br />
          電話番号はお預かりしていません。
        </p>
      </div>
    </Shell>
  );
}
