import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { stripe, PLAN_PRICES } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { planType } = await req.json();
  if (![2, 5, 10].includes(planType)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const priceId = PLAN_PRICES[planType];
  if (!priceId) {
    return NextResponse.json({ error: "Price not configured" }, { status: 500 });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXTAUTH_URL}/subscription?success=1`,
    cancel_url: `${process.env.NEXTAUTH_URL}/subscription`,
    metadata: {
      user_id: session.user.id,
      plan_type: String(planType),
    },
    client_reference_id: session.user.id,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
