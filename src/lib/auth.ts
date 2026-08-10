// ログインユーザーの取得と、初回ログイン時のアプリ側ユーザー自動作成（プロビジョニング）。
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { User as AppUser, UserRole } from "@/generated/prisma/client";

const DEFAULT_TENANT_SLUG = "food-japan-summit";

export type SessionUser = {
  authId: string;
  email: string;
  app: AppUser;
};

/**
 * 現在ログイン中のユーザーを返す。未ログインなら null。
 * アプリ側の users 行が無ければ、既定テナントに MEMBER として自動作成する。
 * cache() で同一リクエスト内（layout＋page など）の重複呼び出しを1回にまとめる
 * （Supabase Auth へのHTTP照会とDB照会が毎ページ2回→1回になる）。
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const email = user.email ?? "";

  // 既存を探す
  let app = await prisma.user.findUnique({ where: { authId: user.id } });

  if (!app) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: DEFAULT_TENANT_SLUG },
    });
    if (!tenant) {
      throw new Error(
        `既定テナント(${DEFAULT_TENANT_SLUG})が見つかりません。seed を実行してください。`
      );
    }
    const displayName = email.split("@")[0] || "ユーザー";
    // 登録フォームの「案内メール同意」を user_metadata から引き継ぐ（特電法の同意記録）
    const meta = user.user_metadata as { marketing_opt_in?: boolean; marketing_opt_in_at?: string } | undefined;
    const marketingOptInAt =
      meta?.marketing_opt_in && meta.marketing_opt_in_at ? new Date(meta.marketing_opt_in_at) : null;
    try {
      app = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          authId: user.id,
          email,
          name: displayName,
          role: "MEMBER",
          status: "ACTIVE",
          marketingOptInAt,
        },
      });
    } catch (e) {
      // layout と page が同時に初回作成を試みると一意制約で衝突しうる。
      // その場合は作成済みの行を読み直す。
      if (
        typeof e === "object" &&
        e !== null &&
        "code" in e &&
        (e as { code?: string }).code === "P2002"
      ) {
        app = await prisma.user.findUnique({ where: { authId: user.id } });
        if (!app) throw e;
      } else {
        throw e;
      }
    }
  }

  // 利用停止（SUSPENDED）ユーザーはアプリを利用させない（規約18条）
  if (app.status === "SUSPENDED") {
    redirect("/suspended");
  }

  return { authId: user.id, email, app };
});

// 事務局（管理者）系ロールか
export function isAdminRole(role: UserRole): boolean {
  return role === "TENANT_ADMIN" || role === "ADMIN" || role === "REVIEWER";
}

// 上位管理者（REVIEWERを含まない）。削除・課金操作・権限管理はこちらを要求する
export function isSuperAdminRole(role: UserRole): boolean {
  return role === "TENANT_ADMIN" || role === "ADMIN";
}

// 事務局ページを開ける最低権限を満たすか（満たさなければ例外）
export async function requireAdmin(): Promise<SessionUser> {
  const su = await getSessionUser();
  if (!su || !isAdminRole(su.app.role)) {
    throw new Error("FORBIDDEN");
  }
  return su;
}

// 破壊的操作・課金操作・権限管理用（REVIEWER不可）
export async function requireSuperAdmin(): Promise<SessionUser> {
  const su = await getSessionUser();
  if (!su || !isSuperAdminRole(su.app.role)) {
    throw new Error("FORBIDDEN");
  }
  return su;
}
