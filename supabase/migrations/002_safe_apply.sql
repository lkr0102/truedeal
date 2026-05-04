-- ============================================================
-- True Deal — Migration 002: apply missing schema safely
-- Idempotent: all statements use IF NOT EXISTS guards
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ── Enums (skip if already exist) ────────────────────────────────────────────

do $$ begin create type deal_type as enum ('oficial', 'privado', 'publico'); exception when duplicate_object then null; end $$;
do $$ begin create type deal_mode as enum ('regular', 'super'); exception when duplicate_object then null; end $$;
do $$ begin create type deal_status as enum ('formacao', 'ativo', 'finalizado'); exception when duplicate_object then null; end $$;
do $$ begin create type deal_category as enum ('social', 'fitness', 'checkin', 'free'); exception when duplicate_object then null; end $$;
do $$ begin create type distribution_type as enum ('winner', 'top3', 'proportional'); exception when duplicate_object then null; end $$;
do $$ begin create type payment_method as enum ('pix', 'cripto', 'cartao'); exception when duplicate_object then null; end $$;
do $$ begin create type participant_status as enum ('active', 'eliminated', 'winner'); exception when duplicate_object then null; end $$;
do $$ begin create type invite_status as enum ('pending', 'accepted', 'declined'); exception when duplicate_object then null; end $$;
do $$ begin
  create type tdp_reason as enum (
    'deal_join', 'deal_win', 'deal_create',
    'daily_checkin', 'streak_7d', 'streak_30d',
    'referral', 'social_link', 'promo'
  );
exception when duplicate_object then null; end $$;

-- ── Profiles ──────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id               uuid        primary key references auth.users(id) on delete cascade,
  username         text        not null unique,
  display_name     text        not null,
  avatar_url       text,
  tdp_points       integer     not null default 0,
  streak_days      integer     not null default 0,
  last_checkin     timestamptz,
  super_deal_used  boolean     not null default false,
  referral_code    text        not null unique default substr(md5(random()::text), 1, 8),
  referred_by      uuid        references public.profiles(id),
  referral_count   integer     not null default 0,
  created_at       timestamptz not null default now()
);

create index if not exists profiles_username_trgm     on public.profiles using gin(username gin_trgm_ops);
create index if not exists profiles_display_name_trgm on public.profiles using gin(display_name gin_trgm_ops);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', 'Usuário'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Deals ─────────────────────────────────────────────────────────────────────

create table if not exists public.deals (
  id                    uuid              primary key default uuid_generate_v4(),
  title                 text              not null,
  description           text,
  creator_id            uuid              not null references public.profiles(id) on delete cascade,
  type                  deal_type         not null default 'privado',
  mode                  deal_mode         not null default 'regular',
  status                deal_status       not null default 'formacao',
  category              deal_category     not null,
  verification_type     text              not null,
  verification_channels text[]            not null default '{}',
  entry_amount          numeric(10,2)     not null check (entry_amount >= 10),
  fee_pct               numeric(4,2)      not null check (fee_pct in (1, 5)),
  distribution          distribution_type not null default 'winner',
  payment_method        payment_method    not null default 'pix',
  max_participants      integer           not null default 2 check (max_participants between 2 and 100),
  allow_requests        boolean           not null default false,
  start_date            date              not null,
  end_date              date              not null check (end_date > start_date),
  winner_id             uuid              references public.profiles(id),
  created_at            timestamptz       not null default now()
);

create index if not exists deals_creator_id  on public.deals(creator_id);
create index if not exists deals_status      on public.deals(status);
create index if not exists deals_type        on public.deals(type);
create index if not exists deals_start_date  on public.deals(start_date);

-- ── Deal Participants ─────────────────────────────────────────────────────────

create table if not exists public.deal_participants (
  id               uuid               primary key default uuid_generate_v4(),
  deal_id          uuid               not null references public.deals(id) on delete cascade,
  user_id          uuid               not null references public.profiles(id) on delete cascade,
  joined_at        timestamptz        not null default now(),
  status           participant_status not null default 'active',
  start_snapshot   jsonb,
  current_snapshot jsonb,
  rank             integer,
  unique(deal_id, user_id)
);

create index if not exists deal_participants_deal_id on public.deal_participants(deal_id);
create index if not exists deal_participants_user_id on public.deal_participants(user_id);

-- ── Deal Invites ──────────────────────────────────────────────────────────────

create table if not exists public.deal_invites (
  id          uuid          primary key default uuid_generate_v4(),
  deal_id     uuid          not null references public.deals(id) on delete cascade,
  invitee_id  uuid          not null references public.profiles(id) on delete cascade,
  invited_by  uuid          not null references public.profiles(id),
  status      invite_status not null default 'pending',
  created_at  timestamptz   not null default now(),
  unique(deal_id, invitee_id)
);

