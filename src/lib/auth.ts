import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { prisma } from "./prisma";
import { createSupabaseServerClient } from "./supabase/server";

export interface AuthUser {
  id: string; // Prisma User.id
  supabaseUid: string;
  email: string;
  name: string | null;
}

/**
 * API Route Handler 用: Supabase認証チェック + DBユーザー取得。
 * DBにユーザーが存在しない場合は null を返す（upsertしない）。
 * /api/fortune 等の通常APIで使用。軽量。
 */
export async function getAuthUser(
  req: NextRequest,
): Promise<AuthUser | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll() {},
    },
  });

  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  if (!supabaseUser?.email) return null;

  const user = await prisma.user.findUnique({
    where: { supabaseUid: supabaseUser.id },
  });

  if (!user) return null;

  return {
    id: user.id,
    supabaseUid: user.supabaseUid,
    email: user.email,
    name: user.name,
  };
}

/**
 * /api/me 専用: Supabase認証チェック + User/CreditWallet を upsert。
 * 初回ログイン時にDBレコードを作成する唯一のエントリポイント。
 * upsert なので冪等（何回呼んでも安全）。
 */
export async function getOrCreateAuthUser(
  req: NextRequest,
): Promise<AuthUser | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll() {},
    },
  });

  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  if (!supabaseUser?.email) return null;

  // User upsert（初回はINSERT、以降はemailのみ更新）
  const user = await prisma.user.upsert({
    where: { supabaseUid: supabaseUser.id },
    update: { email: supabaseUser.email },
    create: {
      supabaseUid: supabaseUser.id,
      email: supabaseUser.email,
      name:
        supabaseUser.user_metadata?.full_name ??
        supabaseUser.user_metadata?.name ??
        null,
    },
  });

  // CreditWallet upsert（存在しなければ作成、存在すれば何もしない）
  await prisma.creditWallet.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, credits: 0 },
  });

  return {
    id: user.id,
    supabaseUid: user.supabaseUid,
    email: user.email,
    name: user.name,
  };
}

/**
 * Server Component 用: cookies() からSupabaseユーザーを取得 + DBから読み取り。
 * upsert はしない（/api/me で済んでいる前提）。
 */
export async function getAuthUserFromCookies(): Promise<AuthUser | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();

    if (!supabaseUser?.email) return null;

    const user = await prisma.user.findUnique({
      where: { supabaseUid: supabaseUser.id },
    });

    if (!user) return null;

    return {
      id: user.id,
      supabaseUid: user.supabaseUid,
      email: user.email,
      name: user.name,
    };
  } catch {
    return null;
  }
}
