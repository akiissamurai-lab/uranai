import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { grantMonthlyCredits } from "@/lib/credits";
import { CONFIG } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error("[stripe/webhook] signature verification failed:", message);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  // 冪等化: 既に処理済みなら即 200
  try {
    await prisma.stripeEvent.create({ data: { id: event.id } });
  } catch {
    // unique constraint violation = 既に処理済み
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      default:
        // 未知イベントは無視
        break;
    }
  } catch (err) {
    console.error(`[stripe/webhook] ${event.type} handler error:`, err);
    // Stripe にリトライさせないため 200 を返す（ログで追跡）
  }

  return NextResponse.json({ received: true });
}

// ── checkout.session.completed ──
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id ?? session.metadata?.appUserId;
  if (!userId) {
    console.error("[webhook] checkout.session.completed: no userId found");
    return;
  }

  const subId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

  if (!subId || !customerId) return;

  // 利用規約同意ログ
  const tosAccepted = session.consent?.terms_of_service === "accepted";
  console.log(
    `[webhook] checkout.session.completed: userId=${userId}, tosAccepted=${tosAccepted}`,
  );

  // Stripe から subscription 詳細を取得
  const sub = await stripe.subscriptions.retrieve(subId);

  await prisma.subscription.upsert({
    where: { userId },
    update: {
      status: sub.status,
      stripeCustomerId: customerId,
      stripeSubId: subId,
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
    },
    create: {
      userId,
      status: sub.status,
      stripeCustomerId: customerId,
      stripeSubId: subId,
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
    },
  });

  // 初回クレジット付与
  const monthKey = new Date().toISOString().slice(0, 7); // "2026-03"
  await grantMonthlyCredits(userId, monthKey, CONFIG.MONTHLY_CREDITS);
}

// ── customer.subscription.updated ──
async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const existing = await prisma.subscription.findUnique({
    where: { stripeSubId: sub.id },
  });
  if (!existing) return;

  await prisma.subscription.update({
    where: { stripeSubId: sub.id },
    data: {
      status: sub.status,
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
    },
  });
}

// ── customer.subscription.deleted ──
async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const existing = await prisma.subscription.findUnique({
    where: { stripeSubId: sub.id },
  });
  if (!existing) return;

  await prisma.subscription.update({
    where: { stripeSubId: sub.id },
    data: { status: "canceled" },
  });
}

// ── invoice.paid ──
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;

  if (!subId) return;

  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubId: subId },
  });
  if (!subscription) return;

  const monthKey = new Date().toISOString().slice(0, 7);
  await grantMonthlyCredits(
    subscription.userId,
    monthKey,
    CONFIG.MONTHLY_CREDITS,
  );
}
