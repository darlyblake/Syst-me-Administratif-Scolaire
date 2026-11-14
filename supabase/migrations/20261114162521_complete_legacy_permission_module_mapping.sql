create or replace function private.permission_category(p_permission text)
returns text language sql immutable set search_path = ''
as $function$
  select case
    when p_permission in ('students.read','students.view','students.manage','students.create','students.edit','students.delete') then 'students'
    when p_permission like 'enrollments.%' or p_permission like 'inscriptions.%' then 'inscriptions'
    when p_permission in ('payments.read','payments.view','payments.create','payments.manage','payments.refund','finance.view')
      or p_permission like 'tuition.%' then 'finance'
    when p_permission like 'grades.%' or p_permission like 'notes.%' then 'notes'
    when p_permission like 'attendance.%' or p_permission like 'pointage.%' then 'attendance'
    when p_permission like 'documents.%' then 'documents'
    when p_permission like 'staff.%' or p_permission like 'personnel.%' or p_permission like 'payroll.%' or p_permission like 'salaires.%' then 'personnel'
    when p_permission like 'teachers.%' or p_permission like 'enseignants.%' then 'teachers'
    when p_permission like 'classes.%' or p_permission like 'academic.%' or p_permission like 'planning.%'
      or p_permission like 'subjects.%' or p_permission like 'timetable.%' then 'classes'
    when p_permission like 'dashboard.%' or p_permission in ('events.view','school.events.view') then 'dashboard'
    when p_permission like 'messages.%' or p_permission like 'communication.%' then 'communication'
    when p_permission like 'settings.%' or p_permission in ('school.manage','events.manage','school.events.manage') then 'settings'
    when p_permission in ('users.view','users.manage','members.manage') then 'users.manage'
    when p_permission = 'roles.manage' then 'roles.manage'
    when p_permission like 'reports.%' or p_permission like 'rapports.%' then 'reports'
    when p_permission like 'support.%' then 'support'
    else null
  end;
$function$;

create or replace function private.permission_implied_manage(p_permission text)
returns text language sql immutable set search_path = ''
as $function$
  select case
    when p_permission in ('students.read','students.view') then 'students.manage'
    when p_permission in ('enrollments.read','enrollments.view','inscriptions.view') then 'enrollments.manage'
    when p_permission in ('payments.read','payments.view','finance.view') then 'payments.manage'
    when p_permission in ('grades.view','notes.view') then 'grades.manage'
    when p_permission in ('attendance.read','attendance.view','pointage.view') then 'attendance.manage'
    when p_permission = 'documents.view' then 'documents.manage'
    when p_permission in ('staff.view','personnel.view','salaires.view') then 'staff.manage'
    when p_permission in ('teachers.view','enseignants.view') then 'teachers.manage'
    when p_permission in ('classes.view','planning.view','subjects.view','timetable.view') then 'classes.manage'
    when p_permission = 'communication.view' then 'communication.manage'
    when p_permission = 'users.view' then 'users.manage'
    else null
  end;
$function$;
