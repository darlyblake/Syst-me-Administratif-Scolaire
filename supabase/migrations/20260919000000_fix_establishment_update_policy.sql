-- Fix: Allow establishment administrators to update their establishment details
drop policy if exists "Establishment admins can update their establishment" on public.establishments;

create policy "Establishment admins can update their establishment"
on public.establishments
for update
using (
  exists (
    select 1 from public.establishment_members m
    where m.establishment_id = id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin', 'administrator', 'director', 'direction')
      and m.active = true
  )
);
