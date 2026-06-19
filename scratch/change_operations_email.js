const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
});

async function run() {
    const adminClient = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY
    );

    const userId = 'a87e1c8c-9687-4140-8837-e0566bba9f64'; // ID for operations user anjana
    const newEmail = 'anjana@gmail.com';

    console.log(`Updating Auth user ID: ${userId} to email: ${newEmail} and resetting password...`);
    const { data: authData, error: authError } = await adminClient.auth.admin.updateUserById(
        userId,
        {
            email: newEmail,
            password: 'password123',
            email_confirm: true
        }
    );

    if (authError) {
        console.error("Auth update failed:", authError.message);
        return;
    }
    console.log("Auth user updated successfully!");

    console.log(`Updating profiles table record for ID: ${userId} to email: ${newEmail}...`);
    const { error: profileError } = await adminClient
        .from('profiles')
        .update({ email: newEmail })
        .eq('id', userId);

    if (profileError) {
        console.error("Profile table update failed:", profileError.message);
        return;
    }
    console.log("Profile table updated successfully!");

    console.log("Verifying credentials via sign in test...");
    const supabase = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            }
        }
    );

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: newEmail,
        password: 'password123'
    });

    if (signInError) {
        console.error("Sign in verification failed:", signInError.message);
    } else {
        console.log(`Verification SUCCESS! Logged in as: ${signInData.user.email} (ID: ${signInData.user.id})`);
    }
}

run();
