import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const PLAN_PRICES: Record<number, string> = {
  2: process.env.STRIPE_PRICE_2_MEMBERS!,
  5: process.env.STRIPE_PRICE_5_MEMBERS!,
  10: process.env.STRIPE_PRICE_10_MEMBERS!,
};

export { PLAN_DETAILS } from "@/lib/plans";
