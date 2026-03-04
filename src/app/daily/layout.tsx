import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "今日の余白便り｜星座を選ぶだけ、ログイン不要｜Aira",
  description:
    "星座を選ぶだけで、今日のあなたに小さな手紙が届きます。ログイン不要、1日1通。寝る前に読む、やさしい余白便り。",
  alternates: { canonical: "/daily" },
  openGraph: {
    title: "今日の余白便り｜星座を選ぶだけ、ログイン不要｜Aira",
    description:
      "星座を選ぶだけで、今日のあなたに小さな手紙が届きます。ログイン不要、1日1通。",
    url: "/daily",
  },
};

export default function DailyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
