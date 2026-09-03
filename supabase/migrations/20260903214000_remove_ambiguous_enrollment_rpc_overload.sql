-- Keep a single RPC signature so PostgREST cannot resolve an overloaded enrollment listing function ambiguously.
drop function if exists public.list_enrollments_paginated(uuid, integer, integer, uuid, uuid, text);

notify pgrst;
