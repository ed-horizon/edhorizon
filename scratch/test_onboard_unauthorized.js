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

    console.log("Updating anjana's password to 'password123'...");
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
        'a87e1c8c-9687-4140-8837-e0566bba9f64',
        { password: 'password123' }
    );

    if (updateError) {
        console.error("Failed to update password:", updateError.message);
        return;
    }
    console.log("Password updated successfully!");

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

    console.log("Logging in as anjana@edhorizon.com...");
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'anjana@edhorizon.com',
        password: 'password123'
    });

    if (signInError) {
        console.error("Sign in failed:", signInError.message);
        return;
    }

    const user = authData.user;
    console.log("Logged in successfully! User ID:", user.id);

    // Run security check query
    console.log("Running security check query...");
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profileError) {
        console.error("Profile query failed:", profileError.message);
    } else {
        console.log("Profile retrieved:", profile);
        const isAuthorized = ['admin', 'super_admin', 'hr', 'operations'].includes(profile?.role || '');
        console.log("Role string:", profile?.role);
        console.log("Is role in ['admin', 'super_admin', 'hr', 'operations']?:", isAuthorized);
    }
}

run();

