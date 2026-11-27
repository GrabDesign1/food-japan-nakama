/**
 * 【チャンネルの中身】2026-11-27。
 *
 * ⚠️⚠️ **読めるかどうかは必ずここで確かめる。** 招待制は参加者だけ（それ以外は 404 にして、
 *    存在そのものを隠す。「ある／ない」が分かるだけでも情報になる）。
 * ⚠️⚠️ **読める ≠ 書ける。** 会員のみ／公開のチャンネルは誰でも読めるが、書くには参加が要る。
 * ⚠️ 開いた時点で、自分あての呼びかけ（＠）は読んだことにする。
 */
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { canRead, canPost, listPosts, VISIBILITY_LABEL, type Visibility } from "@/lib/channels";
import { btn, eyebrowCls, h1Cls } from "@/lib/ui";
import { PostExtras } from "../_components/PostExtras";
import { joinChannel, leaveChannel, postToChannel, markMentionsRead } from "../actions";

function timeStr(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
}

export default async function ChannelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);

  const ch = await prisma.channel.findUnique({
    where: { id },
    select: {
      id: true,
      tenantId: true,
      name: true,
      description: true,
      visibility: true,
      archivedAt: true,
      _count: { select: { members: true } },
      members: { where: { memberId: me.id }, select: { role: true } },
    },
  });
  // ⚠️ 他のテナントのチャンネルは、存在しないものとして扱う
  if (!ch || ch.tenantId !== su.app.tenantId || ch.archivedAt) notFound();

  const visibility = ch.visibility as Visibility;
  const joined = ch.members.length > 0;
  if (!canRead(visibility, joined)) notFound();

  // ⚠️ 開いたら、このチャンネルの呼びかけは読んだことにする（バッジを残さない）
  await markMentionsRead(ch.id);
  const posts = await listPosts(ch.id, me.id);
  const writable = canPost(joined);

  return (
    <div className="mx-auto max-w-[880px] px-4 py-8">
      <Link href="/channels" className="text-[12px] text-[var(--green-d)] hover:underline">
        ← チャンネル一覧
      </Link>

      <header className="mt-2 flex flex-wrap items-start gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className={eyebrowCls}>CHANNEL</div>
          <h1 className={`${h1Cls} mt-1 flex flex-wrap items-center gap-2`}>
            {ch.name}
            <span className="rounded-full border border-[var(--line)] px-2.5 py-0.5 text-[12px] font-normal leading-[17px] text-[var(--muted)]">
              {VISIBILITY_LABEL[visibility]}
            </span>
          </h1>
          <p className="mt-1 text-[12px] leading-[17px] text-[var(--muted)]">
            参加 {ch._count.members}人{ch.description ? ` ・ ${ch.description}` : ""}
          </p>
        </div>
        <div className="shrink-0">
          {joined ? (
            <form action={leaveChannel.bind(null, ch.id)}>
              <button className={btn("secondary", "sm")}>抜ける</button>
            </form>
          ) : visibility === "INVITE" ? null : (
            <form action={joinChannel.bind(null, ch.id)}>
              <button className={btn("primary", "sm")}>参加する</button>
            </form>
          )}
        </div>
      </header>

      {/*
        ⚠️⚠️ **この一文を消さないこと。** チャンネルを商談の記録と取り違えると、
           価格や条件の話が、関係ない人まで読める場所に書かれてしまう。
      */}
      <div className="mt-4 flex items-start gap-2.5 rounded-[12px] bg-[var(--line-soft)] px-4 py-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-0.5 shrink-0">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5" />
          <path d="M12 8h.01" />
        </svg>
        <p className="text-[12px] leading-[17px] text-[var(--muted)]">
          <b className="text-[var(--ink)]">チャンネルは「場」です。商談の記録ではありません。</b>
          {visibility === "INVITE"
            ? "招かれた人だけが読めます。"
            : "ログインした会員なら誰でも読めます。"}
          価格や取引条件の具体的な話は、商談（1対1）へ移してください。
        </p>
      </div>

      {/* 発言 */}
      <div className="mt-6 flex flex-col gap-6">
        {posts.length === 0 ? (
          <p className="rounded-[12px] border border-dashed border-[var(--line)] px-5 py-8 text-center text-[14px] text-[var(--muted)]">
            まだ発言はありません。
            {writable ? "いちばん最初に書いてみてください。" : "参加すると書けます。"}
          </p>
        ) : (
          posts.map((p) => (
            <article key={p.id} className="flex gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--line)] bg-white text-[14px] font-bold text-[var(--green-d)]">
                {p.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  (p.name[0] ?? "?").toUpperCase()
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-[16px] font-bold leading-[26px] text-[var(--ink)]">
                    {p.name}
                  </span>
                  <span className="text-[12px] leading-[17px] text-[var(--muted)]">
                    {timeStr(p.createdAt)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-[16px] leading-[26px] text-[var(--ink)]">
                  {p.body}
                </p>
                <PostExtras
                  channelId={ch.id}
                  postId={p.id}
                  reactions={p.reactions}
                  replies={p.replies}
                  canPost={writable}
                />
              </div>
            </article>
          ))
        )}
      </div>

      {/* 書く */}
      {writable ? (
        <form
          action={postToChannel.bind(null, ch.id, null)}
          className="mt-8 flex items-end gap-2 rounded-[16px] border border-[var(--line)] bg-white p-3"
        >
          <label htmlFor="channel-body" className="sr-only">
            このチャンネルに書く
          </label>
          <textarea
            id="channel-body"
            name="body"
            rows={3}
            required
            placeholder="このチャンネルに書く（＠に続けてお名前を書くと、その方にだけ知らせが届きます）"
            className="min-w-0 flex-1 resize-y rounded-md border border-[var(--line)] bg-white px-3 py-2 text-[16px] leading-[26px] text-[var(--ink)] outline-none focus:border-[var(--green)]"
          />
          <button type="submit" className={btn("primary", "md")}>
            書く
          </button>
        </form>
      ) : (
        <div className="mt-8 rounded-[16px] border border-[var(--line)] bg-white px-5 py-4 text-[14px] leading-[21px] text-[var(--muted)]">
          読むだけなら参加は要りません。書くときは「参加する」を押してください。
        </div>
      )}
    </div>
  );
}
