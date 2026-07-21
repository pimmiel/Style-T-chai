import { createClient } from "@supabase/supabase-js";

export function supabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export type Outfit = {
  id: string;
  user_id: string;
  image_url: string;
  caption: string;
  style_tag: string;
  occasion_tag: string;
  gender_tag: string;
  created_at: string;
  users?: { name: string; avatar_url: string };
  outfit_colors?: { hex_color: string; color_role: string }[];
  likes?: { count: number }[];
  saves?: { count: number }[];
  _liked?: boolean;
  _saved?: boolean;
};

export type Group = {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  invite_code: string;
  max_members: number;
  created_at: string;
  member_count?: number;
};

export type GroupMember = {
  id: string;
  group_id: string;
  user_id: string;
  role: "owner" | "member";
  joined_at: string;
  users?: { name: string; email: string; image: string };
};

export type GroupOutfit = {
  id: string;
  group_id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  colors: { hex: string; role: string }[] | null;
  created_at: string;
  votes_count?: number;
  _voted?: boolean;
  users?: { name: string; image: string };
};

export type GroupThemePlan = {
  id: string;
  group_id: string;
  plan_date: string;
  theme_name: string;
  colors: { hex: string; label: string }[] | null;
  occasion: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
};

export type GroupInvite = {
  id: string;
  group_id: string;
  invited_user_email: string;
  invited_by: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  groups?: { name: string };
};

export type Post = {
  id: string;
  user_id: string;
  post_type: "outfit" | "tip" | "lookbook";
  visibility: string[];
  image_url?: string | null;
  style_tag?: string | null;
  gender_tag?: string | null;
  caption?: string | null;
  occasion_tag?: string | null;
  colors?: { hex: string; role: string }[] | null;
  title?: string | null;
  body?: string | null;
  tip_image_url?: string | null;
  tags?: string[] | null;
  lookbook_title?: string | null;
  description?: string | null;
  images?: string[] | null;
  created_at: string;
  author?: { name: string; avatar: string };
};

export type PostItemTag = {
  id: string;
  post_id: string;
  x: number;
  y: number;
  name: string;
  brand: string | null;
  shop: string | null;
  price: string | null;
  link: string | null;
  color: string | null;
  position: number;
  created_at: string;
};

export type Subscription = {
  id: string;
  user_id: string;
  plan_type: 2 | 5 | 10;
  status: "active" | "canceled" | "past_due";
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  current_period_end: string | null;
  created_at: string;
};
