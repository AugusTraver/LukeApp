-- Programa los avisos: llama a la app cada 5 minutos.
-- Correr UNA vez en Supabase → SQL Editor, después de desplegar la app en Vercel.
-- Reemplazá <URL_DE_LA_APP> (ej. https://lukeapp.vercel.app) y <CRON_SECRET> (el mismo de Vercel).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Guardamos el secreto en Vault para no dejarlo escrito en el job.
select vault.create_secret('<CRON_SECRET>', 'lukeapp_cron_secret');

select cron.schedule(
  'lukeapp-tick',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := '<URL_DE_LA_APP>/api/cron/tick',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'lukeapp_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
  $$
);

-- Para ver si corre:   select * from cron.job_run_details order by start_time desc limit 10;
-- Para pararlo:        select cron.unschedule('lukeapp-tick');
