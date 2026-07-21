import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { getServerSession } from "@/lib/auth";
import TagTheLook from "@/components/TagTheLook";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = supabaseAdmin();
  const session = await getServerSession();

  const { data: post } = await db
    .from("posts")
    .select("*, users(name, image)")
    .eq("id", id)
    .single();

  if (!post) notFound();

  const { data: tags } = await db
    .from("post_item_tags")
    .select("*")
    .eq("post_id", id)
    .order("position");

  const isOwner = session?.user?.id === post.user_id;

  return <TagTheLook post={post} initialTags={tags ?? []} isOwner={isOwner} />;
}
