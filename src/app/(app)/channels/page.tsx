/**
 * 【チャンネル一覧】2026-11-27 ユーザー指示「Slack相当の5機能」「しっかり使える場所に出して」。
 *
 * ⚠️⚠️ **ここは無料で人が集まる入口。** 設計の順番は
 *    チャンネル（集まる）→ グループ（動かす）→ 商談（決める・ここが有料）。
 * ⚠️ 招待制のチャンネルは、参加していない人には**存在ごと出さない**（listChannels で絞っている）。
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import {
  listChannels,
  SELECTABLE_VISIBILITY,
  VISIBILITY_LABEL,
  VISIBILITY_NOTE,
} from "@/lib/channels";
import { EmptyState } from "@/components/EmptyState";
import { btn, eyebrowCls, h1Cls, h2Cls, input } from "@/lib/ui";
import { createChannel } from "./actions";

export const metadata: Metadata = {
  title: "チャンネル",
  robots: { index: false, follow: false },
};

export default async function ChannelsPage() {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);
  const rows = await listChannels(su.app.tenantId, me.id);

  const joined = rows.filter((c) => c.joined);
  const open = rows.filter((c) => !c.joined);

  return (
    <div className="mx-auto max-w-[880px] px-4 py-8">
      <div className={eyebrowCls}>CHANNELS</div>
      <h1 className={`${h1Cls} mt-1`}>チャンネル</h1>
      <p className="mt-2 max-w-[62ch] text-[14px] leading-[21px] text-[var(--muted)]">
        話題ごとの部屋です。商談の前に、人と出会う場所として使います。
        <b className="text-[var(--ink)]">ここは記録ではありません。</b>
        価格や取引条件の具体的な話は、商談（1対1）へ移してください。
      </p>

      {/* 参加中 */}
      <section className="mt-7">
        <h2 className={h2Cls}>参加しているチャンネル</h2>
        {joined.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="まだどこにも参加していません"
              description="下の「入れるチャンネル」から参加するか、自分で作れます。"
            />
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {joined.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/channels/${c.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[16px] border border-[var(--line)] bg-white px-5 py-4 transition hover:border-[var(--ink-2)]"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--line-soft)] text-[16px] font-bold text-[var(--muted)]">
                    #
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[16px] font-bold leading-[26px] text-[var(--ink)]">
                        {c.name}
                      </span>
                      <span className="rounded-full border border-[var(--line)] px-2.5 py-0.5 text-[12px] leading-[17px] text-[var(--muted)]">
                        {VISIBILITY_LABEL[c.visibility]}
                      </span>
                      {/* ⚠️ 鳴らすのは＠だけ。普通の新着はここに数字を出さない */}
                      {c.unreadMentions > 0 ? (
                        <span className="rounded-full bg-[var(--gold)] px-2 py-0.5 text-[12px] font-bold leading-[17px] text-white">
                          ＠あなた宛 {c.unreadMentions}件
                        </span>
                      ) : null}
                    </span>
                    {c.description ? (
                      <span className="block truncate text-[12px] leading-[17px] text-[var(--muted)]">
                        {c.description}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-[12px] leading-[17px] text-[var(--muted)]">
                    {c.memberCount}人 ・ {c.postCount}件
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 入れるチャンネル */}
      {open.length > 0 ? (
        <section className="mt-8">
          <h2 className={h2Cls}>入れるチャンネル</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {open.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/channels/${c.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[16px] border border-[var(--line)] bg-white px-5 py-4 transition hover:border-[var(--ink-2)]"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--line-soft)] text-[16px] font-bold text-[var(--muted)]">
                    #
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[16px] font-bold leading-[26px] text-[var(--ink)]">
                        {c.name}
                      </span>
                      <span className="rounded-full border border-[var(--line)] px-2.5 py-0.5 text-[12px] leading-[17px] text-[var(--muted)]">
                        {VISIBILITY_LABEL[c.visibility]}
                      </span>
                    </span>
                    {c.description ? (
                      <span className="block truncate text-[12px] leading-[17px] text-[var(--muted)]">
                        {c.description}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-[12px] leading-[17px] text-[var(--muted)]">
                    {c.memberCount}人 ・ {c.postCount}件
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 作る */}
      <section className="mt-8">
        <details className="overflow-hidden rounded-[16px] border border-[var(--line)] bg-white">
          <summary className="cursor-pointer list-none px-5 py-4 text-[16px] font-bold leading-[26px] text-[var(--ink)]">
            ＋ チャンネルを作る
          </summary>
          <form action={createChannel} className="flex flex-col gap-4 border-t border-[var(--line)] px-5 py-5">
            <div>
              <label htmlFor="ch-name" className="text-[12px] leading-[17px] text-[var(--muted)]">
                チャンネルの名前
              </label>
              <input
                id="ch-name"
                name="name"
                required
                maxLength={40}
                placeholder="例：規格外の野菜を引き取る"
                className={`${input()} mt-1 w-full`}
              />
            </div>
            <div>
              <label htmlFor="ch-desc" className="text-[12px] leading-[17px] text-[var(--muted)]">
                ひとこと説明（任意）
              </label>
              <input
                id="ch-desc"
                name="description"
                maxLength={200}
                placeholder="何を話す場所かを1行で"
                className={`${input()} mt-1 w-full`}
              />
            </div>

            <fieldset className="border-0 p-0">
              <legend className="text-[12px] leading-[17px] text-[var(--muted)]">
                誰が読めるか
              </legend>
              {/*
                ⚠️⚠️ **狭いほうから並べる。** 押し間違いで広く公開しないため。
                ⚠️⚠️ あとから広げられない＝過去の発言まで新しい人に見える、ということ。
              */}
              <div className="mt-1.5 flex flex-col gap-1">
                {SELECTABLE_VISIBILITY.map((v, i) => (
                  <label
                    key={v}
                    className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-[var(--line)] px-4 py-3 has-[:checked]:border-[var(--green)] has-[:checked]:bg-[var(--green-soft)]"
                  >
                    <input
                      type="radio"
                      name="visibility"
                      value={v}
                      defaultChecked={i === 0}
                      className="mt-1 h-[18px] w-[18px] accent-[var(--green)]"
                    />
                    <span className="min-w-0">
                      <span className="block text-[16px] font-bold leading-[26px] text-[var(--ink)]">
                        {VISIBILITY_LABEL[v]}
                      </span>
                      <span className="block text-[12px] leading-[17px] text-[var(--muted)]">
                        {VISIBILITY_NOTE[v]}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-[12px] leading-[17px] text-[var(--muted)]">
                ⚠️ 公開範囲は、あとから広げられません。狭いほうから選んでください。
                「公開（ログインしていない人にも見せる）」は準備中です。
              </p>
            </fieldset>

            <div>
              <button type="submit" className={btn("primary", "md")}>
                作る
              </button>
            </div>
          </form>
        </details>
      </section>
    </div>
  );
}
