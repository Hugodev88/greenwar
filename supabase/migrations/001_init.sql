-- =====================================================================
-- Greenwar: contas, perfis e saves na nuvem (Supabase)
-- Cole este arquivo inteiro no Supabase → SQL Editor → Run.
-- Pode rodar mais de uma vez (idempotente).
-- =====================================================================

-- ---------- Tabelas ----------
create table if not exists public.profiles (
  id                    uuid primary key references auth.users (id) on delete cascade,
  username              text not null unique,
  display_name          text,
  avatar                text not null default 'iniciais',
  bio                   text,
  campaigns_played      integer not null default 0,
  campaigns_by_scenario jsonb   not null default '{}'::jsonb,  -- {"brasil2022": 3, ...}
  endings               jsonb   not null default '{}'::jsonb,  -- {"brasil2022": ["fim_retorno", ...], ...}
  endings_count         integer not null default 0,            -- calculado por trigger a partir de "endings"
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table if not exists public.saves (
  user_id      uuid not null references auth.users (id) on delete cascade,
  scenario_id  text not null,
  slot         smallint not null default 0,
  data         jsonb not null,
  save_version integer not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, scenario_id, slot)
);

-- Restrições (recriadas para o script ser idempotente)
alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,20}$');
alter table public.profiles drop constraint if exists profiles_display_name_len;
alter table public.profiles add  constraint profiles_display_name_len check (display_name is null or char_length(display_name) <= 40);
alter table public.profiles drop constraint if exists profiles_avatar_len;
alter table public.profiles add  constraint profiles_avatar_len check (char_length(avatar) between 1 and 40);
alter table public.profiles drop constraint if exists profiles_bio_len;
alter table public.profiles add  constraint profiles_bio_len check (bio is null or char_length(bio) <= 280);
alter table public.profiles drop constraint if exists profiles_counts_nonneg;
alter table public.profiles add  constraint profiles_counts_nonneg check (campaigns_played >= 0 and endings_count >= 0);
alter table public.profiles drop constraint if exists profiles_json_types;
alter table public.profiles add  constraint profiles_json_types check (jsonb_typeof(endings) = 'object' and jsonb_typeof(campaigns_by_scenario) = 'object');

alter table public.saves drop constraint if exists saves_scenario_len;
alter table public.saves add  constraint saves_scenario_len check (char_length(scenario_id) between 1 and 40);
alter table public.saves drop constraint if exists saves_slot_range;
alter table public.saves add  constraint saves_slot_range check (slot between 0 and 9);
alter table public.saves drop constraint if exists saves_data_size;
alter table public.saves add  constraint saves_data_size check (pg_column_size(data) < 2000000);

create index if not exists profiles_endings_count_idx on public.profiles (endings_count desc);

-- ---------- updated_at e contagem de finais ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function public.profiles_before_write()
returns trigger language plpgsql set search_path = '' as $$
declare total integer := 0; k text;
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.id := old.id;                 -- id e data de criação não mudam
    new.created_at := old.created_at;
  end if;
  for k in select jsonb_object_keys(new.endings) loop
    if jsonb_typeof(new.endings -> k) = 'array' then
      total := total + jsonb_array_length(new.endings -> k);
    end if;
  end loop;
  new.endings_count := total;
  return new;
end $$;

drop trigger if exists profiles_before_write on public.profiles;
create trigger profiles_before_write before insert or update on public.profiles
  for each row execute function public.profiles_before_write();

drop trigger if exists saves_set_updated_at on public.saves;
create trigger saves_set_updated_at before insert or update on public.saves
  for each row execute function public.set_updated_at();

-- ---------- Perfil automático no cadastro ----------
create or replace function public.make_username(raw text)
returns text language plpgsql set search_path = '' as $$
declare base text; candidate text; n integer := 0;
begin
  base := left(regexp_replace(lower(coalesce(raw, '')), '[^a-z0-9_]', '', 'g'), 16);
  if char_length(base) < 3 then base := 'jogador'; end if;
  candidate := base;
  while exists (select 1 from public.profiles p where p.username = candidate) loop
    n := n + 1;
    candidate := left(base, 15) || '_' || n::text;
  end loop;
  return candidate;
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare uname text;
begin
  uname := public.make_username(coalesce(new.raw_user_meta_data ->> 'username', split_part(coalesce(new.email, ''), '@', 1)));
  insert into public.profiles (id, username, display_name)
  values (new.id, uname, left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), uname), 40))
  on conflict (id) do nothing;
  return new;
exception when others then
  raise warning 'handle_new_user: não foi possível criar o perfil de %: %', new.id, sqlerrm;
  return new;  -- nunca bloqueia o cadastro
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Perfis para contas criadas antes deste script
do $$
declare u record;
begin
  for u in select au.id, au.email, au.raw_user_meta_data from auth.users au
           left join public.profiles p on p.id = au.id where p.id is null loop
    insert into public.profiles (id, username, display_name)
    values (u.id,
            public.make_username(coalesce(u.raw_user_meta_data ->> 'username', split_part(coalesce(u.email, ''), '@', 1))),
            left(coalesce(nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''), split_part(coalesce(u.email, ''), '@', 1)), 40))
    on conflict (id) do nothing;
  end loop;
end $$;

-- ---------- Segurança (RLS) ----------
alter table public.profiles enable row level security;
alter table public.saves    enable row level security;

-- Perfis: qualquer um lê (ranking "Jogadores"); só o dono cria/edita o próprio
drop policy if exists "profiles_select_all"  on public.profiles;
drop policy if exists "profiles_insert_own"  on public.profiles;
drop policy if exists "profiles_update_own"  on public.profiles;
create policy "profiles_select_all" on public.profiles for select to anon, authenticated using (true);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Saves: cada usuário só vê e altera os próprios
drop policy if exists "saves_select_own" on public.saves;
drop policy if exists "saves_insert_own" on public.saves;
drop policy if exists "saves_update_own" on public.saves;
drop policy if exists "saves_delete_own" on public.saves;
create policy "saves_select_own" on public.saves for select to authenticated using ((select auth.uid()) = user_id);
create policy "saves_insert_own" on public.saves for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "saves_update_own" on public.saves for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "saves_delete_own" on public.saves for delete to authenticated using ((select auth.uid()) = user_id);

-- Permissões da API (RLS continua valendo por cima disto)
grant usage on schema public to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
revoke all on public.saves from anon;
grant select, insert, update, delete on public.saves to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.make_username(text) from public, anon, authenticated;

-- Avisa a API (PostgREST) para recarregar o esquema imediatamente
notify pgrst, 'reload schema';
