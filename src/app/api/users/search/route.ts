import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Strip PostgREST filter-injection characters before using in query
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().replace(/[,():'"]/g, "");
  if (q.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const db = supabaseAdmin();
  const { data: users } = await db
    .from("users")
    .select("id, name, image")
    .ilike("name", `%${q}%`)
    .neq("id", session.user.id)
    .limit(10);

  return NextResponse.json({ users: users ?? [] });
}
