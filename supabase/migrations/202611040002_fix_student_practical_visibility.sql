drop policy if exists "Students read assigned active practicals" on public.practicals;

create policy "Students read assigned active practicals"
  on public.practicals for select to authenticated
  using (
    status = 'active'
    and exists (
      select 1
      from public.assignments a
      where a.practical_id = practicals.id
        and a.student_id = (select auth.uid())
    )
  );
