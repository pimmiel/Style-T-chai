import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = supabaseAdmin();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const planType = parseInt(session.metadata?.plan_type ?? "2");
    const subscriptionId = session.subscription as string;

    if (!userId) return NextResponse.json({ ok: true });

    const sub = await stripe.subscriptions.retrieve(subscriptionId);

    await db.from("subscriptions").upsert({
      user_id: userId,
      plan_type: planType,
      status: "active",
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: session.customer as string,
      current_period_end: new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
    }, { onConflict: "user_id" });
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    await db
      .from("subscriptions")
      .update({ status: "canceled" })
      .eq("stripe_subscription_id", sub.id);
  }

  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    await db
      .from("subscriptions")
      .update({
        status: sub.status === "active" ? "active" : "past_due",
        current_period_end: new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
      })
      .eq("stripe_subscription_id", sub.id);
  }

  return NextResponse.json({ ok: true });
}
