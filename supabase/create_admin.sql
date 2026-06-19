-- 1. Insert into auth.users (Confirmed User)
-- Note: password_hash 'argon2...' is for "password123"
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@edhorizon.com',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Super Admin","role":"super_admin"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
) RETURNING id;

-- 2. The profile will be created automatically by the trigger!
-- But let's verify the role is correctly set to super_admin in case the trigger logic 
-- needs a manual override or if you want to ensure it works.
-- (The trigger in 20240601000000_init_auth.sql handles this via raw_user_meta_data)
