"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useState } from "react";
import { isBillingEnabled } from "@/lib/billing";

export function ProtectedHeader({ email }: { email: string }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="border-b border-amber-800/20 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
        <Link
          href="/app"
          className="text-sm font-bold text-amber-200 hover:text-amber-100"
        >
          Aira
        </Link>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-xs text-amber-200/60 hover:text-amber-200/80 px-2 py-1"
          >
            {email.length > 20 ? email.slice(0, 20) + "…" : email}
          </button>

          {menuOpen && (
            <>
              {/* Overlay to close menu */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-40 bg-gray-900 border border-amber-800/30 rounded-lg shadow-xl z-50 py-1">
                <Link
                  href="/history"
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 text-xs text-amber-200/80 hover:bg-amber-900/20"
                >
                  鑑定履歴
                </Link>
                {isBillingEnabled() && (
                  <Link
                    href="/billing"
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 text-xs text-amber-200/80 hover:bg-amber-900/20"
                  >
                    プラン・課金
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 text-xs text-red-400/80 hover:bg-red-900/20"
                >
                  ログアウト
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
