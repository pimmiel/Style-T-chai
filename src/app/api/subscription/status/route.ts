import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ subscription: null });
  }
  return NextResponse.json({ subscription: { status: "active", plan_type: 10 } });
}
