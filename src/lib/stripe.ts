import Stripe from "stripe";

let _stripe: Stripe | null = null;

/** Stripe クライアントを遅延初期化で取得 */
function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      typescript: true,
    });
  }
  return _stripe;
}

/** 後方互換: 既存コードが `stripe` を参照している場合のプロキシ */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

/** billing 有効かつ Stripe キー設定済みを保証。API route の先頭で呼ぶ */
export function requireStripe(): Stripe {
  if (process.env.NEXT_PUBLIC_BILLING_ENABLED !== "true") {
    throw new Error("Billing is not enabled");
  }
  return getStripe();
}
