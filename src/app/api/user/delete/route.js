import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST() {
  // ── ユーザー認証 ─────────────────────────────────────────────
  let supabase;
  try {
    supabase = await createClient();
  } catch (e) {
    console.error("Supabase client creation failed:", e.message);
    return Response.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: "認証が必要です。ログインしてください。" }, { status: 401 });
  }

  // ── データ削除 ───────────────────────────────────────────────
  // 全テーブルから手動削除（CASCADE のバックアップ）
  const tables = ["training_logs", "body_metrics", "meal_logs", "meal_plans", "routine_meals", "profiles"];
  for (const table of tables) {
    const col = table === "profiles" ? "id" : "user_id";
    const { error } = await supabase.from(table).delete().eq(col, user.id);
    if (error) {
      console.error(`Failed to delete from ${table}:`, error.message);
    }
  }

  // ── Auth ユーザー削除（service_role が必要）────────────────────
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (serviceRoleKey && supabaseUrl) {
    try {
      const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
      if (deleteError) {
        console.error("Auth user delete failed:", deleteError.message);
        // データは既に削除されているのでエラーでも続行
      }
    } catch (e) {
      console.error("Admin client error:", e.message);
    }
  } else {
    console.warn("SUPABASE_SERVICE_ROLE_KEY not set — auth user record not deleted (data already removed)");
  }

  return Response.json({ success: true });
}
