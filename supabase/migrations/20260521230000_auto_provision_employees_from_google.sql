-- Create a function to handle new users from Google OAuth
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  v_full_name text;
  v_employee_code text;
BEGIN
  -- Extract full_name from auth.users raw_user_meta_data, or fallback to email prefix
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name', 
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Generate a random employee_code to satisfy schema requirement (e.g., NV-A1B2C3)
  v_employee_code := 'NV-' || upper(substr(md5(random()::text), 1, 6));

  -- Insert into employees if the email doesn't exist
  IF NOT EXISTS (SELECT 1 FROM public.employees WHERE email = NEW.email) THEN
    INSERT INTO public.employees (
      id,
      auth_user_id,
      email,
      full_name,
      employee_code,
      role,
      status,
      department
    ) VALUES (
      NEW.id,           -- Using the auth.users UUID for the employees ID
      NEW.id,           -- Linking auth_user_id
      NEW.email,
      v_full_name,
      v_employee_code,
      'ctv',            -- Default role for safety
      'active',
      'Chưa phân bổ'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
