"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, UtensilsCrossed, BarChart3, Bot, Settings } from "lucide-react";

// ─── Lucide アイコン（統一 strokeWidth=1.5）───
const icons = {
  home: (color) => <Home size={22} strokeWidth={1.5} color={color} />,
  utensils: (color) => <UtensilsCrossed size={22} strokeWidth={1.5} color={color} />,
  chart: (color) => <BarChart3 size={22} strokeWidth={1.5} color={color} />,
  bot: (color) => <Bot size={22} strokeWidth={1.5} color={color} />,
  settings: (color) => <Settings size={22} strokeWidth={1.5} color={color} />,
};

const tabs = [
  { href: "/",         label: "ホーム",   icon: "home" },
  { href: "/record",   label: "食事",     icon: "utensils" },
  { href: "/progress", label: "体重",     icon: "chart" },
  { href: "/coach",    label: "コーチ",   icon: "bot" },
  { href: "/settings", label: "設定",     icon: "settings" },
];

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname?.startsWith("/auth")) return null;

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9990,
        background: "rgba(10,10,15,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 -4px 30px rgba(0,0,0,0.3)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          maxWidth: 480,
          margin: "0 auto",
          padding: "6px 0 4px",
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.href === "/"
            ? pathname === "/"
            : pathname?.startsWith(tab.href);
          const color = isActive ? "#4ade80" : "rgba(255,255,255,0.3)";

          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                padding: "4px 12px",
                textDecoration: "none",
                borderRadius: 12,
                transition: "all 0.2s ease",
                position: "relative",
              }}
            >
              {isActive && (
                <div
                  style={{
                    position: "absolute",
                    top: -6,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 20,
                    height: 3,
                    borderRadius: 2,
                    background: "#4ade80",
                    boxShadow: "0 0 8px rgba(74,222,128,0.4)",
                  }}
                />
              )}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
              }}>
                {icons[tab.icon](color)}
              </div>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: isActive ? 700 : 500,
                  color,
                  letterSpacing: 0.3,
                  lineHeight: 1,
                }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
