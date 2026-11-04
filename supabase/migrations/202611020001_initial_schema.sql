create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'student' check (role in ('student', 'technologist')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'suspended')),
  full_name text not null,
  matric_number text not null unique,
  department text not null,
  programme text not null,
  level text not null,
  created_at timestamptz not null default now()
);

create table public.practicals (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (user_id),
  title text not null check (char_length(title) between 1 and 200),
  course_code text not null default '' check (char_length(course_code) <= 40),
  description text not null default '' check (char_length(description) <= 5000),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.practical_fields (
  id uuid primary key default gen_random_uuid(),
  practical_id uuid not null references public.practicals (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  instructions text not null default '' check (char_length(instructions) <= 5000),
  marking_criteria text not null check (char_length(marking_criteria) between 1 and 10000),
  max_points numeric(7, 2) not null check (max_points > 0),
  position integer not null check (position >= 0),
  required boolean not null default true,
  unique (practical_id, position),
  unique (id, practical_id)
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  practical_id uuid not null references public.practicals (id) on delete restrict,
  student_id uuid not null references public.profiles (user_id) on delete cascade,
  assigned_by uuid not null references public.profiles (user_id),
  created_at timestamptz not null default now(),
  unique (practical_id, student_id),
  unique (id, student_id)
);

create table public.report_codes (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references public.profiles (user_id),
  created_by uuid not null references public.profiles (user_id),
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique,
  student_id uuid not null,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'reviewed', 'approved', 'returned')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (assignment_id, student_id) references public.assignments (id, student_id) on delete cascade
);

create table public.report_pages (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  page_number integer not null check (page_number > 0),
  created_at timestamptz not null default now(),
  unique (report_id, page_number)
);

create table public.report_answers (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.report_pages (id) on delete cascade,
  field_id uuid not null references public.practical_fields (id) on delete restrict,
  answer text not null default '' check (char_length(answer) <= 20000),
  updated_at timestamptz not null default now(),
  unique (page_id, field_id)
);

create table public.report_sketches (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  object_path text not null unique,
  position integer not null check (position between 0 and 4),
  created_at timestamptz not null default now(),
  unique (report_id, position)
);

create table public.ai_assessments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references public.reports (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  suggested_total numeric(7, 2),
  final_total numeric(7, 2),
  feedback text,
  provider_model text,
  reviewed_by uuid references public.profiles (user_id),
  reviewed_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.ai_assessment_items (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.ai_assessments (id) on delete cascade,
  field_id uuid not null references public.practical_fields (id) on delete restrict,
  suggested_points numeric(7, 2) not null check (suggested_points >= 0),
  final_points numeric(7, 2) check (final_points >= 0),
  feedback text not null,
  technologist_feedback text,
  unique (assessment_id, field_id)
);

create or replace function public.is_technologist()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = (select auth.uid())
      and role = 'technologist'
      and status = 'approved'
  );
$$;

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
    or exists (select 1 from public.reports r join public.assignments a on a.id = r.assignment_id
      where a.practical_id = p_practical_id) then
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
      raise exception 'Each field needs a title, marking criteria, and a positive mark value';
    end if;
    total_points := total_points + (field_item ->> 'max_points')::numeric;
  end loop;
  if total_points > 10000 then
    raise exception 'The total practical marks cannot exceed 10000';
  end if;

  update public.practicals
  set title = btrim(p_title), course_code = left(coalesce(p_course_code, ''), 40),
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

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    user_id, full_name, matric_number, department, programme, level
  ) values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), 'Student'),
    coalesce(nullif(new.raw_user_meta_data ->> 'matric_number', ''), 'pending-' || new.id::text),
    coalesce(nullif(new.raw_user_meta_data ->> 'department', ''), 'Not provided'),
    coalesce(nullif(new.raw_user_meta_data ->> 'programme', ''), 'Not provided'),
    coalesce(nullif(new.raw_user_meta_data ->> 'level', ''), 'Not provided')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();

