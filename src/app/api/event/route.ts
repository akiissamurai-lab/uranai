import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const EVENT_TYPES = [
  "lp_cta_daily",
  "daily_cta_login",
  "login_success",
  "daily_draw",
  "app_fortune_complete",
] as const;

const bodySchema = z.object({
  event: z.enum(EVENT_TYPES),
});

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

/**
 * POST /api/event
 * ファネル計測用イベント記録。認証不要。
 * 同一 IP + イベントが5分以内に既存なら重複スキップ。
 * 常に 204 を返し、UX に影響しない。
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return new NextResponse(null, { status: 400 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const ipHash = hashIp(ip);
    const eventType = parsed.data.event;

    // 重複抑止: 同一IP+イベントが5分以内にある場合はスキップ
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recent = await prisma.event.findFirst({
      where: { ipHash, eventType, createdAt: { gte: fiveMinAgo } },
    });

    if (!recent) {
      await prisma.event.create({ data: { eventType, ipHash } });
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    // 失敗しても UX に影響しない
    return new NextResponse(null, { status: 204 });
  }
}
