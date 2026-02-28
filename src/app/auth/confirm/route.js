import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // エラー時はトップにリダイレクト（エラーパラメータ付き）
  return NextResponse.redirect(
    new URL(`/?auth_error=true`, request.url)
  );
}
