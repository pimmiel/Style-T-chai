-- Feature A: Content Moderation
alter table posts
  add column if not exists moderation_status text default 'pending',
  add column if not exists moderation_reason text;

alter table group_outfits
  add column if not exists moderation_status text default 'pending',
  add column if not exists moderation_reason text;

create table if not exists moderation_logs (
  id uuid primary key default gen_random_uuid(),
  content_type text not null,
  content_id uuid not null,
  status text not null,
  reason text,
  categories jsonb,
  created_at timestamptz default now()
);

-- Feature B: AI Outfit Feedback
alter table group_outfits
  add column if not exists ai_feedback text,
  add column if not exists ai_feedback_at timestamptz;

-- Feature C: Weekly Digest
create table if not exists group_weekly_digests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  week_start date not null,
  summary text not null,
  top_outfit_ids uuid[],
  color_trends jsonb,
  stats jsonb,
  created_at timestamptz default now(),
  unique (group_id, week_start)
);
