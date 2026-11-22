"use server";

// 集まりたい（2026-11-23）。
// ⚠️ 立てられる／手を挙げられるかの判定は gatherings.ts（サーバー）で行う。
// ⚠️ 手を挙げたら接触として数える（card-relationship）。下ろしても減らさない。
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateMemberForUser } from "@/lib/member";
import {
  createGathering, setJoin, setGatheringStatus, deleteGathering,
} from "@/lib/gatherings";
import { JOIN_KINDS } from "@/lib/gathering-core";
import { recordContact } from "@/lib/relationship";
import { notifyOnGatheringJoin } from "@/lib/feed-notify";

export type GatheringState = { ok?: boolean; error?: string };

export async function submitGathering(
  _prev: GatheringState,
  fd: FormData
): Promise<GatheringState> {
  const su = await getSessionUser();
  if (!su) return { error: "ログインしてからお試しください。" };
  const me = await getOrCreateMemberForUser(su);

  // いたずらよけ（人には見えない欄）
  if (String(fd.get("_gotcha") ?? "")) return { ok: true };

  const result = await createGathering(
    { id: me.id, tenantId: me.tenantId },
    {
      title: String(fd.get("title") ?? ""),
      body: String(fd.get("body") ?? ""),
      startAt: String(fd.get("startAt") ?? ""),
      timeNote: String(fd.get("timeNote") ?? ""),
      prefecture: String(fd.get("prefecture") ?? ""),
      place: String(fd.get("place") ?? ""),
      capacity: String(fd.get("capacity") ?? ""),
    }
  );
  if (!result.ok) return { error: result.error };

  revalidatePath("/gatherings");
  return { ok: true };
}

export async function join(fd: FormData): Promise<void> {
  const su = await getSessionUser();
  if (!su) return;
  const me = await getOrCreateMemberForUser(su);
  const gatheringId = String(fd.get("gatheringId") ?? "");
  const raw = String(fd.get("kind") ?? "");
  const kind = raw === "none" ? null : raw;
  const note = String(fd.get("note") ?? "");

  const result = await setJoin({ id: me.id, tenantId: me.tenantId }, gatheringId, kind, note);

  if (result.ok && result.joined) {
    // ⚠️ 下ろしたときは数えない（押し直しで強さが上下すると、記録でなくなる）
    if (result.hostMemberId !== me.id) {
      await recordContact({
        tenantId: me.tenantId,
        actorMemberId: me.id,
        otherMemberId: result.hostMemberId,
        kind: "gathering_join",
      });
    }
    // 初めて手を挙げたときだけ知らせる（going⇄interested の往復で洪水にしない）
    if (result.firstTime) {
      const label = JOIN_KINDS.find(([k]) => k === result.joined)?.[1] ?? "参加";
      after(() =>
        notifyOnGatheringJoin({
          gatheringId,
          hostMemberId: result.hostMemberId,
          actorMemberId: me.id,
          kindLabel: label,
          note: note.trim() || null,
        })
      );
    }
  }
  revalidatePath("/gatherings");
  revalidatePath(`/gatherings/${gatheringId}`);
}

export async function changeStatus(fd: FormData): Promise<void> {
  const su = await getSessionUser();
  if (!su) return;
  const me = await getOrCreateMemberForUser(su);
  const id = String(fd.get("gatheringId") ?? "");
  await setGatheringStatus(me.id, id, String(fd.get("status") ?? ""));
  revalidatePath("/gatherings");
  revalidatePath(`/gatherings/${id}`);
}

export async function removeGathering(fd: FormData): Promise<void> {
  const su = await getSessionUser();
  if (!su) return;
  const me = await getOrCreateMemberForUser(su);
  await deleteGathering(me.id, String(fd.get("gatheringId") ?? ""));
  revalidatePath("/gatherings");
}
