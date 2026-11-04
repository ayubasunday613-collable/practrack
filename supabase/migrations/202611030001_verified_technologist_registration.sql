create or replace function public.promote_verified_technologist()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(coalesce(new.email, '')) = 'ayubasunday613@gmail.com'
    and new.email_confirmed_at is not null then
    update public.profiles
    set role = 'technologist', status = 'approved'
    where user_id = new.id;
  elsif tg_op = 'UPDATE'
    and lower(coalesce(old.email, '')) = 'ayubasunday613@gmail.com'
    and (
      lower(coalesce(new.email, '')) <> 'ayubasunday613@gmail.com'
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

create trigger zz_promote_verified_technologist
  after insert or update of email, email_confirmed_at on auth.users
  for each row execute procedure public.promote_verified_technologist();

update public.profiles p
set role = 'technologist', status = 'approved'
from auth.users u
where p.user_id = u.id
  and lower(u.email) = 'ayubasunday613@gmail.com'
  and u.email_confirmed_at is not null;
