create table if not exists post_item_tags (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  x numeric(5,2) not null,
  y numeric(5,2) not null,
  name text not null,
  brand text,
  shop text,
  price text,
  link text,
  color text,
  position int default 0,
  created_at timestamptz default now()
);

create index if not exists post_item_tags_post_idx on post_item_tags(post_id);
