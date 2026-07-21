-- Social graph: likes, saves, follows

create table if not exists post_likes (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

create table if not exists post_saves (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

create table if not exists user_follows (
  follower_id uuid not null,
  following_id uuid not null,
  created_at timestamptz default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists post_likes_user_idx on post_likes(user_id);
create index if not exists post_saves_user_idx on post_saves(user_id);
create index if not exists user_follows_follower_idx on user_follows(follower_id);
create index if not exists user_follows_following_idx on user_follows(following_id);
