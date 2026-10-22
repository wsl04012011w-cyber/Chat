-- Chat MVP schema. Run this file in the Supabase SQL Editor.
-- Every exposed table uses RLS. The mobile app must only use a publishable key.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_.]{3,24}$')
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Conversa direta',
  is_group boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- Per-member title lets direct conversations show the other person's name
  -- without exposing other members' rows through the Data API.
  display_title text not null default 'Conversa',
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists conversation_members_user_id_idx
  on public.conversation_members(user_id);
create index if not exists messages_conversation_created_idx
  on public.messages(conversation_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

-- Profiles are searchable by signed-in users; writes remain owner-only.
drop policy if exists "Profiles are visible to signed-in users" on public.profiles;
create policy "Profiles are visible to signed-in users"
  on public.profiles for select to authenticated
  using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- A conversation is visible to its members and its creator while setting up
-- the initial membership rows.
drop policy if exists "Members can read their conversations" on public.conversations;
create policy "Members can read their conversations"
  on public.conversations for select to authenticated
  using (
    created_by = (select auth.uid())
    or exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = id
        and cm.user_id = (select auth.uid())
    )
  );

drop policy if exists "Signed-in users can create conversations" on public.conversations;
create policy "Signed-in users can create conversations"
  on public.conversations for insert to authenticated
  with check (created_by = (select auth.uid()));

-- Users can see their own membership rows only. The creator can add members
-- while creating a conversation; no user can join an arbitrary conversation.
drop policy if exists "Users can see their own memberships" on public.conversation_members;
create policy "Users can see their own memberships"
  on public.conversation_members for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Conversation creators can add members" on public.conversation_members;
create policy "Conversation creators can add members"
  on public.conversation_members for insert to authenticated
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and c.created_by = (select auth.uid())
    )
  );

drop policy if exists "Members can read messages" on public.messages;
create policy "Members can read messages"
  on public.messages for select to authenticated
  using (
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id
        and cm.user_id = (select auth.uid())
    )
  );

drop policy if exists "Members can send as themselves" on public.messages;
create policy "Members can send as themselves"
  on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id
        and cm.user_id = (select auth.uid())
    )
  );

grant select on public.profiles to authenticated;
grant update (display_name, avatar_url, updated_at) on public.profiles to authenticated;
grant select, insert on public.conversations to authenticated;
grant select, insert on public.conversation_members to authenticated;
grant select, insert on public.messages to authenticated;

-- Create the public profile automatically when a user signs up.
create or replace function public.handle_new_chat_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_username text;
begin
  new_username := lower(regexp_replace(
    coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), 'user_' || left(new.id::text, 8)),
    '[^a-z0-9_.]', '', 'g'
  ));

  if char_length(new_username) < 3 then
    new_username := 'user_' || left(new.id::text, 8);
  end if;

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    new_username,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), new_username)
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_chat_profile on auth.users;
create trigger on_auth_user_created_chat_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_chat_user();

-- Enable INSERT events for chat messages in Supabase Realtime.
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
  when undefined_object then
    raise notice 'Publication supabase_realtime not found; enable messages in Realtime settings.';
end $$;
