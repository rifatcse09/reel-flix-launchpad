-- Update the handle_new_user function to make full_name optional
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, referral_code)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', NULL),
    new.email,
    generate_referral_code()
  );
  RETURN new;
END;
$$;