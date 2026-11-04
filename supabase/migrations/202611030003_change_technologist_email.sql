create or replace function public.promote_verified_technologist()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(coalesce(new.email, '')) = 'discipleshipayubasunday2026@gmail.com'
    and new.email_confirmed_at is not null then
    update public.profiles
    set role = 'technologist', status = 'approved'
    where user_id = new.id;
  elsif tg_op = 'UPDATE'
    and lower(coalesce(old.email, '')) = 'discipleshipayubasunday2026@gmail.com'
    and (
      lower(coalesce(new.email, '')) <> 'discipleshipayubasunday2026@gmail.com'
      or new.email_confirmed_at is null
    ) then
    update public.profiles
    set role = 'student', status = 'pending'
    where user_id = new.id and role = 'technologist';
  end if;

  return new;
end;
$$;

revoke all on function public.promote_verified_technologist() from public, anon, authenticated;

update public.profiles p
set role = 'student', status = 'pending'
from auth.users u
where p.user_id = u.id
  and lower(u.email) in ('ayubasunday613@gmail.com', 'sunayuba@yahoo.com')
  and p.role = 'technologist';

update public.profiles p
set role = 'technologist', status = 'approved'
from auth.users u
where p.user_id = u.id
  and lower(u.email) = 'discipleshipayubasunday2026@gmail.com'
  and u.email_confirmed_at is not null;
