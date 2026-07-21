-- Base schema: core tables that all other migrations depend on

create table if not exists posts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null,
  post_type      text not null check (post_type in ('outfit', 'tip', 'lookbook')),
  visibility     text[] not null default '{explore}',
  -- outfit fields
  image_url      text,
  caption        text,
  style_tag      text,
  occasion_tag   text,
  gender_tag     text,
  colors         jsonb,
  -- tip fields
  title          text,
  body           text,
  tip_image_url  text,
  tags           text[],
  -- lookbook fields
  lookbook_title text,
  description    text,
  images         text[],
  -- moderation (populated by 001)
  moderation_status text default 'pending',
  moderation_reason text,
  created_at     timestamptz default now()
);

create index if not exists posts_user_idx      on posts(user_id);
create index if not exists posts_created_idx   on posts(created_at desc);

-- ──────────────────────────────────────────────────────────────
create table if not exists groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  owner_id    uuid not null,
  invite_code text not null unique,
  max_members int  not null default 2,
  created_at  timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────
create table if not exists group_members (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references groups(id) on delete cascade,
  user_id    uuid not null,
  role       text not null default 'member' check (role in ('owner', 'member')),
  joined_at  timestamptz default now(),
  unique (group_id, user_id)
);

create index if not exists group_members_group_idx on group_members(group_id);
create index if not exists group_members_user_idx  on group_members(user_id);

-- ──────────────────────────────────────────────────────────────
create table if not exists group_outfits (
  id                uuid primary key default gen_random_uuid(),
  group_id          uuid not null references groups(id) on delete cascade,
  user_id           uuid not null,
  image_url         text not null,
  caption           text,
  colors            jsonb,
  -- ai/moderation columns (populated by 001)
  moderation_status text default 'pending',
  moderation_reason text,
  ai_feedback       text,
  ai_feedback_at    timestamptz,
  created_at        timestamptz default now()
);

create index if not exists group_outfits_group_idx on group_outfits(group_id);

-- ──────────────────────────────────────────────────────────────
create table if not exists group_outfit_votes (
  id             uuid primary key default gen_random_uuid(),
  group_outfit_id uuid not null references group_outfits(id) on delete cascade,
  user_id        uuid not null,
  created_at     timestamptz default now(),
  unique (group_outfit_id, user_id)
);

-- ──────────────────────────────────────────────────────────────
create table if not exists group_invites (
  id                  uuid primary key default gen_random_uuid(),
  group_id            uuid not null references groups(id) on delete cascade,
  invited_user_email  text not null,
  invited_by          uuid not null,
  status              text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at          timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────
create table if not exists group_theme_plans (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups(id) on delete cascade,
  plan_date   date not null,
  theme_name  text not null,
  colors      jsonb,
  occasion    text,
  notes       text,
  created_by  uuid not null,
  created_at  timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────
create table if not exists subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null,
  plan_type                int  not null check (plan_type in (2, 5, 10)),
  status                   text not null default 'active' check (status in ('active','canceled','past_due')),
  stripe_subscription_id   text,
  stripe_customer_id       text,
  current_period_end       timestamptz,
  created_at               timestamptz default now()
);

create index if not exists subscriptions_user_idx on subscriptions(user_id);
