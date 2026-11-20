-- LukeApp 2.0 · esquema inicial
-- Multifamilia: cada familia (grupo) tiene miembros, reglas de turnos y su historial.
-- Acceso: el admin entra con email; el resto con un usuario anónimo por celular,
-- vinculado a su miembro después de validar código de familia + PIN.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;

-- =============== Tablas ===============

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  dog_name text not null check (char_length(dog_name) between 1 and 40),
  dog_coat text not null default 'black' check (dog_coat in ('black', 'brown', 'golden', 'gray')),
  time_zone text not null default 'America/Argentina/Buenos_Aires',
  walk_times text[] not null default '{17:20}' check (cardinality(walk_times) between 1 and 6),
  -- 7 posiciones (lunes..domingo): id del miembro fijo, o null si rota
  fixed_days uuid[] not null default array[null,null,null,null,null,null,null]::uuid[] check (cardinality(fixed_days) = 7),
  rotation uuid[] not null default '{}',
  rotation_anchor date not null,
  start_date date not null,
  penalty boolean not null default true,
  insistent boolean not null default true,
  join_code text not null unique,
  created_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  avatar text not null default 'Mateo',
  color text not null default '#f3dcc0',
  role text not null check (role in ('admin', 'walker', 'observer')),
  walks boolean not null default true,
  created_at timestamptz not null default now()
);
create index members_family_id_idx on public.members (family_id);

