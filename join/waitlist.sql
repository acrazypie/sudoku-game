-- Run once in the Supabase dashboard: SQL Editor -> New query -> Run.
-- Creates the table that stores the closed-test emails.
-- Anyone on the page can INSERT an email; nobody can read the table through the API.
-- You read the emails in the Supabase dashboard: Table Editor -> waitlist (or export as CSV).

create table if not exists public.waitlist (
  email      text primary key
             check (char_length(email) between 3 and 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

drop policy if exists "anon can join the waitlist" on public.waitlist;
create policy "anon can join the waitlist"
  on public.waitlist
  for insert
  to anon
  with check (true);

-- No select/update/delete policy for anon: the page cannot read or change the list.
