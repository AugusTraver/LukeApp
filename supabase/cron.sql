-- Programa los avisos: Supabase llama a la app cada 5 minutos.
-- Correr UNA vez en Supabase → SQL Editor, después de publicar la app en Vercel.
-- Solo hay que reemplazar <URL_DE_LA_APP> (ej. https://lukeapp.vercel.app).
-- La clave la genera la base de datos sola: no hay que copiar ningún secreto.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Clave que solo ven la base de datos y el servidor (service role).
create table if not exists public.app_secrets (
  name text primary key,
  value text not null
);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;
grant select on public.app_secrets to service_role;
insert into public.app_secrets (name, value)
values ('cron', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (name) do nothing;

-- Si ya existía, se reemplaza.
select cron.unschedule(jobid) from cron.job where jobname = 'lukeapp-tick';

select cron.schedule(
  'lukeapp-tick',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := '<URL_DE_LA_APP>/api/cron/tick',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select value from public.app_secrets where name = 'cron')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
  $$
);

-- Para ver si corre:   select * from cron.job_run_details order by start_time desc limit 10;
-- Respuestas de la app: select status_code, left(content, 200) from net._http_response order by created desc limit 10;
-- Para pararlo:        select cron.unschedule('lukeapp-tick');
