"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import { prisma } from "@/lib/db";
import {
  follow, removeConnection, requestConnection, respondConnection, unfollow,
} from "@/lib/connections";

export async function toggleFavoriteMember(targetMemberId: string): Promise<void> {
  const su = await getSessionUser();
  if (!su) return;
  const me = await getOrCreateMemberForUser(su);
  if (me.id === targetMemberId) return; // 自分はお気に入りにできない

  // 対象が同一テナントの承認済み会員であることを確認
  const target = await prisma.member.findFirst({
    where: { id: targetMemberId, tenantId: su.app.tenantId, status: "APPROVED", listed: true },
    select: { id: true },
  });
  if (!target) return;

  const existing = await prisma.favorite.findUnique({
    where: {
      memberId_targetType_targetId: {
        memberId: me.id,
        targetType: "member",
        targetId: targetMemberId,
      },
    },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
  } else {
    await prisma.favorite.create({
      data: { memberId: me.id, targetType: "member", targetId: targetMemberId },
    });
  }

  revalidatePath(`/producers/${targetMemberId}`);
  revalidatePath("/dashboard");
  revalidatePath("/favorites");
}

/**
 * 【仲間とフォロー】2026-11-27 ユーザー指示。
 *
 * ⚠️⚠️ **Server Action は誰でも叩ける。** 相手が「同じテナントの、承認済みで、一覧に出ている会員」
 *    であることを毎回サーバーで確かめる（⚠️ 画面にボタンを出さないだけでは足りない）。
 */
async function meAndTarget(targetMemberId: string) {
  const su = await getSessionUser();
  if (!su) return null;
  const me = await getOrCreateMemberForUser(su);
  if (me.id === targetMemberId) return null;
  const target = await prisma.member.findFirst({
    where: { id: targetMemberId, tenantId: su.app.tenantId, status: "APPROVED", listed: true },
    select: { id: true },
  });
  if (!target) return null;
  return { tenantId: su.app.tenantId, meId: me.id };
}

/** 画面を描き直す場所をまとめる（⚠️ ホームの流れはフォローで中身が変わる） */
function refresh(targetMemberId: string) {
  revalidatePath(`/producers/${targetMemberId}`);
  revalidatePath("/dashboard");
  revalidatePath("/connections");
}

export async function actRequestConnection(targetMemberId: string, fd?: FormData): Promise<void> {
  const ctx = await meAndTarget(targetMemberId);
  if (!ctx) return;
  const message = fd ? String(fd.get("message") ?? "") : "";
  await requestConnection(ctx.tenantId, ctx.meId, targetMemberId, message);
  refresh(targetMemberId);
}

/** 申請を取り消す／仲間をやめる */
export async function actRemoveConnection(targetMemberId: string): Promise<void> {
  const ctx = await meAndTarget(targetMemberId);
  if (!ctx) return;
  await removeConnection(ctx.meId, targetMemberId);
  refresh(targetMemberId);
}

/**
 * 届いた申請に返事をする。
 * ⚠️⚠️ 承認できるのは**自分あての申請だけ**（確かめているのは `respondConnection` の側）。
 */
export async function actRespondConnection(connectionId: string, accept: boolean): Promise<void> {
  const su = await getSessionUser();
  if (!su) return;
  const me = await getOrCreateMemberForUser(su);
  await respondConnection(me.id, connectionId, accept);
  revalidatePath("/connections");
  revalidatePath("/dashboard");
}

export async function actFollow(targetMemberId: string): Promise<void> {
  const ctx = await meAndTarget(targetMemberId);
  if (!ctx) return;
  await follow(ctx.tenantId, ctx.meId, targetMemberId);
  refresh(targetMemberId);
}

export async function actUnfollow(targetMemberId: string): Promise<void> {
  const ctx = await meAndTarget(targetMemberId);
  if (!ctx) return;
  await unfollow(ctx.meId, targetMemberId);
  refresh(targetMemberId);
}
