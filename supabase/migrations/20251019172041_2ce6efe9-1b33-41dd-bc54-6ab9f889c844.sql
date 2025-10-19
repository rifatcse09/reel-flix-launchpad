-- Create profiles for existing users who don't have one yet
INSERT INTO public.profiles (id, referral_code)
SELECT 
  au.id,
  generate_referral_code()
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;