-- ── TDP Transactions ─────────────────────────────────────────────────────────

create table if not exists public.tdp_transactions (
  id         uuid        primary key default uuid_generate_v4(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  amount     integer     not null,
  reason     tdp_reason  not null,
  deal_id    uuid        references public.deals(id),
  created_at timestamptz not null default now()
);

create index if not exists tdp_transactions_user_id on public.tdp_transactions(user_id);

create or replace function public.update_tdp_points()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.profiles
  set tdp_points = tdp_points + new.amount
  where id = new.user_id;
  return new;
end;
$$;

drop trigger if exists on_tdp_transaction on public.tdp_transactions;
create trigger on_tdp_transaction
  after insert on public.tdp_transactions
  for each row execute procedure public.update_tdp_points();

-- ── Daily Checkins ────────────────────────────────────────────────────────────

create table if not exists public.daily_checkins (
  id            uuid        primary key default uuid_generate_v4(),
  user_id       uuid        not null references public.profiles(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  date          date        not null default current_date,
  unique(user_id, date)
);

create or replace function public.handle_checkin()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  yesterday  date := current_date - 1;
  last_check date;
  new_streak integer;
begin
  select date into last_check
  from public.daily_checkins
  where user_id = new.user_id and date = yesterday;

  select streak_days into new_streak
  from public.profiles where id = new.user_id;

  if last_check is not null then
    new_streak := new_streak + 1;
  else
    new_streak := 1;
  end if;

  update public.profiles
  set streak_days = new_streak, last_checkin = now()
  where id = new.user_id;

  insert into public.tdp_transactions(user_id, amount, reason)
  values (new.user_id, 50, 'daily_checkin');

  if new_streak = 7 then
    insert into public.tdp_transactions(user_id, amount, reason)
    values (new.user_id, 150, 'streak_7d');
  end if;
  if new_streak = 30 then
    insert into public.tdp_transactions(user_id, amount, reason)
    values (new.user_id, 500, 'streak_30d');
  end if;

  return new;
end;
$$;

drop trigger if exists on_daily_checkin on public.daily_checkins;
create trigger on_daily_checkin
  after insert on public.daily_checkins
  for each row execute procedure public.handle_checkin();

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table public.profiles          enable row level security;
alter table public.deals             enable row level security;
alter table public.deal_participants enable row level security;
alter table public.deal_invites      enable row level security;
alter table public.tdp_transactions  enable row level security;
alter table public.daily_checkins    enable row level security;

-- Profiles
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select using (true);

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Deals
drop policy if exists "deals_select_public"      on public.deals;
drop policy if exists "deals_select_participant" on public.deals;
drop policy if exists "deals_insert"             on public.deals;
drop policy if exists "deals_update_creator"     on public.deals;

create policy "deals_select_public" on public.deals for select
  using (type in ('publico', 'oficial') or creator_id = auth.uid());

create policy "deals_select_participant" on public.deals for select
  using (
    exists (
      select 1 from public.deal_participants
      where deal_id = deals.id and user_id = auth.uid()
    )
  );

create policy "deals_insert" on public.deals for insert
  with check (auth.uid() = creator_id);

create policy "deals_update_creator" on public.deals for update
  using (auth.uid() = creator_id);

-- Participants
drop policy if exists "participants_select" on public.deal_participants;
drop policy if exists "participants_insert" on public.deal_participants;

create policy "participants_select" on public.deal_participants for select
  using (
    user_id = auth.uid() or
    exists (
      select 1 from public.deal_participants dp2
      where dp2.deal_id = deal_participants.deal_id and dp2.user_id = auth.uid()
    )
  );

create policy "participants_insert" on public.deal_participants for insert
  with check (auth.uid() = user_id);

-- Invites
drop policy if exists "invites_select" on public.deal_invites;
drop policy if exists "invites_insert" on public.deal_invites;
drop policy if exists "invites_update" on public.deal_invites;

create policy "invites_select" on public.deal_invites for select
  using (invitee_id = auth.uid() or invited_by = auth.uid());

create policy "invites_insert" on public.deal_invites for insert
  with check (auth.uid() = invited_by);

create policy "invites_update" on public.deal_invites for update
  using (auth.uid() = invitee_id);

-- TDP
drop policy if exists "tdp_select" on public.tdp_transactions;
create policy "tdp_select" on public.tdp_transactions for select
  using (user_id = auth.uid());

-- Checkins
drop policy if exists "checkins_select" on public.daily_checkins;
drop policy if exists "checkins_insert" on public.daily_checkins;

create policy "checkins_select" on public.daily_checkins for select
  using (user_id = auth.uid());

create policy "checkins_insert" on public.daily_checkins for insert
  with check (auth.uid() = user_id);
