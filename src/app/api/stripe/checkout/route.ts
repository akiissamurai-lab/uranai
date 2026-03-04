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

    // 既に active subscription があれば拒否
    const existing = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });
    if (existing?.status === "active") {
      return NextResponse.json(
        { error: "already_subscribed" },
        { status: 409 },
      );
    }

    // Stripe Customer を取得 or 作成
    let stripeCustomerId = existing?.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { appUserId: user.id },
      });
      stripeCustomerId = customer.id;
    }

    // リクエストの Host ヘッダーから URL を構築（環境に依存しない）
    const host = req.headers.get("host") || "uranai-ten.vercel.app";
    const protocol = host.includes("localhost") ? "http" : "https";
    const appUrl = `${protocol}://${host}`;
    console.log("[stripe/checkout] appUrl:", appUrl);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        { price: process.env.STRIPE_PRICE_ID!, quantity: 1 },
      ],
      client_reference_id: user.id,
      metadata: { appUserId: user.id },
      success_url: `${appUrl}/billing?success=1`,
      cancel_url: `${appUrl}/billing?canceled=1`,
      // 利用規約への同意チェックボックスを表示
      consent_collection: {
        terms_of_service: "required",
      },
      custom_text: {
        terms_of_service_acceptance: {
          message: `[利用規約](${appUrl}/terms)・[プライバシーポリシー](${appUrl}/privacy)・[特定商取引法に基づく表記](${appUrl}/commercial) に同意のうえお申し込みください。月額¥${980}の自動更新です。`,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    if (message === "Billing is not enabled") {
      return NextResponse.json({ error: "billing_disabled" }, { status: 403 });
    }
    console.error("[stripe/checkout]", message);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 },
    );
  }
}
