"use server";

/**
 * 【チャンネルの操作】2026-11-27。
 * ⚠️⚠️ **"use server" なので、export できるのは async 関数だけ。**
 *    定数・型を足したくなったら `src/lib/channels.ts` 側に置くこと
 *    （⚠️ tsc は通り、ビルドで落ちる）。
 * ⚠️⚠️ **読める／書けるの判定は必ずサーバー側で。** クライアントから来たIDを信用しない。
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import { trimTo, MESSAGE_MAX } from "@/lib/security";
import { isReaction } from "@/lib/reactions";
import { canRead, findMentionedMemberIds, type Visibility } from "@/lib/channels";
import { allowedEmailsForMember } from "@/lib/notify-settings";
import { notifyChannelMention } from "@/lib/email";

const NAME_MAX = 40;
const DESC_MAX = 200;

/** 自分がそのチャンネルを読めるか／書けるかを確かめる。 */
async function loadAccess(channelId: string, memberId: string) {
  const ch = await prisma.channel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      tenantId: true,
      visibility: true,
      archivedAt: true,
      members: { where: { memberId }, select: { id: true, role: true } },
    },
  });
  if (!ch) throw new Error("チャンネルが見つかりません");
  const joined = ch.members.length > 0;
  if (!canRead(ch.visibility as Visibility, joined)) throw new Error("このチャンネルは読めません");
  return { ch, joined };
}

/** チャンネルを作る。⚠️ 作った人は自動で参加（OWNER）。 */
export async function createChannel(formData: FormData): Promise<void> {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);

  const name = trimTo(String(formData.get("name") ?? ""), NAME_MAX);
  const description = trimTo(String(formData.get("description") ?? ""), DESC_MAX);
  const raw = String(formData.get("visibility") ?? "MEMBERS");
  // ⚠️⚠️ 公開範囲は受け取った文字列をそのまま入れない。許す値だけに絞る。
  //    ⚠️ PUBLIC をここで弾いているのは、ログイン無しで読む公開ページをまだ作っていないため。
  const visibility: Visibility = raw === "INVITE" ? "INVITE" : "MEMBERS";
  if (!name) return;

  const created = await prisma.channel.create({
    data: {
      tenantId: su.app.tenantId,
      name,
      description: description || null,
      visibility,
      createdBy: me.id,
      members: { create: { memberId: me.id, role: "OWNER" } },
    },
    select: { id: true },
  });
  revalidatePath("/channels");
  redirect(`/channels/${created.id}`);
}

/** 参加する。⚠️ 招待制には、この入口からは入れない。 */
export async function joinChannel(channelId: string): Promise<void> {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);
  const ch = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { visibility: true, archivedAt: true },
  });
  if (!ch || ch.archivedAt) throw new Error("チャンネルが見つかりません");
  if (ch.visibility === "INVITE") throw new Error("招待制のチャンネルです");

  await prisma.channelMember.upsert({
    where: { channelId_memberId: { channelId, memberId: me.id } },
    create: { channelId, memberId: me.id },
    update: {},
  });
  revalidatePath(`/channels/${channelId}`);
  revalidatePath("/channels");
}

/** 抜ける。⚠️ 発言は消さない（場の記録が虫食いになる）。 */
export async function leaveChannel(channelId: string): Promise<void> {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);
  await prisma.channelMember.deleteMany({ where: { channelId, memberId: me.id } });
  revalidatePath(`/channels/${channelId}`);
  revalidatePath("/channels");
}

/**
 * チャンネルに書く（本文、またはスレッドへの返信）。
 * ⚠️⚠️ 入れ子は1段だけ（返信への返信も同じ親にぶら下げる）。
 * ⚠️ ＠で名指しされた人にだけ記録を残す。普通の新着では何も残さない。
 */
export async function postToChannel(
  channelId: string,
  parentPostId: string | null,
  formData: FormData,
): Promise<void> {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);
  const { joined } = await loadAccess(channelId, me.id);
  if (!joined) throw new Error("参加してから書いてください");

  const body = trimTo(String(formData.get("body") ?? ""), MESSAGE_MAX);
  if (!body) return;

  // 1段に畳む
  let rootId: string | null = null;
  if (parentPostId) {
    const parent = await prisma.channelPost.findUnique({
      where: { id: parentPostId },
      select: { id: true, channelId: true, parentPostId: true },
    });
    if (!parent || parent.channelId !== channelId) throw new Error("返信先が見つかりません");
    rootId = parent.parentPostId ?? parent.id;
  }

  const mentioned = await findMentionedMemberIds(channelId, body, me.id);
  await prisma.channelPost.create({
    data: {
      channelId,
      memberId: me.id,
      body,
      parentPostId: rootId,
      mentions: mentioned.length
        ? { create: mentioned.map((memberId) => ({ memberId })) }
        : undefined,
    },
  });
  // ＠で呼ばれた人にだけメールを送る（2026-11-28 ユーザー指示）。
  // ⚠️⚠️ **鳴らすのはここだけ。** チャンネルのふつうの発言では送らない
  //    （2026-11-27「ウザくない」＝鳴らす／数える／黙る の3段階）。
  // ⚠️ 「通知の設定」で止めている人には送らない。失敗しても投稿は成立させる。
  if (mentioned.length > 0) {
    try {
      const [channel, meRow] = await Promise.all([
        prisma.channel.findUnique({ where: { id: channelId }, select: { name: true } }),
        prisma.member.findUnique({ where: { id: me.id }, select: { name: true, contactName: true } }),
      ]);
      const lists = await Promise.all(
        mentioned.map((id) => allowedEmailsForMember(id, "mention")),
      );
      await notifyChannelMention({
        to: Array.from(new Set(lists.flat())),
        fromMemberName: meRow?.contactName || meRow?.name || "NAKAMAの会員",
        channelName: channel?.name ?? "チャンネル",
        channelId,
        preview: body,
      });
    } catch (e) {
      console.error("[channels] ＠の通知に失敗:", e);
    }
  }

  revalidatePath(`/channels/${channelId}`);
}

/** チャンネルの発言に絵文字で反応する（もう一度押すと外れる）。⚠️ 通知しない。 */
export async function toggleChannelReaction(postId: string, emoji: string): Promise<void> {
  const su = await getSessionUser();
  if (!su) redirect("/login");
  const me = await getOrCreateMemberForUser(su);
  if (!isReaction(emoji)) return;

  const post = await prisma.channelPost.findUnique({
    where: { id: postId },
    select: { id: true, channelId: true },
  });
  if (!post) throw new Error("発言が見つかりません");
  const { joined } = await loadAccess(post.channelId, me.id);
  if (!joined) throw new Error("参加してから反応してください");

  const existing = await prisma.channelPostReaction.findUnique({
    where: { postId_memberId_emoji: { postId, memberId: me.id, emoji } },
    select: { id: true },
  });
  if (existing) {
    await prisma.channelPostReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.channelPostReaction.create({ data: { postId, memberId: me.id, emoji } });
  }
  revalidatePath(`/channels/${post.channelId}`);
}

/** 呼びかけ（＠）を読んだことにする。⚠️ チャンネルを開いた時点でまとめて消す。 */
export async function markMentionsRead(channelId: string): Promise<void> {
  const su = await getSessionUser();
  if (!su) return;
  const me = await getOrCreateMemberForUser(su);
  await prisma.channelPostMention.updateMany({
    where: { memberId: me.id, readAt: null, post: { channelId } },
    data: { readAt: new Date() },
  });
}
