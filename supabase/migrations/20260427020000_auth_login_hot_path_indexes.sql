do $$
begin
  if to_regclass('public.employees') is not null
    and exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'employees'
        and column_name = 'auth_user_id'
    )
  then
    execute 'create index if not exists idx_employees_auth_user_id on public.employees(auth_user_id) where auth_user_id is not null';
  end if;

  if to_regclass('public.login_attempts') is not null
    and exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'login_attempts'
        and column_name = 'email'
    )
  then
    execute 'create index if not exists idx_login_attempts_email on public.login_attempts(email)';
  end if;
end $$;
