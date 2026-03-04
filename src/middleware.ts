import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/privacy",
  "/terms",
  "/daily",
  "/apple-icon",
]);

const PUBLIC_PREFIXES = ["/auth/", "/api/stripe/webhook", "/api/daily", "/api/event"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // ── env 未設定: サーバー構成ミス ──
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    if (isApi) {
      return NextResponse.json(
        { error: "internal_server_error" },
        { status: 500 },
      );
    }
    // ページはログインへ（バナーで設定未完了を表示）
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const res = NextResponse.next();

  try {
    const supabase = await createSupabaseMiddlewareClient(req, res);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // ── 未認証 ──
    if (!user) {
      if (isApi) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", req.url));
    }
  } catch {
    // ── Supabase接続障害: サーバーエラー ──
    if (isApi) {
      return NextResponse.json(
        { error: "internal_server_error" },
        { status: 500 },
      );
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico|jpg|jpeg|gif|webp)$).*)",
  ],
};
