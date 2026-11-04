create or replace function public.update_practical_with_fields(
  p_practical_id uuid,
  p_title text,
  p_course_code text,
  p_description text,
  p_fields jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  practical_owner uuid;
  practical_status text;
  field_item jsonb;
  field_position integer := 0;
  total_points numeric := 0;
begin
  if not (select public.is_technologist()) then
    raise exception 'Technologist access is required';
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
    raise exception 'Only a draft or an active practical without reports can be edited';
  end if;
  if p_title is null or char_length(btrim(p_title)) not between 1 and 200 then
    raise exception 'Enter a practical title';
  end if;
  if p_fields is null or jsonb_typeof(p_fields) <> 'array' or jsonb_array_length(p_fields) = 0 then
    raise exception 'Add at least one report field with marking criteria';
  end if;
  if jsonb_array_length(p_fields) > 30 then
    raise exception 'A practical can have at most 30 fields';
  end if;

  for field_item in select value from jsonb_array_elements(p_fields)
  loop
    if char_length(btrim(coalesce(field_item ->> 'title', ''))) not between 1 and 160
      or char_length(btrim(coalesce(field_item ->> 'marking_criteria', ''))) not between 1 and 10000
      or coalesce((field_item ->> 'max_points')::numeric, 0) <= 0 then
      raise exception 'Each field needs a title, marking criteria and a positive mark value';
    end if;
    total_points := total_points + (field_item ->> 'max_points')::numeric;
  end loop;
  if total_points > 10000 then
    raise exception 'The total practical marks cannot exceed 10000';
  end if;

  update public.practicals
  set title = btrim(p_title),
    course_code = left(coalesce(p_course_code, ''), 40),
    description = left(coalesce(p_description, ''), 5000),
    status = case when practical_status = 'active' then 'draft' else practical_status end
  where id = p_practical_id;

  delete from public.practical_fields where practical_id = p_practical_id;
  for field_item in select value from jsonb_array_elements(p_fields)
  loop
    insert into public.practical_fields (
      practical_id, title, instructions, marking_criteria, max_points, position, required
    )
    values (
      p_practical_id,
      btrim(field_item ->> 'title'),
      left(coalesce(field_item ->> 'instructions', ''), 5000),
      btrim(field_item ->> 'marking_criteria'),
      (field_item ->> 'max_points')::numeric,
      field_position,
      coalesce((field_item ->> 'required')::boolean, true)
    );
    field_position := field_position + 1;
  end loop;
end;
$$;

create or replace function public.publish_practical(p_practical_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  practical_owner uuid;
begin
  if not (select public.is_technologist()) then
    raise exception 'Technologist access is required';
  end if;

  select created_by into practical_owner
  from public.practicals
  where id = p_practical_id and status = 'draft'
  for update;
  if practical_owner is distinct from auth.uid() then
    raise exception 'Only your draft practical can be published';
  end if;

  if exists (
    select section.title
    from unnest(array[
      'Title', 'Aim', 'Objectives', 'Materials / Tools / Equipment', 'Theory',
      'Diagram', 'Results / Calculations', 'Assignment', 'Procedure', 'Precautions',
      'Observations', 'Conclusions'
    ]) as section(title)
    where not exists (
      select 1 from public.practical_fields f
      where f.practical_id = p_practical_id
        and f.title = section.title
        and f.required
        and f.max_points > 0
        and btrim(f.marking_criteria) <> ''
        and f.marking_criteria not ilike 'TODO:%'
    )
  ) or exists (
    select 1 from public.practical_fields f
    where f.practical_id = p_practical_id
      and (btrim(f.marking_criteria) = '' or f.marking_criteria ilike 'TODO:%')
  ) then
    raise exception 'Complete the marking criteria for all 12 required sections before publishing';
  end if;

  update public.practicals set status = 'active' where id = p_practical_id;
end;
$$;

grant execute on function public.publish_practical(uuid) to authenticated;
