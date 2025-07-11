
-- Insert admin user into auth.users (this is a special case for creating initial admin)
-- Note: In production, you'd use the Supabase dashboard or auth.signUp()
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  role
) VALUES (
  gen_random_uuid(),
  'sujan01nepal@gmail.com',
  crypt('precioussn', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"full_name": "Admin User", "role": "admin"}'::jsonb,
  'authenticated'
) ON CONFLICT (email) DO UPDATE SET
  encrypted_password = crypt('precioussn', gen_salt('bf')),
  raw_user_meta_data = '{"full_name": "Admin User", "role": "admin"}'::jsonb,
  updated_at = now();

-- Create a profile for the admin user
INSERT INTO profiles (
  id,
  email,
  full_name,
  role
) 
SELECT 
  id,
  'sujan01nepal@gmail.com',
  'Admin User',
  'admin'::user_role
FROM auth.users 
WHERE email = 'sujan01nepal@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin'::user_role,
  full_name = 'Admin User',
  updated_at = now();
