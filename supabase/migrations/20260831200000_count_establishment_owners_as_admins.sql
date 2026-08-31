create or replace function public.platform_admin_dashboard_summary()
returns table(
  establishments_count bigint,
  active_establishments_count bigint,
  inactive_establishments_count bigint,
  students_count bigint,
  staff_count bigint,
  classes_count bigint,
  admins_count bigint,
  active_subscriptions_count bigint,
  expiring_subscriptions_count bigint,
  expired_subscriptions_count bigint,
  suspended_subscriptions_count bigint
)
language sql
set search_path = public
as $$
  select
    (select count(*) from public.establishments where public.is_platform_admin()),
    (select count(*) from public.establishments where status = 'active' and public.is_platform_admin()),
    (select count(*) from public.establishments where status = 'inactive' and public.is_platform_admin()),
    (select count(*) from public.students s join public.establishments e on e.id = s.establishment_id where s.active and public.is_platform_admin()),
    (select count(*) from public.staff_members sm join public.establishments e on e.id = sm.establishment_id where sm.active and public.is_platform_admin()),
    (select count(*) from public.school_classes c join public.establishments e on e.id = c.establishment_id where c.active and public.is_platform_admin()),
    (select count(*) from public.establishment_members em join public.establishments e on e.id = em.establishment_id where em.active and em.role in ('owner','admin','administrator','director','direction') and public.is_platform_admin()),
    (select count(*) from public.establishment_subscriptions es join public.establishments e on e.id = es.establishment_id where es.status = 'active' and es.starts_at <= current_date and es.ends_at >= current_date and public.is_platform_admin()),
    (select count(*) from public.establishment_subscriptions es join public.establishments e on e.id = es.establishment_id where es.status = 'active' and es.ends_at >= current_date and es.ends_at <= current_date + 30 and public.is_platform_admin()),
    (select count(*) from public.establishment_subscriptions es join public.establishments e on e.id = es.establishment_id where (es.status = 'expired' or (es.status = 'active' and es.ends_at < current_date)) and public.is_platform_admin()),
    (select count(*) from public.establishment_subscriptions es join public.establishments e on e.id = es.establishment_id where es.status = 'suspended' and public.is_platform_admin());
$$;
