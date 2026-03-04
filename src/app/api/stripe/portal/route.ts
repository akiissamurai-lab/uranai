import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { requireStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const stripe = requireStripe();

    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });
    if (!subscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: "no_subscription" },
        { status: 404 },
      );
    }

    // リクエストの Host ヘッダーから URL を構築（環境に依存しない）
    const host = req.headers.get("host") || "uranai-ten.vercel.app";
    const protocol = host.includes("localhost") ? "http" : "https";
    const appUrl = `${protocol}://${host}`;

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${appUrl}/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    if (message === "Billing is not enabled") {
      return NextResponse.json({ error: "billing_disabled" }, { status: 403 });
    }
    console.error("[stripe/portal]", message);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 },
    );
  }
}
