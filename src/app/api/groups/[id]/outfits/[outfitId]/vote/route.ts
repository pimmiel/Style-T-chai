import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { createNotification } from "@/lib/notifications";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; outfitId: string }> }
) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, outfitId } = await params;
  const db = supabaseAdmin();
  const userId = session.user.id;

  const { data: membership } = await db
    .from("group_members")
    .select("role")
    .eq("group_id", id)
    .eq("user_id", userId)
    .single();

  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const { error } = await db
    .from("group_outfit_votes")
    .insert({ group_outfit_id: outfitId, user_id: userId });

  if (error?.code === "23505") {
    // Already voted — toggle off
    await db
      .from("group_outfit_votes")
      .delete()
      .eq("group_outfit_id", outfitId)
      .eq("user_id", userId);
    return NextResponse.json({ voted: false });
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: outfit } = await db
    .from("group_outfits")
    .select("user_id")
    .eq("id", outfitId)
    .single();
  if (outfit) {
    await createNotification({
      userId: outfit.user_id,
      actorId: userId,
      type: "group_outfit_voted",
      payload: { groupId: id, outfitId },
    });
  }

  return NextResponse.json({ voted: true });
}
