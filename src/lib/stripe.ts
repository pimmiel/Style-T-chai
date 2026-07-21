import Stripe from "stripe";

let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

export const stripe = new Proxy({} as Stripe, {
  get(_t, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const PLAN_PRICES: Record<number, string> = {
  2: process.env.STRIPE_PRICE_2_MEMBERS!,
  5: process.env.STRIPE_PRICE_5_MEMBERS!,
  10: process.env.STRIPE_PRICE_10_MEMBERS!,
};

export { PLAN_DETAILS } from "@/lib/plans";
