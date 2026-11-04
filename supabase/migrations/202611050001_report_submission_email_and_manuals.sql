alter table public.practicals
  add column if not exists manual_path text,
  add column if not exists manual_name text;

alter table public.report_answers
  drop constraint if exists report_answers_answer_check;

create or replace function public.submit_report(p_report_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  report_student uuid;
  report_status text;
begin
  select r.student_id, r.status
  into report_student, report_status
  from public.reports r
  where r.id = p_report_id
  for update;

  if report_student is distinct from auth.uid() or report_status <> 'draft' then
    raise exception 'Report is unavailable for submission';
  end if;

  update public.reports
  set status = 'submitted', submitted_at = now()
  where id = p_report_id;
end;
$$;

create or replace function public.attach_practical_manual(
  p_practical_id uuid,
  p_manual_path text,
  p_manual_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  practical_owner uuid;
  practical_status text;
begin
  if not (select public.is_technologist()) then
    raise exception 'Technologist access is required';
  end if;
  if (p_manual_path is null) <> (p_manual_name is null) then
    raise exception 'Manual path and file name must both be provided';
  end if;
  if p_manual_path is not null and (
    p_manual_path !~ ('^' || auth.uid()::text || '/[0-9a-f-]{36}\.(pdf|docx|txt)$')
    or char_length(p_manual_name) not between 1 and 255
  ) then
    raise exception 'Manual file path or name is invalid';
  end if;

  select created_by, status into practical_owner, practical_status
  from public.practicals
  where id = p_practical_id
  for update;
  if practical_owner is distinct from auth.uid()
    or practical_status not in ('draft', 'active')
    or exists (
      select 1
      from public.reports r
      join public.assignments a on a.id = r.assignment_id
      where a.practical_id = p_practical_id
    ) then
    raise exception 'Only your draft or active practical without reports can have its manual changed';
  end if;

  update public.practicals
  set manual_path = p_manual_path, manual_name = p_manual_name
  where id = p_practical_id;
end;
$$;

grant execute on function public.attach_practical_manual(uuid, text, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'practical-manuals',
  'practical-manuals',
  false,
  20971520,
  array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Technologists upload their practical manuals"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'practical-manuals'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_technologist())
  );
create policy "Technologists read their attached practical manuals"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'practical-manuals'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_technologist())
    and exists (
      select 1 from public.practicals p
      where p.manual_path = name and p.created_by = (select auth.uid())
    )
  );
create policy "Technologists delete their practical manuals"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'practical-manuals'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_technologist())
  );
