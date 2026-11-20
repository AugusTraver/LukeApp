-- LukeApp · varios perros por familia, vacaciones ("no estoy"), salir y borrar la familia.

-- =============== Varios perros y calendarios ===============
-- El calendario principal sigue en las columnas de siempre (walk_times, fixed_days, rotation…).
-- "calendars" guarda solo los calendarios extra (perros que salen aparte).
-- "dogs" guarda todos los perros; vacío = un solo perro (dog_name / dog_coat).
alter table public.families
  add column dogs jsonb not null default '[]'::jsonb
    check (jsonb_typeof(dogs) = 'array' and jsonb_array_length(dogs) <= 8),
  add column calendars jsonb not null default '[]'::jsonb
    check (jsonb_typeof(calendars) = 'array' and jsonb_array_length(calendars) <= 7);

alter table public.overrides add column calendar_id text not null default 'main' check (char_length(calendar_id) between 1 and 40);
alter table public.swaps add column calendar_id text not null default 'main' check (char_length(calendar_id) between 1 and 40);
alter table public.confirmations add column calendar_id text not null default 'main' check (char_length(calendar_id) between 1 and 40);

alter table public.confirmations drop constraint confirmations_family_id_date_slot_key;
alter table public.confirmations add constraint confirmations_one_per_turn unique (family_id, calendar_id, date, slot);

drop index public.overrides_one_debt_per_miss;
create unique index overrides_one_debt_per_miss on public.overrides (family_id, calendar_id, missed_date, missed_slot) where kind = 'debt';

alter table public.notification_log add column calendar_id text not null default 'main';
alter table public.notification_log drop constraint notification_log_pkey;
alter table public.notification_log add primary key (family_id, calendar_id, date, slot, step);

alter table public.snoozes add column calendar_id text not null default 'main';
alter table public.snoozes drop constraint snoozes_pkey;
alter table public.snoozes add primary key (member_id, calendar_id, date, slot);

-- =============== Vacaciones: "no estoy" ===============
create table public.absences (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  from_date date not null,
  to_date date not null,
  reason text check (char_length(reason) <= 120),
  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  check (to_date >= from_date and to_date - from_date <= 120)
);
create index absences_family_id_idx on public.absences (family_id, to_date);
create index absences_member_id_idx on public.absences (member_id);
create index absences_created_by_idx on public.absences (created_by);

alter table public.absences enable row level security;
create policy "ver mi familia" on public.absences for select to authenticated
  using (family_id in (select private.my_family_ids()));
-- Cada uno carga sus ausencias; el admin puede cargar las de cualquiera.
create policy "cargo las mias o soy admin" on public.absences for insert to authenticated
  with check (
    family_id in (select private.my_family_ids())
    and created_by = (select private.my_member_id(family_id))
    and (member_id = (select private.my_member_id(family_id)) or (select private.is_admin(family_id)))
  );
create policy "borro las mias o soy admin" on public.absences for delete to authenticated
  using (member_id = (select private.my_member_id(family_id)) or (select private.is_admin(family_id)));
grant select, insert, delete on public.absences to authenticated;

alter publication supabase_realtime add table public.absences;

-- =============== Salir de la familia / borrarla ===============

-- Saca a un miembro de las reglas de turnos de todos los calendarios.
create or replace function private.drop_member_from_rules(fid uuid, mid uuid)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  m jsonb := to_jsonb(mid::text);
begin
  update public.families f set
    fixed_days = array_replace(f.fixed_days, mid, null),
    rotation = array_remove(f.rotation, mid),
    calendars = coalesce((
      select jsonb_agg(
        c || jsonb_build_object(
          'rotation', coalesce((select jsonb_agg(r) from jsonb_array_elements(c->'rotation') r where r <> m), '[]'::jsonb),
          'fixedDays', coalesce((select jsonb_agg(case when d = m then 'null'::jsonb else d end order by i) from jsonb_array_elements(c->'fixedDays') with ordinality t(d, i)), '[]'::jsonb)
        )
      )
      from jsonb_array_elements(f.calendars) c
    ), '[]'::jsonb)
  where f.id = fid;
end;
$$;

-- Cualquiera puede irse, salvo el último admin (tiene que borrar la familia).
create or replace function private.leave_family(fid uuid)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  me uuid := private.my_member_id(fid);
begin
  if me is null then raise exception 'No sos parte de esta familia'; end if;
  if exists (select 1 from public.members where id = me and role = 'admin')
     and not exists (select 1 from public.members where family_id = fid and role = 'admin' and id <> me) then
    raise exception 'Sos quien administra la familia: para irte, borrala desde Reglas de la familia.';
  end if;
  perform private.drop_member_from_rules(fid, me);
  delete from public.members where id = me;
end;
$$;

-- Admin saca a otra persona (limpia también los días fijos y la rotación).
create or replace function private.remove_member(member uuid)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  fid uuid;
begin
  select family_id into fid from public.members where id = member;
  if fid is null or not private.is_admin(fid) then raise exception 'Solo el admin puede hacerlo'; end if;
  if member = private.my_member_id(fid) then raise exception 'Para irte, usá “Salir de la familia”.'; end if;
  perform private.drop_member_from_rules(fid, member);
  delete from public.members where id = member;
end;
$$;

-- Borra la familia completa con todo su historial. Solo el admin.
create or replace function private.delete_family(fid uuid)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  if not private.is_admin(fid) then raise exception 'Solo el admin puede borrar la familia'; end if;
  delete from public.families where id = fid;
end;
$$;

revoke all on function private.drop_member_from_rules(uuid, uuid), private.leave_family(uuid), private.remove_member(uuid), private.delete_family(uuid) from public, anon;
grant execute on function private.leave_family(uuid), private.remove_member(uuid), private.delete_family(uuid) to authenticated;

create or replace function public.leave_family(fid uuid)
returns void language sql security invoker set search_path = ''
as $$ select private.leave_family(fid); $$;

create or replace function public.remove_member(member uuid)
returns void language sql security invoker set search_path = ''
as $$ select private.remove_member(member); $$;

create or replace function public.delete_family(fid uuid)
returns void language sql security invoker set search_path = ''
as $$ select private.delete_family(fid); $$;

revoke all on function public.leave_family(uuid), public.remove_member(uuid), public.delete_family(uuid) from public, anon;
grant execute on function public.leave_family(uuid), public.remove_member(uuid), public.delete_family(uuid) to authenticated;
