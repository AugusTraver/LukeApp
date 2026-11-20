-- LukeApp · cada integrante puede cambiar su propio avatar (sin poder tocar su rol ni nada más).
create or replace function private.update_my_avatar(fid uuid, new_avatar text, new_color text)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  me uuid := private.my_member_id(fid);
begin
  if me is null then raise exception 'No sos parte de esta familia'; end if;
  if new_avatar is null or char_length(new_avatar) not between 1 and 60 then raise exception 'Avatar inválido'; end if;
  if new_color !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Color inválido'; end if;
  update public.members set avatar = new_avatar, color = new_color where id = me;
end;
$$;

revoke all on function private.update_my_avatar(uuid, text, text) from public, anon;
grant execute on function private.update_my_avatar(uuid, text, text) to authenticated;

create or replace function public.update_my_avatar(fid uuid, new_avatar text, new_color text)
returns void language sql security invoker set search_path = ''
as $$ select private.update_my_avatar(fid, new_avatar, new_color); $$;

revoke all on function public.update_my_avatar(uuid, text, text) from public, anon;
grant execute on function public.update_my_avatar(uuid, text, text) to authenticated;