create or replace function public.claim_report_code(p_code_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_assignment uuid;
  created_report uuid;
begin
  if auth.uid() is null or p_code_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid or unavailable report code';
  end if;

  update public.report_codes rc
  set used_at = now(), used_by = auth.uid()
  from public.assignments a
  join public.profiles p on p.user_id = a.student_id
  join public.practicals practical on practical.id = a.practical_id and practical.status = 'active'
  where rc.assignment_id = a.id
    and rc.code_hash = p_code_hash
    and rc.used_at is null
    and rc.expires_at > now()
    and a.student_id = auth.uid()
    and p.role = 'student'
    and p.status = 'approved'
    and not exists (
      select 1 from public.reports r where r.assignment_id = a.id
    )
  returning rc.assignment_id into claimed_assignment;

  if claimed_assignment is null then
    raise exception 'Invalid, expired, already used, or unassigned report code';
  end if;

  insert into public.reports (assignment_id, student_id)
  values (claimed_assignment, auth.uid())
  returning id into created_report;

  insert into public.report_pages (report_id, page_number)
  values (created_report, 1);

  return created_report;
end;
$$;

create or replace function public.create_practical_with_fields(
  p_title text,
  p_course_code text,
  p_description text,
  p_due_at timestamptz,
  p_fields jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_practical uuid;
  field_item jsonb;
  field_position integer := 0;
  total_points numeric := 0;
begin
  if not (select public.is_technologist()) then
    raise exception 'Technologist access is required';
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
      raise exception 'Each field needs a title, marking criteria, and a positive mark value';
    end if;
    total_points := total_points + (field_item ->> 'max_points')::numeric;
  end loop;
  if total_points > 10000 then
    raise exception 'The total practical marks cannot exceed 10000';
  end if;

  insert into public.practicals (created_by, title, course_code, description, due_at, status)
  values (
    auth.uid(),
    btrim(p_title),
    left(coalesce(p_course_code, ''), 40),
    left(coalesce(p_description, ''), 5000),
    p_due_at,
    'draft'
  )
  returning id into created_practical;

  for field_item in select value from jsonb_array_elements(p_fields)
  loop
    insert into public.practical_fields (
      practical_id, title, instructions, marking_criteria, max_points, position, required
    )
    values (
      created_practical,
      btrim(field_item ->> 'title'),
      left(coalesce(field_item ->> 'instructions', ''), 5000),
      btrim(field_item ->> 'marking_criteria'),
      (field_item ->> 'max_points')::numeric,
      field_position,
      coalesce((field_item ->> 'required')::boolean, true)
    );
    field_position := field_position + 1;
  end loop;

  return created_practical;
end;
$$;

create or replace function public.create_practical_report_code(
  p_practical_id uuid,
  p_student_id uuid,
  p_code_hash text,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_assignment uuid;
begin
  if not (select public.is_technologist()) then
    raise exception 'Technologist access is required';
  end if;
  if p_code_hash !~ '^[0-9a-f]{64}$' or p_expires_at <= now() or p_expires_at > now() + interval '30 days' then
    raise exception 'Report code or expiry is invalid';
  end if;
  if not exists (
    select 1 from public.profiles
    where user_id = p_student_id and role = 'student' and status = 'approved'
  ) then
    raise exception 'Choose an approved student';
  end if;
  if not exists (
    select 1 from public.practicals
    where id = p_practical_id and status = 'active'
  ) then
    raise exception 'Publish the practical before assigning it';
  end if;

  insert into public.assignments (practical_id, student_id, assigned_by)
  values (p_practical_id, p_student_id, auth.uid())
  on conflict (practical_id, student_id) do update set assigned_by = excluded.assigned_by
  returning id into target_assignment;

  if exists (select 1 from public.reports where assignment_id = target_assignment) then
    raise exception 'This student already has a report for the practical';
  end if;

  update public.report_codes
  set expires_at = now()
  where assignment_id = target_assignment and used_at is null and expires_at > now();

  insert into public.report_codes (assignment_id, code_hash, expires_at, created_by)
  values (target_assignment, p_code_hash, p_expires_at, auth.uid());

  return target_assignment;
end;
$$;

create or replace function public.submit_report(p_report_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  report_student uuid;
  report_status text;
  missing_required integer;
begin
  select r.student_id, r.status
  into report_student, report_status
  from public.reports r
  where r.id = p_report_id
  for update;

  if report_student is distinct from auth.uid() or report_status <> 'draft' then
    raise exception 'Report is unavailable for submission';
  end if;

  select count(*) into missing_required
  from public.reports r
  join public.assignments a on a.id = r.assignment_id
  join public.practical_fields f on f.practical_id = a.practical_id and f.required
  where r.id = p_report_id
    and not exists (
      select 1
      from public.report_pages pg
      join public.report_answers answer on answer.page_id = pg.id
      where pg.report_id = p_report_id
        and answer.field_id = f.id
        and btrim(answer.answer) <> ''
    );

  if missing_required > 0 then
    raise exception 'Complete every required report field before submitting';
  end if;

  update public.reports
  set status = 'submitted', submitted_at = now()
  where id = p_report_id;
end;
$$;

create or replace function public.begin_ai_assessment(p_report_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  report_student uuid;
  report_status text;
  current_assessment public.ai_assessments%rowtype;
begin
  select r.student_id, r.status
  into report_student, report_status
  from public.reports r
  where r.id = p_report_id
  for update;

  if report_student is null
    or (report_student <> auth.uid() and not (select public.is_technologist()))
    or report_status not in ('submitted', 'reviewed')
  then
    raise exception 'This report is not available for assessment';
  end if;

  select * into current_assessment
  from public.ai_assessments
  where report_id = p_report_id
  for update;

  if found and current_assessment.status = 'completed' then
    return false;
  end if;

  if found then
    delete from public.ai_assessment_items where assessment_id = current_assessment.id;
    update public.ai_assessments
    set status = 'pending', suggested_total = null, final_total = null, feedback = null,
      provider_model = null, reviewed_by = null, reviewed_at = null, approved_at = null
    where id = current_assessment.id;
  else
    insert into public.ai_assessments (report_id, status)
    values (p_report_id, 'pending');
  end if;

  return true;
end;
$$;

create or replace function public.approve_ai_assessment(p_assessment_id uuid)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_report uuid;
  final_score numeric;
  invalid_scores integer;
  expected_fields integer;
  assessed_fields integer;
begin
  if not (select public.is_technologist()) then
    raise exception 'Technologist access is required';
  end if;

  select report_id into target_report
  from public.ai_assessments
  where id = p_assessment_id and status = 'completed' and approved_at is null
  for update;
  if target_report is null then
    raise exception 'Assessment is unavailable for approval';
  end if;

  select count(*) into expected_fields
  from public.reports r
  join public.assignments a on a.id = r.assignment_id
  join public.practical_fields f on f.practical_id = a.practical_id
  where r.id = target_report;

  select count(*), coalesce(sum(ai.final_points), 0)
  into assessed_fields, final_score
  from public.ai_assessment_items ai
  where ai.assessment_id = p_assessment_id;

  select count(*) into invalid_scores
  from public.ai_assessment_items ai
  join public.ai_assessments aa on aa.id = ai.assessment_id
  join public.reports r on r.id = aa.report_id
  join public.assignments a on a.id = r.assignment_id
  join public.practical_fields f on f.id = ai.field_id and f.practical_id = a.practical_id
  where ai.assessment_id = p_assessment_id
    and (ai.final_points is null or ai.final_points > f.max_points);

  if assessed_fields <> expected_fields or invalid_scores > 0 then
    raise exception 'Review every suggested field mark and keep each mark within its maximum';
  end if;

  update public.ai_assessments
  set final_total = final_score, reviewed_by = auth.uid(), reviewed_at = now(), approved_at = now()
  where id = p_assessment_id;
  update public.reports set status = 'approved' where id = target_report;
  return final_score;
end;
$$;

create or replace function public.enforce_report_sketch_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.reports where id = new.report_id for update;
  if (select count(*) from public.report_sketches where report_id = new.report_id) >= 5 then
    raise exception 'A report can have no more than five sketch images';
  end if;
  return new;
end;
$$;

create trigger report_sketches_limit
  before insert on public.report_sketches
  for each row execute procedure public.enforce_report_sketch_limit();

create or replace function public.set_report_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger reports_set_updated_at
  before update on public.reports
  for each row execute procedure public.set_report_updated_at();

alter table public.profiles enable row level security;
alter table public.practicals enable row level security;
alter table public.practical_fields enable row level security;
alter table public.assignments enable row level security;
alter table public.report_codes enable row level security;
alter table public.reports enable row level security;
alter table public.report_pages enable row level security;
alter table public.report_answers enable row level security;
alter table public.report_sketches enable row level security;
alter table public.ai_assessments enable row level security;
alter table public.ai_assessment_items enable row level security;

create policy "Users read own profile and technologists read all"
  on public.profiles for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_technologist()));
create policy "Technologists update profiles"
  on public.profiles for update to authenticated
  using ((select public.is_technologist()) and role = 'student')
  with check ((select public.is_technologist()) and role = 'student');
grant update (status) on public.profiles to authenticated;

create policy "Technologists manage practicals"
  on public.practicals for all to authenticated
  using ((select public.is_technologist()))
  with check ((select public.is_technologist()) and created_by = (select auth.uid()));
create policy "Students read assigned active practicals"
  on public.practicals for select to authenticated
  using (
    status = 'active'
    and exists (
      select 1 from public.assignments a
      where a.practical_id = practicals.id and a.student_id = (select auth.uid())
    )
  );

create policy "Technologists manage practical fields"
  on public.practical_fields for all to authenticated
  using ((select public.is_technologist()))
  with check (
    (select public.is_technologist())
    and exists (select 1 from public.practicals p where p.id = practical_id)
  );
create policy "Students read fields for assigned practicals"
  on public.practical_fields for select to authenticated
  using (
    exists (
      select 1 from public.assignments a
      where a.practical_id = practical_fields.practical_id and a.student_id = (select auth.uid())
    )
  );

create policy "Technologists manage assignments"
  on public.assignments for all to authenticated
  using ((select public.is_technologist()))
  with check ((select public.is_technologist()) and assigned_by = (select auth.uid()));
create policy "Students read own assignments"
  on public.assignments for select to authenticated
  using (student_id = (select auth.uid()));

create policy "Technologists manage report codes"
  on public.report_codes for all to authenticated
  using ((select public.is_technologist()))
  with check ((select public.is_technologist()) and created_by = (select auth.uid()));

create policy "Students read own reports and technologists read all"
  on public.reports for select to authenticated
  using (student_id = (select auth.uid()) or (select public.is_technologist()));
create policy "Students create a report after claiming a code"
  on public.reports for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and status = 'draft'
    and submitted_at is null
    and exists (
      select 1 from public.report_codes rc
      join public.assignments a on a.id = rc.assignment_id
      where rc.assignment_id = reports.assignment_id
        and rc.used_by = (select auth.uid())
        and rc.used_at is not null
        and a.student_id = (select auth.uid())
    )
  );
create policy "Users read report pages"
  on public.report_pages for select to authenticated
  using (
    exists (
      select 1 from public.reports r
      where r.id = report_id
        and (r.student_id = (select auth.uid()) or (select public.is_technologist()))
    )
  );
create policy "Students manage pages of own draft reports"
  on public.report_pages for all to authenticated
  using (
    exists (select 1 from public.reports r where r.id = report_id and r.student_id = (select auth.uid()) and r.status = 'draft')
  )
  with check (
    exists (select 1 from public.reports r where r.id = report_id and r.student_id = (select auth.uid()) and r.status = 'draft')
  );

create policy "Users read report answers"
  on public.report_answers for select to authenticated
  using (
    exists (
      select 1 from public.report_pages pg
      join public.reports r on r.id = pg.report_id
      where pg.id = page_id
        and (r.student_id = (select auth.uid()) or (select public.is_technologist()))
    )
  );
create policy "Students manage answers in own draft reports"
  on public.report_answers for all to authenticated
  using (
    exists (
      select 1 from public.report_pages pg
      join public.reports r on r.id = pg.report_id
      join public.assignments a on a.id = r.assignment_id
      join public.practical_fields f on f.id = field_id and f.practical_id = a.practical_id
      where pg.id = page_id and r.student_id = (select auth.uid()) and r.status = 'draft'
    )
  )
  with check (
    exists (
      select 1 from public.report_pages pg
      join public.reports r on r.id = pg.report_id
      join public.assignments a on a.id = r.assignment_id
      join public.practical_fields f on f.id = field_id and f.practical_id = a.practical_id
      where pg.id = page_id and r.student_id = (select auth.uid()) and r.status = 'draft'
    )
  );

create policy "Users read report sketches"
  on public.report_sketches for select to authenticated
  using (
    exists (
      select 1 from public.reports r
      where r.id = report_id
        and (r.student_id = (select auth.uid()) or (select public.is_technologist()))
    )
  );
create policy "Students manage sketches in own draft reports"
  on public.report_sketches for all to authenticated
  using (
    exists (select 1 from public.reports r where r.id = report_id and r.student_id = (select auth.uid()) and r.status = 'draft')
  )
  with check (
    object_path like (select auth.uid())::text || '/' || report_id::text || '/%'
    and exists (select 1 from public.reports r where r.id = report_id and r.student_id = (select auth.uid()) and r.status = 'draft')
  );

create policy "Students read approved assessments and technologists read all"
  on public.ai_assessments for select to authenticated
  using (
    (select public.is_technologist())
    or (
      approved_at is not null
      and exists (select 1 from public.reports r where r.id = report_id and r.student_id = (select auth.uid()))
    )
  );
create policy "Users read assessment items"
  on public.ai_assessment_items for select to authenticated
  using (
    exists (
      select 1 from public.ai_assessments aa
      join public.reports r on r.id = aa.report_id
      where aa.id = assessment_id
        and (
          (select public.is_technologist())
          or (aa.approved_at is not null and r.student_id = (select auth.uid()))
        )
    )
  );
create policy "Technologists update assessment marks"
  on public.ai_assessment_items for update to authenticated
  using (
    (select public.is_technologist())
    and exists (
      select 1 from public.ai_assessments aa
      where aa.id = assessment_id and aa.approved_at is null
    )
  )
  with check (
    (select public.is_technologist())
    and exists (
      select 1 from public.ai_assessments aa
      where aa.id = assessment_id and aa.approved_at is null
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-sketches', 'report-sketches', false, 10485760, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "Students upload sketches into their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'report-sketches'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.reports r
      where r.id::text = (storage.foldername(name))[2]
        and r.student_id = (select auth.uid())
        and r.status = 'draft'
    )
  );
create policy "Users read own sketches and technologists read all"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'report-sketches'
    and (
      (
        (storage.foldername(name))[1] = (select auth.uid())::text
        and exists (
          select 1 from public.reports r
          where r.id::text = (storage.foldername(name))[2] and r.student_id = (select auth.uid())
        )
      )
      or (select public.is_technologist())
    )
  );
create policy "Students delete their own sketches"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'report-sketches'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

revoke all on public.profiles, public.reports, public.ai_assessments, public.ai_assessment_items
  from anon, authenticated;
grant select on public.profiles, public.practicals, public.practical_fields,
  public.assignments, public.reports, public.report_pages, public.report_answers,
  public.report_sketches, public.ai_assessments, public.ai_assessment_items to authenticated;
grant insert, update, delete on public.practicals, public.practical_fields,
  public.assignments, public.report_pages, public.report_answers, public.report_sketches to authenticated;
grant insert on public.reports to authenticated;
grant select, insert, update, delete on public.report_codes to authenticated;
grant execute on function public.claim_report_code(text), public.submit_report(uuid),
  public.create_practical_with_fields(text, text, text, timestamptz, jsonb),
  public.create_practical_report_code(uuid, uuid, text, timestamptz),
  public.begin_ai_assessment(uuid), public.approve_ai_assessment(uuid),
  public.update_practical_with_fields(uuid, text, text, text, jsonb) to authenticated;
grant execute on function public.publish_practical(uuid) to authenticated;
grant update (final_points, technologist_feedback) on public.ai_assessment_items to authenticated;