-- Celular (usuario de Supabase Auth) ↔ miembro. Un miembro puede tener varios celulares.
create table public.member_devices (
  user_id uuid primary key references auth.users(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index member_devices_member_id_idx on public.member_devices (member_id);
create index member_devices_family_id_idx on public.member_devices (family_id);

-- PIN hasheado: en el esquema privado, nunca visible desde la API.
create table private.member_pins (
  member_id uuid primary key references public.members(id) on delete cascade,
  pin_hash text,
  failed_attempts int not null default 0,
  locked_until timestamptz
);

create table public.overrides (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  date date not null,
  slot text not null,
  member_id uuid references public.members(id) on delete set null,
  kind text not null check (kind in ('exception', 'swap', 'debt', 'admin')),
  from_member_id uuid references public.members(id) on delete set null,
  reason text check (char_length(reason) <= 300),
  missed_date date,
  missed_slot text,
  swap_id uuid,
  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now()
);
create index overrides_family_date_idx on public.overrides (family_id, date);
create index overrides_member_id_idx on public.overrides (member_id);
create index overrides_from_member_id_idx on public.overrides (from_member_id);
create index overrides_created_by_idx on public.overrides (created_by);
-- El castigo de una falta se aplica una sola vez, aunque lo intenten varios celulares y el servidor.
create unique index overrides_one_debt_per_miss on public.overrides (family_id, missed_date, missed_slot) where kind = 'debt';

create table public.swaps (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  proposer_id uuid not null references public.members(id) on delete cascade,
  partner_id uuid not null references public.members(id) on delete cascade,
  date date not null,
  slot text not null,
  back_date date not null,
  back_slot text not null,
  reason text not null default '' check (char_length(reason) <= 300),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at timestamptz not null default now()
);
create index swaps_family_id_idx on public.swaps (family_id);
create index swaps_proposer_id_idx on public.swaps (proposer_id);
create index swaps_partner_id_idx on public.swaps (partner_id);

create table public.confirmations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  date date not null,
  slot text not null,
  walked_by uuid not null references public.members(id) on delete cascade,
  at timestamptz not null default now(),
  mood text,
  unique (family_id, date, slot)
);
create index confirmations_walked_by_idx on public.confirmations (walked_by);

create table public.push_subscriptions (
  endpoint text primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_member_id_idx on public.push_subscriptions (member_id);
create index push_subscriptions_family_id_idx on public.push_subscriptions (family_id);

-- Registro de avisos enviados (para no repetirlos) y "10 min más". Solo los usa el servidor
-- (service role): RLS activado sin políticas y sin permisos para anon/authenticated.
create table public.notification_log (
  family_id uuid not null references public.families(id) on delete cascade,
  date date not null,
  slot text not null,
  step text not null,
  sent_at timestamptz not null default now(),
  primary key (family_id, date, slot, step)
);

create table public.snoozes (
  member_id uuid not null references public.members(id) on delete cascade,
  date date not null,
  slot text not null,
  until timestamptz not null,
  primary key (member_id, date, slot)
);

-- =============== Ayudas para las políticas ===============

create or replace function private.my_family_ids()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select family_id from public.member_devices where user_id = (select auth.uid());
$$;

create or replace function private.my_member_id(fid uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select member_id from public.member_devices where user_id = (select auth.uid()) and family_id = fid limit 1;
$$;

create or replace function private.is_admin(fid uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.member_devices d join public.members m on m.id = d.member_id
    where d.user_id = (select auth.uid()) and d.family_id = fid and m.role = 'admin'
  );
$$;

revoke all on function private.my_family_ids(), private.my_member_id(uuid), private.is_admin(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.my_family_ids(), private.my_member_id(uuid), private.is_admin(uuid) to authenticated;

-- =============== RLS ===============

alter table public.families enable row level security;
alter table public.members enable row level security;
alter table public.member_devices enable row level security;
alter table public.overrides enable row level security;
alter table public.swaps enable row level security;
alter table public.confirmations enable row level security;
alter table public.push_subscriptions enable row level security;
alter table private.member_pins enable row level security;
alter table public.notification_log enable row level security;
alter table public.snoozes enable row level security;
revoke all on public.notification_log, public.snoozes from anon, authenticated;
create index snoozes_member_id_idx on public.snoozes (member_id);

-- families
create policy "ver mi familia" on public.families for select to authenticated
  using (id in (select private.my_family_ids()));
create policy "admin edita la familia" on public.families for update to authenticated
  using ((select private.is_admin(id))) with check ((select private.is_admin(id)));

-- members
create policy "ver mi familia" on public.members for select to authenticated
  using (family_id in (select private.my_family_ids()));
create policy "admin agrega" on public.members for insert to authenticated
  with check ((select private.is_admin(family_id)));
create policy "admin edita" on public.members for update to authenticated
  using ((select private.is_admin(family_id))) with check ((select private.is_admin(family_id)));
create policy "admin saca" on public.members for delete to authenticated
  using ((select private.is_admin(family_id)) and id <> (select private.my_member_id(family_id)));

-- member_devices: cada celular ve solo su vínculo
create policy "ver mi vinculo" on public.member_devices for select to authenticated
  using (user_id = (select auth.uid()));

-- overrides: cualquier miembro registra cambios de su familia (la lógica corre en la app)
create policy "ver mi familia" on public.overrides for select to authenticated
  using (family_id in (select private.my_family_ids()));
create policy "miembro registra" on public.overrides for insert to authenticated
  with check (family_id in (select private.my_family_ids()) and created_by = (select private.my_member_id(family_id)));

-- swaps
create policy "ver mi familia" on public.swaps for select to authenticated
  using (family_id in (select private.my_family_ids()));
create policy "propongo yo" on public.swaps for insert to authenticated
  with check (proposer_id = (select private.my_member_id(family_id)) and status = 'pending');
create policy "responden los involucrados" on public.swaps for update to authenticated
  using ((select private.my_member_id(family_id)) in (proposer_id, partner_id))
  with check ((select private.my_member_id(family_id)) in (proposer_id, partner_id));

-- confirmations: confirmo por mí
create policy "ver mi familia" on public.confirmations for select to authenticated
  using (family_id in (select private.my_family_ids()));
create policy "confirmo yo" on public.confirmations for insert to authenticated
  with check (walked_by = (select private.my_member_id(family_id)));

-- push_subscriptions: solo las mías
create policy "mis avisos" on public.push_subscriptions for select to authenticated
  using (member_id = (select private.my_member_id(family_id)));
create policy "registro mis avisos" on public.push_subscriptions for insert to authenticated
  with check (member_id = (select private.my_member_id(family_id)));
create policy "actualizo mis avisos" on public.push_subscriptions for update to authenticated
  using (member_id = (select private.my_member_id(family_id)))
  with check (member_id = (select private.my_member_id(family_id)));
create policy "borro mis avisos" on public.push_subscriptions for delete to authenticated
  using (member_id = (select private.my_member_id(family_id)));

-- =============== Funciones (RPC) ===============
-- Lógica privilegiada en "private" (security definer, con chequeo de auth.uid());
-- envoltorios finos en "public" (security invoker) que expone la API.

create or replace function private.new_join_code(dog text)
returns text
language plpgsql volatile security definer set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  prefix text := upper(left(regexp_replace(coalesce(dog, ''), '[^A-Za-z]', '', 'g') || 'LUKE', 4));
  code text;
begin
  loop
    code := prefix || '-';
    for i in 1..4 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.families where join_code = code);
  end loop;
  return code;
end;
$$;

-- Crea la familia completa. Lo llama el admin ya registrado con email.
create or replace function private.create_family(payload jsonb, admin_pin text)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  fid uuid;
  ids uuid[] := '{}';
  m jsonb;
  mid uuid;
  today date;
  tz text := coalesce(payload->'family'->>'timeZone', 'America/Argentina/Buenos_Aires');
  fixed uuid[] := '{}';
  rot uuid[] := '{}';
  x jsonb;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if coalesce((select (auth.jwt()->>'is_anonymous')::boolean), false) then
    raise exception 'El admin necesita una cuenta con email';
  end if;
  if admin_pin !~ '^\d{4}$' then raise exception 'PIN inválido'; end if;
  if jsonb_array_length(payload->'members') not between 1 and 20 then raise exception 'Cantidad de miembros inválida'; end if;

  today := (now() at time zone tz)::date;
  insert into public.families (name, dog_name, dog_coat, time_zone, walk_times, rotation_anchor, start_date, penalty, insistent, join_code)
  values (
    payload->'family'->>'name',
    payload->'family'->>'dogName',
    coalesce(payload->'family'->>'dogCoat', 'black'),
    tz,
    array(select jsonb_array_elements_text(payload->'family'->'walkTimes')),
    today - (extract(isodow from today)::int - 1),
    today,
    coalesce((payload->'family'->'settings'->>'penalty')::boolean, true),
    coalesce((payload->'family'->'settings'->>'insistent')::boolean, true),
    private.new_join_code(payload->'family'->>'dogName')
  ) returning id into fid;

  for m in select * from jsonb_array_elements(payload->'members') loop
    insert into public.members (family_id, name, avatar, color, role, walks)
    values (
      fid, m->>'name', m->>'avatar', m->>'color',
      case when ids = '{}' then 'admin' else coalesce(nullif(m->>'role', 'admin'), 'walker') end,
      coalesce((m->>'walks')::boolean, true)
    ) returning id into mid;
    insert into private.member_pins (member_id) values (mid);
    ids := ids || mid;
  end loop;

  for x in select * from jsonb_array_elements(payload->'family'->'fixedDays') loop
    fixed := fixed || (case when x = 'null'::jsonb then null else ids[(x::text)::int + 1] end);
  end loop;
  for x in select * from jsonb_array_elements(payload->'family'->'rotation') loop
    rot := rot || ids[(x::text)::int + 1];
  end loop;
  update public.families set fixed_days = fixed, rotation = rot where id = fid;

  update private.member_pins set pin_hash = extensions.crypt(admin_pin, extensions.gen_salt('bf')) where member_id = ids[1];
  insert into public.member_devices (user_id, member_id, family_id) values (uid, ids[1], fid)
  on conflict (user_id) do update set member_id = excluded.member_id, family_id = excluded.family_id;

  return jsonb_build_object('familyId', fid, 'memberId', ids[1]);
end;
$$;

-- Lo que se ve antes de entrar: nombre de la familia y caras (sin datos sensibles).
create or replace function private.preview_family(code text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'familyId', f.id, 'familyName', f.name, 'dogName', f.dog_name, 'dogCoat', f.dog_coat,
    'members', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name, 'avatar', m.avatar, 'color', m.color, 'hasPin', p.pin_hash is not null) order by m.created_at)
      from public.members m left join private.member_pins p on p.member_id = m.id
      where m.family_id = f.id
    ), '[]'::jsonb)
  )
  from public.families f
  where f.join_code = upper(trim(code)) and (select auth.uid()) is not null;
