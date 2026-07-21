import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : undefined;
  const bio = typeof body.bio === "string" ? body.bio.trim() : null;

  if (!name || name.length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { error } = await db
    .from("users")
    .update({ name, bio })
    .eq("id", session.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
