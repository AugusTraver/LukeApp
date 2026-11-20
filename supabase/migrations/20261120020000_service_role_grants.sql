-- LukeApp · permisos del servidor (service role).
-- Los proyectos nuevos de Supabase no le dan permisos automáticos al service role sobre las
-- tablas nuevas. El servidor (avisos, cron, botones de la notificación) necesita leer y escribir estas.
grant usage on schema public to service_role;
grant select, insert, update, delete on
  public.families,
  public.members,
  public.member_devices,
  public.overrides,
  public.swaps,
  public.confirmations,
  public.absences,
  public.push_subscriptions,
  public.notification_log,
  public.snoozes
to service_role;
