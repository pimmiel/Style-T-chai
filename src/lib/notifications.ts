import { supabaseAdmin } from "@/lib/supabase";
import type { CreateNotificationInput } from "@/types/notifications";

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  if ("actorId" in input && input.actorId && input.userId === input.actorId) return;

  const db = supabaseAdmin();
  const { error } = await db.from("notifications").insert({
    user_id:  input.userId,
    actor_id: input.actorId ?? null,
    type:     input.type,
    payload:  input.payload,
  });

  if (error) console.error("[createNotification] failed:", error.message, input);
}