$$;

-- Entrar como un miembro: valida (o crea) el PIN y vincula este celular.
create or replace function private.join_family(code text, member uuid, pin text)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  fid uuid;
  p private.member_pins%rowtype;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if pin !~ '^\d{4}$' then raise exception 'El PIN tiene que tener 4 números'; end if;
  select f.id into fid from public.families f join public.members m on m.family_id = f.id
  where f.join_code = upper(trim(code)) and m.id = member;
  if fid is null then raise exception 'Código o persona incorrectos'; end if;

  select * into p from private.member_pins where member_id = member for update;
  if not found then
    insert into private.member_pins (member_id) values (member) returning * into p;
  end if;
  if p.locked_until is not null and p.locked_until > now() then
    raise exception 'Demasiados intentos. Probá de nuevo en 15 minutos.';
  end if;

  if p.pin_hash is null then
    update private.member_pins set pin_hash = extensions.crypt(pin, extensions.gen_salt('bf')), failed_attempts = 0, locked_until = null where member_id = member;
  elsif p.pin_hash = extensions.crypt(pin, p.pin_hash) then
    update private.member_pins set failed_attempts = 0, locked_until = null where member_id = member;
  else
    update private.member_pins
      set failed_attempts = p.failed_attempts + 1,
          locked_until = case when p.failed_attempts + 1 >= 5 then now() + interval '15 minutes' else null end
      where member_id = member;
    return jsonb_build_object('error', 'El PIN no es correcto.');
  end if;

  insert into public.member_devices (user_id, member_id, family_id) values (uid, member, fid)
  on conflict (user_id) do update set member_id = excluded.member_id, family_id = excluded.family_id;
  return jsonb_build_object('familyId', fid, 'memberId', member);
