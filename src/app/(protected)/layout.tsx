import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProtectedHeader } from "@/components/layout/ProtectedHeader";

/**
 * 認証必須レイアウト。
 * middlewareがガードするが、SSRでも二重チェック（安全策）。
 */
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <ProtectedHeader email={user.email ?? ""} />
      {children}
    </div>
  );
}
