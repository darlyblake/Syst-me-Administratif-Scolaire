alter table public.pointage_settings
  add column if not exists work_start_time time not null default '07:00',
  add column if not exists work_end_time time not null default '15:00',
  add column if not exists work_days smallint[] not null default '{1,2,3,4,5}';
