-- Memory file storage (server-side mirror of the user's ~/.claude/.../memory tree).
create table if not exists memory_files (
  user_id uuid not null references auth.users(id) on delete cascade,
  path text not null,
  sha256 text not null,
  content text not null,
  bytes int not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, path)
);

alter table memory_files enable row level security;

create policy "users read their own memory files"
  on memory_files for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users write their own memory files"
  on memory_files for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users update their own memory files"
  on memory_files for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete their own memory files"
  on memory_files for delete
  to authenticated
  using (auth.uid() = user_id);

-- Device-code CLI login: the CLI creates a `code`, opens the browser,
-- and polls until the user approves it and the row gets filled in.
create table if not exists cli_sessions (
  code text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  access_token text,
  refresh_token text,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

alter table cli_sessions enable row level security;

-- The CLI is anonymous when polling — allow selecting by code (the code itself is the secret).
create policy "anyone can read session by code"
  on cli_sessions for select
  to anon, authenticated
  using (true);

-- Only the owning user can approve a session row.
create policy "authenticated users can approve sessions"
  on cli_sessions for update
  to authenticated
  using (user_id is null or auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "anyone can create a session row"
  on cli_sessions for insert
  to anon, authenticated
  with check (true);