end;
$$;

-- Admin: borrar el PIN de alguien para que cree uno nuevo.
create or replace function private.reset_pin(member uuid)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare fid uuid;
begin
  select family_id into fid from public.members where id = member;
  if fid is null or not private.is_admin(fid) then raise exception 'Solo el admin puede hacerlo'; end if;
  update private.member_pins set pin_hash = null, failed_attempts = 0, locked_until = null where member_id = member;
  delete from public.member_devices where member_id = member;
end;
$$;

revoke all on function private.new_join_code(text), private.create_family(jsonb, text), private.preview_family(text),
  private.join_family(text, uuid, text), private.reset_pin(uuid) from public, anon;
grant execute on function private.create_family(jsonb, text), private.preview_family(text),
  private.join_family(text, uuid, text), private.reset_pin(uuid) to authenticated;

create or replace function public.create_family(payload jsonb, admin_pin text)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.create_family(payload, admin_pin); $$;

create or replace function public.preview_family(code text)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.preview_family(code); $$;

create or replace function public.join_family(code text, member uuid, pin text)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.join_family(code, member, pin); $$;

create or replace function public.reset_pin(member uuid)
returns void language sql security invoker set search_path = ''
as $$ select private.reset_pin(member); $$;

revoke all on function public.create_family(jsonb, text), public.preview_family(text), public.join_family(text, uuid, text), public.reset_pin(uuid) from public, anon;
grant execute on function public.create_family(jsonb, text), public.preview_family(text), public.join_family(text, uuid, text), public.reset_pin(uuid) to authenticated;

-- =============== Permisos de la API de datos ===============
grant select, update on public.families to authenticated;
grant select, insert, update, delete on public.members to authenticated;
grant select on public.member_devices to authenticated;
grant select, insert on public.overrides to authenticated;
grant select, insert, update on public.swaps to authenticated;
grant select, insert on public.confirmations to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

-- Tiempo real: los cambios de la familia llegan al instante a todos los celulares.
alter publication supabase_realtime add table public.overrides, public.swaps, public.confirmations, public.families, public.members;
