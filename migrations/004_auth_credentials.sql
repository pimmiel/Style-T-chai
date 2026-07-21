-- User credentials for email/password login (separate from NextAuth adapter tables)
create table if not exists public.user_credentials (
  user_id uuid primary key references next_auth.users(id) on delete cascade,
  password_hash text not null,
  email_verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Password reset tokens (store hash of token, not plaintext)
create table if not exists public.password_reset_tokens (
  token text primary key,
  user_id uuid not null references next_auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  used boolean default false,
  created_at timestamptz default now()
);

-- Index for looking up reset tokens by user
create index if not exists idx_password_reset_tokens_user_id
  on public.password_reset_tokens(user_id);

-- Auto-update updated_at on user_credentials
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists user_credentials_updated_at on public.user_credentials;
create trigger user_credentials_updated_at
  before update on public.user_credentials
  for each row execute function public.set_updated_at();
