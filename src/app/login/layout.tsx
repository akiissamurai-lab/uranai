import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * ログイン済みなら /app にリダイレクト。
 * 未ログイン or Supabase未設定ならログインページを表示。
 */
export default async function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect("/app");
    }
  } catch {
    // Supabase未設定時は素通し（ログインページを表示）
  }

  return <>{children}</>;
}
